import type { HookHandler, HookEvent, HookResult } from './types.js';

/** Available hook points in the SigOps lifecycle */
export enum HookPoint {
  // Tool lifecycle
  BeforeToolExecute = 'before-tool-execute',
  AfterToolExecute = 'after-tool-execute',
  OnToolError = 'on-tool-error',

  // Alert lifecycle
  BeforeAlertSend = 'before-alert-send',
  AfterAlertSend = 'after-alert-send',
  OnAlertEscalation = 'on-alert-escalation',

  // Monitor lifecycle
  BeforeMonitorCheck = 'before-monitor-check',
  AfterMonitorCheck = 'after-monitor-check',
  OnThresholdBreach = 'on-threshold-breach',

  // System
  OnPluginActivate = 'on-plugin-activate',
  OnPluginDeactivate = 'on-plugin-deactivate',
  OnConfigChange = 'on-config-change',
}

interface RegisteredHook {
  handler: HookHandler;
  priority: number;
}

/** Registry that manages hook handlers for SigOps lifecycle events */
export class HookRegistry {
  private hooks: Map<HookPoint, RegisteredHook[]> = new Map();

  /** Register a hook handler for a given point */
  register(point: HookPoint, handler: HookHandler, priority: number = 10): void {
    if (!this.hooks.has(point)) {
      this.hooks.set(point, []);
    }
    const handlers = this.hooks.get(point)!;
    handlers.push({ handler, priority });
    handlers.sort((a, b) => a.priority - b.priority);
  }

  /** Unregister a specific handler from a hook point */
  unregister(point: HookPoint, handler: HookHandler): boolean {
    const handlers = this.hooks.get(point);
    if (!handlers) return false;

    const index = handlers.findIndex((h) => h.handler === handler);
    if (index === -1) return false;

    handlers.splice(index, 1);
    if (handlers.length === 0) {
      this.hooks.delete(point);
    }
    return true;
  }

  /** Execute all handlers for a hook point sequentially, collecting results */
  async execute(point: HookPoint, event: HookEvent): Promise<HookResult[]> {
    const handlers = this.hooks.get(point);
    if (!handlers || handlers.length === 0) return [];

    const results: HookResult[] = [];
    for (const { handler } of handlers) {
      try {
        const result = await handler(event);
        results.push(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ handled: false, error: message });
      }
    }
    return results;
  }

  /** Get registered handlers for a specific hook point */
  getHandlers(point: HookPoint): RegisteredHook[] {
    return this.hooks.get(point) ?? [];
  }

  /** Check if any handlers are registered for a hook point */
  hasHandlers(point: HookPoint): boolean {
    const handlers = this.hooks.get(point);
    return !!handlers && handlers.length > 0;
  }

  /** Clear all registered handlers */
  clear(): void {
    this.hooks.clear();
  }

  /** Clear handlers for a specific hook point */
  clearPoint(point: HookPoint): void {
    this.hooks.delete(point);
  }

  /** Get all hook points that have registered handlers */
  getRegisteredPoints(): HookPoint[] {
    return Array.from(this.hooks.keys());
  }

  /** Get the total number of registered handlers across all points */
  getHandlerCount(): number {
    let count = 0;
    for (const handlers of this.hooks.values()) {
      count += handlers.length;
    }
    return count;
  }
}
