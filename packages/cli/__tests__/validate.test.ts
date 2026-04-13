import { describe, it, expect } from 'vitest';
import { ValidateCommand } from '../src/commands/validate.js';

describe('ValidateCommand', () => {
  it('validatePackageJson passes valid package', () => {
    const checks = ValidateCommand.validatePackageJson({
      name: 'my-tool',
      version: '1.0.0',
      description: 'A great tool',
      main: './src/index.ts',
      types: './src/index.ts',
      scripts: { test: 'vitest run' },
    });
    expect(checks.every((c) => c.passed)).toBe(true);
  });

  it('validatePackageJson fails on missing name', () => {
    const checks = ValidateCommand.validatePackageJson({
      version: '1.0.0',
    });
    const nameCheck = checks.find((c) => c.name === 'has-name');
    expect(nameCheck).toBeDefined();
    expect(nameCheck!.passed).toBe(false);
    expect(nameCheck!.severity).toBe('error');
  });

  it('validatePackageJson fails on missing version', () => {
    const checks = ValidateCommand.validatePackageJson({
      name: 'my-tool',
    });
    const versionCheck = checks.find((c) => c.name === 'has-version');
    expect(versionCheck).toBeDefined();
    expect(versionCheck!.passed).toBe(false);
    expect(versionCheck!.severity).toBe('error');
  });

  it('validatePackageJson warns on missing description', () => {
    const checks = ValidateCommand.validatePackageJson({
      name: 'my-tool',
      version: '1.0.0',
      main: './src/index.ts',
    });
    const descCheck = checks.find((c) => c.name === 'has-description');
    expect(descCheck).toBeDefined();
    expect(descCheck!.passed).toBe(false);
    expect(descCheck!.severity).toBe('warning');
  });

  it('validateStructure passes with src directory', () => {
    const checks = ValidateCommand.validateStructure([
      'src/index.ts',
      '__tests__/index.test.ts',
    ]);
    const srcCheck = checks.find((c) => c.name === 'has-src');
    expect(srcCheck).toBeDefined();
    expect(srcCheck!.passed).toBe(true);
  });

  it('validateStructure warns on missing tests', () => {
    const checks = ValidateCommand.validateStructure([
      'src/index.ts',
      'src/utils.ts',
    ]);
    const testsCheck = checks.find((c) => c.name === 'has-tests');
    expect(testsCheck).toBeDefined();
    expect(testsCheck!.passed).toBe(false);
    expect(testsCheck!.severity).toBe('warning');
  });

  it('validate combines all checks', () => {
    const result = ValidateCommand.validate(
      { name: 'my-tool', version: '1.0.0', main: './src/index.ts' },
      ['src/index.ts', '__tests__/index.test.ts'],
    );
    expect(result.valid).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it('validate in strict mode elevates warnings to errors', () => {
    const result = ValidateCommand.validate(
      { name: 'my-tool', version: '1.0.0', main: './src/index.ts' },
      ['src/index.ts'],
      { strict: true },
    );
    // Missing description and missing tests should now be errors
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('validate returns errors and warnings separately', () => {
    const result = ValidateCommand.validate(
      { name: 'my-tool' },
      ['src/index.ts'],
    );
    // Missing version is an error; missing description and missing tests are warnings
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
