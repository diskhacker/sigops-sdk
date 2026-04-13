/** Available SEL actions */
export type SelAction = 'lint' | 'fmt' | 'parse' | 'playground';

/** Options for the SEL command */
export interface SelOptions {
  action: SelAction;
  input: string;
  fix?: boolean;
}

/** Result of a SEL command operation */
export interface SelResult {
  success: boolean;
  output?: string;
  diagnostics?: SelDiagnostic[];
  ast?: any;
}

/** A diagnostic message from SEL analysis */
export interface SelDiagnostic {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * SelCommand provides SEL language utilities.
 * All methods are pure functions with no external dependencies.
 */
export class SelCommand {
  /** Validate that a string is a valid SEL action */
  static validateAction(action: string): action is SelAction {
    return ['lint', 'fmt', 'parse', 'playground'].includes(action);
  }

  /** Get available SEL actions */
  static getActions(): SelAction[] {
    return ['lint', 'fmt', 'parse', 'playground'];
  }

  /**
   * Basic SEL validation without a full parser.
   * Checks for balanced braces, empty input, and basic keyword presence.
   */
  static basicValidate(input: string): SelResult {
    const diagnostics: SelDiagnostic[] = [];

    // Check empty input
    if (!input || input.trim().length === 0) {
      diagnostics.push({
        line: 1,
        column: 1,
        message: 'Input is empty',
        severity: 'error',
      });
      return { success: false, diagnostics };
    }

    // Check balanced braces
    let braceCount = 0;
    const lines = input.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (let j = 0; j < lines[i].length; j++) {
        if (lines[i][j] === '{') braceCount++;
        if (lines[i][j] === '}') braceCount--;
        if (braceCount < 0) {
          diagnostics.push({
            line: i + 1,
            column: j + 1,
            message: 'Unexpected closing brace',
            severity: 'error',
          });
        }
      }
    }
    if (braceCount > 0) {
      diagnostics.push({
        line: lines.length,
        column: 1,
        message: `Unclosed brace: ${braceCount} opening brace(s) without matching close`,
        severity: 'error',
      });
    }

    // Check for basic keyword presence (informational)
    const keywords = ['monitor', 'alert', 'action'];
    const hasKeyword = keywords.some((kw) => input.includes(kw));
    if (!hasKeyword) {
      diagnostics.push({
        line: 1,
        column: 1,
        message: 'No SEL keywords found (monitor, alert, action)',
        severity: 'warning',
      });
    }

    const hasErrors = diagnostics.some((d) => d.severity === 'error');
    return {
      success: !hasErrors,
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  }

  /**
   * Basic SEL formatter.
   * Trims lines, normalizes indentation, removes trailing whitespace.
   */
  static basicFormat(input: string): string {
    const lines = input.split('\n');
    let indentLevel = 0;
    const formatted: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.length === 0) {
        formatted.push('');
        continue;
      }

      // Decrease indent for closing braces
      if (trimmed.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      formatted.push('  '.repeat(indentLevel) + trimmed);

      // Increase indent after opening braces
      if (trimmed.endsWith('{')) {
        indentLevel++;
      }
    }

    return formatted.join('\n');
  }
}
