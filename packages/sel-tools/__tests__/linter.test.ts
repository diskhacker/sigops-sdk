import { describe, it, expect } from 'vitest';
import { LintEngine, type LintRule, type LintDiagnostic } from '../src/linter/engine.js';
import { defaultRules } from '../src/linter/rules/index.js';
import { noEmptyMonitor } from '../src/linter/rules/no-empty-monitor.js';
import { noEmptyAlert } from '../src/linter/rules/no-empty-alert.js';
import { noEmptyAction } from '../src/linter/rules/no-empty-action.js';
import { requireThreshold } from '../src/linter/rules/require-threshold.js';
import { requireInterval } from '../src/linter/rules/require-interval.js';
import { requireAction } from '../src/linter/rules/require-action.js';
import { noDuplicateNames } from '../src/linter/rules/no-duplicate-names.js';
import { maxBlockDepth } from '../src/linter/rules/max-block-depth.js';
import { validDuration } from '../src/linter/rules/valid-duration.js';
import { noUnusedAction } from '../src/linter/rules/no-unused-action.js';
import { parse } from '../src/parser/parser.js';

// Helper: lint source with a single rule
function lintWith(rule: LintRule, source: string): LintDiagnostic[] {
  const engine = new LintEngine();
  engine.addRule(rule);
  return engine.lint(source);
}

describe('Linter — no-empty-monitor', () => {
  it('reports error for empty monitor', () => {
    const d = lintWith(noEmptyMonitor, 'monitor cpu {}');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('error');
    expect(d[0].rule).toBe('no-empty-monitor');
  });

  it('does not report for non-empty monitor', () => {
    const d = lintWith(noEmptyMonitor, 'monitor cpu { threshold: 90 }');
    expect(d).toHaveLength(0);
  });
});

describe('Linter — no-empty-alert', () => {
  it('reports error for empty alert', () => {
    const d = lintWith(noEmptyAlert, 'alert a {}');
    expect(d).toHaveLength(1);
    expect(d[0].rule).toBe('no-empty-alert');
  });

  it('does not report for non-empty alert', () => {
    const d = lintWith(noEmptyAlert, 'alert a { when: true }');
    expect(d).toHaveLength(0);
  });
});

describe('Linter — no-empty-action', () => {
  it('reports error for empty action', () => {
    const d = lintWith(noEmptyAction, 'action a {}');
    expect(d).toHaveLength(1);
    expect(d[0].rule).toBe('no-empty-action');
  });

  it('does not report for non-empty action', () => {
    const d = lintWith(noEmptyAction, 'action a { target: "nginx" }');
    expect(d).toHaveLength(0);
  });
});

describe('Linter — require-threshold', () => {
  it('warns when monitor missing threshold', () => {
    const d = lintWith(requireThreshold, 'monitor cpu { interval: "5m" }');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('warning');
    expect(d[0].rule).toBe('require-threshold');
  });

  it('does not warn when threshold present', () => {
    const d = lintWith(requireThreshold, 'monitor cpu { threshold: 90 }');
    expect(d).toHaveLength(0);
  });
});

describe('Linter — require-interval', () => {
  it('warns when monitor missing interval', () => {
    const d = lintWith(requireInterval, 'monitor cpu { threshold: 90 }');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('warning');
    expect(d[0].rule).toBe('require-interval');
  });

  it('does not warn when interval present', () => {
    const d = lintWith(requireInterval, 'monitor cpu { interval: "5m" }');
    expect(d).toHaveLength(0);
  });
});

describe('Linter — require-action', () => {
  it('warns when alert missing then property', () => {
    const d = lintWith(requireAction, 'alert disk { when: true }');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('warning');
    expect(d[0].rule).toBe('require-action');
  });

  it('does not warn when then property present', () => {
    const d = lintWith(requireAction, 'alert disk { when: true then: notify("ops") }');
    expect(d).toHaveLength(0);
  });

  it('does not apply to non-alert blocks', () => {
    const d = lintWith(requireAction, 'monitor cpu { threshold: 90 }');
    expect(d).toHaveLength(0);
  });
});

describe('Linter — no-duplicate-names', () => {
  it('reports error for duplicate names', () => {
    const d = lintWith(noDuplicateNames, 'monitor cpu { threshold: 90 } monitor cpu { threshold: 80 }');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('error');
    expect(d[0].rule).toBe('no-duplicate-names');
  });

  it('does not report for unique names', () => {
    const d = lintWith(noDuplicateNames, 'monitor cpu { threshold: 90 } monitor mem { threshold: 80 }');
    expect(d).toHaveLength(0);
  });
});

describe('Linter — max-block-depth', () => {
  it('warns when nesting exceeds 3 levels', () => {
    // Construct deeply nested call: a(b(c(d(e))))
    const source = 'monitor m { action: a(b(c(d(e)))) }';
    const d = lintWith(maxBlockDepth, source);
    expect(d.length).toBeGreaterThan(0);
    expect(d[0].severity).toBe('warning');
    expect(d[0].rule).toBe('max-block-depth');
  });

  it('does not warn for shallow nesting', () => {
    const source = 'monitor m { action: alert("msg") }';
    const d = lintWith(maxBlockDepth, source);
    expect(d).toHaveLength(0);
  });
});

describe('Linter — valid-duration', () => {
  it('warns for invalid duration string', () => {
    const d = lintWith(validDuration, 'monitor m { interval: "5min" }');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('warning');
    expect(d[0].rule).toBe('valid-duration');
  });

  it('does not warn for valid duration strings', () => {
    const d = lintWith(validDuration, 'monitor m { interval: "5m" }');
    expect(d).toHaveLength(0);
  });

  it('does not warn for non-duration strings', () => {
    const d = lintWith(validDuration, 'monitor m { name: "cpu-monitor" }');
    expect(d).toHaveLength(0);
  });
});

describe('Linter — no-unused-action', () => {
  it('reports info for unused action', () => {
    const source = `
      action restart { target: "nginx" }
      alert disk { when: true then: notify("ops") }
    `;
    const d = lintWith(noUnusedAction, source);
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('info');
    expect(d[0].rule).toBe('no-unused-action');
  });

  it('does not report for referenced action', () => {
    const source = `
      action restart { target: "nginx" }
      alert disk { when: true then: restart }
    `;
    const d = lintWith(noUnusedAction, source);
    expect(d).toHaveLength(0);
  });
});

describe('LintEngine', () => {
  it('runs multiple rules', () => {
    const engine = new LintEngine();
    engine.addRule(noEmptyMonitor);
    engine.addRule(requireThreshold);
    const diagnostics = engine.lint('monitor cpu {}');
    expect(diagnostics.length).toBeGreaterThanOrEqual(2);
  });

  it('accepts a pre-parsed Program', () => {
    const engine = new LintEngine();
    engine.addRule(noEmptyMonitor);
    const program = parse('monitor cpu {}');
    const diagnostics = engine.lint(program);
    expect(diagnostics).toHaveLength(1);
  });

  it('supports custom rules', () => {
    const customRule: LintRule = {
      name: 'custom-rule',
      description: 'Always warns',
      severity: 'warning',
      check(program) {
        return program.body.map((s) => ({
          rule: 'custom-rule',
          message: 'Custom warning',
          severity: 'warning' as const,
          loc: s.loc,
        }));
      },
    };
    const engine = new LintEngine();
    engine.addRule(customRule);
    const d = engine.lint('monitor m { threshold: 90 }');
    expect(d).toHaveLength(1);
    expect(d[0].rule).toBe('custom-rule');
  });

  it('defaultRules array contains 10 rules', () => {
    expect(defaultRules).toHaveLength(10);
  });
});
