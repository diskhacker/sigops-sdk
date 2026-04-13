export interface GrammarScope {
  scopeName: string;
  name: string;
  fileTypes: string[];
  patterns: GrammarPattern[];
}

export interface GrammarPattern {
  name?: string;
  match?: string;
  begin?: string;
  end?: string;
  include?: string;
  patterns?: GrammarPattern[];
}

/** Validate a TextMate grammar structure */
export function validateGrammar(grammar: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!grammar || typeof grammar !== 'object') {
    return { valid: false, errors: ['Grammar must be an object'] };
  }

  if (!grammar.scopeName || typeof grammar.scopeName !== 'string') {
    errors.push('Missing or invalid scopeName');
  }

  if (!grammar.name || typeof grammar.name !== 'string') {
    errors.push('Missing or invalid name');
  }

  if (!Array.isArray(grammar.patterns)) {
    errors.push('Missing or invalid patterns array');
  }

  if (grammar.fileTypes && !Array.isArray(grammar.fileTypes)) {
    errors.push('fileTypes must be an array');
  }

  if (grammar.repository && typeof grammar.repository !== 'object') {
    errors.push('repository must be an object');
  }

  return { valid: errors.length === 0, errors };
}

/** Get all scope names from a grammar */
export function extractScopes(grammar: any): string[] {
  const scopes: Set<string> = new Set();

  function walk(patterns: any[]): void {
    if (!Array.isArray(patterns)) return;
    for (const pattern of patterns) {
      if (pattern.name) {
        scopes.add(pattern.name);
      }
      if (pattern.patterns) {
        walk(pattern.patterns);
      }
    }
  }

  // Walk top-level patterns
  walk(grammar.patterns ?? []);

  // Walk repository
  if (grammar.repository) {
    for (const key of Object.keys(grammar.repository)) {
      const entry = grammar.repository[key];
      if (entry.name) {
        scopes.add(entry.name);
      }
      if (entry.patterns) {
        walk(entry.patterns);
      }
    }
  }

  return Array.from(scopes);
}

/** Check if a token matches a grammar pattern */
export function matchPattern(text: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern);
    return regex.test(text);
  } catch {
    return false;
  }
}

/** SEL language ID */
export const SEL_LANGUAGE_ID = 'sel';

/** File extensions for SEL */
export const SEL_FILE_EXTENSIONS = ['.sel'];
