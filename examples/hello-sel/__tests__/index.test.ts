import { describe, it, expect } from 'vitest';
import { runHelloSel, SAMPLE_SEL } from '../src/index.js';

describe('hello-sel example', () => {
  it('parses the sample SEL program', () => {
    const res = runHelloSel();
    expect(res.astType).toBe('Program');
    expect(res.statementCount).toBe(2);
  });

  it('returns a diagnostics array (possibly empty)', () => {
    const res = runHelloSel(SAMPLE_SEL);
    expect(Array.isArray(res.diagnostics)).toBe(true);
  });

  it('produces a non-empty formatted output', () => {
    const res = runHelloSel();
    expect(res.formatted.length).toBeGreaterThan(0);
    expect(res.formatted).toMatch(/monitor/);
  });
});
