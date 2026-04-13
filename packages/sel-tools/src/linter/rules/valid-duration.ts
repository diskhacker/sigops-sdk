import type { Expression } from '../../parser/ast.js';
import type { LintRule, LintDiagnostic } from '../engine.js';

const DURATION_LIKE = /^\d/;
const VALID_DURATION = /^\d+[smhd]$/;

/** Warning if a string looks like a duration but has an invalid format. */
export const validDuration: LintRule = {
  name: 'valid-duration',
  description: 'Duration strings should match the pattern /^\\d+[smhd]$/',
  severity: 'warning',
  check(program) {
    const diagnostics: LintDiagnostic[] = [];

    function walkExpr(expr: Expression): void {
      if (expr.type === 'StringLiteral') {
        const val = expr.value;
        if (DURATION_LIKE.test(val) && !VALID_DURATION.test(val)) {
          diagnostics.push({
            rule: 'valid-duration',
            message: `Invalid duration format '${val}' — expected pattern like '5m', '30s', '1h', '2d'`,
            severity: 'warning',
            loc: expr.loc,
          });
        }
        return;
      }
      if (expr.type === 'CallExpression') {
        for (const arg of expr.arguments) {
          if (arg.type === 'NamedArgument') {
            walkExpr(arg.value);
          } else {
            walkExpr(arg);
          }
        }
        return;
      }
      if (expr.type === 'BinaryExpression') {
        walkExpr(expr.left);
        walkExpr(expr.right);
        return;
      }
      if (expr.type === 'MemberExpression') {
        walkExpr(expr.object);
        return;
      }
    }

    for (const stmt of program.body) {
      for (const prop of stmt.body) {
        walkExpr(prop.value);
      }
    }

    return diagnostics;
  },
};
