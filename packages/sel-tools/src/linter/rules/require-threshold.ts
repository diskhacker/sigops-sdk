import type { LintRule } from '../engine.js';

/** Warning if a monitor block is missing a threshold property. */
export const requireThreshold: LintRule = {
  name: 'require-threshold',
  description: 'Monitor blocks should have a threshold property',
  severity: 'warning',
  check(program) {
    return program.body
      .filter(
        (s) =>
          s.type === 'MonitorStatement' &&
          !s.body.some((p) => p.key.name === 'threshold'),
      )
      .map((s) => ({
        rule: 'require-threshold',
        message: `Monitor '${s.name.name}' is missing a 'threshold' property`,
        severity: 'warning' as const,
        loc: s.loc,
      }));
  },
};
