import {
  parse,
  LintEngine,
  defaultRules,
  format,
  type LintDiagnostic,
} from '@sigops/sel-tools';

/**
 * hello-sel — a minimal example that parses, lints, and formats a SEL
 * (SigOps Expression Language) program.
 */

/** A tiny, intentionally imperfect SEL program we can lint and format. */
export const SAMPLE_SEL = `monitor cpu_usage { threshold: 90 }
alert high_cpu { when: cpu_usage.breach }`;

export interface HelloSelResult {
  astType: string;
  statementCount: number;
  diagnostics: LintDiagnostic[];
  formatted: string;
}

/** Run the full pipeline: parse -> lint -> format. */
export function runHelloSel(source: string = SAMPLE_SEL): HelloSelResult {
  // 1. Parse into an AST
  const ast = parse(source);

  // 2. Lint using the shipped default rule set
  const engine = new LintEngine();
  for (const rule of defaultRules) {
    engine.addRule(rule);
  }
  const diagnostics = engine.lint(ast);

  // 3. Pretty-print the source with the formatter
  const formatted = format(source);

  return {
    astType: ast.type,
    statementCount: ast.body.length,
    diagnostics,
    formatted,
  };
}

export default runHelloSel;
