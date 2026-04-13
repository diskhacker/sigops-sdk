# SigOps — Corrected Repository Audit

## Problem

The original SigOps architecture (v1.0.0) defined 53 features + 6 plugins.
The current repo plan (3 repos: sigops, sigops-cloud, sigops-agent) is MISSING
the entire developer ecosystem layer: Tool SDK, Template SDK, SEL Tooling,
and Publishing Pipeline.

Without these, third-party developers CANNOT create tools for the marketplace.
No tools = no marketplace = no ecosystem = no network effect.

---

## Corrected Repo Plan: 4 Repos (was 3)

```
┌──────────────────────────────────────────────────────────────────┐
│                    SigOps Ecosystem (4 repos)                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ sigops (PUBLIC — MIT)                                       │ │
│  │ The core engine. Server + UI.                               │ │
│  │                                                             │ │
│  │ server/modules/                                             │ │
│  │ ├── signals/         Signal ingestion + rules               │ │
│  │ ├── sel-engine/      SEL parser, evaluator, runtime         │ │
│  │ ├── execution/       Closed-loop execution engine           │ │
│  │ ├── agents/          Agent WebSocket gateway                │ │
│  │ ├── tools/           Tool registry + built-in tools (5)     │ │
│  │ ├── workflows/       Workflow CRUD + scheduler              │ │
│  │ ├── audit/           Audit trail (basic, 30 days)           │ │
│  │ └── dashboard/       Stats API                              │ │
│  │                                                             │ │
│  │ ui/pages/                                                   │ │
│  │ ├── Signals/         Signal list + detail                   │ │
│  │ ├── Executions/      Execution viewer + steps               │ │
│  │ ├── Workflows/       Workflow editor + FlowBuilder (basic)  │ │
│  │ ├── Agents/          Agent management                       │ │
│  │ ├── Tools/           Tool browser + test                    │ │
│  │ └── SELPlayground/   In-browser SEL editor                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ▲                                   │
│                              │ extends                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ sigops-cloud (PRIVATE — Proprietary)                        │ │
│  │ Premium features. Imports sigops as dependency.             │ │
│  │                                                             │ │
│  │ server/modules/                                             │ │
│  │ ├── ai-advisor/       AI-powered incident suggestions       │ │
│  │ ├── marketplace/      Storefront, publishing, reviews       │ │
│  │ ├── analytics/        Executive dashboards, SLA tracking    │ │
│  │ ├── knowledge/        Knowledge engine + embeddings         │ │
│  │ ├── plugins/          SigShield, SigLens, SigChaos, etc     │ │
│  │ ├── creator/          Creator dashboard + revenue tracking  │ │
│  │ ├── academy/          Learning paths, certifications        │ │
│  │ ├── incident/         War room, postmortem, on-call         │ │
│  │ └── compliance/       SOC2, ISO27001 report generation      │ │
│  │                                                             │ │
│  │ ui/pages/                                                   │ │
│  │ ├── AiAdvisor/        AI suggestion panel                   │ │
│  │ ├── Marketplace/      Store browsing + install              │ │
│  │ ├── Analytics/        Executive dashboards                  │ │
│  │ ├── Creator/          Creator portal                        │ │
│  │ └── Academy/          Learning + certification              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ sigops-sdk (PUBLIC — MIT) ← THIS WAS MISSING               │ │
│  │ Developer toolkit for building tools, templates, plugins.   │ │
│  │                                                             │ │
│  │ packages/                                                   │ │
│  │ ├── @sigops/cli/             CLI tool                       │ │
│  │ │   ├── sigops init tool     Scaffold new tool project      │ │
│  │ │   ├── sigops init template Scaffold new template          │ │
│  │ │   ├── sigops test          Run tool locally against mock   │ │
│  │ │   ├── sigops validate      Validate before publishing     │ │
│  │ │   ├── sigops publish       Publish to marketplace         │ │
│  │ │   └── sigops sel lint      Lint .sel files                │ │
│  │ │                                                           │ │
│  │ ├── @sigops/tool-sdk/        Tool development library       │ │
│  │ │   ├── ToolDefinition       Type-safe tool interface       │ │
│  │ │   ├── InputSchema          Zod-based input validation     │ │
│  │ │   ├── OutputSchema         Zod-based output types         │ │
│  │ │   ├── ToolContext          Execution context (tenant,      │ │
│  │ │   │                        agent, secrets, logger)        │ │
│  │ │   ├── TestHarness          Local testing without engine   │ │
│  │ │   └── types.ts             All shared types               │ │
│  │ │                                                           │ │
│  │ ├── @sigops/template-sdk/    Template development library   │ │
│  │ │   ├── TemplateDefinition   Parameterized .sel templates   │ │
│  │ │   ├── ParameterSchema      Template parameter types       │ │
│  │ │   ├── TemplateRenderer     Fill parameters → .sel output  │ │
│  │ │   └── TestRunner           Test with sample params        │ │
│  │ │                                                           │ │
│  │ ├── @sigops/sel-tools/       SEL language tooling           │ │
│  │ │   ├── sel-parser           Parse .sel → AST               │ │
│  │ │   ├── sel-linter           Static analysis + warnings     │ │
│  │ │   ├── sel-formatter        Auto-format .sel files         │ │
│  │ │   └── sel-language-server  LSP for VS Code + JetBrains   │ │
│  │ │                                                           │ │
│  │ ├── @sigops/vscode-ext/      VS Code extension              │ │
│  │ │   ├── .sel syntax highlighting                            │ │
│  │ │   ├── Autocomplete (via Language Server)                  │ │
│  │ │   ├── Error highlighting                                  │ │
│  │ │   ├── Hover documentation                                 │ │
│  │ │   └── "Run in SigOps" command                             │ │
│  │ │                                                           │ │
│  │ └── @sigops/plugin-sdk/      Plugin development library     │ │
│  │     ├── PluginDefinition     Plugin manifest + lifecycle    │ │
│  │     ├── HookRegistry         Hook into engine events        │ │
│  │     ├── UIExtensionPoint     Register custom UI panels      │ │
│  │     └── PluginTestHarness    Test plugins in isolation      │ │
│  │                                                             │ │
│  │ docs/                                                       │ │
│  │ ├── getting-started.md       5-minute tool creation guide   │ │
│  │ ├── tool-reference.md        Complete tool API reference    │ │
│  │ ├── template-guide.md        How to create templates        │ │
│  │ ├── sel-reference.md         SEL language specification     │ │
│  │ ├── plugin-guide.md          How to create plugins          │ │
│  │ └── publishing.md            How to publish to marketplace  │ │
│  │                                                             │ │
│  │ examples/                                                   │ │
│  │ ├── tool-restart-service/    Example: restart a service     │ │
│  │ ├── tool-slack-notify/       Example: send Slack message    │ │
│  │ ├── tool-db-backup/          Example: backup database       │ │
│  │ ├── template-cpu-fix/        Example: CPU alert template    │ │
│  │ └── plugin-custom-metric/    Example: custom metric plugin  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ sigops-agent (PUBLIC — MIT)                                 │ │
│  │ Rust binary. Runs on customer infra.                        │ │
│  │                                                             │ │
│  │ src/                                                        │ │
│  │ ├── main.rs              Entry point                        │ │
│  │ ├── ws/                  WebSocket client (outbound-only)   │ │
│  │ ├── tools/               Tool executor (runs on infra)      │ │
│  │ ├── discovery/           Service + tool auto-discovery      │ │
│  │ ├── security/            8-layer security model             │ │
│  │ └── heartbeat/           Health reporting                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Feature-to-Repo Mapping (All 53 Features + 6 Plugins)

| # | Feature | Repo | Notes |
|---|---------|------|-------|
| 1 | Signal Ingestion | sigops | Core |
| 2 | Workflow Engine | sigops | Core |
| 3 | Tool System | sigops | Core (registry + 5 built-in) |
| 4 | Agent (Rust) | sigops-agent | Separate binary |
| 5 | Service Registry | sigops | Core |
| 6 | RBAC + Approval Gates | UAP | Via UAP integration |
| 7 | Multi-Tenancy | UAP | Via UAP integration |
| 8 | Audit Trail | sigops | Basic (30 days). sigops-cloud extends |
| 9 | AI Advisor | sigops-cloud | Premium |
| 10 | Pattern Learning | sigops-cloud | Premium |
| 11 | Dashboard | sigops | Core (basic). sigops-cloud extends |
| 12 | FlowBuilder | sigops | Core (basic visual editor) |
| 13 | Marketplace | sigops-cloud | Premium (storefront, reviews) |
| 14 | Scheduling | sigops | Core |
| 15 | Alerting & Notifications | UAP + sigops | Via UAP notifications |
| 16 | Reporting | sigops-cloud | Premium (executive reports) |
| 17 | Connectors | sigops | Core (free connectors) |
| 18 | Code Audit | sigops-cloud | SigLens plugin |
| 19 | On-Call Management | sigops-cloud | Premium |
| 20 | Postmortem Generation | sigops-cloud | Premium |
| 21 | Knowledge Engine | sigops-cloud | Premium |
| 22 | Developer Buddy | sigops-cloud | Premium |
| 23 | Adapter Layer | sigops | Core (PagerDuty/Datadog coexist) |
| 24 | Executive Dashboards | sigops-cloud | Premium |
| **25** | **Tool SDK** | **sigops-sdk** | **@sigops/tool-sdk + @sigops/cli** |
| **26** | **Tool Publishing Pipeline** | **sigops-sdk** | **sigops publish command** |
| 27 | Marketplace Storefront | sigops-cloud | Premium UI |
| 28 | Creator Dashboard | sigops-cloud | Premium UI |
| 29 | SEL Language | sigops | Core (parser + runtime) |
| **30** | **SEL Tooling** | **sigops-sdk** | **@sigops/sel-tools (Playground, LSP, Linter)** |
| 31 | Playbook Templates | sigops | Core (use templates) |
| **32** | **Template SDK** | **sigops-sdk** | **@sigops/template-sdk** |
| 33 | Playbook to Template Conversion | sigops | Core |
| 34 | Template Marketplace | sigops-cloud | Premium |
| 35 | Template Recommendations | sigops-cloud | AI-powered, premium |
| 36 | Template Composition | sigops | Core |
| 37 | Mobile App | sigops-cloud | Future (React Native) |
| 38 | Incident War Room | sigops-cloud | Premium |
| 39 | Status Page | sigops-cloud | Premium |
| 40 | Chaos Engineering | sigops-cloud | SigChaos plugin |
| 41 | Change Intelligence | sigops-cloud | Premium |
| 42 | Runbook Import | sigops | Core (AI converts docs to .sel) |
| 43 | SLA Tracker | sigops-cloud | Premium |
| 44 | Terminal Copilot | sigops-sdk | @sigops/cli has chat mode |
| 45 | Multi-Cloud Orchestration | sigops | Core |
| 46 | Compliance Reports | sigops-cloud | Premium (SOC2, ISO27001) |
| 47 | SigOps Graph | sigops-cloud | Premium (live infra map) |
| 48 | Blast Radius Predictor | sigops-cloud | Premium |
| 49 | Predictive Incidents | sigops-cloud | Premium (AI) |
| 50 | Cross-Tenant Intelligence | sigops-cloud | Premium |
| 51 | Incident Replay | sigops-cloud | Premium |
| 52 | Health Score | sigops-cloud | Premium (gamified) |
| **53** | **Academy & Certification** | **sigops-cloud** | **Premium** |
| P1 | SigShield (Security) | sigops-cloud | Plugin |
| P2 | SigLens (Code Quality) | sigops-cloud | Plugin |
| P3 | SigProbe (Testing) | sigops-cloud | Plugin |
| P4 | SigTrace (Compliance) | sigops-cloud | Plugin |
| P5 | SigShift (Migration) | sigops-cloud | Plugin |
| P6 | SigDocs (Documentation) | sigops-cloud | Plugin |

---

## Updated Repo Summary

| Repo | Visibility | Purpose | Features Covered |
|------|-----------|---------|-----------------|
| sigops | PUBLIC (MIT) | Core engine + basic UI | 22 features (free forever) |
| sigops-sdk | **PUBLIC (MIT)** | Developer toolkit + CLI + SEL tooling | **5 features (enables ecosystem)** |
| sigops-cloud | PRIVATE | Premium features + plugins | 26 features + 6 plugins |
| sigops-agent | PUBLIC (MIT) | Rust binary on customer infra | 1 feature (agent) |

---

## sigops-sdk Package Details

### @sigops/cli — Developer CLI

```bash
# Install globally
npm install -g @sigops/cli

# Scaffold a new tool
sigops init tool my-db-backup
# Creates:
#   my-db-backup/
#   ├── src/index.ts          # Tool implementation
#   ├── src/schema.ts         # Input/output Zod schemas
#   ├── test/index.test.ts    # Test file
#   ├── sigops.config.json    # Tool manifest
#   └── package.json

# Scaffold a new template
sigops init template cpu-alert-fix
# Creates .sel template with parameters

# Test locally (no SigOps engine needed)
sigops test --input '{"service": "nginx", "method": "systemctl"}'

# Validate before publishing
sigops validate
# Checks: types, security scan, schema validation, test coverage

# Lint .sel files
sigops sel lint playbook.sel

# Format .sel files
sigops sel fmt playbook.sel

# Publish to marketplace (requires API key from SigOps Cloud)
sigops publish --api-key sk_live_xxx
```

### @sigops/tool-sdk — Tool Development Library

```typescript
import { defineTool, z, ToolContext } from "@sigops/tool-sdk";

export default defineTool({
  name: "my-org.db-backup",
  version: "1.0.0",
  description: "Backup a PostgreSQL database to S3",
  
  input: z.object({
    database: z.string().describe("Database name"),
    bucket: z.string().describe("S3 bucket"),
    compress: z.boolean().default(true),
  }),
  
  output: z.object({
    backupPath: z.string(),
    sizeBytes: z.number(),
    durationMs: z.number(),
  }),
  
  async execute(input, ctx: ToolContext) {
    ctx.logger.info(`Backing up ${input.database}...`);
    
    // ctx provides: logger, secrets, agent, tenant, abort signal
    const pgPassword = await ctx.secrets.get("PG_PASSWORD");
    
    // Your tool logic here
    const result = await backupDatabase(input, pgPassword);
    
    return {
      backupPath: result.path,
      sizeBytes: result.size,
      durationMs: result.duration,
    };
  },
});
```

### @sigops/template-sdk — Template Development

```typescript
import { defineTemplate, z } from "@sigops/template-sdk";

export default defineTemplate({
  name: "cpu-high-fix",
  version: "1.0.0",
  description: "Auto-fix high CPU alerts",
  category: "infrastructure",
  
  parameters: z.object({
    service: z.string().describe("Service name to monitor"),
    threshold: z.number().default(90).describe("CPU % threshold"),
    restartMethod: z.enum(["systemctl", "docker", "pm2"]).default("systemctl"),
    notifyChannel: z.string().optional().describe("Slack channel"),
  }),
  
  // Generates .sel code from parameters
  render(params) {
    return `
      signal match source="prometheus" severity>=warning title~="${params.service}.*cpu" {
        when metric.cpu_percent > ${params.threshold} for 5m {
          step restart {
            tool: "sigops.restart"
            input: { service: "${params.service}", method: "${params.restartMethod}" }
          }
          step verify {
            tool: "sigops.wait"
            input: { seconds: 30 }
          }
          ${params.notifyChannel ? `step notify {
            tool: "sigops.notify_slack"
            input: { channel: "${params.notifyChannel}", message: "Restarted ${params.service} due to high CPU" }
          }` : ''}
        }
      }
    `;
  },
});
```

### @sigops/sel-tools — SEL Language Tooling

```
@sigops/sel-tools/
├── parser/          SEL source → AST (exported from sigops core)
├── linter/          Static analysis rules
│   ├── no-infinite-retry
│   ├── require-verify-step
│   ├── max-parallel-steps
│   ├── secret-in-plain-text
│   └── unreachable-branch
├── formatter/       Auto-format .sel files
├── language-server/ LSP implementation
│   ├── completion    Autocomplete tool names, signal fields
│   ├── diagnostics   Real-time error highlighting
│   ├── hover         Documentation on hover
│   └── goto-def      Jump to tool/workflow definitions
└── playground/      Embeddable web editor component (React)
    ├── Editor        Monaco-based .sel editor
    ├── Preview       Live AST preview
    └── Simulator     Test against mock signals
```

### @sigops/vscode-ext — VS Code Extension

Published to VS Code Marketplace (free). Features:
- .sel syntax highlighting (TextMate grammar)
- Autocomplete via Language Server
- Error/warning squiggles
- Hover documentation
- "Run in SigOps" command
- Tool/template scaffolding via command palette
- SEL Playground panel

### @sigops/plugin-sdk — Plugin Development

```typescript
import { definePlugin, HookPoint } from "@sigops/plugin-sdk";

export default definePlugin({
  name: "my-org.custom-metrics",
  version: "1.0.0",
  
  hooks: {
    [HookPoint.AFTER_SIGNAL_INGEST]: async (signal, ctx) => {
      // Enrich signal with custom metrics
      signal.metadata.customScore = await computeScore(signal);
    },
    [HookPoint.BEFORE_EXECUTION]: async (execution, ctx) => {
      // Add pre-execution checks
    },
  },
  
  ui: {
    panels: [{
      id: "custom-metrics",
      title: "Custom Metrics",
      location: "dashboard.sidebar",
      component: "./ui/MetricsPanel.tsx",
    }],
  },
});
```

---

## Updated ClusterAssets Repo Count: 15 (was 14)

| # | Repo | Visibility |
|---|------|-----------|
| 1 | cluster-shared | PRIVATE |
| 2 | uap | PRIVATE |
| 3 | **sigops** | **PUBLIC** |
| 4 | **sigops-sdk** | **PUBLIC** ← NEW |
| 5 | **sigops-agent** | **PUBLIC** |
| 6 | sigops-cloud | PRIVATE |
| 7 | credora | PRIVATE |
| 8 | assera | PRIVATE |
| 9 | talentra | PRIVATE |
| 10 | armexa | PRIVATE |
| 11 | futurevo | PRIVATE |
| 12 | movana | PRIVATE |
| 13 | lifetra | PRIVATE |
| 14 | paynex | PRIVATE |
| 15 | novix | PRIVATE |

**PUBLIC: 3 → 4** (sigops, sigops-sdk, sigops-agent)
**PRIVATE: 11** (unchanged)

---

## Build Order for sigops-sdk

```
1. After sigops core Phase 1 (engine works, SEL parses)
2. Extract SEL parser into @sigops/sel-tools (share between core + SDK)
3. Build @sigops/tool-sdk (defineTool + TestHarness)
4. Build @sigops/cli (init + test + validate)
5. Build @sigops/template-sdk
6. Build @sigops/sel-tools (linter + formatter + LSP)
7. Build @sigops/vscode-ext
8. Build @sigops/plugin-sdk (after sigops-cloud hook system)
9. Write examples/ (3-5 example tools + templates)
10. Write docs/ (getting-started, references, guides)
```

The SDK launches with sigops-cloud (Set 2, Month 2-4) but the SEL parser
extraction and tool-sdk should happen during Set 1 to enable early adopters.
