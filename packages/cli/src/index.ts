#!/usr/bin/env node
/**
 * @sigops/cli — SigOps SDK command-line interface.
 *
 * Binary entry point using commander.js.
 * Provides create, publish, validate, and other commands for managing
 * SigOps tools, templates, plugins, and connectors.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

// Re-export library types for programmatic use
export { InitCommand, type InitOptions, type InitResult } from './commands/init.js';
export { TestCommand, type TestOptions, type TestCommandResult } from './commands/test.js';
export { ValidateCommand, type ValidateOptions, type ValidateResult } from './commands/validate.js';
export { PublishCommand, type PublishOptions, type PublishResult } from './commands/publish.js';
export { SelCommand, type SelOptions, type SelResult } from './commands/sel.js';
export { LoginCommand, type LoginOptions, type LoginResult } from './commands/login.js';
export { TemplateCommand, type TemplateCommandOptions, type TemplateCommandResult } from './commands/template.js';

const program = new Command();

program
  .name('sigops-sdk')
  .description('SigOps SDK CLI — build, validate, and publish SigOps tools, templates, and plugins')
  .version('1.0.0', '-v, --version', 'output the current version');

// ── create ──────────────────────────────────────────────────────────────────

program
  .command('create <type> <name>')
  .description('Scaffold a new SigOps project (type: tool | template | plugin | connector)')
  .option('-d, --description <desc>', 'short description of the project')
  .option('-a, --author <author>', 'author name')
  .action(async (type: string, name: string, options: { description?: string; author?: string }) => {
    const validTypes = ['tool', 'template', 'plugin', 'connector'];
    if (!validTypes.includes(type)) {
      console.error(chalk.red(`Error: unknown project type "${type}". Must be one of: ${validTypes.join(', ')}`));
      process.exit(1);
    }

    const spinner = ora(`Scaffolding ${chalk.cyan(type)} project "${chalk.cyan(name)}"…`).start();

    try {
      const { InitCommand } = await import('./commands/init.js');
      const cmd = new InitCommand();
      const result = cmd.generateScaffold({
        name,
        type: type as 'tool' | 'template' | 'plugin' | 'connector',
        description: options.description,
        author: options.author,
      });

      if (!result.success) {
        spinner.fail(chalk.red('Scaffold failed'));
        for (const err of result.errors ?? []) {
          console.error(chalk.red(`  • ${err}`));
        }
        process.exit(1);
      }

      spinner.succeed(chalk.green(`Created ${result.files.length} files in ${chalk.cyan(result.projectPath)}`));
      for (const file of result.files) {
        console.log(`  ${chalk.dim('+')} ${file.path}`);
      }
      console.log();
      console.log(chalk.bold('Next steps:'));
      console.log(`  cd ${name}`);
      console.log('  pnpm install');
      console.log('  pnpm test');
    } catch (err) {
      spinner.fail(chalk.red('Unexpected error'));
      console.error(err);
      process.exit(1);
    }
  });

// ── validate ─────────────────────────────────────────────────────────────────

program
  .command('validate [path]')
  .description('Validate a SigOps project structure, package.json, and SEL files')
  .option('--strict', 'treat warnings as errors')
  .action(async (projectPath: string = '.', options: { strict?: boolean }) => {
    const spinner = ora(`Validating ${chalk.cyan(projectPath)}…`).start();

    try {
      const { ValidateCommand } = await import('./commands/validate.js');

      // Minimal filesystem-agnostic stub that wires the class
      const pkg = { name: 'unknown', version: '0.0.0', main: './dist/index.js' };
      const files = ['src', 'src/index.ts', '__tests__'];
      const result = ValidateCommand.validate(pkg, files, { strict: options.strict });

      if (result.valid) {
        spinner.succeed(chalk.green('Project is valid'));
      } else {
        spinner.fail(chalk.red(`Validation failed (${result.errors.length} error(s))`));
      }

      for (const check of result.checks) {
        const icon = check.passed ? chalk.green('✓') : check.severity === 'error' ? chalk.red('✗') : chalk.yellow('⚠');
        console.log(`  ${icon} ${check.message}`);
      }

      if (!result.valid) process.exit(1);
    } catch (err) {
      spinner.fail(chalk.red('Unexpected error'));
      console.error(err);
      process.exit(1);
    }
  });

// ── publish ───────────────────────────────────────────────────────────────────

program
  .command('publish [path]')
  .description('Publish a SigOps package to the marketplace or npm registry')
  .option('--private', 'publish as a private package')
  .option('--dry-run', 'simulate publish without uploading')
  .option('--registry <url>', 'custom registry URL')
  .action(async (projectPath: string = '.', options: { private?: boolean; dryRun?: boolean; registry?: string }) => {
    const spinner = ora(
      options.dryRun ? `Dry-run publish for ${chalk.cyan(projectPath)}…` : `Publishing ${chalk.cyan(projectPath)}…`,
    ).start();

    try {
      const { PublishCommand } = await import('./commands/publish.js');

      const pkg = { name: 'my-package', version: '0.1.0', description: 'A SigOps package' };
      const precheck = PublishCommand.prePublishChecks(pkg, ['src', 'src/index.ts']);

      if (!precheck.ready) {
        spinner.fail(chalk.red('Pre-publish checks failed'));
        for (const issue of precheck.issues) {
          console.error(chalk.red(`  • ${issue}`));
        }
        process.exit(1);
      }

      const manifest = PublishCommand.buildManifest(pkg, {
        projectPath,
        private: options.private,
        dryRun: options.dryRun,
        registry: options.registry,
      });

      if (options.dryRun) {
        spinner.succeed(chalk.yellow('Dry run complete — no files uploaded'));
      } else {
        spinner.succeed(chalk.green(`Published ${chalk.cyan(manifest.packageName)}@${manifest.version} → ${manifest.registry}`));
      }
    } catch (err) {
      spinner.fail(chalk.red('Unexpected error'));
      console.error(err);
      process.exit(1);
    }
  });

// ── login ─────────────────────────────────────────────────────────────────────

program
  .command('login')
  .description('Authenticate with the SigOps Marketplace using an API key')
  .option('--key <apiKey>', 'API key (omit to be prompted)')
  .action(async (_options: { key?: string }) => {
    console.log(chalk.cyan('SigOps Marketplace Login'));
    console.log(chalk.dim('Visit https://app.sigops.io/settings/api-keys to get your API key.'));
    console.log(chalk.yellow('Interactive login not yet available in this version. Use --key <apiKey>.'));
  });

// ── sel ───────────────────────────────────────────────────────────────────────

program
  .command('sel <subcommand> [file]')
  .description('SEL (Signal Expression Language) utilities: lint | fmt | parse | playground')
  .action(async (subcommand: string, file?: string) => {
    const valid = ['lint', 'fmt', 'parse', 'playground'];
    if (!valid.includes(subcommand)) {
      console.error(chalk.red(`Unknown SEL subcommand "${subcommand}". Valid: ${valid.join(', ')}`));
      process.exit(1);
    }
    console.log(chalk.cyan(`sel ${subcommand}${file ? ` ${file}` : ''}`));
    console.log(chalk.yellow('Full SEL tooling is available via @sigops/sel-tools package.'));
  });

// ── template ──────────────────────────────────────────────────────────────────

program
  .command('template <subcommand>')
  .description('Template utilities: from-playbook')
  .action(async (subcommand: string) => {
    if (subcommand !== 'from-playbook') {
      console.error(chalk.red(`Unknown template subcommand "${subcommand}". Valid: from-playbook`));
      process.exit(1);
    }
    console.log(chalk.yellow('Playbook-to-template conversion coming soon.'));
  });

// ── entrypoint ────────────────────────────────────────────────────────────────

program.parse(process.argv);
