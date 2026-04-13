import type {
  Program,
  Statement,
  MonitorStatement,
  AlertStatement,
  ActionStatement,
  Property,
  Expression,
  Identifier,
  NamedArgument,
  Position,
  SourceLocation,
} from './ast.js';
import { Lexer, TokenType, type Token } from './lexer.js';

/** Error thrown when the parser encounters invalid syntax */
export class ParseError extends Error {
  loc: Position;
  constructor(message: string, loc: Position) {
    super(`${message} at ${loc.line}:${loc.column}`);
    this.name = 'ParseError';
    this.loc = loc;
  }
}

/**
 * Recursive-descent parser for SEL.
 * Produces an AST from a token stream.
 */
export class Parser {
  private tokens: Token[] = [];
  private current = 0;
  private comments: Token[] = [];

  constructor(private source: string) {}

  /** Parse the source and return the AST Program node. */
  parse(): Program {
    const lexer = new Lexer(this.source);
    const allTokens = lexer.tokenize();

    // Separate comments from other tokens
    this.tokens = [];
    this.comments = [];
    for (const t of allTokens) {
      if (t.type === TokenType.LineComment || t.type === TokenType.BlockComment) {
        this.comments.push(t);
      } else {
        this.tokens.push(t);
      }
    }
    this.current = 0;

    const start = this.position();
    const body: Statement[] = [];
    while (!this.isAtEnd()) {
      body.push(this.parseStatement());
    }
    const end = body.length > 0 ? body[body.length - 1].loc.end : start;
    return { type: 'Program', body, loc: { start, end } };
  }

  /** Return collected comment tokens (useful for the formatter). */
  getComments(): Token[] {
    return this.comments;
  }

  // ---------- helpers ----------

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekNext(): Token | undefined {
    return this.tokens[this.current + 1];
  }

  private advance(): Token {
    const token = this.tokens[this.current];
    if (token.type !== TokenType.EOF) this.current++;
    return token;
  }

  private expect(type: TokenType, message?: string): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new ParseError(
        message ?? `Expected ${type} but got ${token.type} ('${token.value}')`,
        token.loc.start,
      );
    }
    return this.advance();
  }

  private expectIdentifier(value?: string): Token {
    const token = this.peek();
    if (token.type !== TokenType.Identifier) {
      throw new ParseError(
        `Expected identifier${value ? ` '${value}'` : ''} but got ${token.type} ('${token.value}')`,
        token.loc.start,
      );
    }
    if (value !== undefined && token.value !== value) {
      throw new ParseError(
        `Expected '${value}' but got '${token.value}'`,
        token.loc.start,
      );
    }
    return this.advance();
  }

  private position(): Position {
    return this.peek().loc.start;
  }

  // ---------- statement parsing ----------

  private parseStatement(): Statement {
    const token = this.peek();
    if (token.type === TokenType.Identifier) {
      switch (token.value) {
        case 'monitor': return this.parseMonitor();
        case 'alert': return this.parseAlert();
        case 'action': return this.parseAction();
      }
    }
    throw new ParseError(
      `Expected 'monitor', 'alert', or 'action' but got '${token.value}'`,
      token.loc.start,
    );
  }

  private parseMonitor(): MonitorStatement {
    const start = this.position();
    this.advance(); // 'monitor'
    const name = this.parseIdentifierNode();
    const body = this.parseBlock();
    const end = this.tokens[this.current - 1].loc.end; // closing brace
    return { type: 'MonitorStatement', name, body, loc: { start, end } };
  }

  private parseAlert(): AlertStatement {
    const start = this.position();
    this.advance(); // 'alert'
    const name = this.parseIdentifierNode();
    const body = this.parseBlock();
    const end = this.tokens[this.current - 1].loc.end;
    return { type: 'AlertStatement', name, body, loc: { start, end } };
  }

  private parseAction(): ActionStatement {
    const start = this.position();
    this.advance(); // 'action'
    const name = this.parseIdentifierNode();
    const body = this.parseBlock();
    const end = this.tokens[this.current - 1].loc.end;
    return { type: 'ActionStatement', name, body, loc: { start, end } };
  }

  private parseBlock(): Property[] {
    this.expect(TokenType.LeftBrace);
    const properties: Property[] = [];
    while (this.peek().type !== TokenType.RightBrace && !this.isAtEnd()) {
      properties.push(this.parseProperty());
    }
    this.expect(TokenType.RightBrace);
    return properties;
  }

  private parseProperty(): Property {
    const start = this.position();
    const key = this.parseIdentifierNode();
    this.expect(TokenType.Colon);
    const value = this.parseExpression();
    const end = value.loc.end;
    return { type: 'Property', key, value, loc: { start, end } };
  }

  // ---------- expression parsing ----------

  private parseExpression(): Expression {
    return this.parseComparison();
  }

  private parseComparison(): Expression {
    let left = this.parseAddition();
    while (this.matchOperator(['>', '<', '>=', '<=', '==', '!='])) {
      const operatorToken = this.advance();
      const right = this.parseAddition();
      left = {
        type: 'BinaryExpression',
        left,
        operator: operatorToken.value,
        right,
        loc: { start: left.loc.start, end: right.loc.end },
      };
    }
    return left;
  }

  private parseAddition(): Expression {
    let left = this.parseMultiplication();
    while (this.matchOperator(['+', '-'])) {
      const operatorToken = this.advance();
      const right = this.parseMultiplication();
      left = {
        type: 'BinaryExpression',
        left,
        operator: operatorToken.value,
        right,
        loc: { start: left.loc.start, end: right.loc.end },
      };
    }
    return left;
  }

  private parseMultiplication(): Expression {
    let left = this.parseCall();
    while (this.matchOperator(['*', '/'])) {
      const operatorToken = this.advance();
      const right = this.parseCall();
      left = {
        type: 'BinaryExpression',
        left,
        operator: operatorToken.value,
        right,
        loc: { start: left.loc.start, end: right.loc.end },
      };
    }
    return left;
  }

  private parseCall(): Expression {
    let expr = this.parseMember();

    // Function call
    if (this.peek().type === TokenType.LeftParen) {
      this.advance(); // (
      const args: (Expression | NamedArgument)[] = [];
      if (this.peek().type !== TokenType.RightParen) {
        args.push(this.parseArgument());
        while (this.peek().type === TokenType.Comma) {
          this.advance(); // ,
          args.push(this.parseArgument());
        }
      }
      const closing = this.expect(TokenType.RightParen);
      expr = {
        type: 'CallExpression',
        callee: expr,
        arguments: args,
        loc: { start: expr.loc.start, end: closing.loc.end },
      };
    }

    return expr;
  }

  private parseArgument(): Expression | NamedArgument {
    // Check for named argument: identifier followed by colon
    if (
      this.peek().type === TokenType.Identifier &&
      this.peekNext()?.type === TokenType.Colon
    ) {
      // Peek ahead to see if this is really a named argument
      // (identifiers like keywords could also be used)
      const start = this.position();
      const name = this.parseIdentifierNode();
      this.expect(TokenType.Colon);
      const value = this.parseExpression();
      return {
        type: 'NamedArgument',
        name,
        value,
        loc: { start, end: value.loc.end },
      };
    }
    return this.parseExpression();
  }

  private parseMember(): Expression {
    let expr = this.parsePrimary();

    while (this.peek().type === TokenType.Dot) {
      this.advance(); // .
      const property = this.parseIdentifierNode();
      expr = {
        type: 'MemberExpression',
        object: expr,
        property,
        loc: { start: expr.loc.start, end: property.loc.end },
      };
    }

    return expr;
  }

  private parsePrimary(): Expression {
    const token = this.peek();

    // String literal
    if (token.type === TokenType.String) {
      this.advance();
      return {
        type: 'StringLiteral',
        value: token.value,
        loc: token.loc,
      };
    }

    // Number literal
    if (token.type === TokenType.Number) {
      this.advance();
      return {
        type: 'NumberLiteral',
        value: Number(token.value),
        loc: token.loc,
      };
    }

    // Boolean / null / identifier
    if (token.type === TokenType.Identifier) {
      if (token.value === 'true') {
        this.advance();
        return { type: 'BooleanLiteral', value: true, loc: token.loc };
      }
      if (token.value === 'false') {
        this.advance();
        return { type: 'BooleanLiteral', value: false, loc: token.loc };
      }
      if (token.value === 'null') {
        this.advance();
        return { type: 'NullLiteral', loc: token.loc };
      }
      this.advance();
      return { type: 'Identifier', name: token.value, loc: token.loc };
    }

    // Parenthesised expression
    if (token.type === TokenType.LeftParen) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RightParen);
      return expr;
    }

    throw new ParseError(
      `Unexpected token ${token.type} ('${token.value}')`,
      token.loc.start,
    );
  }

  // ---------- utilities ----------

  private parseIdentifierNode(): Identifier {
    const token = this.expect(TokenType.Identifier);
    return { type: 'Identifier', name: token.value, loc: token.loc };
  }

  private matchOperator(ops: string[]): boolean {
    const token = this.peek();
    const tokenOp = tokenToOperator(token);
    return tokenOp !== null && ops.includes(tokenOp);
  }
}

/** Map a token to its operator string, or null if not an operator. */
function tokenToOperator(token: Token): string | null {
  switch (token.type) {
    case TokenType.Plus: return '+';
    case TokenType.Minus: return '-';
    case TokenType.Star: return '*';
    case TokenType.Slash: return '/';
    case TokenType.Greater: return '>';
    case TokenType.Less: return '<';
    case TokenType.GreaterEqual: return '>=';
    case TokenType.LessEqual: return '<=';
    case TokenType.EqualEqual: return '==';
    case TokenType.BangEqual: return '!=';
    default: return null;
  }
}

/**
 * Convenience function: parse SEL source into an AST Program.
 * Throws `ParseError` on syntax errors.
 */
export function parse(source: string): Program {
  return new Parser(source).parse();
}
