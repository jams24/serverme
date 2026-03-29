-- +goose Up

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    plan        TEXT NOT NULL DEFAULT 'free',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);

-- API Keys
CREATE TABLE api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT 'default',
    token_hash  TEXT UNIQUE NOT NULL,
    prefix      TEXT NOT NULL,          -- first 8 chars for display (e.g., "sm_live_a1b2...")
    last_used_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_token_hash ON api_keys(token_hash);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- Custom Domains
CREATE TABLE domains (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain      TEXT UNIQUE NOT NULL,
    verified    BOOLEAN NOT NULL DEFAULT false,
    cname_target TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_domains_domain ON domains(domain);
CREATE INDEX idx_domains_user_id ON domains(user_id);

-- Reserved Subdomains
CREATE TABLE reserved_subdomains (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subdomain   TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reserved_subdomains_subdomain ON reserved_subdomains(subdomain);

-- Teams
CREATE TABLE teams (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team Members
CREATE TABLE team_members (
    team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'member',
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, user_id)
);

-- Tunnel Logs (for analytics)
CREATE TABLE tunnel_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL,
    tunnel_name TEXT NOT NULL DEFAULT '',
    protocol    TEXT NOT NULL,
    public_url  TEXT NOT NULL,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at    TIMESTAMPTZ,
    bytes_in    BIGINT NOT NULL DEFAULT 0,
    bytes_out   BIGINT NOT NULL DEFAULT 0,
    connections BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_tunnel_logs_user_id ON tunnel_logs(user_id);
CREATE INDEX idx_tunnel_logs_started_at ON tunnel_logs(started_at);

-- +goose Down

DROP TABLE IF EXISTS tunnel_logs;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS reserved_subdomains;
DROP TABLE IF EXISTS domains;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS users;
