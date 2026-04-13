import type { LintRule } from '../engine.js';

/** Warning if an alert block is missing a 'then' property. */
export const requireAction: LintRule = {
  name: 'require-action',
  description: 'Alert blocks should have a then property',
  severity: 'warning',
  check(program) {
    return program.body
      .filter(
        (s) =>
          s.type === 'AlertStatement' &&
          !s.body.some((p) => p.key.name === 'then'),
      )
      .map((s) => ({
        rule: 'require-action',
        message: `Alert '${s.name.name}' is missing a 'then' property`,
        severity: 'warning' as const,
        loc: s.loc,
      }));
  },
};
