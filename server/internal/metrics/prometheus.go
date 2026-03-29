package metrics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	// Tunnel metrics
	ActiveTunnels = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Namespace: "serverme",
		Name:      "active_tunnels",
		Help:      "Number of active tunnels by protocol",
	}, []string{"protocol"})

	ActiveClients = promauto.NewGauge(prometheus.GaugeOpts{
		Namespace: "serverme",
		Name:      "active_clients",
		Help:      "Number of connected clients",
	})

	// HTTP proxy metrics
	HTTPRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: "serverme",
		Name:      "http_requests_total",
		Help:      "Total proxied HTTP requests",
	}, []string{"method", "status_code"})

	HTTPRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: "serverme",
		Name:      "http_request_duration_seconds",
		Help:      "HTTP request duration in seconds",
		Buckets:   prometheus.DefBuckets,
	}, []string{"method"})

	HTTPRequestSize = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: "serverme",
		Name:      "http_request_size_bytes",
		Help:      "HTTP request size in bytes",
		Buckets:   prometheus.ExponentialBuckets(100, 10, 6),
	}, []string{"method"})

	HTTPResponseSize = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: "serverme",
		Name:      "http_response_size_bytes",
		Help:      "HTTP response size in bytes",
		Buckets:   prometheus.ExponentialBuckets(100, 10, 6),
	}, []string{"method"})

	// TCP proxy metrics
	TCPConnectionsTotal = promauto.NewCounter(prometheus.CounterOpts{
		Namespace: "serverme",
		Name:      "tcp_connections_total",
		Help:      "Total proxied TCP connections",
	})

	TCPBytesTransferred = promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: "serverme",
		Name:      "tcp_bytes_total",
		Help:      "Total bytes transferred through TCP tunnels",
	}, []string{"direction"}) // "in" or "out"

	// Auth metrics
	AuthAttemptsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: "serverme",
		Name:      "auth_attempts_total",
		Help:      "Total authentication attempts",
	}, []string{"result"}) // "success" or "failure"

	// Connection metrics
	SmuxStreamsActive = promauto.NewGauge(prometheus.GaugeOpts{
		Namespace: "serverme",
		Name:      "smux_streams_active",
		Help:      "Number of active smux streams",
	})
)

// RecordHTTPRequest records metrics for a proxied HTTP request.
func RecordHTTPRequest(method string, statusCode int, duration time.Duration, reqSize, respSize int64) {
	HTTPRequestsTotal.WithLabelValues(method, strconv.Itoa(statusCode)).Inc()
	HTTPRequestDuration.WithLabelValues(method).Observe(duration.Seconds())
	HTTPRequestSize.WithLabelValues(method).Observe(float64(reqSize))
	HTTPResponseSize.WithLabelValues(method).Observe(float64(respSize))
}

// Handler returns the Prometheus metrics HTTP handler.
func Handler() http.Handler {
	return promhttp.Handler()
}
