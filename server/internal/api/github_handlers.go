package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/serverme/serverme/server/internal/auth"
)

// handleGitHubConnect starts the GitHub OAuth flow.
func (s *Server) handleGitHubConnect(w http.ResponseWriter, r *http.Request) {
	if s.deployer == nil || s.deployer.GitHub == nil {
		writeError(w, http.StatusServiceUnavailable, "GitHub integration not configured")
		return
	}

	state := generateGHState()
	redirectURI := fmt.Sprintf("https://api.%s/api/v1/github/callback", s.deployer.Domain)
	authURL := s.deployer.GitHub.GetOAuthURL(state, redirectURI)

	http.Redirect(w, r, authURL, http.StatusFound)
}

// handleGitHubCallback handles the OAuth callback from GitHub.
func (s *Server) handleGitHubCallback(w http.ResponseWriter, r *http.Request) {
	if s.deployer == nil || s.deployer.GitHub == nil {
		writeError(w, http.StatusServiceUnavailable, "GitHub integration not configured")
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Redirect(w, r, "https://serverme.site/projects?error=github_denied", http.StatusFound)
		return
	}

	// Exchange code for token
	tokenResp, err := s.deployer.GitHub.ExchangeCodeForToken(code)
	if err != nil || tokenResp.AccessToken == "" {
		s.log.Error().Err(err).Msg("GitHub token exchange failed")
		http.Redirect(w, r, "https://serverme.site/projects?error=token_exchange", http.StatusFound)
		return
	}

	// Get GitHub user info
	ghUser, err := getGitHubUser(tokenResp.AccessToken)
	if err != nil {
		s.log.Error().Err(err).Msg("GitHub user info failed")
		http.Redirect(w, r, "https://serverme.site/projects?error=user_info", http.StatusFound)
		return
	}

	// Find the ServerMe user — check auth cookie/header
	// For now, redirect with the token and let frontend save it
	redirectURL := fmt.Sprintf("https://serverme.site/projects?github_connected=true&github_token=%s&github_user=%s",
		url.QueryEscape(tokenResp.AccessToken), url.QueryEscape(ghUser.Login))

	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// handleGitHubSaveConnection saves the GitHub connection for the authenticated user.
func (s *Server) handleGitHubSaveConnection(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)

	var req struct {
		AccessToken    string `json:"access_token"`
		GitHubUsername string `json:"github_username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.AccessToken == "" {
		writeError(w, http.StatusBadRequest, "access_token required")
		return
	}

	err := s.db.SaveGitHubConnection(r.Context(), u.ID, req.GitHubUsername, req.AccessToken, "", 0)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save connection")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "connected"})
}

// handleGitHubStatus returns the user's GitHub connection status.
func (s *Server) handleGitHubStatus(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)

	gc, _ := s.db.GetGitHubConnection(r.Context(), u.ID)
	if gc == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"connected": false})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"connected": true,
		"username":  gc.GitHubUsername,
	})
}

// handleGitHubDisconnect removes the GitHub connection.
func (s *Server) handleGitHubDisconnect(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	s.db.DeleteGitHubConnection(r.Context(), u.ID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "disconnected"})
}

// handleGitHubRepos lists the user's GitHub repos.
func (s *Server) handleGitHubRepos(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)

	gc, _ := s.db.GetGitHubConnection(r.Context(), u.ID)
	if gc == nil {
		writeError(w, http.StatusBadRequest, "GitHub not connected")
		return
	}

	if s.deployer == nil || s.deployer.GitHub == nil {
		writeError(w, http.StatusServiceUnavailable, "GitHub not configured")
		return
	}

	repos, err := s.deployer.GitHub.ListUserRepos(gc.AccessToken)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list repos")
		return
	}

	writeJSON(w, http.StatusOK, repos)
}

// handleGitHubWebhook processes push events for auto-deploy.
func (s *Server) handleGitHubWebhook(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)

	var payload struct {
		Ref        string `json:"ref"`
		Repository struct {
			FullName string `json:"full_name"`
			CloneURL string `json:"clone_url"`
		} `json:"repository"`
	}
	json.Unmarshal(body, &payload)

	if payload.Repository.FullName == "" {
		w.WriteHeader(http.StatusOK)
		return
	}

	s.log.Info().Str("repo", payload.Repository.FullName).Str("ref", payload.Ref).Msg("GitHub push webhook")

	// Find project linked to this repo
	project, _ := s.db.GetProjectByGitHubRepo(r.Context(), payload.Repository.FullName)
	if project == nil {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get the user's GitHub token for cloning
	gc, _ := s.db.GetGitHubConnection(r.Context(), project.UserID)
	if gc != nil && s.deployer != nil && s.deployer.GitHub != nil {
		// Update the repo URL with auth token for private repos
		project.RepoURL = s.deployer.GitHub.GetCloneURL(gc.AccessToken, payload.Repository.FullName)
	}

	// Auto-deploy
	s.log.Info().Str("project", project.ID).Str("repo", payload.Repository.FullName).Msg("auto-deploying on push")
	go func() {
		ctx := r.Context()
		if err := s.deployer.Deploy(ctx, project); err != nil {
			s.log.Error().Err(err).Str("project", project.ID).Msg("auto-deploy failed")
		}
	}()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"deploying"}`))
}

type ghUser struct {
	Login string `json:"login"`
}

func getGitHubUser(accessToken string) (*ghUser, error) {
	req, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var user ghUser
	json.NewDecoder(resp.Body).Decode(&user)
	return &user, nil
}

func generateGHState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
