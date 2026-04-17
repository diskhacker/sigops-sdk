# Memory: Final Audit Fixes 2026-04-17

## Status
partial — CLAUDE.md corrected; packages not yet published

## Key facts for next session
- Build: ESM-only via tsc (NOT tsup, NO CJS format) — this matches actual package.json exports
- Exports: `import` condition only; no `require` condition in any package
- Packages: @sigops/tool-sdk, template-sdk, sel-tools, cli, plugin-sdk, vscode-ext
- Registry: npmjs.com under @sigops/* (NOT GitHub Packages — that's @cluster/*)
- Published: never — no npm publish has run
- HARD RULE #7: ESM-only is current reality; CJS dual-build is aspirational v0.2.0
- Next action: Once v0.1.0 is tagged, publish via `pnpm publish -r --access public`
