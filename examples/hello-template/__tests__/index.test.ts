import { describe, it, expect } from 'vitest';
import { helloTemplate } from '../src/index.js';

describe('hello-template example', () => {
  it('is a valid TemplateDefinition', () => {
    expect(helloTemplate.name).toBe('hello-template');
    expect(helloTemplate.category).toBe('monitoring');
    expect(typeof helloTemplate.render).toBe('function');
  });

  it('renders SEL for the default example', () => {
    const out = helloTemplate.render({
      target: 'api.example.com',
      severity: 'low',
    });
    expect(out).toContain('monitor "hello-api.example.com"');
    expect(out).toContain('alert "hello-api.example.com-down"');
    expect(out).toContain('severity: low');
  });

  it('uses the provided recipient when given', () => {
    const out = helloTemplate.render({
      target: 'db',
      severity: 'high',
      recipient: 'oncall@example.com',
    });
    expect(out).toContain('notify: "oncall@example.com"');
    expect(out).toContain('severity: high');
  });
});
