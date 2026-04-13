/** Options for the test command */
export interface TestOptions {
  projectPath: string;
  input?: Record<string, any>;
  params?: Record<string, any>;
  verbose?: boolean;
  watch?: boolean;
}

/** Result of test execution */
export interface TestCommandResult {
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  errors?: string[];
  duration: number;
}

/** Individual test result */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

/**
 * TestCommand handles running tests for a SigOps project.
 * All methods are pure functions that operate on data, not the filesystem.
 */
export class TestCommand {
  /**
   * Parse and validate test options from raw args.
   * Applies defaults for missing fields.
   */
  static parseOptions(args: Record<string, any>): TestOptions {
    return {
      projectPath: args.projectPath ?? args.path ?? '.',
      input: args.input,
      params: args.params,
      verbose: args.verbose ?? false,
      watch: args.watch ?? false,
    };
  }

  /**
   * Discover test files from a list of file paths.
   * Matches files in __tests__/ or files ending in .test.ts / .spec.ts.
   */
  static discoverTests(files: string[]): string[] {
    return files.filter((file) => {
      const normalized = file.replace(/\\/g, '/');
      return (
        normalized.includes('__tests__/') ||
        normalized.endsWith('.test.ts') ||
        normalized.endsWith('.spec.ts') ||
        normalized.endsWith('.test.js') ||
        normalized.endsWith('.spec.js')
      );
    });
  }

  /**
   * Create a test summary from individual test results.
   * Computes pass/fail counts and overall success.
   */
  static summarize(results: TestResult[]): TestCommandResult {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const errors = results
      .filter((r) => !r.passed && r.error)
      .map((r) => `${r.name}: ${r.error}`);

    return {
      success: failed === 0,
      total: results.length,
      passed,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      duration: 0,
    };
  }
}
