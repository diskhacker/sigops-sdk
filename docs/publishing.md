# Publishing to the SigOps Marketplace

This guide covers how to publish your tools, templates, plugins, and connectors to the SigOps Marketplace — from configuration and validation through pricing and version management.

---

## `sigops.config.json`

Every publishable project must have a `sigops.config.json` at its root.

```json
{
  "name": "myorg.http-health-check",
  "type": "tool",
  "version": "1.0.0",
  "description": "Checks that an HTTP endpoint returns 2xx within the timeout",
  "author": {
    "name": "Your Name",
    "email": "you@example.com",
    "url": "https://example.com"
  },
  "license": "MIT",
  "keywords": ["http", "health", "monitoring"],
  "visibility": "public",
  "pricing": "free",
  "repository": "https://github.com/yourorg/http-health-check"
}
```

### Required fields

| Field | Description |
|-------|-------------|
| `name` | Namespaced identifier: `<org>.<package-name>`. Only `[a-z0-9-]` and one dot. |
| `type` | One of: `tool`, `template`, `plugin`, `connector` |
| `version` | Semver version string |
| `description` | Short description (< 200 characters) |

### Optional fields

| Field | Default | Description |
|-------|---------|-------------|
| `visibility` | `"public"` | `"public"` or `"private"` |
| `pricing` | `"free"` | See pricing models below |
| `license` | `"MIT"` | SPDX license identifier |
| `keywords` | `[]` | Up to 10 searchable keywords |
| `author` | `{}` | Author name, email, URL |
| `repository` | — | Source repo URL (shown on Marketplace page) |

---

## Validation Pipeline

Before publishing, the CLI runs 10 validation checks. Fix all errors before attempting to publish.

```bash
sigops-sdk validate .
```

### The 10 checks

| # | Check | Severity |
|---|-------|----------|
| 1 | `sigops.config.json` exists and is valid JSON | error |
| 2 | `name` matches pattern `<org>.<name>` with no uppercase | error |
| 3 | `type` is one of the 4 valid types | error |
| 4 | `version` is a valid semver string | error |
| 5 | `package.json` exists with `name`, `version`, `main` | error |
| 6 | `src/index.ts` (or `main` entry) exists | error |
| 7 | `__tests__/` directory exists | warning |
| 8 | At least one `.test.ts` file found | warning |
| 9 | All `.sel` files in the project parse without syntax errors | error |
| 10 | `description` is present and > 20 characters | warning |

Warnings do not block publishing but are shown as recommendations.

### Strict mode

Use `--strict` to treat warnings as errors:

```bash
sigops-sdk validate . --strict
```

---

## Authentication

Get your API key from https://app.sigops.io/settings/api-keys.

```bash
sigops-sdk login --key sk_live_XXXXXXXXXXXX
```

The key is stored in `~/.sigops/credentials`. To remove it:

```bash
rm ~/.sigops/credentials
```

---

## Publishing

### Basic publish

```bash
sigops-sdk publish .
```

This runs validation, packages your project, and uploads to the Marketplace.

### Dry run

Simulate the publish process without uploading:

```bash
sigops-sdk publish . --dry-run
```

### Private package

Publish as private (only accessible to your organization):

```bash
sigops-sdk publish . --private
```

### Custom registry

Publish to a self-hosted SigOps registry:

```bash
sigops-sdk publish . --registry https://registry.mycompany.com
```

---

## Review Process

### Private packages

Private packages are published instantly with no review. Only members of your organization can install them.

### Public free packages

Public free packages go through automated scanning (malware, license checks) and are typically available within 10 minutes.

### Public paid packages

Public paid packages require manual review by the SigOps team (usually 1–3 business days). Reviewers check:
- Code quality and documentation
- No obfuscated or malicious code
- Accurate description and screenshots
- Functional test suite

---

## Pricing Models

Set `pricing` in `sigops.config.json` to one of these 5 values:

| Value | Description |
|-------|-------------|
| `"free"` | Free forever, no payment required |
| `"freemium"` | Free tier with paid features (define tiers in Marketplace dashboard) |
| `"one-time"` | Single purchase price, set in dashboard |
| `"subscription"` | Monthly/annual recurring, set in dashboard |
| `"usage-based"` | Charged per invocation (set rate in dashboard) |

Revenue share for paid packages: **75% to creator, 25% to SigOps**.

Prices are set and updated in the Marketplace creator dashboard at https://app.sigops.io/creator.

---

## Creator Dashboard Features

Once published, manage your packages at https://app.sigops.io/creator:

- **Analytics** — installs, active users, invocation counts, revenue
- **Version management** — publish new versions, set a version as "latest", deprecate old versions
- **Customer list** — view who has installed/purchased your package
- **Support queue** — respond to user-filed issues
- **Payout settings** — connect Stripe for payouts (monthly, minimum $10)
- **Screenshots** — upload up to 8 screenshots for your Marketplace listing
- **Categories** — assign up to 3 Marketplace categories

---

## Version Management

### Publishing a new version

Update `version` in both `package.json` and `sigops.config.json`, then publish:

```bash
# Bump version
npm version patch   # or minor, major
# Update sigops.config.json version to match

sigops-sdk publish .
```

### Using changesets (recommended for monorepos)

```bash
pnpm changeset        # describe the change
pnpm changeset version # bump versions
pnpm publish -r --access public
```

### Deprecating a version

From the creator dashboard, mark a specific version as deprecated. Users on that version see a warning in the SigOps UI.

### Unpublishing

Unpublishing permanently removes a version from the Marketplace. You cannot re-publish the same `name@version`.

- Versions can be unpublished within 24 hours of publishing with no impact.
- After 24 hours, unpublishing is only allowed for security/legal reasons and requires contacting support.

To request unpublish: https://app.sigops.io/creator/support

---

## Best Practices

1. **Semantic versioning** — Use `MAJOR.MINOR.PATCH`. Breaking changes = major bump.
2. **Changelog** — Maintain a `CHANGELOG.md` so users understand what changed.
3. **Test coverage** — Aim for >90% coverage before publishing.
4. **Examples** — Include at least one working example in your README.
5. **Secrets documentation** — List every secret your tool reads (name + purpose) in README.
6. **Timeouts** — Set a realistic `timeout` on `defineTool` to prevent runaway executions.
