package db

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

type TeamWithRole struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	OwnerID   string    `json:"owner_id"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type TeamMemberFull struct {
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	JoinedAt  time.Time `json:"joined_at"`
}

type TeamInvitation struct {
	ID        string    `json:"id"`
	TeamID    string    `json:"team_id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	Token     string    `json:"token,omitempty"`
	Accepted  bool      `json:"accepted"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

// CreateTeam creates a new team and adds the creator as owner.
func (d *DB) CreateTeam(ctx context.Context, name, ownerID string) (*Team, error) {
	var t Team
	err := d.Pool.QueryRow(ctx,
		`INSERT INTO teams (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id, created_at`,
		name, ownerID,
	).Scan(&t.ID, &t.Name, &t.OwnerID, &t.CreatedAt)
	if err != nil {
		return nil, err
	}

	// Add owner as member
	_, err = d.Pool.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'owner')`,
		t.ID, ownerID,
	)
	return &t, err
}

// GetTeam returns a team by ID.
func (d *DB) GetTeam(ctx context.Context, teamID string) (*Team, error) {
	var t Team
	err := d.Pool.QueryRow(ctx,
		`SELECT id, name, owner_id, created_at FROM teams WHERE id = $1`, teamID,
	).Scan(&t.ID, &t.Name, &t.OwnerID, &t.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &t, err
}

// ListUserTeams returns all teams a user belongs to.
func (d *DB) ListUserTeams(ctx context.Context, userID string) ([]TeamWithRole, error) {
	rows, err := d.Pool.Query(ctx,
		`SELECT t.id, t.name, t.owner_id, tm.role, t.created_at
		 FROM teams t JOIN team_members tm ON t.id = tm.team_id
		 WHERE tm.user_id = $1 ORDER BY t.created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var teams []TeamWithRole
	for rows.Next() {
		var t TeamWithRole
		rows.Scan(&t.ID, &t.Name, &t.OwnerID, &t.Role, &t.CreatedAt)
		teams = append(teams, t)
	}
	return teams, nil
}

// ListTeamMembers returns all members of a team with their user info.
func (d *DB) ListTeamMembers(ctx context.Context, teamID string) ([]TeamMemberFull, error) {
	rows, err := d.Pool.Query(ctx,
		`SELECT u.id, u.email, u.name, tm.role, tm.joined_at
		 FROM team_members tm JOIN users u ON tm.user_id = u.id
		 WHERE tm.team_id = $1 ORDER BY tm.role, tm.joined_at`, teamID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []TeamMemberFull
	for rows.Next() {
		var m TeamMemberFull
		rows.Scan(&m.UserID, &m.Email, &m.Name, &m.Role, &m.JoinedAt)
		members = append(members, m)
	}
	return members, nil
}

// IsTeamMember checks if a user is a member of a team and returns their role.
func (d *DB) IsTeamMember(ctx context.Context, teamID, userID string) (string, bool) {
	var role string
	err := d.Pool.QueryRow(ctx,
		`SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
		teamID, userID,
	).Scan(&role)
	if err != nil {
		return "", false
	}
	return role, true
}

// InviteToTeam creates an invitation.
func (d *DB) InviteToTeam(ctx context.Context, teamID, email, role, invitedBy string) (*TeamInvitation, error) {
	tokenBytes := make([]byte, 16)
	rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	var inv TeamInvitation
	err := d.Pool.QueryRow(ctx,
		`INSERT INTO team_invitations (team_id, email, role, invited_by, token, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, team_id, email, role, token, accepted, created_at, expires_at`,
		teamID, email, role, invitedBy, token, time.Now().Add(7*24*time.Hour),
	).Scan(&inv.ID, &inv.TeamID, &inv.Email, &inv.Role, &inv.Token, &inv.Accepted, &inv.CreatedAt, &inv.ExpiresAt)
	return &inv, err
}

// AcceptInvitation accepts a team invitation and adds the user.
func (d *DB) AcceptInvitation(ctx context.Context, token, userID string) error {
	var inv TeamInvitation
	err := d.Pool.QueryRow(ctx,
		`UPDATE team_invitations SET accepted = true
		 WHERE token = $1 AND accepted = false AND expires_at > now()
		 RETURNING id, team_id, email, role`,
		token,
	).Scan(&inv.ID, &inv.TeamID, &inv.Email, &inv.Role)
	if err == pgx.ErrNoRows {
		return fmt.Errorf("invalid or expired invitation")
	}
	if err != nil {
		return err
	}

	_, err = d.Pool.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)
		 ON CONFLICT (team_id, user_id) DO UPDATE SET role = $3`,
		inv.TeamID, userID, inv.Role,
	)
	return err
}

// ListPendingInvitations returns pending invitations for a team.
func (d *DB) ListPendingInvitations(ctx context.Context, teamID string) ([]TeamInvitation, error) {
	rows, err := d.Pool.Query(ctx,
		`SELECT id, team_id, email, role, accepted, created_at, expires_at
		 FROM team_invitations WHERE team_id = $1 AND accepted = false AND expires_at > now()
		 ORDER BY created_at DESC`, teamID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invs []TeamInvitation
	for rows.Next() {
		var i TeamInvitation
		rows.Scan(&i.ID, &i.TeamID, &i.Email, &i.Role, &i.Accepted, &i.CreatedAt, &i.ExpiresAt)
		invs = append(invs, i)
	}
	return invs, nil
}

// RemoveTeamMember removes a member from a team.
func (d *DB) RemoveTeamMember(ctx context.Context, teamID, userID string) error {
	tag, err := d.Pool.Exec(ctx,
		`DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 AND role != 'owner'`,
		teamID, userID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("cannot remove owner or member not found")
	}
	return nil
}

// UpdateMemberRole changes a member's role.
func (d *DB) UpdateMemberRole(ctx context.Context, teamID, userID, newRole string) error {
	_, err := d.Pool.Exec(ctx,
		`UPDATE team_members SET role = $3 WHERE team_id = $1 AND user_id = $2 AND role != 'owner'`,
		teamID, userID, newRole,
	)
	return err
}

// DeleteTeam deletes a team and all memberships.
func (d *DB) DeleteTeam(ctx context.Context, teamID, ownerID string) error {
	tag, err := d.Pool.Exec(ctx,
		`DELETE FROM teams WHERE id = $1 AND owner_id = $2`, teamID, ownerID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("team not found or not owner")
	}
	return nil
}
