import { describe, it, expect } from 'vitest';
import {
  createLanguageClientConfig,
  convertDiagnostics,
  DiagnosticSeverity,
} from '../src/language-client.js';
import type { LintResult } from '../src/language-client.js';

describe('language-client', () => {
  it('createLanguageClientConfig returns valid config', () => {
    const config = createLanguageClientConfig();
    expect(config).toHaveProperty('languageId');
    expect(config).toHaveProperty('serverPath');
    expect(config).toHaveProperty('documentSelector');
    expect(config).toHaveProperty('synchronize');
  });

  it('config has correct languageId', () => {
    const config = createLanguageClientConfig();
    expect(config.languageId).toBe('sel');
  });

  it('config has document selector for .sel', () => {
    const config = createLanguageClientConfig();
    expect(config.documentSelector).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scheme: 'file', language: 'sel' }),
      ])
    );
  });

  it('convertDiagnostics converts error severity', () => {
    const lintResults: LintResult[] = [
      {
        rule: 'no-empty',
        message: 'Empty block',
        severity: 'error',
        loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
      },
    ];
    const diagnostics = convertDiagnostics(lintResults);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
    expect(diagnostics[0].source).toBe('sel');
    expect(diagnostics[0].code).toBe('no-empty');
  });

  it('convertDiagnostics converts warning severity', () => {
    const lintResults: LintResult[] = [
      {
        rule: 'prefer-const',
        message: 'Use const',
        severity: 'warning',
        loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
      },
    ];
    const diagnostics = convertDiagnostics(lintResults);
    expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
  });

  it('convertDiagnostics converts info severity', () => {
    const lintResults: LintResult[] = [
      {
        rule: 'info-rule',
        message: 'Info message',
        severity: 'info',
        loc: { start: { line: 3, column: 0 }, end: { line: 3, column: 5 } },
      },
    ];
    const diagnostics = convertDiagnostics(lintResults);
    expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Information);
  });

  it('convertDiagnostics handles empty input', () => {
    const diagnostics = convertDiagnostics([]);
    expect(diagnostics).toEqual([]);
  });
});
