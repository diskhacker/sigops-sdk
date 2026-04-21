# Getting Started with SigOps SDK

This guide walks you through installing the SigOps SDK CLI, scaffolding your first tool, running tests, validating, and publishing — in about five minutes.

## Prerequisites

- Node.js 18 or later
- pnpm 8 or later (`npm install -g pnpm`)
- A SigOps Marketplace account (free) for publishing

---

## Step 1 — Install the CLI

```bash
npm install -g @sigops/cli
```

Verify the installation:

```bash
sigops-sdk --version
# 1.0.0
```

---

## Step 2 — Scaffold a Tool

Use the `create` command to scaffold a new project. The first argument is the project type (`tool`, `template`, `plugin`, or `connector`) and the second is the project name.

```bash
sigops-sdk create tool my-health-check
```

Expected output:

```
✓ Created 6 files in my-health-check/
  + package.json
  + sigops.config.json
  + src/index.ts
  + __tests__/index.test.ts
  + tsconfig.json
  + README.md

Next steps:
  cd my-health-check
  pnpm install
  pnpm test
```

---

## Step 3 — Understand the Scaffold

Open `src/index.ts`. You will see a minimal `defineTool` call:

```ts
import { defineTool, z } from '@sigops/tool-sdk';

export default defineTool({
  name: 'my-health-check',
  description: 'Describe what this tool does',
  version: '0.1.0',
  inputSchema: z.object({
    url: z.string().url(),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    statusCode: z.number(),
  }),
  async execute(input, ctx) {
    ctx.logger.info(`Checking ${input.url}`);
    const res = await ctx.http.get(input.url);
    return { ok: res.status < 400, statusCode: res.status };
  },
});
```

Key points:
- `inputSchema` and `outputSchema` are Zod schemas — the SDK validates automatically.
- `ctx` is a `ToolContext` with `logger`, `secrets`, `http`, `env`, `emitMetric`, and `emitStatus`.
- The `execute` function is `async` and must return a value matching `outputSchema`.

---

## Step 4 — Edit the Tool

Replace the scaffold with real logic. For a health-check tool:

```ts
import { defineTool, z } from '@sigops/tool-sdk';

export default defineTool({
  name: 'http-health-check',
  description: 'Returns HTTP status and latency for a URL',
  version: '0.1.0',
  inputSchema: z.object({
    url: z.string().url(),
    timeoutMs: z.number().int().positive().default(5000),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    statusCode: z.number(),
    latencyMs: z.number(),
  }),
  timeout: 10000,
  async execute(input, ctx) {
    const start = Date.now();
    ctx.logger.info(`GET ${input.url}`);
    const res = await ctx.http.get(input.url, { timeout: input.timeoutMs });
    const latencyMs = Date.now() - start;
    ctx.emitMetric('http.latency', latencyMs, { url: input.url });
    return { ok: res.status < 400, statusCode: res.status, latencyMs };
  },
});
```

---

## Step 5 — Write a Test

Open `__tests__/index.test.ts` and write a test using `mockContext`:

```ts
import { describe, it, expect } from 'vitest';
import { mockContext } from '@sigops/tool-sdk';
import tool from '../src/index.js';

describe('http-health-check', () => {
  it('returns ok=true for 200', async () => {
    const ctx = mockContext({
      httpResponses: {
        'GET https://example.com': { status: 200, headers: {}, body: null },
      },
    });
    const result = await tool.execute({ url: 'https://example.com', timeoutMs: 5000 }, ctx);
    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  it('returns ok=false for 500', async () => {
    const ctx = mockContext({
      httpResponses: {
        'GET https://broken.example.com': { status: 500, headers: {}, body: null },
      },
    });
    const result = await tool.execute({ url: 'https://broken.example.com', timeoutMs: 5000 }, ctx);
    expect(result.ok).toBe(false);
  });
});
```

Run tests:

```bash
pnpm test
```

Expected output:

```
✓ http-health-check > returns ok=true for 200 (3ms)
✓ http-health-check > returns ok=false for 500 (1ms)
Test Files  1 passed (1)
```

---

## Step 6 — Validate the Project

Run the validator to check your project structure, `sigops.config.json`, and source files:

```bash
sigops-sdk validate .
```

The validator checks:
- `package.json` has `name`, `version`, `main`
- `src/index.ts` exists
- `__tests__/` directory exists
- `sigops.config.json` matches the schema

---

## Step 7 — Publish

Authenticate with the SigOps Marketplace:

```bash
sigops-sdk login --key YOUR_API_KEY
```

Then publish:

```bash
sigops-sdk publish .
```

Use `--dry-run` to simulate without uploading:

```bash
sigops-sdk publish . --dry-run
```

---

## Troubleshooting

**`sigops-sdk: command not found`** — Make sure your global npm bin directory is on your `PATH`. Run `npm bin -g` to find it.

**Type errors in `execute`** — Ensure your Zod schemas are specific. The `z.infer<>` type flows through automatically once you declare `inputSchema` and `outputSchema` correctly.

**Validation fails on `sigops.config.json`** — Check the `name` field follows the `org.tool-name` format (e.g. `myorg.http-health-check`).

---

## Next Steps

- Read `docs/tool-reference.md` for the full `@sigops/tool-sdk` API
- Read `docs/template-guide.md` to bundle tools into reusable automation templates
- Read `docs/sel-reference.md` to write `.sel` workflow expressions
- Read `docs/plugin-guide.md` to extend SigOps with custom hooks and UI panels
