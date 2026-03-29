package tunnel

import "strings"

// WildcardMatch checks if a hostname matches a wildcard pattern.
// Pattern "*.example.com" matches "foo.example.com" but not "example.com" or "foo.bar.example.com".
func WildcardMatch(pattern, hostname string) bool {
	if !strings.HasPrefix(pattern, "*.") {
		return pattern == hostname
	}

	// "*.example.com" -> ".example.com"
	suffix := pattern[1:]
	if !strings.HasSuffix(hostname, suffix) {
		return false
	}

	// The part before the suffix should not contain dots (single level wildcard)
	prefix := hostname[:len(hostname)-len(suffix)]
	return len(prefix) > 0 && !strings.Contains(prefix, ".")
}

// LookupByHostWithWildcard tries exact match first, then wildcard patterns.
func (r *Registry) LookupByHostWithWildcard(host string) *Tunnel {
	// Try exact match first
	if t := r.LookupByHost(host); t != nil {
		return t
	}

	// Try wildcard patterns
	r.mu.RLock()
	defer r.mu.RUnlock()

	for pattern, t := range r.byHost {
		if strings.HasPrefix(pattern, "*.") && WildcardMatch(pattern, host) {
			return t
		}
	}

	return nil
}

// ExtractWildcardSubdomain extracts the subdomain portion from a wildcard match.
// For pattern "*.example.com" and host "api.example.com", returns "api".
func ExtractWildcardSubdomain(pattern, hostname string) string {
	if !strings.HasPrefix(pattern, "*.") {
		return ""
	}
	suffix := pattern[1:]
	if !strings.HasSuffix(hostname, suffix) {
		return ""
	}
	return hostname[:len(hostname)-len(suffix)]
}
