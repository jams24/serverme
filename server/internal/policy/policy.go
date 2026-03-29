package policy

import (
	"net/http"
	"regexp"
	"strings"
)

// Policy defines traffic rules for a tunnel.
type Policy struct {
	// Request modifications
	AddRequestHeaders    map[string]string `json:"add_request_headers,omitempty"`
	RemoveRequestHeaders []string          `json:"remove_request_headers,omitempty"`
	SetRequestHeaders    map[string]string `json:"set_request_headers,omitempty"`

	// Response modifications
	AddResponseHeaders    map[string]string `json:"add_response_headers,omitempty"`
	RemoveResponseHeaders []string          `json:"remove_response_headers,omitempty"`
	SetResponseHeaders    map[string]string `json:"set_response_headers,omitempty"`

	// URL rewriting
	URLRewrites []URLRewrite `json:"url_rewrites,omitempty"`

	// Request filtering
	AllowPaths []string `json:"allow_paths,omitempty"` // regex patterns
	DenyPaths  []string `json:"deny_paths,omitempty"`  // regex patterns

	// Compiled patterns (not serialized)
	allowPatterns []*regexp.Regexp
	denyPatterns  []*regexp.Regexp
}

// URLRewrite defines a URL rewrite rule.
type URLRewrite struct {
	Match   string `json:"match"`   // regex pattern
	Replace string `json:"replace"` // replacement string ($1, $2 for groups)
	pattern *regexp.Regexp
}

// Compile pre-compiles regex patterns for performance.
func (p *Policy) Compile() error {
	for _, pat := range p.AllowPaths {
		re, err := regexp.Compile(pat)
		if err != nil {
			return err
		}
		p.allowPatterns = append(p.allowPatterns, re)
	}
	for _, pat := range p.DenyPaths {
		re, err := regexp.Compile(pat)
		if err != nil {
			return err
		}
		p.denyPatterns = append(p.denyPatterns, re)
	}
	for i := range p.URLRewrites {
		re, err := regexp.Compile(p.URLRewrites[i].Match)
		if err != nil {
			return err
		}
		p.URLRewrites[i].pattern = re
	}
	return nil
}

// ApplyRequest modifies an incoming HTTP request according to the policy.
// Returns false if the request should be blocked.
func (p *Policy) ApplyRequest(r *http.Request) bool {
	// Path filtering
	if !p.isPathAllowed(r.URL.Path) {
		return false
	}

	// URL rewriting
	for _, rw := range p.URLRewrites {
		if rw.pattern != nil && rw.pattern.MatchString(r.URL.Path) {
			r.URL.Path = rw.pattern.ReplaceAllString(r.URL.Path, rw.Replace)
		}
	}

	// Header manipulation
	for _, h := range p.RemoveRequestHeaders {
		r.Header.Del(h)
	}
	for k, v := range p.AddRequestHeaders {
		r.Header.Add(k, v)
	}
	for k, v := range p.SetRequestHeaders {
		r.Header.Set(k, v)
	}

	return true
}

// ApplyResponse modifies an outgoing HTTP response according to the policy.
func (p *Policy) ApplyResponse(header http.Header) {
	for _, h := range p.RemoveResponseHeaders {
		header.Del(h)
	}
	for k, v := range p.AddResponseHeaders {
		header.Add(k, v)
	}
	for k, v := range p.SetResponseHeaders {
		header.Set(k, v)
	}
}

func (p *Policy) isPathAllowed(path string) bool {
	// If deny list is set, check first
	for _, re := range p.denyPatterns {
		if re.MatchString(path) {
			return false
		}
	}

	// If allow list is set, path must match
	if len(p.allowPatterns) > 0 {
		for _, re := range p.allowPatterns {
			if re.MatchString(path) {
				return true
			}
		}
		return false
	}

	return true
}

// Engine manages policies per tunnel.
type Engine struct {
	policies map[string]*Policy // tunnelURL -> policy
}

// NewEngine creates a new policy engine.
func NewEngine() *Engine {
	return &Engine{
		policies: make(map[string]*Policy),
	}
}

// Set registers a policy for a tunnel.
func (e *Engine) Set(tunnelURL string, p *Policy) error {
	if err := p.Compile(); err != nil {
		return err
	}
	e.policies[tunnelURL] = p
	return nil
}

// Get returns the policy for a tunnel (nil if none).
func (e *Engine) Get(tunnelURL string) *Policy {
	return e.policies[tunnelURL]
}

// Remove deletes a tunnel's policy.
func (e *Engine) Remove(tunnelURL string) {
	delete(e.policies, tunnelURL)
}

// HeaderMiddleware returns an HTTP middleware that applies a fixed set of response headers.
func HeaderMiddleware(headers map[string]string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			for k, v := range headers {
				w.Header().Set(k, v)
			}
			next.ServeHTTP(w, r)
		})
	}
}

// SecurityHeaders returns common security headers middleware.
func SecurityHeaders() func(http.Handler) http.Handler {
	return HeaderMiddleware(map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":       "DENY",
		"X-XSS-Protection":      "1; mode=block",
		"Referrer-Policy":       "strict-origin-when-cross-origin",
	})
}

// StripPrefix returns a path prefix stripping rewrite.
func StripPrefix(prefix string) URLRewrite {
	escaped := regexp.QuoteMeta(prefix)
	return URLRewrite{
		Match:   "^" + escaped + "(.*)",
		Replace: "$1",
	}
}

// AddPrefix returns a path prefix adding rewrite.
func AddPrefix(prefix string) URLRewrite {
	return URLRewrite{
		Match:   "^(.*)",
		Replace: prefix + "$1",
	}
}

// ReplacePathSegment rewrites one path segment to another.
func ReplacePathSegment(from, to string) URLRewrite {
	return URLRewrite{
		Match:   strings.ReplaceAll(regexp.QuoteMeta(from), "/", "\\/"),
		Replace: to,
	}
}
