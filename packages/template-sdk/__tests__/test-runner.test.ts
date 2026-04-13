import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineTemplate } from '../src/define-template.js';
import { TestRunner } from '../src/test-runner.js';

const monitoringTemplate = defineTemplate({
  name: 'cpu-monitor',
  description: 'CPU monitoring template',
  category: 'monitoring',
  params: z.object({
    serviceName: z.string(),
    threshold: z.number().min(0).max(100),
    interval: z.string(),
    alertSeverity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  }),
  render: (params) =>
    `monitor ${params.serviceName}_cpu {\n  threshold: ${params.threshold}\n  interval: "${params.interval}"\n  action: alert("${params.serviceName} CPU high", severity: "${params.alertSeverity}")\n}`,
  examples: [
    {
      name: 'basic',
      params: { serviceName: 'nginx', threshold: 90, interval: '5m' },
      expectedOutput: `monitor nginx_cpu {\n  threshold: 90\n  interval: "5m"\n  action: alert("nginx CPU high", severity: "medium")\n}`,
    },
  ],
});

describe('TestRunner', () => {
  it('runTest passes for matching output', () => {
    const runner = new TestRunner(monitoringTemplate);
    const result = runner.runTest({
      name: 'matching-test',
      params: { serviceName: 'nginx', threshold: 90, interval: '5m' },
      expected: `monitor nginx_cpu {\n  threshold: 90\n  interval: "5m"\n  action: alert("nginx CPU high", severity: "medium")\n}`,
    });

    expect(result.passed).toBe(true);
    expect(result.name).toBe('matching-test');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('runTest fails for non-matching output', () => {
    const runner = new TestRunner(monitoringTemplate);
    const result = runner.runTest({
      name: 'non-matching-test',
      params: { serviceName: 'nginx', threshold: 90, interval: '5m' },
      expected: 'wrong output',
    });

    expect(result.passed).toBe(false);
    expect(result.error).toContain('Output mismatch');
  });

  it('runTest supports RegExp matching', () => {
    const runner = new TestRunner(monitoringTemplate);
    const result = runner.runTest({
      name: 'regex-test',
      params: { serviceName: 'nginx', threshold: 90, interval: '5m' },
      expected: /monitor nginx_cpu/,
    });

    expect(result.passed).toBe(true);
  });

  it('runTest handles shouldFail cases', () => {
    const runner = new TestRunner(monitoringTemplate);
    const result = runner.runTest({
      name: 'should-fail-test',
      params: { serviceName: 123 as any, threshold: 'bad' as any },
      shouldFail: true,
    });

    expect(result.passed).toBe(true);
  });

  it('runTests returns correct totals', () => {
    const runner = new TestRunner(monitoringTemplate);
    const suite = runner.runTests([
      {
        name: 'test-1',
        params: { serviceName: 'nginx', threshold: 90, interval: '5m' },
        expected: /nginx_cpu/,
      },
      {
        name: 'test-2',
        params: { serviceName: 'redis', threshold: 80, interval: '10m' },
        expected: /redis_cpu/,
      },
    ]);

    expect(suite.total).toBe(2);
    expect(suite.results).toHaveLength(2);
    expect(suite.duration).toBeGreaterThanOrEqual(0);
  });

  it('runTests counts passed/failed correctly', () => {
    const runner = new TestRunner(monitoringTemplate);
    const suite = runner.runTests([
      {
        name: 'pass-test',
        params: { serviceName: 'nginx', threshold: 90, interval: '5m' },
        expected: /nginx_cpu/,
      },
      {
        name: 'fail-test',
        params: { serviceName: 'redis', threshold: 80, interval: '10m' },
        expected: 'wrong output',
      },
    ]);

    expect(suite.passed).toBe(1);
    expect(suite.failed).toBe(1);
  });

  it('runExamples uses template examples', () => {
    const runner = new TestRunner(monitoringTemplate);
    const suite = runner.runExamples();

    expect(suite.total).toBe(1);
    expect(suite.passed).toBe(1);
    expect(suite.failed).toBe(0);
    expect(suite.results[0].name).toBe('basic');
  });

  it('runExamples returns empty suite for no examples', () => {
    const noExamplesTemplate = defineTemplate({
      name: 'no-examples',
      description: 'Template without examples',
      category: 'custom',
      params: z.object({ name: z.string() }),
      render: (params) => `hello ${params.name}`,
    });

    const runner = new TestRunner(noExamplesTemplate);
    const suite = runner.runExamples();

    expect(suite.total).toBe(0);
    expect(suite.passed).toBe(0);
    expect(suite.failed).toBe(0);
    expect(suite.results).toHaveLength(0);
  });

  it('runWithAssertion runs custom assertion', () => {
    const runner = new TestRunner(monitoringTemplate);
    const result = runner.runWithAssertion(
      { serviceName: 'nginx', threshold: 90, interval: '5m' },
      (output) => output.includes('nginx_cpu'),
      'custom-assertion-test',
    );

    expect(result.passed).toBe(true);
    expect(result.name).toBe('custom-assertion-test');
  });

  it('runWithAssertion records failure on false assertion', () => {
    const runner = new TestRunner(monitoringTemplate);
    const result = runner.runWithAssertion(
      { serviceName: 'nginx', threshold: 90, interval: '5m' },
      (output) => output.includes('nonexistent'),
      'failing-assertion',
    );

    expect(result.passed).toBe(false);
    expect(result.error).toContain('Custom assertion failed');
  });
});
