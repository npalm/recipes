# Security Policy

This document describes the security measures and workflows implemented in this repository.

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it by:

1. **Do not** create a public GitHub issue
2. Email the repository maintainer directly (see GitHub profile)
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## Automated Security Workflows

### GitHub Actions Security Analysis (zizmor)

**Workflow:** `.github/workflows/zizmor.yml`  
**Schedule:** On every push and pull request  
**Mode:** Pedantic (strictest security checks)

[zizmor](https://github.com/woodruffw/zizmor) analyzes GitHub Actions workflows for security issues:

- ✅ SHA-pinned actions (prevents supply chain attacks)
- ✅ Minimal permissions (principle of least privilege)
- ✅ No credential persistence in checkouts
- ✅ Concurrency controls (prevents resource exhaustion)
- ✅ Dependabot cooldown configuration (see below)

**View Results:** Check the "Security" tab or workflow runs

### OSSF Scorecard

**Workflow:** `.github/workflows/scorecard.yml`  
**Schedule:** Weekly on Mondays at 03:00 UTC  
**Permissions:** Minimal, with SARIF upload for GitHub Security tab

[OSSF Scorecard](https://github.com/ossf/scorecard) evaluates the repository against supply chain security best practices:

- Branch protection enforcement
- Dangerous workflow patterns
- Dependency update practices
- Code review requirements
- Token permissions
- Vulnerability disclosure

**View Results:** GitHub Security tab > Code scanning alerts

### Dependency Management (Dependabot)

**Configuration:** `.github/dependabot.yml`  
**Schedule:** Weekly on Mondays at 03:00 UTC  
**Ecosystems:** npm (main), npm (CLI tool), GitHub Actions

#### Security Features

1. **Cooldown Period (7 days)**
   - Prevents immediate updates to newly released dependencies
   - Provides time for regressions and vulnerabilities to be discovered
   - Reduces supply-chain risk from compromised packages

2. **Grouped Updates**
   - Development dependencies: Minor + patch updates grouped together
   - Production dependencies: Minor + patch updates grouped together
   - Reduces review burden while maintaining security

3. **PR Limits**
   - Main npm: Maximum 5 open PRs
   - CLI npm: Maximum 3 open PRs
   - GitHub Actions: Maximum 3 open PRs
   - Prevents overwhelming reviewers

4. **SHA-Pinned Actions**
   - All GitHub Actions are pinned to specific commit SHAs
   - Version tags maintained in comments for reference
   - Prevents malicious updates to action code

#### Why Cooldown Period?

The 7-day cooldown period means Dependabot will not update to a dependency version released in the last 7 days. This provides:

- **Stability:** Time for community to discover regressions
- **Security:** Time for compromised packages to be identified and removed
- **Peace of mind:** Reduces risk of zero-day vulnerabilities in dependencies

## CI/CD Security Practices

### Workflow Permissions

All workflows follow the principle of least privilege:

```yaml
permissions:
  contents: read  # Only read access by default
```

Individual jobs request additional permissions only when needed (e.g., SARIF upload for Scorecard).

### Action Pinning

All third-party GitHub Actions are pinned to commit SHAs rather than tags:

```yaml
# ✅ Good - pinned to SHA
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

# ❌ Bad - uses mutable tag
- uses: actions/checkout@v4
```

This prevents supply chain attacks where action maintainers could push malicious code to existing tags.

### Credential Handling

Checkouts are configured to not persist credentials:

```yaml
- uses: actions/checkout@sha
  with:
    persist-credentials: false
```

This prevents accidental credential leakage in subsequent workflow steps.

### Concurrency Controls

Workflows use concurrency groups to prevent resource exhaustion and unnecessary runs:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Development Security

### Pre-commit Hooks

**Tool:** Husky + lint-staged  
**Configuration:** `.husky/pre-commit`, `.lintstagedrc.js`

Pre-commit hooks automatically run security and quality checks:

- Recipe validation (prevents invalid content)
- TypeScript linting (catches potential bugs)
- Code formatting (consistent style)

**Bypass (use sparingly):**
```bash
git commit --no-verify
```

⚠️ **Note:** CI will still run all checks even if pre-commit is bypassed.

## Security Checklist for Contributors

Before submitting a pull request:

- [ ] No secrets or credentials in code
- [ ] Dependencies are up to date (`npm audit`)
- [ ] All CI checks passing
- [ ] Code reviewed for security issues
- [ ] New GitHub Actions are SHA-pinned
- [ ] New workflows have minimal permissions

## Security Tools Reference

- **[zizmor](https://github.com/woodruffw/zizmor)** - GitHub Actions security linter
- **[OSSF Scorecard](https://github.com/ossf/scorecard)** - Supply chain security assessment
- **[Dependabot](https://docs.github.com/en/code-security/dependabot)** - Automated dependency updates
- **[npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit)** - Vulnerability scanner for npm dependencies
- **[Husky](https://typicode.github.io/husky/)** - Git hooks for pre-commit checks

## Additional Resources

- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OSSF Best Practices](https://openssf.org/resources/best-practices/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)

## Version History

- **2026-01-20**: Initial security policy
  - Added zizmor workflow (pedantic mode)
  - Added OSSF Scorecard workflow
  - Configured Dependabot with 7-day cooldown
  - SHA-pinned all GitHub Actions
  - Implemented minimal permissions
