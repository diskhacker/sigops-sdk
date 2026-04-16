# hello-template

A minimal [@sigops/template-sdk](../../packages/template-sdk) example: a
workflow template that renders a simple SEL program.

## What this example shows

Templates are the primary mechanism for turning user-friendly parameters into
executable SigOps Expression Language (SEL). This example demonstrates:

1. `defineTemplate(...)` with the required fields: `name`, `description`,
   `category` (monitoring, alerting, remediation, deployment, maintenance,
   custom), `params` (a Zod schema), and `render`.
2. A typed `params` object with `.describe(...)`, `.default(...)`, and
   `.optional()` — all of which flow into the SigOps form builder UI.
3. A pure `render(params)` function that returns a string of SEL source.
4. The optional `examples` array, which is used by the marketplace preview
   and by the built-in `TestRunner`.

## Install & build

From the repo root:

```bash
pnpm install
pnpm --filter @sigops-examples/hello-template build
```

## Render the SEL output

```ts
import { helloTemplate } from '@sigops-examples/hello-template';
import { TemplateRenderer } from '@sigops/template-sdk';

const renderer = new TemplateRenderer(helloTemplate);
const result = renderer.render({
  target: 'api.example.com',
  severity: 'medium',
  recipient: 'ops@example.com',
});

if (result.success) {
  console.log(result.output);
  // monitor "hello-api.example.com" { ... }
  // alert "hello-api.example.com-down" when monitor.failed { ... }
}
```

## Run the built-in test suite

```ts
import { TestRunner } from '@sigops/template-sdk';
import { helloTemplate } from '@sigops-examples/hello-template';

const runner = new TestRunner(helloTemplate);
const suite = await runner.run([
  { name: 'happy path', params: { target: 'api', severity: 'high' } },
  { name: 'invalid', params: { target: '' }, shouldFail: true },
]);
console.log(`${suite.passed}/${suite.total} passed`);
```

## Next steps

- Add validation rules to reject free-text that would break SEL syntax.
- Compose multiple templates by importing one and wrapping its output.
- Publish to the SigOps Marketplace — see `docs/guides/template-sdk.md`.
