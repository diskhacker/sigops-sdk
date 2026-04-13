/** Runtime context provided to tool execute functions */
export interface ToolContext {
  /** Unique execution ID */
  executionId: string;
  /** Logger interface */
  logger: Logger;
  /** Key-value secrets store */
  secrets: SecretStore;
  /** Abort signal for cancellation */
  signal: AbortSignal;
  /** Environment variables */
  env: Record<string, string>;
  /** HTTP client for making requests */
  http: HttpClient;
  /** Emit a metric */
  emitMetric(name: string, value: number, tags?: Record<string, string>): void;
  /** Emit a status update */
  emitStatus(status: string, message?: string): void;
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface SecretStore {
  get(key: string): string | undefined;
  has(key: string): boolean;
}

export interface HttpClient {
  get(url: string, options?: RequestOptions): Promise<HttpResponse>;
  post(url: string, body: any, options?: RequestOptions): Promise<HttpResponse>;
  put(url: string, body: any, options?: RequestOptions): Promise<HttpResponse>;
  delete(url: string, options?: RequestOptions): Promise<HttpResponse>;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

/**
 * Creates a mock ToolContext for testing
 */
export function mockContext(overrides?: Partial<MockContextOptions>): ToolContext {
  const logs: LogEntry[] = [];
  const metrics: MetricEntry[] = [];
  const statuses: StatusEntry[] = [];
  const controller = new AbortController();

  const logger: Logger = {
    debug: (msg, ...args) => logs.push({ level: 'debug', message: msg, args }),
    info: (msg, ...args) => logs.push({ level: 'info', message: msg, args }),
    warn: (msg, ...args) => logs.push({ level: 'warn', message: msg, args }),
    error: (msg, ...args) => logs.push({ level: 'error', message: msg, args }),
  };

  const secrets: SecretStore = {
    get: (key) => overrides?.secrets?.[key],
    has: (key) => key in (overrides?.secrets ?? {}),
  };

  const httpResponses = overrides?.httpResponses ?? {};
  const httpCalls: HttpCallEntry[] = [];

  const makeHttpMethod = (method: string) => async (url: string, bodyOrOpts?: any, opts?: RequestOptions) => {
    const key = `${method.toUpperCase()} ${url}`;
    httpCalls.push({ method: method.toUpperCase(), url, body: opts ? bodyOrOpts : undefined });
    const response = httpResponses[key] ?? httpResponses[url] ?? { status: 200, headers: {}, body: null };
    return response;
  };

  const http: HttpClient = {
    get: makeHttpMethod('get') as any,
    post: makeHttpMethod('post'),
    put: makeHttpMethod('put'),
    delete: makeHttpMethod('delete') as any,
  };

  const ctx: ToolContext & MockContextInspector = {
    executionId: overrides?.executionId ?? `test-${Date.now()}`,
    logger,
    secrets,
    signal: controller.signal,
    env: overrides?.env ?? {},
    http,
    emitMetric: (name, value, tags) => metrics.push({ name, value, tags }),
    emitStatus: (status, message) => statuses.push({ status, message }),
    // Inspector methods
    getLogs: () => [...logs],
    getMetrics: () => [...metrics],
    getStatuses: () => [...statuses],
    getHttpCalls: () => [...httpCalls],
    abort: () => controller.abort(),
  };

  return ctx;
}

export interface MockContextOptions {
  executionId?: string;
  secrets?: Record<string, string>;
  env?: Record<string, string>;
  httpResponses?: Record<string, HttpResponse>;
}

export interface MockContextInspector {
  getLogs(): LogEntry[];
  getMetrics(): MetricEntry[];
  getStatuses(): StatusEntry[];
  getHttpCalls(): HttpCallEntry[];
  abort(): void;
}

export interface LogEntry {
  level: string;
  message: string;
  args: any[];
}

export interface MetricEntry {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

export interface StatusEntry {
  status: string;
  message?: string;
}

export interface HttpCallEntry {
  method: string;
  url: string;
  body?: any;
}
