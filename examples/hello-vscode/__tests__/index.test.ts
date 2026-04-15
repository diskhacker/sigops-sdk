import { describe, it, expect } from 'vitest';
import {
  getVSCodeInstallInstructions,
  VSCODE_EXT_NAME,
  VSCODE_EXT_PATH,
  VSCODE_INSTALL_INSTRUCTIONS,
} from '../src/index.js';

describe('hello-vscode example', () => {
  it('exposes the canonical extension name', () => {
    expect(VSCODE_EXT_NAME).toBe('@sigops/vscode-ext');
  });

  it('points at the correct source path', () => {
    expect(VSCODE_EXT_PATH).toBe('packages/vscode-ext');
  });

  it('returns install instructions containing both install options', () => {
    const text = getVSCodeInstallInstructions();
    expect(text).toBe(VSCODE_INSTALL_INSTRUCTIONS);
    expect(text).toMatch(/from source/i);
    expect(text).toMatch(/Marketplace/);
  });
});
