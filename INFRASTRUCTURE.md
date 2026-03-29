# ServerMe Infrastructure Guide

> This document describes how ServerMe is deployed in production. Read this fully before making any changes.

## VPS Details

| Field | Value |
|-------|-------|
| IP | `163.245.208.218` |
| OS | Ubuntu 22.04 |
| User | `root` |
| Password | `73q16xXCrD11` |
| Domain | `serverme.site` |
| DNS | Wildcard `*.serverme.site` → `163.245.208.218` (via Porkbun) |
| RAM | 3.8 GB |
| Disk | 77 GB (51 GB used) |

## Services Overview

There are **5 systemd services** running. The dependency chain is:

```
postgresql → serverme → serverme-texis
                      → caddy
serverme-web (independent)
```

| Service | Binary | Port | Purpose |
|---------|--------|------|---------|
| `serverme` | `/usr/local/bin/servermesrv` | `:8443` (TLS control), `:9080` (HTTP proxy), `:9081` (REST API) | Tunnel server + API |
| `serverme-web` | Node.js `/opt/serverme-web/server.js` | `:3000` | Next.js website |
| `serverme-texis` | `/usr/local/bin/serverme` | — (client, connects to :8443) | Tunnels port 8881 (Texis bot) as `texis.serverme.site` |
| `caddy` | System package | `:80`, `:443` | TLS termination, reverse proxy |
| `postgresql` | System package | `:5432` (localhost only) | Database |

### Port Map

```
Internet :443 → Caddy → routes by domain:
  serverme.site        → localhost:3000 (Next.js website)
  api.serverme.site    → localhost:9081 (REST API)
  texis.serverme.site  → localhost:9080 (tunnel HTTP proxy)
  tunnel.serverme.site → localhost:9080 (tunnel HTTP proxy)
  voice.clawtunnel.com → localhost:3001 (unrelated voice service)

CLI clients connect directly to :8443 (TLS smux control)
```

## File Locations

| What | Path |
|------|------|
| Server binary | `/usr/local/bin/servermesrv` |
| CLI binary | `/usr/local/bin/serverme` |
| Website (Next.js standalone) | `/opt/serverme-web/` |
| Caddy config | `/etc/caddy/Caddyfile` |
| ServerMe service | `/etc/systemd/system/serverme.service` |
| Texis service | `/etc/systemd/system/serverme-texis.service` |
| Web service | `/etc/systemd/system/serverme-web.service` |
| TLS certificates | `/etc/letsencrypt/live/serverme.site/` |
| PostgreSQL data | Managed by system PostgreSQL 16 |

## Database

```
Host:     localhost:5432
Database: serverme
User:     serverme
Password: serverme2026
```

Connect: `sudo -u postgres psql serverme`

Tables: `users`, `api_keys`, `domains`, `reserved_subdomains`, `teams`, `team_members`, `tunnel_logs`

## Credentials in Service Files

The `serverme.service` file contains sensitive values inline:

- `--jwt-secret=...` — JWT signing key
- `--google-client-id=...` / `--google-client-secret=...` — Google OAuth
- `--auth-token=dev-token` — Fallback auth token for non-DB clients
- `--database-url=...` — PostgreSQL connection string

The `serverme-texis.service` contains:
- `--authtoken=sm_live_texis_tunnel_key_for_jams_2026` — API key owned by `jamsakino404@gmail.com`

## Common Operations

### Check status of all services

```bash
systemctl status serverme serverme-texis serverme-web caddy postgresql
```

### View logs

```bash
journalctl -u serverme -f              # Server logs (live)
journalctl -u serverme-texis -f        # Texis tunnel logs
journalctl -u serverme-web -f          # Website logs
journalctl -u caddy -f                 # Caddy/TLS logs
```

### Restart a service

```bash
systemctl restart serverme         # Tunnel server
systemctl restart serverme-texis   # Texis tunnel (auto-restarts when serverme restarts)
systemctl restart serverme-web     # Website
systemctl reload caddy             # Caddy (reload without downtime)
```

## Deployment Procedures

### Deploy new server binary

```bash
# 1. Build on local machine (from serverme/ root)
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -C server -ldflags="-s -w" -o /tmp/servermesrv ./cmd/servermesrv

# 2. Stop services (order matters)
ssh root@163.245.208.218 "systemctl stop serverme-texis && systemctl stop serverme"

# 3. Upload binary
scp /tmp/servermesrv root@163.245.208.218:/usr/local/bin/servermesrv

# 4. Start services (order matters)
ssh root@163.245.208.218 "systemctl start serverme && sleep 2 && systemctl start serverme-texis"

# 5. Verify
ssh root@163.245.208.218 "systemctl is-active serverme serverme-texis && curl -s http://localhost:9080/health"
```

**IMPORTANT**: Always stop `serverme-texis` BEFORE `serverme`, and start `serverme` BEFORE `serverme-texis`. The texis client depends on the server being up.

### Deploy new website

```bash
# 1. Build on local machine (from serverme/web/)
NEXT_PUBLIC_API_URL=https://api.serverme.site npm run build

# 2. Package standalone build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cd .next/standalone && tar czf /tmp/serverme-web.tar.gz .

# 3. Upload
scp /tmp/serverme-web.tar.gz root@163.245.208.218:/tmp/

# 4. Deploy and restart
ssh root@163.245.208.218 "cd /opt/serverme-web && rm -rf .next server.js public package.json node_modules && tar xzf /tmp/serverme-web.tar.gz && systemctl restart serverme-web"

# 5. Verify
curl -s https://serverme.site/ | grep '<title>'
```

### Deploy both server + website

Follow the server steps first, then the website steps. The website and server are independent — the website only talks to the API via HTTPS.

### Update Caddy config

```bash
# 1. Edit the Caddyfile
ssh root@163.245.208.218 "nano /etc/caddy/Caddyfile"

# 2. Format and reload (no downtime)
ssh root@163.245.208.218 "caddy fmt --overwrite /etc/caddy/Caddyfile && systemctl reload caddy"
```

### Add a new tunnel subdomain to Caddy

If you need a new subdomain routed through the tunnel proxy, add this block to the Caddyfile:

```
newsubdomain.serverme.site {
    reverse_proxy localhost:9080
}
```

Then reload Caddy. It will auto-provision a TLS certificate.

## Things That Will Break If You're Not Careful

1. **Stopping `serverme` kills ALL active tunnels** — the texis bot tunnel will go down. Always restart quickly.

2. **The server binary must be stopped before overwriting** — Linux won't let you overwrite a running binary. Always `systemctl stop serverme` first.

3. **Caddy manages TLS certificates automatically** — don't touch `/etc/letsencrypt` manually. Caddy stores its own certs in `/var/lib/caddy/.local/share/caddy/`.

4. **The Texis bot on port 8881 is independent** — it's a Python process that runs regardless of ServerMe. The `serverme-texis` service just tunnels traffic TO it. If the tunnel goes down, the bot keeps running but is unreachable from the internet.

5. **Database migrations run automatically** — when `servermesrv` starts, it runs goose migrations. New schema changes are applied on startup.

6. **Don't change the JWT secret** — changing it invalidates ALL existing user sessions. Users would need to re-login.

7. **Port 8443 uses the Let's Encrypt cert** for TLS — if certs expire, CLI clients can't connect. Caddy handles cert renewal for its domains, but the `servermesrv` cert at `/etc/letsencrypt/live/serverme.site/` needs `certbot renew`.

## Quick Health Check

```bash
# All services running?
systemctl is-active serverme serverme-texis serverme-web caddy postgresql

# Server health
curl -s http://localhost:9080/health

# API health
curl -s http://localhost:9081/api/v1/health

# Website
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# External (from any machine)
curl -s https://serverme.site/
curl -s https://api.serverme.site/api/v1/health
curl -s https://texis.serverme.site/
```

## Owner Account

The primary account is `jamsakino404@gmail.com` (Google OAuth sign-in). The texis tunnel is owned by this account.
