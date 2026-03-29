export interface DocPage {
  slug: string;
  title: string;
  description: string;
  category: string;
  content: string;
}

export interface DocCategory {
  name: string;
  pages: { slug: string; title: string }[];
}

export const categories: DocCategory[] = [
  {
    name: "Getting Started",
    pages: [
      { slug: "quickstart", title: "Quickstart" },
      { slug: "installation", title: "Installation" },
      { slug: "concepts", title: "Core Concepts" },
    ],
  },
  {
    name: "CLI Reference",
    pages: [
      { slug: "cli/http", title: "serverme http" },
      { slug: "cli/tcp", title: "serverme tcp" },
      { slug: "cli/tls", title: "serverme tls" },
      { slug: "cli/start", title: "serverme start" },
      { slug: "cli/config", title: "Configuration File" },
    ],
  },
  {
    name: "API Reference",
    pages: [
      { slug: "api/authentication", title: "Authentication" },
      { slug: "api/tunnels", title: "Tunnels" },
      { slug: "api/domains", title: "Domains" },
      { slug: "api/api-keys", title: "API Keys" },
      { slug: "api/inspection", title: "Request Inspection" },
    ],
  },
  {
    name: "SDKs",
    pages: [
      { slug: "sdks/javascript", title: "JavaScript / TypeScript" },
      { slug: "sdks/python", title: "Python" },
    ],
  },
  {
    name: "Advanced",
    pages: [
      { slug: "advanced/custom-domains", title: "Custom Domains" },
      { slug: "advanced/traffic-policies", title: "Traffic Policies" },
      { slug: "advanced/webhooks", title: "Webhook Verification" },
      { slug: "advanced/self-hosting", title: "Self-Hosting" },
    ],
  },
];

const docs: Record<string, DocPage> = {
  quickstart: {
    slug: "quickstart",
    title: "Quickstart",
    description: "Get up and running with ServerMe in under 30 seconds.",
    category: "Getting Started",
    content: `## Install the CLI

\`\`\`bash
# Go install
go install github.com/serverme/serverme/cli/cmd/serverme@latest

# Or download the binary from GitHub Releases
# https://github.com/serverme/serverme/releases
\`\`\`

## Authenticate

Create an account at [serverme.site](https://serverme.site) and save your API key:

\`\`\`bash
serverme authtoken sm_live_your_token_here
\`\`\`

## Start a tunnel

\`\`\`bash
# Expose a local HTTP server
serverme http 3000
\`\`\`

You'll see output like:

\`\`\`
ServerMe                               (Ctrl+C to quit)

Version              1.0.0
Web Inspector        http://127.0.0.1:4040

Forwarding           https://a1b2c3d4.serverme.site -> localhost:3000
\`\`\`

Your local server is now accessible at the public URL. Open the Web Inspector at \`localhost:4040\` to see requests flowing through in real-time.

## What's next?

- [TCP tunnels](/docs/cli/tcp) — Expose databases and other TCP services
- [Configuration file](/docs/cli/config) — Define multiple tunnels in YAML
- [Custom domains](/docs/advanced/custom-domains) — Use your own domain
- [Request inspection](/docs/api/inspection) — View and replay traffic`,
  },

  installation: {
    slug: "installation",
    title: "Installation",
    description: "Install ServerMe CLI on any platform.",
    category: "Getting Started",
    content: `## Go Install

If you have Go 1.24+ installed:

\`\`\`bash
go install github.com/serverme/serverme/cli/cmd/serverme@latest
\`\`\`

## Binary Downloads

Download pre-built binaries from [GitHub Releases](https://github.com/serverme/serverme/releases):

| Platform | Architecture | Download |
|----------|-------------|----------|
| macOS    | Apple Silicon (arm64) | \`serverme_darwin_arm64.tar.gz\` |
| macOS    | Intel (amd64) | \`serverme_darwin_amd64.tar.gz\` |
| Linux    | x86_64 | \`serverme_linux_amd64.tar.gz\` |
| Linux    | ARM64 | \`serverme_linux_arm64.tar.gz\` |
| Windows  | x86_64 | \`serverme_windows_amd64.zip\` |

## Docker

\`\`\`bash
docker run --rm -it ghcr.io/serverme/serverme http 3000
\`\`\`

## Verify Installation

\`\`\`bash
serverme version
# serverme version 1.0.0
\`\`\``,
  },

  concepts: {
    slug: "concepts",
    title: "Core Concepts",
    description: "Understand how ServerMe tunnels work.",
    category: "Getting Started",
    content: `## How Tunnels Work

ServerMe creates a secure connection between your local machine and our edge servers:

\`\`\`
Internet → ServerMe Server → Encrypted Tunnel → Your CLI → Local Service
\`\`\`

1. The CLI connects to the ServerMe server via TLS
2. The server assigns a public URL (e.g., \`https://abc123.serverme.site\`)
3. When someone visits that URL, the request travels through the encrypted tunnel to your local service
4. The response travels back the same way

## Tunnel Types

| Type | Use Case | Example |
|------|----------|---------|
| **HTTP** | Web apps, APIs, webhooks | \`serverme http 3000\` |
| **TCP** | Databases, game servers, SSH | \`serverme tcp 5432\` |
| **TLS** | TLS passthrough (no termination) | \`serverme tls 443\` |

## Authentication

ServerMe uses API keys for authentication:

- **Format**: \`sm_live_\` followed by 32 hex characters
- **Storage**: Keys are SHA-256 hashed in the database
- **Header**: \`X-API-Key\` for REST API, or saved locally via \`serverme authtoken\`

## Request Inspection

Every HTTP request through your tunnel is captured and available for inspection:

- **Web Inspector**: Local UI at \`http://127.0.0.1:4040\`
- **Dashboard**: Real-time traffic viewer with WebSocket streaming
- **API**: Programmatic access via REST endpoints
- **Replay**: Re-send any captured request with one click`,
  },

  "cli/http": {
    slug: "cli/http",
    title: "serverme http",
    description: "Expose a local HTTP server to the internet.",
    category: "CLI Reference",
    content: `## Usage

\`\`\`bash
serverme http [port] [flags]
\`\`\`

## Examples

\`\`\`bash
# Basic HTTP tunnel
serverme http 3000

# Custom subdomain
serverme http 3000 --subdomain myapp

# With basic auth
serverme http 8080 --auth "user:password"

# Custom hostname
serverme http 3000 --hostname api.example.com

# Disable inspection
serverme http 3000 --inspect=false

# Custom inspector address
serverme http 3000 --inspector-addr 127.0.0.1:5050
\`\`\`

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| \`--subdomain\` | random | Request a custom subdomain |
| \`--hostname\` | | Use a custom domain |
| \`--auth\` | | HTTP basic auth (\`user:pass\`) |
| \`--inspect\` | \`true\` | Enable request inspection |
| \`--inspector-addr\` | \`127.0.0.1:4040\` | Local inspector address |
| \`--name\` | | Tunnel name/label |

## Global Flags

| Flag | Default | Description |
|------|---------|-------------|
| \`-s, --server\` | \`localhost:8443\` | ServerMe server address |
| \`--authtoken\` | | Authentication token |
| \`--tls-skip-verify\` | \`false\` | Skip TLS verification |
| \`--log-level\` | \`info\` | Log level (debug, info, warn, error) |`,
  },

  "cli/tcp": {
    slug: "cli/tcp",
    title: "serverme tcp",
    description: "Expose a local TCP service to the internet.",
    category: "CLI Reference",
    content: `## Usage

\`\`\`bash
serverme tcp [port] [flags]
\`\`\`

## Examples

\`\`\`bash
# Expose PostgreSQL
serverme tcp 5432

# Expose MySQL with specific remote port
serverme tcp 3306 --remote-port 33060

# Expose Redis
serverme tcp 6379 --name redis
\`\`\`

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| \`--remote-port\` | auto (10000-60000) | Request a specific remote port |
| \`--name\` | | Tunnel name/label |`,
  },

  "cli/tls": {
    slug: "cli/tls",
    title: "serverme tls",
    description: "Expose a local TLS service with passthrough.",
    category: "CLI Reference",
    content: `## Usage

\`\`\`bash
serverme tls [port] [flags]
\`\`\`

TLS tunnels pass encrypted traffic through without termination. The server peeks at the TLS ClientHello SNI field to route traffic, but never decrypts it.

## Examples

\`\`\`bash
# TLS passthrough
serverme tls 443

# With custom subdomain
serverme tls 8443 --subdomain secure-app
\`\`\`

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| \`--subdomain\` | random | Request a custom subdomain |
| \`--hostname\` | | Use a custom domain |
| \`--name\` | | Tunnel name/label |`,
  },

  "cli/start": {
    slug: "cli/start",
    title: "serverme start",
    description: "Start multiple tunnels from a configuration file.",
    category: "CLI Reference",
    content: `## Usage

\`\`\`bash
serverme start [flags]
\`\`\`

## Examples

\`\`\`bash
# Use default config (~/.serverme/serverme.yml)
serverme start

# Use custom config
serverme start --config ./serverme.yml
\`\`\`

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| \`-c, --config\` | \`~/.serverme/serverme.yml\` | Config file path |

## Behavior

- Starts all tunnels defined in the config file simultaneously
- Automatically reconnects on disconnect (exponential backoff 1s → 60s)
- Prints all tunnel URLs on startup
- Ctrl+C gracefully shuts down all tunnels`,
  },

  "cli/config": {
    slug: "cli/config",
    title: "Configuration File",
    description: "Define tunnels in a YAML configuration file.",
    category: "CLI Reference",
    content: `## Location

Default: \`~/.serverme/serverme.yml\`

## Format

\`\`\`yaml
server: tunnel.serverme.site:443
authtoken: sm_live_your_token_here
log_level: info
inspector_addr: 127.0.0.1:4040

tunnels:
  webapp:
    proto: http
    addr: "3000"
    subdomain: myapp
    inspect: true
    auth: "user:pass"

  api:
    proto: http
    addr: "8080"
    subdomain: api

  database:
    proto: tcp
    addr: "5432"
    remote_port: 54320

  secure:
    proto: tls
    addr: "443"
    subdomain: secure
\`\`\`

## Fields

### Top-Level

| Field | Required | Description |
|-------|----------|-------------|
| \`server\` | No | Server address (default: \`localhost:8443\`) |
| \`authtoken\` | No | API key (can also use saved token) |
| \`log_level\` | No | \`debug\`, \`info\`, \`warn\`, \`error\` |
| \`inspector_addr\` | No | Local inspector bind address |

### Tunnel Entry

| Field | Required | Description |
|-------|----------|-------------|
| \`proto\` | Yes | \`http\`, \`tcp\`, or \`tls\` |
| \`addr\` | Yes | Local port or address |
| \`subdomain\` | No | Custom subdomain (HTTP/TLS) |
| \`hostname\` | No | Custom domain (HTTP/TLS) |
| \`remote_port\` | No | Remote port (TCP only) |
| \`inspect\` | No | Enable inspection (default: true) |
| \`auth\` | No | Basic auth \`user:pass\` (HTTP only) |`,
  },

  "api/authentication": {
    slug: "api/authentication",
    title: "Authentication",
    description: "Authenticate with the ServerMe API.",
    category: "API Reference",
    content: `## Methods

The API supports two authentication methods:

### JWT Token (Dashboard)

\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

Obtain a token via login:

\`\`\`bash
curl -X POST https://api.serverme.site/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your_password"}'
\`\`\`

### API Key (CLI / SDK)

\`\`\`
X-API-Key: sm_live_...
\`\`\`

## Register

\`\`\`
POST /api/v1/auth/register
\`\`\`

\`\`\`json
{
  "email": "you@example.com",
  "name": "Your Name",
  "password": "minimum8chars"
}
\`\`\`

**Response** (201):

\`\`\`json
{
  "user": { "id": "...", "email": "...", "plan": "free" },
  "token": "eyJ...",
  "api_key": "sm_live_..."
}
\`\`\`

## Login

\`\`\`
POST /api/v1/auth/login
\`\`\`

\`\`\`json
{ "email": "you@example.com", "password": "your_password" }
\`\`\`

**Response** (200):

\`\`\`json
{
  "user": { "id": "...", "email": "...", "plan": "free" },
  "token": "eyJ..."
}
\`\`\``,
  },

  "api/tunnels": {
    slug: "api/tunnels",
    title: "Tunnels",
    description: "List and manage active tunnels.",
    category: "API Reference",
    content: `## List Tunnels

\`\`\`
GET /api/v1/tunnels
\`\`\`

**Response** (200):

\`\`\`json
[
  {
    "url": "http://abc123.serverme.site",
    "protocol": "http",
    "name": "webapp",
    "client_id": "abc123def456"
  }
]
\`\`\``,
  },

  "api/domains": {
    slug: "api/domains",
    title: "Domains",
    description: "Manage custom domains.",
    category: "API Reference",
    content: `## List Domains

\`\`\`
GET /api/v1/domains
\`\`\`

## Create Domain

\`\`\`
POST /api/v1/domains
\`\`\`

\`\`\`json
{ "domain": "api.example.com" }
\`\`\`

**Response** (201):

\`\`\`json
{
  "domain": { "id": "...", "domain": "api.example.com", "verified": false },
  "instructions": {
    "type": "CNAME",
    "name": "api.example.com",
    "target": "tunnel.serverme.site"
  }
}
\`\`\`

## Verify Domain

\`\`\`
POST /api/v1/domains/:id/verify
\`\`\`

## Delete Domain

\`\`\`
DELETE /api/v1/domains/:id
\`\`\``,
  },

  "api/api-keys": {
    slug: "api/api-keys",
    title: "API Keys",
    description: "Manage API keys for authentication.",
    category: "API Reference",
    content: `## List Keys

\`\`\`
GET /api/v1/api-keys
\`\`\`

## Create Key

\`\`\`
POST /api/v1/api-keys
\`\`\`

\`\`\`json
{ "name": "my-app" }
\`\`\`

**Response** (201):

\`\`\`json
{
  "api_key": "sm_live_abc123...",
  "info": { "id": "...", "name": "my-app", "prefix": "sm_live_abc1" }
}
\`\`\`

> The full API key is only returned once at creation time. Store it securely.

## Delete Key

\`\`\`
DELETE /api/v1/api-keys/:id
\`\`\``,
  },

  "api/inspection": {
    slug: "api/inspection",
    title: "Request Inspection",
    description: "View and replay captured HTTP requests.",
    category: "API Reference",
    content: `## List Captured Requests

\`\`\`
GET /api/v1/tunnels/:tunnelUrl/requests
\`\`\`

**Response** (200):

\`\`\`json
[
  {
    "id": "a1b2c3d4",
    "method": "POST",
    "path": "/api/webhook",
    "status_code": 200,
    "duration_ms": 12,
    "request_headers": { "Content-Type": "application/json" },
    "response_headers": { "Content-Type": "application/json" },
    "request_size": 256,
    "response_size": 128,
    "remote_addr": "1.2.3.4:54321",
    "timestamp": "2026-03-28T12:00:00Z"
  }
]
\`\`\`

## Replay a Request

\`\`\`
POST /api/v1/tunnels/:tunnelUrl/replay/:requestId
\`\`\`

## Live Traffic (WebSocket)

\`\`\`
WS /api/v1/ws/traffic/:tunnelUrl
\`\`\`

Each message is a JSON-encoded captured request.`,
  },

  "sdks/javascript": {
    slug: "sdks/javascript",
    title: "JavaScript / TypeScript",
    description: "Use the @serverme/sdk npm package.",
    category: "SDKs",
    content: `## Install

\`\`\`bash
npm install @serverme/sdk
\`\`\`

## Quick Start

\`\`\`typescript
import { ServerMe } from '@serverme/sdk';

const client = new ServerMe({ authtoken: 'sm_live_...' });

// List tunnels
const tunnels = await client.tunnels.list();

// Inspect traffic
const requests = await client.inspect.list(tunnels[0].url);

// Replay a request
const result = await client.inspect.replay(tunnels[0].url, requests[0].id);
\`\`\`

## Live Traffic Streaming

\`\`\`typescript
const stream = client.inspect.subscribe('https://abc123.serverme.site');

for await (const req of stream) {
  console.log(\`\${req.method} \${req.path} -> \${req.statusCode}\`);
}

stream.close();
\`\`\`

## API Keys

\`\`\`typescript
const keys = await client.apiKeys.list();
const { apiKey, info } = await client.apiKeys.create('my-app');
await client.apiKeys.delete(info.id);
\`\`\`

## Custom Domains

\`\`\`typescript
const { domain, instructions } = await client.domains.create('api.example.com');
const result = await client.domains.verify(domain.id);
\`\`\`

## Error Handling

\`\`\`typescript
import { AuthError, RateLimitError, ApiError } from '@serverme/sdk';

try {
  await client.tunnels.list();
} catch (err) {
  if (err instanceof AuthError) { /* bad token */ }
  if (err instanceof RateLimitError) { /* retry in err.retryAfter seconds */ }
}
\`\`\``,
  },

  "sdks/python": {
    slug: "sdks/python",
    title: "Python",
    description: "Use the serverme pip package.",
    category: "SDKs",
    content: `## Install

\`\`\`bash
pip install serverme
\`\`\`

## Quick Start

\`\`\`python
import asyncio
from serverme import ServerMe

async def main():
    async with ServerMe(authtoken="sm_live_...") as client:
        tunnels = await client.tunnels.list()
        requests = await client.inspect.list(tunnels[0].url)

        for req in requests:
            print(f"{req.method} {req.path} -> {req.status_code}")

asyncio.run(main())
\`\`\`

## Live Traffic

\`\`\`python
async with ServerMe(authtoken="sm_live_...") as client:
    async for req in client.inspect.subscribe(tunnel_url):
        print(f"{req.method} {req.path} -> {req.status_code}")
\`\`\`

## API Keys

\`\`\`python
keys = await client.api_keys.list()
full_token, info = await client.api_keys.create("my-app")
await client.api_keys.delete(info.id)
\`\`\`

## Error Handling

\`\`\`python
from serverme import AuthError, RateLimitError

try:
    await client.tunnels.list()
except AuthError:
    print("Bad token")
except RateLimitError as e:
    print(f"Retry in {e.retry_after}s")
\`\`\``,
  },

  "advanced/custom-domains": {
    slug: "advanced/custom-domains",
    title: "Custom Domains",
    description: "Use your own domain with ServerMe tunnels.",
    category: "Advanced",
    content: `## Setup

1. **Add the domain** via the dashboard or API:

\`\`\`bash
curl -X POST https://api.serverme.site/api/v1/domains \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"domain": "api.example.com"}'
\`\`\`

2. **Add a CNAME record** in your DNS provider:

\`\`\`
CNAME  api.example.com  →  tunnel.serverme.site
\`\`\`

3. **Verify** the domain:

\`\`\`bash
curl -X POST https://api.serverme.site/api/v1/domains/<id>/verify \\
  -H "Authorization: Bearer <token>"
\`\`\`

4. **Use it** in your tunnel:

\`\`\`bash
serverme http 3000 --hostname api.example.com
\`\`\`

## Wildcard Domains

Pro and Business plans support wildcard domains:

\`\`\`bash
serverme http 3000 --hostname "*.myapp.serverme.site"
\`\`\`

The subdomain is passed to your app via the \`X-Forwarded-Host\` header.

## TLS Certificates

ServerMe automatically provisions Let's Encrypt certificates for verified custom domains. No configuration needed.`,
  },

  "advanced/traffic-policies": {
    slug: "advanced/traffic-policies",
    title: "Traffic Policies",
    description: "Manipulate requests and responses at the edge.",
    category: "Advanced",
    content: `## Overview

Traffic policies let you modify HTTP requests and responses as they pass through the tunnel, without changing your application code.

## Header Manipulation

\`\`\`json
{
  "add_request_headers": {
    "X-Custom-Header": "value"
  },
  "remove_request_headers": ["Cookie", "Authorization"],
  "set_response_headers": {
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=31536000"
  }
}
\`\`\`

## URL Rewriting

\`\`\`json
{
  "url_rewrites": [
    { "match": "^/api/v1/(.*)", "replace": "/v1/$1" },
    { "match": "^/old-path", "replace": "/new-path" }
  ]
}
\`\`\`

## Path Filtering

\`\`\`json
{
  "allow_paths": ["^/api/", "^/webhook"],
  "deny_paths": ["^/admin", "^/internal"]
}
\`\`\`

Deny rules are evaluated first. If an allow list is set, only matching paths are permitted.`,
  },

  "advanced/webhooks": {
    slug: "advanced/webhooks",
    title: "Webhook Verification",
    description: "Verify webhook signatures at the edge.",
    category: "Advanced",
    content: `## Supported Providers

| Provider | Header | Algorithm |
|----------|--------|-----------|
| **Stripe** | \`Stripe-Signature\` | HMAC-SHA256 with timestamp |
| **GitHub** | \`X-Hub-Signature-256\` | HMAC-SHA256 |
| **Generic** | \`X-Signature\` | HMAC-SHA256 |

## How It Works

When enabled, ServerMe verifies the webhook signature before forwarding the request to your tunnel. Invalid signatures get a \`403 Forbidden\` response.

Verified requests include the header:
\`\`\`
X-ServerMe-Webhook-Verified: true
\`\`\`

## Configuration

Set the webhook provider and signing secret per tunnel. Your app receives only verified webhooks — no signature checking code needed.`,
  },

  "advanced/self-hosting": {
    slug: "advanced/self-hosting",
    title: "Self-Hosting",
    description: "Run your own ServerMe server.",
    category: "Advanced",
    content: `## Docker Compose

The fastest way to self-host:

\`\`\`yaml
services:
  serverme:
    image: ghcr.io/serverme/servermesrv:latest
    ports:
      - "8443:8443"  # Control (CLI connects here)
      - "8080:8080"  # HTTP proxy (public traffic)
      - "8081:8081"  # REST API
    environment:
      - SM_DOMAIN=tunnel.yourdomain.com
      - SM_AUTH_TOKEN=your-secret-token
      - SM_DATABASE_URL=postgres://serverme:serverme@postgres:5432/serverme
      - SM_JWT_SECRET=your-jwt-secret
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: serverme
      POSTGRES_USER: serverme
      POSTGRES_PASSWORD: serverme
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
\`\`\`

## Binary

\`\`\`bash
servermesrv \\
  --domain tunnel.yourdomain.com \\
  --addr :8443 \\
  --http-addr :8080 \\
  --api-addr :8081 \\
  --tls-cert /path/to/cert.pem \\
  --tls-key /path/to/key.pem \\
  --database-url "postgres://..." \\
  --jwt-secret "change-me" \\
  --auth-token "fallback-token"
\`\`\`

## DNS Setup

Point your domain to the server:

\`\`\`
A     tunnel.yourdomain.com    → <server-ip>
CNAME *.tunnel.yourdomain.com  → tunnel.yourdomain.com
\`\`\`

## Connect Clients

\`\`\`bash
serverme http 3000 --server tunnel.yourdomain.com:8443
\`\`\``,
  },
};

export function getDoc(slug: string): DocPage | null {
  return docs[slug] || null;
}

export function getAllSlugs(): string[] {
  return Object.keys(docs);
}
