import { describe, it, expect } from 'vitest';
import { TemplateCommand } from '../src/commands/template.js';

describe('TemplateCommand', () => {
  const samplePlaybook = `- name: Check CPU
  type: monitor
  config:
    threshold: 90
    interval: 5m

- name: Alert Team
  type: alert
  config:
    channel: ops
    severity: high`;

  it('parsePlaybook extracts steps', () => {
    const { steps, errors } = TemplateCommand.parsePlaybook(samplePlaybook);
    expect(errors).toHaveLength(0);
    expect(steps).toHaveLength(2);
    expect(steps[0].name).toBe('Check CPU');
    expect(steps[0].type).toBe('monitor');
    expect(steps[0].config.threshold).toBe(90);
    expect(steps[1].name).toBe('Alert Team');
    expect(steps[1].type).toBe('alert');
    expect(steps[1].config.channel).toBe('ops');
  });

  it('parsePlaybook handles empty content', () => {
    const { steps, errors } = TemplateCommand.parsePlaybook('');
    expect(steps).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('empty');
  });

  it('generateTemplate produces code', () => {
    const steps = [
      { name: 'Check CPU', type: 'monitor', config: { threshold: 90 } },
      { name: 'Alert Team', type: 'alert', config: { channel: 'ops' } },
    ];
    const code = TemplateCommand.generateTemplate(steps, 'my-template');
    expect(code).toContain('defineTemplate');
    expect(code).toContain("name: 'my-template'");
    expect(code).toContain("name: 'Check CPU'");
    expect(code).toContain("name: 'Alert Team'");
    expect(code).toContain("type: 'monitor'");
  });

  it('fromPlaybook processes complete flow', () => {
    const result = TemplateCommand.fromPlaybook({
      action: 'from-playbook',
      playbookContent: samplePlaybook,
      outputName: 'cpu-alert',
    });
    expect(result.success).toBe(true);
    expect(result.templateCode).toBeDefined();
    expect(result.templateCode).toContain('defineTemplate');
    expect(result.templateCode).toContain("name: 'cpu-alert'");
  });

  it('parsePlaybook handles malformed input', () => {
    const malformed = `random text
no structure
just words`;
    const { steps, errors } = TemplateCommand.parsePlaybook(malformed);
    // No valid steps should be found from completely unstructured input
    expect(steps).toHaveLength(0);
  });
});
