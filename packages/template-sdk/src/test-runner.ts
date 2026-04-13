import type { TemplateDefinition, ParameterSchema, TestCase, TestResult, TestSuiteResult } from './types.js';

export class TestRunner<TParams extends ParameterSchema = ParameterSchema> {
  constructor(private template: TemplateDefinition<TParams>) {}

  /** Run a single test case */
  runTest(testCase: TestCase): TestResult {
    const start = performance.now();

    try {
      const parseResult = this.template.paramSchema.safeParse(testCase.params);

      if (testCase.shouldFail) {
        if (parseResult.success) {
          return {
            name: testCase.name,
            passed: false,
            error: 'Expected validation to fail, but it succeeded',
            duration: performance.now() - start,
          };
        }
        return {
          name: testCase.name,
          passed: true,
          duration: performance.now() - start,
        };
      }

      if (!parseResult.success) {
        const errors = parseResult.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        return {
          name: testCase.name,
          passed: false,
          error: `Validation failed: ${errors}`,
          duration: performance.now() - start,
        };
      }

      const output = this.template.render(parseResult.data);

      if (testCase.expected !== undefined) {
        if (typeof testCase.expected === 'string') {
          if (output !== testCase.expected) {
            return {
              name: testCase.name,
              passed: false,
              error: `Output mismatch.\nExpected: ${testCase.expected}\nActual: ${output}`,
              output,
              duration: performance.now() - start,
            };
          }
        } else if (testCase.expected instanceof RegExp) {
          if (!testCase.expected.test(output)) {
            return {
              name: testCase.name,
              passed: false,
              error: `Output did not match pattern: ${testCase.expected}`,
              output,
              duration: performance.now() - start,
            };
          }
        }
      }

      return {
        name: testCase.name,
        passed: true,
        output,
        duration: performance.now() - start,
      };
    } catch (err: any) {
      return {
        name: testCase.name,
        passed: false,
        error: err.message ?? 'Unknown error',
        duration: performance.now() - start,
      };
    }
  }

  /** Run multiple test cases */
  runTests(testCases: TestCase[]): TestSuiteResult {
    const start = performance.now();
    const results = testCases.map((tc) => this.runTest(tc));
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    return {
      total: results.length,
      passed,
      failed,
      results,
      duration: performance.now() - start,
    };
  }

  /** Auto-generate test cases from examples */
  runExamples(): TestSuiteResult {
    if (!this.template.examples || this.template.examples.length === 0) {
      return {
        total: 0,
        passed: 0,
        failed: 0,
        results: [],
        duration: 0,
      };
    }

    const testCases: TestCase[] = this.template.examples.map((example) => ({
      name: example.name,
      params: example.params,
      expected: example.expectedOutput,
    }));

    return this.runTests(testCases);
  }

  /** Add custom assertion */
  runWithAssertion(
    params: Record<string, any>,
    assertion: (output: string) => boolean,
    name?: string,
  ): TestResult {
    const start = performance.now();

    try {
      const parseResult = this.template.paramSchema.safeParse(params);

      if (!parseResult.success) {
        const errors = parseResult.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        return {
          name: name ?? 'custom-assertion',
          passed: false,
          error: `Validation failed: ${errors}`,
          duration: performance.now() - start,
        };
      }

      const output = this.template.render(parseResult.data);
      const passed = assertion(output);

      return {
        name: name ?? 'custom-assertion',
        passed,
        output,
        error: passed ? undefined : 'Custom assertion failed',
        duration: performance.now() - start,
      };
    } catch (err: any) {
      return {
        name: name ?? 'custom-assertion',
        passed: false,
        error: err.message ?? 'Unknown error',
        duration: performance.now() - start,
      };
    }
  }
}
