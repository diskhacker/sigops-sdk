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

## HARD RULES

1. NO database, NO server, NO Hono — this is a pure NPM package repo
2. Every public export must have JSDoc documentation
3. Every function must have unit tests
4. Re-export Zod as `z` from tool-sdk and template-sdk (users don't install zod separately)
5. SEL parser must produce IDENTICAL AST as sigops core parser (shared code, extracted)
6. CLI scaffolds must produce WORKING projects (test the generated output)
7. All packages must build to ESM + CJS (dual format for compatibility)
8. VS Code extension must be publishable to VS Code Marketplace
