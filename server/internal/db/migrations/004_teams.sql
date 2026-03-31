-- +goose Up

-- Add team_id to existing tables so resources can belong to a team
ALTER TABLE api_keys ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE domains ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Team invitations
CREATE TABLE team_invitations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'member',
    invited_by  UUID NOT NULL REFERENCES users(id),
    token       TEXT UNIQUE NOT NULL,
    accepted    BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);

-- +goose Down

DROP TABLE IF EXISTS team_invitations;
ALTER TABLE domains DROP COLUMN IF EXISTS team_id;
ALTER TABLE api_keys DROP COLUMN IF EXISTS team_id;
