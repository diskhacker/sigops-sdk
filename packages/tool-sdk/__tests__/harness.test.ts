import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineTool } from '../src/define-tool.js';
import { TestHarness } from '../src/harness.js';
import type { MockContextInspector } from '../src/context.js';

const inputSchema = z.object({ value: z.number() });
const outputSchema = z.object({ doubled: z.number() });

function makeDoubleTool() {
  return defineTool({
    name: 'double-tool',
    description: 'Doubles a number',
    input: inputSchema,
    output: outputSchema,
    execute: async (input) => ({ doubled: input.value * 2 }),
  });
}

describe('TestHarness', () => {
  it('constructs with a tool', () => {
    const tool = makeDoubleTool();
    const harness = new TestHarness(tool);
    expect(harness.getToolName()).toBe('double-tool');
  });

  it('execute runs tool with input and returns result', async () => {
    const harness = new TestHarness(makeDoubleTool());
    const result = await harness.execute({ value: 5 });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ doubled: 10 });
  });

  it('execute returns success result with duration', async () => {
    const harness = new TestHarness(makeDoubleTool());
    const result = await harness.execute({ value: 3 });
    expect(result.success).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.retries).toBe(0);
  });

  it('execute returns failure on invalid input', async () => {
    const harness = new TestHarness(makeDoubleTool());
    const result = await harness.execute({ value: 'not a number' } as any);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Input validation failed');
  });

  it('executeWithContext returns inspector', async () => {
    const tool = defineTool({
      name: 'logging-tool',
      description: 'Logs during execution',
      input: z.object({ msg: z.string() }),
      output: z.object({ ok: z.boolean() }),
      execute: async (input, ctx) => {
        ctx.logger.info(input.msg);
        ctx.emitMetric('calls', 1);
        return { ok: true };
      },
    });
    const harness = new TestHarness(tool);
    const { result, inspector } = await harness.executeWithContext({ msg: 'hello' });
    expect(result.success).toBe(true);
    expect(inspector.getLogs()).toHaveLength(1);
    expect(inspector.getLogs()[0].message).toBe('hello');
    expect(inspector.getMetrics()).toHaveLength(1);
  });

  it('getResults returns all executions', async () => {
    const harness = new TestHarness(makeDoubleTool());
    await harness.execute({ value: 1 });
    await harness.execute({ value: 2 });
    await harness.execute({ value: 3 });
    expect(harness.getResults()).toHaveLength(3);
  });

  it('getLastResult returns most recent execution', async () => {
    const harness = new TestHarness(makeDoubleTool());
    await harness.execute({ value: 1 });
    await harness.execute({ value: 7 });
    const last = harness.getLastResult();
    expect(last).toBeDefined();
    expect(last!.data).toEqual({ doubled: 14 });
  });

  it('assertSuccess returns data on successful execution', async () => {
    const harness = new TestHarness(makeDoubleTool());
    await harness.execute({ value: 4 });
    const data = harness.assertSuccess();
    expect(data).toEqual({ doubled: 8 });
  });

  it('assertSuccess throws when last execution failed', async () => {
    const harness = new TestHarness(makeDoubleTool());
    await harness.execute({ value: 'bad' } as any);
    expect(() => harness.assertSuccess()).toThrow('Expected success but got error');
  });

  it('assertFailure returns error message on failed execution', async () => {
    const tool = defineTool({
      name: 'fail-tool',
      description: 'Fails always',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
      execute: async () => { throw new Error('intentional failure'); },
    });
    const harness = new TestHarness(tool);
    await harness.execute({ x: 1 });
    const errorMsg = harness.assertFailure();
    expect(errorMsg).toBe('intentional failure');
  });

  it('assertFailure throws when last execution succeeded', async () => {
    const harness = new TestHarness(makeDoubleTool());
    await harness.execute({ value: 1 });
    expect(() => harness.assertFailure()).toThrow('Expected failure but got success');
  });

  it('reset clears execution history', async () => {
    const harness = new TestHarness(makeDoubleTool());
    await harness.execute({ value: 1 });
    await harness.execute({ value: 2 });
    expect(harness.getResults()).toHaveLength(2);
    harness.reset();
    expect(harness.getResults()).toHaveLength(0);
    expect(harness.getLastResult()).toBeUndefined();
  });

  it('getToolName returns correct name', () => {
    const harness = new TestHarness(makeDoubleTool());
    expect(harness.getToolName()).toBe('double-tool');
  });

  it('getToolVersion returns correct version', () => {
    const tool = defineTool({
      name: 'versioned-tool',
      description: 'Has a version',
      version: '2.0.0',
      input: inputSchema,
      output: outputSchema,
      execute: async (input) => ({ doubled: input.value * 2 }),
    });
    const harness = new TestHarness(tool);
    expect(harness.getToolVersion()).toBe('2.0.0');
  });

  it('respects context options for secrets and env', async () => {
    const tool = defineTool({
      name: 'secret-tool',
      description: 'Uses secrets',
      input: z.object({ key: z.string() }),
      output: z.object({ value: z.string() }),
      execute: async (input, ctx) => {
        const secret = ctx.secrets.get(input.key) ?? 'missing';
        const envVal = ctx.env.REGION ?? 'unknown';
        return { value: `${secret}:${envVal}` };
      },
    });
    const harness = new TestHarness(tool, {
      secrets: { TOKEN: 'secret-val' },
      env: { REGION: 'us-west-2' },
    });
    const result = await harness.execute({ key: 'TOKEN' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ value: 'secret-val:us-west-2' });
  });

  it('multiple executions accumulate results', async () => {
    const harness = new TestHarness(makeDoubleTool());
    for (let i = 1; i <= 5; i++) {
      await harness.execute({ value: i });
    }
    const results = harness.getResults();
    expect(results).toHaveLength(5);
    expect(results.map(r => r.data?.doubled)).toEqual([2, 4, 6, 8, 10]);
  });

  it('works with HTTP mocking', async () => {
    const tool = defineTool({
      name: 'http-tool',
      description: 'Makes HTTP calls',
      input: z.object({ endpoint: z.string() }),
      output: z.object({ status: z.number(), body: z.any() }),
      execute: async (input, ctx) => {
        const resp = await ctx.http.get(input.endpoint);
        return { status: resp.status, body: resp.body };
      },
    });
    const harness = new TestHarness(tool, {
      httpResponses: {
        'GET https://api.example.com/data': { status: 200, headers: {}, body: { items: [1, 2, 3] } },
      },
    });
    const result = await harness.execute({ endpoint: 'https://api.example.com/data' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ status: 200, body: { items: [1, 2, 3] } });
  });

  it('execute with context overrides merges options', async () => {
    const tool = defineTool({
      name: 'merge-tool',
      description: 'Tests option merging',
      input: z.object({ x: z.number() }),
      output: z.object({ env: z.string(), secret: z.string() }),
      execute: async (_input, ctx) => ({
        env: ctx.env.MODE ?? 'default',
        secret: ctx.secrets.get('KEY') ?? 'none',
      }),
    });
    const harness = new TestHarness(tool, {
      env: { MODE: 'base' },
      secrets: { KEY: 'base-key' },
    });
    // Override just secrets, env should come from base
    const result = await harness.execute({ x: 1 }, { secrets: { KEY: 'override-key' } });
    expect(result.success).toBe(true);
    expect(result.data!.secret).toBe('override-key');
    // env is overridden by the merged object (spread replaces env entirely if override has env)
    expect(result.data!.env).toBe('base');
  });
});
