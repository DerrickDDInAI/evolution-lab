# Engineering and verification

The [README](../README.md#development) owns installation, build, database migration and preview commands; its [module map](../README.md#modules) owns architecture facts. [AGENTS.md](../AGENTS.md) owns development rules. This page explains check selection and limits.

## Routine checks

Run from the repository root with Node.js >=22.13 (setup reviewed with 22.22.3 and npm 10.9.8 on macOS). Use `npm run install:ci` on a fresh checkout; it preserves the repository's portable/managed execution-profile handling and lockfile. Do not reinstall dependencies merely for a documentation edit.

| Command | Evidence and limits |
| --- | --- |
| `npm run verify` | Runs `npm test` and `npm run typecheck`, stopping on failure. No browser, D1 or deployment validation. |
| `npm test` | Node tests transpile domain modules into ignored `.sites-runtime/tests/`. Covers movement, collision, contact, evolution, timing, privacy and reconciliation rules; transpilation alone is not type checking. |
| `node --test --test-name-pattern='visible contact' tests/arena.test.mjs` | Focused domain regression selection; choose the matching test name and confirm it actually ran. |
| `npm run typecheck` | TypeScript static checks, no incremental output. Excludes `examples/` per the existing config. |
| `npm run lint` | Existing ESLint rules; currently fails. See dated baseline in project state and separate existing findings from introduced ones. |
| `npm run build` | Framework/worker bundling through the existing execution-profile wrapper. Does not run database migrations or prove deployment/UX. |
| `npm run test:integration` | Ordered local HTTP/D1 checks described below. Requires a running prepared preview. |

Documentation-only changes need local-link/anchor review, source-backed facts, consistency and `git diff --check`. For code changes choose the relevant checks; do not describe a unit pass as a browser or production pass.

## Local integration checks

Use a disposable checkout with its own `.wrangler/state`, not a developer session whose training/scores matter. The fixtures alter shared arena JSON and insert run records; their cleanup disconnects test players but does not restore the database. Do not run concurrently with other fixture scripts, players or preview instances using that state.

1. Install and build using the README. Apply both SQL migrations in order to the fresh local database using the README's `--local` commands.
2. Start the preview from that same checkout: `npm run dev -- --port 5173 --hostname 127.0.0.1`.
3. In another terminal in that checkout, run `npm run test:integration`.

The runner defaults to `http://127.0.0.1:5173`, checks the HTTP loopback target before making requests, then runs these existing scripts in order, stopping at the first failure:

1. `tests/visible-contact.mjs`: unseen server overlap and validated visible contact.
2. `tests/contact-respawn.mjs`: contact confirmation, outside respawn and durable run data.
3. `tests/multiplayer.mjs` with `ARENA_TEST_DEATH=1`: concurrent clients, input validation, death/score commit and score restoration.
4. `tests/network-lag.mjs`: movement preservation across 750 ms delayed input packets.
5. `tests/motion-hunt.mjs`: mode isolation, collection/extraction, durable records, visible-contact cargo loss and rejoin.

For a different local port, set `ARENA_TEST_URL=http://127.0.0.1:PORT`. It must be the preview attached to this checkout's local database. The wrapper rejects external hosts before any fixture runs; invoking `multiplayer.mjs` directly does not provide that early protection. Never use a public URL for these tests.

These are HTTP checks and controlled SQLite fixtures, not rendered-browser tests, realistic network fault simulation, 12-player load testing or evidence of production D1 behavior.

## Experience review

For affected UI behavior, the builder (or named reviewer) walks the complete task: join safely, cross a door, move/sprint, observe a visible touch, confirm a stopped timer and outside respawn, rejoin and inspect saved scores. Check feedback and the next action during joining, disconnection, rejected/pending contact, session expiry and recovery. Use disposable data when simulating interruptions. Check keyboard focus, narrow/touch layouts and reduced motion where affected. Record build/revision, browser/device, expected/observed results and explicit gaps in the current handoff. A screenshot alone does not establish behavior.

## CI

As inspected on 2026-10-19, this checkout has no Git remote and no CI configuration. No provider has been selected and hosted CI is not operational. The portable CI entry point is `npm run install:ci` followed by `npm run verify` on Node.js >=22.13. This setup verified `verify` against the existing local dependencies, not a fresh remote install.

Once a repository host/provider is chosen, wire those commands into its CI and record the first actual run. Resolve the lint baseline before making lint a required gate. Keep D1 fixtures in a separate job with disposable state, build, migrations, preview readiness and sequential execution; keep publishing and live credentials separate from validation.

## Skills and tooling

Reviewed 2026-10-19: the session exposes OpenAI Docs and artifact/UI tools, but no Matt Pocock skills. Local `codex plugin marketplace list` did not list a Matt Pocock marketplace; `codex plugin list` did not show a local installation and could not fetch the remote catalog. Installed remote state is therefore not fully verified. No plugins or personal settings were changed.

For future tasks, recheck the active catalog and select the applicable method: research for a bounded evidence question, diagnosing-bugs for a regression, codebase-design for a module seam, tdd for behavior-first implementation, code-review for a fixed-baseline review, and writing-for-agents for guidance maintenance. Names and availability can change. These are optional routing suggestions, not claims that those skills ran here. If installation is explicitly requested, use the current [upstream instructions](https://github.com/mattpocock/skills), verify enabled/session-visible state and avoid duplicate plugin/manual installations.

## Workflow provenance

Applied at the user's request from `PROJECT_DEVELOPMENT_WORKFLOW.md`, version 2026-10-18, at `/Users/derrickvanfrausum/external-repos/shared_agents_skills/PROJECT_DEVELOPMENT_WORKFLOW.md`. The original remains outside this repository and is not required by new checkouts.

The [official Codex best-practices guide](https://learn.chatgpt.com/guides/best-practices), reviewed 2026-10-19, supports concise repository instructions, relevant context and explicit validation. Its recommendations are adapted here to the existing small game; optional integrations and automation are not prerequisites.
