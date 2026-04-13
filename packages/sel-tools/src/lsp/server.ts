import type { Position, Program } from '../parser/ast.js';
import type { LintDiagnostic } from '../linter/engine.js';
import type { CompletionItem } from './completion.js';
import type { HoverInfo } from './hover.js';
import { getDiagnostics } from './diagnostics.js';
import { getCompletions } from './completion.js';
import { getHover } from './hover.js';

/**
 * A simple SEL language server.
 *
 * Does not implement the real LSP protocol transport — instead it exposes
 * methods that accept source code and a position and return structured results.
 */
export class SELLanguageServer {
  /**
   * Analyse source code: parse + lint.
   * Returns both the AST (if parse succeeds) and all diagnostics.
   */
  analyze(source: string): { diagnostics: LintDiagnostic[]; ast: Program | null } {
    return getDiagnostics(source);
  }

  /**
   * Get completion suggestions for a position in the source.
   */
  getCompletions(source: string, position: Position): CompletionItem[] {
    const { ast } = getDiagnostics(source);
    return getCompletions(ast, position, source);
  }

  /**
   * Get hover information for a position in the source.
   */
  getHover(source: string, position: Position): HoverInfo | null {
    const { ast } = getDiagnostics(source);
    return getHover(ast, position, source);
  }
}
