package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/serverme/serverme/server/internal/auth"
)

func (s *Server) handleCreateProject(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)

	var req struct {
		Name      string `json:"name"`
		Subdomain string `json:"subdomain"`
		Framework string `json:"framework"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || req.Subdomain == "" {
		writeError(w, http.StatusBadRequest, "name and subdomain required")
		return
	}

	if req.Framework == "" {
		req.Framework = "node"
	}

	project, err := s.db.CreateProject(r.Context(), u.ID, req.Name, req.Subdomain, req.Framework)
	if err != nil {
		writeError(w, http.StatusConflict, "subdomain already taken")
		return
	}

	writeJSON(w, http.StatusCreated, project)
}

func (s *Server) handleListProjects(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)

	projects, err := s.db.ListProjects(r.Context(), u.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list projects")
		return
	}
	if projects == nil {
		writeJSON(w, http.StatusOK, []struct{}{})
		return
	}
	writeJSON(w, http.StatusOK, projects)
}

func (s *Server) handleGetProject(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	projectID := chi.URLParam(r, "projectId")

	project, err := s.db.GetProject(r.Context(), projectID)
	if err != nil || project == nil || project.UserID != u.ID {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	logs, _ := s.db.GetDeployLogs(r.Context(), projectID, 50)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"project": project,
		"logs":    logs,
	})
}

func (s *Server) handleUpdateProject(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	projectID := chi.URLParam(r, "projectId")

	project, _ := s.db.GetProject(r.Context(), projectID)
	if project == nil || project.UserID != u.ID {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	var req struct {
		RepoURL    string            `json:"repo_url"`
		Branch     string            `json:"branch"`
		BuildCmd   string            `json:"build_cmd"`
		StartCmd   string            `json:"start_cmd"`
		EnvVars    map[string]string `json:"env_vars"`
		GitHubRepo string            `json:"github_repo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	if req.Branch == "" {
		req.Branch = "main"
	}
	if req.EnvVars == nil {
		req.EnvVars = project.EnvVars
	}

	s.db.UpdateProjectConfig(r.Context(), projectID, req.RepoURL, req.Branch, req.BuildCmd, req.StartCmd, req.EnvVars)

	if req.GitHubRepo != "" {
		s.db.UpdateProjectGitHub(r.Context(), projectID, req.GitHubRepo, req.Branch, true)
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (s *Server) handleDeployProject(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	projectID := chi.URLParam(r, "projectId")

	project, _ := s.db.GetProject(r.Context(), projectID)
	if project == nil || project.UserID != u.ID {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	if s.deployer == nil {
		writeError(w, http.StatusServiceUnavailable, "deploy engine not available")
		return
	}

	// For private repos, inject GitHub token into clone URL (only if not already authenticated)
	if s.deployer.GitHub != nil && project.RepoURL != "" && !strings.Contains(project.RepoURL, "@github.com") {
		gc, _ := s.db.GetGitHubConnection(r.Context(), u.ID)
		if gc != nil {
			repoName := extractRepoFullName(project.RepoURL)
			if repoName != "" {
				project.RepoURL = fmt.Sprintf("https://x-access-token:%s@github.com/%s.git", gc.AccessToken, repoName)
			}
		}
	}

	// Deploy async
	go func() {
		ctx := context.Background()
		if err := s.deployer.Deploy(ctx, project); err != nil {
			s.log.Error().Err(err).Str("project", projectID).Msg("deploy failed")
		}
	}()

	writeJSON(w, http.StatusAccepted, map[string]string{"status": "deploying"})
}

func (s *Server) handleStopProject(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	projectID := chi.URLParam(r, "projectId")

	project, _ := s.db.GetProject(r.Context(), projectID)
	if project == nil || project.UserID != u.ID {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	if s.deployer != nil {
		s.deployer.Stop(r.Context(), project)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "stopped"})
}

func (s *Server) handleDeleteProject(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	projectID := chi.URLParam(r, "projectId")

	project, _ := s.db.GetProject(r.Context(), projectID)
	if project == nil || project.UserID != u.ID {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	if s.deployer != nil {
		s.deployer.Delete(r.Context(), project)
	}
	s.db.DeleteProject(r.Context(), projectID, u.ID)

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) handleGetDeployLogs(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	projectID := chi.URLParam(r, "projectId")

	project, _ := s.db.GetProject(r.Context(), projectID)
	if project == nil || project.UserID != u.ID {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	logs, _ := s.db.GetDeployLogs(r.Context(), projectID, 200)
	if logs == nil {
		writeJSON(w, http.StatusOK, []struct{}{}); return
	}
	writeJSON(w, http.StatusOK, logs)
}

// extractRepoFullName extracts "user/repo" from a GitHub URL.
func extractRepoFullName(repoURL string) string {
	// Handle https://github.com/user/repo.git
	s := repoURL
	s = strings.TrimPrefix(s, "https://github.com/")
	s = strings.TrimPrefix(s, "http://github.com/")
	s = strings.TrimSuffix(s, ".git")
	s = strings.TrimSuffix(s, "/")
	return s
}
