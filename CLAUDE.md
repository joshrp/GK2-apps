# GK2 Apps

SvelteKit 3 / Svelte 5 (runes mode) app, statically exported with `adapter-static` and hosted on
GitHub Pages. TypeScript, Biome for lint/format, Vitest for tests.

## How we work

Development here is **guided, not hands-free**.

- Work in small steps and check in before moving on. Don't chain several features
  together or make design decisions on your own.
- If something looks off (failing checks, unexpected output, a choice the request doesn't
  settle, scope creep), stop and ask rather than working around it.
- Work directly on `main`. Don't create branches or worktrees unless asked (rare exceptions).
- One train of work at a time: no parallel tasks, side sessions or background subagents
  running alongside the main thread.
- Don't commit or push unless asked. Pushing to `main` deploys to GitHub Pages.

## Dev server

The dev server (`npm run dev`) is kept running by the user during development. Don't start,
restart or stop it.
Use the built-in browser to look at the running app at http://localhost:5173 (Vite's default;
ask if it's not there). Check the page and its console after UI changes.

## Before every commit

Run all three and make sure they pass. If any fail, report the output and check in before fixing
anything non-trivial:

```sh
npm run lint     # biome check (npm run lint:fix for formatting/auto-fixable issues)
npm run check    # svelte-check type checking
npm test         # vitest run
```

These are the same checks CI runs in `.github/workflows/deploy.yml` before deploying.

## Layout

- `src/routes/` – pages (`+page.svelte`, `+layout.svelte`, `+layout.ts`)
- `src/lib/` – shared code, imported via `#lib` / `#lib/*` (see `imports` in `package.json`)
- `src/**/*.{test,spec}.ts` – Vitest tests, next to the code they cover
- `static/` – static assets copied as-is
- `vite.config.ts` – SvelteKit config lives here (no `svelte.config.js`)

## Conventions

- Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`); no legacy `export let` or stores
  for component state.
- Static export only: no server routes or `+page.server.ts`. Links and asset paths must respect
  `base` from `$app/paths`, as the site is served from `/<repo-name>` on Pages (`BASE_PATH`).
- Formatting per `biome.json`: tabs, single quotes, no trailing commas, 100-char lines.

## Environment

The repo lives in WSL (Ubuntu) at `~/projects/gk2apps`. Run npm/git commands through WSL,
for example `wsl --cd ~/projects/gk2apps -e bash -ic 'npm run lint'` (`-i` is needed: npm is
only on the PATH in an interactive shell). For anything with nested quotes, write
a small script file and run it with `bash`, because PowerShell mangles quotes passed to `wsl`.
