/** Options for the login command */
export interface LoginOptions {
  apiKey?: string;
  endpoint?: string;
}

/** Result of a login operation */
export interface LoginResult {
  success: boolean;
  message: string;
  endpoint: string;
}

/** Stored authentication configuration */
export interface AuthConfig {
  apiKey: string;
  endpoint: string;
  createdAt: string;
}

/** Default API endpoint */
const DEFAULT_ENDPOINT = 'https://api.sigops.io';

/** API key prefix */
const API_KEY_PREFIX = 'sk_sigops_';

/** Minimum length of the key portion after the prefix */
const MIN_KEY_LENGTH = 32;

/**
 * LoginCommand handles API key authentication.
 * All methods are pure functions with no network or filesystem access.
 */
export class LoginCommand {
  /**
   * Validate an API key format.
   * Must start with "sk_sigops_" followed by 32+ alphanumeric characters.
   */
  static validateApiKey(key: string): { valid: boolean; error?: string } {
    if (!key || key.trim().length === 0) {
      return { valid: false, error: 'API key cannot be empty' };
    }

    if (!key.startsWith(API_KEY_PREFIX)) {
      return { valid: false, error: `API key must start with "${API_KEY_PREFIX}"` };
    }

    const keyPart = key.slice(API_KEY_PREFIX.length);

    if (keyPart.length < MIN_KEY_LENGTH) {
      return {
        valid: false,
        error: `API key is too short (need ${MIN_KEY_LENGTH}+ characters after prefix)`,
      };
    }

    if (!/^[a-zA-Z0-9]+$/.test(keyPart)) {
      return { valid: false, error: 'API key contains invalid characters (must be alphanumeric)' };
    }

    return { valid: true };
  }

  /**
   * Build an auth config object from login options.
   * Uses defaults for missing values.
   */
  static buildAuthConfig(options: LoginOptions): AuthConfig {
    return {
      apiKey: options.apiKey ?? '',
      endpoint: options.endpoint ?? DEFAULT_ENDPOINT,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Mask an API key for display.
   * Shows the prefix and last 4 characters, masks the rest.
   */
  static maskApiKey(key: string): string {
    if (key.length <= API_KEY_PREFIX.length + 4) {
      return key;
    }

    const prefix = key.slice(0, API_KEY_PREFIX.length);
    const suffix = key.slice(-4);
    const maskedLength = key.length - API_KEY_PREFIX.length - 4;
    return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
  }
}
