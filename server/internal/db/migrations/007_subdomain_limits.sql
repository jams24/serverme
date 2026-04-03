-- +goose Up

-- Track all subdomains ever used by a user (auto-reserved on first use)
ALTER TABLE reserved_subdomains ADD COLUMN IF NOT EXISTS auto_reserved BOOLEAN NOT NULL DEFAULT true;

-- Plan limits table
CREATE TABLE plan_limits (
    plan            TEXT PRIMARY KEY,
    max_subdomains  INT NOT NULL DEFAULT 10,
    max_tunnels     INT NOT NULL DEFAULT 10,
    max_rate        INT NOT NULL DEFAULT 100
);

INSERT INTO plan_limits (plan, max_subdomains, max_tunnels, max_rate) VALUES
    ('free', 10, 10, 100),
    ('premium', 50, 10, 500)
ON CONFLICT (plan) DO NOTHING;

-- +goose Down

DROP TABLE IF EXISTS plan_limits;
ALTER TABLE reserved_subdomains DROP COLUMN IF EXISTS auto_reserved;
