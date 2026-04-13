import { z } from 'zod';
import type { TemplateDefinition, ParameterSchema, TemplateCategory, TemplateExample } from './types.js';

export interface DefineTemplateConfig<TParams extends ParameterSchema> {
  name: string;
  description: string;
  version?: string;
  category: TemplateCategory;
  params: TParams;
  render: (params: z.infer<TParams>) => string;
  tags?: string[];
  examples?: TemplateExample[];
}

export function defineTemplate<TParams extends ParameterSchema>(
  config: DefineTemplateConfig<TParams>
): TemplateDefinition<TParams> {
  if (!config.name || typeof config.name !== 'string') {
    throw new Error('Template name is required');
  }
  if (!/^[a-z][a-z0-9-]*$/.test(config.name)) {
    throw new Error('Template name must be kebab-case');
  }
  if (!config.description) {
    throw new Error('Template description is required');
  }
  if (!config.category) {
    throw new Error('Template category is required');
  }
  const validCategories: TemplateCategory[] = ['monitoring', 'alerting', 'remediation', 'deployment', 'maintenance', 'custom'];
  if (!validCategories.includes(config.category)) {
    throw new Error(`Invalid category: ${config.category}`);
  }
  if (!config.params) {
    throw new Error('Template params schema is required');
  }
  if (typeof config.render !== 'function') {
    throw new Error('Template render function is required');
  }

  return {
    name: config.name,
    description: config.description,
    version: config.version ?? '0.1.0',
    category: config.category,
    paramSchema: config.params,
    render: config.render,
    tags: config.tags ?? [],
    examples: config.examples,
  };
}
