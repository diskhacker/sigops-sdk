# @sigops/vscode-ext

Official Visual Studio Code extension for SigOps Expression Language
(`.sel`) files. Syntax highlighting, autocomplete, hover docs,
diagnostics, and format-on-save — all powered by `@sigops/sel-tools`.

## Install

From the VS Code Marketplace: search for **SigOps SEL** and click
*Install*.

From source:

```bash
pnpm install
pnpm --filter @sigops/vscode-ext build
cd packages/vscode-ext
npx vsce package
# In VS Code: Extensions panel -> ... -> Install from VSIX
```

## Features

- Syntax highlighting (TextMate grammar at
  `syntaxes/sel.tmLanguage.json`).
- LSP-backed autocomplete, hover, and diagnostics via
  `SELLanguageServer` from `@sigops/sel-tools`.
- Formatter on save using the canonical `format()` implementation.
- Commands: parse, lint, format, open playground, restart server.

## Docs

Full guide: [docs/guides/vscode-ext.md](../../docs/guides/vscode-ext.md).
Installation companion: [examples/hello-vscode](../../examples/hello-vscode).

## License

MIT
