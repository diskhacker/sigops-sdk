export {
  createExtensionState,
  activate,
  deactivate,
  DEFAULT_CONFIG,
  type ExtensionState,
  type ExtensionConfig,
  type CommandDefinition,
} from './extension.js';
export {
  createLanguageClientConfig,
  convertDiagnostics,
  DiagnosticSeverity,
  type LanguageClientConfig,
  type SELDiagnostic,
  type LintResult,
  type Range,
  type Position,
} from './language-client.js';
export {
  SELCommand,
  getCommandDefinitions,
  lintFileContent,
  formatFileContent,
  parseFileContent,
  validateWorkspaceFiles,
  type CommandInfo,
  type LintOutput,
  type FormatOutput,
  type ParseOutput,
  type WorkspaceValidation,
} from './commands.js';
export {
  validateGrammar,
  extractScopes,
  matchPattern,
  SEL_LANGUAGE_ID,
  SEL_FILE_EXTENSIONS,
} from './grammar.js';
