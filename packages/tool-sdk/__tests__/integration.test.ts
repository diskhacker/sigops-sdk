import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineTool, executeTool } from '../src/define-tool.js';
import { mockContext } from '../src/context.js';
import { TestHarness } from '../src/harness.js';
import type { MockContextInspector } from '../src/context.js';

describe('Integration', () => {
  it('end-to-end: define, execute, and validate a simple tool', async () => {
    const tool = defineTool({
      name: 'greet',
      description: 'Greets a user',
      input: z.object({ name: z.string() }),
      output: z.object({ greeting: z.string() }),
      execute: async (input) => ({ greeting: `Hello, ${input.name}!` }),
    });

    const ctx = mockContext();
    const result = await executeTool(tool, { name: 'Alice' }, ctx);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ greeting: 'Hello, Alice!' });
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.retries).toBe(0);
  });

  it('tool with retry policy retries correctly', async () => {
    let calls = 0;
    const tool = defineTool({
      name: 'flaky-service',
      description: 'Flaky service that eventually succeeds',
      input: z.object({ attempt: z.number() }),
      output: z.object({ ok: z.boolean() }),
      retryPolicy: { maxRetries: 3, backoffMs: 10 },
      execute: async () => {
        calls++;
        if (calls < 3) throw new Error('Service unavailable');
        return { ok: true };
      },
    });

    const harness = new TestHarness(tool);
    const result = await harness.execute({ attempt: 1 });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ok: true });
    expect(result.retries).toBe(2);
    expect(calls).toBe(3);
  });

  it('tool with secrets accesses them via context', async () => {
    const tool = defineTool({
      name: 'auth-tool',
      description: 'Uses API key from secrets',
      input: z.object({ endpoint: z.string() }),
      output: z.object({ authenticated: z.boolean(), key: z.string() }),
      execute: async (input, ctx) => {
        const apiKey = ctx.secrets.get('API_KEY');
        if (!apiKey) throw new Error('Missing API_KEY secret');
        return { authenticated: true, key: apiKey };
      },
    });

    const harness = new TestHarness(tool, { secrets: { API_KEY: 'sk-test-123' } });
    const result = await harness.execute({ endpoint: '/api/data' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ authenticated: true, key: 'sk-test-123' });
  });

  it('tool with HTTP calls uses mock HTTP', async () => {
    const tool = defineTool({
      name: 'api-caller',
      description: 'Calls an external API',
      input: z.object({ url: z.string() }),
      output: z.object({ items: z.array(z.string()) }),
      execute: async (input, ctx) => {
        const resp = await ctx.http.get(input.url);
        return { items: resp.body.items };
      },
    });

    const harness = new TestHarness(tool, {
      httpResponses: {
        'GET https://api.test.com/items': {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { items: ['a', 'b', 'c'] },
        },
      },
    });

    const { result, inspector } = await harness.executeWithContext({ url: 'https://api.test.com/items' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ items: ['a', 'b', 'c'] });
    const httpCalls = inspector.getHttpCalls();
    expect(httpCalls).toHaveLength(1);
    expect(httpCalls[0].method).toBe('GET');
    expect(httpCalls[0].url).toBe('https://api.test.com/items');
  });

  it('tool emits metrics during execution', async () => {
    const tool = defineTool({
      name: 'metric-tool',
      description: 'Emits metrics',
      input: z.object({ count: z.number() }),
      output: z.object({ processed: z.number() }),
      execute: async (input, ctx) => {
        ctx.emitMetric('items.processed', input.count, { source: 'test' });
        ctx.emitMetric('execution.step', 1);
        return { processed: input.count };
      },
    });

    const harness = new TestHarness(tool);
    const { result, inspector } = await harness.executeWithContext({ count: 42 });
    expect(result.success).toBe(true);
    const metrics = inspector.getMetrics();
    expect(metrics).toHaveLength(2);
    expect(metrics[0]).toEqual({ name: 'items.processed', value: 42, tags: { source: 'test' } });
    expect(metrics[1]).toEqual({ name: 'execution.step', value: 1, tags: undefined });
  });

  it('tool logs during execution', async () => {
    const tool = defineTool({
      name: 'verbose-tool',
      description: 'Logs a lot',
      input: z.object({ step: z.string() }),
      output: z.object({ done: z.boolean() }),
      execute: async (input, ctx) => {
        ctx.logger.info(`Starting step: ${input.step}`);
        ctx.logger.debug('Processing...');
        ctx.emitStatus('running', input.step);
        ctx.logger.info(`Finished step: ${input.step}`);
        ctx.emitStatus('success');
        return { done: true };
      },
    });

    const harness = new TestHarness(tool);
    const { result, inspector } = await harness.executeWithContext({ step: 'deploy' });
    expect(result.success).toBe(true);
    const logs = inspector.getLogs();
    expect(logs).toHaveLength(3);
    expect(logs[0].message).toBe('Starting step: deploy');
    expect(logs[1].level).toBe('debug');
    expect(logs[2].message).toBe('Finished step: deploy');
    const statuses = inspector.getStatuses();
    expect(statuses).toHaveLength(2);
    expect(statuses[0]).toEqual({ status: 'running', message: 'deploy' });
    expect(statuses[1]).toEqual({ status: 'success', message: undefined });
  });

  it('invalid input is rejected before execute runs', async () => {
    let executeCalled = false;
    const tool = defineTool({
      name: 'guarded-tool',
      description: 'Should not execute with bad input',
      input: z.object({ email: z.string().email() }),
      output: z.object({ sent: z.boolean() }),
      execute: async () => {
        executeCalled = true;
        return { sent: true };
      },
    });

    const ctx = mockContext();
    const result = await executeTool(tool, { email: 'not-an-email' }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Input validation failed');
    expect(executeCalled).toBe(false);
  });

  it('output validation catches bad return values', async () => {
    const tool = defineTool({
      name: 'bad-return-tool',
      description: 'Returns wrong type',
      input: z.object({ x: z.number() }),
      output: z.object({ result: z.string(), count: z.number() }),
      execute: async (input) => {
        // Intentionally return wrong types
        return { result: 123, count: 'not-a-number' } as any;
      },
    });

    const ctx = mockContext();
    const result = await executeTool(tool, { x: 1 }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Output validation failed');
  });

  it('abort signal stops execution', async () => {
    const tool = defineTool({
      name: 'abortable-task',
      description: 'Can be cancelled',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
      execute: async (input) => ({ y: input.x * 2 }),
    });

    const ctx = mockContext() as any;
    const inspector = ctx as MockContextInspector;
    inspector.abort();
    const result = await executeTool(tool, { x: 5 }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Execution aborted');
  });

  it('full lifecycle: define, harness, execute, inspect', async () => {
    // 1. Define a tool
    const tool = defineTool({
      name: 'lifecycle-tool',
      description: 'Full lifecycle test',
      version: '1.0.0',
      input: z.object({ message: z.string() }),
      output: z.object({ echoed: z.string(), timestamp: z.number() }),
      tags: ['test', 'lifecycle'],
      timeout: 5000,
      execute: async (input, ctx) => {
        ctx.logger.info(`Processing: ${input.message}`);
        ctx.emitMetric('messages.processed', 1);
        ctx.emitStatus('running', 'processing');
        const resp = await ctx.http.post('https://api.internal/log', { msg: input.message }, {});
        ctx.emitStatus('success');
        return { echoed: input.message, timestamp: Date.now() };
      },
    });

    // 2. Create a harness with mocked dependencies
    const harness = new TestHarness(tool, {
      secrets: { AUTH: 'token' },
      env: { ENV: 'test' },
      httpResponses: {
        'POST https://api.internal/log': { status: 200, headers: {}, body: { ok: true } },
      },
    });

    // 3. Verify tool metadata
    expect(harness.getToolName()).toBe('lifecycle-tool');
    expect(harness.getToolVersion()).toBe('1.0.0');
    expect(harness.getToolDescription()).toBe('Full lifecycle test');

    // 4. Execute the tool
    const { result, inspector } = await harness.executeWithContext({ message: 'hello world' });

    // 5. Verify execution result
    expect(result.success).toBe(true);
    expect(result.data!.echoed).toBe('hello world');
    expect(result.data!.timestamp).toBeGreaterThan(0);
    expect(result.retries).toBe(0);

    // 6. Inspect context interactions
    const logs = inspector.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Processing: hello world');

    const metrics = inspector.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('messages.processed');

    const statuses = inspector.getStatuses();
    expect(statuses).toHaveLength(2);
    expect(statuses[0].status).toBe('running');
    expect(statuses[1].status).toBe('success');

    const httpCalls = inspector.getHttpCalls();
    expect(httpCalls).toHaveLength(1);
    expect(httpCalls[0].method).toBe('POST');
    expect(httpCalls[0].url).toBe('https://api.internal/log');
    expect(httpCalls[0].body).toEqual({ msg: 'hello world' });

    // 7. Use harness assertions
    const data = harness.assertSuccess();
    expect(data.echoed).toBe('hello world');

    // 8. Verify results accumulation
    expect(harness.getResults()).toHaveLength(1);

    // 9. Execute again and verify accumulation
    await harness.execute({ message: 'second run' });
    expect(harness.getResults()).toHaveLength(2);

    // 10. Reset and verify
    harness.reset();
    expect(harness.getResults()).toHaveLength(0);
  });
});
