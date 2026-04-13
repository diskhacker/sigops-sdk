import { z } from 'zod';

/** Position in execution lifecycle */
export type ToolStatus = 'idle' | 'running' | 'success' | 'error';

/** Schema for tool input/output */
export type InputSchema = z.ZodType<any>;
export type OutputSchema = z.ZodType<any>;

/** Core tool definition interface */
export interface ToolDefinition<
  TInput extends InputSchema = InputSchema,
  TOutput extends OutputSchema = OutputSchema
> {
  name: string;
  description: string;
  version: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  execute: (input: z.infer<TInput>, ctx: ToolContext) => Promise<z.infer<TOutput>>;
  tags?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs?: number;
  retryableErrors?: string[];
}

export interface ToolMetadata {
  name: string;
  description: string;
  version: string;
  tags: string[];
  timeout: number;
  inputSchema: z.ZodType<any>;
  outputSchema: z.ZodType<any>;
}

export interface ExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  retries: number;
}

// Import ToolContext type — use import type to avoid circular dependency
import type { ToolContext } from './context.js';
