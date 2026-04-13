/** Position in source code */
export interface Position {
  /** 1-based line number */
  line: number;
  /** 0-based column number */
  column: number;
}

/** Source location range */
export interface SourceLocation {
  start: Position;
  end: Position;
}

// ---------- Base ----------

/** Base interface for all AST nodes */
export interface BaseNode {
  type: string;
  loc: SourceLocation;
}

// ---------- Program ----------

/** Root node containing all top-level statements */
export interface Program extends BaseNode {
  type: 'Program';
  body: Statement[];
}

// ---------- Statements ----------

/** A monitor block: `monitor name { ... }` */
export interface MonitorStatement extends BaseNode {
  type: 'MonitorStatement';
  name: Identifier;
  body: Property[];
}

/** An alert block: `alert name { ... }` */
export interface AlertStatement extends BaseNode {
  type: 'AlertStatement';
  name: Identifier;
  body: Property[];
}

/** An action block: `action name { ... }` */
export interface ActionStatement extends BaseNode {
  type: 'ActionStatement';
  name: Identifier;
  body: Property[];
}

export type Statement = MonitorStatement | AlertStatement | ActionStatement;

// ---------- Property ----------

/** A key-value property inside a block: `key: value` */
export interface Property extends BaseNode {
  type: 'Property';
  key: Identifier;
  value: Expression;
}

// ---------- Expressions ----------

/** An identifier: `foo` */
export interface Identifier extends BaseNode {
  type: 'Identifier';
  name: string;
}

/** A double-quoted string: `"hello"` */
export interface StringLiteral extends BaseNode {
  type: 'StringLiteral';
  value: string;
}

/** A numeric literal: `42`, `3.14` */
export interface NumberLiteral extends BaseNode {
  type: 'NumberLiteral';
  value: number;
}

/** A boolean literal: `true` or `false` */
export interface BooleanLiteral extends BaseNode {
  type: 'BooleanLiteral';
  value: boolean;
}

/** The null literal */
export interface NullLiteral extends BaseNode {
  type: 'NullLiteral';
}

/** A binary expression: `a + b`, `x > 5` */
export interface BinaryExpression extends BaseNode {
  type: 'BinaryExpression';
  left: Expression;
  operator: string;
  right: Expression;
}

/** A function call: `alert("msg", severity: "critical")` */
export interface CallExpression extends BaseNode {
  type: 'CallExpression';
  callee: Expression;
  arguments: (Expression | NamedArgument)[];
}

/** A member access: `disk.usage` */
export interface MemberExpression extends BaseNode {
  type: 'MemberExpression';
  object: Expression;
  property: Identifier;
}

/** A named argument in a function call: `severity: "critical"` */
export interface NamedArgument extends BaseNode {
  type: 'NamedArgument';
  name: Identifier;
  value: Expression;
}

export type Expression =
  | Identifier
  | StringLiteral
  | NumberLiteral
  | BooleanLiteral
  | NullLiteral
  | BinaryExpression
  | CallExpression
  | MemberExpression;
