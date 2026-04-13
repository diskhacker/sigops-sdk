import { describe, it, expect } from 'vitest';
import { definePlugin, getPluginMetadata, mockPluginContext } from '../src/define-plugin.js';
import { HookPoint } from '../src/hooks.js';
import type { HookHandler, HookEvent, HookResult, UIExtension } from '../src/types.js';
import { z } from 'zod';

describe('definePlugin', () => {
  it('creates a valid plugin with all fields', () => {
    const activate = async () => {};
    const deactivate = async () => {};
    const settings = z.object({ threshold: z.number() });
    const handler: HookHandler = () => ({ handled: true });

    const plugin = definePlugin({
      name: 'my-plugin',
      description: 'A test plugin',
      version: '1.0.0',
      hooks: [{ point: HookPoint.BeforeToolExecute, handler }],
      uiExtensions: [{ point: 'dashboard-widget', component: 'MyWidget' }],
      settings,
      activate,
      deactivate,
      tags: ['monitoring', 'alerts'],
    });

    expect(plugin.name).toBe('my-plugin');
    expect(plugin.description).toBe('A test plugin');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.hooks).toHaveLength(1);
    expect(plugin.uiExtensions).toHaveLength(1);
    expect(plugin.settings).toBe(settings);
    expect(plugin.activate).toBe(activate);
    expect(plugin.deactivate).toBe(deactivate);
    expect(plugin.tags).toEqual(['monitoring', 'alerts']);
  });

  it('applies default version when not provided', () => {
    const plugin = definePlugin({
      name: 'my-plugin',
      description: 'A test plugin',
    });

    expect(plugin.version).toBe('0.1.0');
  });

  it('throws on missing name', () => {
    expect(() =>
      definePlugin({ name: '', description: 'desc' }),
    ).toThrow('Plugin name is required');
  });

  it('throws on invalid name with uppercase', () => {
    expect(() =>
      definePlugin({ name: 'MyPlugin', description: 'desc' }),
    ).toThrow('Plugin name must be kebab-case');
  });

  it('throws on invalid name with spaces', () => {
    expect(() =>
      definePlugin({ name: 'my plugin', description: 'desc' }),
    ).toThrow('Plugin name must be kebab-case');
  });

  it('throws on missing description', () => {
    expect(() =>
      definePlugin({ name: 'my-plugin', description: '' }),
    ).toThrow('Plugin description is required');
  });

  it('preserves hooks and uiExtensions', () => {
    const handler: HookHandler = () => ({ handled: true });
    const hooks = [
      { point: HookPoint.BeforeToolExecute, handler, priority: 5 },
      { point: HookPoint.AfterToolExecute, handler },
    ];
    const uiExtensions: UIExtension[] = [
      { point: 'dashboard-widget', component: 'WidgetA', order: 1 },
      { point: 'settings-panel', component: 'PanelB', order: 2 },
    ];

    const plugin = definePlugin({
      name: 'my-plugin',
      description: 'desc',
      hooks,
      uiExtensions,
    });

    expect(plugin.hooks).toEqual(hooks);
    expect(plugin.uiExtensions).toEqual(uiExtensions);
  });
});

describe('getPluginMetadata', () => {
  it('extracts metadata correctly', () => {
    const plugin = definePlugin({
      name: 'test-plugin',
      description: 'Test description',
      version: '2.0.0',
      tags: ['test'],
    });

    const meta = getPluginMetadata(plugin);

    expect(meta.name).toBe('test-plugin');
    expect(meta.description).toBe('Test description');
    expect(meta.version).toBe('2.0.0');
    expect(meta.tags).toEqual(['test']);
    expect(meta.hookPoints).toEqual([]);
    expect(meta.uiExtensionPoints).toEqual([]);
  });

  it('lists hook points from plugin definition', () => {
    const handler: HookHandler = () => ({ handled: true });
    const plugin = definePlugin({
      name: 'hooks-plugin',
      description: 'Plugin with hooks',
      hooks: [
        { point: HookPoint.BeforeToolExecute, handler },
        { point: HookPoint.OnThresholdBreach, handler },
      ],
      uiExtensions: [{ point: 'dashboard-widget', component: 'W' }],
    });

    const meta = getPluginMetadata(plugin);

    expect(meta.hookPoints).toEqual([
      HookPoint.BeforeToolExecute,
      HookPoint.OnThresholdBreach,
    ]);
    expect(meta.uiExtensionPoints).toEqual(['dashboard-widget']);
  });
});

describe('mockPluginContext', () => {
  it('creates a valid context with default plugin ID', () => {
    const ctx = mockPluginContext();

    expect(ctx.pluginId).toBe('test-plugin');
    expect(ctx.settings).toEqual({});
    expect(typeof ctx.logger.debug).toBe('function');
    expect(typeof ctx.logger.info).toBe('function');
    expect(typeof ctx.logger.warn).toBe('function');
    expect(typeof ctx.logger.error).toBe('function');
    expect(typeof ctx.emitEvent).toBe('function');
  });

  it('records logs and events', () => {
    const ctx = mockPluginContext('my-id');

    expect(ctx.pluginId).toBe('my-id');

    ctx.logger.debug('debug msg');
    ctx.logger.info('info msg');
    ctx.logger.warn('warn msg');
    ctx.logger.error('error msg');
    ctx.emitEvent('custom-event', { key: 'value' });
    ctx.emitEvent('simple-event');

    expect(ctx.getLogs()).toEqual([
      '[DEBUG] debug msg',
      '[INFO] info msg',
      '[WARN] warn msg',
      '[ERROR] error msg',
    ]);
    expect(ctx.getEvents()).toEqual([
      { event: 'custom-event', data: { key: 'value' } },
      { event: 'simple-event', data: undefined },
    ]);
  });
});
