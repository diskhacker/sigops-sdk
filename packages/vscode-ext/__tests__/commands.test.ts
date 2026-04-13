import { describe, it, expect } from 'vitest';
import {
  SELCommand,
  getCommandDefinitions,
  lintFileContent,
  formatFileContent,
  parseFileContent,
  validateWorkspaceFiles,
} from '../src/commands.js';

describe('commands', () => {
  it('getCommandDefinitions returns all 7 commands', () => {
    const defs = getCommandDefinitions();
    expect(defs).toHaveLength(7);
    const ids = defs.map((d) => d.id);
    expect(ids).toContain(SELCommand.LintFile);
    expect(ids).toContain(SELCommand.FormatFile);
    expect(ids).toContain(SELCommand.ParseFile);
    expect(ids).toContain(SELCommand.ShowAST);
    expect(ids).toContain(SELCommand.ValidateWorkspace);
    expect(ids).toContain(SELCommand.OpenPlayground);
    expect(ids).toContain(SELCommand.RestartServer);
  });

  it('lintFileContent returns diagnostics for issues', () => {
    const source = 'some random text without keywords';
    const result = lintFileContent(source);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.infoCount).toBeGreaterThan(0);
  });

  it('lintFileContent returns clean for valid SEL', () => {
    const source = `monitor cpu_check {
  when cpu_usage > 90 {
    alert high_cpu {
      severity: "critical"
    }
  }
}`;
    const result = lintFileContent(source);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it('lintFileContent detects unbalanced braces', () => {
    const source = `monitor test {
  when cpu_usage > 90 {
    alert high_cpu {
  }
`;
    const result = lintFileContent(source);
    expect(result.errorCount).toBeGreaterThan(0);
    const braceError = result.diagnostics.find((d) =>
      d.message.toLowerCase().includes('brace')
    );
    expect(braceError).toBeDefined();
  });

  it('formatFileContent normalizes indentation', () => {
    const source = `monitor test {
        when cpu > 90 {
            alert high {
            }
        }
}`;
    const result = formatFileContent(source, { indent: 2 });
    const lines = result.formatted.split('\n');
    expect(lines[0]).toBe('monitor test {');
    expect(lines[1]).toBe('  when cpu > 90 {');
    expect(lines[2]).toBe('    alert high {');
    expect(lines[3]).toBe('    }');
    expect(lines[4]).toBe('  }');
    expect(lines[5]).toBe('}');
  });

  it('formatFileContent detects when content changed', () => {
    const source = `monitor test {
      alert high {
      }
}`;
    const result = formatFileContent(source, { indent: 2 });
    expect(result.changed).toBe(true);

    // Re-formatting the already-formatted output should not change it
    const result2 = formatFileContent(result.formatted, { indent: 2 });
    expect(result2.changed).toBe(false);
  });

  it('formatFileContent adds final newline', () => {
    const source = 'monitor test { }';
    const result = formatFileContent(source, { insertFinalNewline: true });
    expect(result.formatted.endsWith('\n')).toBe(true);
  });

  it('parseFileContent succeeds on valid SEL', () => {
    const source = `monitor cpu_check {
  when cpu > 90 {
    alert high_cpu {
      severity: "critical"
    }
  }
}`;
    const result = parseFileContent(source);
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe('Program');
    expect(result.ast.body.length).toBeGreaterThan(0);
  });

  it('parseFileContent fails on invalid input', () => {
    const source = '';
    const result = parseFileContent(source);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('validateWorkspaceFiles finds .sel files', () => {
    const files = [
      'src/main.ts',
      'monitors/cpu.sel',
      'monitors/disk.sel',
      'README.md',
      'alerts/memory.sel',
    ];
    const result = validateWorkspaceFiles(files);
    expect(result.selFiles).toHaveLength(3);
    expect(result.selFiles).toContain('monitors/cpu.sel');
    expect(result.selFiles).toContain('monitors/disk.sel');
    expect(result.selFiles).toContain('alerts/memory.sel');
    expect(result.valid).toBe(true);
  });
});
