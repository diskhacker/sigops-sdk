import { describe, it, expect } from 'vitest';
import { PublishCommand } from '../src/commands/publish.js';

describe('PublishCommand', () => {
  it('prePublishChecks passes for valid project', () => {
    const result = PublishCommand.prePublishChecks(
      {
        name: 'my-tool',
        version: '1.0.0',
        description: 'A great tool',
        main: './src/index.ts',
      },
      ['src/index.ts', '__tests__/index.test.ts'],
    );
    expect(result.ready).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('prePublishChecks fails for missing name', () => {
    const result = PublishCommand.prePublishChecks(
      { version: '1.0.0' },
      ['src/index.ts'],
    );
    expect(result.ready).toBe(false);
    expect(result.issues.some((i) => i.includes('name'))).toBe(true);
  });

  it('prePublishChecks fails for missing version', () => {
    const result = PublishCommand.prePublishChecks(
      { name: 'my-tool' },
      ['src/index.ts'],
    );
    expect(result.ready).toBe(false);
    expect(result.issues.some((i) => i.includes('version'))).toBe(true);
  });

  it('buildManifest uses default registry', () => {
    const result = PublishCommand.buildManifest(
      { name: 'my-tool', version: '1.0.0' },
      { projectPath: '.' },
    );
    expect(result.success).toBe(true);
    expect(result.packageName).toBe('my-tool');
    expect(result.version).toBe('1.0.0');
    expect(result.registry).toBe('https://registry.npmjs.org');
  });

  it('buildManifest respects custom registry', () => {
    const result = PublishCommand.buildManifest(
      { name: 'my-tool', version: '1.0.0' },
      { projectPath: '.', registry: 'https://npm.example.com' },
    );
    expect(result.registry).toBe('https://npm.example.com');
  });
});
