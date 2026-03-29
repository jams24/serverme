package inspect

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
)

// Store manages captured requests across all tunnels and notifies subscribers.
type Store struct {
	mu      sync.RWMutex
	buffers map[string]*RingBuffer // tunnelURL -> ring buffer
	subs    map[string][]chan *CapturedRequest // tunnelURL -> subscriber channels
	subsMu  sync.RWMutex
}

// NewStore creates a new inspection store.
func NewStore() *Store {
	return &Store{
		buffers: make(map[string]*RingBuffer),
		subs:    make(map[string][]chan *CapturedRequest),
	}
}

// Capture stores a captured request and notifies subscribers.
func (s *Store) Capture(req *CapturedRequest) {
	if req.ID == "" {
		req.ID = generateID()
	}

	// Store in ring buffer
	s.mu.Lock()
	buf, ok := s.buffers[req.TunnelURL]
	if !ok {
		buf = NewRingBuffer(defaultBufferSize)
		s.buffers[req.TunnelURL] = buf
	}
	s.mu.Unlock()

	buf.Add(req)

	// Notify subscribers
	s.subsMu.RLock()
	subs := s.subs[req.TunnelURL]
	s.subsMu.RUnlock()

	for _, ch := range subs {
		select {
		case ch <- req:
		default:
			// subscriber too slow, skip
		}
	}
}

// List returns captured requests for a tunnel.
func (s *Store) List(tunnelURL string) []*CapturedRequest {
	s.mu.RLock()
	buf, ok := s.buffers[tunnelURL]
	s.mu.RUnlock()

	if !ok {
		return nil
	}
	return buf.List()
}

// Get retrieves a specific captured request.
func (s *Store) Get(tunnelURL, requestID string) *CapturedRequest {
	s.mu.RLock()
	buf, ok := s.buffers[tunnelURL]
	s.mu.RUnlock()

	if !ok {
		return nil
	}
	return buf.Get(requestID)
}

// Subscribe creates a channel that receives new captured requests for a tunnel.
func (s *Store) Subscribe(tunnelURL string) chan *CapturedRequest {
	ch := make(chan *CapturedRequest, 64)

	s.subsMu.Lock()
	s.subs[tunnelURL] = append(s.subs[tunnelURL], ch)
	s.subsMu.Unlock()

	return ch
}

// Unsubscribe removes a subscriber channel.
func (s *Store) Unsubscribe(tunnelURL string, ch chan *CapturedRequest) {
	s.subsMu.Lock()
	defer s.subsMu.Unlock()

	subs := s.subs[tunnelURL]
	for i, sub := range subs {
		if sub == ch {
			s.subs[tunnelURL] = append(subs[:i], subs[i+1:]...)
			close(ch)
			return
		}
	}
}

// Clear removes all captured requests for a tunnel.
func (s *Store) Clear(tunnelURL string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.buffers, tunnelURL)
}

// Stats returns capture statistics.
func (s *Store) Stats() map[string]int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stats := make(map[string]int)
	for url, buf := range s.buffers {
		stats[url] = buf.Count()
	}
	return stats
}

func generateID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}
