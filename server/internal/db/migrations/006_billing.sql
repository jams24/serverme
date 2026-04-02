-- +goose Up

CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan            TEXT NOT NULL DEFAULT 'premium',
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending, active, expired, cancelled
    payment_id      TEXT,                              -- InventPay payment ID
    amount          DOUBLE PRECISION NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'USDT',
    period_start    TIMESTAMPTZ,
    period_end      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(payment_id)
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_payment ON subscriptions(payment_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- +goose Down

DROP TABLE IF EXISTS subscriptions;
