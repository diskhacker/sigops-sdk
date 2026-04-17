# Session: Final Audit Fixes
Date: 2026-04-17
Type: Targeted blocker fixes only

## Fixes applied this session

### Blocker 4 — CLAUDE.md corrected
- HARD RULE #7 section rewritten: was "ESM + CJS dual build via tsup" → now "ESM-only via tsc"
- Removed tsup from build toolchain description; removed dual-format verification steps
- Updated exports template: removed `require` condition and `main` CJS path
- HARD RULES list #7 updated to match new section
- CJS dual-build noted as aspirational for v0.2.0

## Why this matters
The actual packages/tool-sdk/package.json has ESM-only exports (no `require` condition).
Shipping based on the old HARD RULE would have introduced a tsup dependency and build
pipeline mismatch against the actual published code.

## Outstanding issues
- No npm publish yet — packages not yet on npmjs.com under @sigops/* scope
- ESLint 9 migration pending
- VS Code extension not yet submitted to VS Code Marketplace
