# SigOps SDK — Developer Toolkit

> 6 NPM packages for building tools, templates, connectors, and plugins for SigOps.

## Product Identity

| Key | Value |
|-----|-------|
| Repo | `sigops-sdk` |
| Visibility | PUBLIC (MIT License) |
| Packages | 6 under @sigops/* scope |
| Type | pnpm monorepo (NO database, NO server) |
| Consumers | Third-party developers, DevOps engineers, MSPs |

## Architecture Reference
See `docs/architecture/SigOps-SDK-Architecture-v1.0.0.pdf`
See `docs/architecture/SigOps-SDK-Developer-Manual-v1.0.0.pdf`

## PROTOCOLS — MANDATORY
```
AUDIT → REVIEW → CONFIRM → REUSE → IMPLEMENT
Feature = Code + Tests (>90%). Every export must have test + JSDoc.
Session: /docs/session/ | Memory: /docs/memory/memory.md
```

## What This Repo Contains (NO database, NO server, NO UI)

This is a pure NPM package monorepo. No Hono server. No PostgreSQL. No React UI.
It produces 6 publishable NPM packages that developers install and import.

## Repo Structure

```
sigops-sdk/
├── CLAUDE.md                    ← This file
├── pnpm-workspace.yaml
├── turbo.json
├── package.json                 ← Root (workspace scripts)
├── tsconfig.base.json           ← Shared TS config
├── packages/
│   ├── cli/                     ← @sigops/cli (global CLI tool)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts         ← CLI entry (commander.js)
│   │   │   ├── commands/
│   │   │   │   ├── init.ts      ← sigops init tool|template|plugin|connector
│   │   │   │   ├── test.ts      ← sigops test --input|--params
│   │   │   │   ├── validate.ts  ← sigops validate (full pipeline)
│   │   │   │   ├── publish.ts   ← sigops publish [--private]
│   │   │   │   ├── sel.ts       ← sigops sel lint|fmt|parse|playground
│   │   │   │   ├── login.ts     ← sigops login (API key auth)
│   │   │   │   └── template.ts  ← sigops template from-playbook
│   │   │   ├── scaffolds/       ← Template files for init command
│   │   │   │   ├── tool/
│   │   │   │   ├── template/
│   │   │   │   ├── plugin/
│   │   │   │   └── connector/
│   │   │   └── utils/
│   │   └── __tests__/
│   │
│   ├── tool-sdk/                ← @sigops/tool-sdk
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts         ← Public exports: defineTool, z, types
│   │   │   ├── define-tool.ts   ← defineTool() factory
│   │   │   ├── context.ts       ← ToolContext interface + mockContext()
│   │   │   ├── harness.ts       ← TestHarness class
│   │   │   └── types.ts         ← ToolDefinition, InputSchema, OutputSchema
│   │   └── __tests__/
│   │
│   ├── template-sdk/            ← @sigops/template-sdk
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts         ← Public exports: defineTemplate, z, types
│   │   │   ├── define-template.ts ← defineTemplate() factory
│   │   │   ├── renderer.ts      ← TemplateRenderer (params → .sel)
│   │   │   ├── test-runner.ts   ← TestRunner (multi-param validation)
│   │   │   └── types.ts         ← TemplateDefinition, ParameterSchema
│   │   └── __tests__/
│   │
│   ├── sel-tools/               ← @sigops/sel-tools
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts         ← Public exports
│   │   │   ├── parser/          ← SEL parser (.sel → AST)
│   │   │   │   ├── lexer.ts
│   │   │   │   ├── parser.ts
│   │   │   │   └── ast.ts       ← AST node types
│   │   │   ├── linter/          ← Static analysis
│   │   │   │   ├── engine.ts
│   │   │   │   └── rules/       ← 10+ lint rules
│   │   │   ├── formatter/       ← Auto-format .sel
│   │   │   └── lsp/             ← Language Server Protocol
│   │   │       ├── server.ts
│   │   │       ├── completion.ts
│   │   │       ├── diagnostics.ts
│   │   │       └── hover.ts
│   │   └── __tests__/
│   │
│   ├── vscode-ext/              ← @sigops/vscode-ext
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── extension.ts     ← VS Code extension entry
│   │   │   ├── language-client.ts
│   │   │   └── commands.ts
│   │   ├── syntaxes/
│   │   │   └── sel.tmLanguage.json ← TextMate grammar for .sel
│   │   └── __tests__/
│   │
│   └── plugin-sdk/              ← @sigops/plugin-sdk
│       ├── package.json
│       ├── src/
│       │   ├── index.ts         ← Public exports: definePlugin, HookPoint
│       │   ├── define-plugin.ts
│       │   ├── hooks.ts         ← HookPoint enum + HookRegistry
│       │   ├── ui-extension.ts  ← UIExtensionPoint
│       │   └── types.ts
│       └── __tests__/
│
├── examples/
│   ├── tool-http-health-check/
│   ├── tool-db-backup/
│   ├── tool-slack-notify/
│   ├── template-cpu-fix/
│   ├── template-disk-cleanup/
│   └── plugin-custom-metric/
│
└── docs/
    ├── architecture/
    ├── session/
    ├── memory/
    ├── getting-started.md
    ├── tool-reference.md
    ├── template-guide.md
    ├── sel-reference.md
    ├── plugin-guide.md
    └── publishing.md
```

## Build Order

```
1. sel-tools     ← Parser first (everything depends on it)
2. tool-sdk      ← defineTool + TestHarness + mockContext
3. template-sdk  ← defineTemplate + renderer (uses sel-tools for validation)
4. cli           ← init + test + validate + publish + sel commands
5. plugin-sdk    ← definePlugin + HookPoint (after sigops-cloud hook system exists)
6. vscode-ext    ← Extension wrapping sel-tools LSP
```

## Key Dependencies

```json
{
  "cli": { "commander": "^12", "inquirer": "^12", "chalk": "^5", "ora": "^8" },
  "tool-sdk": { "zod": "^3.24" },
  "template-sdk": { "zod": "^3.24", "@sigops/sel-tools": "workspace:*" },
  "sel-tools": { "(no external deps — pure TypeScript parser)" },
  "vscode-ext": { "vscode-languageclient": "^9", "@sigops/sel-tools": "workspace:*" },
  "plugin-sdk": { "zod": "^3.24" }
}
```

## Testing

```bash
# Root: run all package tests
pnpm test

# Per-package
cd packages/tool-sdk && pnpm test
cd packages/sel-tools && pnpm test

# Coverage (>90% required per package)
pnpm test:coverage
```

Test patterns:
- tool-sdk: test defineTool() creates valid tool, test mockContext(), test TestHarness runs tool
- template-sdk: test defineTemplate() creates valid template, test renderer output is valid .sel
- sel-tools: test parser on valid + invalid .sel, test each linter rule, test formatter preserves semantics
- cli: test each command with mock filesystem + mock API
- plugin-sdk: test definePlugin() creates valid plugin, test hook registration

## Publishing

```bash
# Build all packages
pnpm build

# Version (using changesets)
pnpm changeset
pnpm changeset version

# Publish to npm
pnpm publish -r --access public
```

---

## HARD RULE #7: ESM-Only Build via tsc (CURRENT REALITY)

Every package ships **ESM-only** using `tsc` (not tsup, no CJS format). The `require` condition is not present in current package exports.

```json
// Each packages/*/package.json (current):
{
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Verify build:**
```bash
# After build, ESM file and types must exist:
ls packages/tool-sdk/dist/index.js    # ESM
ls packages/tool-sdk/dist/index.d.ts  # Types

# Test ESM import:
node --input-type=module -e "import { defineTool } from './packages/tool-sdk/dist/index.js'; console.log(typeof defineTool)"
```

CJS dual-build (tsup) is aspirational — add it in v0.2.0 if consumer demand requires it.

---

## Examples (6 Working Projects — MUST CREATE)

Each example is a complete, runnable project that demonstrates an SDK feature:

### examples/tool-http-health-check/
```
├── package.json        { "dependencies": { "@sigops/tool-sdk": "workspace:*" } }
├── sigops.config.json  { "name": "example.http-health-check", "type": "tool" }
├── src/index.ts        defineTool({ name, input, output, execute })
├── test/index.test.ts  Test with mockContext
└── README.md           What it does, how to use
```

### examples/tool-db-backup/
```
├── src/index.ts        Backup PostgreSQL to S3 (uses ctx.secrets for credentials)
├── test/index.test.ts
└── README.md
```

### examples/tool-slack-notify/
```
├── src/index.ts        Send Slack message via webhook (uses ctx.secrets)
├── test/index.test.ts
└── README.md
```

### examples/template-cpu-fix/
```
├── package.json        { "dependencies": { "@sigops/template-sdk": "workspace:*" } }
├── sigops.config.json  { "name": "example.cpu-fix", "type": "template" }
├── src/index.ts        defineTemplate({ parameters, render })
├── test/index.test.ts  Test with multiple parameter sets
└── README.md
```

### examples/template-disk-cleanup/
```
├── src/index.ts        Template for disk space alerts → cleanup → verify
├── test/index.test.ts
└── README.md
```

### examples/plugin-custom-metric/
```
├── package.json        { "dependencies": { "@sigops/plugin-sdk": "workspace:*" } }
├── sigops.config.json  { "name": "example.custom-metric", "type": "plugin" }
├── src/index.ts        definePlugin({ hooks: { AFTER_STEP: emitMetric } })
├── test/index.test.ts
└── README.md
```

Every example MUST:
- Build successfully with `pnpm build`
- Pass tests with `pnpm test`
- Pass validation with `sigops validate`
- Be referenced in the root README.md

---

## Documentation (6 Markdown Files — MUST CREATE)

### docs/getting-started.md
Content: Install CLI → scaffold tool → edit → test → validate → publish. 5-minute tutorial.
Include: code blocks for every step, expected output, troubleshooting.

### docs/tool-reference.md
Content: Full API reference for @sigops/tool-sdk.
Include: defineTool() signature, ToolDefinition interface, ToolContext (every property explained), InputSchema/OutputSchema patterns, TestHarness API, mockContext() API, error handling, timeout behavior, retry policy, rollback pattern.

### docs/template-guide.md
Content: Template development from scratch.
Include: defineTemplate() signature, ParameterSchema → UI form mapping, render() function patterns, template composition, playbook-to-template conversion, testing with multiple parameter sets, publishing templates.

### docs/sel-reference.md
Content: SEL language specification.
Include: Signal matching syntax, step definitions, conditions (when/otherwise), retry/rollback, variables, parallel execution, comments, complete grammar (EBNF), example .sel files for common patterns.

### docs/plugin-guide.md
Content: Plugin development guide.
Include: definePlugin() signature, HookPoint enum (all 8 hooks with when they fire), UIExtensionPoint locations, PluginContext API, plugin config access, plugin lifecycle, testing plugins in isolation.

### docs/publishing.md
Content: How to publish to SigOps Marketplace.
Include: sigops.config.json format, validation pipeline (10 checks), review process (private/public free/public paid), pricing models (5 types), revenue share (75/25), creator dashboard features, version management, unpublishing.

---

## HARD RULES

1. NO database, NO server, NO Hono — this is a pure NPM package repo
2. Every public export must have JSDoc documentation
3. Every function must have unit tests
4. Re-export Zod as `z` from tool-sdk and template-sdk (users don't install zod separately)
5. SEL parser must produce IDENTICAL AST as sigops core parser (shared code, extracted)
6. CLI scaffolds must produce WORKING projects (test the generated output)
7. All packages build to ESM-only via tsc (no CJS — see HARD RULE #7 section above)
8. VS Code extension must be publishable to VS Code Marketplace
