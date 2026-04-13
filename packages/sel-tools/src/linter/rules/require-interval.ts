import type { LintRule } from '../engine.js';

/** Warning if a monitor block is missing an interval property. */
export const requireInterval: LintRule = {
  name: 'require-interval',
  description: 'Monitor blocks should have an interval property',
  severity: 'warning',
  check(program) {
    return program.body
      .filter(
        (s) =>
          s.type === 'MonitorStatement' &&
          !s.body.some((p) => p.key.name === 'interval'),
      )
      .map((s) => ({
        rule: 'require-interval',
        message: `Monitor '${s.name.name}' is missing an 'interval' property`,
        severity: 'warning' as const,
        loc: s.loc,
      }));
  },
};
