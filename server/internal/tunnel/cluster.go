package tunnel

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog"
)

// ClusterRegistry extends Registry with Redis-backed distributed tunnel tracking.
// When multiple server nodes run behind a load balancer, each node registers its
// tunnels in Redis so that any node can route traffic to the correct node.
type ClusterRegistry struct {
	*Registry
	redis   RedisClient
	nodeID  string
	log     zerolog.Logger
}

// RedisClient is the interface for Redis operations needed by the cluster registry.
type RedisClient interface {
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
	Get(ctx context.Context, key string) (string, error)
	Del(ctx context.Context, keys ...string) error
	Keys(ctx context.Context, pattern string) ([]string, error)
}

// TunnelRecord is the data stored in Redis for each tunnel.
type TunnelRecord struct {
	URL       string `json:"url"`
	Protocol  string `json:"protocol"`
	ClientID  string `json:"client_id"`
	NodeID    string `json:"node_id"`
	NodeAddr  string `json:"node_addr"`  // internal address of the node holding the tunnel
	CreatedAt int64  `json:"created_at"`
}

// NewClusterRegistry creates a cluster-aware registry.
// If redis is nil, falls back to local-only mode.
func NewClusterRegistry(redis RedisClient, nodeID string, log zerolog.Logger) *ClusterRegistry {
	return &ClusterRegistry{
		Registry: NewRegistry(),
		redis:    redis,
		nodeID:   nodeID,
		log:      log.With().Str("component", "cluster_registry").Str("node", nodeID).Logger(),
	}
}

// RegisterCluster registers a tunnel both locally and in Redis.
func (cr *ClusterRegistry) RegisterCluster(ctx context.Context, t *Tunnel, nodeAddr string) error {
	// Register locally
	if err := cr.Register(t); err != nil {
		return err
	}

	// Register in Redis if available
	if cr.redis == nil {
		return nil
	}

	record := TunnelRecord{
		URL:       t.URL,
		Protocol:  t.Protocol,
		ClientID:  t.ClientID,
		NodeID:    cr.nodeID,
		NodeAddr:  nodeAddr,
		CreatedAt: time.Now().Unix(),
	}

	data, _ := json.Marshal(record)

	key := cr.redisKey(t)
	if err := cr.redis.Set(ctx, key, string(data), 5*time.Minute); err != nil {
		cr.log.Warn().Err(err).Str("key", key).Msg("failed to register in Redis")
		// Don't fail — local registration succeeded
	}

	cr.log.Debug().Str("url", t.URL).Msg("registered in cluster")
	return nil
}

// RemoveCluster removes a tunnel locally and from Redis.
func (cr *ClusterRegistry) RemoveCluster(ctx context.Context, t *Tunnel) {
	cr.RemoveByURL(t.URL)

	if cr.redis == nil {
		return
	}

	key := cr.redisKey(t)
	if err := cr.redis.Del(ctx, key); err != nil {
		cr.log.Warn().Err(err).Str("key", key).Msg("failed to remove from Redis")
	}
}

// LookupCluster looks up a tunnel, first locally then in Redis.
// If the tunnel is on another node, returns the node address for proxying.
func (cr *ClusterRegistry) LookupCluster(ctx context.Context, host string) (*Tunnel, string, error) {
	// Try local first
	if t := cr.LookupByHostWithWildcard(host); t != nil {
		return t, "", nil // local tunnel, no need to proxy to another node
	}

	if cr.redis == nil {
		return nil, "", nil
	}

	// Try Redis
	key := fmt.Sprintf("sm:tunnel:http:%s", host)
	val, err := cr.redis.Get(ctx, key)
	if err != nil || val == "" {
		return nil, "", nil
	}

	var record TunnelRecord
	if err := json.Unmarshal([]byte(val), &record); err != nil {
		return nil, "", err
	}

	if record.NodeID == cr.nodeID {
		return nil, "", nil // shouldn't happen, but just in case
	}

	// Return the remote node's address for inter-node proxying
	return nil, record.NodeAddr, nil
}

// Heartbeat refreshes TTL on all local tunnels in Redis.
// Call periodically (e.g., every 2 minutes) to keep registrations alive.
func (cr *ClusterRegistry) Heartbeat(ctx context.Context) {
	if cr.redis == nil {
		return
	}

	tunnels := cr.List()
	for _, t := range tunnels {
		key := cr.redisKey(t)
		// Re-set with fresh TTL
		val, err := cr.redis.Get(ctx, key)
		if err == nil && val != "" {
			cr.redis.Set(ctx, key, val, 5*time.Minute)
		}
	}

	cr.log.Debug().Int("tunnels", len(tunnels)).Msg("heartbeat sent")
}

func (cr *ClusterRegistry) redisKey(t *Tunnel) string {
	host := t.Subdomain
	if t.Hostname != "" {
		host = t.Hostname
	}

	switch t.Protocol {
	case "tcp":
		return fmt.Sprintf("sm:tunnel:tcp:%d", t.RemotePort)
	default:
		return fmt.Sprintf("sm:tunnel:http:%s", host)
	}
}
