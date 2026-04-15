/**
 * hello-vscode — installation notes + smoke test for @sigops/vscode-ext.
 *
 * The VS Code extension is distributed as a `.vsix` and installed into an
 * editor; there's nothing to run in a Node process. This file exists so the
 * example is a real TypeScript project that compiles, and so it can be
 * imported by tooling that wants a pointer to the install instructions.
 */

/** Path (relative to the repo root) of the VS Code extension source package. */
export const VSCODE_EXT_PATH = 'packages/vscode-ext';

/** The name under which the extension is published. */
export const VSCODE_EXT_NAME = '@sigops/vscode-ext';

/** Canonical install instructions for the SigOps VS Code extension. */
export const VSCODE_INSTALL_INSTRUCTIONS = `
Install the SigOps VS Code extension
====================================

Option A — from source (this repo):
  1. pnpm install
  2. pnpm --filter @sigops/vscode-ext build
  3. cd packages/vscode-ext && npx vsce package
  4. In VS Code: Extensions panel -> ... -> Install from VSIX -> pick the .vsix

Option B — once published to the VS Code Marketplace:
  1. Open VS Code.
  2. Extensions panel (Ctrl/Cmd+Shift+X).
  3. Search for "SigOps SEL" and click Install.

What you get
============
  - Syntax highlighting for *.sel files (TextMate grammar in syntaxes/).
  - LSP-backed autocomplete, hover, and diagnostics (via @sigops/sel-tools).
  - Formatter on save (calls format() from sel-tools).

Verify it works
===============
  Open any .sel file, e.g. examples/hello-sel/sample.sel, and confirm that:
    - keywords (monitor, alert, action, when) are coloured,
    - invalid syntax shows a red squiggle,
    - right-click -> Format Document re-indents the file.
`.trim();

/** Returns the install instructions as a single printable string. */
export function getVSCodeInstallInstructions(): string {
  return VSCODE_INSTALL_INSTRUCTIONS;
}

export default getVSCodeInstallInstructions;
