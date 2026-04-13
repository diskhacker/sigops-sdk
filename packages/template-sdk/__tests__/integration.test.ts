import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineTemplate } from '../src/define-template.js';
import { TemplateRenderer } from '../src/renderer.js';
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

describe('Integration', () => {
  it('end-to-end: defineTemplate → TemplateRenderer → render', () => {
    const template = defineTemplate({
      name: 'disk-alert',
      description: 'Disk usage alerting template',
      category: 'alerting',
      params: z.object({
        mountPoint: z.string(),
        thresholdPct: z.number().min(0).max(100),
      }),
      render: (params) =>
        `alert disk_usage {\n  mount: "${params.mountPoint}"\n  when: usage > ${params.thresholdPct}%\n}`,
    });

    const renderer = new TemplateRenderer(template);
    const result = renderer.render({ mountPoint: '/data', thresholdPct: 85 });

    expect(result.success).toBe(true);
    expect(result.output).toContain('mount: "/data"');
    expect(result.output).toContain('usage > 85%');
  });

  it('end-to-end: defineTemplate → TestRunner → runTests', () => {
    const runner = new TestRunner(monitoringTemplate);
    const suite = runner.runTests([
      {
        name: 'nginx-basic',
        params: { serviceName: 'nginx', threshold: 90, interval: '5m' },
        expected: /monitor nginx_cpu/,
      },
      {
        name: 'invalid-params',
        params: { serviceName: 123 as any },
        shouldFail: true,
      },
    ]);

    expect(suite.total).toBe(2);
    expect(suite.passed).toBe(2);
    expect(suite.failed).toBe(0);
  });

  it('template with complex schema renders correctly', () => {
    const complexTemplate = defineTemplate({
      name: 'deploy-service',
      description: 'Service deployment template',
      category: 'deployment',
      params: z.object({
        service: z.object({
          name: z.string(),
          image: z.string(),
          port: z.number(),
        }),
        environment: z.enum(['staging', 'production']),
        replicas: z.number().min(1).max(10).default(1),
        labels: z.record(z.string()).optional(),
      }),
      render: (params) => {
        const labelStr = params.labels
          ? Object.entries(params.labels)
              .map(([k, v]) => `    ${k}: "${v}"`)
              .join('\n')
          : '';
        return [
          `deploy ${params.service.name} {`,
          `  image: "${params.service.image}"`,
          `  port: ${params.service.port}`,
          `  env: ${params.environment}`,
          `  replicas: ${params.replicas}`,
          labelStr ? `  labels {\n${labelStr}\n  }` : '',
          `}`,
        ]
          .filter(Boolean)
          .join('\n');
      },
    });

    const renderer = new TemplateRenderer(complexTemplate);
    const result = renderer.render({
      service: { name: 'api-gateway', image: 'api:v2.1', port: 8080 },
      environment: 'production',
      replicas: 3,
      labels: { team: 'platform', tier: 'frontend' },
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('deploy api-gateway');
    expect(result.output).toContain('env: production');
    expect(result.output).toContain('replicas: 3');
    expect(result.output).toContain('team: "platform"');
  });

  it('template generates valid SEL-like output', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);
    const result = renderer.render({
      serviceName: 'postgres',
      threshold: 75,
      interval: '30s',
      alertSeverity: 'critical',
    });

    expect(result.success).toBe(true);
    const output = result.output!;

    // Verify SEL-like structure: block with braces, key-value pairs
    expect(output).toMatch(/^monitor \w+_cpu \{/);
    expect(output).toMatch(/threshold: \d+/);
    expect(output).toMatch(/interval: "[^"]+"/);
    expect(output).toMatch(/action: alert\(/);
    expect(output).toMatch(/\}$/);
  });

  it('full lifecycle: define → render → test → validate', () => {
    const template = defineTemplate({
      name: 'health-check',
      description: 'Service health check template',
      version: '1.0.0',
      category: 'monitoring',
      params: z.object({
        endpoint: z.string().url(),
        timeoutMs: z.number().min(100).max(30000).default(5000),
        retries: z.number().min(0).max(5).default(3),
      }),
      render: (params) =>
        `check http {\n  url: "${params.endpoint}"\n  timeout: ${params.timeoutMs}ms\n  retries: ${params.retries}\n}`,
      examples: [
        {
          name: 'simple-health',
          params: { endpoint: 'https://api.example.com/health' },
          expectedOutput: `check http {\n  url: "https://api.example.com/health"\n  timeout: 5000ms\n  retries: 3\n}`,
        },
      ],
    });

    // 1. Render
    const renderer = new TemplateRenderer(template);
    const renderResult = renderer.render({ endpoint: 'https://api.example.com/health' });
    expect(renderResult.success).toBe(true);

    // 2. Validate
    const validationResult = renderer.validate({ endpoint: 'https://api.example.com/health' });
    expect(validationResult.valid).toBe(true);

    // 3. Validate bad input
    const badValidation = renderer.validate({ endpoint: 'not-a-url' });
    expect(badValidation.valid).toBe(false);

    // 4. Test
    const runner = new TestRunner(template);
    const testSuite = runner.runExamples();
    expect(testSuite.total).toBe(1);
    expect(testSuite.passed).toBe(1);

    // 5. Metadata
    const metadata = renderer.getMetadata();
    expect(metadata.name).toBe('health-check');
    expect(metadata.version).toBe('1.0.0');
  });

  it('multiple renders with different params produce different outputs', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);

    const result1 = renderer.render({
      serviceName: 'nginx',
      threshold: 90,
      interval: '5m',
      alertSeverity: 'high',
    });

    const result2 = renderer.render({
      serviceName: 'redis',
      threshold: 50,
      interval: '1m',
      alertSeverity: 'low',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.output).not.toBe(result2.output);
    expect(result1.output).toContain('nginx_cpu');
    expect(result2.output).toContain('redis_cpu');
    expect(result1.output).toContain('threshold: 90');
    expect(result2.output).toContain('threshold: 50');
  });
});
