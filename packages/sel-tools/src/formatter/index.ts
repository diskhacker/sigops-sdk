import type {
  Program,
  Statement,
  Property,
  Expression,
  NamedArgument,
} from '../parser/ast.js';
import { Parser } from '../parser/parser.js';
import { Lexer, TokenType, type Token } from '../parser/lexer.js';

/** Options for the SEL formatter. */
export interface FormatOptions {
  /** Number of spaces per indentation level (default: 2). */
  indent?: number;
  /** Maximum line length — advisory, not strictly enforced (default: 80). */
  maxLineLength?: number;
  /** Sort properties within blocks alphabetically (default: false). */
  sortProperties?: boolean;
}

/**
 * Format SEL source code.
 *
 * Parses the source into an AST, then re-emits it with consistent
 * indentation, normalised spacing, and (optionally) sorted properties.
 * Comments are preserved by collecting them from the lexer and reinserting
 * them before the closest subsequent AST node.
 */
export function format(source: string, options?: FormatOptions): string {
  const indent = options?.indent ?? 2;
  const sortProperties = options?.sortProperties ?? false;

  // Handle empty / whitespace-only input
  const trimmed = source.trim();
  if (trimmed === '') return '';

  // Collect comments from the lexer
  const lexer = new Lexer(source);
  const allTokens = lexer.tokenize();
  const comments: Token[] = allTokens.filter(
    (t) => t.type === TokenType.LineComment || t.type === TokenType.BlockComment,
  );

  // Parse the AST
  const parser = new Parser(source);
  const program = parser.parse();

  const pad = (level: number) => ' '.repeat(indent * level);
  const lines: string[] = [];

  // Index into comments array — we emit comments that appear before a given line
  let commentIdx = 0;

  function emitCommentsBefore(line: number): void {
    while (commentIdx < comments.length && comments[commentIdx].loc.start.line < line) {
      const c = comments[commentIdx];
      if (c.type === TokenType.LineComment) {
        lines.push(`//${c.value}`);
      } else {
        lines.push(`/*${c.value}*/`);
      }
      commentIdx++;
    }
  }

  function emitCommentsOnLine(line: number): string {
    let inline = '';
    while (commentIdx < comments.length && comments[commentIdx].loc.start.line === line) {
      const c = comments[commentIdx];
      if (c.type === TokenType.LineComment) {
        inline += ` //${c.value}`;
      } else {
        inline += ` /*${c.value}*/`;
      }
      commentIdx++;
    }
    return inline;
  }

  function formatExpression(expr: Expression | NamedArgument): string {
    switch (expr.type) {
      case 'StringLiteral':
        return `"${escapeString(expr.value)}"`;
      case 'NumberLiteral':
        return String(expr.value);
      case 'BooleanLiteral':
        return String(expr.value);
      case 'NullLiteral':
        return 'null';
      case 'Identifier':
        return expr.name;
      case 'BinaryExpression':
        return `${formatExpression(expr.left)} ${expr.operator} ${formatExpression(expr.right)}`;
      case 'MemberExpression':
        return `${formatExpression(expr.object)}.${expr.property.name}`;
      case 'CallExpression': {
        const callee = formatExpression(expr.callee);
        const args = expr.arguments.map((a) => formatExpression(a)).join(', ');
        return `${callee}(${args})`;
      }
      case 'NamedArgument':
        return `${expr.name.name}: ${formatExpression(expr.value)}`;
      default:
        return '';
    }
  }

  function formatProperty(prop: Property, level: number): string {
    return `${pad(level)}${prop.key.name}: ${formatExpression(prop.value)}`;
  }

  function formatStatement(stmt: Statement): void {
    emitCommentsBefore(stmt.loc.start.line);

    const keyword =
      stmt.type === 'MonitorStatement'
        ? 'monitor'
        : stmt.type === 'AlertStatement'
          ? 'alert'
          : 'action';

    const openLine = `${keyword} ${stmt.name.name} {`;
    const inlineComment = emitCommentsOnLine(stmt.loc.start.line);
    lines.push(openLine + inlineComment);

    let props = [...stmt.body];
    if (sortProperties) {
      props = props.sort((a, b) => a.key.name.localeCompare(b.key.name));
    }

    for (const prop of props) {
      emitCommentsBefore(prop.loc.start.line);
      const propLine = formatProperty(prop, 1);
      const propComment = emitCommentsOnLine(prop.loc.start.line);
      lines.push(propLine + propComment);
    }

    // Emit any comments inside the block before closing brace
    emitCommentsBefore(stmt.loc.end.line);
    lines.push('}');
  }

  for (let i = 0; i < program.body.length; i++) {
    if (i > 0) lines.push('');
    formatStatement(program.body[i]);
  }

  // Emit any remaining comments
  while (commentIdx < comments.length) {
    const c = comments[commentIdx];
    if (c.type === TokenType.LineComment) {
      lines.push(`//${c.value}`);
    } else {
      lines.push(`/*${c.value}*/`);
    }
    commentIdx++;
  }

  return lines.join('\n') + '\n';
}

function escapeString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}
