# @sigops/sel-tools

Parser, linter, formatter, and Language Server Protocol implementation for
the **SigOps Expression Language** (SEL). Pure TypeScript with no external
runtime dependencies — the same code runs in the browser, the CLI, the
VS Code extension, and the SigOps runtime.

## Install

```bash
pnpm add @sigops/sel-tools
```

## Quickstart

```ts
import { parse, LintEngine, defaultRules, format } from '@sigops/sel-tools';

const src = 'monitor cpu { threshold: 90 }';
const ast = parse(src);

const engine = new LintEngine();
for (const r of defaultRules) engine.addRule(r);
const diagnostics = engine.lint(ast);

const pretty = format(src);
```

## Docs

Full guide: [docs/guides/sel-tools.md](../../docs/guides/sel-tools.md).
Runnable example: [examples/hello-sel](../../examples/hello-sel).

## License

MIT
