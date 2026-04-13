import { describe, it, expect } from 'vitest';
import { LoginCommand } from '../src/commands/login.js';

describe('LoginCommand', () => {
  it('validateApiKey accepts valid key', () => {
    const key = 'sk_sigops_' + 'a'.repeat(32);
    const result = LoginCommand.validateApiKey(key);
    expect(result.valid).toBe(true);
  });

  it('validateApiKey rejects short key', () => {
    const key = 'sk_sigops_' + 'a'.repeat(10);
    const result = LoginCommand.validateApiKey(key);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too short');
  });

  it('validateApiKey rejects wrong prefix', () => {
    const key = 'wrong_prefix_' + 'a'.repeat(32);
    const result = LoginCommand.validateApiKey(key);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('sk_sigops_');
  });

  it('buildAuthConfig uses defaults', () => {
    const config = LoginCommand.buildAuthConfig({
      apiKey: 'sk_sigops_' + 'a'.repeat(32),
    });
    expect(config.endpoint).toBe('https://api.sigops.io');
    expect(config.apiKey).toBe('sk_sigops_' + 'a'.repeat(32));
    expect(config.createdAt).toBeDefined();
  });

  it('maskApiKey masks middle of key', () => {
    const key = 'sk_sigops_' + 'abcdefghijklmnopqrstuvwxyz123456';
    const masked = LoginCommand.maskApiKey(key);
    expect(masked.startsWith('sk_sigops_')).toBe(true);
    expect(masked.endsWith('3456')).toBe(true);
    expect(masked).toContain('*');
    // The masked portion should not reveal the original characters
    expect(masked).not.toContain('abcdefgh');
  });
});
