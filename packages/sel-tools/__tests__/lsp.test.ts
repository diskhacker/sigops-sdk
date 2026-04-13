import { describe, it, expect } from 'vitest';
import { SELLanguageServer } from '../src/lsp/server.js';

describe('SELLanguageServer', () => {
  const server = new SELLanguageServer();

  describe('analyze', () => {
    it('returns diagnostics for valid source', () => {
      const result = server.analyze('monitor cpu {}');
      expect(result.ast).not.toBeNull();
      // Should get at least "no-empty-monitor" diagnostic
      expect(result.diagnostics.length).toBeGreaterThan(0);
    });

    it('returns parse error diagnostic for invalid source', () => {
      const result = server.analyze('foo bar { }');
      expect(result.ast).toBeNull();
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].rule).toBe('parse-error');
      expect(result.diagnostics[0].severity).toBe('error');
    });

    it('returns empty diagnostics for well-formed source', () => {
      const source = 'monitor cpu { threshold: 90 interval: "5m" action: alert("CPU high") }';
      const result = server.analyze(source);
      expect(result.ast).not.toBeNull();
      // May still have some info/warning diagnostics but no errors
      const errors = result.diagnostics.filter((d) => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('getCompletions', () => {
    it('suggests keywords at start of file', () => {
      const completions = server.getCompletions('', { line: 1, column: 0 });
      const labels = completions.map((c) => c.label);
      expect(labels).toContain('monitor');
      expect(labels).toContain('alert');
      expect(labels).toContain('action');
    });

    it('suggests monitor properties inside a monitor block', () => {
      const source = 'monitor cpu {\n  \n}';
      const completions = server.getCompletions(source, { line: 2, column: 2 });
      const labels = completions.map((c) => c.label);
      expect(labels).toContain('threshold');
      expect(labels).toContain('interval');
    });

    it('suggests alert properties inside an alert block', () => {
      const source = 'alert disk {\n  \n}';
      const completions = server.getCompletions(source, { line: 2, column: 2 });
      const labels = completions.map((c) => c.label);
      expect(labels).toContain('when');
      expect(labels).toContain('then');
      expect(labels).toContain('escalate_after');
    });

    it('suggests action properties inside an action block', () => {
      const source = 'action restart {\n  \n}';
      const completions = server.getCompletions(source, { line: 2, column: 2 });
      const labels = completions.map((c) => c.label);
      expect(labels).toContain('target');
      expect(labels).toContain('timeout');
      expect(labels).toContain('on_failure');
    });

    it('returns top-level keywords for invalid source', () => {
      const completions = server.getCompletions('foo bar {', { line: 1, column: 0 });
      const labels = completions.map((c) => c.label);
      expect(labels).toContain('monitor');
    });
  });

  describe('getHover', () => {
    it('returns documentation for monitor keyword', () => {
      const source = 'monitor cpu { threshold: 90 }';
      const hover = server.getHover(source, { line: 1, column: 2 });
      expect(hover).not.toBeNull();
      expect(hover!.content).toContain('monitor');
    });

    it('returns documentation for a known property', () => {
      const source = 'monitor cpu {\n  threshold: 90\n}';
      const hover = server.getHover(source, { line: 2, column: 3 });
      expect(hover).not.toBeNull();
      expect(hover!.content.toLowerCase()).toContain('threshold');
    });

    it('returns null for unknown tokens outside AST', () => {
      const source = 'monitor cpu { threshold: 90 }';
      // Position well beyond any token
      const hover = server.getHover(source, { line: 100, column: 0 });
      expect(hover).toBeNull();
    });

    it('returns info for block name', () => {
      const source = 'monitor cpu_usage { threshold: 90 }';
      // "cpu_usage" starts after "monitor "
      const hover = server.getHover(source, { line: 1, column: 9 });
      expect(hover).not.toBeNull();
      expect(hover!.content).toContain('cpu_usage');
    });

    it('handles invalid source gracefully', () => {
      const hover = server.getHover('foo bar {', { line: 1, column: 0 });
      expect(hover).toBeNull();
    });

    it('returns hover for boolean literal', () => {
      const source = 'monitor m { enabled: true }';
      // "true" is somewhere around column 21
      const hover = server.getHover(source, { line: 1, column: 21 });
      expect(hover).not.toBeNull();
      expect(hover!.content.toLowerCase()).toContain('boolean');
    });

    it('returns hover for string literal', () => {
      const source = 'monitor m { interval: "5m" }';
      const hover = server.getHover(source, { line: 1, column: 23 });
      expect(hover).not.toBeNull();
      expect(hover!.content).toContain('String');
    });

    it('returns hover for number literal', () => {
      const source = 'monitor m { threshold: 90 }';
      const hover = server.getHover(source, { line: 1, column: 23 });
      expect(hover).not.toBeNull();
      expect(hover!.content).toContain('90');
    });
  });
});
