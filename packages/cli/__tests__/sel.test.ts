import { describe, it, expect } from 'vitest';
import { SelCommand } from '../src/commands/sel.js';

describe('SelCommand', () => {
  it('validateAction accepts valid actions', () => {
    expect(SelCommand.validateAction('lint')).toBe(true);
    expect(SelCommand.validateAction('fmt')).toBe(true);
    expect(SelCommand.validateAction('parse')).toBe(true);
    expect(SelCommand.validateAction('playground')).toBe(true);
  });

  it('validateAction rejects invalid actions', () => {
    expect(SelCommand.validateAction('build')).toBe(false);
    expect(SelCommand.validateAction('run')).toBe(false);
    expect(SelCommand.validateAction('')).toBe(false);
    expect(SelCommand.validateAction('LINT')).toBe(false);
  });

  it('getActions returns all 4 actions', () => {
    const actions = SelCommand.getActions();
    expect(actions).toContain('lint');
    expect(actions).toContain('fmt');
    expect(actions).toContain('parse');
    expect(actions).toContain('playground');
    expect(actions).toHaveLength(4);
  });

  it('basicValidate passes valid SEL', () => {
    const result = SelCommand.basicValidate('monitor cpu {\n  threshold: 90\n}');
    expect(result.success).toBe(true);
  });

  it('basicValidate fails on unbalanced braces', () => {
    const result = SelCommand.basicValidate('monitor cpu {\n  threshold: 90\n');
    expect(result.success).toBe(false);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.some((d) => d.severity === 'error')).toBe(true);
  });

  it('basicValidate fails on empty input', () => {
    const result = SelCommand.basicValidate('');
    expect(result.success).toBe(false);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics![0].message).toContain('empty');
  });

  it('basicFormat normalizes whitespace', () => {
    const input = '  monitor cpu {  \n    threshold: 90  \n  }  ';
    const formatted = SelCommand.basicFormat(input);
    // Should not have trailing spaces
    const lines = formatted.split('\n');
    for (const line of lines) {
      expect(line).toBe(line.trimEnd());
    }
    // Should maintain structure
    expect(formatted).toContain('monitor cpu {');
    expect(formatted).toContain('threshold: 90');
    expect(formatted).toContain('}');
  });
});
