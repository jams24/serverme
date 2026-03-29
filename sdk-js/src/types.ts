/** Options for creating a ServerMe client. */
export interface ServerMeOptions {
  /** API key (format: sm_live_...) */
  authtoken: string;
  /** Server API base URL. Defaults to https://api.serverme.dev */
  serverUrl?: string;
  /** Request timeout in ms. Defaults to 30000. */
  timeout?: number;
}

/** Options for creating a tunnel. */
export interface TunnelOptions {
  /** Tunnel protocol */
  proto: "http" | "tcp" | "tls";
  /** Local port or address to forward to */
  addr: number | string;
  /** Request a custom subdomain (HTTP/TLS only) */
  subdomain?: string;
  /** Use a custom domain (HTTP/TLS only) */
  domain?: string;
  /** Remote port (TCP only) */
  remotePort?: number;
  /** Tunnel name/label */
  name?: string;
  /** Enable request inspection. Defaults to true for HTTP. */
  inspect?: boolean;
  /** HTTP basic auth (format: "user:pass") */
  auth?: string;
}

/** An active tunnel. */
export interface Tunnel {
  /** Public URL (e.g., https://abc123.serverme.dev) */
  url: string;
  /** Protocol type */
  protocol: string;
  /** Tunnel name */
  name: string;
  /** Client ID */
  clientId: string;
}

/** A captured HTTP request. */
export interface CapturedRequest {
  id: string;
  tunnelUrl: string;
  timestamp: string;
  durationMs: number;
  method: string;
  path: string;
  query: string;
  statusCode: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: Uint8Array;
  responseBody?: Uint8Array;
  requestSize: number;
  responseSize: number;
  remoteAddr: string;
}

/** User account. */
export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  createdAt: string;
}

/** API key metadata. */
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

/** Custom domain. */
export interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  cnameTarget: string;
  createdAt: string;
}

/** Result of replaying a captured request. */
export interface ReplayResult {
  statusCode: number;
  responseHeaders: Record<string, string>;
  responseBody?: Uint8Array;
  durationMs: number;
  error?: string;
}
