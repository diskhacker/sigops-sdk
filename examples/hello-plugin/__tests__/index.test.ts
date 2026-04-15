import { describe, it, expect } from 'vitest';
import { HookPoint, HookRegistry, mockPluginContext } from '@sigops/plugin-sdk';
import { helloPlugin } from '../src/index.js';

describe('hello-plugin example', () => {
  it('is a valid PluginDefinition', () => {
    expect(helloPlugin.name).toBe('hello-plugin');
    expect(helloPlugin.hooks).toHaveLength(1);
    expect(helloPlugin.uiExtensions).toHaveLength(1);
  });

  it('registers an AfterToolExecute hook that returns handled:true', async () => {
    const registry = new HookRegistry();
    for (const h of helloPlugin.hooks ?? []) {
      registry.register(h.point, h.handler, h.priority);
    }
    const results = await registry.execute(HookPoint.AfterToolExecute, {
      type: HookPoint.AfterToolExecute,
      data: { toolName: 'noop' },
      timestamp: Date.now(),
      source: 'test',
    });
    expect(results).toHaveLength(1);
    expect(results[0].handled).toBe(true);
  });

  it('activates without throwing', async () => {
    const ctx = mockPluginContext('hello');
    await expect(helloPlugin.activate?.(ctx)).resolves.not.toThrow();
    expect(ctx.getLogs().some((l) => l.includes('hello-plugin activated'))).toBe(true);
  });
});
