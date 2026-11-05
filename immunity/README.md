# Immunity

A multiplayer evolution experiment from **[EvoGoo](https://evogoo.com)**. Explore a living alien world while generations of sentinels adapt through play.

**[Play in your browser](https://evogoo.com)** · [Source code](https://github.com/DerrickDDInAI/evolution-lab) · [Report an issue](https://github.com/DerrickDDInAI/evolution-lab/issues)

## Play

Choose an expedition, enter a player name, and cross a passage from the safe shore into the arena.

| Mode | Your objective | What sentinels learn |
| --- | --- | --- |
| **Survival** | Stay alive as long as possible. | Pursue players, close distance, and avoid obstacles. |
| **Motion Hunt** | Collect a life-support seed and carry it through an exit. | Detect movement from recent positions, choose a target, and pursue it. |

Move with **WASD** or **arrow keys**; hold **Shift** to sprint. After stamina runs out, release Shift (or the touch Sprint button) before starting another sprint. Touch screens have movement and sprint controls. In the menu, walk to a circle, tap a mode sign, or use **Tab** to preview it. Read its explanation, then press **Enter** or tap the same sign again to play. Reaching a circle never starts a game automatically.


Other players are solid obstacles in both modes and on the shore. You can slide around them; player contact causes no damage or score penalty.

Stillness may help in Motion Hunt, but detection is experimental and physical contact remains dangerous. Capture returns you to the shore; successful extraction lets you keep moving. Each mode has separate training and records.

## How evolution works

Each arena has 24 sentinels. After 45 seconds of active simulation, selection and mutation produce the next generation. Training pauses when nobody is inside. Open **Adaptation** to inspect fitness, generations and Motion Hunt detection measurements.

This is a **NEAT-inspired** experiment, not a claim of consistently improving AI. Changing human opponents affect fitness, and higher fitness alone does not establish better performance. The game supports up to 12 players per arena. [Local load checks](docs/performance.md#repaired-local-results-2026-10-29) cover twelve players in each mode simultaneously; hosted, WAN and physical-device capacity remain unverified.

## Install

Requires **Node.js 22.13+** and npm. Clone the repository and install the locked dependencies:

```sh
git clone https://github.com/DerrickDDInAI/evolution-lab.git
cd evolution-lab/immunity
npm run install:ci
```

If you already have the repository, run `npm run install:ci` from `immunity/`. All commands below run from that folder. Cloudflare sign-in is only required for remote database operations and deployment.

## Run locally

### Initialize the local database

Build once to generate the local Worker configuration:

```sh
npm run build
```

For a **new, empty local database**, apply both schema files in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_high_carnage.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_messy_tombstone.sql
```

Local state persists in `.wrangler/state`. Initialize it once; do not reapply these table-creation files to an existing database or delete its state to fix a build. These commands use `--local` and do not alter production.

### Development with live rebuilds

After local database initialization:

```sh
npm run dev -- --port 5173 --hostname 127.0.0.1
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Edits rebuild automatically. Stop the server with Ctrl+C.

### Build and preview

To preview a production bundle locally:

```sh
npm run build
npm start -- --port 5173
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Preview does not rebuild on edits; stop it, build again and restart. It uses the local database and loads an existing ignored `.dev.vars` for local secrets. Keep that file out of Git.

The preview inspector is disabled by default for sustained runs. Opt in for debugging with `npm start -- --port 5173 --inspect`; `--inspector-port` selects its port. See [preview stability evidence](docs/performance.md#instability-repair-investigation-2026-10-29).

### Cloudflare production build

```sh
npm run cloudflare:build
```

This builds `dist/client/` and `dist/server/` using the real bindings in `wrangler.cloudflare.json`, without publishing. `npm run build` uses the existing local/Sites configuration instead. For ordinary local development and preview, use `npm run build` as shown above; changing build configurations can select a different local database.

## Checks

```sh
npm run verify     # Domain tests and TypeScript
npm run build      # Production bundle
npm run lint       # ESLint
```

Run `npm run test:integration` only against a **disposable local database** with a preview already running: the fixtures change arena state and create scores. See [test setup and coverage](docs/engineering.md#local-integration-checks).

## Save and restore models

Open **Models & admin** in the menu and choose a mode:

- **Export best model** downloads the best archived sentinel.
- **Export current generation** downloads all 24 active models and their evolution state.
- **Administrator** lets the owner sign in, select a JSON file, review compatibility and queue an import for the next generation. A backup is saved before the change, and queued imports can be cancelled.

Imports preserve player scores and prior history. Model files do not contain player identities or scores. They resume at a fresh generation rather than replaying an in-progress world. See [administrator setup and archive compatibility](docs/training-checkpoints.md).

## Project structure

| Folder | Purpose |
| --- | --- |
| `app/` | React interface and HTTP endpoints |
| `lib/` | Simulation, evolution, rendering, authentication and model archives |
| `db/`, `drizzle/` | Database schema and migrations |
| `public/immunity/` | Game artwork |
| `tests/` | Domain and isolated integration tests |
| `docs/` | Design, architecture and contributor references |

See [architecture and learning](docs/architecture.md) for controller inputs, fitness rules, networking and persistence. The client reports visible contacts, so this prototype is not a cheat-resistant competitive game. Anonymous records belong to the browser and domain where they were created; clearing browser storage creates a new identity.

## Contributing

Bug reports and focused improvements are welcome. Include the mode, browser/device, steps to reproduce, and expected versus observed behavior. Read [contributor guidance](AGENTS.md) before changing code. Keep credentials, local databases and player data out of commits and issue reports.

## Creator and contact

Created and maintained by **Derrick Van Frausum**.

- Business inquiries: [info@evogoo.com](mailto:info@evogoo.com)
- Contact and feedback: [contact@evogoo.com](mailto:contact@evogoo.com)

## Deploy to Cloudflare

Production runs on Worker **evogoo-immunity**, with the D1 database configured in `wrangler.cloudflare.json`. It serves [evogoo.com](https://evogoo.com), [www.evogoo.com](https://www.evogoo.com) and the [workers.dev address](https://evogoo-immunity.astrodd-apps.workers.dev).

### Publish an update

Authenticate with the Cloudflare account that owns the Worker, then check and deploy:

```sh
npx wrangler login
npx wrangler whoami
npm run verify
npm run lint
npm run cloudflare:deploy
```

`cloudflare:deploy` rebuilds with the Cloudflare bindings and publishes `dist/server/wrangler.json`, including assets and domain routes. It does not reset scores or trained populations and does not automatically apply database migrations. Do not deploy a default local/Sites build with its placeholder database ID.

### Set up a separate Cloudflare installation

For your own installation, update the Worker name, account ID, domain routes and D1 binding in `wrangler.cloudflare.json` to resources you own. Create a database with `npx wrangler d1 create YOUR_DATABASE_NAME` and copy its returned ID into the `DB` binding. Initialize that **new database** with:

```sh
npx wrangler d1 migrations apply DB --remote --config wrangler.cloudflare.json
```

The existing EvoGoo production database is already initialized; this setup step is not needed for routine code updates. Review future migrations before applying them remotely. If custom-domain deployment reports conflicting DNS records, preserve a copy and remove only the old web A/AAAA/CNAME records for the affected hostnames; preserve mail and verification records. The explicit `www.evogoo.com/*` route is required for the current installation to override the former host's routing.

Administrator imports and resets require the `IMMUNITY_ADMIN_PASSWORD_HASH` Worker secret. Run `npm run admin:password` to generate a hash in ignored `.dev.vars`. Copy only its `IMMUNITY_ADMIN_PASSWORD_HASH` value (without the surrounding quotes), then paste it into the interactive Cloudflare secret prompt:

```sh
npx wrangler secret put IMMUNITY_ADMIN_PASSWORD_HASH --config wrangler.cloudflare.json
```

See [administrator setup](docs/training-checkpoints.md) for the hash format. Never commit passwords, secret values, local databases or `.dev.vars`.

The 2026-11-05 migration started with a fresh database by the owner's choice; historical Sites scores and learned populations were not copied. The original `.openai/hosting.json` identity and hosting adapter remain preserved. See [project state](docs/project-state.md#direct-cloudflare-migration--2026-11-05) for migration evidence and verification limits.
