# hello-sel

A minimal [@sigops/sel-tools](../../packages/sel-tools) example: parses,
lints, and formats a SigOps Expression Language (SEL) program.

## What this example shows

SEL is the declarative language SigOps uses to describe monitors, alerts,
and remediation actions. The `@sigops/sel-tools` package is the full
toolkit for working with `.sel` sources:

1. `parse(source)` — produces a typed AST (`Program` with `body: Statement[]`).
2. `LintEngine` + `defaultRules` — run static analysis over the AST.
3. `format(source)` — canonical pretty-printer.
4. `SELLanguageServer` — a Language Server Protocol implementation (used by
   the VS Code extension).

This example exposes a single function `runHelloSel(source)` that chains
`parse -> lint -> format` and returns everything in one object.

## Install & build

From the repo root:

```bash
pnpm install
pnpm --filter @sigops-examples/hello-sel build
```

## Use it

```ts
import { runHelloSel, SAMPLE_SEL } from '@sigops-examples/hello-sel';

const result = runHelloSel(SAMPLE_SEL);
console.log('AST root:', result.astType);            // 'Program'
console.log('Statements:', result.statementCount);    // 2
console.log('Diagnostics:', result.diagnostics);      // []
console.log('Formatted:\n' + result.formatted);
```

## The SEL source being analysed

```sel
monitor cpu_usage { threshold: 90 }
alert high_cpu { when: cpu_usage.breach }
```

The parser turns this into a `Program` with two statements: a
`MonitorStatement` and an `AlertStatement`. The lint engine walks the AST
and reports any issues found by the rules registered via `defaultRules`.
The formatter re-emits the source in canonical style.

## Next steps

- Write a custom `LintRule` (name, description, severity, `check(program)`).
- Use the parser's AST to generate documentation from SEL files.
- Wire `SELLanguageServer` into any LSP-compatible editor — see the
  `hello-vscode` example for how the VS Code extension does it.

Full reference: [docs/guides/sel-tools.md](../../docs/guides/sel-tools.md).
