"""ServerMe Python SDK client."""

from __future__ import annotations

from typing import AsyncIterator, Optional
from urllib.parse import quote

import aiohttp

from serverme.errors import ApiError, AuthError, NotFoundError, RateLimitError
from serverme.types import (
    ApiKey,
    CapturedRequest,
    Domain,
    ReplayResult,
    Tunnel,
    User,
)

DEFAULT_SERVER_URL = "https://api.serverme.dev"


class ServerMe:
    """
    ServerMe SDK client.

    Example::

        import asyncio
        from serverme import ServerMe

        async def main():
            client = ServerMe(authtoken="sm_live_...")

            # List tunnels
            tunnels = await client.tunnels.list()
            print(tunnels)

            # Get captured requests
            requests = await client.inspect.list(tunnels[0].url)

            await client.close()

        asyncio.run(main())
    """

    def __init__(
        self,
        authtoken: str,
        server_url: str = DEFAULT_SERVER_URL,
        timeout: float = 30.0,
    ):
        if not authtoken:
            raise AuthError("authtoken is required")

        self._base_url = server_url.rstrip("/")
        self._authtoken = authtoken
        self._timeout = aiohttp.ClientTimeout(total=timeout)
        self._session: Optional[aiohttp.ClientSession] = None

        self.tunnels = _TunnelClient(self)
        self.inspect = _InspectClient(self)
        self.api_keys = _ApiKeyClient(self)
        self.domains = _DomainClient(self)
        self.users = _UserClient(self)

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=self._timeout,
                headers={
                    "X-API-Key": self._authtoken,
                    "Content-Type": "application/json",
                    "User-Agent": "serverme-sdk-python/1.0.0",
                },
            )
        return self._session

    async def _request(
        self, method: str, path: str, json: object = None
    ) -> dict:
        session = await self._get_session()
        url = f"{self._base_url}{path}"

        async with session.request(method, url, json=json) as resp:
            data = await resp.json()

            if resp.status == 401:
                raise AuthError(data.get("error", "Unauthorized"))
            if resp.status == 404:
                raise NotFoundError(data.get("error", "Not found"))
            if resp.status == 429:
                retry = int(resp.headers.get("Retry-After", "1"))
                raise RateLimitError(retry)
            if resp.status >= 400:
                raise ApiError(resp.status, data.get("error", "Request failed"))

            return data

    async def close(self) -> None:
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()

    async def __aenter__(self) -> "ServerMe":
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.close()


class _TunnelClient:
    def __init__(self, client: ServerMe):
        self._client = client

    async def list(self) -> list[Tunnel]:
        """List all active tunnels."""
        data = await self._client._request("GET", "/api/v1/tunnels")
        return [
            Tunnel(
                url=t["url"],
                protocol=t["protocol"],
                name=t.get("name", ""),
                client_id=t.get("client_id", ""),
            )
            for t in data
        ]


class _InspectClient:
    def __init__(self, client: ServerMe):
        self._client = client

    async def list(self, tunnel_url: str) -> list[CapturedRequest]:
        """List captured requests for a tunnel."""
        path = f"/api/v1/tunnels/{quote(tunnel_url, safe='')}/requests"
        data = await self._client._request("GET", path)
        return [_parse_captured_request(r) for r in data]

    async def get(self, tunnel_url: str, request_id: str) -> CapturedRequest:
        """Get a single captured request."""
        path = f"/api/v1/tunnels/{quote(tunnel_url, safe='')}/requests/{request_id}"
        data = await self._client._request("GET", path)
        return _parse_captured_request(data)

    async def replay(self, tunnel_url: str, request_id: str) -> ReplayResult:
        """Replay a captured request."""
        path = f"/api/v1/tunnels/{quote(tunnel_url, safe='')}/replay/{request_id}"
        data = await self._client._request("POST", path)
        return ReplayResult(
            status_code=data.get("status_code", 0),
            response_headers=data.get("response_headers", {}),
            duration_ms=data.get("duration_ms", 0),
            error=data.get("error"),
        )

    async def subscribe(self, tunnel_url: str) -> AsyncIterator[CapturedRequest]:
        """
        Subscribe to live traffic via WebSocket.

        Example::

            async for req in client.inspect.subscribe(tunnel_url):
                print(f"{req.method} {req.path} -> {req.status_code}")
        """
        ws_base = self._client._base_url.replace("http", "ws", 1)
        url = f"{ws_base}/api/v1/ws/traffic/{quote(tunnel_url, safe='')}"

        session = await self._client._get_session()
        async with session.ws_connect(url) as ws:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    import json

                    data = json.loads(msg.data)
                    yield _parse_captured_request(data)
                elif msg.type in (
                    aiohttp.WSMsgType.CLOSED,
                    aiohttp.WSMsgType.ERROR,
                ):
                    break


class _ApiKeyClient:
    def __init__(self, client: ServerMe):
        self._client = client

    async def list(self) -> list[ApiKey]:
        """List all API keys."""
        data = await self._client._request("GET", "/api/v1/api-keys")
        return [
            ApiKey(
                id=k["id"],
                user_id=k["user_id"],
                name=k["name"],
                prefix=k["prefix"],
                last_used_at=k.get("last_used_at"),
                created_at=k["created_at"],
            )
            for k in data
        ]

    async def create(self, name: str = "default") -> tuple[str, ApiKey]:
        """Create a new API key. Returns (full_token, key_info)."""
        data = await self._client._request("POST", "/api/v1/api-keys", {"name": name})
        info = data.get("info", {})
        return data["api_key"], ApiKey(
            id=info.get("id", ""),
            user_id=info.get("user_id", ""),
            name=info.get("name", name),
            prefix=info.get("prefix", ""),
            last_used_at=info.get("last_used_at"),
            created_at=info.get("created_at", ""),
        )

    async def delete(self, key_id: str) -> None:
        """Delete an API key."""
        await self._client._request("DELETE", f"/api/v1/api-keys/{key_id}")


class _DomainClient:
    def __init__(self, client: ServerMe):
        self._client = client

    async def list(self) -> list[Domain]:
        """List all custom domains."""
        data = await self._client._request("GET", "/api/v1/domains")
        return [
            Domain(
                id=d["id"],
                domain=d["domain"],
                verified=d["verified"],
                cname_target=d["cname_target"],
                created_at=d["created_at"],
            )
            for d in data
        ]

    async def create(self, domain: str) -> tuple[Domain, dict]:
        """Register a custom domain. Returns (domain, dns_instructions)."""
        data = await self._client._request("POST", "/api/v1/domains", {"domain": domain})
        d = data["domain"]
        return (
            Domain(
                id=d["id"],
                domain=d["domain"],
                verified=d["verified"],
                cname_target=d["cname_target"],
                created_at=d["created_at"],
            ),
            data.get("instructions", {}),
        )

    async def verify(self, domain_id: str) -> dict:
        """Verify a domain's DNS configuration."""
        return await self._client._request("POST", f"/api/v1/domains/{domain_id}/verify")

    async def delete(self, domain_id: str) -> None:
        """Delete a custom domain."""
        await self._client._request("DELETE", f"/api/v1/domains/{domain_id}")


class _UserClient:
    def __init__(self, client: ServerMe):
        self._client = client

    async def me(self) -> User:
        """Get the current user."""
        data = await self._client._request("GET", "/api/v1/users/me")
        return User(
            id=data["id"],
            email=data["email"],
            name=data["name"],
            plan=data["plan"],
            created_at=data["created_at"],
        )


def _parse_captured_request(data: dict) -> CapturedRequest:
    return CapturedRequest(
        id=data.get("id", ""),
        tunnel_url=data.get("tunnel_url", ""),
        timestamp=data.get("timestamp", ""),
        duration_ms=data.get("duration_ms", 0),
        method=data.get("method", ""),
        path=data.get("path", ""),
        query=data.get("query", ""),
        status_code=data.get("status_code", 0),
        request_headers=data.get("request_headers", {}),
        response_headers=data.get("response_headers", {}),
        request_size=data.get("request_size", 0),
        response_size=data.get("response_size", 0),
        remote_addr=data.get("remote_addr", ""),
    )
