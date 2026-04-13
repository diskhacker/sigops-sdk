import { describe, it, expect } from 'vitest';
import { InitCommand } from '../src/commands/init.js';

describe('InitCommand', () => {
  it('generates scaffold for tool type', () => {
    const cmd = new InitCommand();
    const result = cmd.generateScaffold({ name: 'my-tool', type: 'tool' });
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    const indexFile = result.files.find((f) => f.path === 'src/index.ts');
    expect(indexFile).toBeDefined();
    expect(indexFile!.content).toContain('defineTool');
  });

  it('generates scaffold for template type', () => {
    const cmd = new InitCommand();
    const result = cmd.generateScaffold({ name: 'my-template', type: 'template' });
    expect(result.success).toBe(true);
    const indexFile = result.files.find((f) => f.path === 'src/index.ts');
    expect(indexFile).toBeDefined();
    expect(indexFile!.content).toContain('defineTemplate');
  });

  it('generates scaffold for plugin type', () => {
    const cmd = new InitCommand();
    const result = cmd.generateScaffold({ name: 'my-plugin', type: 'plugin' });
    expect(result.success).toBe(true);
    const indexFile = result.files.find((f) => f.path === 'src/index.ts');
    expect(indexFile).toBeDefined();
    expect(indexFile!.content).toContain('definePlugin');
  });

  it('generates scaffold for connector type', () => {
    const cmd = new InitCommand();
    const result = cmd.generateScaffold({ name: 'my-connector', type: 'connector' });
    expect(result.success).toBe(true);
    const indexFile = result.files.find((f) => f.path === 'src/index.ts');
    expect(indexFile).toBeDefined();
    expect(indexFile!.content).toContain('Connector');
  });

  it('generated files include package.json', () => {
    const cmd = new InitCommand();
    const result = cmd.generateScaffold({ name: 'my-tool', type: 'tool' });
    const pkgFile = result.files.find((f) => f.path === 'package.json');
    expect(pkgFile).toBeDefined();
    const pkg = JSON.parse(pkgFile!.content);
    expect(pkg.name).toBe('my-tool');
    expect(pkg.version).toBe('0.1.0');
  });

  it('generated files include src/index.ts', () => {
    const cmd = new InitCommand();
    const result = cmd.generateScaffold({ name: 'test-proj', type: 'tool' });
    const indexFile = result.files.find((f) => f.path === 'src/index.ts');
    expect(indexFile).toBeDefined();
    expect(indexFile!.content.length).toBeGreaterThan(0);
  });

  it('generated files include test file', () => {
    const cmd = new InitCommand();
    const result = cmd.generateScaffold({ name: 'test-proj', type: 'tool' });
    const testFile = result.files.find((f) => f.path === '__tests__/index.test.ts');
    expect(testFile).toBeDefined();
    expect(testFile!.content).toContain('describe');
  });

  it('validateName accepts valid names', () => {
    expect(InitCommand.validateName('my-tool').valid).toBe(true);
    expect(InitCommand.validateName('my.tool').valid).toBe(true);
    expect(InitCommand.validateName('@scope/my-tool').valid).toBe(true);
    expect(InitCommand.validateName('tool123').valid).toBe(true);
  });

  it('validateName rejects invalid names', () => {
    expect(InitCommand.validateName('My Tool').valid).toBe(false);
    expect(InitCommand.validateName('MY-TOOL').valid).toBe(false);
    expect(InitCommand.validateName('my tool').valid).toBe(false);
    expect(InitCommand.validateName('my$tool').valid).toBe(false);
    expect(InitCommand.validateName('').valid).toBe(false);
  });

  it('getProjectTypes returns all 4 types', () => {
    const types = InitCommand.getProjectTypes();
    expect(types).toContain('tool');
    expect(types).toContain('template');
    expect(types).toContain('plugin');
    expect(types).toContain('connector');
    expect(types).toHaveLength(4);
  });
});
