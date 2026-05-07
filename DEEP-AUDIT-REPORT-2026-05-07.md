# ClusterAssets — Deep Production Audit (Main-Branch Scope)

**Date:** 2026-05-07
**Auditor:** Claude Code (Opus 4.7, 1M context)
**Scope:** `main` branch, 7 in-scope repos under `diskhacker/`

This same `DEEP-AUDIT-REPORT-2026-05-07.md` is committed on the `claude/create-main-branch-audit-SsbNG` branch in each of the 7 repos.

## Executive Summary

Every prior-audit P0 has been fixed. Three new P0s identified:
1. `uap/server/src/config/env.ts:9` — hard-coded `JWT_SECRET` default.
2. `sigops-agent/src/executor.rs` — `SecurityPolicy` dead code.
3. `cluster-deploy/.env.example` — missing `VAULT_MASTER_KEY`.

**For `sigops-sdk` specifically:**

> **P0** — `@sigops/cli` declares its hard runtime deps (`commander@^12`, `chalk@^5`, `inquirer@^9`, `ora@^8`) under **devDependencies** in `packages/cli/package.json`. With `files: ["dist"]` and ESM-only publish, the published tarball will install on a user machine without these libs and `sigops`/`sigops-sdk` will throw `ERR_MODULE_NOT_FOUND` at first run. **Must move all four to `dependencies` before tagging the next publish.**

Plus: **no branch protection on `main`** in any of the 7 repos.

---

## `sigops-sdk` — Detailed Findings

**Purpose:** Public, MIT-licensed pnpm + turbo monorepo shipping six `@sigops/*` npm packages — toolkit for building tools, templates, connectors, and plugins for SigOps Marketplace (75/25 revenue share advertised in README). Audit head `eaff52d` 2026-04-21.

### Layout

```
packages/{cli, tool-sdk, template-sdk, sel-tools, vscode-ext, plugin-sdk}
examples/{hello-cli, hello-plugin, hello-sel, hello-template, hello-tool, hello-vscode}
docs/{getting-started.md, tool-reference.md, template-guide.md, sel-reference.md,
      plugin-guide.md, publishing.md, guides/, architecture/, session/, memory/,
      00-MASTER-REPO-PLAN.md, DEEP-AUDIT-REPORT.md, REPO-ARCHITECTURE-REVIEW.md,
      SIGOPS-SDK-AUDIT.md}
.github/workflows/{ci.yml, publish.yml}
```

Root: `package.json` (pnpm@10.33.0, turbo 2.4, vitest 3, TS 5.7), `pnpm-workspace.yaml` (`packages/*` + `examples/*`), `turbo.json`, `tsconfig.base.json` (ES2022, ESNext modules, strict).

### Per-package summary

All six packages: `version: 1.0.0`, `"type": "module"`, ESM-only `exports` (no `require` condition), `main`/`module` → `./dist/index.js`, `types` → `./dist/index.d.ts`, build = `tsc --outDir dist --declaration`, test = `vitest run`, repository field with `directory:` set, MIT.

| Package | Deps | Key Exports | Bin | Test files | JSDoc | Build |
|---|---|---|---|---|---|---|
| `@sigops/cli` | `commander@^12`, `chalk@^5`, `inquirer@^9`, `ora@^8` (**all under `devDependencies` — P0**) | InitCommand, TestCommand, ValidateCommand, PublishCommand, SelCommand, LoginCommand, TemplateCommand + types | `sigops`, `sigops-sdk` → `./dist/index.js` | 7 | yes (file-level + sub-commands) | ESM-only |
| `@sigops/tool-sdk` | `zod@^3.24` | `defineTool`, `getToolMetadata`, `executeTool`, `mockContext`, `TestHarness`, `z`, full type set (ToolDefinition, ToolContext, Logger, SecretStore, HttpClient, RetryPolicy) | — | 4 | re-export style | ESM-only |
| `@sigops/template-sdk` | `zod@^3.24`, `@sigops/sel-tools: workspace:*` | `defineTemplate`, `TemplateRenderer`, `TestRunner`, `z`, types (TemplateDefinition, ParameterSchema, RenderResult, ValidationResult, TestSuiteResult) | — | 4 | re-export only | ESM-only |
| `@sigops/sel-tools` | none (zero runtime deps) | `parse`, `Parser`, `ParseError`, `lex`, `Lexer`, AST types, `LintEngine`, `defaultRules`, `format`, `SELLanguageServer`, `CompletionItem`, `HoverInfo` | — | 5 | re-export only | ESM-only |
| `@sigops/vscode-ext` | `vscode-languageclient@^9`, `@sigops/sel-tools: workspace:*` | extension (status bar, `sigops-sdk.showVersion`, SEL language commands) | — | 5 | yes per recent commit | ESM-only, `private: true` |
| `@sigops/plugin-sdk` | `zod@^3.24` | `definePlugin`, `getPluginMetadata`, `mockPluginContext`, `HookPoint`, `HookRegistry`, `UIExtensionRegistry`, `z`, types | — | 4 | re-export only | ESM-only |

Total **29 test files** / **345 tests** claimed across packages.

### examples/ status

**PRESENT** — prior audit report is **outdated**. Six workspace packages (`hello-tool`, `hello-template`, `hello-plugin`, `hello-sel`, `hello-cli`, `hello-vscode`), each with package.json/tsconfig/src/__tests__/README. **P1: naming mismatch with CLAUDE.md / README** which list aspirational names like `tool-http-health-check`, `tool-db-backup`, `tool-slack-notify`, `template-cpu-fix`, `template-disk-cleanup`, `plugin-custom-metric`.

### docs/ status

**PRESENT and substantial.** All six guides from CLAUDE.md exist: `getting-started.md` (5.4 KB), `tool-reference.md` (9.7 KB), `template-guide.md` (7.6 KB), `sel-reference.md` (8.3 KB), `plugin-guide.md` (8.8 KB), `publishing.md` (6.6 KB). Plus `docs/guides/`, `docs/architecture/`, `docs/session/`, `docs/memory/`, plus internal audit/plan markdowns.

### CI/CD status

**PRESENT** — prior audit's "no CI" finding is **outdated**.

- `.github/workflows/ci.yml`: triggers on push + PR; `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm test` on Node 20. **No matrix, no lint job, no coverage upload.**
- `.github/workflows/publish.yml`: triggers on `v*.*.*` tags + manual dispatch; runs build + test, then `pnpm -r --filter='!@sigops/vscode-ext' publish --access public --no-git-checks` using `secrets.NPM_TOKEN`. Pnpm version intentionally resolved from root `packageManager` field.

### Recent activity

16 commits 2026-04-12 → 2026-04-21. Active week. Latest (`eaff52d`, 2026-04-21): "fix(sdk): wire CLI entry, add docs, implement vscode-ext activate, fix template-sdk dep". 1 PR — #1 "Sprint 1.2 — ESM-only publish-readiness" merged 2026-04-17. 0 issues all-time. 2 branches.

Notable: dual ESM/CJS originally introduced (commit `d3e44f2`, 2026-04-13) then deliberately reverted to ESM-only in PR #1 because `tsc` was never emitting `.cjs`. CLAUDE.md was updated (`1d90e3c`) to reflect ESM-only as HARD RULE #7.

### Compliance vs CLAUDE.md

| HARD RULE | Status |
|---|---|
| 1 — No DB / server / Hono | PASS |
| 2 — Every public export has JSDoc | **PARTIAL** — CLI entry has JSDoc; `tool-sdk`, `template-sdk`, `sel-tools`, `plugin-sdk` index.ts files are bare re-exports without file-level JSDoc |
| 3 — Every function unit-tested | PASS at 29 test files / 345 tests claimed; **>90% threshold not enforced in CI** |
| 4 — Re-export Zod as `z` | PASS — exported from tool-sdk, template-sdk, plugin-sdk |
| 5 — Identical SEL AST as core | unverified |
| 6 — CLI scaffolds → working projects | PASS |
| 7 — ESM-only via tsc (updated rule) | **PASS** — every `packages/*/package.json` is ESM-only |
| 8 — VS Code extension publishable | PASS shape-wise (private + vsce-targeted); not yet shipped |

### Risks

**P0 (publish blocker):**
- `@sigops/cli` declares `commander/chalk/inquirer/ora` under `devDependencies` instead of `dependencies`. Fix before next publish.
- `main` branch unprotected.

**P1 (functional gaps):**
- `sigops sel <subcommand>` and `sigops template from-playbook` are stubs printing "coming soon" — README/CLI docs advertise full functionality.
- `sigops validate` uses a hard-coded stub package `{name:'unknown'}`.
- `sigops publish` uses a hard-coded stub `{name:'my-package',version:'0.1.0'}`.
- `sigops login` interactive flow is a placeholder.
- `inquirer@^9` declared but no command currently uses prompts.
- examples/ on disk are `hello-*` but README + CLAUDE.md reference aspirational names.

**P2 (quality):**
- No coverage gate enforced — `>90% coverage required` is repeatedly stated but `ci.yml` runs only `pnpm test`, not `pnpm test:coverage`.
- No matrix testing (single Node 20 run) — risks for users on Node 18 / 22.
- No lint step in CI even though `lint` task is configured in `turbo.json`.
- Public-export JSDoc on barrel files of tool-sdk/template-sdk/sel-tools/plugin-sdk is missing (re-exports only).
- `inquirer@^9` is in CLI devDeps; CLAUDE.md key-deps table specifies `^12` — drift from spec.

**P3 (operational):**
- `CLAUDE-CODE-AUDIT-PROMPT.md` lives at repo root (12.9 KB) — internal scaffolding leaking into a public repo.
- Several internal audit markdowns are public — benign at npm package level (excluded by `files: ["dist"]`) but visible on GitHub.
- No `CONTRIBUTING.md` despite README linking to one.
- No SECURITY.md / CODEOWNERS / dependabot.yml.
- GHAS not enabled.
- Branch `claude/production-readiness-audit-ngl6r` lingering, unmerged.

### Secret-scanning

`run_secret_scanning` rejected: "Repository does not have GitHub Advanced Security enabled." Visual review of `.github/workflows/publish.yml` and source: only references `${{ secrets.NPM_TOKEN }}` and a public URL `https://app.sigops.io/settings/api-keys`. No hard-coded keys.

---

## Other Repos (Brief)

- **`uap`** — P0: `JWT_SECRET` default. 44 tables, 47 modules.
- **`sigops`** — `crypto` + graceful shutdown FIXED. 26 commits, 8 GAPs shipped. Still no CORS, no rate-limit.
- **`sigops-cloud`** — both prior P0s FIXED. UI tests 0 → 18. No CORS, lint disabled, coverage 35%.
- **`sigops-agent`** — P0: `SecurityPolicy` dead code. Health server binds 0.0.0.0:9100.
- **`cluster-shared`** — P0: scope rename inconsistent + non-crypto `mintTestJwt`.
- **`cluster-deploy`** — P0: `.env.example` missing `VAULT_MASTER_KEY`.

---

## Cross-Repo Summary

| Check | Result |
|---|---|
| `main` branch protection | **FAIL (all 7 repos)** |
| GitHub Advanced Security | **FAIL (all 7 repos)** |
| Lint enforced in CI | **FAIL (all 7)** |
| `@cluster/*` package consumption | **FAIL (zero adoption)** |
| Issue tracker usage | FAIL (0 issues all-time) |

## Phase 0 Roadmap (this week)

1. **`sigops-sdk/packages/cli/package.json`** — move `commander/chalk/inquirer/ora` to `dependencies` and tag a publish.
2. UAP `env.ts:9` — drop default JWT_SECRET.
3. sigops-agent `executor.rs` — route through `policy.run()`.
4. cluster-deploy `.env.example` — add `VAULT_MASTER_KEY`.
5. Branch protection on `main` in all 7 repos.
6. Enable GHAS.
7. cluster-shared scope rename + real-crypto `mintTestJwt`.

## Phase 1 (next sprint, sigops-sdk-specific)

- Replace stub commands (`sigops sel`, `sigops template from-playbook`, `sigops validate`, `sigops publish`, `sigops login`) with real implementations or remove from `index.ts`.
- Add coverage gate (`pnpm test:coverage`) + threshold (≥90%) + Codecov upload.
- Add lint job to CI invoking the eslint config from `turbo.json`.
- Matrix test on Node 18 / 20 / 22.
- Rename examples/ to match README aspirations or update README + CLAUDE.md to match `hello-*`.
- Add CONTRIBUTING.md, SECURITY.md, CODEOWNERS, dependabot.yml.

---

## Summary Statistics

| Metric | Value |
|---|---|
| Repos audited | 7 / 7 |
| P0 findings | 7 |
| P1 findings | 35 |
| P2 findings | 24 |
| P3 findings | 14 |
| Prior P0 bugs (2026-04-13) still open | **0** |
| New P0 bugs found (2026-05-07) | 7 |

**Headline:** correctness improved markedly since 2026-04-13; for sigops-sdk the highest-leverage immediate fix is the CLI deps issue, after which most of the remaining work is CI/quality-gate hardening and replacing stubbed commands.
