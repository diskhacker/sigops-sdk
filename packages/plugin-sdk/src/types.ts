import { z } from 'zod';
import type { HookPoint } from './hooks.js';

/** Complete plugin definition returned by definePlugin() */
export interface PluginDefinition {
  name: string;
  description: string;
  version: string;
  hooks?: HookRegistration[];
  uiExtensions?: UIExtension[];
  settings?: z.ZodType<any>;
  activate?: (ctx: PluginContext) => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
  tags?: string[];
}

/** Registration entry for a hook handler */
export interface HookRegistration {
  point: HookPoint;
  handler: HookHandler;
  priority?: number;
}

/** Function that handles a hook event */
export type HookHandler = (event: HookEvent) => Promise<HookResult> | HookResult;

/** Event passed to hook handlers */
export interface HookEvent {
  type: HookPoint;
  data: any;
  timestamp: number;
  source: string;
}

/** Result returned from a hook handler */
export interface HookResult {
  handled: boolean;
  data?: any;
  error?: string;
}

/** UI extension registration */
export interface UIExtension {
  point: UIExtensionPoint;
  component: string;
  props?: Record<string, any>;
  order?: number;
}

/** Available UI extension mount points */
export type UIExtensionPoint =
  | 'dashboard-widget'
  | 'settings-panel'
  | 'tool-sidebar'
  | 'alert-action'
  | 'navigation-item'
  | 'status-bar';

/** Runtime context provided to plugins on activation */
export interface PluginContext {
  pluginId: string;
  logger: PluginLogger;
  settings: Record<string, any>;
  emitEvent: (event: string, data?: any) => void;
}

/** Logger interface available to plugins */
export interface PluginLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

/** Extracted metadata from a plugin definition */
export interface PluginMetadata {
  name: string;
  description: string;
  version: string;
  tags: string[];
  hookPoints: HookPoint[];
  uiExtensionPoints: UIExtensionPoint[];
}
