import { z } from 'zod';
import type { ToolDefinition, InputSchema, OutputSchema, ToolMetadata, ExecutionResult, RetryPolicy } from './types.js';
import type { ToolContext } from './context.js';

export interface DefineToolConfig<
  TInput extends InputSchema,
  TOutput extends OutputSchema
> {
  name: string;
  description: string;
  version?: string;
  input: TInput;
  output: TOutput;
  execute: (input: z.infer<TInput>, ctx: ToolContext) => Promise<z.infer<TOutput>>;
  tags?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

/**
 * Factory function to define a SigOps tool
 */
export function defineTool<TInput extends InputSchema, TOutput extends OutputSchema>(
  config: DefineToolConfig<TInput, TOutput>
): ToolDefinition<TInput, TOutput> {
  // Validate config
  if (!config.name || typeof config.name !== 'string') {
    throw new Error('Tool name is required and must be a string');
  }
  if (!/^[a-z][a-z0-9-]*$/.test(config.name)) {
    throw new Error('Tool name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens');
  }
  if (!config.description || typeof config.description !== 'string') {
    throw new Error('Tool description is required');
  }
  if (!config.input) {
    throw new Error('Tool input schema is required');
  }
  if (!config.output) {
    throw new Error('Tool output schema is required');
  }
  if (typeof config.execute !== 'function') {
    throw new Error('Tool execute function is required');
  }

  return {
    name: config.name,
    description: config.description,
    version: config.version ?? '0.1.0',
    inputSchema: config.input,
    outputSchema: config.output,
    execute: config.execute,
    tags: config.tags ?? [],
    timeout: config.timeout ?? 30000,
    retryPolicy: config.retryPolicy,
  };
}

/**
 * Get metadata from a tool definition (without executing)
 */
export function getToolMetadata(tool: ToolDefinition): ToolMetadata {
  return {
    name: tool.name,
    description: tool.description,
    version: tool.version,
    tags: tool.tags ?? [],
    timeout: tool.timeout ?? 30000,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
  };
}

/**
 * Execute a tool with input validation, output validation, and retry logic
 */
export async function executeTool<TInput extends InputSchema, TOutput extends OutputSchema>(
  tool: ToolDefinition<TInput, TOutput>,
  input: unknown,
  ctx: ToolContext
): Promise<ExecutionResult<z.infer<TOutput>>> {
  const start = Date.now();
  let retries = 0;
  const maxRetries = tool.retryPolicy?.maxRetries ?? 0;

  // Validate input
  const inputResult = tool.inputSchema.safeParse(input);
  if (!inputResult.success) {
    return {
      success: false,
      error: `Input validation failed: ${inputResult.error.message}`,
      duration: Date.now() - start,
      retries: 0,
    };
  }

  while (retries <= maxRetries) {
    try {
      // Check for abort
      if (ctx.signal.aborted) {
        return {
          success: false,
          error: 'Execution aborted',
          duration: Date.now() - start,
          retries,
        };
      }

      const result = await tool.execute(inputResult.data, ctx);

      // Validate output
      const outputResult = tool.outputSchema.safeParse(result);
      if (!outputResult.success) {
        return {
          success: false,
          error: `Output validation failed: ${outputResult.error.message}`,
          duration: Date.now() - start,
          retries,
        };
      }

      return {
        success: true,
        data: outputResult.data,
        duration: Date.now() - start,
        retries,
      };
    } catch (err: any) {
      const errorMessage = err?.message ?? String(err);

      // Check if error is retryable
      if (retries < maxRetries) {
        const retryableErrors = tool.retryPolicy?.retryableErrors;
        const isRetryable = !retryableErrors || retryableErrors.some(e => errorMessage.includes(e));

        if (isRetryable) {
          retries++;
          const backoff = tool.retryPolicy?.backoffMs ?? 100;
          await new Promise(resolve => setTimeout(resolve, backoff * retries));
          continue;
        }
      }

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - start,
        retries,
      };
    }
  }

  return {
    success: false,
    error: 'Max retries exceeded',
    duration: Date.now() - start,
    retries,
  };
}
