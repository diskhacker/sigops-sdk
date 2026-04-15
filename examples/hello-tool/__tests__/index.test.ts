import { describe, it, expect } from 'vitest';
import { executeTool, mockContext } from '@sigops/tool-sdk';
import { helloTool } from '../src/index.js';

describe('hello-tool example', () => {
  it('is a valid ToolDefinition', () => {
    expect(helloTool.name).toBe('hello-tool');
    expect(helloTool.version).toBe('0.1.0');
    expect(typeof helloTool.execute).toBe('function');
  });

  it('echoes a message', async () => {
    const result = await executeTool(helloTool, { message: 'ping' }, mockContext());
    expect(result.success).toBe(true);
    expect(result.data?.echoed).toBe('ping');
    expect(result.data?.length).toBe(4);
  });

  it('respects the uppercase flag', async () => {
    const result = await executeTool(helloTool, { message: 'loud', uppercase: true }, mockContext());
    expect(result.success).toBe(true);
    expect(result.data?.echoed).toBe('LOUD');
  });

  it('rejects empty input at validation', async () => {
    const result = await executeTool(helloTool, { message: '' }, mockContext());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Input validation failed/);
  });
});
