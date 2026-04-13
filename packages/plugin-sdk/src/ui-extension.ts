import type { UIExtension, UIExtensionPoint } from './types.js';

interface RegisteredExtension {
  extension: UIExtension;
  registeredAt: number;
}

const VALID_POINTS: UIExtensionPoint[] = [
  'dashboard-widget',
  'settings-panel',
  'tool-sidebar',
  'alert-action',
  'navigation-item',
  'status-bar',
];

/** Registry that manages UI extensions for SigOps extension points */
export class UIExtensionRegistry {
  private extensions: Map<UIExtensionPoint, RegisteredExtension[]> = new Map();

  /** Register a UI extension at its declared extension point */
  register(extension: UIExtension): void {
    if (!this.extensions.has(extension.point)) {
      this.extensions.set(extension.point, []);
    }
    this.extensions.get(extension.point)!.push({
      extension,
      registeredAt: Date.now(),
    });
  }

  /** Unregister all extensions with the given component name */
  unregister(component: string): boolean {
    let found = false;
    for (const [point, registered] of this.extensions.entries()) {
      const filtered = registered.filter((r) => r.extension.component !== component);
      if (filtered.length !== registered.length) {
        found = true;
        if (filtered.length === 0) {
          this.extensions.delete(point);
        } else {
          this.extensions.set(point, filtered);
        }
      }
    }
    return found;
  }

  /** Get extensions registered at a given point, sorted by order (ascending) */
  getExtensions(point: UIExtensionPoint): UIExtension[] {
    const registered = this.extensions.get(point);
    if (!registered) return [];
    return registered
      .map((r) => r.extension)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /** Get all extension points that have registered extensions */
  getRegisteredPoints(): UIExtensionPoint[] {
    return Array.from(this.extensions.keys());
  }

  /** Check if a given extension point has any registered extensions */
  hasExtensions(point: UIExtensionPoint): boolean {
    const registered = this.extensions.get(point);
    return !!registered && registered.length > 0;
  }

  /** Get the total number of registered extensions across all points */
  getExtensionCount(): number {
    let count = 0;
    for (const registered of this.extensions.values()) {
      count += registered.length;
    }
    return count;
  }

  /** Clear all registered extensions */
  clear(): void {
    this.extensions.clear();
  }

  /** Get all valid UI extension points */
  static getValidPoints(): UIExtensionPoint[] {
    return [...VALID_POINTS];
  }
}
