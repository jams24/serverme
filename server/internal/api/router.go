package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"
	"github.com/serverme/serverme/server/internal/auth"
	"github.com/serverme/serverme/server/internal/db"
	"github.com/serverme/serverme/server/internal/inspect"
	"github.com/serverme/serverme/server/internal/tunnel"
)

// GoogleOAuthConfig holds Google OAuth credentials.
type GoogleOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	FrontendURL  string
}

// Server holds dependencies for API handlers.
type Server struct {
	db       *db.DB
	jwt      *auth.JWTManager
	registry *tunnel.Registry
	inspect  *inspect.Store
	google   *GoogleOAuthConfig
	log      zerolog.Logger
}

// NewRouter creates the REST API router.
func NewRouter(database *db.DB, jwtMgr *auth.JWTManager, registry *tunnel.Registry, inspectStore *inspect.Store, google *GoogleOAuthConfig, log zerolog.Logger) http.Handler {
	s := &Server{
		db:       database,
		jwt:      jwtMgr,
		registry: registry,
		inspect:  inspectStore,
		google:   google,
		log:      log.With().Str("component", "api").Logger(),
	}

	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(30 * time.Second))
	r.Use(corsMiddleware)

	// Public routes
	r.Route("/api/v1", func(r chi.Router) {
		// Auth (no auth required)
		r.Post("/auth/register", s.handleRegister)
		r.Post("/auth/login", s.handleLogin)

		// Google OAuth
		r.Get("/auth/google", s.handleGoogleLogin)
		r.Get("/auth/google/callback", s.handleGoogleCallback)

		// Health
		r.Get("/health", s.handleHealth)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(auth.SmartAuthMiddleware(jwtMgr, database))

			// User
			r.Get("/users/me", s.handleGetMe)

			// API Keys
			r.Get("/api-keys", s.handleListAPIKeys)
			r.Post("/api-keys", s.handleCreateAPIKey)
			r.Delete("/api-keys/{id}", s.handleDeleteAPIKey)

			// Domains
			r.Get("/domains", s.handleListDomains)
			r.Post("/domains", s.handleCreateDomain)
			r.Delete("/domains/{id}", s.handleDeleteDomain)
			r.Post("/domains/{id}/verify", s.handleVerifyDomain)

			// Tunnels
			r.Get("/tunnels", s.handleListTunnels)

			// Inspection
			r.Get("/tunnels/{url}/requests", s.handleListRequests)
			r.Get("/tunnels/{url}/requests/{reqId}", s.handleGetRequest)
			r.Post("/tunnels/{url}/replay/{reqId}", s.handleReplayRequest)

			// Reserved Subdomains
			r.Post("/subdomains", s.handleReserveSubdomain)
		})
	})

	// WebSocket (separate auth via query param)
	r.Get("/api/v1/ws/traffic/{url}", s.handleTrafficWebSocket)

	return r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
