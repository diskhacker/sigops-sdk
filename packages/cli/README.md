# @sigops/cli

The `sigops` command — scaffold, test, validate, and publish SigOps tools,
templates, plugins, and connectors. Every subcommand is also exported as a
class so you can embed the CLI in your own tooling.

## Install

```bash
pnpm add -g @sigops/cli
sigops --help
```

## Quickstart

```bash
sigops init hello-tool --type tool
cd hello-tool
pnpm install
pnpm test
sigops validate
sigops publish --access public
```

## Programmatic API

```ts
import { InitCommand, ValidateCommand } from '@sigops/cli';
const scaffold = new InitCommand().generateScaffold({ name: 'x', type: 'tool' });
```

## Docs

Full guide: [docs/guides/cli.md](../../docs/guides/cli.md).
Runnable example: [examples/hello-cli](../../examples/hello-cli).

## License

MIT
