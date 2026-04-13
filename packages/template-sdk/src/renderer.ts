import { z } from 'zod';
import type { TemplateDefinition, ParameterSchema, RenderResult, ValidationResult } from './types.js';

export class TemplateRenderer<TParams extends ParameterSchema = ParameterSchema> {
  constructor(private template: TemplateDefinition<TParams>) {}

  /** Render with parameter validation */
  render(params: unknown): RenderResult {
    const validation = this.validate(params);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors.map((e) => `${e.path}: ${e.message}`),
      };
    }

    try {
      const parsed = this.template.paramSchema.parse(params);
      const output = this.template.render(parsed);
      return { success: true, output };
    } catch (err: any) {
      return {
        success: false,
        errors: [err.message ?? 'Unknown render error'],
      };
    }
  }

  /** Validate parameters without rendering */
  validate(params: unknown): ValidationResult {
    const result = this.template.paramSchema.safeParse(params);
    if (result.success) {
      return { valid: true, errors: [] };
    }

    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return { valid: false, errors };
  }

  /** Render with strict validation - throws on error */
  renderStrict(params: z.infer<TParams>): string {
    const parsed = this.template.paramSchema.parse(params);
    return this.template.render(parsed);
  }

  /** Get template metadata */
  getMetadata(): {
    name: string;
    description: string;
    version: string;
    category: string;
    tags: string[];
  } {
    return {
      name: this.template.name,
      description: this.template.description,
      version: this.template.version,
      category: this.template.category,
      tags: this.template.tags ?? [],
    };
  }

  /** Render all examples and return results */
  renderExamples(): RenderResult[] {
    if (!this.template.examples || this.template.examples.length === 0) {
      return [];
    }

    return this.template.examples.map((example) => this.render(example.params));
  }
}
