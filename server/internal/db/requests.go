package db

import (
	"context"
	"encoding/json"
	"time"
)

// CapturedRequestRow represents a persisted captured request.
type CapturedRequestRow struct {
	ID              string            `json:"id"`
	TunnelURL       string            `json:"tunnel_url"`
	UserID          string            `json:"user_id"`
	Timestamp       time.Time         `json:"timestamp"`
	DurationMs      float64           `json:"duration_ms"`
	Method          string            `json:"method"`
	Path            string            `json:"path"`
	Query           string            `json:"query"`
	StatusCode      int               `json:"status_code"`
	RequestHeaders  map[string]string `json:"request_headers"`
	ResponseHeaders map[string]string `json:"response_headers"`
	RequestSize     int64             `json:"request_size"`
	ResponseSize    int64             `json:"response_size"`
	RemoteAddr      string            `json:"remote_addr"`
}

// SaveCapturedRequest persists a captured request to the database.
func (d *DB) SaveCapturedRequest(ctx context.Context, r *CapturedRequestRow) error {
	reqHeaders, _ := json.Marshal(r.RequestHeaders)
	respHeaders, _ := json.Marshal(r.ResponseHeaders)

	_, err := d.Pool.Exec(ctx,
		`INSERT INTO captured_requests (id, tunnel_url, user_id, timestamp, duration_ms, method, path, query, status_code, request_headers, response_headers, request_size, response_size, remote_addr)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		 ON CONFLICT (id) DO NOTHING`,
		r.ID, r.TunnelURL, r.UserID, r.Timestamp, r.DurationMs,
		r.Method, r.Path, r.Query, r.StatusCode,
		reqHeaders, respHeaders,
		r.RequestSize, r.ResponseSize, r.RemoteAddr,
	)
	return err
}

// ListCapturedRequests returns recent captured requests for a tunnel.
func (d *DB) ListCapturedRequests(ctx context.Context, tunnelURL string, limit int) ([]CapturedRequestRow, error) {
	if limit <= 0 {
		limit = 100
	}

	rows, err := d.Pool.Query(ctx,
		`SELECT id, tunnel_url, COALESCE(user_id::text, ''), timestamp, duration_ms, method, path, query, status_code, request_headers, response_headers, request_size, response_size, remote_addr
		 FROM captured_requests WHERE tunnel_url = $1 ORDER BY timestamp DESC LIMIT $2`,
		tunnelURL, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanRequests(rows)
}

// ListCapturedRequestsByUser returns recent requests across all tunnels for a user.
func (d *DB) ListCapturedRequestsByUser(ctx context.Context, userID string, limit int) ([]CapturedRequestRow, error) {
	if limit <= 0 {
		limit = 100
	}

	rows, err := d.Pool.Query(ctx,
		`SELECT id, tunnel_url, COALESCE(user_id::text, ''), timestamp, duration_ms, method, path, query, status_code, request_headers, response_headers, request_size, response_size, remote_addr
		 FROM captured_requests WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanRequests(rows)
}

// Analytics types
type AnalyticsOverview struct {
	TotalRequests  int64              `json:"total_requests"`
	SuccessCount   int64              `json:"success_count"`
	ErrorCount     int64              `json:"error_count"`
	AvgDurationMs  float64            `json:"avg_duration_ms"`
	TotalBytesIn   int64              `json:"total_bytes_in"`
	TotalBytesOut  int64              `json:"total_bytes_out"`
	MethodBreakdown map[string]int64  `json:"method_breakdown"`
	StatusBreakdown map[string]int64  `json:"status_breakdown"`
	TopPaths       []PathCount        `json:"top_paths"`
	Timeline       []TimelinePoint    `json:"timeline"`
}

type PathCount struct {
	Path  string `json:"path"`
	Count int64  `json:"count"`
}

type TimelinePoint struct {
	Time    string `json:"time"`
	Total   int64  `json:"total"`
	Success int64  `json:"success"`
	Error   int64  `json:"error"`
}

// GetAnalytics returns analytics for a user's tunnels over the given period.
func (d *DB) GetAnalytics(ctx context.Context, userID string, hours int) (*AnalyticsOverview, error) {
	if hours <= 0 {
		hours = 24
	}
	since := time.Now().Add(-time.Duration(hours) * time.Hour)

	a := &AnalyticsOverview{
		MethodBreakdown: make(map[string]int64),
		StatusBreakdown: make(map[string]int64),
	}

	// Overview counts
	err := d.Pool.QueryRow(ctx,
		`SELECT COUNT(*), COALESCE(AVG(duration_ms), 0), COALESCE(SUM(request_size), 0), COALESCE(SUM(response_size), 0),
		 COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400),
		 COUNT(*) FILTER (WHERE status_code >= 400)
		 FROM captured_requests WHERE user_id = $1 AND timestamp >= $2`,
		userID, since,
	).Scan(&a.TotalRequests, &a.AvgDurationMs, &a.TotalBytesIn, &a.TotalBytesOut, &a.SuccessCount, &a.ErrorCount)
	if err != nil {
		return nil, err
	}

	// Method breakdown
	rows, err := d.Pool.Query(ctx,
		`SELECT method, COUNT(*) FROM captured_requests WHERE user_id = $1 AND timestamp >= $2 GROUP BY method ORDER BY COUNT(*) DESC`,
		userID, since,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var method string
			var count int64
			rows.Scan(&method, &count)
			a.MethodBreakdown[method] = count
		}
	}

	// Status breakdown (group by category: 2xx, 3xx, 4xx, 5xx)
	rows2, err := d.Pool.Query(ctx,
		`SELECT CASE
			WHEN status_code >= 200 AND status_code < 300 THEN '2xx'
			WHEN status_code >= 300 AND status_code < 400 THEN '3xx'
			WHEN status_code >= 400 AND status_code < 500 THEN '4xx'
			WHEN status_code >= 500 THEN '5xx'
			ELSE 'other' END AS category,
		 COUNT(*) FROM captured_requests WHERE user_id = $1 AND timestamp >= $2
		 GROUP BY category ORDER BY category`,
		userID, since,
	)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var cat string
			var count int64
			rows2.Scan(&cat, &count)
			a.StatusBreakdown[cat] = count
		}
	}

	// Top paths
	rows3, err := d.Pool.Query(ctx,
		`SELECT path, COUNT(*) FROM captured_requests WHERE user_id = $1 AND timestamp >= $2
		 GROUP BY path ORDER BY COUNT(*) DESC LIMIT 10`,
		userID, since,
	)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var pc PathCount
			rows3.Scan(&pc.Path, &pc.Count)
			a.TopPaths = append(a.TopPaths, pc)
		}
	}

	// Timeline (hourly buckets)
	rows4, err := d.Pool.Query(ctx,
		`SELECT date_trunc('hour', timestamp) AS bucket,
		 COUNT(*),
		 COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400),
		 COUNT(*) FILTER (WHERE status_code >= 400)
		 FROM captured_requests WHERE user_id = $1 AND timestamp >= $2
		 GROUP BY bucket ORDER BY bucket`,
		userID, since,
	)
	if err == nil {
		defer rows4.Close()
		for rows4.Next() {
			var tp TimelinePoint
			var t time.Time
			rows4.Scan(&t, &tp.Total, &tp.Success, &tp.Error)
			tp.Time = t.Format("15:04")
			a.Timeline = append(a.Timeline, tp)
		}
	}

	return a, nil
}

func scanRequests(rows interface{ Next() bool; Scan(...interface{}) error }) ([]CapturedRequestRow, error) {
	var result []CapturedRequestRow
	for rows.Next() {
		var r CapturedRequestRow
		var reqH, respH []byte
		err := rows.Scan(&r.ID, &r.TunnelURL, &r.UserID, &r.Timestamp, &r.DurationMs,
			&r.Method, &r.Path, &r.Query, &r.StatusCode,
			&reqH, &respH, &r.RequestSize, &r.ResponseSize, &r.RemoteAddr)
		if err != nil {
			return nil, err
		}
		json.Unmarshal(reqH, &r.RequestHeaders)
		json.Unmarshal(respH, &r.ResponseHeaders)
		result = append(result, r)
	}
	return result, nil
}
