# ServerMe — Progress Tracker

**All 7 phases complete.** 41 Go files, 39 TypeScript/TSX files, 4 Python files. Full-stack open-source tunneling platform.

## Phase 1: Core Protocol + HTTP Tunneling ✅

**Status: Complete**

- [x] Monorepo structure (go.work, Makefile, LICENSE, README)
- [x] Protocol package (`proto/`) — message types, length-prefixed JSON codec, 6 tests passing
- [x] Tunnel server (`server/`) — TLS/TCP listener, smux sessions, control manager, tunnel registry, HTTP proxy
- [x] CLI client (`cli/`) — `serverme http <port>`, authtoken save, version command
- [x] End-to-end verified — traffic flows: Internet → Server → smux → CLI → local service → back

**Binaries:** `bin/servermesrv` (8.7MB), `bin/serverme` (7.3MB)

---

## Phase 2: TCP + TLS Tunnels, Config, Reconnect ✅

**Status: Complete**

- [x] TCP tunnels — dynamic port allocator (10000–60000), per-port listener, raw TCP forwarding
- [x] TLS tunnels — SNI peek + passthrough routing (no termination)
- [x] CLI config file — `~/.serverme/serverme.yml` via YAML, `serverme start` command
- [x] Auto-reconnect — exponential backoff with jitter (1s → 60s max) via `RunWithReconnect()`
- [x] Graceful shutdown — SIGINT/SIGTERM handling
- [x] `serverme tcp <port>` command (with `--remote-port` flag)
- [x] `serverme tls <port>` command (with `--subdomain` flag)
- [x] `serverme start` command (launch all tunnels from config file)
- [x] `serverme status` command (placeholder for Phase 4 inspector)
- [x] End-to-end tested: HTTP tunnel, TCP tunnel (echo server through port 10000)

---

## Phase 3: Auth, Domains, Rate Limiting ✅

**Status: Complete**

- [x] PostgreSQL integration — schema with goose migrations, pgx connection pool, 7 tables
- [x] User model — registration, login, email/password with bcrypt
- [x] JWT authentication — `Authorization: Bearer <token>` for dashboard/API
- [x] API key authentication — `X-API-Key: sm_live_...` for SDK/CLI
- [x] Smart auth middleware — handles both JWT and API keys, wired into REST API
- [x] Custom domains — CNAME verification via DNS lookup, domain CRUD
- [x] Reserved subdomains — paid plan restriction enforced
- [x] Rate limiting — `golang.org/x/time/rate` per-IP with plan-based limits
- [x] IP restrictions — allow/deny CIDR lists per tunnel
- [x] Basic auth at edge (from Phase 1)
- [x] REST API on `:8081` with chi router — register, login, users, api-keys, domains, tunnels
- [x] CLI authenticates via API key against database
- [x] Dev mode still works without database (static token fallback)
- [x] End-to-end tested: register → login → JWT + API key auth → create domain → tunnel via API key

---

## Phase 4: Request Inspection + Replay ✅

**Status: Complete**

- [x] Server-side HTTP capture middleware — method, URL, headers, body ≤10KB, status, timing, remote addr
- [x] In-memory ring buffer (500 requests per tunnel) with pub/sub for live subscribers
- [x] Inspection store — per-tunnel capture, subscribe/unsubscribe, stats
- [x] REST endpoints — `GET /api/v1/tunnels/{url}/requests`, `GET .../requests/{id}`, `POST .../replay/{id}`
- [x] WebSocket endpoint — `/api/v1/ws/traffic/{url}` for live traffic streaming
- [x] CLI local web inspector — dark-themed UI on `localhost:4040` with auto-refresh
- [x] Replay engine — reconstructs captured request, sends through tunnel, captures response
- [x] End-to-end tested: 5 requests through tunnel → 4 captured with full metadata

---

## Phase 5: Website + Dashboard ✅

**Status: Complete**

- [x] Next.js 16 + Tailwind v4 + shadcn/ui + next-themes (dark by default)
- [x] Marketing — landing page with hero, terminal preview, features grid (9 features), code examples, pricing (3 tiers), CTA
- [x] Navbar — responsive with mobile menu, logo, links, sign in/up
- [x] Footer — product/developer/company links, MIT license
- [x] Auth pages — sign in (email/password) + sign up (with API key reveal + copy)
- [x] Dashboard sidebar — Tunnels, Domains, Inspector, API Keys, Team, Settings, Sign out
- [x] Tunnels page — live list with auto-refresh, protocol badges, active indicators, empty state with CLI prompt
- [x] Domains page — add domain, CNAME instructions, verify, delete, verified/pending badges
- [x] Inspector page — tunnel selector, live WebSocket traffic stream, request list + detail pane, filter, clear
- [x] API Keys page — create with name, copy new key, list with prefix/last used/created, delete
- [x] Team page — member list, invite form, role descriptions (Owner/Admin/Member)
- [x] Settings page — profile edit, plan display with upgrade, danger zone (delete account)
- [x] API client (`lib/api.ts`) — full typed client for all REST endpoints
- [x] All 10 routes build and serve successfully

---

## Phase 6: SDKs ✅

**Status: Complete**

- [x] **JavaScript/TypeScript SDK** (`@serverme/sdk`) — full typed client with sub-clients (tunnels, inspect, apiKeys, domains, users), WebSocket live traffic stream via async iterator, custom error types, CJS + ESM dual build via tsup
- [x] **Python SDK** (`serverme`) — async client with aiohttp, context manager support, dataclass types, WebSocket streaming via async iterator, typed errors, py.typed marker
- [x] Both SDKs: README with examples, error handling, self-hosted support
- [x] JS SDK: TypeScript strict mode passes, CJS + ESM imports verified
- [x] Python SDK: all imports verified, type construction tested

---

## Phase 7: Advanced Features ✅

**Status: Complete**

- [x] **Traffic policies engine** — header add/remove/set (request + response), URL rewriting with regex capture groups, path allow/deny filtering, pre-compiled patterns, helper functions (StripPrefix, AddPrefix, ReplacePathSegment), security headers middleware
- [x] **OAuth at edge** — Google + GitHub providers, session cookies, CSRF state protection, callback handler, auto-redirect flow, X-ServerMe-User header injection
- [x] **Webhook signature verification** — Stripe (Stripe-Signature + timestamp), GitHub (X-Hub-Signature-256), generic HMAC-SHA256, middleware that blocks invalid signatures
- [x] **Wildcard domains** — `*.example.com` matching with single-level wildcard, subdomain extraction, LookupByHostWithWildcard in registry
- [x] **Multi-node clustering** — Redis-backed ClusterRegistry with TTL-based registration, cross-node tunnel lookup, heartbeat refresh, TunnelRecord serialization
- [x] **Prometheus metrics** — active tunnels/clients gauges, HTTP request counters/histograms (by method/status), TCP connection/bytes counters, auth attempt counters, smux stream gauge, `/metrics` endpoint
- [x] **Dockerfiles** — multi-stage Alpine builds for server (8443/8080/8081) and CLI, tini init, ca-certificates
- [x] **GoReleaser config** — dual binary release (servermesrv + serverme), Linux/macOS/Windows, amd64/arm64, tar.gz/zip, checksums
- [x] All 6 proto tests pass, end-to-end HTTP + TCP tunnels verified

---

## Architecture

```
Internet → ServerMe Server (Go) → smux over TLS → ServerMe CLI (Go) → Local Service
                ↕                                        ↕
         PostgreSQL + Redis                    ~/.serverme/serverme.yml
                ↕
     Next.js Dashboard + REST API
                ↕
        JS SDK / Python SDK
```

## Repo Layout

```
serverme/
├── proto/      ✅  Shared protocol (messages, codec)
├── server/     ✅  Tunnel server + REST API + Auth + DB
├── cli/        ✅  CLI client (http, tcp, tls, start, config)
├── web/        ✅  Next.js 16 website + dashboard (10 pages)
├── sdk-js/     ✅  @serverme/sdk (TypeScript, CJS+ESM)
├── sdk-python/ ✅  serverme (async Python, aiohttp)
├── docs/       ⬜  Documentation (future)
├── deploy/     ✅  Docker Compose (Postgres + Redis)
├── .goreleaser ✅  Multi-platform release config
├── Dockerfile  ✅  Server + CLI Docker images
└── Makefile    ✅  Build, test, dev commands
```
