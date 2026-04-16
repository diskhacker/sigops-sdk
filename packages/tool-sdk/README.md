# @sigops/tool-sdk

SDK for building SigOps automation tools.

A **tool** is a versioned, schema-validated, side-effectful unit of work
that the SigOps runtime can invoke from templates, alerts, scheduled jobs,
or manually. This package exports `defineTool`, a testing harness, a
mock context for unit tests, and every relevant type.

## Install

```bash
pnpm add @sigops/tool-sdk
```

Zod is re-exported as `z` — do not install it separately.

## Quickstart

```ts
import { defineTool, z } from '@sigops/tool-sdk';

export default defineTool({
  name: 'echo',
  description: 'Echoes input',
  input:  z.object({ message: z.string() }),
  output: z.object({ echoed: z.string() }),
  async execute(input, ctx) {
    ctx.logger.info(input.message);
    return { echoed: input.message };
  },
});
```

## Docs

Full guide: [docs/guides/tool-sdk.md](../../docs/guides/tool-sdk.md).
Runnable example: [examples/hello-tool](../../examples/hello-tool).

## License

MIT
