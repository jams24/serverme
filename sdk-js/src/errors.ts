/** Base error class for ServerMe SDK. */
export class ServerMeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerMeError";
  }
}

/** Thrown when authentication fails. */
export class AuthError extends ServerMeError {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "AuthError";
  }
}

/** Thrown when an API request fails. */
export class ApiError extends ServerMeError {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

/** Thrown when a resource is not found. */
export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

/** Thrown when rate limited. */
export class RateLimitError extends ApiError {
  public retryAfter: number;

  constructor(retryAfter = 1) {
    super(429, "Rate limit exceeded");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}
