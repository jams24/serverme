-- +goose Up

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    subdomain       TEXT UNIQUE NOT NULL,
    repo_url        TEXT,
    branch          TEXT NOT NULL DEFAULT 'main',
    framework       TEXT NOT NULL DEFAULT 'static',   -- static, nextjs, node, python, docker
    build_cmd       TEXT NOT NULL DEFAULT '',
    start_cmd       TEXT NOT NULL DEFAULT '',
    env_vars        JSONB NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'created',  -- created, building, running, stopped, failed
    container_id    TEXT,
    container_port  INT,
    last_deploy_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_subdomain ON projects(subdomain);
CREATE INDEX idx_projects_status ON projects(status);

CREATE TABLE deploy_logs (
    id          BIGSERIAL PRIMARY KEY,
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    level       TEXT NOT NULL DEFAULT 'info',  -- info, error, build, deploy
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deploy_logs_project ON deploy_logs(project_id, created_at DESC);

-- +goose Down

DROP TABLE IF EXISTS deploy_logs;
DROP TABLE IF EXISTS projects;
