import { getCommandDefinitions } from './commands.js';

/** Extension version — kept in sync with package.json */
export const EXTENSION_VERSION = '1.0.0';

/** Extension activation state */
export interface ExtensionState {
  active: boolean;
  languageId: string;
  registeredCommands: string[];
  diagnosticsEnabled: boolean;
  formattingEnabled: boolean;
  statusBarText: string;
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

/**
 * A minimal VS Code API surface used by activate().
 * In real VS Code environment this is provided by the `vscode` module.
 * Typed here so the extension logic can be unit-tested without VS Code.
 */
export interface VSCodeAPI {
  /** Show an information message in the editor */
  showInformationMessage(message: string): void;
  /** Create a status bar item */
  createStatusBarItem(): StatusBarItem;
  /** Register a command and return a disposable */
  registerCommand(id: string, handler: (...args: any[]) => any): Disposable;
}

export interface StatusBarItem {
  text: string;
  tooltip: string;
  show(): void;
  dispose(): void;
}

export interface Disposable {
  dispose(): void;
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
    statusBarText: '',
  };
}

/**
 * Activates the SigOps SDK VS Code extension.
 *
 * Sets up:
 * - A status bar item showing "SigOps SDK" so users can see the extension is active
 * - A `sigops-sdk.showVersion` command that displays the extension version
 * - All SEL language commands (lint, format, parse, etc.)
 *
 * When running inside VS Code, pass the real `vscode` API object.
 * When unit testing, pass a mock that satisfies the VSCodeAPI interface.
 *
 * @param config - Optional extension configuration overrides
 * @param vscode - VS Code API (optional; omit when testing without VS Code)
 * @returns Activated extension state, registered commands, and disposables to clean up on deactivate
 */
export function activate(
  config?: Partial<ExtensionConfig>,
  vscode?: VSCodeAPI,
): { state: ExtensionState; commands: CommandDefinition[]; disposables: Disposable[] } {
  const merged = { ...DEFAULT_CONFIG, ...config };
  const commandDefs = getCommandDefinitions();
  const disposables: Disposable[] = [];

  // ── Status bar item ──────────────────────────────────────────────────────
  // Shows "SigOps SDK" in the VS Code status bar so users know the extension
  // is active and which version they are running.
  let statusBarText = `SigOps SDK v${EXTENSION_VERSION}`;
  if (vscode) {
    const statusBar = vscode.createStatusBarItem();
    statusBar.text = `$(check) SigOps SDK`;
    statusBar.tooltip = `SigOps SDK v${EXTENSION_VERSION} — SEL language support active`;
    statusBar.show();
    disposables.push(statusBar);
  }

  // ── sigops-sdk.showVersion command ──────────────────────────────────────
  // Displays the extension version as an info message in the editor.
  const showVersionHandler = (): string => {
    const msg = `SigOps SDK extension v${EXTENSION_VERSION} is active.`;
    if (vscode) {
      vscode.showInformationMessage(msg);
    }
    return msg;
  };

  if (vscode) {
    disposables.push(vscode.registerCommand('sigops-sdk.showVersion', showVersionHandler));
  }

  // ── SEL language commands ────────────────────────────────────────────────
  const commands: CommandDefinition[] = [
    // Built-in version command
    {
      id: 'sigops-sdk.showVersion',
      title: 'SigOps SDK: Show Version',
      handler: showVersionHandler,
    },
    // Commands sourced from the command registry
    ...commandDefs.map((def) => ({
      id: def.id,
      title: def.title,
      handler: (): void => {
        if (vscode) {
          vscode.showInformationMessage(`Running: ${def.title}`);
        }
      },
    })),
  ];

  if (vscode) {
    for (const cmd of commands.slice(1)) {
      disposables.push(vscode.registerCommand(cmd.id, cmd.handler));
    }
  }

  const state: ExtensionState = {
    active: true,
    languageId: 'sel',
    registeredCommands: commands.map((c) => c.id),
    diagnosticsEnabled: merged.enableDiagnostics,
    formattingEnabled: merged.enableFormatting,
    statusBarText,
  };

  return { state, commands, disposables };
}

/** Deactivates the extension and disposes all resources. */
export function deactivate(
  state: ExtensionState,
  disposables?: Disposable[],
): ExtensionState {
  for (const d of disposables ?? []) {
    d.dispose();
  }
  return {
    ...state,
    active: false,
    registeredCommands: [],
    statusBarText: '',
  };
}
