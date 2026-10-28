# Immunity

A multiplayer evolution experiment from **[EvoGoo](https://evogoo.com)**. Explore a living alien world while generations of sentinels adapt through play.

**[Play in your browser](https://evogoo.com)** · [Source code](https://github.com/DerrickDDInAI/evolution-lab) · [Report an issue](https://github.com/DerrickDDInAI/evolution-lab/issues)

## Play

Choose an expedition, enter a player name, and cross a passage from the safe shore into the arena.

| Mode | Your objective | What sentinels learn |
| --- | --- | --- |
| **Survival** | Stay alive as long as possible. | Pursue players, close distance, and avoid obstacles. |
| **Motion Hunt** | Collect a life-support seed and carry it through an exit. | Detect movement from recent positions, choose a target, and pursue it. |

Move with **WASD** or **arrow keys**; hold **Shift** to sprint. Touch screens have movement and sprint controls. In the menu, walk to a circle, tap a mode sign, or use **Tab** to preview it. Read its explanation, then press **Enter** or tap the same sign again to play. Reaching a circle never starts a game automatically.

Stillness may help in Motion Hunt, but detection is experimental and physical contact remains dangerous. Capture returns you to the shore; successful extraction lets you keep moving. Each mode has separate training and records.

## How evolution works

Each arena has 24 sentinels. After 45 seconds of active simulation, selection and mutation produce the next generation. Training pauses when nobody is inside. Open **Adaptation** to inspect fitness, generations and Motion Hunt detection measurements.

This is a **NEAT-inspired** experiment, not a claim of consistently improving AI. Changing human opponents affect fitness, and higher fitness alone does not establish better performance. The game supports up to 12 players per arena; maximum-load performance is still unverified.

## Run locally

Requires **Node.js 22.13+** and npm. From the repository root:

```sh
cd immunity
npm run install:ci
npm run build
```

Initialize a fresh local database by applying both migrations in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_high_carnage.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_messy_tombstone.sql
npm start -- --port 5173
```

Open **http://127.0.0.1:5173**. For development with live rebuilds, use `npm run dev -- --port 5173 --hostname 127.0.0.1` instead of `npm start`.

## Checks

```sh
npm run verify     # Domain tests and TypeScript
npm run build      # Production bundle
npm run lint       # Existing lint debt is tracked separately
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
