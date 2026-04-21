# Tool SDK Reference — `@sigops/tool-sdk`

Full API reference for building SigOps tools.

## Install

```bash
pnpm add @sigops/tool-sdk
```

---

## `defineTool(definition)`

Factory function that validates and returns a `ToolDefinition` object. This is the primary entrypoint for creating a tool.

```ts
import { defineTool, z } from '@sigops/tool-sdk';

export default defineTool({
  name: 'my-tool',
  description: 'What the tool does',
  version: '0.1.0',
  inputSchema: z.object({ host: z.string() }),
  outputSchema: z.object({ reachable: z.boolean() }),
  async execute(input, ctx) {
    // ...
    return { reachable: true };
  },
});
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique tool identifier (e.g. `http-health-check`) |
| `description` | `string` | Yes | Human-readable description |
| `version` | `string` | Yes | Semver version string |
| `inputSchema` | `z.ZodType` | Yes | Zod schema for input validation |
| `outputSchema` | `z.ZodType` | Yes | Zod schema for output validation |
| `execute` | `function` | Yes | Async function performing the work |
| `tags` | `string[]` | No | Categorization tags |
| `timeout` | `number` | No | Execution timeout in milliseconds (default: 30000) |
| `retryPolicy` | `RetryPolicy` | No | Retry configuration on failure |

### Return value

Returns a `ToolDefinition<TInput, TOutput>` object — the same shape as the input, with types inferred from your Zod schemas.

---

## `ToolDefinition<TInput, TOutput>`

```ts
interface ToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  version: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  execute: (input: z.infer<TInput>, ctx: ToolContext) => Promise<z.infer<TOutput>>;
  tags?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
}
```

---

## `ToolContext`

The second argument to `execute`. Provided by the SigOps runtime (or `mockContext()` in tests).

```ts
interface ToolContext {
  executionId: string;
  logger: Logger;
  secrets: SecretStore;
  signal: AbortSignal;
  env: Record<string, string>;
  http: HttpClient;
  emitMetric(name: string, value: number, tags?: Record<string, string>): void;
  emitStatus(status: string, message?: string): void;
}
```

### `ctx.executionId`

A unique string identifying this execution run. Useful for log correlation and deduplication.

```ts
ctx.logger.info(`Starting execution ${ctx.executionId}`);
```

### `ctx.logger`

Structured logger. Messages are forwarded to the SigOps execution log UI.

```ts
interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}
```

Example:

```ts
ctx.logger.info('Connecting to database', { host: input.host });
ctx.logger.warn('Retry attempt', { attempt: 2 });
ctx.logger.error('Connection failed', { error: err.message });
```

### `ctx.secrets`

Read-only access to secrets configured on the SigOps tool. Never hardcode credentials — use secrets.

```ts
interface SecretStore {
  get(key: string): string | undefined;
  has(key: string): boolean;
}
```

Example:

```ts
const token = ctx.secrets.get('SLACK_WEBHOOK_URL');
if (!token) throw new Error('Missing secret: SLACK_WEBHOOK_URL');
```

### `ctx.signal`

An `AbortSignal` that fires when the execution is cancelled (timeout or manual cancel). Pass to `fetch` calls and loop conditions.

```ts
await ctx.http.get(url, { timeout: 5000 });
// or check manually:
if (ctx.signal.aborted) return;
```

### `ctx.env`

Environment variables forwarded from the SigOps runtime configuration.

```ts
const region = ctx.env['AWS_REGION'] ?? 'us-east-1';
```

### `ctx.http`

Built-in HTTP client. Handles timeouts, respects `ctx.signal`.

```ts
interface HttpClient {
  get(url: string, options?: RequestOptions): Promise<HttpResponse>;
  post(url: string, body: any, options?: RequestOptions): Promise<HttpResponse>;
  put(url: string, body: any, options?: RequestOptions): Promise<HttpResponse>;
  delete(url: string, options?: RequestOptions): Promise<HttpResponse>;
}

interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}
```

Example:

```ts
const res = await ctx.http.post('https://api.example.com/notify', { text: 'Hello' }, {
  headers: { Authorization: `Bearer ${ctx.secrets.get('API_TOKEN')}` },
  timeout: 5000,
});
if (res.status !== 200) throw new Error(`API error: ${res.status}`);
```

### `ctx.emitMetric(name, value, tags?)`

Emits a numeric metric to the SigOps metrics pipeline.

```ts
ctx.emitMetric('backup.size_bytes', 1024 * 1024 * 512, { db: 'production' });
ctx.emitMetric('http.latency_ms', 143, { endpoint: '/health' });
```

### `ctx.emitStatus(status, message?)`

Emits a status update visible in the SigOps execution UI (e.g. progress messages).

```ts
ctx.emitStatus('connecting', 'Establishing database connection');
ctx.emitStatus('running', 'Dumping 14 tables');
ctx.emitStatus('uploading', 'Sending to S3');
```

---

## `RetryPolicy`

Controls automatic retries on failure.

```ts
interface RetryPolicy {
  maxRetries: number;      // Maximum number of retry attempts
  backoffMs?: number;      // Delay between retries in ms (default: 1000)
  retryableErrors?: string[]; // Error message substrings that trigger retry
}
```

Example — retry up to 3 times on network errors:

```ts
defineTool({
  // ...
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 2000,
    retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'socket hang up'],
  },
  async execute(input, ctx) { /* ... */ },
});
```

---

## `mockContext(options?)`

Creates a `ToolContext` suitable for unit tests. Returns the context object plus inspector methods for asserting side effects.

```ts
import { mockContext } from '@sigops/tool-sdk';

const ctx = mockContext({
  executionId: 'test-run-1',
  secrets: { API_KEY: 'test-secret' },
  env: { REGION: 'us-east-1' },
  httpResponses: {
    'GET https://api.example.com/health': { status: 200, headers: {}, body: { ok: true } },
  },
});
```

### Options

| Field | Type | Description |
|-------|------|-------------|
| `executionId` | `string` | Overrides the default generated execution ID |
| `secrets` | `Record<string, string>` | Map of secret key → value |
| `env` | `Record<string, string>` | Map of env var key → value |
| `httpResponses` | `Record<string, HttpResponse>` | Map of `"METHOD url"` → response |

### Inspector methods

The returned `ctx` also exposes inspector methods (via `MockContextInspector`) for assertions:

```ts
ctx.getLogs()       // LogEntry[] — all logger calls
ctx.getMetrics()    // MetricEntry[] — all emitMetric calls
ctx.getStatuses()   // StatusEntry[] — all emitStatus calls
ctx.getHttpCalls()  // HttpCallEntry[] — all http client calls
ctx.abort()         // trigger cancellation signal
```

Example:

```ts
await tool.execute(input, ctx);
expect(ctx.getLogs().filter(l => l.level === 'error')).toHaveLength(0);
expect(ctx.getMetrics()[0]).toMatchObject({ name: 'http.latency_ms' });
```

---

## `TestHarness`

A higher-level test utility that wraps `mockContext` and runs a tool through its full lifecycle (input validation → execute → output validation).

```ts
import { TestHarness } from '@sigops/tool-sdk';
import myTool from '../src/index.js';

const harness = new TestHarness(myTool);
const result = await harness.run({ url: 'https://example.com' });

// result.success: boolean
// result.data: output (if success)
// result.error: string (if failure)
// result.duration: number (ms)
// result.retries: number
```

### `harness.run(input, contextOptions?)`

Runs the tool with the given input and optional context overrides. Returns an `ExecutionResult<TOutput>`.

---

## `getToolMetadata(tool)`

Extracts serializable metadata from a `ToolDefinition` (strips the `execute` function):

```ts
import { getToolMetadata } from '@sigops/tool-sdk';

const meta = getToolMetadata(myTool);
// { name, description, version, tags, timeout, inputSchema, outputSchema }
```

---

## `executeTool(tool, input, ctx)`

Runs a tool programmatically with full retry and validation logic applied:

```ts
import { executeTool, mockContext } from '@sigops/tool-sdk';

const ctx = mockContext();
const result = await executeTool(myTool, { url: 'https://example.com' }, ctx);
```

---

## Error Handling

Throw a plain `Error` from `execute` — the runtime captures the message and marks the execution as failed. If your error message matches a `retryableErrors` entry and `maxRetries > 0`, the runtime retries automatically.

```ts
async execute(input, ctx) {
  const res = await ctx.http.get(input.url);
  if (res.status >= 500) {
    throw new Error(`Server error: ${res.status}`);  // retryable if configured
  }
  if (res.status === 404) {
    throw new Error(`Not found: ${input.url}`);       // not retried
  }
  return { ok: true, statusCode: res.status };
},
```

---

## Rollback Pattern

Use `emitStatus` to signal rollback steps. If your tool modifies state, implement rollback logic inside a try/catch:

```ts
async execute(input, ctx) {
  ctx.emitStatus('deploying', 'Pushing new config');
  await applyConfig(input.config, ctx);

  try {
    ctx.emitStatus('verifying', 'Running health check');
    await verifyHealth(input.endpoint, ctx);
  } catch (err) {
    ctx.emitStatus('rolling_back', 'Reverting config change');
    await revertConfig(ctx);
    throw err;
  }

  return { deployed: true };
},
```
