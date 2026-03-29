# @serverme/sdk

Official JavaScript/TypeScript SDK for [ServerMe](https://serverme.dev) — open-source tunneling platform.

## Install

```bash
npm install @serverme/sdk
```

## Quick Start

```typescript
import { ServerMe } from '@serverme/sdk';

const client = new ServerMe({ authtoken: 'sm_live_...' });

// List active tunnels
const tunnels = await client.tunnels.list();
console.log(tunnels);

// Get captured requests
const requests = await client.inspect.list(tunnels[0].url);
console.log(requests);

// Replay a captured request
const result = await client.inspect.replay(tunnels[0].url, requests[0].id);
console.log(result);
```

## Live Traffic Streaming

```typescript
const stream = client.inspect.subscribe('https://abc123.serverme.dev');

for await (const req of stream) {
  console.log(`${req.method} ${req.path} -> ${req.statusCode} (${req.durationMs}ms)`);
}

// When done
stream.close();
```

## API Keys

```typescript
// List keys
const keys = await client.apiKeys.list();

// Create a new key
const { apiKey, info } = await client.apiKeys.create('my-app');
console.log(apiKey); // sm_live_... (save this!)

// Delete a key
await client.apiKeys.delete(info.id);
```

## Custom Domains

```typescript
// Add a domain
const { domain, instructions } = await client.domains.create('api.example.com');
console.log(`Add CNAME: ${instructions.name} -> ${instructions.target}`);

// Verify DNS
const result = await client.domains.verify(domain.id);
console.log(result.verified); // true/false

// List domains
const domains = await client.domains.list();
```

## Error Handling

```typescript
import { ServerMe, AuthError, RateLimitError, ApiError } from '@serverme/sdk';

try {
  const client = new ServerMe({ authtoken: 'invalid' });
  await client.tunnels.list();
} catch (err) {
  if (err instanceof AuthError) {
    console.log('Bad token');
  } else if (err instanceof RateLimitError) {
    console.log(`Rate limited, retry in ${err.retryAfter}s`);
  } else if (err instanceof ApiError) {
    console.log(`API error ${err.statusCode}: ${err.message}`);
  }
}
```

## Self-Hosted

```typescript
const client = new ServerMe({
  authtoken: 'sm_live_...',
  serverUrl: 'https://tunnel.mycompany.com',
});
```

## License

MIT
