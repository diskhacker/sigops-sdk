import { describe, it, expect } from 'vitest';
import { mockContext } from '../src/context.js';
import type { MockContextInspector } from '../src/context.js';

describe('mockContext', () => {
  it('creates a valid context with all required properties', () => {
    const ctx = mockContext();
    expect(ctx.executionId).toBeDefined();
    expect(ctx.logger).toBeDefined();
    expect(ctx.secrets).toBeDefined();
    expect(ctx.signal).toBeDefined();
    expect(ctx.env).toBeDefined();
    expect(ctx.http).toBeDefined();
    expect(typeof ctx.emitMetric).toBe('function');
    expect(typeof ctx.emitStatus).toBe('function');
  });

  it('generates executionId with test- prefix', () => {
    const ctx1 = mockContext();
    const ctx2 = mockContext({ executionId: 'other-id' });
    expect(ctx1.executionId).toMatch(/^test-\d+$/);
    expect(ctx2.executionId).toBe('other-id');
  });

  it('allows custom executionId', () => {
    const ctx = mockContext({ executionId: 'custom-123' });
    expect(ctx.executionId).toBe('custom-123');
  });

  it('records debug log messages', () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    ctx.logger.debug('debug message', { extra: 1 });
    const logs = inspector.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('debug');
    expect(logs[0].message).toBe('debug message');
    expect(logs[0].args).toEqual([{ extra: 1 }]);
  });

  it('records info log messages', () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    ctx.logger.info('info message');
    const logs = inspector.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('info message');
  });

  it('records warn log messages', () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    ctx.logger.warn('warn message');
    const logs = inspector.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('warn');
  });

  it('records error log messages', () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    ctx.logger.error('error message');
    const logs = inspector.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('error');
  });

  it('getLogs returns all logged messages across levels', () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    ctx.logger.debug('d');
    ctx.logger.info('i');
    ctx.logger.warn('w');
    ctx.logger.error('e');
    const logs = inspector.getLogs();
    expect(logs).toHaveLength(4);
    expect(logs.map(l => l.level)).toEqual(['debug', 'info', 'warn', 'error']);
  });

  it('secrets.get returns configured secrets', () => {
    const ctx = mockContext({ secrets: { API_KEY: 'abc123' } });
    expect(ctx.secrets.get('API_KEY')).toBe('abc123');
  });

  it('secrets.has returns true for existing keys', () => {
    const ctx = mockContext({ secrets: { API_KEY: 'abc123' } });
    expect(ctx.secrets.has('API_KEY')).toBe(true);
  });

  it('secrets.get returns undefined for missing keys', () => {
    const ctx = mockContext({ secrets: { API_KEY: 'abc123' } });
    expect(ctx.secrets.get('MISSING')).toBeUndefined();
  });

  it('secrets.has returns false for missing keys', () => {
    const ctx = mockContext({ secrets: { API_KEY: 'abc123' } });
    expect(ctx.secrets.has('MISSING')).toBe(false);
  });

  it('env contains configured environment variables', () => {
    const ctx = mockContext({ env: { NODE_ENV: 'test', REGION: 'us-east-1' } });
    expect(ctx.env.NODE_ENV).toBe('test');
    expect(ctx.env.REGION).toBe('us-east-1');
  });

  it('emitMetric records metrics', () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    ctx.emitMetric('latency', 42, { unit: 'ms' });
    const metrics = inspector.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('latency');
    expect(metrics[0].value).toBe(42);
    expect(metrics[0].tags).toEqual({ unit: 'ms' });
  });

  it('getMetrics returns all recorded metrics', () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    ctx.emitMetric('m1', 1);
    ctx.emitMetric('m2', 2);
    ctx.emitMetric('m3', 3);
    expect(inspector.getMetrics()).toHaveLength(3);
  });

  it('emitStatus records status updates', () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    ctx.emitStatus('running', 'Step 1 in progress');
    const statuses = inspector.getStatuses();
    expect(statuses).toHaveLength(1);
    expect(statuses[0].status).toBe('running');
    expect(statuses[0].message).toBe('Step 1 in progress');
  });

  it('getStatuses returns all recorded statuses', () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    ctx.emitStatus('running');
    ctx.emitStatus('success', 'done');
    expect(inspector.getStatuses()).toHaveLength(2);
  });

  it('http.get records calls and returns configured response', async () => {
    const ctx = mockContext({
      httpResponses: {
        'GET https://api.example.com/health': { status: 200, headers: {}, body: { ok: true } },
      },
    });
    const inspector = ctx as unknown as MockContextInspector;
    const resp = await ctx.http.get('https://api.example.com/health');
    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({ ok: true });
    const calls = inspector.getHttpCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url).toBe('https://api.example.com/health');
  });

  it('http.post records calls with body', async () => {
    const ctx = mockContext({
      httpResponses: {
        'POST https://api.example.com/data': { status: 201, headers: {}, body: { id: 1 } },
      },
    });
    const inspector = ctx as unknown as MockContextInspector;
    const resp = await ctx.http.post('https://api.example.com/data', { name: 'test' }, { headers: { 'Content-Type': 'application/json' } });
    expect(resp.status).toBe(201);
    const calls = inspector.getHttpCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body).toEqual({ name: 'test' });
  });

  it('http.put records calls', async () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    await ctx.http.put('https://api.example.com/item/1', { name: 'updated' }, {});
    const calls = inspector.getHttpCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url).toBe('https://api.example.com/item/1');
    expect(calls[0].body).toEqual({ name: 'updated' });
  });

  it('http.delete records calls', async () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    await ctx.http.delete('https://api.example.com/item/1');
    const calls = inspector.getHttpCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('DELETE');
    expect(calls[0].url).toBe('https://api.example.com/item/1');
  });

  it('getHttpCalls returns all HTTP interactions', async () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    await ctx.http.get('https://a.com');
    await ctx.http.post('https://b.com', {}, {});
    await ctx.http.delete('https://c.com');
    expect(inspector.getHttpCalls()).toHaveLength(3);
  });

  it('abort triggers the signal', () => {
    const ctx = mockContext();
    const inspector = ctx as unknown as MockContextInspector;
    expect(ctx.signal.aborted).toBe(false);
    inspector.abort();
    expect(ctx.signal.aborted).toBe(true);
  });

  it('works with no overrides (defaults)', () => {
    const ctx = mockContext();
    expect(ctx.executionId).toMatch(/^test-/);
    expect(ctx.env).toEqual({});
    expect(ctx.secrets.get('anything')).toBeUndefined();
    expect(ctx.signal.aborted).toBe(false);
  });
});
