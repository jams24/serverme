-- +goose Up

CREATE TABLE telegram_connections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_id     BIGINT NOT NULL,
    username    TEXT NOT NULL DEFAULT '',
    first_name  TEXT NOT NULL DEFAULT '',
    -- Notification preferences
    notify_tunnel_connect    BOOLEAN NOT NULL DEFAULT true,
    notify_tunnel_disconnect BOOLEAN NOT NULL DEFAULT true,
    notify_error_spike       BOOLEAN NOT NULL DEFAULT true,
    notify_traffic_summary   BOOLEAN NOT NULL DEFAULT false,
    notify_new_signup        BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

CREATE INDEX idx_telegram_user ON telegram_connections(user_id);
CREATE INDEX idx_telegram_chat ON telegram_connections(chat_id);

-- Linking codes for /start command
CREATE TABLE telegram_link_codes (
    code        TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down

DROP TABLE IF EXISTS telegram_link_codes;
DROP TABLE IF EXISTS telegram_connections;
