"""Error types for ServerMe SDK."""


class ServerMeError(Exception):
    """Base error for ServerMe SDK."""


class AuthError(ServerMeError):
    """Authentication failed."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message)


class ApiError(ServerMeError):
    """API request failed."""

    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        super().__init__(f"API error {status_code}: {message}")


class NotFoundError(ApiError):
    """Resource not found."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(404, message)


class RateLimitError(ApiError):
    """Rate limit exceeded."""

    def __init__(self, retry_after: int = 1):
        self.retry_after = retry_after
        super().__init__(429, f"Rate limit exceeded, retry in {retry_after}s")
