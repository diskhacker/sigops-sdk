/** Options for the template command */
export interface TemplateCommandOptions {
  action: 'from-playbook';
  playbookContent: string;
  outputName?: string;
}

/** Result of a template command operation */
export interface TemplateCommandResult {
  success: boolean;
  templateCode?: string;
  errors?: string[];
}

/** A parsed playbook step */
export interface PlaybookStep {
  name: string;
  type: string;
  config: Record<string, any>;
}

/**
 * TemplateCommand handles template generation from playbooks.
 * All methods are pure functions with no external dependencies.
 */
export class TemplateCommand {
  /**
   * Parse a playbook YAML-like content into steps.
   * Handles a simple format with - name/type/config entries.
   */
  static parsePlaybook(content: string): { steps: PlaybookStep[]; errors: string[] } {
    const errors: string[] = [];
    const steps: PlaybookStep[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Playbook content is empty');
      return { steps, errors };
    }

    const lines = content.split('\n');
    let currentStep: Partial<PlaybookStep> | null = null;
    let currentConfigKey: string | null = null;
    let inConfig = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (trimmed.length === 0 || trimmed.startsWith('#')) {
        continue;
      }

      // New step starts with "- name:"
      const stepMatch = trimmed.match(/^-\s+name:\s*(.+)$/);
      if (stepMatch) {
        // Save previous step if exists
        if (currentStep) {
          if (currentStep.name && currentStep.type) {
            steps.push({
              name: currentStep.name,
              type: currentStep.type,
              config: currentStep.config ?? {},
            });
          } else {
            errors.push(`Step at line ${i + 1} is missing required fields (name, type)`);
          }
        }
        currentStep = { name: stepMatch[1].trim(), config: {} };
        inConfig = false;
        continue;
      }

      // Type field
      const typeMatch = trimmed.match(/^type:\s*(.+)$/);
      if (typeMatch && currentStep) {
        currentStep.type = typeMatch[1].trim();
        inConfig = false;
        continue;
      }

      // Config header
      if (trimmed === 'config:' && currentStep) {
        inConfig = true;
        continue;
      }

      // Config key-value pairs (indented under config)
      if (inConfig && currentStep) {
        const kvMatch = trimmed.match(/^(\w+):\s*(.+)$/);
        if (kvMatch) {
          if (!currentStep.config) {
            currentStep.config = {};
          }
          const value = kvMatch[2].trim();
          // Try to parse as number
          const numValue = Number(value);
          if (!isNaN(numValue) && value.length > 0 && !/[a-zA-Z]/.test(value)) {
            currentStep.config[kvMatch[1]] = numValue;
          } else {
            currentStep.config[kvMatch[1]] = value;
          }
          continue;
        }
      }
    }

    // Save last step
    if (currentStep) {
      if (currentStep.name && currentStep.type) {
        steps.push({
          name: currentStep.name,
          type: currentStep.type,
          config: currentStep.config ?? {},
        });
      } else if (currentStep.name) {
        errors.push(`Step "${currentStep.name}" is missing required type field`);
      }
    }

    return { steps, errors };
  }

  /**
   * Generate template code from playbook steps.
   * Produces a defineTemplate() call with the steps embedded.
   */
  static generateTemplate(steps: PlaybookStep[], outputName?: string): string {
    const name = outputName ?? 'generated-template';

    const stepsCode = steps
      .map((step) => {
        const configEntries = Object.entries(step.config)
          .map(([k, v]) => `      ${k}: ${typeof v === 'string' ? `'${v}'` : v},`)
          .join('\n');

        return `    {
      name: '${step.name}',
      type: '${step.type}',
      config: {
${configEntries}
      },
    }`;
      })
      .join(',\n');

    return `import { defineTemplate } from '@sigops/template-sdk';

export default defineTemplate({
  name: '${name}',
  description: 'Generated from playbook',
  steps: [
${stepsCode},
  ],
  async render(params) {
    return this.steps
      .map((step) => \`\${step.type} \${step.name} \${JSON.stringify(step.config)}\`)
      .join('\\n');
  },
});
`;
  }

  /**
   * Process a from-playbook command end-to-end.
   * Parses the playbook and generates template code.
   */
  static fromPlaybook(options: TemplateCommandOptions): TemplateCommandResult {
    const { steps, errors } = TemplateCommand.parsePlaybook(options.playbookContent);

    if (errors.length > 0 && steps.length === 0) {
      return {
        success: false,
        errors,
      };
    }

    if (steps.length === 0) {
      return {
        success: false,
        errors: ['No valid steps found in playbook'],
      };
    }

    const templateCode = TemplateCommand.generateTemplate(steps, options.outputName);

    return {
      success: true,
      templateCode,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
