-- +goose Up

-- Add admin flag to users
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Set initial admin
UPDATE users SET is_admin = true WHERE email = 'jamsakino404@gmail.com';

-- +goose Down

ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
