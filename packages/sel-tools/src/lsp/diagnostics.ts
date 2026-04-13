import type { Program } from '../parser/ast.js';
import { LintEngine, type LintDiagnostic } from '../linter/engine.js';
import { defaultRules } from '../linter/rules/index.js';
import { parse } from '../parser/parser.js';

/**
 * Produce diagnostics for SEL source code.
 *
 * Parses the source first; if parsing fails a single parse-error diagnostic
 * is returned. Otherwise all default lint rules are applied.
 */
export function getDiagnostics(source: string): { diagnostics: LintDiagnostic[]; ast: Program | null } {
  let ast: Program | null = null;

  try {
    ast = parse(source);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const loc = (err as any)?.loc ?? { line: 1, column: 0 };
    return {
      diagnostics: [
        {
          rule: 'parse-error',
          message,
          severity: 'error',
          loc: { start: loc, end: loc },
        },
      ],
      ast: null,
    };
  }

  const engine = new LintEngine();
  for (const rule of defaultRules) {
    engine.addRule(rule);
  }
  const diagnostics = engine.lint(ast);
  return { diagnostics, ast };
}
