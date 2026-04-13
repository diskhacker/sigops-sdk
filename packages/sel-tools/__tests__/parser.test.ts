import { describe, it, expect } from 'vitest';
import { parse, ParseError } from '../src/parser/parser.js';

describe('Parser', () => {
  it('parses a monitor block', () => {
    const ast = parse('monitor cpu_usage { threshold: 90 }');
    expect(ast.type).toBe('Program');
    expect(ast.body).toHaveLength(1);
    const m = ast.body[0];
    expect(m.type).toBe('MonitorStatement');
    expect(m.name.name).toBe('cpu_usage');
    expect(m.body).toHaveLength(1);
    expect(m.body[0].key.name).toBe('threshold');
    expect(m.body[0].value.type).toBe('NumberLiteral');
  });

  it('parses an alert block', () => {
    const ast = parse('alert disk_space { when: true }');
    expect(ast.body).toHaveLength(1);
    expect(ast.body[0].type).toBe('AlertStatement');
    expect(ast.body[0].name.name).toBe('disk_space');
  });

  it('parses an action block', () => {
    const ast = parse('action restart_service { target: "nginx" }');
    expect(ast.body).toHaveLength(1);
    expect(ast.body[0].type).toBe('ActionStatement');
    expect(ast.body[0].name.name).toBe('restart_service');
    const val = ast.body[0].body[0].value;
    expect(val.type).toBe('StringLiteral');
    if (val.type === 'StringLiteral') {
      expect(val.value).toBe('nginx');
    }
  });

  it('parses binary expressions', () => {
    const ast = parse('monitor m { when: x > 5 }');
    const prop = ast.body[0].body[0];
    expect(prop.value.type).toBe('BinaryExpression');
    if (prop.value.type === 'BinaryExpression') {
      expect(prop.value.operator).toBe('>');
      expect(prop.value.left.type).toBe('Identifier');
      expect(prop.value.right.type).toBe('NumberLiteral');
    }
  });

  it('parses member expressions', () => {
    const ast = parse('alert a { when: disk.usage }');
    const prop = ast.body[0].body[0];
    expect(prop.value.type).toBe('MemberExpression');
    if (prop.value.type === 'MemberExpression') {
      expect(prop.value.object.type).toBe('Identifier');
      expect(prop.value.property.name).toBe('usage');
    }
  });

  it('parses call expressions', () => {
    const ast = parse('monitor m { action: alert("CPU high") }');
    const prop = ast.body[0].body[0];
    expect(prop.value.type).toBe('CallExpression');
    if (prop.value.type === 'CallExpression') {
      expect(prop.value.callee.type).toBe('Identifier');
      expect(prop.value.arguments).toHaveLength(1);
      expect(prop.value.arguments[0].type).toBe('StringLiteral');
    }
  });

  it('parses named arguments in calls', () => {
    const ast = parse('monitor m { action: alert("CPU high", severity: "critical") }');
    const prop = ast.body[0].body[0];
    expect(prop.value.type).toBe('CallExpression');
    if (prop.value.type === 'CallExpression') {
      expect(prop.value.arguments).toHaveLength(2);
      expect(prop.value.arguments[1].type).toBe('NamedArgument');
      if (prop.value.arguments[1].type === 'NamedArgument') {
        expect(prop.value.arguments[1].name.name).toBe('severity');
      }
    }
  });

  it('parses complex expressions: disk.usage > 80', () => {
    const ast = parse('alert a { when: disk.usage > 80 }');
    const prop = ast.body[0].body[0];
    expect(prop.value.type).toBe('BinaryExpression');
    if (prop.value.type === 'BinaryExpression') {
      expect(prop.value.left.type).toBe('MemberExpression');
      expect(prop.value.operator).toBe('>');
      expect(prop.value.right.type).toBe('NumberLiteral');
    }
  });

  it('parses boolean literal true', () => {
    const ast = parse('monitor m { enabled: true }');
    const prop = ast.body[0].body[0];
    expect(prop.value.type).toBe('BooleanLiteral');
    if (prop.value.type === 'BooleanLiteral') {
      expect(prop.value.value).toBe(true);
    }
  });

  it('parses boolean literal false', () => {
    const ast = parse('monitor m { enabled: false }');
    const prop = ast.body[0].body[0];
    expect(prop.value.type).toBe('BooleanLiteral');
    if (prop.value.type === 'BooleanLiteral') {
      expect(prop.value.value).toBe(false);
    }
  });

  it('parses null literal', () => {
    const ast = parse('monitor m { fallback: null }');
    const prop = ast.body[0].body[0];
    expect(prop.value.type).toBe('NullLiteral');
  });

  it('parses multiple top-level statements', () => {
    const source = `
      monitor cpu { threshold: 90 }
      alert disk { when: true }
      action restart { target: "nginx" }
    `;
    const ast = parse(source);
    expect(ast.body).toHaveLength(3);
    expect(ast.body[0].type).toBe('MonitorStatement');
    expect(ast.body[1].type).toBe('AlertStatement');
    expect(ast.body[2].type).toBe('ActionStatement');
  });

  it('parses multiple properties in a block', () => {
    const ast = parse('monitor cpu { threshold: 90 interval: "5m" }');
    expect(ast.body[0].body).toHaveLength(2);
    expect(ast.body[0].body[0].key.name).toBe('threshold');
    expect(ast.body[0].body[1].key.name).toBe('interval');
  });

  it('handles arithmetic operators', () => {
    const ast = parse('monitor m { value: a + b * c }');
    const prop = ast.body[0].body[0];
    // Due to precedence: a + (b * c)
    expect(prop.value.type).toBe('BinaryExpression');
    if (prop.value.type === 'BinaryExpression') {
      expect(prop.value.operator).toBe('+');
      expect(prop.value.right.type).toBe('BinaryExpression');
      if (prop.value.right.type === 'BinaryExpression') {
        expect(prop.value.right.operator).toBe('*');
      }
    }
  });

  it('throws ParseError on missing brace', () => {
    expect(() => parse('monitor cpu {')).toThrow(ParseError);
  });

  it('throws ParseError with location info', () => {
    try {
      parse('monitor cpu { : }');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).loc).toBeDefined();
      expect((err as ParseError).loc.line).toBeGreaterThan(0);
    }
  });

  it('throws ParseError on invalid top-level keyword', () => {
    expect(() => parse('foo bar { }')).toThrow(ParseError);
    expect(() => parse('foo bar { }')).toThrow(/Expected 'monitor', 'alert', or 'action'/);
  });

  it('parses an empty program', () => {
    const ast = parse('');
    expect(ast.type).toBe('Program');
    expect(ast.body).toHaveLength(0);
  });
});
