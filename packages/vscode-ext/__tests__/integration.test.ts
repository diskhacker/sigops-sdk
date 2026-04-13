import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activate, deactivate } from '../src/extension.js';
import { lintFileContent, formatFileContent, parseFileContent, validateWorkspaceFiles } from '../src/commands.js';
import { createLanguageClientConfig } from '../src/language-client.js';
import { validateGrammar, extractScopes } from '../src/grammar.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('integration', () => {
  it('full lifecycle: activate -> register commands -> lint -> format -> deactivate', () => {
    // Activate
    const { state, commands } = activate();
    expect(state.active).toBe(true);
    expect(commands.length).toBe(7);

    // Lint a file
    const selSource = `monitor cpu_check {
  when cpu_usage > 90 {
    alert critical_cpu {
      severity: "critical"
    }
  }
}`;
    const lintResult = lintFileContent(selSource);
    expect(lintResult.errorCount).toBe(0);

    // Format the file
    const formatResult = formatFileContent(selSource, { indent: 2 });
    expect(formatResult.formatted).toBeDefined();

    // Deactivate
    const deactivated = deactivate(state);
    expect(deactivated.active).toBe(false);
    expect(deactivated.registeredCommands).toEqual([]);
  });

  it('grammar file structure matches expected format', () => {
    const grammarPath = resolve(__dirname, '..', 'syntaxes', 'sel.tmLanguage.json');
    const grammarText = readFileSync(grammarPath, 'utf-8');
    const grammar = JSON.parse(grammarText);

    const validation = validateGrammar(grammar);
    expect(validation.valid).toBe(true);
    expect(grammar.scopeName).toBe('source.sel');
    expect(grammar.name).toBe('SEL');
    expect(grammar.fileTypes).toContain('sel');

    const scopes = extractScopes(grammar);
    expect(scopes).toContain('keyword.control.sel');
    expect(scopes).toContain('comment.line.double-slash.sel');
    expect(scopes).toContain('string.quoted.double.sel');
    expect(scopes).toContain('constant.numeric.sel');
  });

  it('language client config is valid for SEL', () => {
    const config = createLanguageClientConfig();
    expect(config.languageId).toBe('sel');
    expect(config.documentSelector.length).toBeGreaterThan(0);
    expect(config.synchronize.fileEvents).toContain('**/*.sel');
    expect(config.synchronize.configurationSection).toBe('sigops-sel');
  });

  it('commands produce consistent output', () => {
    const source = `monitor test {
  when cpu > 80 {
    action restart {
      target: "web-server"
    }
  }
}`;
    // Lint should find no errors
    const lintResult = lintFileContent(source);
    expect(lintResult.errorCount).toBe(0);

    // Parse should succeed
    const parseResult = parseFileContent(source);
    expect(parseResult.success).toBe(true);
    expect(parseResult.ast.body.length).toBeGreaterThan(0);

    // Format should be idempotent when already formatted
    const formatResult = formatFileContent(source, { indent: 2 });
    const formatResult2 = formatFileContent(formatResult.formatted, { indent: 2 });
    expect(formatResult2.changed).toBe(false);
  });

  it('workspace validation identifies SEL project', () => {
    const files = [
      'package.json',
      'src/index.ts',
      'monitors/cpu.sel',
      'monitors/memory.sel',
      'alerts/disk.sel',
      'README.md',
    ];
    const validation = validateWorkspaceFiles(files);
    expect(validation.valid).toBe(true);
    expect(validation.selFiles).toHaveLength(3);
    expect(validation.issues).toHaveLength(0);
  });
});
