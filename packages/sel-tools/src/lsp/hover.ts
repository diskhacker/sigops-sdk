import type { Position, Program, Statement, Property, Expression } from '../parser/ast.js';

/** Hover information for a token. */
export interface HoverInfo {
  content: string;
  range: { start: Position; end: Position };
}

/** Documentation map for keywords and known properties. */
const KEYWORD_DOCS: Record<string, string> = {
  monitor: 'Defines a monitor block that watches a metric and triggers actions when thresholds are crossed.',
  alert: 'Defines an alert block that fires notifications when a condition is met.',
  action: 'Defines a reusable action block (e.g., restart a service).',
  when: 'Specifies the condition that triggers an alert.',
  then: 'Specifies the action to take when an alert fires.',
  else: 'Specifies an alternative action.',
  threshold: 'The numeric threshold that triggers a monitor (e.g., CPU > 90).',
  interval: 'How often the monitor polls (e.g., "5m", "30s").',
  target: 'The service or resource an action operates on.',
  timeout: 'Maximum time an action may run before being aborted.',
  pre_check: 'A health check to run before executing an action.',
  on_failure: 'Fallback action if the primary action fails.',
  escalate_after: 'Duration before an unresolved alert is escalated.',
  notify: 'Built-in function to send a notification to a team or channel.',
  true: 'Boolean literal true.',
  false: 'Boolean literal false.',
  null: 'Null literal — represents the absence of a value.',
};

/**
 * Find the AST node at a given position and return hover info.
 */
export function getHover(
  program: Program | null,
  position: Position,
  _source: string,
): HoverInfo | null {
  if (!program) return null;

  // Walk the AST to find a node at the given position
  for (const stmt of program.body) {
    // Check statement keyword itself
    if (positionInRange(position, stmt.loc.start, {
      line: stmt.loc.start.line,
      column: stmt.loc.start.column + keywordLength(stmt.type),
    })) {
      const kw = stmtKeyword(stmt.type);
      if (kw && KEYWORD_DOCS[kw]) {
        return {
          content: KEYWORD_DOCS[kw],
          range: {
            start: stmt.loc.start,
            end: { line: stmt.loc.start.line, column: stmt.loc.start.column + kw.length },
          },
        };
      }
    }

    // Check block name
    if (positionInLoc(position, stmt.name.loc)) {
      return {
        content: `${stmtKeyword(stmt.type)} block named '${stmt.name.name}'`,
        range: stmt.name.loc,
      };
    }

    // Check properties
    for (const prop of stmt.body) {
      const keyHover = checkPropertyKey(prop, position);
      if (keyHover) return keyHover;
      const valHover = checkExpression(prop.value, position);
      if (valHover) return valHover;
    }
  }

  return null;
}

function checkPropertyKey(prop: Property, position: Position): HoverInfo | null {
  if (positionInLoc(position, prop.key.loc)) {
    const doc = KEYWORD_DOCS[prop.key.name];
    return {
      content: doc ?? `Property '${prop.key.name}'`,
      range: prop.key.loc,
    };
  }
  return null;
}

function checkExpression(expr: Expression, position: Position): HoverInfo | null {
  if (!positionInLoc(position, expr.loc)) return null;

  switch (expr.type) {
    case 'Identifier': {
      const doc = KEYWORD_DOCS[expr.name];
      if (doc) {
        return { content: doc, range: expr.loc };
      }
      return { content: `Identifier '${expr.name}'`, range: expr.loc };
    }
    case 'StringLiteral':
      return { content: `String: "${expr.value}"`, range: expr.loc };
    case 'NumberLiteral':
      return { content: `Number: ${expr.value}`, range: expr.loc };
    case 'BooleanLiteral': {
      const doc = KEYWORD_DOCS[String(expr.value)];
      return { content: doc ?? `Boolean: ${expr.value}`, range: expr.loc };
    }
    case 'NullLiteral':
      return { content: KEYWORD_DOCS['null'] ?? 'null', range: expr.loc };
    case 'CallExpression': {
      // Check callee first
      const calleeHover = checkExpression(expr.callee, position);
      if (calleeHover) return calleeHover;
      for (const arg of expr.arguments) {
        if (arg.type === 'NamedArgument') {
          const nh = checkExpression(arg.value, position);
          if (nh) return nh;
        } else {
          const ah = checkExpression(arg, position);
          if (ah) return ah;
        }
      }
      return null;
    }
    case 'BinaryExpression': {
      const lh = checkExpression(expr.left, position);
      if (lh) return lh;
      return checkExpression(expr.right, position);
    }
    case 'MemberExpression': {
      const oh = checkExpression(expr.object, position);
      if (oh) return oh;
      if (positionInLoc(position, expr.property.loc)) {
        return { content: `Property '${expr.property.name}'`, range: expr.property.loc };
      }
      return null;
    }
    default:
      return null;
  }
}

function positionInLoc(
  pos: Position,
  loc: { start: Position; end: Position },
): boolean {
  return positionInRange(pos, loc.start, loc.end);
}

function positionInRange(pos: Position, start: Position, end: Position): boolean {
  if (pos.line < start.line || pos.line > end.line) return false;
  if (pos.line === start.line && pos.column < start.column) return false;
  if (pos.line === end.line && pos.column > end.column) return false;
  return true;
}

function keywordLength(type: string): number {
  switch (type) {
    case 'MonitorStatement': return 7;
    case 'AlertStatement': return 5;
    case 'ActionStatement': return 6;
    default: return 0;
  }
}

function stmtKeyword(type: string): string {
  switch (type) {
    case 'MonitorStatement': return 'monitor';
    case 'AlertStatement': return 'alert';
    case 'ActionStatement': return 'action';
    default: return '';
  }
}
