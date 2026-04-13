import { z } from 'zod';
import type { PluginDefinition, PluginMetadata, PluginContext, PluginLogger, HookRegistration, UIExtension } from './types.js';
import { HookPoint } from './hooks.js';
import { HookRegistry } from './hooks.js';
import { UIExtensionRegistry } from './ui-extension.js';

/** Configuration accepted by definePlugin() */
export interface DefinePluginConfig {
  name: string;
  description: string;
  version?: string;
  hooks?: HookRegistration[];
  uiExtensions?: UIExtension[];
  settings?: z.ZodType<any>;
  activate?: (ctx: PluginContext) => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
  tags?: string[];
}

/**
 * Define a SigOps plugin with the given configuration.
 * Validates required fields and returns a normalized PluginDefinition.
 */
export function definePlugin(config: DefinePluginConfig): PluginDefinition {
  if (!config.name || typeof config.name !== 'string') {
    throw new Error('Plugin name is required');
  }
  if (!/^[a-z][a-z0-9-]*$/.test(config.name)) {
    throw new Error('Plugin name must be kebab-case');
  }
  if (!config.description) {
    throw new Error('Plugin description is required');
  }

  return {
    name: config.name,
    description: config.description,
    version: config.version ?? '0.1.0',
    hooks: config.hooks ?? [],
    uiExtensions: config.uiExtensions ?? [],
    settings: config.settings,
    activate: config.activate,
    deactivate: config.deactivate,
    tags: config.tags ?? [],
  };
}

/** Extract metadata from a plugin definition */
export function getPluginMetadata(plugin: PluginDefinition): PluginMetadata {
  return {
    name: plugin.name,
    description: plugin.description,
    version: plugin.version,
    tags: plugin.tags ?? [],
    hookPoints: (plugin.hooks ?? []).map((h) => h.point),
    uiExtensionPoints: (plugin.uiExtensions ?? []).map((e) => e.point),
  };
}

/** Create a mock PluginContext for testing purposes */
export function mockPluginContext(
  pluginId?: string,
): PluginContext & { getLogs(): string[]; getEvents(): { event: string; data?: any }[] } {
  const logs: string[] = [];
  const events: { event: string; data?: any }[] = [];

  const logger: PluginLogger = {
    debug: (msg) => logs.push(`[DEBUG] ${msg}`),
    info: (msg) => logs.push(`[INFO] ${msg}`),
    warn: (msg) => logs.push(`[WARN] ${msg}`),
    error: (msg) => logs.push(`[ERROR] ${msg}`),
  };

  return {
    pluginId: pluginId ?? 'test-plugin',
    logger,
    settings: {},
    emitEvent: (event, data) => events.push({ event, data }),
    getLogs: () => [...logs],
    getEvents: () => [...events],
  };
}
