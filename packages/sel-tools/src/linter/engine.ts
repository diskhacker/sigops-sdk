import type { Program, Position } from '../parser/ast.js';
import { parse } from '../parser/parser.js';

/** A single lint diagnostic produced by a rule. */
export interface LintDiagnostic {
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  loc: { start: Position; end: Position };
}

/** A lint rule that checks a parsed program and returns diagnostics. */
export interface LintRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  check(program: Program): LintDiagnostic[];
}

/**
 * The lint engine: register rules, then lint source code or an AST.
 */
export class LintEngine {
  private rules: LintRule[] = [];

  /** Add a lint rule to the engine. */
  addRule(rule: LintRule): void {
    this.rules.push(rule);
  }

  /** Lint either source code (string) or a pre-parsed Program. */
  lint(input: string | Program): LintDiagnostic[] {
    let program: Program;
    if (typeof input === 'string') {
      program = parse(input);
    } else {
      program = input;
    }
    const diagnostics: LintDiagnostic[] = [];
    for (const rule of this.rules) {
      diagnostics.push(...rule.check(program));
    }
    return diagnostics;
  }
}
