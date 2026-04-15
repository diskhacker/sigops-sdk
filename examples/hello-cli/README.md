# hello-cli

A minimal [@sigops/cli](../../packages/cli) example: uses the CLI's
programmatic API to scaffold a new workflow project.

## What this example shows

The SigOps CLI (`sigops`) is normally invoked from the terminal, but every
command is also exported as a class so you can use it from your own code.
This example uses `InitCommand` — the class behind `sigops init` — to:

1. Generate a scaffold for a new tool/template/plugin/connector project.
2. Return the list of files that *would* be written (it's a pure function
   with no filesystem side effects — perfect for testing).
3. Print a human-readable summary.

This pattern is how IDE integrations, web playgrounds, and CI checks embed
the CLI without shelling out.

## Install & build

From the repo root:

```bash
pnpm install
pnpm --filter @sigops-examples/hello-cli build
```

## Use programmatically

```ts
import { scaffold, summarize } from '@sigops-examples/hello-cli';

const result = scaffold('my-new-tool', 'tool');
console.log(summarize(result));
// Scaffold for 'my-new-tool' would create:
//   - package.json (N bytes)
//   - tsconfig.json (N bytes)
//   - src/index.ts (N bytes)
//   - __tests__/index.test.ts (N bytes)
//   - README.md (N bytes)
```

## Using the real CLI instead

Once `@sigops/cli` is published, you'll typically use it like this:

```bash
pnpm add -g @sigops/cli
sigops init my-tool --type tool
cd my-tool
sigops test --input '{"message":"hi"}'
sigops validate
sigops publish
```

## Next steps

- Explore the other `@sigops/cli` commands: `TestCommand`, `ValidateCommand`,
  `PublishCommand`, `SelCommand`, `LoginCommand`, `TemplateCommand`.
- See `docs/guides/cli.md` for the full command reference.
