# Session: Release Readiness
Date: 2026-04-17

## Scope
SigOps-SDK slice of the cross-repo Release Readiness sprint.

## PRs merged
- #1 — `feat(publish): Sprint 1.2 — ESM-only publish-readiness for all @sigops/* packages` — squash-merged to main.

## What changed
All 6 packages flipped to ESM-only publish shape (mirrors cluster-shared Sprint 1.1):

| Package | Old name | New name | Notes |
|---|---|---|---|
| cli | `@sigops/cli` | `@sigops/dev-cli` | Renamed + bin `sigops` → `sigops-dev` to avoid collision with standalone `sigops-cli` |
| plugin-sdk | `@sigops/plugin-sdk` | (same) | |
| sel-tools | `@sigops/sel-tools` | (same) | |
| template-sdk | `@sigops/template-sdk` | (same) | |
| tool-sdk | `@sigops/tool-sdk` | (same) | |
| vscode-ext | `@sigops/vscode-ext` | (same) | Marked `private: true` — ships via VS Code Marketplace, not npm |

Per-package edits:
- `version`: 0.1.0 → 1.0.0
- `main`/`module` → `./dist/index.js` (was `./dist/index.cjs`, never existed on disk)
- `exports`: drop `require`, reorder to types-first, ESM-only
- Add `repository` field with `directory: packages/<name>`
- Add `publishConfig { registry: https://registry.npmjs.org, access: public }` (except vscode-ext which is private)

New `.github/workflows/publish.yml`:
- Triggers on `v*.*.*` tags + manual dispatch
- Uses `packageManager` as pnpm source of truth (no `version:` on `pnpm/action-setup`)
- Filters `!@sigops/vscode-ext` from publish command

## Release readiness
- [x] All 6 packages publishable (versions, repository, exports, files)
- [x] Publish workflow wired
- [x] CI exists (`ci.yml`)
- [ ] `NPM_TOKEN` secret configured in repo settings (Vivek)
- [ ] First `v1.0.0` tag — pending, Vivek to push

## CLAUDE.md drift flagged
HARD RULE #7 (“ESM + CJS Dual Build MANDATORY” using tsup) is now out of date — shipped code is ESM-only via plain `tsc`, matching cluster-shared's Sprint 1.1 decision. CLAUDE.md should be rewritten next session to mirror cluster-shared's rewrite of its HARD RULE #4. Out of scope this session.

## CLI-name collision decision
The `sigops` bin name is reserved by the standalone `sigops-cli` repo (user-facing operator tool). The SDK's dev tooling (scaffolding, validation, publish) was previously bidding for the same bin. Renamed to `@sigops/dev-cli` + `sigops-dev` to keep the two worlds distinct. Safe rename — package was never published.

## Next steps
1. Vivek adds `NPM_TOKEN` to repo secrets.
2. Vivek tags `v1.0.0` — publish.yml fires, 5 packages land on npm public.
3. Separately: package `@sigops/vscode-ext` via `vsce` and publish to VS Code Marketplace.
4. Follow-up: rewrite CLAUDE.md HARD RULE #7 (ESM-only supersedes dual build).
