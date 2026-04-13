import type { LintRule } from '../engine.js';

/** Error if a monitor block has no properties. */
export const noEmptyMonitor: LintRule = {
  name: 'no-empty-monitor',
  description: 'Monitor blocks must contain at least one property',
  severity: 'error',
  check(program) {
    return program.body
      .filter((s) => s.type === 'MonitorStatement' && s.body.length === 0)
      .map((s) => ({
        rule: 'no-empty-monitor',
        message: `Monitor '${s.name.name}' has no properties`,
        severity: 'error' as const,
        loc: s.loc,
      }));
  },
};
