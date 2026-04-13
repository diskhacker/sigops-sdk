import type { Position, Program, Statement } from '../parser/ast.js';

/** A single completion suggestion. */
export interface CompletionItem {
  label: string;
  kind: 'keyword' | 'property' | 'function' | 'value';
  detail?: string;
  insertText?: string;
}

/** Top-level keywords that start a block. */
const TOP_LEVEL_KEYWORDS: CompletionItem[] = [
  { label: 'monitor', kind: 'keyword', detail: 'Define a monitor block' },
  { label: 'alert', kind: 'keyword', detail: 'Define an alert block' },
  { label: 'action', kind: 'keyword', detail: 'Define an action block' },
];

/** Properties valid inside a monitor block. */
const MONITOR_PROPERTIES: CompletionItem[] = [
  { label: 'threshold', kind: 'property', detail: 'Trigger threshold value' },
  { label: 'interval', kind: 'property', detail: 'Polling interval (e.g. "5m")' },
  { label: 'action', kind: 'property', detail: 'Action to take when triggered' },
];

/** Properties valid inside an alert block. */
const ALERT_PROPERTIES: CompletionItem[] = [
  { label: 'when', kind: 'property', detail: 'Condition that triggers the alert' },
  { label: 'then', kind: 'property', detail: 'Action to take when alert fires' },
  { label: 'escalate_after', kind: 'property', detail: 'Duration before escalation' },
];

/** Properties valid inside an action block. */
const ACTION_PROPERTIES: CompletionItem[] = [
  { label: 'target', kind: 'property', detail: 'Target service or resource' },
  { label: 'pre_check', kind: 'property', detail: 'Check to run before action' },
  { label: 'timeout', kind: 'property', detail: 'Action timeout (e.g. "60s")' },
  { label: 'on_failure', kind: 'property', detail: 'Fallback on failure' },
];

/** Built-in function completions. */
const BUILTIN_FUNCTIONS: CompletionItem[] = [
  { label: 'alert', kind: 'function', detail: 'Send an alert notification', insertText: 'alert("$1")' },
  { label: 'notify', kind: 'function', detail: 'Notify a team or channel', insertText: 'notify("$1")' },
  { label: 'health_check', kind: 'function', detail: 'Run a health check', insertText: 'health_check($1)' },
];

/** Value literal completions. */
const VALUE_COMPLETIONS: CompletionItem[] = [
  { label: 'true', kind: 'value', detail: 'Boolean true' },
  { label: 'false', kind: 'value', detail: 'Boolean false' },
  { label: 'null', kind: 'value', detail: 'Null value' },
];

/**
 * Determine which block (if any) a position falls inside.
 */
function findContainingBlock(program: Program, position: Position): Statement | null {
  for (const stmt of program.body) {
    if (
      position.line >= stmt.loc.start.line &&
      position.line <= stmt.loc.end.line
    ) {
      return stmt;
    }
  }
  return null;
}

/**
 * Get completions for a given position in the source code.
 */
export function getCompletions(
  program: Program | null,
  position: Position,
  _source: string,
): CompletionItem[] {
  if (!program) {
    // If parsing failed, return top-level keywords
    return [...TOP_LEVEL_KEYWORDS];
  }

  const block = findContainingBlock(program, position);

  if (!block) {
    // Outside any block — suggest top-level keywords
    return [...TOP_LEVEL_KEYWORDS];
  }

  // Inside a block — suggest properties based on block type
  switch (block.type) {
    case 'MonitorStatement':
      return [...MONITOR_PROPERTIES, ...BUILTIN_FUNCTIONS, ...VALUE_COMPLETIONS];
    case 'AlertStatement':
      return [...ALERT_PROPERTIES, ...BUILTIN_FUNCTIONS, ...VALUE_COMPLETIONS];
    case 'ActionStatement':
      return [...ACTION_PROPERTIES, ...BUILTIN_FUNCTIONS, ...VALUE_COMPLETIONS];
    default:
      return [...TOP_LEVEL_KEYWORDS];
  }
}
