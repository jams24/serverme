-- +goose Up

CREATE TABLE captured_requests (
    id              TEXT PRIMARY KEY,
    tunnel_url      TEXT NOT NULL,
    user_id         UUID,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_ms     DOUBLE PRECISION NOT NULL DEFAULT 0,
    method          TEXT NOT NULL DEFAULT '',
    path            TEXT NOT NULL DEFAULT '',
    query           TEXT NOT NULL DEFAULT '',
    status_code     INT NOT NULL DEFAULT 0,
    request_headers JSONB NOT NULL DEFAULT '{}',
    response_headers JSONB NOT NULL DEFAULT '{}',
    request_size    BIGINT NOT NULL DEFAULT 0,
    response_size   BIGINT NOT NULL DEFAULT 0,
    remote_addr     TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_captured_requests_tunnel ON captured_requests(tunnel_url, timestamp DESC);
CREATE INDEX idx_captured_requests_user ON captured_requests(user_id, timestamp DESC);
CREATE INDEX idx_captured_requests_status ON captured_requests(status_code);
CREATE INDEX idx_captured_requests_time ON captured_requests(timestamp DESC);

-- +goose Down

DROP TABLE IF EXISTS captured_requests;
