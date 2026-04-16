# CLI Guide (`@sigops/cli`)

`@sigops/cli` ships the `sigops` command — the one-stop developer tool for
scaffolding, testing, validating, and publishing SigOps tools, templates,
plugins, and connectors.

Every command is also exported as a class (e.g. `InitCommand`,
`ValidateCommand`) so you can embed the CLI's behaviour in your own
programs without shelling out.

---

## Overview

```
sigops init      <name> --type tool|template|plugin|connector
sigops test      --input '<json>' [--params '<json>']
sigops validate
sigops publish   [--access public|private]
sigops sel       lint|fmt|parse|playground <file>
sigops login     [--token <api-key>]
sigops template  from-playbook <playbook.yaml>
```

All commands exit with code `0` on success and non-zero on failure; stdout
is machine-readable JSON when `--json` is passed, human-readable otherwise.

---

## Install

```bash
pnpm add -g @sigops/cli   # or: npm install -g @sigops/cli
sigops --help
```

For CI / monorepos you can also install per-project and run via the
package manager:

```bash
pnpm add -D @sigops/cli
pnpm exec sigops validate
```

---

## Quickstart

```bash
sigops init hello-tool --type tool
cd hello-tool
pnpm install
pnpm test
sigops test --input '{"message":"hi"}'
sigops validate
sigops publish --access public
```

---

## Command reference

### `sigops init`

```
sigops init <name> --type <tool|template|plugin|connector> [options]
  --description <text>
  --author      <name>
```

Scaffolds a fresh project directory with `package.json`, `tsconfig.json`,
`src/index.ts`, `__tests__/index.test.ts`, and `README.md`. Project names
must be lowercase, no spaces, and limited to `a-z 0-9 - . _ @ /`.

Programmatic equivalent:

```ts
import { InitCommand } from '@sigops/cli';
const result = new InitCommand().generateScaffold({ name: 'x', type: 'tool' });
```

`generateScaffold` is a pure function — it returns a list of
`{ path, content }` entries and does not touch the filesystem.

### `sigops test`

```
sigops test [--input <json>] [--params <json>] [--fixture <path>]
```

Runs the current project's tool (`--input`) or renders its template
(`--params`) once and prints the result. Uses `mockContext` under the hood
so secrets/HTTP can be stubbed via a fixture file.

```ts
import { TestCommand } from '@sigops/cli';
const res = await new TestCommand().run({ input: { message: 'hi' } });
```

### `sigops validate`

Runs the full pre-publish pipeline (schema checks, lint, tests, SEL
syntax validation for templates, bundle size check).

```ts
import { ValidateCommand } from '@sigops/cli';
const res = await new ValidateCommand().run({ cwd: process.cwd() });
if (!res.valid) console.error(res.errors);
```

### `sigops publish`

```
sigops publish [--access public|private] [--dry-run]
```

Runs `validate` first, then uploads the package to the SigOps Marketplace.
`--dry-run` prints what *would* be uploaded without making an API call.

### `sigops sel`

Operates on `.sel` files:

```
sigops sel lint       <file>     # LintEngine + defaultRules
sigops sel fmt        <file>     # rewrite in place with format()
sigops sel parse      <file>     # print the AST as JSON
sigops sel playground           # interactive REPL
```

### `sigops login`

Stores an API key in `~/.sigops/credentials.json`. Supports interactive and
non-interactive (`--token`) flows.

### `sigops template from-playbook`

Converts a YAML runbook into a `defineTemplate(...)` scaffold, mapping
free-text steps to parameters and SEL blocks.

---

## Example — CI pipeline

```yaml
# .github/workflows/sigops.yml
name: sigops
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm exec sigops validate
      - run: pnpm exec sigops test --input '{"message":"hi"}'
```

Runnable example: [`examples/hello-cli`](../../examples/hello-cli).

---

## Programmatic API

Every subcommand is exported as a class:

- `InitCommand` — `generateScaffold({ name, type, description?, author? })`
- `TestCommand` — `.run({ input?, params?, fixture? })`
- `ValidateCommand` — `.run({ cwd })`
- `PublishCommand` — `.run({ access, dryRun })`
- `SelCommand` — `.lint(file)`, `.format(file)`, `.parse(file)`
- `LoginCommand` — `.run({ token? })`
- `TemplateCommand` — `.fromPlaybook(path)`

All commands are side-effect-minimal and suitable for embedding in
editors, web IDEs, and automation.

---

## Configuration

The CLI reads `~/.sigops/config.json` for global settings (registry URL,
default author) and the per-project `sigops.config.json` for project
metadata (name, type, version, tags, pricing for marketplace entries).

```json
{
  "name": "example.cpu-fix",
  "type": "template",
  "version": "0.1.0",
  "tags": ["cpu", "remediation"],
  "access": "public"
}
```

`sigops init` creates this file for you.
