package inspector

import (
	"fmt"
	"time"

	"github.com/serverme/serverme/cli/internal/client"
)

// Adapter wraps Inspector to implement client.RequestInspector.
type Adapter struct {
	ins *Inspector
}

// NewAdapter creates an adapter that connects the client to the inspector.
func NewAdapter(ins *Inspector) *Adapter {
	return &Adapter{ins: ins}
}

// AddRequest implements client.RequestInspector.
func (a *Adapter) AddRequest(req *client.InspectedRequest) {
	a.ins.AddRequest(&CapturedRequest{
		ID:              fmt.Sprintf("%d", time.Now().UnixNano()),
		TunnelURL:       req.TunnelURL,
		Timestamp:       time.Now(),
		Duration:        req.Duration.Milliseconds(),
		Method:          req.Method,
		Path:            req.Path,
		StatusCode:      req.StatusCode,
		RemoteAddr:      req.RemoteAddr,
		RequestHeaders:  map[string]string{},
		ResponseHeaders: map[string]string{},
	})
}
