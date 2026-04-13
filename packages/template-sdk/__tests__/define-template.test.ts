import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineTemplate } from '../src/define-template.js';
import type { TemplateCategory } from '../src/types.js';

const basicParams = z.object({
  serviceName: z.string(),
  threshold: z.number(),
});

const basicRender = (params: { serviceName: string; threshold: number }) =>
  `monitor ${params.serviceName} { threshold: ${params.threshold} }`;

describe('defineTemplate', () => {
  it('creates valid template with all fields', () => {
    const template = defineTemplate({
      name: 'cpu-monitor',
      description: 'CPU monitoring template',
      version: '1.0.0',
      category: 'monitoring',
      params: basicParams,
      render: basicRender,
      tags: ['cpu', 'monitoring'],
      examples: [{ name: 'basic', params: { serviceName: 'nginx', threshold: 90 } }],
    });

    expect(template.name).toBe('cpu-monitor');
    expect(template.description).toBe('CPU monitoring template');
    expect(template.version).toBe('1.0.0');
    expect(template.category).toBe('monitoring');
    expect(template.paramSchema).toBe(basicParams);
    expect(template.render).toBe(basicRender);
    expect(template.tags).toEqual(['cpu', 'monitoring']);
    expect(template.examples).toHaveLength(1);
  });

  it('applies default version', () => {
    const template = defineTemplate({
      name: 'my-template',
      description: 'A template',
      category: 'custom',
      params: basicParams,
      render: basicRender,
    });

    expect(template.version).toBe('0.1.0');
  });

  it('throws on missing name', () => {
    expect(() =>
      defineTemplate({
        name: '',
        description: 'A template',
        category: 'custom',
        params: basicParams,
        render: basicRender,
      }),
    ).toThrow('Template name is required');
  });

  it('throws on invalid name format', () => {
    expect(() =>
      defineTemplate({
        name: 'MyTemplate',
        description: 'A template',
        category: 'custom',
        params: basicParams,
        render: basicRender,
      }),
    ).toThrow('Template name must be kebab-case');
  });

  it('throws on missing description', () => {
    expect(() =>
      defineTemplate({
        name: 'my-template',
        description: '',
        category: 'custom',
        params: basicParams,
        render: basicRender,
      }),
    ).toThrow('Template description is required');
  });

  it('throws on missing category', () => {
    expect(() =>
      defineTemplate({
        name: 'my-template',
        description: 'A template',
        category: '' as TemplateCategory,
        params: basicParams,
        render: basicRender,
      }),
    ).toThrow('Template category is required');
  });

  it('throws on invalid category', () => {
    expect(() =>
      defineTemplate({
        name: 'my-template',
        description: 'A template',
        category: 'invalid' as TemplateCategory,
        params: basicParams,
        render: basicRender,
      }),
    ).toThrow('Invalid category: invalid');
  });

  it('throws on missing params schema', () => {
    expect(() =>
      defineTemplate({
        name: 'my-template',
        description: 'A template',
        category: 'custom',
        params: undefined as any,
        render: basicRender,
      }),
    ).toThrow('Template params schema is required');
  });

  it('throws on missing render function', () => {
    expect(() =>
      defineTemplate({
        name: 'my-template',
        description: 'A template',
        category: 'custom',
        params: basicParams,
        render: undefined as any,
      }),
    ).toThrow('Template render function is required');
  });

  it('accepts all valid categories', () => {
    const categories: TemplateCategory[] = [
      'monitoring',
      'alerting',
      'remediation',
      'deployment',
      'maintenance',
      'custom',
    ];

    for (const category of categories) {
      const template = defineTemplate({
        name: 'my-template',
        description: 'A template',
        category,
        params: basicParams,
        render: basicRender,
      });
      expect(template.category).toBe(category);
    }
  });

  it('preserves examples', () => {
    const examples = [
      { name: 'basic', params: { serviceName: 'nginx', threshold: 90 } },
      { name: 'advanced', description: 'Advanced usage', params: { serviceName: 'redis', threshold: 80 }, expectedOutput: 'monitor redis { threshold: 80 }' },
    ];

    const template = defineTemplate({
      name: 'my-template',
      description: 'A template',
      category: 'custom',
      params: basicParams,
      render: basicRender,
      examples,
    });

    expect(template.examples).toEqual(examples);
    expect(template.examples).toHaveLength(2);
  });

  it('preserves tags', () => {
    const tags = ['cpu', 'monitoring', 'infrastructure'];

    const template = defineTemplate({
      name: 'my-template',
      description: 'A template',
      category: 'custom',
      params: basicParams,
      render: basicRender,
      tags,
    });

    expect(template.tags).toEqual(tags);
  });
});
