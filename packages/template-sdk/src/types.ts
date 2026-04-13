import { z } from 'zod';

export type ParameterSchema = z.ZodType<any>;

export interface TemplateDefinition<TParams extends ParameterSchema = ParameterSchema> {
  name: string;
  description: string;
  version: string;
  category: TemplateCategory;
  paramSchema: TParams;
  render: (params: z.infer<TParams>) => string;
  tags?: string[];
  examples?: TemplateExample[];
}

export type TemplateCategory = 'monitoring' | 'alerting' | 'remediation' | 'deployment' | 'maintenance' | 'custom';

export interface TemplateExample {
  name: string;
  description?: string;
  params: Record<string, any>;
  expectedOutput?: string;
}

export interface RenderResult {
  success: boolean;
  output?: string;
  errors?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface TestCase {
  name: string;
  params: Record<string, any>;
  expected?: string | RegExp;
  shouldFail?: boolean;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  output?: string;
  duration: number;
}

export interface TestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
  duration: number;
}
