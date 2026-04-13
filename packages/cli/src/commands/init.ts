/** Project types supported by the init command */
export type ProjectType = 'tool' | 'template' | 'plugin' | 'connector';

/** Options for the init command */
export interface InitOptions {
  name: string;
  type: ProjectType;
  description?: string;
  author?: string;
}

/** Result of scaffold generation */
export interface InitResult {
  success: boolean;
  projectPath: string;
  files: GeneratedFile[];
  errors?: string[];
}

/** A generated file with path and content */
export interface GeneratedFile {
  path: string;
  content: string;
}

/**
 * InitCommand scaffolds a new tool/template/plugin/connector project.
 * All methods are pure functions with no filesystem side effects.
 */
export class InitCommand {
  /**
   * Generate scaffold files for a project (pure, no filesystem).
   * Returns all files that would be created with their content.
   */
  generateScaffold(options: InitOptions): InitResult {
    const nameValidation = InitCommand.validateName(options.name);
    if (!nameValidation.valid) {
      return {
        success: false,
        projectPath: options.name,
        files: [],
        errors: [nameValidation.error!],
      };
    }

    const files: GeneratedFile[] = [];
    const description = options.description ?? `A SigOps ${options.type}`;
    const author = options.author ?? '';

    // package.json
    files.push({
      path: 'package.json',
      content: generatePackageJson(options.name, options.type, description, author),
    });

    // tsconfig.json
    files.push({
      path: 'tsconfig.json',
      content: generateTsconfig(),
    });

    // src/index.ts
    files.push({
      path: 'src/index.ts',
      content: generateIndexTs(options.name, options.type),
    });

    // __tests__/index.test.ts
    files.push({
      path: '__tests__/index.test.ts',
      content: generateTestFile(options.name, options.type),
    });

    // README.md
    files.push({
      path: 'README.md',
      content: generateReadme(options.name, options.type, description),
    });

    return {
      success: true,
      projectPath: options.name,
      files,
    };
  }

  /**
   * Validate a project name.
   * Names must be lowercase, can contain hyphens and dots, no spaces or uppercase.
   */
  static validateName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Project name cannot be empty' };
    }
    if (name !== name.toLowerCase()) {
      return { valid: false, error: 'Project name must be lowercase' };
    }
    if (/\s/.test(name)) {
      return { valid: false, error: 'Project name cannot contain spaces' };
    }
    if (/[^a-z0-9\-._@/]/.test(name)) {
      return { valid: false, error: 'Project name contains invalid characters' };
    }
    return { valid: true };
  }

  /** Get available project types */
  static getProjectTypes(): ProjectType[] {
    return ['tool', 'template', 'plugin', 'connector'];
  }
}

function generatePackageJson(
  name: string,
  type: ProjectType,
  description: string,
  author: string,
): string {
  const deps: Record<string, string> = {};

  if (type === 'tool') {
    deps['@sigops/tool-sdk'] = 'workspace:*';
  } else if (type === 'template') {
    deps['@sigops/template-sdk'] = 'workspace:*';
  } else if (type === 'plugin') {
    deps['@sigops/plugin-sdk'] = 'workspace:*';
  }

  const pkg: Record<string, any> = {
    name,
    version: '0.1.0',
    description,
    type: 'module',
    main: './src/index.ts',
    types: './src/index.ts',
    scripts: {
      build: 'tsc',
      test: 'vitest run',
    },
    license: 'MIT',
  };

  if (author) {
    pkg.author = author;
  }

  if (Object.keys(deps).length > 0) {
    pkg.dependencies = deps;
  }

  return JSON.stringify(pkg, null, 2) + '\n';
}

function generateTsconfig(): string {
  return JSON.stringify(
    {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src/**/*.ts'],
      exclude: ['__tests__', 'dist'],
    },
    null,
    2,
  ) + '\n';
}

function generateIndexTs(name: string, type: ProjectType): string {
  switch (type) {
    case 'tool':
      return `import { defineTool } from '@sigops/tool-sdk';

export default defineTool({
  name: '${name}',
  description: 'TODO: describe your tool',
  input: {
    // Define your input schema
  },
  output: {
    // Define your output schema
  },
  async execute(input, context) {
    // Implement your tool logic
    return { success: true };
  },
});
`;
    case 'template':
      return `import { defineTemplate } from '@sigops/template-sdk';

export default defineTemplate({
  name: '${name}',
  description: 'TODO: describe your template',
  parameters: {
    // Define your parameters
  },
  async render(params) {
    // Generate SEL output
    return \`monitor \${params.target || 'default'} {
  // Generated monitoring logic
}\`;
  },
});
`;
    case 'plugin':
      return `import { definePlugin } from '@sigops/plugin-sdk';

export default definePlugin({
  name: '${name}',
  description: 'TODO: describe your plugin',
  hooks: {
    // Register your hook handlers
  },
  async activate(context) {
    // Plugin activation logic
    console.log('${name} activated');
  },
});
`;
    case 'connector':
      return `/**
 * ${name} connector
 * Connects to an external service or data source.
 */
export interface ConnectorConfig {
  endpoint: string;
  apiKey?: string;
  timeout?: number;
}

export interface ConnectorResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class Connector {
  private config: ConnectorConfig;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  /** Test the connection */
  async ping(): Promise<boolean> {
    // Implement connection test
    return true;
  }

  /** Execute a query */
  async query(input: Record<string, unknown>): Promise<ConnectorResult> {
    // Implement query logic
    return { success: true, data: {} };
  }
}

export default Connector;
`;
  }
}

function generateTestFile(name: string, type: ProjectType): string {
  switch (type) {
    case 'tool':
      return `import { describe, it, expect } from 'vitest';

describe('${name}', () => {
  it('should be defined', () => {
    // TODO: import and test your tool
    expect(true).toBe(true);
  });
});
`;
    case 'template':
      return `import { describe, it, expect } from 'vitest';

describe('${name}', () => {
  it('should be defined', () => {
    // TODO: import and test your template
    expect(true).toBe(true);
  });
});
`;
    case 'plugin':
      return `import { describe, it, expect } from 'vitest';

describe('${name}', () => {
  it('should be defined', () => {
    // TODO: import and test your plugin
    expect(true).toBe(true);
  });
});
`;
    case 'connector':
      return `import { describe, it, expect } from 'vitest';

describe('${name}', () => {
  it('should be defined', () => {
    // TODO: import and test your connector
    expect(true).toBe(true);
  });
});
`;
  }
}

function generateReadme(name: string, type: ProjectType, description: string): string {
  return `# ${name}

${description}

## Type

SigOps ${type}

## Getting Started

\`\`\`bash
pnpm install
pnpm test
\`\`\`

## Usage

\`\`\`typescript
import ${type === 'connector' ? '{ Connector }' : 'definition'} from '${name}';
\`\`\`

## License

MIT
`;
}
