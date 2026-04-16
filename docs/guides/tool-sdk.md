# Tool SDK Guide (`@sigops/tool-sdk`)

The Tool SDK is how you build **SigOps tools** — the atomic units of
automation that get invoked by templates, alerts, scheduled jobs, or ad-hoc
from the SigOps UI and CLI.

A tool has four responsibilities:

1. Validate its input against a schema.
2. Do some work, using the injected `ToolContext` for logging, secrets,
   HTTP, metrics, status updates, and cancellation.
3. Produce output that conforms to its output schema.
4. Surface errors in a way the SigOps runtime can classify and retry.

The SDK takes care of (1), (3), retries, timeouts, and output validation;
you write (2).

---

## Overview

A tool is a plain object produced by the `defineTool(...)` factory:

```ts
import { defineTool, z } from '@sigops/tool-sdk';

export default defineTool({
  name: 'http-health-check',
  description: 'Checks that an HTTP endpoint returns 2xx within the timeout',
  input:  z.object({ url: z.string().url(), timeoutMs: z.number().int().positive().default(3000) }),
  output: z.object({ status: z.number(), ok: z.boolean(), latencyMs: z.number() }),
  async execute(input, ctx) {
    const start = Date.now();
    const res = await ctx.http.get(input.url, { timeout: input.timeoutMs });
    return { status: res.status, ok: res.status < 400, latencyMs: Date.now() - start };
  },
});
```

The returned `ToolDefinition` is serializable metadata + an `execute`
function. Everything the SigOps runtime needs is on that single object.

---

## Install

```bash
pnpm add @sigops/tool-sdk
# or
npm install @sigops/tool-sdk
```

You do **not** need to install Zod separately — the SDK re-exports it as
`z` so that you use exactly the same version the SDK was built against.

---

## Quickstart

```bash
pnpm create @sigops my-first-tool --type tool   # or: sigops init my-first-tool --type tool
cd my-first-tool
pnpm install
pnpm test
```

The scaffold contains:

```
my-first-tool/
  package.json            # depends on @sigops/tool-sdk
  tsconfig.json
  src/index.ts            # defineTool(...) with a TODO execute()
  __tests__/index.test.ts # vitest smoke test
  README.md
```

Open `src/index.ts`, implement `execute`, and run `pnpm test`.

---

## API reference

### `defineTool(config)`

Signature:

```ts
function defineTool<TInput extends InputSchema, TOutput extends OutputSchema>(
  config: {
    name: string;                  // kebab-case, starts with lowercase letter
    description: string;
    version?: string;              // default: '0.1.0'
    input: TInput;                 // Zod schema for input
    output: TOutput;               // Zod schema for output
    execute: (input, ctx) => Promise<Output>;
    tags?: string[];
    timeout?: number;              // ms, default 30000
    retryPolicy?: RetryPolicy;
  }
): ToolDefinition<TInput, TOutput>;
```

Throws if `name` is missing or not kebab-case, or if `description`, `input`,
`output`, or `execute` are missing.

### `ToolContext`

Every `execute` gets one of these:

| Property | Type | Purpose |
|---|---|---|
| `executionId` | `string` | Unique ID for this invocation |
| `logger` | `Logger` | `debug/info/warn/error(msg, ...args)` |
| `secrets` | `SecretStore` | `get(key)`, `has(key)` |
| `signal` | `AbortSignal` | Cooperative cancellation |
| `env` | `Record<string,string>` | Whitelisted env vars |
| `http` | `HttpClient` | `get/post/put/delete(url, opts)` |
| `emitMetric(name, value, tags?)` | `void` | Custom metrics |
| `emitStatus(status, message?)` | `void` | Progress updates |

### `executeTool(tool, input, ctx)`

Validates input, runs the tool with retries, validates output, and returns
an `ExecutionResult`:

```ts
{ success: true,  data: Output, duration: number, retries: number }
{ success: false, error: string, duration: number, retries: number }
```

### `TestHarness`

A fluent API for testing tools without constructing a `ToolContext` by
hand:

```ts
import { TestHarness } from '@sigops/tool-sdk';

const h = new TestHarness(myTool)
  .withSecret('API_KEY', 'xxx')
  .withHttpResponse('https://api.example.com/health', { status: 200, body: { ok: true } });

const res = await h.run({ url: 'https://api.example.com/health' });
expect(res.success).toBe(true);
```

### `mockContext(overrides?)`

Returns a pre-wired `ToolContext` for unit tests. Every side-effect
(`logger`, `emitMetric`, `emitStatus`, `http`) is recorded so you can assert
on them. Returned object has `.getLogs()`, `.getMetrics()`, `.getStatuses()`,
`.getHttpCalls()` inspectors.

### `RetryPolicy`

```ts
{ maxRetries: number; backoffMs?: number; retryableErrors?: string[] }
```

`retryableErrors` is a list of substrings. If present, only errors whose
message contains one of them trigger a retry.

---

## Example — HTTP health check

```ts
import { defineTool, z } from '@sigops/tool-sdk';

export default defineTool({
  name: 'http-health-check',
  description: 'Checks that an HTTP endpoint returns 2xx within the timeout',
  input: z.object({
    url: z.string().url(),
    timeoutMs: z.number().int().positive().default(3000),
  }),
  output: z.object({
    status: z.number(),
    ok: z.boolean(),
    latencyMs: z.number(),
  }),
  retryPolicy: { maxRetries: 2, backoffMs: 250, retryableErrors: ['ETIMEDOUT', '5'] },
  async execute(input, ctx) {
    ctx.logger.info(`checking ${input.url}`);
    const start = Date.now();
    const res = await ctx.http.get(input.url, { timeout: input.timeoutMs });
    ctx.emitMetric('http_check.latency_ms', Date.now() - start, { host: new URL(input.url).host });
    if (res.status >= 500) throw new Error(`upstream 5xx: ${res.status}`);
    return { status: res.status, ok: res.status < 400, latencyMs: Date.now() - start };
  },
});
```

Runnable example: [`examples/hello-tool`](../../examples/hello-tool).

---

## Testing patterns

```ts
import { describe, it, expect } from 'vitest';
import { executeTool, mockContext } from '@sigops/tool-sdk';
import httpHealth from '../src/index.js';

describe('http-health-check', () => {
  it('returns ok:true on 200', async () => {
    const ctx = mockContext({
      httpResponses: { 'https://ok.example.com': { status: 200, body: 'ok' } },
    });
    const res = await executeTool(httpHealth, { url: 'https://ok.example.com' }, ctx);
    expect(res.success).toBe(true);
    expect(res.data?.ok).toBe(true);
  });

  it('rejects invalid URL at input validation', async () => {
    const res = await executeTool(httpHealth, { url: 'nope' }, mockContext());
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Input validation failed/);
  });
});
```

---

## Error handling, timeouts, and rollback

- Throw plain `Error`s. The SDK catches them, surfaces `error.message`, and
  runs the retry policy if one is configured.
- `ctx.signal` is honoured by the SDK — always pass it to `ctx.http` or
  `fetch` so long-running requests are cancelled when the caller aborts.
- For rollback, expose a second tool (e.g. `my-thing` + `my-thing-undo`) and
  let the template orchestrate the sequence. Do not bake rollback into a
  single `execute` function.

---

## Publishing

```bash
sigops validate                 # static + schema checks
sigops publish --access public  # uploads to the SigOps Marketplace
```

See `docs/guides/cli.md` for the full publish pipeline.
