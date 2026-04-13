# SigOps SDK

> Build tools, templates, connectors, and plugins for the SigOps ecosystem.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/badge/npm-%40sigops-orange.svg)](https://www.npmjs.com/org/sigops)

The SigOps SDK is the developer toolkit for extending SigOps with custom automation capabilities. Create tools that execute on infrastructure, templates that generate workflows from parameters, connectors that integrate external systems, and plugins that hook into the execution engine.

---

## Quick Reference

| | |
|---|---|
| **Visibility** | PUBLIC (MIT License) |
| **Type** | pnpm monorepo — 6 NPM packages |
| **No database** | This repo has NO server, NO PostgreSQL, NO Redis |
| **Install** | `npm install -g @sigops/cli` |
| **Marketplace** | Publish and sell on SigOps Marketplace (75/25 revenue share) |

---

## Packages

| Package | What It Does | Install |
|---------|-------------|---------|
| **@sigops/cli** | Scaffold, test, validate, publish, lint SEL | `npm install -g @sigops/cli` |
| **@sigops/tool-sdk** | `defineTool()` — create tools with typed I/O | `npm install @sigops/tool-sdk` |
| **@sigops/template-sdk** | `defineTemplate()` — parameterized .sel generators | `npm install @sigops/template-sdk` |
| **@sigops/sel-tools** | SEL parser, linter (10 rules), formatter, Language Server | `npm install @sigops/sel-tools` |
| **@sigops/vscode-ext** | VS Code extension — syntax, autocomplete, diagnostics | Install from VS Code Marketplace |
| **@sigops/plugin-sdk** | `definePlugin()` — hook into engine lifecycle | `npm install @sigops/plugin-sdk` |

---

## 5-Minute Quickstart

### Create a Tool

```bash
# Install CLI
npm install -g @sigops/cli

# Scaffold
sigops init tool my-health-check
cd my-health-check

# Edit src/index.ts
```

```typescript
import { defineTool, z } from "@sigops/tool-sdk";

export default defineTool({
  name: "my-org.health-check",
  version: "1.0.0",
  description: "Check HTTP endpoint health",

  input: z.object({
    url: z.string().url(),
    expectedStatus: z.number().default(200),
  }),

  output: z.object({
    healthy: z.boolean(),
    statusCode: z.number(),
    responseTimeMs: z.number(),
  }),

  async execute(input, ctx) {
    const start = Date.now();
    const res = await fetch(input.url);
    return {
      healthy: res.status === input.expectedStatus,
      statusCode: res.status,
      responseTimeMs: Date.now() - start,
    };
  },
});
```

```bash
# Test locally (no SigOps engine needed)
sigops test --input '{"url":"https://example.com"}'

# Validate before publishing
sigops validate

# Publish to marketplace
sigops login
sigops publish
```

### Create a Template

```bash
sigops init template cpu-alert-fix
cd cpu-alert-fix
```

```typescript
import { defineTemplate, z } from "@sigops/template-sdk";

export default defineTemplate({
  name: "my-org.cpu-alert-fix",
  version: "1.0.0",
  description: "Auto-fix high CPU by restarting the service",
  category: "infrastructure",

  parameters: z.object({
    serviceName: z.string().describe("Service to monitor"),
    cpuThreshold: z.number().default(90).describe("CPU % threshold"),
    restartMethod: z.enum(["systemctl", "docker", "pm2"]).default("systemctl"),
    notifySlack: z.string().optional().describe("Slack channel"),
  }),

  render(params) {
    return `
signal match source="prometheus" severity>=warning
  title~="${params.serviceName}.*cpu" {
  when metric.cpu_percent > ${params.cpuThreshold} for 5m {
    step restart {
      tool: "sigops.restart"
      input: { service: "${params.serviceName}", method: "${params.restartMethod}" }
    }
    step verify { tool: "sigops.wait", input: { seconds: 30 } }
  }
}`;
  },
});
```

```bash
# Test template rendering
sigops test --params '{"serviceName":"nginx","cpuThreshold":85}'

# Publish
sigops publish
```

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `sigops init tool <name>` | Scaffold new tool project |
| `sigops init template <name>` | Scaffold new template project |
| `sigops init plugin <name>` | Scaffold new plugin project |
| `sigops init connector <name>` | Scaffold new connector project |
| `sigops test` | Run tool/template locally with mock context |
| `sigops test --input '{...}'` | Test tool with specific input |
| `sigops test --params '{...}'` | Test template with specific parameters |
| `sigops validate` | Full validation pipeline (schema, types, tests, security) |
| `sigops publish` | Publish to SigOps Marketplace |
| `sigops sel lint <file.sel>` | Lint a .sel file |
| `sigops sel fmt <file.sel>` | Format a .sel file |
| `sigops sel parse <file.sel>` | Parse and print AST |
| `sigops login` | Authenticate with API key |
| `sigops whoami` | Show authenticated identity |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | 5-minute first tool tutorial |
| [Tool Reference](docs/tool-reference.md) | Complete tool API (defineTool, ToolContext) |
| [Template Guide](docs/template-guide.md) | Templates, parameters, composition, playbook conversion |
| [SEL Reference](docs/sel-reference.md) | SEL language specification |
| [Plugin Guide](docs/plugin-guide.md) | Plugin hooks, UI extensions |
| [Publishing Guide](docs/publishing.md) | Validation, review, pricing, revenue share |
| [SDK Architecture](docs/architecture/SigOps-SDK-Architecture-v1.0.0.pdf) | Full architectural specification |
| [Developer Manual](docs/architecture/SigOps-SDK-Developer-Manual-v1.0.0.pdf) | Complete developer manual |

---

## Repository Structure

```
sigops-sdk/
├── packages/
│   ├── cli/              # @sigops/cli
│   ├── tool-sdk/         # @sigops/tool-sdk
│   ├── template-sdk/     # @sigops/template-sdk
│   ├── sel-tools/        # @sigops/sel-tools (parser, linter, formatter, LSP)
│   ├── vscode-ext/       # @sigops/vscode-ext
│   └── plugin-sdk/       # @sigops/plugin-sdk
├── examples/
│   ├── tool-http-health-check/
│   ├── tool-db-backup/
│   ├── tool-slack-notify/
│   ├── template-cpu-fix/
│   ├── template-disk-cleanup/
│   └── plugin-custom-metric/
├── docs/
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Development

```bash
# Clone
git clone https://github.com/<your-org>/sigops-sdk.git
cd sigops-sdk

# Install
pnpm install

# Build all packages
pnpm build

# Test all packages
pnpm test

# Test with coverage (>90% required)
pnpm test:coverage
```

### Build Order

```
1. sel-tools      ← Parser first (everything depends on it)
2. tool-sdk       ← defineTool + TestHarness
3. template-sdk   ← defineTemplate + renderer (uses sel-tools)
4. cli            ← init + test + validate + publish + sel commands
5. plugin-sdk     ← definePlugin + HookPoint
6. vscode-ext     ← Extension wrapping sel-tools LSP
```

---

## Marketplace

Publish your tools, templates, connectors, and plugins to the SigOps Marketplace:

| Pricing Model | Best For | Example |
|--------------|----------|---------|
| Free | Adoption, brand building | HTTP health check |
| One-time ($5-50) | Standalone tools | Database backup |
| Monthly ($10-100) | Connectors, ongoing value | SAP connector |
| Per-execution ($0.01-1) | High-volume tools | AI log analysis |

**Revenue share:** Creator 75% / SigOps 25%. Monthly payouts via Stripe.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md).

1. Fork the repo
2. Create a feature branch
3. Write tests (>90% coverage required)
4. Submit a PR

---

## License

MIT — see [LICENSE](LICENSE)

---
