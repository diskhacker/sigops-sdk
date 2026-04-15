import { defineTool, z } from '@sigops/tool-sdk';

/**
 * hello-tool — a minimal SigOps tool that echoes its input.
 *
 * Demonstrates the smallest possible tool that:
 *   1. Declares a typed input schema (Zod)
 *   2. Declares a typed output schema (Zod)
 *   3. Implements execute(input, ctx) with access to the ToolContext
 *   4. Uses ctx.logger + ctx.emitMetric for observability
 */
export const helloTool = defineTool({
  name: 'hello-tool',
  description: 'Echoes the given message back to the caller',
  version: '0.1.0',
  input: z.object({
    message: z.string().min(1, 'message is required'),
    uppercase: z.boolean().optional().default(false),
  }),
  output: z.object({
    echoed: z.string(),
    length: z.number().int().nonnegative(),
    receivedAt: z.string(),
  }),
  async execute(input, ctx) {
    ctx.logger.info(`hello-tool received: ${input.message}`);
    ctx.emitMetric('hello_tool.calls', 1);

    const echoed = input.uppercase ? input.message.toUpperCase() : input.message;

    return {
      echoed,
      length: echoed.length,
      receivedAt: new Date(0).toISOString(),
    };
  },
});

export default helloTool;
