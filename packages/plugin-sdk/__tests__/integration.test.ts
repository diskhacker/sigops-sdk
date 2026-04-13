import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { definePlugin, getPluginMetadata, mockPluginContext } from '../src/define-plugin.js';
import { HookPoint, HookRegistry } from '../src/hooks.js';
import { UIExtensionRegistry } from '../src/ui-extension.js';
import type { HookHandler, HookEvent, HookResult } from '../src/types.js';

describe('Integration', () => {
  it('defines a plugin with hooks, registers them in HookRegistry, and executes', async () => {
    const handler: HookHandler = (event) => ({
      handled: true,
      data: { tool: event.data.tool, intercepted: true },
    });

    const plugin = definePlugin({
      name: 'hook-integration',
      description: 'Integration test plugin with hooks',
      hooks: [
        { point: HookPoint.BeforeToolExecute, handler, priority: 5 },
      ],
    });

    const registry = new HookRegistry();
    for (const hook of plugin.hooks!) {
      registry.register(hook.point, hook.handler, hook.priority);
    }

    expect(registry.hasHandlers(HookPoint.BeforeToolExecute)).toBe(true);

    const results = await registry.execute(HookPoint.BeforeToolExecute, {
      type: HookPoint.BeforeToolExecute,
      data: { tool: 'health-check' },
      timestamp: Date.now(),
      source: 'integration-test',
    });

    expect(results).toHaveLength(1);
    expect(results[0].handled).toBe(true);
    expect(results[0].data).toEqual({ tool: 'health-check', intercepted: true });
  });

  it('defines a plugin with UI extensions and registers them in UIExtensionRegistry', () => {
    const plugin = definePlugin({
      name: 'ui-integration',
      description: 'Integration test plugin with UI extensions',
      uiExtensions: [
        { point: 'dashboard-widget', component: 'MetricsWidget', order: 1 },
        { point: 'settings-panel', component: 'PluginSettings', order: 2 },
        { point: 'dashboard-widget', component: 'AlertsWidget', order: 0 },
      ],
    });

    const registry = new UIExtensionRegistry();
    for (const ext of plugin.uiExtensions!) {
      registry.register(ext);
    }

    expect(registry.getExtensionCount()).toBe(3);

    const dashboardWidgets = registry.getExtensions('dashboard-widget');
    expect(dashboardWidgets).toHaveLength(2);
    // Sorted by order: AlertsWidget (0) before MetricsWidget (1)
    expect(dashboardWidgets[0].component).toBe('AlertsWidget');
    expect(dashboardWidgets[1].component).toBe('MetricsWidget');

    const settingsPanels = registry.getExtensions('settings-panel');
    expect(settingsPanels).toHaveLength(1);
    expect(settingsPanels[0].component).toBe('PluginSettings');
  });

  it('runs plugin activate/deactivate lifecycle with mock context', async () => {
    const activatedPlugins: string[] = [];
    const deactivatedPlugins: string[] = [];

    const plugin = definePlugin({
      name: 'lifecycle-test',
      description: 'Tests plugin lifecycle',
      activate: async (ctx) => {
        ctx.logger.info(`Activating ${ctx.pluginId}`);
        ctx.emitEvent('plugin-activated', { id: ctx.pluginId });
        activatedPlugins.push(ctx.pluginId);
      },
      deactivate: async () => {
        deactivatedPlugins.push('lifecycle-test');
      },
    });

    const ctx = mockPluginContext('lifecycle-test');

    // Activate
    await plugin.activate!(ctx);
    expect(activatedPlugins).toContain('lifecycle-test');
    expect(ctx.getLogs()).toContain('[INFO] Activating lifecycle-test');
    expect(ctx.getEvents()).toEqual([
      { event: 'plugin-activated', data: { id: 'lifecycle-test' } },
    ]);

    // Deactivate
    await plugin.deactivate!();
    expect(deactivatedPlugins).toContain('lifecycle-test');
  });

  it('full lifecycle: define, register hooks, register UI, execute', async () => {
    const executionLog: string[] = [];

    const plugin = definePlugin({
      name: 'full-lifecycle',
      description: 'Full lifecycle integration test',
      version: '1.0.0',
      tags: ['integration', 'full'],
      hooks: [
        {
          point: HookPoint.BeforeMonitorCheck,
          handler: (event) => {
            executionLog.push(`before-check: ${event.data.monitor}`);
            return { handled: true, data: { approved: true } };
          },
          priority: 1,
        },
        {
          point: HookPoint.AfterMonitorCheck,
          handler: (event) => {
            executionLog.push(`after-check: ${event.data.monitor}`);
            return { handled: true };
          },
        },
        {
          point: HookPoint.OnThresholdBreach,
          handler: (event) => {
            executionLog.push(`breach: ${event.data.metric}`);
            return { handled: true, data: { alerted: true } };
          },
        },
      ],
      uiExtensions: [
        { point: 'dashboard-widget', component: 'MonitorWidget', order: 1 },
        { point: 'status-bar', component: 'MonitorStatus', order: 0 },
      ],
      activate: (ctx) => {
        ctx.logger.info('Full lifecycle plugin activated');
        executionLog.push('activated');
      },
    });

    // Verify metadata
    const meta = getPluginMetadata(plugin);
    expect(meta.name).toBe('full-lifecycle');
    expect(meta.version).toBe('1.0.0');
    expect(meta.tags).toEqual(['integration', 'full']);
    expect(meta.hookPoints).toHaveLength(3);
    expect(meta.uiExtensionPoints).toEqual(['dashboard-widget', 'status-bar']);

    // Register hooks
    const hookRegistry = new HookRegistry();
    for (const hook of plugin.hooks!) {
      hookRegistry.register(hook.point, hook.handler, hook.priority);
    }
    expect(hookRegistry.getHandlerCount()).toBe(3);

    // Register UI extensions
    const uiRegistry = new UIExtensionRegistry();
    for (const ext of plugin.uiExtensions!) {
      uiRegistry.register(ext);
    }
    expect(uiRegistry.getExtensionCount()).toBe(2);

    // Activate plugin
    const ctx = mockPluginContext('full-lifecycle');
    await plugin.activate!(ctx);
    expect(executionLog).toContain('activated');

    // Execute hooks
    const beforeResults = await hookRegistry.execute(HookPoint.BeforeMonitorCheck, {
      type: HookPoint.BeforeMonitorCheck,
      data: { monitor: 'cpu-check' },
      timestamp: Date.now(),
      source: 'test',
    });
    expect(beforeResults[0].data).toEqual({ approved: true });

    const breachResults = await hookRegistry.execute(HookPoint.OnThresholdBreach, {
      type: HookPoint.OnThresholdBreach,
      data: { metric: 'cpu-usage' },
      timestamp: Date.now(),
      source: 'test',
    });
    expect(breachResults[0].data).toEqual({ alerted: true });

    expect(executionLog).toEqual([
      'activated',
      'before-check: cpu-check',
      'breach: cpu-usage',
    ]);
  });

  it('plugin with settings validation using Zod schema', () => {
    const settingsSchema = z.object({
      apiKey: z.string().min(1),
      maxRetries: z.number().int().min(0).max(10).default(3),
      endpoint: z.string().url(),
      enabled: z.boolean().default(true),
    });

    const plugin = definePlugin({
      name: 'settings-validation',
      description: 'Plugin with validated settings',
      settings: settingsSchema,
    });

    expect(plugin.settings).toBeDefined();

    // Valid settings
    const validResult = plugin.settings!.safeParse({
      apiKey: 'sk-12345',
      maxRetries: 5,
      endpoint: 'https://api.example.com',
      enabled: false,
    });
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data.apiKey).toBe('sk-12345');
      expect(validResult.data.maxRetries).toBe(5);
      expect(validResult.data.endpoint).toBe('https://api.example.com');
      expect(validResult.data.enabled).toBe(false);
    }

    // Invalid settings - missing required field
    const invalidResult = plugin.settings!.safeParse({
      maxRetries: 5,
      endpoint: 'not-a-url',
    });
    expect(invalidResult.success).toBe(false);

    // Settings with defaults
    const defaultResult = plugin.settings!.safeParse({
      apiKey: 'sk-abc',
      endpoint: 'https://api.example.com',
    });
    expect(defaultResult.success).toBe(true);
    if (defaultResult.success) {
      expect(defaultResult.data.maxRetries).toBe(3);
      expect(defaultResult.data.enabled).toBe(true);
    }
  });
});
