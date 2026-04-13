import type { Expression } from '../../parser/ast.js';
import type { LintRule, LintDiagnostic } from '../engine.js';

/** Info if an action is defined but never referenced in alert `then` properties. */
export const noUnusedAction: LintRule = {
  name: 'no-unused-action',
  description: 'Actions should be referenced by at least one alert',
  severity: 'info',
  check(program) {
    const diagnostics: LintDiagnostic[] = [];

    // Collect all action names
    const actionStmts = program.body.filter((s) => s.type === 'ActionStatement');
    if (actionStmts.length === 0) return diagnostics;

    // Collect all identifiers referenced in alert 'then' property values
    const referencedNames = new Set<string>();

    function collectRefs(expr: Expression): void {
      switch (expr.type) {
        case 'Identifier':
          referencedNames.add(expr.name);
          break;
        case 'CallExpression':
          collectRefs(expr.callee);
          for (const arg of expr.arguments) {
            if (arg.type === 'NamedArgument') {
              collectRefs(arg.value);
            } else {
              collectRefs(arg);
            }
          }
          break;
        case 'BinaryExpression':
          collectRefs(expr.left);
          collectRefs(expr.right);
          break;
        case 'MemberExpression':
          collectRefs(expr.object);
          break;
        default:
          break;
      }
    }

    // Also collect references from all alert properties (not just 'then')
    for (const stmt of program.body) {
      if (stmt.type === 'AlertStatement') {
        for (const prop of stmt.body) {
          if (prop.key.name === 'then') {
            collectRefs(prop.value);
          }
        }
      }
      // Also check action on_failure references
      if (stmt.type === 'MonitorStatement' || stmt.type === 'ActionStatement') {
        for (const prop of stmt.body) {
          if (prop.key.name === 'action' || prop.key.name === 'on_failure') {
            collectRefs(prop.value);
          }
        }
      }
    }

    for (const stmt of actionStmts) {
      const name = stmt.name.name;
      if (!referencedNames.has(name)) {
        diagnostics.push({
          rule: 'no-unused-action',
          message: `Action '${name}' is defined but never referenced`,
          severity: 'info',
          loc: stmt.loc,
        });
      }
    }

    return diagnostics;
  },
};
