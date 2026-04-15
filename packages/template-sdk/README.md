# @sigops/template-sdk

SDK for building SigOps workflow templates — parameterised generators that
turn a form's worth of input into a valid SEL program.

## Install

```bash
pnpm add @sigops/template-sdk
```

`z` (Zod) is re-exported. `@sigops/sel-tools` is a transitive dependency
used to validate rendered output.

## Quickstart

```ts
import { defineTemplate, z } from '@sigops/template-sdk';

export default defineTemplate({
  name: 'cpu-fix',
  description: 'Monitor CPU and alert ops',
  category: 'remediation',
  params: z.object({ host: z.string(), threshold: z.number().default(90) }),
  render(p) {
    return `monitor "cpu-${p.host}" { threshold: ${p.threshold} }`;
  },
});
```

## Docs

Full guide: [docs/guides/template-sdk.md](../../docs/guides/template-sdk.md).
Runnable example: [examples/hello-template](../../examples/hello-template).

## License

MIT
