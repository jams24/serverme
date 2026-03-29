package policy

import (
	"net"
	"strings"
)

// IPRestriction defines allow/deny lists for IP-based access control.
type IPRestriction struct {
	AllowCIDRs []string // if non-empty, only these CIDRs are allowed
	DenyCIDRs  []string // these CIDRs are always blocked

	allowNets []*net.IPNet
	denyNets  []*net.IPNet
}

// NewIPRestriction creates an IP restriction from allow/deny CIDR lists.
func NewIPRestriction(allow, deny []string) (*IPRestriction, error) {
	ipr := &IPRestriction{
		AllowCIDRs: allow,
		DenyCIDRs:  deny,
	}

	for _, cidr := range allow {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			return nil, err
		}
		ipr.allowNets = append(ipr.allowNets, network)
	}

	for _, cidr := range deny {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			return nil, err
		}
		ipr.denyNets = append(ipr.denyNets, network)
	}

	return ipr, nil
}

// IsAllowed checks if an IP address is allowed through the restriction.
func (ipr *IPRestriction) IsAllowed(addr string) bool {
	// Extract IP from addr (may be "ip:port")
	host := addr
	if h, _, err := net.SplitHostPort(addr); err == nil {
		host = h
	}

	ip := net.ParseIP(strings.TrimSpace(host))
	if ip == nil {
		return false // can't parse IP, deny
	}

	// Check deny list first
	for _, network := range ipr.denyNets {
		if network.Contains(ip) {
			return false
		}
	}

	// If allow list is set, IP must be in it
	if len(ipr.allowNets) > 0 {
		for _, network := range ipr.allowNets {
			if network.Contains(ip) {
				return true
			}
		}
		return false // not in allow list
	}

	return true // no restrictions
}
