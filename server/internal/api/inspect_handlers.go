package api

import (
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"github.com/serverme/serverme/server/internal/inspect"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// handleListRequests returns captured requests for a tunnel.
func (s *Server) handleListRequests(w http.ResponseWriter, r *http.Request) {
	tunnelURL, _ := url.PathUnescape(chi.URLParam(r, "url"))
	if tunnelURL == "" {
		writeError(w, http.StatusBadRequest, "tunnel URL required")
		return
	}

	requests := s.inspect.List(tunnelURL)
	if requests == nil {
		requests = []*inspect.CapturedRequest{}
	}
	writeJSON(w, http.StatusOK, requests)
}

// handleGetRequest returns a single captured request by ID.
func (s *Server) handleGetRequest(w http.ResponseWriter, r *http.Request) {
	tunnelURL, _ := url.PathUnescape(chi.URLParam(r, "url"))
	reqID := chi.URLParam(r, "reqId")

	req := s.inspect.Get(tunnelURL, reqID)
	if req == nil {
		writeError(w, http.StatusNotFound, "request not found")
		return
	}
	writeJSON(w, http.StatusOK, req)
}

// handleReplayRequest replays a captured request through the tunnel.
func (s *Server) handleReplayRequest(w http.ResponseWriter, r *http.Request) {
	tunnelURL, _ := url.PathUnescape(chi.URLParam(r, "url"))
	reqID := chi.URLParam(r, "reqId")

	captured := s.inspect.Get(tunnelURL, reqID)
	if captured == nil {
		writeError(w, http.StatusNotFound, "request not found")
		return
	}

	// Find the tunnel to get the proxy URL
	tunnels := s.registry.List()
	var proxyURL string
	for _, t := range tunnels {
		if t.URL == tunnelURL {
			proxyURL = tunnelURL
			break
		}
	}
	if proxyURL == "" {
		writeError(w, http.StatusNotFound, "tunnel no longer active")
		return
	}

	result, err := inspect.Replay(captured, proxyURL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "replay failed: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// handleTrafficWebSocket streams live captured requests via WebSocket.
func (s *Server) handleTrafficWebSocket(w http.ResponseWriter, r *http.Request) {
	tunnelURL, _ := url.PathUnescape(chi.URLParam(r, "url"))
	if tunnelURL == "" {
		http.Error(w, "tunnel URL required", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.log.Error().Err(err).Msg("WebSocket upgrade failed")
		return
	}
	defer conn.Close()

	// Subscribe to traffic for this tunnel
	ch := s.inspect.Subscribe(tunnelURL)
	defer s.inspect.Unsubscribe(tunnelURL, ch)

	s.log.Debug().Str("tunnel", tunnelURL).Msg("WebSocket traffic subscriber connected")

	// Read loop (to detect client disconnect)
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return
			}
		}
	}()

	// Write loop (stream captured requests)
	for req := range ch {
		data, err := json.Marshal(req)
		if err != nil {
			continue
		}
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			s.log.Debug().Err(err).Msg("WebSocket write failed")
			return
		}
	}
}
