package db

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/jackc/pgx/v5"
)

// TelegramConnection represents a user's linked Telegram account.
type TelegramConnection struct {
	ID                     string `json:"id"`
	UserID                 string `json:"user_id"`
	ChatID                 int64  `json:"chat_id"`
	Username               string `json:"username"`
	FirstName              string `json:"first_name"`
	NotifyTunnelConnect    bool   `json:"notify_tunnel_connect"`
	NotifyTunnelDisconnect bool   `json:"notify_tunnel_disconnect"`
	NotifyErrorSpike       bool   `json:"notify_error_spike"`
	NotifyTrafficSummary   bool   `json:"notify_traffic_summary"`
	NotifyNewSignup        bool   `json:"notify_new_signup"`
	CreatedAt              time.Time `json:"created_at"`
}

// CreateLinkCode generates a one-time code for linking Telegram.
func (d *DB) CreateLinkCode(ctx context.Context, userID string) (string, error) {
	b := make([]byte, 16)
	rand.Read(b)
	code := hex.EncodeToString(b)

	_, err := d.Pool.Exec(ctx,
		`INSERT INTO telegram_link_codes (code, user_id, expires_at)
		 VALUES ($1, $2, $3)`,
		code, userID, time.Now().Add(10*time.Minute),
	)
	return code, err
}

// RedeemLinkCode validates a code and returns the user ID. Deletes the code after use.
func (d *DB) RedeemLinkCode(ctx context.Context, code string) (string, error) {
	var userID string
	err := d.Pool.QueryRow(ctx,
		`DELETE FROM telegram_link_codes WHERE code = $1 AND expires_at > now() RETURNING user_id`,
		code,
	).Scan(&userID)
	if err == pgx.ErrNoRows {
		return "", nil
	}
	return userID, err
}

// SaveTelegramConnection links a Telegram chat to a user.
func (d *DB) SaveTelegramConnection(ctx context.Context, userID string, chatID int64, username, firstName string) error {
	_, err := d.Pool.Exec(ctx,
		`INSERT INTO telegram_connections (user_id, chat_id, username, first_name)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (user_id) DO UPDATE SET chat_id = $2, username = $3, first_name = $4`,
		userID, chatID, username, firstName,
	)
	return err
}

// GetTelegramConnection returns a user's Telegram connection.
func (d *DB) GetTelegramConnection(ctx context.Context, userID string) (*TelegramConnection, error) {
	var tc TelegramConnection
	err := d.Pool.QueryRow(ctx,
		`SELECT id, user_id, chat_id, username, first_name,
		 notify_tunnel_connect, notify_tunnel_disconnect, notify_error_spike,
		 notify_traffic_summary, notify_new_signup, created_at
		 FROM telegram_connections WHERE user_id = $1`,
		userID,
	).Scan(&tc.ID, &tc.UserID, &tc.ChatID, &tc.Username, &tc.FirstName,
		&tc.NotifyTunnelConnect, &tc.NotifyTunnelDisconnect, &tc.NotifyErrorSpike,
		&tc.NotifyTrafficSummary, &tc.NotifyNewSignup, &tc.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &tc, err
}

// GetTelegramConnectionByUser returns the chat ID for notification sending.
func (d *DB) GetTelegramByUserID(ctx context.Context, userID string) (*TelegramConnection, error) {
	return d.GetTelegramConnection(ctx, userID)
}

// UpdateTelegramPreferences updates notification preferences.
func (d *DB) UpdateTelegramPreferences(ctx context.Context, userID string, prefs map[string]bool) error {
	tc, err := d.GetTelegramConnection(ctx, userID)
	if err != nil || tc == nil {
		return err
	}

	connect := tc.NotifyTunnelConnect
	disconnect := tc.NotifyTunnelDisconnect
	errorSpike := tc.NotifyErrorSpike
	summary := tc.NotifyTrafficSummary
	signup := tc.NotifyNewSignup

	if v, ok := prefs["tunnel_connect"]; ok { connect = v }
	if v, ok := prefs["tunnel_disconnect"]; ok { disconnect = v }
	if v, ok := prefs["error_spike"]; ok { errorSpike = v }
	if v, ok := prefs["traffic_summary"]; ok { summary = v }
	if v, ok := prefs["new_signup"]; ok { signup = v }

	_, err = d.Pool.Exec(ctx,
		`UPDATE telegram_connections SET
		 notify_tunnel_connect = $2, notify_tunnel_disconnect = $3,
		 notify_error_spike = $4, notify_traffic_summary = $5, notify_new_signup = $6
		 WHERE user_id = $1`,
		userID, connect, disconnect, errorSpike, summary, signup,
	)
	return err
}

// DeleteTelegramConnection unlinks Telegram from a user.
func (d *DB) DeleteTelegramConnection(ctx context.Context, userID string) error {
	_, err := d.Pool.Exec(ctx, `DELETE FROM telegram_connections WHERE user_id = $1`, userID)
	return err
}

// GetAllTelegramConnections returns all connections (for broadcast/summary notifications).
func (d *DB) GetAllTelegramConnections(ctx context.Context) ([]TelegramConnection, error) {
	rows, err := d.Pool.Query(ctx,
		`SELECT id, user_id, chat_id, username, first_name,
		 notify_tunnel_connect, notify_tunnel_disconnect, notify_error_spike,
		 notify_traffic_summary, notify_new_signup, created_at
		 FROM telegram_connections`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []TelegramConnection
	for rows.Next() {
		var tc TelegramConnection
		rows.Scan(&tc.ID, &tc.UserID, &tc.ChatID, &tc.Username, &tc.FirstName,
			&tc.NotifyTunnelConnect, &tc.NotifyTunnelDisconnect, &tc.NotifyErrorSpike,
			&tc.NotifyTrafficSummary, &tc.NotifyNewSignup, &tc.CreatedAt)
		result = append(result, tc)
	}
	return result, nil
}
