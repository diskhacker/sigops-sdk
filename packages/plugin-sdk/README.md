# @sigops/plugin-sdk

SDK for building SigOps plugins — extensions that register lifecycle hooks
and/or mount UI extensions in the SigOps web app.

## Install

```bash
pnpm add @sigops/plugin-sdk
```

## Quickstart

```ts
import { definePlugin, HookPoint } from '@sigops/plugin-sdk';

export default definePlugin({
  name: 'audit-log',
  description: 'Forwards every tool execution to an external audit log',
  hooks: [{
    point: HookPoint.AfterToolExecute,
    async handler(event) { return { handled: true }; },
  }],
  uiExtensions: [{ point: 'dashboard-widget', component: 'AuditLogWidget' }],
});
```

## Docs

Full guide: [docs/guides/plugin-sdk.md](../../docs/guides/plugin-sdk.md).
Runnable example: [examples/hello-plugin](../../examples/hello-plugin).

## License

MIT
