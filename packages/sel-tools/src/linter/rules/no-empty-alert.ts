import type { LintRule } from '../engine.js';

/** Error if an alert block has no properties. */
export const noEmptyAlert: LintRule = {
  name: 'no-empty-alert',
  description: 'Alert blocks must contain at least one property',
  severity: 'error',
  check(program) {
    return program.body
      .filter((s) => s.type === 'AlertStatement' && s.body.length === 0)
      .map((s) => ({
        rule: 'no-empty-alert',
        message: `Alert '${s.name.name}' has no properties`,
        severity: 'error' as const,
        loc: s.loc,
      }));
  },
};
