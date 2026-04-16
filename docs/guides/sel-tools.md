# SEL Tools Guide (`@sigops/sel-tools`)

`@sigops/sel-tools` is the canonical toolkit for the **SigOps Expression
Language** (SEL). SEL is the declarative language used by every SigOps
template and hand-authored workflow to describe monitors, alerts, and
actions.

This package is **pure TypeScript with no external runtime dependencies**
— the same parser, linter, formatter, and LSP run in the browser, in the
CLI, in the VS Code extension, and inside the SigOps runtime. That
guarantees a single source of truth for SEL semantics.

---

## Overview

```
source text ──lexer──▶ tokens ──parser──▶ AST (Program)
                                           │
                                           ├──▶ LintEngine + rules ──▶ diagnostics
                                           └──▶ formatter            ──▶ canonical text

AST ──▶ SELLanguageServer (completion / hover / diagnostics) ──▶ VS Code / Web IDE
```

Every layer is importable, so you can plug into whichever stage you need.

---

## Install

```bash
pnpm add @sigops/sel-tools
```

No peer dependencies.

---

## Quickstart

```ts
import { parse, LintEngine, defaultRules, format } from '@sigops/sel-tools';

const src = `monitor cpu_usage { threshold: 90 }
alert high_cpu { when: cpu_usage.breach }`;

const ast = parse(src);                             // Program
const engine = new LintEngine();
for (const r of defaultRules) engine.addRule(r);
const diags = engine.lint(ast);                     // LintDiagnostic[]
const pretty = format(src);                         // canonical string
```

---

## API reference

### Parser

```ts
import { parse, Parser, ParseError, lex, Lexer } from '@sigops/sel-tools';

const ast = parse(source);                          // convenience wrapper
// Equivalent to:
const p = new Parser(source);
const ast2 = p.parse();
```

- Throws `ParseError` (with `.loc: { line, column, offset }`) on syntax
  errors.
- `lex(source)` returns just the token stream if you need it (e.g. for a
  custom syntax highlighter).

### AST types

Exported from the package root (re-exported via `export * from
'./parser/ast.js'`):

- `Program` — root node, has `body: Statement[]`.
- `Statement` — `MonitorStatement | AlertStatement | ActionStatement`.
- `Property` — `{ key: Identifier, value: Expression }`.
- `Expression` — `Identifier | NumberLiteral | StringLiteral |
  BooleanLiteral | BinaryExpression | MemberExpression | CallExpression`.
- `Position`, `SourceLocation`.

Every node has a `loc: SourceLocation` for error reporting.

### Linter

```ts
import { LintEngine, defaultRules, type LintRule, type LintDiagnostic } from '@sigops/sel-tools';

const engine = new LintEngine();
for (const rule of defaultRules) engine.addRule(rule);

// Input can be a source string *or* a pre-parsed Program.
const diags: LintDiagnostic[] = engine.lint(someSourceOrAst);
```

Each diagnostic:

```ts
{ rule: string; message: string; severity: 'error' | 'warning' | 'info';
  loc: { start: Position; end: Position } }
```

Writing a custom rule:

```ts
const noEmptyBlocks: LintRule = {
  name: 'no-empty-blocks',
  description: 'Monitor/alert/action blocks must declare at least one property',
  severity: 'warning',
  check(program) {
    return program.body
      .filter((s) => s.body.length === 0)
      .map((s) => ({
        rule: 'no-empty-blocks',
        message: `${s.type} '${s.name.name}' has no body`,
        severity: 'warning',
        loc: s.loc,
      }));
  },
};
engine.addRule(noEmptyBlocks);
```

### Formatter

```ts
import { format, type FormatOptions } from '@sigops/sel-tools';

const out = format(source, { indentSize: 2, maxLineWidth: 100 });
```

The formatter is **semantics-preserving**: `parse(format(x))` produces the
same AST as `parse(x)` for every valid `x`.

### Language Server

```ts
import { SELLanguageServer } from '@sigops/sel-tools';

const ls = new SELLanguageServer();
ls.open('file.sel', source);
const completions = ls.complete('file.sel', { line: 3, column: 4 });
const hover       = ls.hover   ('file.sel', { line: 3, column: 4 });
const diagnostics = ls.diagnostics('file.sel');
```

The `@sigops/vscode-ext` package wraps this server with the VS Code LSP
client.

---

## Example — lint a `.sel` file in CI

```ts
import { readFileSync } from 'node:fs';
import { LintEngine, defaultRules } from '@sigops/sel-tools';

const engine = new LintEngine();
for (const r of defaultRules) engine.addRule(r);

const src = readFileSync(process.argv[2]!, 'utf8');
const diags = engine.lint(src);

for (const d of diags) {
  console.log(`${d.severity}: ${d.rule} @ ${d.loc.start.line}:${d.loc.start.column} — ${d.message}`);
}
process.exit(diags.some((d) => d.severity === 'error') ? 1 : 0);
```

Runnable example: [`examples/hello-sel`](../../examples/hello-sel).

---

## Default lint rules (selection)

| Rule | Severity | What it catches |
|---|---|---|
| `no-empty-block` | warning | Monitor/alert/action with no properties |
| `unique-names` | error | Two statements share a name |
| `known-keyword` | error | `every`, `threshold`, `when`, etc. misspelled |
| `valid-duration` | error | `every: 30` (missing unit) |
| `no-magic-number` | info | Numeric literal without context |

Run `engine.addRule(...)` to add your own.

---

## SEL grammar (informal)

```
Program     = Statement*
Statement   = MonitorStmt | AlertStmt | ActionStmt
MonitorStmt = 'monitor' Identifier Block
AlertStmt   = 'alert'   Identifier Block
ActionStmt  = 'action'  Identifier Block
Block       = '{' Property* '}'
Property    = Identifier ':' Expression
Expression  = Literal | Identifier | MemberExpr | BinaryExpr | CallExpr
Literal     = Number | String | Boolean
```

The full EBNF lives in `packages/sel-tools/src/parser/ast.ts` as TypeScript
discriminated unions — that file is the source of truth.
