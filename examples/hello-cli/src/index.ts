import { InitCommand } from '@sigops/cli';
import type { InitResult } from '@sigops/cli';

/** The four kinds of scaffolds supported by `sigops init`. */
export type ProjectType = 'tool' | 'template' | 'plugin' | 'connector';

/**
 * hello-cli — demonstrates programmatic use of @sigops/cli.
 *
 * Normally you would run `sigops init <name> --type tool` from the terminal;
 * this example shows the underlying `InitCommand` class that powers that
 * command. It's a *pure* function — it returns the files that would be
 * written without touching the filesystem, which makes it easy to test.
 */
export function scaffold(name: string, type: ProjectType = 'tool'): InitResult {
  const cmd = new InitCommand();
  return cmd.generateScaffold({
    name,
    type,
    description: `Scaffolded from @sigops-examples/hello-cli`,
    author: 'SigOps SDK Examples',
  });
}

/**
 * Produces a human-readable summary of the files `scaffold` would create.
 */
export function summarize(result: InitResult): string {
  if (!result.success) {
    return `FAILED: ${result.errors?.join('; ') ?? 'unknown'}`;
  }
  const lines = [`Scaffold for '${result.projectPath}' would create:`];
  for (const file of result.files) {
    lines.push(`  - ${file.path} (${file.content.length} bytes)`);
  }
  return lines.join('\n');
}
