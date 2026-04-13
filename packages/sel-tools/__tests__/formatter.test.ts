import { describe, it, expect } from 'vitest';
import { format } from '../src/formatter/index.js';

describe('Formatter', () => {
  it('formats a monitor block with default options', () => {
    const input = 'monitor   cpu_usage  {  threshold:90  interval:"5m"  }';
    const output = format(input);
    expect(output).toContain('monitor cpu_usage {');
    expect(output).toContain('  threshold: 90');
    expect(output).toContain('  interval: "5m"');
    expect(output).toContain('}');
  });

  it('formats with custom indent', () => {
    const input = 'monitor cpu { threshold: 90 }';
    const output = format(input, { indent: 4 });
    expect(output).toContain('    threshold: 90');
  });

  it('preserves line comments', () => {
    const input = '// CPU monitor\nmonitor cpu { threshold: 90 }';
    const output = format(input);
    expect(output).toContain('// CPU monitor');
  });

  it('preserves block comments', () => {
    const input = '/* block comment */\nmonitor cpu { threshold: 90 }';
    const output = format(input);
    expect(output).toContain('/* block comment */');
  });

  it('normalizes spacing around operators', () => {
    const input = 'alert a { when: disk.usage>80 }';
    const output = format(input);
    expect(output).toContain('disk.usage > 80');
  });

  it('handles empty input', () => {
    expect(format('')).toBe('');
    expect(format('   ')).toBe('');
  });

  it('formats multiple blocks with blank line separation', () => {
    const input = 'monitor cpu { threshold: 90 } alert disk { when: true }';
    const output = format(input);
    const lines = output.split('\n');
    // There should be a blank line between the two blocks
    const closingBraceIdx = lines.indexOf('}');
    expect(lines[closingBraceIdx + 1]).toBe('');
  });

  it('sorts properties when sortProperties is true', () => {
    const input = 'monitor m { threshold: 90 interval: "5m" action: alert("hi") }';
    const output = format(input, { sortProperties: true });
    const lines = output.split('\n');
    const propLines = lines.filter((l) => l.startsWith('  '));
    const keys = propLines.map((l) => l.trim().split(':')[0]);
    expect(keys).toEqual([...keys].sort());
  });

  it('roundtrip: format(format(x)) === format(x)', () => {
    const input = `
      monitor cpu_usage {
        threshold: 90
        interval: "5m"
        action: alert("CPU high", severity: "critical")
      }
    `;
    const first = format(input);
    const second = format(first);
    expect(second).toBe(first);
  });

  it('formats call expressions with named arguments', () => {
    const input = 'monitor m { action: alert("hi",severity:"critical") }';
    const output = format(input);
    expect(output).toContain('alert("hi", severity: "critical")');
  });
});
