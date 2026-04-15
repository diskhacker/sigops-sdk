import { defineTemplate, z } from '@sigops/template-sdk';

/**
 * hello-template — the smallest possible SigOps workflow template.
 *
 * A template takes typed parameters and deterministically renders a
 * SigOps Expression Language (SEL) program.
 */
export const helloTemplate = defineTemplate({
  name: 'hello-template',
  description: 'Generates a trivial monitor/alert SEL program that says hello',
  version: '0.1.0',
  category: 'monitoring',
  params: z.object({
    target: z.string().min(1).describe('Host/service to greet'),
    severity: z.enum(['low', 'medium', 'high']).default('low'),
    recipient: z.string().email().optional(),
  }),
  render(params) {
    const recipient = params.recipient ?? 'ops@example.com';
    return [
      `monitor "hello-${params.target}" {`,
      `  check: "ping ${params.target}"`,
      `  every: 60s`,
      `}`,
      ``,
      `alert "hello-${params.target}-down" when monitor.failed {`,
      `  severity: ${params.severity}`,
      `  notify: "${recipient}"`,
      `  message: "hello! ${params.target} is unreachable"`,
      `}`,
      ``,
    ].join('\n');
  },
  examples: [
    {
      name: 'default',
      description: 'Default parameters — low severity, default recipient',
      params: { target: 'api.example.com' },
    },
    {
      name: 'high-severity',
      params: { target: 'db.example.com', severity: 'high', recipient: 'oncall@example.com' },
    },
  ],
});

export default helloTemplate;
