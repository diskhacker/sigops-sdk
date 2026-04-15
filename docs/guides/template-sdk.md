# Template SDK Guide (`@sigops/template-sdk`)

The Template SDK lets you publish **parameterised SigOps workflows**. A
template takes a typed bundle of parameters from an operator, validates
them, and deterministically renders a SigOps Expression Language (SEL)
program. That SEL program is what the runtime actually executes.

Templates are the primary artifact on the SigOps Marketplace. Operators
install them, fill in the form, and get a working monitor / alert /
remediation workflow in one click.

---

## Overview

Every template is a plain object produced by `defineTemplate(...)`:

```ts
import { defineTemplate, z } from '@sigops/template-sdk';

export default defineTemplate({
  name: 'cpu-fix',
  description: 'Monitor CPU, alert ops, optionally run a remediation tool',
  category: 'remediation',
  params: z.object({
    host: z.string().min(1),
    threshold: z.number().min(1).max(100).default(90),
    recipient: z.string().email(),
  }),
  render(p) {
    return `monitor "cpu-${p.host}" { check: "cpu.load" every: 30s threshold: ${p.threshold} }
alert "cpu-${p.host}-high" when monitor.breach {
  notify: "${p.recipient}"
}`;
  },
});
```

`TemplateRenderer` and `TestRunner` classes operate on these objects —
neither you nor the SigOps runtime hand-rolls SEL strings at call sites.

---

## Install

```bash
pnpm add @sigops/template-sdk
```

`z` (Zod) is re-exported. `@sigops/sel-tools` is a transitive dependency
used internally to validate the rendered output.

---

## Quickstart

```bash
sigops init cpu-fix --type template
cd cpu-fix
pnpm install
pnpm test
```

Then edit `src/index.ts`:

```ts
import { defineTemplate, z } from '@sigops/template-sdk';

export default defineTemplate({
  name: 'cpu-fix',
  description: 'Monitor and remediate high CPU',
  category: 'remediation',
  params: z.object({
    host: z.string(),
    threshold: z.number().default(90),
  }),
  render(p) {
    return `monitor "cpu-${p.host}" { threshold: ${p.threshold} }`;
  },
});
```

---

## API reference

### `defineTemplate(config)`

```ts
function defineTemplate<TParams extends ParameterSchema>(config: {
  name: string;                   // kebab-case
  description: string;
  version?: string;               // default: '0.1.0'
  category: TemplateCategory;     // monitoring | alerting | remediation
                                  // | deployment | maintenance | custom
  params: TParams;                // Zod schema
  render: (params) => string;     // must return valid SEL
  tags?: string[];
  examples?: TemplateExample[];
}): TemplateDefinition<TParams>;
```

Throws for missing fields, non-kebab-case names, or invalid categories.

### `TemplateCategory`

Exactly one of:
`'monitoring' | 'alerting' | 'remediation' | 'deployment' | 'maintenance' | 'custom'`.

### `ParameterSchema` → UI form

Every `z` primitive maps to a form control:

| Zod type | Control | Notes |
|---|---|---|
| `z.string()` | text input | `.email()`, `.url()` tighten validation |
| `z.number()` | number input | `.min().max()` set bounds |
| `z.enum([...])` | dropdown | values become options |
| `z.boolean()` | checkbox | `.default(true)` pre-checks |
| `z.array(z.string())` | tag list | entries added one-per-enter |
| `z.object({...})` | nested fieldset | recurses |

`.describe('helper text')` becomes inline form help.

### `TemplateRenderer`

```ts
import { TemplateRenderer } from '@sigops/template-sdk';

const renderer = new TemplateRenderer(template);
const result = renderer.render({ host: 'db-1', threshold: 85, recipient: 'a@b.c' });
if (result.success) console.log(result.output);
else                 console.error(result.errors);
```

Steps performed:

1. `template.paramSchema.safeParse(params)` — structural validation.
2. `template.render(parsed)` — string produced by the author.
3. Syntax-validate the produced SEL via `sel-tools`' parser.
4. Return `{ success, output?, errors? }`.

### `TestRunner`

```ts
const runner = new TestRunner(template);
const suite = await runner.run([
  { name: 'happy', params: { host: 'h', recipient: 'a@b.c' } },
  { name: 'bad',   params: { host: '' }, shouldFail: true },
  { name: 'regex', params: { host: 'h', recipient: 'a@b.c' }, expected: /monitor "cpu-h"/ },
]);
console.log(`${suite.passed}/${suite.total}`);
```

### Types

`TemplateDefinition`, `TemplateExample`, `RenderResult`,
`ValidationResult`, `ValidationError`, `TestCase`, `TestResult`,
`TestSuiteResult` — all importable from the package root.

---

## Example — disk cleanup template

```ts
import { defineTemplate, z } from '@sigops/template-sdk';

export default defineTemplate({
  name: 'disk-cleanup',
  description: 'Alert on low disk space and kick off a cleanup action',
  category: 'remediation',
  params: z.object({
    mount: z.string().default('/'),
    warnAt: z.number().min(50).max(99).default(80),
    critAt: z.number().min(50).max(99).default(95),
    cleanupTool: z.string().default('clean-tmp'),
  }),
  render(p) {
    return `monitor "disk-${p.mount}" {
  check: "disk.free"
  every: 60s
}
alert "disk-${p.mount}-warn" when disk.used > ${p.warnAt} { severity: medium }
alert "disk-${p.mount}-crit" when disk.used > ${p.critAt} {
  severity: high
  action: ${p.cleanupTool}
}`;
  },
  examples: [
    { name: 'default', params: {} },
    { name: 'tight',   params: { warnAt: 70, critAt: 85 } },
  ],
});
```

Runnable example: [`examples/hello-template`](../../examples/hello-template).

---

## Testing patterns

```ts
import { describe, it, expect } from 'vitest';
import { TemplateRenderer, TestRunner } from '@sigops/template-sdk';
import diskCleanup from '../src/index.js';

describe('disk-cleanup', () => {
  it('rejects missing required params', () => {
    const r = new TemplateRenderer(diskCleanup);
    const res = r.render({ warnAt: 200 });
    expect(res.success).toBe(false);
  });

  it('passes default + tight parameter sets', async () => {
    const runner = new TestRunner(diskCleanup);
    const suite = await runner.run(diskCleanup.examples!.map((ex) => ({
      name: ex.name, params: ex.params,
    })));
    expect(suite.failed).toBe(0);
  });
});
```

---

## Composing templates

Templates can import one another:

```ts
import baseMonitor from '@my-scope/base-monitor';
import { defineTemplate, z, TemplateRenderer } from '@sigops/template-sdk';

export default defineTemplate({
  name: 'web-monitor',
  description: 'Base monitor + web-specific extras',
  category: 'monitoring',
  params: baseMonitor.paramSchema.extend({ url: z.string().url() }),
  render(p) {
    const base = new TemplateRenderer(baseMonitor).render(p);
    return `${base.output}\nmonitor "http-${p.url}" { check: "http.status" }`;
  },
});
```

---

## Publishing

```bash
sigops validate                # runs TestRunner on all examples
sigops publish --access public
```

Validation checks: kebab-case name, valid category, unique `params` keys,
rendered SEL is syntactically valid for every example in `examples`, and
no secrets appear in the source.
