import { definePlugin, HookPoint } from '@sigops/plugin-sdk';

/**
 * hello-plugin — the smallest possible SigOps plugin.
 *
 * Registers:
 *   - One hook handler on `AfterToolExecute` that logs a greeting and
 *     increments an in-memory counter.
 *   - One UI extension that mounts on the 'dashboard-widget' slot.
 */
let toolExecutions = 0;

export const helloPlugin = definePlugin({
  name: 'hello-plugin',
  description: 'Greets the user every time a tool finishes executing',
  version: '0.1.0',
  hooks: [
    {
      point: HookPoint.AfterToolExecute,
      handler: async (event) => {
        toolExecutions += 1;
        return {
          handled: true,
          data: {
            message: `hello from hello-plugin! tool #${toolExecutions} done`,
            eventType: event.type,
          },
        };
      },
      priority: 10,
    },
  ],
  uiExtensions: [
    {
      point: 'dashboard-widget',
      component: 'HelloWidget',
      props: { title: 'Hello, SigOps!' },
      order: 1,
    },
  ],
  async activate(ctx) {
    ctx.logger.info('hello-plugin activated');
    ctx.emitEvent('hello-plugin:activated', { at: Date.now() });
  },
});

/** Exposed for tests — returns how many tool executions have been observed. */
export function getToolExecutionCount(): number {
  return toolExecutions;
}

export default helloPlugin;
