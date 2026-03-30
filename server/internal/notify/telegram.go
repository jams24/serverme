package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/rs/zerolog"
)

const telegramAPI = "https://api.telegram.org/bot"

// TelegramBot handles sending notifications via Telegram.
type TelegramBot struct {
	token  string
	client *http.Client
	log    zerolog.Logger
}

// NewTelegramBot creates a new Telegram notifier.
func NewTelegramBot(token string, log zerolog.Logger) *TelegramBot {
	return &TelegramBot{
		token:  token,
		client: &http.Client{Timeout: 10 * time.Second},
		log:    log.With().Str("component", "telegram").Logger(),
	}
}

// SendMessage sends a text message to a chat.
func (b *TelegramBot) SendMessage(chatID int64, text string, parseMode string) error {
	if b.token == "" {
		return nil
	}

	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": parseMode,
	}

	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("%s%s/sendMessage", telegramAPI, b.token)

	resp, err := b.client.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		b.log.Warn().Err(err).Int64("chat_id", chatID).Msg("failed to send telegram message")
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		b.log.Warn().Int("status", resp.StatusCode).Str("body", string(respBody)).Msg("telegram API error")
		return fmt.Errorf("telegram API error: %d", resp.StatusCode)
	}

	return nil
}

// SendMarkdown sends a Markdown-formatted message.
func (b *TelegramBot) SendMarkdown(chatID int64, text string) error {
	return b.SendMessage(chatID, text, "Markdown")
}

// SendHTML sends an HTML-formatted message.
func (b *TelegramBot) SendHTML(chatID int64, text string) error {
	return b.SendMessage(chatID, text, "HTML")
}

// NotifyTunnelConnected sends a tunnel connected alert.
func (b *TelegramBot) NotifyTunnelConnected(chatID int64, tunnelURL, protocol, localAddr string) {
	msg := fmt.Sprintf("🟢 *Tunnel Connected*\n\n`%s`\n\nProtocol: %s\nForwarding to: `%s`",
		tunnelURL, protocol, localAddr)
	b.SendMarkdown(chatID, msg)
}

// NotifyTunnelDisconnected sends a tunnel disconnected alert.
func (b *TelegramBot) NotifyTunnelDisconnected(chatID int64, tunnelURL string) {
	msg := fmt.Sprintf("🔴 *Tunnel Disconnected*\n\n`%s`", tunnelURL)
	b.SendMarkdown(chatID, msg)
}

// NotifyErrorSpike sends an error rate alert.
func (b *TelegramBot) NotifyErrorSpike(chatID int64, tunnelURL string, errorCount int, period string) {
	msg := fmt.Sprintf("⚠️ *Error Spike Detected*\n\n`%s`\n\n%d errors in the last %s",
		tunnelURL, errorCount, period)
	b.SendMarkdown(chatID, msg)
}

// NotifyTrafficSummary sends a periodic traffic summary.
func (b *TelegramBot) NotifyTrafficSummary(chatID int64, totalRequests, successCount, errorCount int64, avgDuration float64, topPath string) {
	successRate := float64(0)
	if totalRequests > 0 {
		successRate = float64(successCount) / float64(totalRequests) * 100
	}
	msg := fmt.Sprintf("📊 *Traffic Summary (last hour)*\n\n"+
		"Requests: *%d*\n"+
		"Success rate: *%.1f%%*\n"+
		"Errors: *%d*\n"+
		"Avg duration: *%.0fms*\n"+
		"Top path: `%s`",
		totalRequests, successRate, errorCount, avgDuration, topPath)
	b.SendMarkdown(chatID, msg)
}

// NotifyNewUser sends a new user signup alert (for self-hosted admins).
func (b *TelegramBot) NotifyNewUser(chatID int64, email string) {
	msg := fmt.Sprintf("👤 *New User Signup*\n\n%s", email)
	b.SendMarkdown(chatID, msg)
}

// GetUpdates fetches pending messages (for processing /start commands).
func (b *TelegramBot) GetUpdates(ctx context.Context, offset int64) ([]Update, error) {
	url := fmt.Sprintf("%s%s/getUpdates?offset=%d&timeout=1", telegramAPI, b.token, offset)

	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	resp, err := b.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		OK     bool     `json:"ok"`
		Result []Update `json:"result"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	return result.Result, nil
}

// SetWebhook configures Telegram to send updates to our webhook URL.
func (b *TelegramBot) SetWebhook(webhookURL string) error {
	url := fmt.Sprintf("%s%s/setWebhook?url=%s", telegramAPI, b.token, webhookURL)
	resp, err := b.client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var result struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	if !result.OK {
		return fmt.Errorf("setWebhook failed: %s", result.Description)
	}

	b.log.Info().Str("url", webhookURL).Msg("telegram webhook set")
	return nil
}

// Update represents a Telegram update.
type Update struct {
	UpdateID int64    `json:"update_id"`
	Message  *Message `json:"message"`
}

// Message represents a Telegram message.
type Message struct {
	MessageID int64  `json:"message_id"`
	Chat      Chat   `json:"chat"`
	Text      string `json:"text"`
	From      *User  `json:"from"`
}

// Chat represents a Telegram chat.
type Chat struct {
	ID   int64  `json:"id"`
	Type string `json:"type"`
}

// User represents a Telegram user.
type User struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	Username  string `json:"username"`
}
