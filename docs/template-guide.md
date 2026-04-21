# Template Guide — `@sigops/template-sdk`

Templates are reusable automation workflows composed of SigOps tools. A template defines a parameterized schema, and its `render()` function turns those parameters into a `.sel` (Signal Expression Language) program that the SigOps runtime executes.

## Install

```bash
pnpm add @sigops/template-sdk
```

---

## Quick Start

```ts
import { defineTemplate, z } from '@sigops/template-sdk';

export default defineTemplate({
  name: 'cpu-auto-fix',
  description: 'Kills the top CPU process when CPU usage exceeds threshold',
  version: '0.1.0',
  category: 'remediation',
  paramSchema: z.object({
    host: z.string().describe('Target hostname'),
    threshold: z.number().min(0).max(100).default(90).describe('CPU % threshold'),
    dryRun: z.boolean().default(false).describe('Preview without killing'),
  }),
  render(params) {
    return `
signal cpu.usage > ${params.threshold} on "${params.host}"

step kill_process {
  tool: "sys.kill-top-cpu"
  params: { host: "${params.host}", dry_run: ${params.dryRun} }
}
`.trim();
  },
});
```

---

## `defineTemplate(definition)`

Creates and validates a `TemplateDefinition` object.

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique template name |
| `description` | `string` | Yes | Human-readable description |
| `version` | `string` | Yes | Semver version string |
| `category` | `TemplateCategory` | Yes | One of: `monitoring`, `alerting`, `remediation`, `deployment`, `maintenance`, `custom` |
| `paramSchema` | `z.ZodType` | Yes | Zod schema describing template parameters |
| `render` | `function` | Yes | `(params) => string` — produces a `.sel` workflow |
| `tags` | `string[]` | No | Searchable tags |
| `examples` | `TemplateExample[]` | No | Example parameter sets with expected outputs |

---

## `TemplateDefinition`

```ts
interface TemplateDefinition<TParams> {
  name: string;
  description: string;
  version: string;
  category: TemplateCategory;
  paramSchema: TParams;
  render: (params: z.infer<TParams>) => string;
  tags?: string[];
  examples?: TemplateExample[];
}

type TemplateCategory =
  | 'monitoring'
  | 'alerting'
  | 'remediation'
  | 'deployment'
  | 'maintenance'
  | 'custom';
```

---

## Parameter Schemas → UI Form Mapping

SigOps automatically generates a UI form from your `paramSchema`. The generated form uses these Zod type mappings:

| Zod type | UI widget |
|----------|-----------|
| `z.string()` | Text input |
| `z.string().url()` | URL input with validation |
| `z.number()` | Number input |
| `z.number().min(0).max(100)` | Slider (0–100) |
| `z.boolean()` | Checkbox / toggle |
| `z.enum([...])` | Dropdown select |
| `z.array(z.string())` | Multi-value text input |
| `z.object({...})` | Grouped fieldset |

Use `.describe('...')` on any field to set the form label:

```ts
z.object({
  host: z.string().describe('Target server hostname'),
  port: z.number().int().default(5432).describe('PostgreSQL port'),
  slack_channel: z.string().default('#alerts').describe('Slack channel for notifications'),
})
```

Use `.default(value)` to pre-fill form fields.

---

## `render()` Function Patterns

The `render()` function receives validated, type-safe parameters and must return a valid `.sel` string.

### Basic step sequence

```ts
render(params) {
  return `
signal disk.usage > ${params.threshold} on "${params.host}"

step cleanup {
  tool: "sys.cleanup-disk"
  params: { host: "${params.host}", path: "${params.path}" }
}

step verify {
  tool: "sys.check-disk"
  params: { host: "${params.host}" }
}
`.trim();
}
```

### Conditional steps

Use template literals with JavaScript conditionals:

```ts
render(params) {
  const notifyStep = params.notify
    ? `
step notify {
  tool: "slack.send-message"
  params: { channel: "${params.slackChannel}", text: "Disk cleanup complete on ${params.host}" }
}`
    : '';

  return `
signal disk.usage > ${params.threshold} on "${params.host}"

step cleanup {
  tool: "sys.cleanup-disk"
  params: { host: "${params.host}" }
}
${notifyStep}
`.trim();
}
```

### Retry/rollback

```ts
render(params) {
  return `
signal deploy.requested for "${params.service}"

step deploy {
  tool: "k8s.deploy"
  params: { service: "${params.service}", image: "${params.image}" }
  retry: { max: 3, backoff: 5000 }
  rollback: { tool: "k8s.rollback", params: { service: "${params.service}" } }
}
`.trim();
}
```

---

## Template Composition

Templates can reference other templates' output by naming shared signals:

```ts
render(params) {
  return `
# First detect the problem
signal cpu.usage > ${params.threshold} on "${params.host}"

# Then run sub-workflow steps
step diagnose {
  tool: "sys.get-top-processes"
  params: { host: "${params.host}", count: 5 }
}

step kill {
  tool: "sys.kill-process"
  params: { host: "${params.host}", pid: "$diagnose.output.topPid" }
  when: "$diagnose.output.cpuPercent > ${params.killThreshold}"
}
`.trim();
}
```

---

## Playbook-to-Template Conversion

If you have an existing SigOps playbook YAML, convert it to a template scaffold:

```bash
sigops-sdk template from-playbook path/to/playbook.yaml
```

This generates a `src/index.ts` with stubs based on the playbook's steps and parameters.

---

## Testing Templates

Use `TemplateRenderer` and `TestRunner` to validate template output:

```ts
import { describe, it, expect } from 'vitest';
import template from '../src/index.js';
import { TemplateRenderer, TestRunner } from '@sigops/template-sdk';

describe('cpu-auto-fix', () => {
  it('renders valid SEL for default params', () => {
    const renderer = new TemplateRenderer(template);
    const result = renderer.render({ host: 'prod-01', threshold: 90, dryRun: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain('signal cpu.usage > 90');
    expect(result.output).toContain('"prod-01"');
  });

  it('runs all example parameter sets', async () => {
    const runner = new TestRunner(template);
    const suite = await runner.runExamples();
    expect(suite.failed).toBe(0);
  });
});
```

### `TestCase` and `TestResult`

```ts
interface TestCase {
  name: string;
  params: Record<string, any>;
  expected?: string | RegExp;  // substring or pattern to match in output
  shouldFail?: boolean;         // expect render to fail
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  output?: string;
  duration: number;
}
```

Run multiple parameter sets at once with `TestRunner.runCases(cases)`:

```ts
const runner = new TestRunner(template);
const suite = await runner.runCases([
  { name: 'high threshold', params: { host: 'srv-1', threshold: 95, dryRun: false } },
  { name: 'dry run', params: { host: 'srv-1', threshold: 80, dryRun: true } },
  { name: 'invalid host', params: { host: '', threshold: 90, dryRun: false }, shouldFail: true },
]);
expect(suite.passed).toBe(3);
```

---

## Publishing a Template

1. Ensure `sigops.config.json` has `"type": "template"` and a valid `"name"`.
2. Run validation:
   ```bash
   sigops-sdk validate .
   ```
3. Publish:
   ```bash
   sigops-sdk publish .
   ```

See `docs/publishing.md` for the full publishing pipeline and review process.

---

## Dependency on `@sigops/sel-tools`

`@sigops/template-sdk` depends on `@sigops/sel-tools` (`workspace:*`) to validate that `render()` output is syntactically correct SEL before publishing. You do not need to install `sel-tools` separately — it is bundled as a peer dependency.
