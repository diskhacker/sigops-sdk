import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineTemplate } from '../src/define-template.js';
import { TemplateRenderer } from '../src/renderer.js';

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
    { name: 'basic', params: { serviceName: 'nginx', threshold: 90, interval: '5m' } },
  ],
});

describe('TemplateRenderer', () => {
  it('renders valid params successfully', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);
    const result = renderer.render({
      serviceName: 'nginx',
      threshold: 90,
      interval: '5m',
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('monitor nginx_cpu');
    expect(result.output).toContain('threshold: 90');
  });

  it('returns error for invalid params', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);
    const result = renderer.render({
      serviceName: 123,
      threshold: 'not-a-number',
    });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('renderStrict throws on invalid params', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);

    expect(() =>
      renderer.renderStrict({ serviceName: 123 } as any),
    ).toThrow();
  });

  it('renderStrict returns output on valid params', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);
    const output = renderer.renderStrict({
      serviceName: 'redis',
      threshold: 80,
      interval: '10m',
      alertSeverity: 'high',
    });

    expect(output).toContain('monitor redis_cpu');
    expect(output).toContain('severity: "high"');
  });

  it('validate returns valid for good params', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);
    const result = renderer.validate({
      serviceName: 'nginx',
      threshold: 90,
      interval: '5m',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validate returns errors for bad params', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);
    const result = renderer.validate({
      serviceName: 123,
      threshold: 200,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toHaveProperty('path');
    expect(result.errors[0]).toHaveProperty('message');
    expect(result.errors[0]).toHaveProperty('code');
  });

  it('getMetadata returns correct info', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);
    const metadata = renderer.getMetadata();

    expect(metadata.name).toBe('cpu-monitor');
    expect(metadata.description).toBe('CPU monitoring template');
    expect(metadata.version).toBe('0.1.0');
    expect(metadata.category).toBe('monitoring');
    expect(metadata.tags).toEqual([]);
  });

  it('renderExamples renders all examples', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);
    const results = renderer.renderExamples();

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].output).toContain('nginx_cpu');
  });

  it('renderExamples handles template with no examples', () => {
    const noExamplesTemplate = defineTemplate({
      name: 'no-examples',
      description: 'Template without examples',
      category: 'custom',
      params: z.object({ name: z.string() }),
      render: (params) => `hello ${params.name}`,
    });

    const renderer = new TemplateRenderer(noExamplesTemplate);
    const results = renderer.renderExamples();

    expect(results).toHaveLength(0);
  });

  it('handles complex nested params', () => {
    const complexTemplate = defineTemplate({
      name: 'complex-template',
      description: 'Complex params template',
      category: 'deployment',
      params: z.object({
        service: z.object({
          name: z.string(),
          port: z.number(),
        }),
        replicas: z.number().default(1),
      }),
      render: (params) =>
        `deploy ${params.service.name}:${params.service.port} replicas=${params.replicas}`,
    });

    const renderer = new TemplateRenderer(complexTemplate);
    const result = renderer.render({
      service: { name: 'api', port: 8080 },
      replicas: 3,
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe('deploy api:8080 replicas=3');
  });

  it('reports multiple validation errors', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);
    const result = renderer.validate({});

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('render output is a string', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);
    const result = renderer.render({
      serviceName: 'test',
      threshold: 50,
      interval: '1m',
    });

    expect(result.success).toBe(true);
    expect(typeof result.output).toBe('string');
  });

  it('handles empty params object when schema allows it', () => {
    const emptyTemplate = defineTemplate({
      name: 'empty-params',
      description: 'Template with optional params',
      category: 'custom',
      params: z.object({
        name: z.string().default('world'),
      }),
      render: (params) => `hello ${params.name}`,
    });

    const renderer = new TemplateRenderer(emptyTemplate);
    const result = renderer.render({});

    expect(result.success).toBe(true);
    expect(result.output).toBe('hello world');
  });

  it('renderer preserves template name in metadata', () => {
    const renderer = new TemplateRenderer(monitoringTemplate);
    const metadata = renderer.getMetadata();

    expect(metadata.name).toBe(monitoringTemplate.name);
  });
});
