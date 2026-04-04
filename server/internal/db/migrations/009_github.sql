-- +goose Up

CREATE TABLE github_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    github_username TEXT NOT NULL,
    access_token    TEXT NOT NULL,
    refresh_token   TEXT,
    installation_id BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_github_user ON github_connections(user_id);

-- Add github fields to projects
ALTER TABLE projects ADD COLUMN github_repo TEXT;
ALTER TABLE projects ADD COLUMN github_branch TEXT NOT NULL DEFAULT 'main';
ALTER TABLE projects ADD COLUMN auto_deploy BOOLEAN NOT NULL DEFAULT true;

-- +goose Down

ALTER TABLE projects DROP COLUMN IF EXISTS auto_deploy;
ALTER TABLE projects DROP COLUMN IF EXISTS github_branch;
ALTER TABLE projects DROP COLUMN IF EXISTS github_repo;
DROP TABLE IF EXISTS github_connections;
