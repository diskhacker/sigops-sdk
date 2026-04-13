import { describe, it, expect } from 'vitest';
import { TestCommand } from '../src/commands/test.js';

describe('TestCommand', () => {
  it('parseOptions handles basic args', () => {
    const options = TestCommand.parseOptions({
      projectPath: '/my/project',
      verbose: true,
      watch: true,
    });
    expect(options.projectPath).toBe('/my/project');
    expect(options.verbose).toBe(true);
    expect(options.watch).toBe(true);
  });

  it('parseOptions applies defaults', () => {
    const options = TestCommand.parseOptions({});
    expect(options.projectPath).toBe('.');
    expect(options.verbose).toBe(false);
    expect(options.watch).toBe(false);
    expect(options.input).toBeUndefined();
    expect(options.params).toBeUndefined();
  });

  it('discoverTests finds test files', () => {
    const files = [
      'src/index.ts',
      '__tests__/init.test.ts',
      'src/commands/test.spec.ts',
      '__tests__/validate.test.ts',
    ];
    const tests = TestCommand.discoverTests(files);
    expect(tests).toHaveLength(3);
    expect(tests).toContain('__tests__/init.test.ts');
    expect(tests).toContain('src/commands/test.spec.ts');
    expect(tests).toContain('__tests__/validate.test.ts');
  });

  it('discoverTests filters non-test files', () => {
    const files = [
      'src/index.ts',
      'src/commands/init.ts',
      'package.json',
      'README.md',
    ];
    const tests = TestCommand.discoverTests(files);
    expect(tests).toHaveLength(0);
  });

  it('summarize counts passed/failed correctly', () => {
    const results = [
      { name: 'test1', passed: true },
      { name: 'test2', passed: false, error: 'assertion failed' },
      { name: 'test3', passed: true },
      { name: 'test4', passed: false, error: 'timeout' },
    ];
    const summary = TestCommand.summarize(results);
    expect(summary.total).toBe(4);
    expect(summary.passed).toBe(2);
    expect(summary.failed).toBe(2);
    expect(summary.success).toBe(false);
    expect(summary.errors).toHaveLength(2);
  });

  it('summarize handles empty results', () => {
    const summary = TestCommand.summarize([]);
    expect(summary.total).toBe(0);
    expect(summary.passed).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.success).toBe(true);
    expect(summary.errors).toBeUndefined();
  });

  it('summarize handles all-passing results', () => {
    const results = [
      { name: 'test1', passed: true },
      { name: 'test2', passed: true },
      { name: 'test3', passed: true },
    ];
    const summary = TestCommand.summarize(results);
    expect(summary.total).toBe(3);
    expect(summary.passed).toBe(3);
    expect(summary.failed).toBe(0);
    expect(summary.success).toBe(true);
    expect(summary.errors).toBeUndefined();
  });
});
