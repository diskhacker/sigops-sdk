# Memory: Release Readiness

## Key facts for future sessions
- Packages ship ESM-only via plain `tsc`. No tsup. No `.cjs` emit.
- `@sigops/cli` renamed to `@sigops/dev-cli` with bin `sigops-dev`. The `sigops` bin belongs to the standalone `sigops-cli` repo.
- `@sigops/vscode-ext` is `private: true`. Publishes via `vsce` to VS Code Marketplace, not npm.
- Publish workflow expects `NPM_TOKEN` secret. Triggers on `v*.*.*` tags.
- All published packages under `@sigops/*` are PUBLIC on npmjs.com. No GitHub Packages for these — these are developer-facing, discoverability matters.

## CLAUDE.md drift
HARD RULE #7 still says “ESM + CJS Dual Build via tsup”. Code no longer matches. To be fixed next session.

## PRs merged this session
- https://github.com/diskhacker/sigops-sdk/pull/1
