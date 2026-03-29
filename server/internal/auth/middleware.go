package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/serverme/serverme/server/internal/db"
)

type contextKey string

const UserContextKey contextKey = "user"

// AuthenticatedUser represents the user extracted from auth.
type AuthenticatedUser struct {
	ID    string
	Email string
	Plan  string
}

// GetUser extracts the authenticated user from the request context.
func GetUser(r *http.Request) *AuthenticatedUser {
	u, _ := r.Context().Value(UserContextKey).(*AuthenticatedUser)
	return u
}

// SmartAuthMiddleware handles both JWT (Authorization: Bearer) and API key (X-API-Key) auth.
func SmartAuthMiddleware(jwtMgr *JWTManager, database *db.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var user *AuthenticatedUser

			// Try JWT first (Authorization: Bearer <token>)
			if authHeader := r.Header.Get("Authorization"); authHeader != "" {
				if strings.HasPrefix(authHeader, "Bearer ") {
					tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
					claims, err := jwtMgr.Validate(tokenStr)
					if err == nil {
						user = &AuthenticatedUser{
							ID:    claims.UserID,
							Email: claims.Email,
							Plan:  claims.Plan,
						}
					}
				}
			}

			// Try API key (X-API-Key: sm_live_...)
			if user == nil {
				if apiKey := r.Header.Get("X-API-Key"); apiKey != "" {
					if strings.HasPrefix(apiKey, "sm_live_") {
						dbUser, err := database.ValidateAPIKey(r.Context(), apiKey)
						if err == nil && dbUser != nil {
							user = &AuthenticatedUser{
								ID:    dbUser.ID,
								Email: dbUser.Email,
								Plan:  dbUser.Plan,
							}
						}
					}
				}
			}

			if user == nil {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuthMiddleware extracts auth if present but doesn't require it.
func OptionalAuthMiddleware(jwtMgr *JWTManager, database *db.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var user *AuthenticatedUser

			if authHeader := r.Header.Get("Authorization"); authHeader != "" {
				if strings.HasPrefix(authHeader, "Bearer ") {
					tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
					claims, err := jwtMgr.Validate(tokenStr)
					if err == nil {
						user = &AuthenticatedUser{
							ID:    claims.UserID,
							Email: claims.Email,
							Plan:  claims.Plan,
						}
					}
				}
			}

			if user == nil {
				if apiKey := r.Header.Get("X-API-Key"); apiKey != "" {
					if strings.HasPrefix(apiKey, "sm_live_") {
						dbUser, err := database.ValidateAPIKey(r.Context(), apiKey)
						if err == nil && dbUser != nil {
							user = &AuthenticatedUser{
								ID:    dbUser.ID,
								Email: dbUser.Email,
								Plan:  dbUser.Plan,
							}
						}
					}
				}
			}

			if user != nil {
				ctx := context.WithValue(r.Context(), UserContextKey, user)
				r = r.WithContext(ctx)
			}

			next.ServeHTTP(w, r)
		})
	}
}
