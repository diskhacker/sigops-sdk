# Memory: Final Audit 2026-04-17 (Pass 2)

## Status
ready — v1.0.0 tagged; publish.yml should have fired

## Version
1.0.0 all packages; Tag: v1.0.0 at SHA 1d90e3c (main HEAD is 2d12fd3 — 1 commit ahead)

## Key facts for next session
- CI: green — no version pin on pnpm/action-setup in ci.yml or publish.yml
- Tests: 325 total (cli:48, plugin-sdk:42, sel-tools:85, template-sdk:42, tool-sdk:72, vscode-ext:36)
- Build: ESM-only via tsc — all packages have import-only exports (no require condition)
- Registry: npmjs.com under @sigops/* scope (publish.yml excludes vscode-ext)
- NPM_TOKEN: must be set in GitHub repo secrets for publish to work
- Architecture: SigOps-SDK-Architecture-v1.0.0.pdf + Developer-Manual present ✅
- vscode-ext: not published to VS Code Marketplace (aspirational)
- Open debt: 1 stale branch, vscode-ext marketplace publish
