/** Options for the publish command */
export interface PublishOptions {
  projectPath: string;
  private?: boolean;
  dryRun?: boolean;
  registry?: string;
}

/** Result of publish operation */
export interface PublishResult {
  success: boolean;
  packageName: string;
  version: string;
  registry: string;
  errors?: string[];
}

/** Default npm registry URL */
const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

/**
 * PublishCommand handles publishing logic for SigOps packages.
 * All methods are pure functions operating on data.
 */
export class PublishCommand {
  /**
   * Run pre-publish validation checks.
   * Ensures the package is ready to be published.
   */
  static prePublishChecks(
    pkg: Record<string, any>,
    files: string[],
  ): { ready: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!pkg.name) {
      issues.push('Package is missing name field');
    }

    if (!pkg.version) {
      issues.push('Package is missing version field');
    }

    if (!pkg.description) {
      issues.push('Package is missing description field');
    }

    if (!pkg.main && !pkg.types) {
      issues.push('Package is missing main/types entry point');
    }

    const normalized = files.map((f) => f.replace(/\\/g, '/'));
    const hasSrc = normalized.some((f) => f === 'src' || f.startsWith('src/'));
    if (!hasSrc) {
      issues.push('Project is missing src directory');
    }

    return {
      ready: issues.length === 0,
      issues,
    };
  }

  /**
   * Build a publish manifest from package.json and options.
   * Returns the result that would be produced by publishing.
   */
  static buildManifest(
    pkg: Record<string, any>,
    options: PublishOptions,
  ): PublishResult {
    const errors: string[] = [];

    if (!pkg.name) {
      errors.push('Package name is required');
    }
    if (!pkg.version) {
      errors.push('Package version is required');
    }

    const registry = options.registry ?? DEFAULT_REGISTRY;

    return {
      success: errors.length === 0,
      packageName: pkg.name ?? '',
      version: pkg.version ?? '0.0.0',
      registry,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
