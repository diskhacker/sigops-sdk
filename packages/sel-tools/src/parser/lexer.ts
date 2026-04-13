import type { Position, SourceLocation } from './ast.js';

/** Token types produced by the lexer */
export enum TokenType {
  Identifier = 'Identifier',
  Number = 'Number',
  String = 'String',
  LeftBrace = 'LeftBrace',
  RightBrace = 'RightBrace',
  LeftParen = 'LeftParen',
  RightParen = 'RightParen',
  Colon = 'Colon',
  Comma = 'Comma',
  Dot = 'Dot',
  Plus = 'Plus',
  Minus = 'Minus',
  Star = 'Star',
  Slash = 'Slash',
  Greater = 'Greater',
  Less = 'Less',
  GreaterEqual = 'GreaterEqual',
  LessEqual = 'LessEqual',
  EqualEqual = 'EqualEqual',
  BangEqual = 'BangEqual',
  LineComment = 'LineComment',
  BlockComment = 'BlockComment',
  EOF = 'EOF',
}

/** A single token from the source */
export interface Token {
  type: TokenType;
  value: string;
  loc: SourceLocation;
}

/** Set of SEL keyword strings */
const KEYWORDS = new Set([
  'monitor',
  'alert',
  'action',
  'when',
  'then',
  'else',
  'true',
  'false',
  'null',
  'escalate_after',
  'pre_check',
  'on_failure',
  'threshold',
  'interval',
  'target',
  'timeout',
  'notify',
]);

/** Check whether a string is a SEL keyword */
export function isKeyword(value: string): boolean {
  return KEYWORDS.has(value);
}

/**
 * Lexer for the SEL language.
 * Converts source text into a stream of tokens.
 */
export class Lexer {
  private source: string;
  private pos = 0;
  private line = 1;
  private column = 0;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  /** Tokenize the full source and return all tokens (including EOF). */
  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.skipWhitespace();
      if (this.isAtEnd()) break;
      this.scanToken();
    }
    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      loc: { start: this.position(), end: this.position() },
    });
    return this.tokens;
  }

  // ---- helpers ----

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private peek(): string {
    return this.source[this.pos];
  }

  private peekNext(): string | undefined {
    return this.source[this.pos + 1];
  }

  private advance(): string {
    const ch = this.source[this.pos];
    this.pos++;
    this.column++;
    return ch;
  }

  private position(): Position {
    return { line: this.line, column: this.column };
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === '\n') {
        this.pos++;
        this.line++;
        this.column = 0;
      } else if (ch === '\r') {
        this.pos++;
        if (!this.isAtEnd() && this.peek() === '\n') {
          this.pos++;
        }
        this.line++;
        this.column = 0;
      } else if (ch === ' ' || ch === '\t') {
        this.pos++;
        this.column++;
      } else {
        break;
      }
    }
  }

  private addToken(type: TokenType, value: string, start: Position, end: Position): void {
    this.tokens.push({ type, value, loc: { start, end } });
  }

  private scanToken(): void {
    const start = this.position();
    const ch = this.peek();

    // Line comment
    if (ch === '/' && this.peekNext() === '/') {
      this.scanLineComment(start);
      return;
    }

    // Block comment
    if (ch === '/' && this.peekNext() === '*') {
      this.scanBlockComment(start);
      return;
    }

    // Single character tokens
    switch (ch) {
      case '{': this.advance(); this.addToken(TokenType.LeftBrace, '{', start, this.position()); return;
      case '}': this.advance(); this.addToken(TokenType.RightBrace, '}', start, this.position()); return;
      case '(': this.advance(); this.addToken(TokenType.LeftParen, '(', start, this.position()); return;
      case ')': this.advance(); this.addToken(TokenType.RightParen, ')', start, this.position()); return;
      case ':': this.advance(); this.addToken(TokenType.Colon, ':', start, this.position()); return;
      case ',': this.advance(); this.addToken(TokenType.Comma, ',', start, this.position()); return;
      case '.': this.advance(); this.addToken(TokenType.Dot, '.', start, this.position()); return;
      case '+': this.advance(); this.addToken(TokenType.Plus, '+', start, this.position()); return;
      case '-': this.advance(); this.addToken(TokenType.Minus, '-', start, this.position()); return;
      case '*': this.advance(); this.addToken(TokenType.Star, '*', start, this.position()); return;
      case '/': this.advance(); this.addToken(TokenType.Slash, '/', start, this.position()); return;
    }

    // Multi-char operators
    if (ch === '>' && this.peekNext() === '=') {
      this.advance(); this.advance();
      this.addToken(TokenType.GreaterEqual, '>=', start, this.position());
      return;
    }
    if (ch === '>') {
      this.advance();
      this.addToken(TokenType.Greater, '>', start, this.position());
      return;
    }
    if (ch === '<' && this.peekNext() === '=') {
      this.advance(); this.advance();
      this.addToken(TokenType.LessEqual, '<=', start, this.position());
      return;
    }
    if (ch === '<') {
      this.advance();
      this.addToken(TokenType.Less, '<', start, this.position());
      return;
    }
    if (ch === '=' && this.peekNext() === '=') {
      this.advance(); this.advance();
      this.addToken(TokenType.EqualEqual, '==', start, this.position());
      return;
    }
    if (ch === '!' && this.peekNext() === '=') {
      this.advance(); this.advance();
      this.addToken(TokenType.BangEqual, '!=', start, this.position());
      return;
    }

    // String
    if (ch === '"') {
      this.scanString(start);
      return;
    }

    // Number
    if (isDigit(ch)) {
      this.scanNumber(start);
      return;
    }

    // Identifier / keyword
    if (isIdentStart(ch)) {
      this.scanIdentifier(start);
      return;
    }

    // Unknown character – skip it to avoid infinite loop
    this.advance();
    throw new LexError(`Unexpected character '${ch}'`, start);
  }

  private scanLineComment(start: Position): void {
    // consume //
    this.advance();
    this.advance();
    let value = '';
    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.advance();
    }
    this.addToken(TokenType.LineComment, value, start, this.position());
  }

  private scanBlockComment(start: Position): void {
    // consume /*
    this.advance();
    this.advance();
    let value = '';
    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); // *
        this.advance(); // /
        this.addToken(TokenType.BlockComment, value, start, this.position());
        return;
      }
      const ch = this.peek();
      if (ch === '\n') {
        value += ch;
        this.pos++;
        this.line++;
        this.column = 0;
      } else if (ch === '\r') {
        this.pos++;
        if (!this.isAtEnd() && this.peek() === '\n') {
          value += '\n';
          this.pos++;
        } else {
          value += '\n';
        }
        this.line++;
        this.column = 0;
      } else {
        value += this.advance();
      }
    }
    throw new LexError('Unterminated block comment', start);
  }

  private scanString(start: Position): void {
    this.advance(); // opening "
    let value = '';
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === '"') {
        this.advance(); // closing "
        this.addToken(TokenType.String, value, start, this.position());
        return;
      }
      if (ch === '\\') {
        this.advance(); // backslash
        if (this.isAtEnd()) {
          throw new LexError('Unterminated string', start);
        }
        const esc = this.advance();
        switch (esc) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          default: value += '\\' + esc; break;
        }
      } else if (ch === '\n' || ch === '\r') {
        throw new LexError('Unterminated string', start);
      } else {
        value += this.advance();
      }
    }
    throw new LexError('Unterminated string', start);
  }

  private scanNumber(start: Position): void {
    let value = '';
    while (!this.isAtEnd() && isDigit(this.peek())) {
      value += this.advance();
    }
    if (!this.isAtEnd() && this.peek() === '.' && this.peekNext() !== undefined && isDigit(this.peekNext()!)) {
      value += this.advance(); // .
      while (!this.isAtEnd() && isDigit(this.peek())) {
        value += this.advance();
      }
    }
    this.addToken(TokenType.Number, value, start, this.position());
  }

  private scanIdentifier(start: Position): void {
    let value = '';
    while (!this.isAtEnd() && isIdentPart(this.peek())) {
      value += this.advance();
    }
    // All identifiers (including keywords) get TokenType.Identifier
    this.addToken(TokenType.Identifier, value, start, this.position());
  }
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}

/** Error thrown by the lexer */
export class LexError extends Error {
  loc: Position;
  constructor(message: string, loc: Position) {
    super(`${message} at ${loc.line}:${loc.column}`);
    this.name = 'LexError';
    this.loc = loc;
  }
}

/**
 * Convenience function: lex source code into tokens.
 * Comment tokens are excluded by default.
 */
export function lex(source: string, options?: { includeComments?: boolean }): Token[] {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  if (options?.includeComments) return tokens;
  return tokens.filter(
    (t) => t.type !== TokenType.LineComment && t.type !== TokenType.BlockComment,
  );
}
