package client

import (
	"crypto/rand"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"runtime"
	"sync"
	"time"


	"github.com/rs/zerolog"
	"github.com/serverme/serverme/proto"
	"github.com/xtaci/smux"
)

// TunnelConfig defines what tunnel to create.
type TunnelConfig struct {
	Protocol   string
	LocalAddr  string
	Subdomain  string
	Hostname   string
	RemotePort int
	Name       string
	Inspect    bool
	Auth       string
}

// ActiveTunnel represents a tunnel that's been established.
type ActiveTunnel struct {
	URL      string
	Protocol string
	Name     string
}

// RequestInspector captures proxied request metadata.
type RequestInspector interface {
	AddRequest(req *InspectedRequest)
}

// InspectedRequest holds metadata about a proxied request.
type InspectedRequest struct {
	TunnelURL  string
	Method     string
	Path       string
	StatusCode int
	Duration   time.Duration
	RemoteAddr string
}

// Client manages the connection to the ServerMe server.
type Client struct {
	serverAddr string
	authToken  string
	tlsSkip    bool
	tunnels    []TunnelConfig
	active     []ActiveTunnel
	session    *smux.Session
	ctrlStr    *smux.Stream
	inspector  RequestInspector
	log        zerolog.Logger
	closeCh    chan struct{}
	closeOnce  sync.Once
}

// New creates a new tunnel client.
func New(serverAddr, authToken string, tlsSkip bool, tunnels []TunnelConfig, log zerolog.Logger) *Client {
	return &Client{
		serverAddr: serverAddr,
		authToken:  authToken,
		tlsSkip:    tlsSkip,
		tunnels:    tunnels,
		log:        log,
		closeCh:    make(chan struct{}),
	}
}

// Connect establishes the connection to the server and sets up tunnels.
func (c *Client) Connect() error {
	c.log.Info().Str("server", c.serverAddr).Msg("connecting to server")

	// Dial the server
	conn, err := c.dial()
	if err != nil {
		return fmt.Errorf("dial server: %w", err)
	}

	// Create smux client session
	smuxConfig := smux.DefaultConfig()
	smuxConfig.MaxReceiveBuffer = 4 * 1024 * 1024
	smuxConfig.KeepAliveInterval = 10 * time.Second
	smuxConfig.KeepAliveTimeout = 60 * time.Second

	session, err := smux.Client(conn, smuxConfig)
	if err != nil {
		conn.Close()
		return fmt.Errorf("create smux session: %w", err)
	}
	c.session = session

	// Open control stream (stream 0)
	ctrlStr, err := session.OpenStream()
	if err != nil {
		session.Close()
		return fmt.Errorf("open control stream: %w", err)
	}
	c.ctrlStr = ctrlStr

	// Authenticate
	if err := c.authenticate(); err != nil {
		session.Close()
		return fmt.Errorf("authenticate: %w", err)
	}

	// Request tunnels
	for _, tc := range c.tunnels {
		at, err := c.requestTunnel(tc)
		if err != nil {
			c.log.Error().Err(err).Str("local", tc.LocalAddr).Msg("failed to create tunnel")
			continue
		}
		c.active = append(c.active, *at)
	}

	if len(c.active) == 0 {
		session.Close()
		return fmt.Errorf("no tunnels established")
	}

	return nil
}

// Run listens for proxy requests until the connection closes.
func (c *Client) Run() error {
	defer c.Close()

	for {
		env, err := proto.ReadMsg(c.ctrlStr)
		if err != nil {
			if c.isClosed() {
				return nil
			}
			return fmt.Errorf("read control msg: %w", err)
		}

		switch env.Type {
		case proto.TypeReqProxy:
			go c.handleReqProxy()

		case proto.TypePing:
			proto.WriteMsg(c.ctrlStr, proto.TypePong, &proto.Pong{})

		case proto.TypeCloseTunnel:
			var ct proto.CloseTunnel
			proto.UnpackPayload(env, &ct)
			c.log.Warn().Str("url", ct.URL).Str("error", ct.Error).Msg("tunnel closed by server")

		default:
			c.log.Debug().Str("type", env.Type).Msg("unknown message type")
		}
	}
}

// SetInspector attaches a request inspector to the client.
func (c *Client) SetInspector(ins RequestInspector) {
	c.inspector = ins
}

// ActiveTunnels returns the list of established tunnels.
func (c *Client) ActiveTunnels() []ActiveTunnel {
	return c.active
}

// Close shuts down the client connection.
func (c *Client) Close() {
	c.closeOnce.Do(func() {
		close(c.closeCh)
		if c.ctrlStr != nil {
			c.ctrlStr.Close()
		}
		if c.session != nil {
			c.session.Close()
		}
	})
}

func (c *Client) dial() (net.Conn, error) {
	dialer := &net.Dialer{Timeout: 10 * time.Second}

	tlsConfig := &tls.Config{
		InsecureSkipVerify: c.tlsSkip,
		MinVersion:         tls.VersionTLS12,
	}

	conn, err := tls.DialWithDialer(dialer, "tcp", c.serverAddr, tlsConfig)
	if err != nil {
		// Fall back to plain TCP (dev mode)
		c.log.Debug().Msg("TLS failed, trying plain TCP")
		return dialer.Dial("tcp", c.serverAddr)
	}
	return conn, nil
}

func (c *Client) authenticate() error {
	auth := proto.Auth{
		Token:   c.authToken,
		Version: proto.Version,
		OS:      runtime.GOOS,
		Arch:    runtime.GOARCH,
	}

	if err := proto.WriteMsg(c.ctrlStr, proto.TypeAuth, &auth); err != nil {
		return fmt.Errorf("send auth: %w", err)
	}

	var resp proto.AuthResp
	if err := proto.ReadTypedMsg(c.ctrlStr, proto.TypeAuthResp, &resp); err != nil {
		return err
	}

	if resp.Error != "" {
		return fmt.Errorf("auth failed: %s", resp.Error)
	}

	c.log.Info().Str("client_id", resp.ClientID).Msg("authenticated")
	return nil
}

func (c *Client) requestTunnel(tc TunnelConfig) (*ActiveTunnel, error) {
	req := proto.ReqTunnel{
		Protocol:   tc.Protocol,
		LocalAddr:  tc.LocalAddr,
		Subdomain:  tc.Subdomain,
		Hostname:   tc.Hostname,
		RemotePort: tc.RemotePort,
		Name:       tc.Name,
		Inspect:    tc.Inspect,
		Auth:       tc.Auth,
	}

	if err := proto.WriteMsg(c.ctrlStr, proto.TypeReqTunnel, &req); err != nil {
		return nil, fmt.Errorf("send ReqTunnel: %w", err)
	}

	var resp proto.NewTunnel
	if err := proto.ReadTypedMsg(c.ctrlStr, proto.TypeNewTunnel, &resp); err != nil {
		return nil, err
	}

	if resp.Error != "" {
		return nil, fmt.Errorf("tunnel error: %s", resp.Error)
	}

	return &ActiveTunnel{
		URL:      resp.URL,
		Protocol: resp.Protocol,
		Name:     resp.Name,
	}, nil
}

func (c *Client) handleReqProxy() {
	// Open a new smux stream for this proxy connection
	stream, err := c.session.OpenStream()
	if err != nil {
		c.log.Error().Err(err).Msg("failed to open proxy stream")
		return
	}

	// Send RegProxy to identify ourselves
	if err := proto.WriteMsg(stream, proto.TypeRegProxy, &proto.RegProxy{}); err != nil {
		c.log.Error().Err(err).Msg("failed to send RegProxy")
		stream.Close()
		return
	}

	// Read StartProxy to know where to connect
	var start proto.StartProxy
	if err := proto.ReadTypedMsg(stream, proto.TypeStartProxy, &start); err != nil {
		c.log.Error().Err(err).Msg("failed to read StartProxy")
		stream.Close()
		return
	}

	// Find the local address for this tunnel
	localAddr := c.findLocalAddr(start.URL)
	if localAddr == "" {
		c.log.Error().Str("url", start.URL).Msg("no local addr for tunnel")
		stream.Close()
		return
	}

	// Dial the local service
	local, err := net.DialTimeout("tcp", localAddr, 5*time.Second)
	if err != nil {
		c.log.Error().Err(err).Str("local", localAddr).Msg("failed to connect to local service")
		stream.Close()
		return
	}

	proxyStart := time.Now()

	c.log.Debug().
		Str("url", start.URL).
		Str("local", localAddr).
		Str("client", start.ClientAddr).
		Msg("proxying connection")

	// Bidirectional copy
	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		io.Copy(local, stream)
		if tc, ok := local.(*net.TCPConn); ok {
			tc.CloseWrite()
		}
	}()

	go func() {
		defer wg.Done()
		io.Copy(stream, local)
		stream.Close()
	}()

	wg.Wait()
	local.Close()

	duration := time.Since(proxyStart)

	// Notify inspector if attached
	if c.inspector != nil {
		c.inspector.AddRequest(&InspectedRequest{
			TunnelURL:  start.URL,
			RemoteAddr: start.ClientAddr,
			Duration:   duration,
		})
	}
}

func (c *Client) findLocalAddr(tunnelURL string) string {
	// Match active tunnel URL to find the corresponding local addr
	for i, at := range c.active {
		if at.URL == tunnelURL && i < len(c.tunnels) {
			return c.tunnels[i].LocalAddr
		}
	}
	// Fallback: return first tunnel's local addr
	if len(c.tunnels) > 0 {
		return c.tunnels[0].LocalAddr
	}
	return ""
}

// RunWithReconnect runs the client with automatic reconnection on disconnect.
func (c *Client) RunWithReconnect() error {
	backoff := &expBackoff{
		min:    1 * time.Second,
		max:    60 * time.Second,
		factor: 2.0,
	}

	for {
		err := c.Run()
		if c.isClosed() {
			return nil // intentional shutdown
		}

		c.log.Warn().Err(err).Msg("disconnected")

		// Reset for reconnect
		c.closeOnce = sync.Once{}
		c.closeCh = make(chan struct{})
		c.active = nil

		wait := backoff.next()
		c.log.Info().Dur("retry_in", wait).Msg("reconnecting...")
		time.Sleep(wait)

		if err := c.Connect(); err != nil {
			c.log.Error().Err(err).Msg("reconnect failed")
			continue
		}

		backoff.reset()
		c.log.Info().Msg("reconnected successfully")

		// Re-print tunnel info
		for _, t := range c.active {
			c.log.Info().Str("url", t.URL).Msg("tunnel re-established")
		}
	}
}

func (c *Client) isClosed() bool {
	select {
	case <-c.closeCh:
		return true
	default:
		return false
	}
}

// expBackoff implements exponential backoff with jitter.
type expBackoff struct {
	min     time.Duration
	max     time.Duration
	factor  float64
	current time.Duration
}

func (b *expBackoff) next() time.Duration {
	if b.current < b.min {
		b.current = b.min
	}

	wait := b.current

	// Add jitter: +/- 25%
	jitter := time.Duration(float64(wait) * 0.25)
	randBytes := make([]byte, 1)
	rand.Read(randBytes)
	if randBytes[0]%2 == 0 {
		wait += jitter
	} else {
		wait -= jitter
	}

	b.current = time.Duration(float64(b.current) * b.factor)
	if b.current > b.max {
		b.current = b.max
	}

	return wait
}

func (b *expBackoff) reset() {
	b.current = 0
}
