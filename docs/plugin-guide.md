# Plugin Guide — `@sigops/plugin-sdk`

Plugins extend the SigOps platform with custom lifecycle hooks and UI extension points. A plugin can react to tool executions, alert lifecycle events, monitor checks, and more — and can contribute custom panels to the SigOps UI.

## Install

```bash
pnpm add @sigops/plugin-sdk
```

---

## Quick Start

```ts
import { definePlugin, HookPoint, z } from '@sigops/plugin-sdk';

export default definePlugin({
  name: 'my-custom-metric',
  description: 'Emits execution metrics to a custom endpoint',
  version: '0.1.0',
  settings: z.object({
    endpoint: z.string().url().describe('Metrics receiver URL'),
    apiKey: z.string().describe('API key for the receiver'),
  }),
  hooks: [
    {
      point: HookPoint.AfterToolExecute,
      handler: async (event) => {
        const { endpoint, apiKey } = event.data.settings;
        await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ tool: event.data.toolName, duration: event.data.duration }),
        });
        return { handled: true };
      },
    },
  ],
});
```

---

## `definePlugin(definition)`

Creates and validates a `PluginDefinition` object.

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique plugin identifier |
| `description` | `string` | Yes | Human-readable description |
| `version` | `string` | Yes | Semver version string |
| `hooks` | `HookRegistration[]` | No | Lifecycle hook handlers |
| `uiExtensions` | `UIExtension[]` | No | UI extension point registrations |
| `settings` | `z.ZodType` | No | Zod schema for plugin configuration (shown as form in UI) |
| `activate` | `function` | No | Called when plugin is enabled |
| `deactivate` | `function` | No | Called when plugin is disabled |
| `tags` | `string[]` | No | Searchable tags |

---

## `HookPoint` Enum

The `HookPoint` enum lists all available lifecycle hook points. Your plugin can register handlers for any combination.

### Tool lifecycle

| Hook point | When it fires |
|-----------|---------------|
| `HookPoint.BeforeToolExecute` | Immediately before a tool's `execute()` is called. Can modify inputs or cancel the execution. |
| `HookPoint.AfterToolExecute` | After a tool's `execute()` completes (whether success or failure). Receives output and duration. |
| `HookPoint.OnToolError` | When a tool throws an unhandled error (after all retries). Useful for custom error logging or alerting. |

### Alert lifecycle

| Hook point | When it fires |
|-----------|---------------|
| `HookPoint.BeforeAlertSend` | Before an alert notification is sent to any channel. |
| `HookPoint.AfterAlertSend` | After an alert notification has been delivered. |
| `HookPoint.OnAlertEscalation` | When an alert escalates to a higher severity or on-call tier. |

### Monitor lifecycle

| Hook point | When it fires |
|-----------|---------------|
| `HookPoint.BeforeMonitorCheck` | Before each scheduled monitor evaluation. |
| `HookPoint.AfterMonitorCheck` | After each scheduled monitor evaluation completes. |
| `HookPoint.OnThresholdBreach` | When a monitor value crosses its defined threshold. |

### System

| Hook point | When it fires |
|-----------|---------------|
| `HookPoint.OnPluginActivate` | When this plugin is activated by a user or admin. |
| `HookPoint.OnPluginDeactivate` | When this plugin is deactivated. Use for cleanup. |
| `HookPoint.OnConfigChange` | When plugin settings are updated in the UI. |

---

## `HookRegistration`

```ts
interface HookRegistration {
  point: HookPoint;
  handler: HookHandler;
  priority?: number;   // lower = runs first (default: 10)
}
```

### `HookHandler`

```ts
type HookHandler = (event: HookEvent) => Promise<HookResult> | HookResult;

interface HookEvent {
  type: HookPoint;      // which hook fired
  data: any;            // hook-specific payload
  timestamp: number;    // Unix epoch ms
  source: string;       // ID of the triggering entity
}

interface HookResult {
  handled: boolean;     // true if the handler processed the event
  data?: any;           // optional modified data to pass forward
  error?: string;       // set if the handler itself errored
}
```

Example — log all tool executions:

```ts
{
  point: HookPoint.AfterToolExecute,
  priority: 5,
  handler: async (event) => {
    console.log(`[${event.source}] tool finished in ${event.data.duration}ms`);
    return { handled: true };
  },
}
```

---

## `UIExtensionPoint`

Register custom UI components at these mount points:

| Value | Location in SigOps UI |
|-------|----------------------|
| `'dashboard-widget'` | Custom widget on the main dashboard |
| `'settings-panel'` | Tab in the Settings page |
| `'tool-sidebar'` | Sidebar panel in the tool detail view |
| `'alert-action'` | Action button in the alert detail drawer |
| `'navigation-item'` | Entry in the left navigation menu |
| `'status-bar'` | Item in the bottom status bar |

```ts
uiExtensions: [
  {
    point: 'dashboard-widget',
    component: 'MetricsDashboardWidget',
    props: { refreshIntervalMs: 30000 },
    order: 1,
  },
  {
    point: 'settings-panel',
    component: 'PluginSettingsPanel',
    order: 0,
  },
]
```

---

## `PluginContext`

The `activate(ctx)` lifecycle function receives a `PluginContext`:

```ts
interface PluginContext {
  pluginId: string;
  logger: PluginLogger;
  settings: Record<string, any>;
  emitEvent: (event: string, data?: any) => void;
}

interface PluginLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}
```

### Accessing plugin settings

```ts
activate: async (ctx) => {
  const endpoint = ctx.settings['endpoint'] as string;
  ctx.logger.info(`Plugin activated. Sending metrics to ${endpoint}`);
  ctx.emitEvent('plugin.ready', { endpoint });
},
```

---

## Plugin Lifecycle

1. **Install** — User installs the plugin from the Marketplace or uploads a `.sigops-plugin` package.
2. **Activate** — The `activate(ctx)` function is called. Set up connections, validate settings.
3. **Running** — Hook handlers fire in response to platform events. Priority determines order among multiple handlers for the same hook.
4. **Config change** — If `OnConfigChange` is hooked, re-initialize connections with new settings.
5. **Deactivate** — The `deactivate()` function is called. Close connections, flush buffers, clean up timers.

---

## `HookRegistry`

For advanced use cases, use `HookRegistry` directly to manage hooks programmatically:

```ts
import { HookRegistry, HookPoint } from '@sigops/plugin-sdk';

const registry = new HookRegistry();

registry.register(HookPoint.AfterToolExecute, async (event) => {
  console.log('tool ran:', event.source);
  return { handled: true };
}, 10); // priority = 10

// Execute all AfterToolExecute handlers
const results = await registry.execute(HookPoint.AfterToolExecute, {
  type: HookPoint.AfterToolExecute,
  data: { toolName: 'http-health-check', duration: 142 },
  timestamp: Date.now(),
  source: 'tool:http-health-check',
});

// Cleanup
registry.clear();
```

---

## Testing Plugins in Isolation

```ts
import { describe, it, expect, vi } from 'vitest';
import { mockPluginContext } from '@sigops/plugin-sdk';
import plugin from '../src/index.js';

describe('my-custom-metric plugin', () => {
  it('AfterToolExecute handler posts to endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    const hook = plugin.hooks?.find(h => h.point === 'after-tool-execute');
    expect(hook).toBeDefined();

    const result = await hook!.handler({
      type: 'after-tool-execute' as any,
      data: {
        settings: { endpoint: 'https://metrics.example.com', apiKey: 'test' },
        toolName: 'http-health-check',
        duration: 200,
      },
      timestamp: Date.now(),
      source: 'tool:http-health-check',
    });

    expect(result.handled).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://metrics.example.com',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('activate() logs startup message', async () => {
    const ctx = mockPluginContext({
      settings: { endpoint: 'https://metrics.example.com', apiKey: 'test' },
    });
    await plugin.activate?.(ctx);
    expect(ctx.getLogs().some(l => l.message.includes('activated'))).toBe(true);
  });
});
```

---

## Publishing a Plugin

1. Set `"type": "plugin"` in `sigops.config.json`.
2. Run validation:
   ```bash
   sigops-sdk validate .
   ```
3. Publish:
   ```bash
   sigops-sdk publish .
   ```

See `docs/publishing.md` for the full review process and pricing models.
