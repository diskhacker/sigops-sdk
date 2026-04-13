import { describe, it, expect } from 'vitest';
import { Lexer, lex, TokenType, LexError } from '../src/parser/lexer.js';

describe('Lexer', () => {
  it('tokenizes identifiers', () => {
    const tokens = lex('foo bar_baz');
    expect(tokens[0].type).toBe(TokenType.Identifier);
    expect(tokens[0].value).toBe('foo');
    expect(tokens[1].type).toBe(TokenType.Identifier);
    expect(tokens[1].value).toBe('bar_baz');
  });

  it('tokenizes numbers (integer and decimal)', () => {
    const tokens = lex('42 3.14');
    expect(tokens[0].type).toBe(TokenType.Number);
    expect(tokens[0].value).toBe('42');
    expect(tokens[1].type).toBe(TokenType.Number);
    expect(tokens[1].value).toBe('3.14');
  });

  it('tokenizes strings', () => {
    const tokens = lex('"hello world"');
    expect(tokens[0].type).toBe(TokenType.String);
    expect(tokens[0].value).toBe('hello world');
  });

  it('tokenizes single-character operators and punctuation', () => {
    const tokens = lex('{ } ( ) : , . + - * /');
    const types = tokens.slice(0, -1).map((t) => t.type); // exclude EOF
    expect(types).toEqual([
      TokenType.LeftBrace,
      TokenType.RightBrace,
      TokenType.LeftParen,
      TokenType.RightParen,
      TokenType.Colon,
      TokenType.Comma,
      TokenType.Dot,
      TokenType.Plus,
      TokenType.Minus,
      TokenType.Star,
      TokenType.Slash,
    ]);
  });

  it('tokenizes multi-character operators', () => {
    const tokens = lex('>= <= == !=');
    expect(tokens[0].type).toBe(TokenType.GreaterEqual);
    expect(tokens[1].type).toBe(TokenType.LessEqual);
    expect(tokens[2].type).toBe(TokenType.EqualEqual);
    expect(tokens[3].type).toBe(TokenType.BangEqual);
  });

  it('tokenizes single > and <', () => {
    const tokens = lex('> <');
    expect(tokens[0].type).toBe(TokenType.Greater);
    expect(tokens[1].type).toBe(TokenType.Less);
  });

  it('recognizes keywords as Identifier tokens', () => {
    const tokens = lex('monitor alert action when then else true false null');
    for (const t of tokens.slice(0, -1)) {
      expect(t.type).toBe(TokenType.Identifier);
    }
    expect(tokens[0].value).toBe('monitor');
    expect(tokens[6].value).toBe('true');
    expect(tokens[8].value).toBe('null');
  });

  it('handles line comments', () => {
    const tokens = lex('// this is a comment\nfoo', { includeComments: true });
    expect(tokens[0].type).toBe(TokenType.LineComment);
    expect(tokens[0].value).toBe(' this is a comment');
    expect(tokens[1].type).toBe(TokenType.Identifier);
    expect(tokens[1].value).toBe('foo');
  });

  it('strips comments by default', () => {
    const tokens = lex('// comment\nfoo');
    expect(tokens[0].type).toBe(TokenType.Identifier);
    expect(tokens[0].value).toBe('foo');
  });

  it('handles block comments', () => {
    const tokens = lex('/* block */foo', { includeComments: true });
    expect(tokens[0].type).toBe(TokenType.BlockComment);
    expect(tokens[0].value).toBe(' block ');
    expect(tokens[1].type).toBe(TokenType.Identifier);
  });

  it('handles string escape sequences', () => {
    const tokens = lex('"hello\\nworld\\t\\\\end\\"quote"');
    expect(tokens[0].value).toBe('hello\nworld\t\\end"quote');
  });

  it('reports positions correctly', () => {
    const tokens = lex('foo\nbar');
    expect(tokens[0].loc.start).toEqual({ line: 1, column: 0 });
    expect(tokens[0].loc.end).toEqual({ line: 1, column: 3 });
    expect(tokens[1].loc.start).toEqual({ line: 2, column: 0 });
    expect(tokens[1].loc.end).toEqual({ line: 2, column: 3 });
  });

  it('handles empty input', () => {
    const tokens = lex('');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TokenType.EOF);
  });

  it('throws on unterminated strings', () => {
    expect(() => lex('"unterminated')).toThrow(LexError);
    expect(() => lex('"unterminated')).toThrow(/Unterminated string/);
  });

  it('throws on unterminated block comments', () => {
    expect(() => lex('/* unterminated')).toThrow(LexError);
  });
});
