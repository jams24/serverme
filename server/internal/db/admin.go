package db

import (
	"context"
	"time"
)

// AdminUser is a user with admin-visible fields.
type AdminUser struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Plan      string    `json:"plan"`
	IsAdmin   bool      `json:"is_admin"`
	CreatedAt time.Time `json:"created_at"`
	KeyCount  int       `json:"key_count"`
	TunnelReqs int64    `json:"tunnel_requests"`
}

// AdminStats holds platform-wide statistics.
type AdminStats struct {
	TotalUsers       int64 `json:"total_users"`
	TotalKeys        int64 `json:"total_keys"`
	TotalDomains     int64 `json:"total_domains"`
	TotalTeams       int64 `json:"total_teams"`
	TotalRequests    int64 `json:"total_requests"`
	UsersToday       int64 `json:"users_today"`
	UsersThisWeek    int64 `json:"users_this_week"`
	UsersThisMonth   int64 `json:"users_this_month"`
	RequestsToday    int64 `json:"requests_today"`
}

// IsUserAdmin checks if a user has admin privileges.
func (d *DB) IsUserAdmin(ctx context.Context, userID string) (bool, error) {
	var isAdmin bool
	err := d.Pool.QueryRow(ctx,
		`SELECT COALESCE(is_admin, false) FROM users WHERE id = $1`, userID,
	).Scan(&isAdmin)
	return isAdmin, err
}

// AdminListUsers returns all users with stats.
func (d *DB) AdminListUsers(ctx context.Context, search string, limit, offset int) ([]AdminUser, int64, error) {
	if limit <= 0 {
		limit = 50
	}

	// Count total
	var total int64
	countQuery := `SELECT COUNT(*) FROM users`
	args := []interface{}{}
	if search != "" {
		countQuery += ` WHERE email ILIKE $1 OR name ILIKE $1`
		args = append(args, "%"+search+"%")
	}
	d.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)

	// Fetch users with key count and request count
	query := `SELECT u.id, u.email, u.name, u.plan, COALESCE(u.is_admin, false), u.created_at,
		(SELECT COUNT(*) FROM api_keys WHERE user_id = u.id),
		(SELECT COUNT(*) FROM captured_requests WHERE user_id = u.id::text)
		FROM users u`

	if search != "" {
		query += ` WHERE u.email ILIKE $1 OR u.name ILIKE $1`
		query += ` ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`
		args = append(args, limit, offset)
	} else {
		query += ` ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`
		args = append(args, limit, offset)
	}

	rows, err := d.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []AdminUser
	for rows.Next() {
		var u AdminUser
		rows.Scan(&u.ID, &u.Email, &u.Name, &u.Plan, &u.IsAdmin, &u.CreatedAt, &u.KeyCount, &u.TunnelReqs)
		users = append(users, u)
	}

	return users, total, nil
}

// AdminGetStats returns platform-wide stats.
func (d *DB) AdminGetStats(ctx context.Context) (*AdminStats, error) {
	s := &AdminStats{}
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekAgo := now.AddDate(0, 0, -7)
	monthAgo := now.AddDate(0, -1, 0)

	d.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&s.TotalUsers)
	d.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM api_keys`).Scan(&s.TotalKeys)
	d.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM domains`).Scan(&s.TotalDomains)
	d.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM teams`).Scan(&s.TotalTeams)
	d.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM captured_requests`).Scan(&s.TotalRequests)
	d.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE created_at >= $1`, today).Scan(&s.UsersToday)
	d.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE created_at >= $1`, weekAgo).Scan(&s.UsersThisWeek)
	d.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE created_at >= $1`, monthAgo).Scan(&s.UsersThisMonth)
	d.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM captured_requests WHERE timestamp >= $1`, today).Scan(&s.RequestsToday)

	return s, nil
}

// AdminUpdateUser updates a user's plan or admin status.
func (d *DB) AdminUpdateUser(ctx context.Context, userID string, plan *string, isAdmin *bool) error {
	if plan != nil {
		d.Pool.Exec(ctx, `UPDATE users SET plan = $2, updated_at = now() WHERE id = $1`, userID, *plan)
	}
	if isAdmin != nil {
		d.Pool.Exec(ctx, `UPDATE users SET is_admin = $2 WHERE id = $1`, userID, *isAdmin)
	}
	return nil
}

// AdminDeleteUser deletes a user.
func (d *DB) AdminDeleteUser(ctx context.Context, userID string) error {
	_, err := d.Pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	return err
}
