import { describe, it, expect } from 'vitest';
import {
  createExtensionState,
  activate,
  deactivate,
  DEFAULT_CONFIG,
} from '../src/extension.js';

describe('extension', () => {
  it('createExtensionState returns inactive state', () => {
    const state = createExtensionState();
    expect(state.active).toBe(false);
    expect(state.registeredCommands).toEqual([]);
  });

  it('activate returns active state with commands', () => {
    const result = activate();
    expect(result.state.active).toBe(true);
    expect(result.commands.length).toBeGreaterThan(0);
  });

  it('activate uses default config', () => {
    const result = activate();
    expect(result.state.diagnosticsEnabled).toBe(DEFAULT_CONFIG.enableDiagnostics);
    expect(result.state.formattingEnabled).toBe(DEFAULT_CONFIG.enableFormatting);
  });

  it('activate registers expected commands', () => {
    const result = activate();
    expect(result.state.registeredCommands).toContain('sigops-sel.lintFile');
    expect(result.state.registeredCommands).toContain('sigops-sel.formatFile');
    expect(result.state.registeredCommands).toContain('sigops-sel.parseFile');
    expect(result.state.registeredCommands).toContain('sigops-sel.showAST');
    expect(result.state.registeredCommands).toContain('sigops-sel.validateWorkspace');
    expect(result.state.registeredCommands).toContain('sigops-sel.openPlayground');
    expect(result.state.registeredCommands).toContain('sigops-sel.restartServer');
  });

  it('deactivate sets state to inactive', () => {
    const { state } = activate();
    const deactivated = deactivate(state);
    expect(deactivated.active).toBe(false);
    expect(deactivated.registeredCommands).toEqual([]);
  });

  it('DEFAULT_CONFIG has all fields', () => {
    expect(DEFAULT_CONFIG).toHaveProperty('enableDiagnostics');
    expect(DEFAULT_CONFIG).toHaveProperty('enableFormatting');
    expect(DEFAULT_CONFIG).toHaveProperty('enableCompletion');
    expect(DEFAULT_CONFIG).toHaveProperty('lintOnSave');
    expect(DEFAULT_CONFIG).toHaveProperty('formatOnSave');
    expect(DEFAULT_CONFIG).toHaveProperty('maxDiagnostics');
  });

  it('activate with custom config applies overrides', () => {
    const result = activate({ enableDiagnostics: false, enableFormatting: false });
    expect(result.state.diagnosticsEnabled).toBe(false);
    expect(result.state.formattingEnabled).toBe(false);
  });

  it('state includes correct languageId', () => {
    const state = createExtensionState();
    expect(state.languageId).toBe('sel');

    const { state: activeState } = activate();
    expect(activeState.languageId).toBe('sel');
  });
});
