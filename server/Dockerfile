FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /build

# Copy proto module first (dependency)
COPY proto/go.mod proto/go.sum* ./proto/
COPY proto/ ./proto/

# Copy server module
COPY server/go.mod server/go.sum ./server/
WORKDIR /build/server
RUN go mod download

COPY server/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /servermesrv ./cmd/servermesrv

# Final image
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tini
COPY --from=builder /servermesrv /usr/local/bin/servermesrv

EXPOSE 8443 8080 8081

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["servermesrv"]
