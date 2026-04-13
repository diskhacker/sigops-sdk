import type { Expression } from '../../parser/ast.js';
import type { LintRule, LintDiagnostic } from '../engine.js';

/** Warning if nesting exceeds 3 levels (calls within calls, etc.). */
export const maxBlockDepth: LintRule = {
  name: 'max-block-depth',
  description: 'Nesting should not exceed 3 levels',
  severity: 'warning',
  check(program) {
    const diagnostics: LintDiagnostic[] = [];
    const MAX_DEPTH = 3;

    function walkExpr(expr: Expression, depth: number): void {
      if (depth > MAX_DEPTH) {
        diagnostics.push({
          rule: 'max-block-depth',
          message: `Nesting depth ${depth} exceeds maximum of ${MAX_DEPTH}`,
          severity: 'warning',
          loc: expr.loc,
        });
        return;
      }
      switch (expr.type) {
        case 'CallExpression':
          for (const arg of expr.arguments) {
            if (arg.type === 'NamedArgument') {
              walkExpr(arg.value, depth + 1);
            } else {
              walkExpr(arg, depth + 1);
            }
          }
          break;
        case 'BinaryExpression':
          walkExpr(expr.left, depth + 1);
          walkExpr(expr.right, depth + 1);
          break;
        case 'MemberExpression':
          walkExpr(expr.object, depth + 1);
          break;
        default:
          break;
      }
    }

    for (const stmt of program.body) {
      for (const prop of stmt.body) {
        walkExpr(prop.value, 1);
      }
    }

    return diagnostics;
  },
};
