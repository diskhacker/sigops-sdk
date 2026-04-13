import { z } from 'zod';
import type { ToolDefinition, ExecutionResult } from './types.js';
import type { ToolContext, MockContextInspector, MockContextOptions } from './context.js';
import { mockContext } from './context.js';
import { executeTool } from './define-tool.js';

/**
 * Test harness for running tools in a controlled test environment
 */
export class TestHarness<TInput extends z.ZodType = z.ZodType, TOutput extends z.ZodType = z.ZodType> {
  private tool: ToolDefinition<TInput, TOutput>;
  private contextOptions: Partial<MockContextOptions>;
  private results: ExecutionResult<z.infer<TOutput>>[] = [];

  constructor(tool: ToolDefinition<TInput, TOutput>, contextOptions?: Partial<MockContextOptions>) {
    this.tool = tool;
    this.contextOptions = contextOptions ?? {};
  }

  /**
   * Execute the tool with given input
   */
  async execute(input: z.infer<TInput>, ctxOverrides?: Partial<MockContextOptions>): Promise<ExecutionResult<z.infer<TOutput>>> {
    const ctx = mockContext({ ...this.contextOptions, ...ctxOverrides });
    const result = await executeTool(this.tool, input, ctx);
    this.results.push(result);
    return result;
  }

  /**
   * Execute and return both result and context inspector
   */
  async executeWithContext(
    input: z.infer<TInput>,
    ctxOverrides?: Partial<MockContextOptions>
  ): Promise<{ result: ExecutionResult<z.infer<TOutput>>; inspector: MockContextInspector }> {
    const ctx = mockContext({ ...this.contextOptions, ...ctxOverrides }) as ToolContext & MockContextInspector;
    const result = await executeTool(this.tool, input, ctx);
    this.results.push(result);
    return { result, inspector: ctx as MockContextInspector };
  }

  /**
   * Get all execution results
   */
  getResults(): ExecutionResult<z.infer<TOutput>>[] {
    return [...this.results];
  }

  /**
   * Get last execution result
   */
  getLastResult(): ExecutionResult<z.infer<TOutput>> | undefined {
    return this.results[this.results.length - 1];
  }

  /**
   * Assert last execution was successful
   */
  assertSuccess(): z.infer<TOutput> {
    const last = this.getLastResult();
    if (!last) throw new Error('No executions yet');
    if (!last.success) throw new Error(`Expected success but got error: ${last.error}`);
    return last.data;
  }

  /**
   * Assert last execution failed
   */
  assertFailure(): string {
    const last = this.getLastResult();
    if (!last) throw new Error('No executions yet');
    if (last.success) throw new Error('Expected failure but got success');
    return last.error!;
  }

  /**
   * Reset execution history
   */
  reset(): void {
    this.results = [];
  }

  /**
   * Get tool metadata
   */
  getToolName(): string { return this.tool.name; }
  getToolVersion(): string { return this.tool.version; }
  getToolDescription(): string { return this.tool.description; }
}
