export interface LanguageClientConfig {
  languageId: string;
  serverPath: string;
  documentSelector: DocumentSelector[];
  synchronize: SynchronizeConfig;
}

export interface DocumentSelector {
  scheme: string;
  language: string;
  pattern?: string;
}

export interface SynchronizeConfig {
  fileEvents: string[];
  configurationSection: string;
}

export interface LanguageClientOptions {
  serverPath?: string;
  languageId?: string;
}

/** Creates the language client configuration */
export function createLanguageClientConfig(options?: Partial<LanguageClientOptions>): LanguageClientConfig {
  const languageId = options?.languageId ?? 'sel';
  const serverPath = options?.serverPath ?? './server/sel-language-server';

  return {
    languageId,
    serverPath,
    documentSelector: [
      { scheme: 'file', language: languageId },
      { scheme: 'untitled', language: languageId },
    ],
    synchronize: {
      fileEvents: ['**/*.sel'],
      configurationSection: 'sigops-sel',
    },
  };
}

/** Diagnostic types for SEL */
export interface SELDiagnostic {
  range: Range;
  message: string;
  severity: DiagnosticSeverity;
  source: string;
  code?: string;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  character: number;
}

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export interface LintResult {
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  loc: { start: { line: number; column: number }; end: { line: number; column: number } };
}

/** Convert lint diagnostics to VS Code-compatible diagnostics */
export function convertDiagnostics(lintResults: LintResult[]): SELDiagnostic[] {
  return lintResults.map((result) => {
    let severity: DiagnosticSeverity;
    switch (result.severity) {
      case 'error':
        severity = DiagnosticSeverity.Error;
        break;
      case 'warning':
        severity = DiagnosticSeverity.Warning;
        break;
      case 'info':
        severity = DiagnosticSeverity.Information;
        break;
      default:
        severity = DiagnosticSeverity.Information;
    }

    return {
      range: {
        start: { line: result.loc.start.line, character: result.loc.start.column },
        end: { line: result.loc.end.line, character: result.loc.end.column },
      },
      message: result.message,
      severity,
      source: 'sel',
      code: result.rule,
    };
  });
}
