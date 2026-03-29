package inspect

import (
	"sync"
	"time"
)

const (
	maxBodyCapture    = 10 * 1024 // 10KB max body capture
	defaultBufferSize = 500       // requests per tunnel
)

// CapturedRequest represents a single captured HTTP request/response pair.
type CapturedRequest struct {
	ID             string            `json:"id"`
	TunnelURL      string            `json:"tunnel_url"`
	UserID         string            `json:"user_id,omitempty"`
	Timestamp      time.Time         `json:"timestamp"`
	Duration       time.Duration     `json:"duration_ms"`
	Method         string            `json:"method"`
	Path           string            `json:"path"`
	Query          string            `json:"query,omitempty"`
	RequestHeaders map[string]string `json:"request_headers"`
	RequestBody    []byte            `json:"request_body,omitempty"`
	RequestSize    int64             `json:"request_size"`
	StatusCode     int               `json:"status_code"`
	ResponseHeaders map[string]string `json:"response_headers,omitempty"`
	ResponseBody   []byte            `json:"response_body,omitempty"`
	ResponseSize   int64             `json:"response_size"`
	RemoteAddr     string            `json:"remote_addr"`
}

// RingBuffer is a fixed-size circular buffer for captured requests.
type RingBuffer struct {
	mu      sync.RWMutex
	items   []*CapturedRequest
	size    int
	head    int
	count   int
}

// NewRingBuffer creates a ring buffer with the given capacity.
func NewRingBuffer(size int) *RingBuffer {
	return &RingBuffer{
		items: make([]*CapturedRequest, size),
		size:  size,
	}
}

// Add inserts a captured request, evicting the oldest if full.
func (rb *RingBuffer) Add(req *CapturedRequest) {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	rb.items[rb.head] = req
	rb.head = (rb.head + 1) % rb.size
	if rb.count < rb.size {
		rb.count++
	}
}

// List returns all captured requests, newest first.
func (rb *RingBuffer) List() []*CapturedRequest {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	result := make([]*CapturedRequest, 0, rb.count)
	for i := 0; i < rb.count; i++ {
		idx := (rb.head - 1 - i + rb.size) % rb.size
		if rb.items[idx] != nil {
			result = append(result, rb.items[idx])
		}
	}
	return result
}

// Get retrieves a specific captured request by ID.
func (rb *RingBuffer) Get(id string) *CapturedRequest {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	for i := 0; i < rb.count; i++ {
		idx := (rb.head - 1 - i + rb.size) % rb.size
		if rb.items[idx] != nil && rb.items[idx].ID == id {
			return rb.items[idx]
		}
	}
	return nil
}

// Count returns the number of stored requests.
func (rb *RingBuffer) Count() int {
	rb.mu.RLock()
	defer rb.mu.RUnlock()
	return rb.count
}

// Clear empties the buffer.
func (rb *RingBuffer) Clear() {
	rb.mu.Lock()
	defer rb.mu.Unlock()
	rb.items = make([]*CapturedRequest, rb.size)
	rb.head = 0
	rb.count = 0
}
