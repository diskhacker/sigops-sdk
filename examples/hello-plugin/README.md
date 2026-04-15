# hello-plugin

A minimal [@sigops/plugin-sdk](../../packages/plugin-sdk) example: a plugin
that registers one hook and one UI extension.

## What this example shows

SigOps plugins extend the core runtime in two dimensions:

1. **Hook handlers** — server-side functions that run at specific lifecycle
   points (before/after a tool executes, before an alert is sent, when a
   threshold is breached, etc.).
2. **UI extensions** — components that mount into pre-defined UI slots (a
   dashboard widget, a sidebar panel, an alert action button, etc.).

This example uses both:

- A handler on `HookPoint.AfterToolExecute` that counts tool runs and returns
  a greeting message.
- A `dashboard-widget` UI extension pointing to a component named
  `HelloWidget`.

It also implements `activate(ctx)` to log a message and emit an event when
the plugin is loaded.

## Install & build

From the repo root:

```bash
pnpm install
pnpm --filter @sigops-examples/hello-plugin build
```

## Try it (locally, without the SigOps runtime)

```ts
import { helloPlugin } from '@sigops-examples/hello-plugin';
import { HookRegistry, HookPoint, mockPluginContext } from '@sigops/plugin-sdk';

// 1. Activate the plugin against a mock context
await helloPlugin.activate?.(mockPluginContext('hello'));

// 2. Register its hooks into a HookRegistry and fire an event
const registry = new HookRegistry();
for (const h of helloPlugin.hooks ?? []) {
  registry.register(h.point, h.handler, h.priority);
}
const results = await registry.execute(HookPoint.AfterToolExecute, {
  type: HookPoint.AfterToolExecute,
  data: { toolName: 'noop' },
  timestamp: Date.now(),
  source: 'demo',
});
console.log(results); // [{ handled: true, data: { message: 'hello from...' } }]
```

## Next steps

- Add a second hook on `HookPoint.OnThresholdBreach` to react to alerts.
- Add a `settings` Zod schema so users can configure the greeting.
- Use `ctx.emitEvent(...)` inside the hook handler to push custom metrics.

See [docs/guides/plugin-sdk.md](../../docs/guides/plugin-sdk.md) for the full
list of hook points and UI extension slots.
