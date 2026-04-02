package billing

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const inventPayAPI = "https://api.inventpay.io"

// InventPay handles payment creation and verification via InventPay.
type InventPay struct {
	apiKey        string
	webhookSecret string
	client        *http.Client
}

// NewInventPay creates a new InventPay billing client.
func NewInventPay(apiKey, webhookSecret string) *InventPay {
	return &InventPay{
		apiKey:        apiKey,
		webhookSecret: webhookSecret,
		client:        &http.Client{Timeout: 30 * time.Second},
	}
}

// CreateInvoiceRequest is the request to create a payment invoice.
type CreateInvoiceRequest struct {
	Amount            float64 `json:"amount"`
	AmountCurrency    string  `json:"amountCurrency"`
	OrderID           string  `json:"orderId,omitempty"`
	Description       string  `json:"description,omitempty"`
	CallbackURL       string  `json:"callbackUrl,omitempty"`
	ExpirationMinutes int     `json:"expirationMinutes,omitempty"`
}

// InvoiceResponse is the response from creating an invoice.
type InvoiceResponse struct {
	PaymentID  string  `json:"paymentId"`
	BaseAmount float64 `json:"baseAmount"`
	InvoiceURL string  `json:"invoiceUrl"`
	ExpiresAt  string  `json:"expiresAt"`
	Status     string  `json:"status"`
}

// PaymentStatus is the response from checking payment status.
type PaymentStatus struct {
	Status         string  `json:"status"`
	CurrentBalance float64 `json:"currentBalance"`
	Confirmations  int     `json:"confirmations"`
}

// WebhookPayload is the payload sent by InventPay webhooks.
type WebhookPayload struct {
	Event            string  `json:"event"`
	PaymentID        string  `json:"paymentId"`
	OrderID          string  `json:"orderId"`
	Amount           float64 `json:"amount"`
	Currency         string  `json:"currency"`
	Status           string  `json:"status"`
	BaseAmount       float64 `json:"baseAmount"`
	BaseCurrency     string  `json:"baseCurrency"`
	TransactionHash  string  `json:"transactionHash"`
	ConfirmedAt      string  `json:"confirmedAt"`
}

// CreateInvoice creates a new payment invoice.
func (ip *InventPay) CreateInvoice(req *CreateInvoiceRequest) (*InvoiceResponse, error) {
	body, _ := json.Marshal(req)

	httpReq, err := http.NewRequest("POST", inventPayAPI+"/v1/create_invoice", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-API-Key", ip.apiKey)

	resp, err := ip.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("inventpay request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		return nil, fmt.Errorf("inventpay error (%d): %s", resp.StatusCode, string(respBody))
	}

	// InventPay wraps response in {"success": true, "data": {...}}
	var wrapper struct {
		Success bool            `json:"success"`
		Data    InvoiceResponse `json:"data"`
	}
	json.Unmarshal(respBody, &wrapper)

	if !wrapper.Success {
		return nil, fmt.Errorf("inventpay: invoice creation failed")
	}

	return &wrapper.Data, nil
}

// GetPaymentStatus checks the status of a payment.
func (ip *InventPay) GetPaymentStatus(paymentID string) (*PaymentStatus, error) {
	resp, err := ip.client.Get(inventPayAPI + "/v1/invoice/" + paymentID + "/status")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result PaymentStatus
	json.NewDecoder(resp.Body).Decode(&result)
	return &result, nil
}

// VerifyWebhook verifies the HMAC-SHA256 signature of a webhook payload.
func (ip *InventPay) VerifyWebhook(payload []byte, signature string) bool {
	mac := hmac.New(sha256.New, []byte(ip.webhookSecret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}
