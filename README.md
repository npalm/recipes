# Recipes

A Next.js recipe site with localized recipe content, recipe validation tooling, shopping-list helpers, and a workspace CLI for creating and validating recipes.

## Requirements

- Node.js 24 or newer
- pnpm 11.2.2 through Corepack

Enable Corepack once on your machine:

```bash
corepack enable
```

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` - start the Next.js development server
- `pnpm build` - build the application
- `pnpm lint` - run ESLint
- `pnpm typecheck` - type-check the app and CLI workspace
- `pnpm test` - run unit tests
- `pnpm test:coverage` - run unit tests with coverage thresholds
- `pnpm lint:recipes` - build the CLI and validate recipe markdown
- `pnpm recipe validate content/recipes` - validate recipes directly
- `pnpm recipe:build` - build the workspace CLI

## Dependency Security

This repo is managed with pnpm 11 and a single `pnpm-lock.yaml`.

- `packageManager` pins pnpm to `11.2.2`.
- `minimumReleaseAge: 10080` requires dependency versions to be at least 7 days old before resolution.
- `strictDepBuilds: true` fails installs when a dependency has an unreviewed install script.
- `allowBuilds` explicitly approves the current dependencies that need install-time native builds.
- Dependabot uses a 7-day cooldown for dependency and GitHub Actions updates.
- CI runs lint, type checks, tests, coverage, builds, recipe validation, OSV Scanner, OSSF Scorecard, zizmor, and CodeQL.

When pnpm reports a new dependency with an ignored build, review it before adding it to `allowBuilds` with `true` or `false`.
