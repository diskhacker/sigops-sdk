/** Available commands */
export enum SELCommand {
  LintFile = 'sigops-sel.lintFile',
  FormatFile = 'sigops-sel.formatFile',
  ParseFile = 'sigops-sel.parseFile',
  ShowAST = 'sigops-sel.showAST',
  ValidateWorkspace = 'sigops-sel.validateWorkspace',
  OpenPlayground = 'sigops-sel.openPlayground',
  RestartServer = 'sigops-sel.restartServer',
}

export interface CommandInfo {
  id: SELCommand;
  title: string;
  category: string;
  enablement?: string;
}

/** Get all command definitions */
export function getCommandDefinitions(): CommandInfo[] {
  return [
    { id: SELCommand.LintFile, title: 'Lint File', category: 'SEL' },
    { id: SELCommand.FormatFile, title: 'Format File', category: 'SEL' },
    { id: SELCommand.ParseFile, title: 'Parse File', category: 'SEL' },
    { id: SELCommand.ShowAST, title: 'Show AST', category: 'SEL', enablement: 'editorLangId == sel' },
    { id: SELCommand.ValidateWorkspace, title: 'Validate Workspace', category: 'SEL' },
    { id: SELCommand.OpenPlayground, title: 'Open Playground', category: 'SEL' },
    { id: SELCommand.RestartServer, title: 'Restart Language Server', category: 'SEL' },
  ];
}

export interface LintOutput {
  diagnostics: { line: number; column: number; message: string; severity: string }[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface FormatOptions {
  indent?: number;
  insertFinalNewline?: boolean;
}

export interface FormatOutput {
  formatted: string;
  changed: boolean;
}

export interface ParseOutput {
  success: boolean;
  ast?: any;
  error?: string;
}

export interface WorkspaceValidation {
  valid: boolean;
  selFiles: string[];
  issues: string[];
}

/**
 * Lint file logic (pure function).
 * Checks for balanced braces, empty blocks, and presence of SEL keywords.
 */
export function lintFileContent(source: string): LintOutput {
  const diagnostics: { line: number; column: number; message: string; severity: string }[] = [];

  // Check balanced braces
  let braceDepth = 0;
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (let j = 0; j < lines[i].length; j++) {
      if (lines[i][j] === '{') braceDepth++;
      if (lines[i][j] === '}') braceDepth--;
      if (braceDepth < 0) {
        diagnostics.push({
          line: i + 1,
          column: j + 1,
          message: 'Unexpected closing brace',
          severity: 'error',
        });
        braceDepth = 0;
      }
    }
  }
  if (braceDepth > 0) {
    diagnostics.push({
      line: lines.length,
      column: 1,
      message: `Unclosed brace: ${braceDepth} opening brace(s) without matching close`,
      severity: 'error',
    });
  }

  // Check for empty blocks: { }
  for (let i = 0; i < lines.length; i++) {
    const emptyBlockMatch = lines[i].match(/\{\s*\}/);
    if (emptyBlockMatch) {
      diagnostics.push({
        line: i + 1,
        column: (emptyBlockMatch.index ?? 0) + 1,
        message: 'Empty block detected',
        severity: 'warning',
      });
    }
  }

  // Check for SEL keywords (informational if none found)
  const selKeywords = /\b(monitor|alert|action|when|then|else|threshold|interval|target)\b/;
  if (source.trim().length > 0 && !selKeywords.test(source)) {
    diagnostics.push({
      line: 1,
      column: 1,
      message: 'No SEL keywords found in file',
      severity: 'info',
    });
  }

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;
  const infoCount = diagnostics.filter((d) => d.severity === 'info').length;

  return { diagnostics, errorCount, warningCount, infoCount };
}

/**
 * Format file logic (pure function).
 * Trims trailing whitespace, normalizes indentation, optionally adds final newline.
 */
export function formatFileContent(source: string, options?: FormatOptions): FormatOutput {
  const indent = options?.indent ?? 2;
  const insertFinalNewline = options?.insertFinalNewline ?? true;

  const lines = source.split('\n');
  const formattedLines: string[] = [];
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Decrease depth for closing braces
    if (trimmed.startsWith('}')) {
      depth = Math.max(0, depth - 1);
    }

    if (trimmed.length === 0) {
      formattedLines.push('');
    } else {
      formattedLines.push(' '.repeat(depth * indent) + trimmed);
    }

    // Increase depth for opening braces (that aren't immediately closed)
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    depth += openBraces - closeBraces;
    // Compensate: we already decremented for leading }, so add it back for net calculation
    if (trimmed.startsWith('}')) {
      // We already decremented before formatting the line.
      // The net change from braces on this line (excluding the leading }) is:
      // (openBraces - (closeBraces - 1)) but we need to reconcile with the
      // depth += openBraces - closeBraces above.
      // Actually, let's recalculate properly:
      // Before the line: we did depth-- for leading }
      // After the line: we did depth += (open - close)
      // This double-counts the leading }, so add 1 back.
      depth += 1;
    }
    depth = Math.max(0, depth);
  }

  let formatted = formattedLines.join('\n');

  if (insertFinalNewline && !formatted.endsWith('\n')) {
    formatted += '\n';
  }

  const changed = formatted !== source;

  return { formatted, changed };
}

/**
 * Parse file logic (pure function).
 * Uses regex-based checks for valid SEL structure.
 */
export function parseFileContent(source: string): ParseOutput {
  const trimmed = source.trim();

  if (trimmed.length === 0) {
    return { success: false, error: 'Empty source' };
  }

  // Check balanced braces
  let depth = 0;
  for (const ch of trimmed) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth < 0) {
      return { success: false, error: 'Unbalanced braces: unexpected closing brace' };
    }
  }
  if (depth !== 0) {
    return { success: false, error: 'Unbalanced braces: unclosed opening brace' };
  }

  // Check for valid SEL structure: should have at least one block keyword followed by a block
  const blockPattern = /\b(monitor|alert|action|when|then|else)\b/;
  const hasBlock = blockPattern.test(trimmed);

  // Build a simple AST representation
  const ast: any = {
    type: 'Program',
    body: [],
  };

  // Extract top-level blocks
  const blockRegex = /\b(monitor|alert|action)\s+(\w+)\s*\{/g;
  let match;
  while ((match = blockRegex.exec(trimmed)) !== null) {
    ast.body.push({
      type: match[1],
      name: match[2],
      position: match.index,
    });
  }

  if (!hasBlock && ast.body.length === 0) {
    return { success: false, error: 'No valid SEL blocks found' };
  }

  return { success: true, ast };
}

/**
 * Validate workspace structure.
 * Filter for .sel files and check for common issues.
 */
export function validateWorkspaceFiles(files: string[]): WorkspaceValidation {
  const selFiles = files.filter((f) => f.endsWith('.sel'));
  const issues: string[] = [];

  if (selFiles.length === 0) {
    issues.push('No .sel files found in workspace');
  }

  // Check for naming conventions
  for (const file of selFiles) {
    const basename = file.split('/').pop() ?? file;
    if (basename !== basename.toLowerCase()) {
      issues.push(`File "${basename}" should use lowercase naming`);
    }
    if (basename.includes(' ')) {
      issues.push(`File "${basename}" should not contain spaces`);
    }
  }

  // Check for duplicate basenames
  const basenames = selFiles.map((f) => f.split('/').pop() ?? f);
  const seen = new Set<string>();
  for (const name of basenames) {
    if (seen.has(name)) {
      issues.push(`Duplicate file name: "${name}"`);
    }
    seen.add(name);
  }

  return {
    valid: issues.length === 0,
    selFiles,
    issues,
  };
}
