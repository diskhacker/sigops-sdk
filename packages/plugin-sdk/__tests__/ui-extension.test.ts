import { describe, it, expect } from 'vitest';
import { UIExtensionRegistry } from '../src/ui-extension.js';
import type { UIExtension, UIExtensionPoint } from '../src/types.js';

describe('UIExtensionRegistry', () => {
  it('registers an extension', () => {
    const registry = new UIExtensionRegistry();
    const ext: UIExtension = {
      point: 'dashboard-widget',
      component: 'MyWidget',
    };

    registry.register(ext);

    expect(registry.hasExtensions('dashboard-widget')).toBe(true);
    expect(registry.getExtensionCount()).toBe(1);
  });

  it('getExtensions returns extensions for a point', () => {
    const registry = new UIExtensionRegistry();
    registry.register({ point: 'dashboard-widget', component: 'WidgetA' });
    registry.register({ point: 'dashboard-widget', component: 'WidgetB' });

    const extensions = registry.getExtensions('dashboard-widget');

    expect(extensions).toHaveLength(2);
    expect(extensions[0].component).toBe('WidgetA');
    expect(extensions[1].component).toBe('WidgetB');
  });

  it('getExtensions returns empty array for unregistered point', () => {
    const registry = new UIExtensionRegistry();

    const extensions = registry.getExtensions('settings-panel');
    expect(extensions).toEqual([]);
  });

  it('returns extensions sorted by order', () => {
    const registry = new UIExtensionRegistry();
    registry.register({ point: 'tool-sidebar', component: 'C', order: 30 });
    registry.register({ point: 'tool-sidebar', component: 'A', order: 10 });
    registry.register({ point: 'tool-sidebar', component: 'B', order: 20 });
    registry.register({ point: 'tool-sidebar', component: 'D' }); // default 0

    const extensions = registry.getExtensions('tool-sidebar');

    expect(extensions.map((e) => e.component)).toEqual(['D', 'A', 'B', 'C']);
  });

  it('unregister removes extensions by component name', () => {
    const registry = new UIExtensionRegistry();
    registry.register({ point: 'dashboard-widget', component: 'WidgetA' });
    registry.register({ point: 'settings-panel', component: 'WidgetA' });
    registry.register({ point: 'dashboard-widget', component: 'WidgetB' });

    const result = registry.unregister('WidgetA');

    expect(result).toBe(true);
    expect(registry.getExtensionCount()).toBe(1);
    expect(registry.getExtensions('dashboard-widget')).toHaveLength(1);
    expect(registry.getExtensions('dashboard-widget')[0].component).toBe('WidgetB');
    expect(registry.hasExtensions('settings-panel')).toBe(false);
  });

  it('unregister returns false if component is not found', () => {
    const registry = new UIExtensionRegistry();
    registry.register({ point: 'dashboard-widget', component: 'WidgetA' });

    const result = registry.unregister('NonExistent');
    expect(result).toBe(false);
  });

  it('hasExtensions checks correctly', () => {
    const registry = new UIExtensionRegistry();

    expect(registry.hasExtensions('alert-action')).toBe(false);

    registry.register({ point: 'alert-action', component: 'AlertBtn' });
    expect(registry.hasExtensions('alert-action')).toBe(true);
  });

  it('getExtensionCount returns total count across all points', () => {
    const registry = new UIExtensionRegistry();
    registry.register({ point: 'dashboard-widget', component: 'A' });
    registry.register({ point: 'settings-panel', component: 'B' });
    registry.register({ point: 'tool-sidebar', component: 'C' });

    expect(registry.getExtensionCount()).toBe(3);
  });

  it('getRegisteredPoints returns active points', () => {
    const registry = new UIExtensionRegistry();
    registry.register({ point: 'dashboard-widget', component: 'A' });
    registry.register({ point: 'status-bar', component: 'B' });

    const points = registry.getRegisteredPoints();
    expect(points).toContain('dashboard-widget');
    expect(points).toContain('status-bar');
    expect(points).toHaveLength(2);
  });

  it('getValidPoints returns all 6 extension points', () => {
    const points = UIExtensionRegistry.getValidPoints();

    expect(points).toHaveLength(6);
    expect(points).toContain('dashboard-widget');
    expect(points).toContain('settings-panel');
    expect(points).toContain('tool-sidebar');
    expect(points).toContain('alert-action');
    expect(points).toContain('navigation-item');
    expect(points).toContain('status-bar');
  });
});
