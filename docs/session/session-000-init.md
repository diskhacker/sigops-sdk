# Session 000 — SigOps SDK Repository Initialization
## Date: 2026-04-12
## Product: SigOps SDK
## Repo: sigops-sdk (PUBLIC, MIT)

### Structure Created
- packages/cli/ (@sigops/cli)
- packages/tool-sdk/ (@sigops/tool-sdk)
- packages/template-sdk/ (@sigops/template-sdk)
- packages/sel-tools/ (@sigops/sel-tools)
- packages/vscode-ext/ (@sigops/vscode-ext)
- packages/plugin-sdk/ (@sigops/plugin-sdk)
- examples/ (6 example projects)
- docs/architecture/ (SDK Architecture + Developer Manual PDFs)

### Build Order
1. sel-tools (parser first)
2. tool-sdk (defineTool + TestHarness)
3. template-sdk (defineTemplate + renderer, uses sel-tools)
4. cli (init + test + validate + publish + sel commands)
5. plugin-sdk (definePlugin + HookPoint)
6. vscode-ext (wraps sel-tools LSP)
