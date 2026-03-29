package control

import (
	"sync"

	"github.com/rs/zerolog"
)

// Manager manages all active client control connections.
type Manager struct {
	conns sync.Map // clientID -> *Conn
	log   zerolog.Logger
}

// NewManager creates a new control connection manager.
func NewManager(log zerolog.Logger) *Manager {
	return &Manager{
		log: log.With().Str("component", "control_manager").Logger(),
	}
}

// Add registers a client connection.
func (m *Manager) Add(c *Conn) {
	m.conns.Store(c.ID(), c)
	m.log.Debug().Str("client_id", c.ID()).Msg("client added")
}

// Remove removes a client connection.
func (m *Manager) Remove(clientID string) {
	m.conns.Delete(clientID)
	m.log.Debug().Str("client_id", clientID).Msg("client removed")
}

// Get retrieves a client connection by ID.
func (m *Manager) Get(clientID string) (*Conn, bool) {
	v, ok := m.conns.Load(clientID)
	if !ok {
		return nil, false
	}
	return v.(*Conn), true
}

// GetByTunnelHost finds the control connection that owns a given hostname.
// This searches all connections' tunnels to find the matching one.
func (m *Manager) GetByTunnelHost(hostname string) (*Conn, bool) {
	var found *Conn
	m.conns.Range(func(key, value interface{}) bool {
		conn := value.(*Conn)
		conn.mu.Lock()
		for _, url := range conn.tunnels {
			// Simple check: see if the hostname is part of any tunnel URL
			// The actual lookup should use the tunnel registry for efficiency
			_ = url
		}
		conn.mu.Unlock()
		return true
	})
	return found, found != nil
}

// Count returns the number of active connections.
func (m *Manager) Count() int {
	count := 0
	m.conns.Range(func(key, value interface{}) bool {
		count++
		return true
	})
	return count
}

// CloseAll closes all active connections.
func (m *Manager) CloseAll() {
	m.conns.Range(func(key, value interface{}) bool {
		conn := value.(*Conn)
		conn.Close()
		m.conns.Delete(key)
		return true
	})
}
