# hello-tool

A minimal [@sigops/tool-sdk](../../packages/tool-sdk) example: a SigOps tool
that echoes whatever message you give it.

## What this example shows

This example is intentionally small so that it is easy to read in one sitting.
It demonstrates every required piece of a SigOps tool:

1. Importing `defineTool` and the re-exported `z` (Zod) from
   `@sigops/tool-sdk` — **you never install Zod yourself**.
2. Declaring a Zod input schema with validation (`.min(1)` and a default).
3. Declaring a Zod output schema (the SDK validates the return value against
   this shape at runtime).
4. Implementing `execute(input, ctx)`:
   - `input` is strongly typed from the schema.
   - `ctx` is the `ToolContext`: logger, secrets, HTTP client, abort signal,
     metric emitter, and status emitter.
5. Using `ctx.logger.info(...)` and `ctx.emitMetric(...)` so the tool behaves
   correctly inside the SigOps runtime (logs flow to the event stream, metrics
   show up in dashboards).

## Install & build

From the repo root:

```bash
pnpm install
pnpm --filter @sigops-examples/hello-tool build
```

That compiles `src/index.ts` to `dist/` as ES modules with `.d.ts` types.

## Use it

```ts
import { helloTool } from '@sigops-examples/hello-tool';
import { mockContext, executeTool } from '@sigops/tool-sdk';

const result = await executeTool(helloTool, { message: 'hi', uppercase: true }, mockContext());
console.log(result.data); // { echoed: 'HI', length: 2, receivedAt: '1970-01-01T...' }
```

## Next steps

- Add secrets via `ctx.secrets.get('MY_KEY')` — see `tool-db-backup` example.
- Add an HTTP call via `ctx.http.get(...)` — see `tool-http-health-check`.
- Add a `retryPolicy` on the `defineTool` config for transient failures.

See [docs/guides/tool-sdk.md](../../docs/guides/tool-sdk.md) for the full API
reference.
