import { describe, it, expect } from 'vitest';
import { HookPoint, HookRegistry } from '../src/hooks.js';
import type { HookHandler, HookEvent, HookResult } from '../src/types.js';

function makeEvent(point: HookPoint, data: any = {}): HookEvent {
  return { type: point, data, timestamp: Date.now(), source: 'test' };
}

describe('HookPoint', () => {
  it('has all expected enum values', () => {
    expect(HookPoint.BeforeToolExecute).toBe('before-tool-execute');
    expect(HookPoint.AfterToolExecute).toBe('after-tool-execute');
    expect(HookPoint.OnToolError).toBe('on-tool-error');
    expect(HookPoint.BeforeAlertSend).toBe('before-alert-send');
    expect(HookPoint.AfterAlertSend).toBe('after-alert-send');
    expect(HookPoint.OnAlertEscalation).toBe('on-alert-escalation');
    expect(HookPoint.BeforeMonitorCheck).toBe('before-monitor-check');
    expect(HookPoint.AfterMonitorCheck).toBe('after-monitor-check');
    expect(HookPoint.OnThresholdBreach).toBe('on-threshold-breach');
    expect(HookPoint.OnPluginActivate).toBe('on-plugin-activate');
    expect(HookPoint.OnPluginDeactivate).toBe('on-plugin-deactivate');
    expect(HookPoint.OnConfigChange).toBe('on-config-change');
  });
});

describe('HookRegistry', () => {
  it('registers a handler', () => {
    const registry = new HookRegistry();
    const handler: HookHandler = () => ({ handled: true });

    registry.register(HookPoint.BeforeToolExecute, handler);

    expect(registry.hasHandlers(HookPoint.BeforeToolExecute)).toBe(true);
    expect(registry.getHandlers(HookPoint.BeforeToolExecute)).toHaveLength(1);
  });

  it('executes a handler and returns result', async () => {
    const registry = new HookRegistry();
    const handler: HookHandler = (event) => ({
      handled: true,
      data: { received: event.data },
    });

    registry.register(HookPoint.BeforeToolExecute, handler);
    const results = await registry.execute(
      HookPoint.BeforeToolExecute,
      makeEvent(HookPoint.BeforeToolExecute, { tool: 'ping' }),
    );

    expect(results).toHaveLength(1);
    expect(results[0].handled).toBe(true);
    expect(results[0].data).toEqual({ received: { tool: 'ping' } });
  });

  it('returns empty array when executing with no handlers', async () => {
    const registry = new HookRegistry();
    const results = await registry.execute(
      HookPoint.AfterToolExecute,
      makeEvent(HookPoint.AfterToolExecute),
    );

    expect(results).toEqual([]);
  });

  it('executes handlers in priority order', async () => {
    const registry = new HookRegistry();
    const order: number[] = [];

    const handlerA: HookHandler = () => {
      order.push(1);
      return { handled: true };
    };
    const handlerB: HookHandler = () => {
      order.push(2);
      return { handled: true };
    };
    const handlerC: HookHandler = () => {
      order.push(3);
      return { handled: true };
    };

    registry.register(HookPoint.BeforeToolExecute, handlerC, 20);
    registry.register(HookPoint.BeforeToolExecute, handlerA, 1);
    registry.register(HookPoint.BeforeToolExecute, handlerB, 10);

    await registry.execute(
      HookPoint.BeforeToolExecute,
      makeEvent(HookPoint.BeforeToolExecute),
    );

    expect(order).toEqual([1, 2, 3]);
  });

  it('uses default priority of 10', () => {
    const registry = new HookRegistry();
    const handler: HookHandler = () => ({ handled: true });

    registry.register(HookPoint.BeforeToolExecute, handler);
    const handlers = registry.getHandlers(HookPoint.BeforeToolExecute);

    expect(handlers[0].priority).toBe(10);
  });

  it('unregisters a handler', () => {
    const registry = new HookRegistry();
    const handler: HookHandler = () => ({ handled: true });

    registry.register(HookPoint.BeforeToolExecute, handler);
    expect(registry.hasHandlers(HookPoint.BeforeToolExecute)).toBe(true);

    const result = registry.unregister(HookPoint.BeforeToolExecute, handler);
    expect(result).toBe(true);
    expect(registry.hasHandlers(HookPoint.BeforeToolExecute)).toBe(false);
  });

  it('returns false when unregistering a handler that is not found', () => {
    const registry = new HookRegistry();
    const handler: HookHandler = () => ({ handled: true });

    const result = registry.unregister(HookPoint.BeforeToolExecute, handler);
    expect(result).toBe(false);
  });

  it('hasHandlers returns true when handlers exist and false otherwise', () => {
    const registry = new HookRegistry();

    expect(registry.hasHandlers(HookPoint.OnToolError)).toBe(false);

    registry.register(HookPoint.OnToolError, () => ({ handled: true }));
    expect(registry.hasHandlers(HookPoint.OnToolError)).toBe(true);
  });

  it('getHandlers returns registered handlers', () => {
    const registry = new HookRegistry();
    const handlerA: HookHandler = () => ({ handled: true });
    const handlerB: HookHandler = () => ({ handled: false });

    registry.register(HookPoint.BeforeAlertSend, handlerA, 5);
    registry.register(HookPoint.BeforeAlertSend, handlerB, 15);

    const handlers = registry.getHandlers(HookPoint.BeforeAlertSend);
    expect(handlers).toHaveLength(2);
    expect(handlers[0].handler).toBe(handlerA);
    expect(handlers[0].priority).toBe(5);
    expect(handlers[1].handler).toBe(handlerB);
    expect(handlers[1].priority).toBe(15);
  });

  it('clear removes all handlers', () => {
    const registry = new HookRegistry();
    registry.register(HookPoint.BeforeToolExecute, () => ({ handled: true }));
    registry.register(HookPoint.AfterToolExecute, () => ({ handled: true }));

    registry.clear();

    expect(registry.getHandlerCount()).toBe(0);
    expect(registry.hasHandlers(HookPoint.BeforeToolExecute)).toBe(false);
    expect(registry.hasHandlers(HookPoint.AfterToolExecute)).toBe(false);
  });

  it('clearPoint removes handlers for a specific point only', () => {
    const registry = new HookRegistry();
    registry.register(HookPoint.BeforeToolExecute, () => ({ handled: true }));
    registry.register(HookPoint.AfterToolExecute, () => ({ handled: true }));

    registry.clearPoint(HookPoint.BeforeToolExecute);

    expect(registry.hasHandlers(HookPoint.BeforeToolExecute)).toBe(false);
    expect(registry.hasHandlers(HookPoint.AfterToolExecute)).toBe(true);
  });

  it('catches handler errors and returns them in results', async () => {
    const registry = new HookRegistry();
    const handler: HookHandler = () => {
      throw new Error('handler failed');
    };

    registry.register(HookPoint.OnToolError, handler);
    const results = await registry.execute(
      HookPoint.OnToolError,
      makeEvent(HookPoint.OnToolError),
    );

    expect(results).toHaveLength(1);
    expect(results[0].handled).toBe(false);
    expect(results[0].error).toBe('handler failed');
  });

  it('getRegisteredPoints returns points with handlers', () => {
    const registry = new HookRegistry();
    registry.register(HookPoint.BeforeToolExecute, () => ({ handled: true }));
    registry.register(HookPoint.OnThresholdBreach, () => ({ handled: true }));

    const points = registry.getRegisteredPoints();
    expect(points).toContain(HookPoint.BeforeToolExecute);
    expect(points).toContain(HookPoint.OnThresholdBreach);
    expect(points).toHaveLength(2);
  });

  it('getHandlerCount returns the total count across all points', () => {
    const registry = new HookRegistry();
    registry.register(HookPoint.BeforeToolExecute, () => ({ handled: true }));
    registry.register(HookPoint.BeforeToolExecute, () => ({ handled: true }));
    registry.register(HookPoint.AfterToolExecute, () => ({ handled: true }));

    expect(registry.getHandlerCount()).toBe(3);
  });

  it('multiple handlers on the same point all execute', async () => {
    const registry = new HookRegistry();
    const results: string[] = [];

    registry.register(HookPoint.BeforeAlertSend, () => {
      results.push('first');
      return { handled: true };
    });
    registry.register(HookPoint.BeforeAlertSend, () => {
      results.push('second');
      return { handled: true };
    });
    registry.register(HookPoint.BeforeAlertSend, () => {
      results.push('third');
      return { handled: true };
    });

    const hookResults = await registry.execute(
      HookPoint.BeforeAlertSend,
      makeEvent(HookPoint.BeforeAlertSend),
    );

    expect(hookResults).toHaveLength(3);
    expect(results).toEqual(['first', 'second', 'third']);
  });
});
