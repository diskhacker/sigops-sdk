import { describe, it, expect } from 'vitest';
import { scaffold, summarize } from '../src/index.js';

describe('hello-cli example', () => {
  it('scaffolds a tool project', () => {
    const result = scaffold('my-echo', 'tool');
    expect(result.success).toBe(true);
    const paths = result.files.map((f) => f.path);
    expect(paths).toContain('package.json');
    expect(paths).toContain('tsconfig.json');
    expect(paths).toContain('src/index.ts');
    expect(paths).toContain('README.md');
  });

  it('rejects invalid names', () => {
    const result = scaffold('Bad Name', 'tool');
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('summarises a successful scaffold', () => {
    const result = scaffold('ok-name', 'template');
    const text = summarize(result);
    expect(text).toMatch(/Scaffold for 'ok-name'/);
    expect(text).toMatch(/package.json/);
  });

  it('summarises a failing scaffold', () => {
    const result = scaffold('NOPE', 'plugin');
    expect(summarize(result)).toMatch(/FAILED:/);
  });
});
