# VS Code Extension Guide (`@sigops/vscode-ext`)

`@sigops/vscode-ext` is the official Visual Studio Code extension for
authoring SigOps Expression Language (`.sel`) files. It wires the
`SELLanguageServer` from `@sigops/sel-tools` into VS Code's Language
Server Protocol client, and ships a TextMate grammar for syntax
highlighting.

---

## Overview

Features you get after installing:

- **Syntax highlighting** for `.sel` files via a TextMate grammar.
- **Autocomplete** for keywords (`monitor`, `alert`, `action`, `when`,
  `every`, `threshold`, ...) and for identifiers already declared in the
  current file.
- **Hover docs** on SEL keywords and known properties.
- **Diagnostics**: red squiggles for parse errors, yellow for lint
  warnings, blue for info-level advice.
- **Format Document** command that calls `format()` from `sel-tools`.
- **Commands**: `SigOps: Parse current file`, `SigOps: Lint current file`,
  `SigOps: Open playground` (opens a scratch `.sel` buffer).

Everything is powered by the exact same code that runs in the CLI and the
runtime, so behaviour is identical across environments.

---

## Install

### From the VS Code Marketplace (recommended)

1. Open VS Code.
2. Open the Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for **SigOps SEL**.
4. Click **Install**.

### From a `.vsix` (source build)

From the repo root:

```bash
pnpm install
pnpm --filter @sigops/vscode-ext build
cd packages/vscode-ext
npx vsce package
```

The command produces `sigops-vscode-ext-<version>.vsix`. In VS Code:
Extensions panel → `...` menu → *Install from VSIX...* → pick the file.

---

## Quickstart

1. Install the extension.
2. Create a file `demo.sel`:

   ```sel
   monitor cpu_usage {
     check: "cpu.load"
     every: 30s
     threshold: 90
   }

   alert high_cpu when cpu_usage.breach {
     severity: high
     notify: "ops@example.com"
   }
   ```

3. Save. You should see keyword colouring and no diagnostics in the
   Problems panel.
4. Remove the closing `}` on the `alert` block — a red squiggle appears
   with `ParseError: expected '}' ...`.
5. Restore the `}`, run *Format Document* (`Shift+Alt+F`). Indentation
   snaps to the canonical 2-space style.

---

## API reference

The extension package exports a small surface for host integration:

```ts
import { activate, deactivate } from '@sigops/vscode-ext/extension';
// register commands
import { commands } from '@sigops/vscode-ext/commands';
// language client
import { createLanguageClient } from '@sigops/vscode-ext/language-client';
```

Most users never import these — they run inside VS Code. They're exported
so other editors (e.g. Eclipse Theia, Cursor) can reuse the command set.

### Contributed commands

| Command id | Title | Effect |
|---|---|---|
| `sigops.sel.parse` | SigOps: Parse current file | Show AST in output panel |
| `sigops.sel.lint` | SigOps: Lint current file | Push diagnostics for current buffer |
| `sigops.sel.format` | SigOps: Format Document | Replace buffer with `format()` output |
| `sigops.sel.playground` | SigOps: Open playground | Create a scratch `.sel` buffer |
| `sigops.sel.restart` | SigOps: Restart language server | Kill and respawn the LSP |

### Contributed configuration

| Key | Type | Default | Purpose |
|---|---|---|---|
| `sigops.sel.formatOnSave` | boolean | `true` | Run `format()` on save |
| `sigops.sel.lintRules` | string[] | `['*']` | Which rules to enable |
| `sigops.sel.serverPath` | string | `''` | Override LSP binary (for development) |
| `sigops.sel.trace.server` | `'off'\|'messages'\|'verbose'` | `'off'` | LSP traffic logging |

### Contributed grammar

- Scope name: `source.sel`.
- File extensions: `.sel`.
- Path: `packages/vscode-ext/syntaxes/sel.tmLanguage.json`.

---

## Example — sharing rules across the team

1. In your team's template repo, add a `sigops.sel.json`:

   ```json
   {
     "extends": "@sigops/sel-tools/default-rules",
     "rules": {
       "no-empty-block": "error",
       "no-magic-number": "warning"
     }
   }
   ```

2. The extension picks this up automatically from the workspace root.
3. Red squiggles now match CI lint output exactly.

Runnable companion example: [`examples/hello-vscode`](../../examples/hello-vscode).

---

## Troubleshooting

- **No highlighting**: ensure the file has a `.sel` extension. Run
  *Developer: Inspect Editor Tokens and Scopes* to confirm the scope is
  `source.sel`.
- **No diagnostics**: open the *Output* panel → *SigOps SEL Language
  Server*. If empty, run `SigOps: Restart language server`.
- **Format-on-save does nothing**: verify `sigops.sel.formatOnSave` is
  `true` and that no other extension has claimed the `.sel` formatter.
- **Slow on huge files**: the parser is O(n) but the default rule set
  walks the tree several times. Disable heavy rules via `lintRules` or
  raise `files.watcherExclude`.

---

## Publishing

The extension follows the standard Marketplace flow:

```bash
pnpm --filter @sigops/vscode-ext build
cd packages/vscode-ext
npx vsce login <publisher>
npx vsce publish
```

Every published version pins a specific `@sigops/sel-tools` release so that
users' editor behaviour is reproducible.
