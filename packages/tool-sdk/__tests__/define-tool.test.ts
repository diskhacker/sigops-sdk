import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineTool, getToolMetadata, executeTool } from '../src/define-tool.js';
import { mockContext } from '../src/context.js';
import type { MockContextInspector } from '../src/context.js';

const simpleInput = z.object({ url: z.string().url() });
const simpleOutput = z.object({ status: z.number() });

function makeSimpleTool(overrides?: Record<string, any>) {
  return defineTool({
    name: 'health-check',
    description: 'Checks endpoint health',
    input: simpleInput,
    output: simpleOutput,
    execute: async (input, ctx) => {
      return { status: 200 };
    },
    ...overrides,
  });
}

describe('defineTool', () => {
  it('creates valid tool with required fields', () => {
    const tool = makeSimpleTool();
    expect(tool.name).toBe('health-check');
    expect(tool.description).toBe('Checks endpoint health');
    expect(tool.inputSchema).toBe(simpleInput);
    expect(tool.outputSchema).toBe(simpleOutput);
    expect(typeof tool.execute).toBe('function');
  });

  it('applies defaults for version, timeout, and tags', () => {
    const tool = makeSimpleTool();
    expect(tool.version).toBe('0.1.0');
    expect(tool.timeout).toBe(30000);
    expect(tool.tags).toEqual([]);
  });

  it('throws on missing name', () => {
    expect(() => defineTool({
      name: '',
      description: 'test',
      input: simpleInput,
      output: simpleOutput,
      execute: async () => ({ status: 200 }),
    })).toThrow('Tool name is required');
  });

  it('throws on invalid name format (uppercase)', () => {
    expect(() => defineTool({
      name: 'MyTool',
      description: 'test',
      input: simpleInput,
      output: simpleOutput,
      execute: async () => ({ status: 200 }),
    })).toThrow('Tool name must start with lowercase letter');
  });

  it('throws on invalid name format (starts with number)', () => {
    expect(() => defineTool({
      name: '1tool',
      description: 'test',
      input: simpleInput,
      output: simpleOutput,
      execute: async () => ({ status: 200 }),
    })).toThrow('Tool name must start with lowercase letter');
  });

  it('throws on invalid name format (spaces)', () => {
    expect(() => defineTool({
      name: 'my tool',
      description: 'test',
      input: simpleInput,
      output: simpleOutput,
      execute: async () => ({ status: 200 }),
    })).toThrow('Tool name must start with lowercase letter');
  });

  it('throws on missing description', () => {
    expect(() => defineTool({
      name: 'test-tool',
      description: '',
      input: simpleInput,
      output: simpleOutput,
      execute: async () => ({ status: 200 }),
    })).toThrow('Tool description is required');
  });

  it('throws on missing input schema', () => {
    expect(() => defineTool({
      name: 'test-tool',
      description: 'test',
      input: undefined as any,
      output: simpleOutput,
      execute: async () => ({ status: 200 }),
    })).toThrow('Tool input schema is required');
  });

  it('throws on missing output schema', () => {
    expect(() => defineTool({
      name: 'test-tool',
      description: 'test',
      input: simpleInput,
      output: undefined as any,
      execute: async () => ({ status: 200 }),
    })).toThrow('Tool output schema is required');
  });

  it('throws on missing execute function', () => {
    expect(() => defineTool({
      name: 'test-tool',
      description: 'test',
      input: simpleInput,
      output: simpleOutput,
      execute: 'not a function' as any,
    })).toThrow('Tool execute function is required');
  });
});

describe('getToolMetadata', () => {
  it('extracts metadata correctly', () => {
    const tool = defineTool({
      name: 'my-tool',
      description: 'A test tool',
      version: '1.2.3',
      input: simpleInput,
      output: simpleOutput,
      execute: async () => ({ status: 200 }),
      tags: ['network', 'health'],
      timeout: 5000,
    });

    const meta = getToolMetadata(tool);
    expect(meta.name).toBe('my-tool');
    expect(meta.description).toBe('A test tool');
    expect(meta.version).toBe('1.2.3');
    expect(meta.tags).toEqual(['network', 'health']);
    expect(meta.timeout).toBe(5000);
    expect(meta.inputSchema).toBe(simpleInput);
    expect(meta.outputSchema).toBe(simpleOutput);
  });
});

describe('executeTool', () => {
  it('validates input and rejects invalid', async () => {
    const tool = makeSimpleTool();
    const ctx = mockContext();
    const result = await executeTool(tool, { url: 'not-a-url' }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Input validation failed');
    expect(result.retries).toBe(0);
  });

  it('validates output and rejects invalid', async () => {
    const tool = defineTool({
      name: 'bad-output',
      description: 'Returns bad output',
      input: z.object({ x: z.number() }),
      output: z.object({ result: z.string() }),
      execute: async () => ({ result: 42 }) as any,
    });
    const ctx = mockContext();
    const result = await executeTool(tool, { x: 1 }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Output validation failed');
  });

  it('returns success with valid data', async () => {
    const tool = makeSimpleTool();
    const ctx = mockContext();
    const result = await executeTool(tool, { url: 'https://example.com' }, ctx);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ status: 200 });
    expect(result.retries).toBe(0);
  });

  it('returns error when execute throws', async () => {
    const tool = defineTool({
      name: 'failing-tool',
      description: 'Always fails',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
      execute: async () => { throw new Error('boom'); },
    });
    const ctx = mockContext();
    const result = await executeTool(tool, { x: 1 }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
  });

  it('retries on retryable errors', async () => {
    let attempts = 0;
    const tool = defineTool({
      name: 'retry-tool',
      description: 'Retries then succeeds',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
      retryPolicy: { maxRetries: 3, backoffMs: 10 },
      execute: async (input) => {
        attempts++;
        if (attempts < 3) throw new Error('transient error');
        return { y: input.x * 2 };
      },
    });
    const ctx = mockContext();
    const result = await executeTool(tool, { x: 5 }, ctx);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ y: 10 });
    expect(result.retries).toBe(2);
    expect(attempts).toBe(3);
  });

  it('respects maxRetries limit', async () => {
    let attempts = 0;
    const tool = defineTool({
      name: 'always-fails',
      description: 'Always fails',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
      retryPolicy: { maxRetries: 2, backoffMs: 10 },
      execute: async () => {
        attempts++;
        throw new Error('permanent error');
      },
    });
    const ctx = mockContext();
    const result = await executeTool(tool, { x: 1 }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toBe('permanent error');
    expect(attempts).toBe(3); // initial + 2 retries
  });

  it('respects retryableErrors filter', async () => {
    let attempts = 0;
    const tool = defineTool({
      name: 'selective-retry',
      description: 'Only retries specific errors',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
      retryPolicy: { maxRetries: 3, backoffMs: 10, retryableErrors: ['timeout'] },
      execute: async () => {
        attempts++;
        throw new Error('connection refused');
      },
    });
    const ctx = mockContext();
    const result = await executeTool(tool, { x: 1 }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toBe('connection refused');
    expect(attempts).toBe(1); // no retries since error doesn't match
  });

  it('handles abort signal', async () => {
    const tool = defineTool({
      name: 'abortable-tool',
      description: 'Can be aborted',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
      execute: async (input) => ({ y: input.x }),
    });
    const ctx = mockContext() as any;
    (ctx as any).abort();
    const result = await executeTool(tool, { x: 1 }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Execution aborted');
  });

  it('measures duration', async () => {
    const tool = defineTool({
      name: 'slow-tool',
      description: 'Takes some time',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
      execute: async (input) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { y: input.x };
      },
    });
    const ctx = mockContext();
    const result = await executeTool(tool, { x: 1 }, ctx);
    expect(result.success).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(40);
  });
});
