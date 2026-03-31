package api

import (
	"fmt"
	"net/http"

	"github.com/serverme/serverme/server/internal/auth"
)

// getTeamContext returns the team ID if the user is requesting team-scoped data.
// If team_id is provided, it verifies the user is a member.
// Returns (teamID, userIDs to include, error).
func (s *Server) getTeamContext(r *http.Request) (string, []string, error) {
	u := auth.GetUser(r)
	teamID := r.URL.Query().Get("team_id")

	if teamID == "" {
		// Personal context — just the user's own data
		return "", []string{u.ID}, nil
	}

	// Verify membership
	_, isMember := s.db.IsTeamMember(r.Context(), teamID, u.ID)
	if !isMember {
		return "", nil, fmt.Errorf("not a team member")
	}

	// Get all team member IDs
	members, err := s.db.ListTeamMembers(r.Context(), teamID)
	if err != nil {
		return "", nil, err
	}

	var userIDs []string
	for _, m := range members {
		userIDs = append(userIDs, m.UserID)
	}

	return teamID, userIDs, nil
}
