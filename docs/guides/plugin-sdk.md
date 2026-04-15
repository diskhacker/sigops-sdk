# Plugin SDK Guide (`@sigops/plugin-sdk`)

The Plugin SDK lets you extend the SigOps runtime and UI **without forking
it**. A plugin is a versioned, self-contained bundle that:

- Registers **hook handlers** that run at specific lifecycle points
  (before/after a tool executes, when an alert is sent, when a threshold
  is breached, etc.).
- Mounts **UI extensions** into pre-defined slots in the SigOps web app
  (dashboard widgets, sidebar panels, settings pages, alert actions).
- Optionally exposes a Zod-validated **settings** schema that the runtime
  turns into a config form for operators.

Plugins are the recommended extension point for custom metrics, custom
notification channels, compliance rules, and vendor integrations.

---

## Overview

A plugin is a plain object produced by the `definePlugin(...)` factory:

```ts
import { definePlugin, HookPoint } from '@sigops/plugin-sdk';

export default definePlugin({
  name: 'audit-log',
  description: 'Writes every tool execution to an external audit log',
  hooks: [
    {
      point: HookPoint.AfterToolExecute,
      handler: async (event) => {
        // event.data contains { toolName, input, output, durationMs, ... }
        return { handled: true };
      },
    },
  ],
  async activate(ctx) {
    ctx.logger.info('audit-log active');
  },
});
```

---

## Install

```bash
pnpm add @sigops/plugin-sdk
```

Zod is re-exported as `z` — do not install it separately.

---

## Quickstart

```bash
sigops init my-plugin --type plugin
cd my-plugin
pnpm install
pnpm test
```

The scaffold gives you `src/index.ts` with a `definePlugin(...)` stub,
`__tests__/index.test.ts` wired up with `mockPluginContext`, and a working
build pipeline.

---

## API reference

### `definePlugin(config)`

```ts
function definePlugin(config: {
  name: string;                     // kebab-case
  description: string;
  version?: string;                 // default: '0.1.0'
  hooks?: HookRegistration[];
  uiExtensions?: UIExtension[];
  settings?: z.ZodType<any>;
  activate?: (ctx: PluginContext) => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
  tags?: string[];
}): PluginDefinition;
```

### `HookPoint` enum

All values are strings and are also usable in serialized config files:

| Value | Fires when |
|---|---|
| `BeforeToolExecute` | Right before a tool's `execute` runs. Can short-circuit. |
| `AfterToolExecute` | After a tool returns, before the result is consumed. |
| `OnToolError` | A tool threw or failed output validation. |
| `BeforeAlertSend` | An alert has been composed and is about to be delivered. |
| `AfterAlertSend` | An alert has been delivered to its channels. |
| `OnAlertEscalation` | An alert has been escalated to the next tier. |
| `BeforeMonitorCheck` | A monitor's check is about to run. |
| `AfterMonitorCheck` | A monitor's check has finished. |
| `OnThresholdBreach` | A monitor threshold has been crossed. |
| `OnPluginActivate` | Any plugin has been activated. |
| `OnPluginDeactivate` | Any plugin has been deactivated. |
| `OnConfigChange` | Plugin or system configuration changed. |

### `HookRegistration`

```ts
interface HookRegistration {
  point: HookPoint;
  handler: (event: HookEvent) => Promise<HookResult> | HookResult;
  priority?: number;   // default 10; lower = earlier
}
```

`HookEvent = { type, data, timestamp, source }`.
`HookResult = { handled: boolean; data?: any; error?: string }`.

### `HookRegistry`

The runtime manages an internal `HookRegistry`. You can also use it in
tests:

```ts
import { HookRegistry, HookPoint } from '@sigops/plugin-sdk';

const reg = new HookRegistry();
reg.register(HookPoint.AfterToolExecute, myHandler, 5);
const results = await reg.execute(HookPoint.AfterToolExecute, {
  type: HookPoint.AfterToolExecute,
  data: { toolName: 'x' },
  timestamp: Date.now(),
  source: 'test',
});
```

Key methods: `register`, `unregister`, `execute`, `getHandlers`,
`hasHandlers`, `clear`, `clearPoint`, `getRegisteredPoints`,
`getHandlerCount`.

### `UIExtensionPoint`

One of:

- `'dashboard-widget'` — a card on the main dashboard.
- `'settings-panel'` — a top-level settings page.
- `'tool-sidebar'` — a panel beside the tool run view.
- `'alert-action'` — a button on the alert detail view.
- `'navigation-item'` — a link in the primary nav.
- `'status-bar'` — a slot in the top-right status bar.

Each `UIExtension` names a component (resolved by the host app) and
optional `props` and `order`.

### `PluginContext`

Passed to `activate(ctx)`:

```ts
interface PluginContext {
  pluginId: string;
  logger: { debug/info/warn/error(msg) };
  settings: Record<string, any>;          // parsed through your Zod schema
  emitEvent: (event: string, data?) => void;
}
```

### `mockPluginContext(pluginId?)`

Returns a `PluginContext` with recording `getLogs()` and `getEvents()`
inspectors for use in tests.

---

## Example — audit log plugin

```ts
import { definePlugin, HookPoint, z } from '@sigops/plugin-sdk';

export default definePlugin({
  name: 'audit-log',
  description: 'Writes every tool execution to an external audit log',
  settings: z.object({ endpoint: z.string().url(), apiKey: z.string().min(1) }),
  hooks: [
    {
      point: HookPoint.AfterToolExecute,
      priority: 5,
      async handler(event) {
        // In a real plugin, you'd use ctx.fetch or an HTTP client.
        return { handled: true, data: { forwarded: true, tool: event.data.toolName } };
      },
    },
  ],
  uiExtensions: [
    { point: 'dashboard-widget', component: 'AuditLogWidget', order: 100 },
    { point: 'settings-panel', component: 'AuditLogSettings' },
  ],
  async activate(ctx) {
    ctx.logger.info(`audit-log active -> ${ctx.settings.endpoint}`);
    ctx.emitEvent('audit-log:ready');
  },
});
```

Runnable example: [`examples/hello-plugin`](../../examples/hello-plugin).

---

## Testing patterns

```ts
import { describe, it, expect } from 'vitest';
import { HookPoint, HookRegistry, mockPluginContext } from '@sigops/plugin-sdk';
import plugin from '../src/index.js';

describe('audit-log', () => {
  it('activates without error', async () => {
    const ctx = mockPluginContext();
    await plugin.activate?.({ ...ctx, settings: { endpoint: 'https://x', apiKey: 'k' } });
    expect(ctx.getLogs().some(l => l.includes('audit-log active'))).toBe(true);
  });

  it('forwards AfterToolExecute events', async () => {
    const reg = new HookRegistry();
    for (const h of plugin.hooks ?? []) reg.register(h.point, h.handler, h.priority);
    const results = await reg.execute(HookPoint.AfterToolExecute, {
      type: HookPoint.AfterToolExecute,
      data: { toolName: 't' },
      timestamp: Date.now(),
      source: 'test',
    });
    expect(results[0].handled).toBe(true);
  });
});
```

---

## Plugin lifecycle

1. Runtime loads the plugin bundle and calls `definePlugin(...)` to get
   metadata.
2. Runtime parses operator-supplied config through your `settings` Zod
   schema.
3. Runtime calls `activate(ctx)` once. Use this for one-time setup.
4. Runtime registers every entry in `hooks` and `uiExtensions`.
5. When the plugin is disabled or unloaded, runtime calls `deactivate()`.

Plugins must tolerate being activated and deactivated multiple times in a
single process — avoid module-level mutable singletons.
