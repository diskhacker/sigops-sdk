import { describe, it, expect } from 'vitest';
import {
  validateGrammar,
  extractScopes,
  matchPattern,
  SEL_LANGUAGE_ID,
  SEL_FILE_EXTENSIONS,
} from '../src/grammar.js';

describe('grammar', () => {
  const validGrammar = {
    scopeName: 'source.sel',
    name: 'SEL',
    fileTypes: ['sel'],
    patterns: [
      { include: '#keywords' },
    ],
    repository: {
      keywords: {
        patterns: [
          { name: 'keyword.control.sel', match: '\\b(monitor|alert)\\b' },
        ],
      },
    },
  };

  it('validateGrammar passes valid grammar', () => {
    const result = validateGrammar(validGrammar);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validateGrammar fails on missing scopeName', () => {
    const invalid = { name: 'SEL', patterns: [] };
    const result = validateGrammar(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('scopeName'))).toBe(true);
  });

  it('extractScopes returns all scope names', () => {
    const scopes = extractScopes(validGrammar);
    expect(scopes).toContain('keyword.control.sel');
    expect(scopes.length).toBeGreaterThan(0);
  });

  it('matchPattern matches simple patterns', () => {
    expect(matchPattern('monitor', '\\b(monitor|alert)\\b')).toBe(true);
    expect(matchPattern('alert', '\\b(monitor|alert)\\b')).toBe(true);
    expect(matchPattern('foobar', '\\b(monitor|alert)\\b')).toBe(false);
  });

  it('SEL_LANGUAGE_ID equals sel', () => {
    expect(SEL_LANGUAGE_ID).toBe('sel');
  });

  it('SEL_FILE_EXTENSIONS contains .sel', () => {
    expect(SEL_FILE_EXTENSIONS).toContain('.sel');
  });
});
