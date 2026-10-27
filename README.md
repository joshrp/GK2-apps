# GK2 Apps

SvelteKit app, statically exported and hosted on GitHub Pages.

## Commands

```sh
npm install
npm run dev        # local dev server
npm run lint       # biome check (lint:fix to auto-fix)
npm run check      # svelte-check type checking
npm test           # vitest (test:watch for watch mode)
npm run export     # static build into ./build
npm run preview    # serve the built site locally
```

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which lints, type-checks, tests,
builds with `BASE_PATH=/<repo-name>` and publishes `./build` to GitHub Pages.

One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
