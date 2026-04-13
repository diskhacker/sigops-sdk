/** Options for the validate command */
export interface ValidateOptions {
  projectPath: string;
  strict?: boolean;
}

/** Result of validation */
export interface ValidateResult {
  valid: boolean;
  checks: ValidationCheck[];
  errors: string[];
  warnings: string[];
}

/** A single validation check */
export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * ValidateCommand validates a SigOps project structure and configuration.
 * All methods are pure functions operating on data.
 */
export class ValidateCommand {
  /**
   * Validate a package.json structure.
   * Checks for required and recommended fields.
   */
  static validatePackageJson(pkg: Record<string, any>): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Required: name
    checks.push({
      name: 'has-name',
      passed: Boolean(pkg.name),
      message: pkg.name ? 'Package has name field' : 'Package is missing name field',
      severity: 'error',
    });

    // Required: version
    checks.push({
      name: 'has-version',
      passed: Boolean(pkg.version),
      message: pkg.version ? 'Package has version field' : 'Package is missing version field',
      severity: 'error',
    });

    // Recommended: description
    checks.push({
      name: 'has-description',
      passed: Boolean(pkg.description),
      message: pkg.description
        ? 'Package has description field'
        : 'Package is missing description field',
      severity: 'warning',
    });

    // Required: main or types
    const hasEntry = Boolean(pkg.main || pkg.types);
    checks.push({
      name: 'has-entry',
      passed: hasEntry,
      message: hasEntry
        ? 'Package has main/types entry point'
        : 'Package is missing main/types entry point',
      severity: 'error',
    });

    // Recommended: test script
    const hasTestScript = Boolean(pkg.scripts?.test);
    checks.push({
      name: 'has-test-script',
      passed: hasTestScript,
      message: hasTestScript ? 'Package has test script' : 'Package is missing test script',
      severity: 'warning',
    });

    return checks;
  }

  /**
   * Validate project file structure.
   * Checks for required and recommended directories/files.
   */
  static validateStructure(files: string[]): ValidationCheck[] {
    const checks: ValidationCheck[] = [];
    const normalized = files.map((f) => f.replace(/\\/g, '/'));

    // Required: src directory
    const hasSrc = normalized.some((f) => f === 'src' || f.startsWith('src/'));
    checks.push({
      name: 'has-src',
      passed: hasSrc,
      message: hasSrc ? 'Project has src directory' : 'Project is missing src directory',
      severity: 'error',
    });

    // Recommended: tests directory
    const hasTests = normalized.some(
      (f) => f === '__tests__' || f.startsWith('__tests__/') || f.includes('.test.') || f.includes('.spec.'),
    );
    checks.push({
      name: 'has-tests',
      passed: hasTests,
      message: hasTests ? 'Project has tests' : 'Project is missing tests directory',
      severity: 'warning',
    });

    return checks;
  }

  /**
   * Run all validation checks and aggregate results.
   * In strict mode, warnings are elevated to errors.
   */
  static validate(
    pkg: Record<string, any>,
    files: string[],
    options?: { strict?: boolean },
  ): ValidateResult {
    const strict = options?.strict ?? false;

    let checks = [
      ...ValidateCommand.validatePackageJson(pkg),
      ...ValidateCommand.validateStructure(files),
    ];

    // In strict mode, elevate warnings to errors
    if (strict) {
      checks = checks.map((check) => ({
        ...check,
        severity: check.severity === 'warning' ? 'error' : check.severity,
      }));
    }

    const errors = checks
      .filter((c) => !c.passed && c.severity === 'error')
      .map((c) => c.message);

    const warnings = checks
      .filter((c) => !c.passed && c.severity === 'warning')
      .map((c) => c.message);

    return {
      valid: errors.length === 0,
      checks,
      errors,
      warnings,
    };
  }
}
