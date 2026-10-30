# Recipes

A Next.js recipe site with localized recipe content, recipe validation tooling, shopping-list helpers, and a workspace CLI for creating and validating recipes.

## Requirements

- Node.js 24.x LTS
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
- Vercel uses `corepack pnpm install --frozen-lockfile` so deployments use the pinned pnpm version instead of falling back to npm.
- `minimumReleaseAge: 10080` requires dependency versions to be at least 7 days old before resolution.
- `strictDepBuilds: true` fails installs when a dependency has an unreviewed install script.
- `allowBuilds` explicitly approves the current dependencies that need install-time native builds.
- Dependabot uses a 7-day cooldown for dependency and GitHub Actions updates.
- CI runs lint, type checks, tests, coverage, builds, recipe validation, OSV Scanner, OSSF Scorecard, zizmor, and CodeQL.

When pnpm reports a new dependency with an ignored build, review it before adding it to `allowBuilds` with `true` or `false`.

## License

Original recipe text and photographs by Niek Palm in `content/recipes/` are
licensed under [Creative Commons Attribution-NonCommercial 4.0 International
(CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/), except where
otherwise noted. You may share and adapt this content for noncommercial purposes
with appropriate credit, a link to the license, and an indication of any changes.

See [LICENSE.md](LICENSE.md) for the scope, exclusions, and attribution guidance,
and [LICENSES/CC-BY-NC-4.0.txt](LICENSES/CC-BY-NC-4.0.txt) for the full license text.
This content license does not cover the application or CLI code; code licensing
remains unchanged. Third-party material retains its own terms.
