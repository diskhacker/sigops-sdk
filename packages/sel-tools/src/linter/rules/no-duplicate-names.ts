import type { LintRule, LintDiagnostic } from '../engine.js';

/** Error if two top-level blocks share the same name. */
export const noDuplicateNames: LintRule = {
  name: 'no-duplicate-names',
  description: 'Top-level blocks must have unique names',
  severity: 'error',
  check(program) {
    const seen = new Map<string, { type: string; line: number }>();
    const diagnostics: LintDiagnostic[] = [];
    for (const stmt of program.body) {
      const name = stmt.name.name;
      const prev = seen.get(name);
      if (prev) {
        diagnostics.push({
          rule: 'no-duplicate-names',
          message: `Duplicate block name '${name}' (first defined at line ${prev.line})`,
          severity: 'error' as const,
          loc: stmt.loc,
        });
      } else {
        seen.set(name, { type: stmt.type, line: stmt.loc.start.line });
      }
    }
    return diagnostics;
  },
};
