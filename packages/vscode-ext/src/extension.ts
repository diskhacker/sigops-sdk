import { getCommandDefinitions } from './commands.js';

/** Extension activation state */
export interface ExtensionState {
  active: boolean;
  languageId: string;
  registeredCommands: string[];
  diagnosticsEnabled: boolean;
  formattingEnabled: boolean;
}

/** Extension configuration */
export interface ExtensionConfig {
  enableDiagnostics: boolean;
  enableFormatting: boolean;
  enableCompletion: boolean;
  lintOnSave: boolean;
  formatOnSave: boolean;
  maxDiagnostics: number;
}

export const DEFAULT_CONFIG: ExtensionConfig = {
  enableDiagnostics: true,
  enableFormatting: true,
  enableCompletion: true,
  lintOnSave: true,
  formatOnSave: false,
  maxDiagnostics: 100,
};

export interface CommandDefinition {
  id: string;
  title: string;
  handler: (...args: any[]) => any;
}

/** Creates initial extension state */
export function createExtensionState(config?: Partial<ExtensionConfig>): ExtensionState {
  const merged = { ...DEFAULT_CONFIG, ...config };
  return {
    active: false,
    languageId: 'sel',
    registeredCommands: [],
    diagnosticsEnabled: merged.enableDiagnostics,
    formattingEnabled: merged.enableFormatting,
  };
}

/** Activates the extension (returns list of commands to register) */
export function activate(config?: Partial<ExtensionConfig>): { state: ExtensionState; commands: CommandDefinition[] } {
  const merged = { ...DEFAULT_CONFIG, ...config };
  const commandDefs = getCommandDefinitions();

  const commands: CommandDefinition[] = commandDefs.map((def) => ({
    id: def.id,
    title: def.title,
    handler: () => {},
  }));

  const state: ExtensionState = {
    active: true,
    languageId: 'sel',
    registeredCommands: commands.map((c) => c.id),
    diagnosticsEnabled: merged.enableDiagnostics,
    formattingEnabled: merged.enableFormatting,
  };

  return { state, commands };
}

/** Deactivates the extension */
export function deactivate(state: ExtensionState): ExtensionState {
  return {
    ...state,
    active: false,
    registeredCommands: [],
  };
}
