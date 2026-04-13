import type { LintRule } from '../engine.js';

/** Error if an action block has no properties. */
export const noEmptyAction: LintRule = {
  name: 'no-empty-action',
  description: 'Action blocks must contain at least one property',
  severity: 'error',
  check(program) {
    return program.body
      .filter((s) => s.type === 'ActionStatement' && s.body.length === 0)
      .map((s) => ({
        rule: 'no-empty-action',
        message: `Action '${s.name.name}' has no properties`,
        severity: 'error' as const,
        loc: s.loc,
      }));
  },
};
