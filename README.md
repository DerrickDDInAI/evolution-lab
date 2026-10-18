# Pursuit Lab

A standalone multiplayer survival game inspired by Enter the Pygame. Up to 12 human players share a 6,000 × 6,000 world with 24 evolving bots. This repository has its own Git history and does not depend on the Python project.

Live game: https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site/

## Play

Choose a name and press Play. Move with WASD or arrows; hold Shift to sprint. Phones have a movement pad and Sprint button. Players join outside the arena. Crossing a door starts a survival timer, and a validated bot touch ends the run and returns the player outside. Best and recent times, including the killer generation, are saved for the browser's anonymous identity.

Every 45 seconds of active simulation, a new generation returns to the same central starting points. Bots are gray and harmless for at least three seconds. A spawn stays harmless while a player is within 120 world units. Training pauses when nobody is inside.

The arena takes priority in the interface. Training metrics, fitness history, and champion export are available from **Training details**. The small top-center timer shows the current generation and time to the next one.

## Development

Requires Node.js 22.13 or later. The local preview uses Cloudflare D1; no Python installation is required.

```sh
npm run install:ci
npm run build
```

Apply the SQL files in `drizzle/` in order once for a fresh local database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_high_carnage.sql
```

Then apply `drizzle/0001_messy_tombstone.sql` with the same command. Start the preview with `npm run dev -- --port 5173 --hostname 127.0.0.1`.

```sh
npm test
npm run typecheck
```

With the local preview running, run these integration tests **sequentially** because they stage controlled fixtures in the same local database:

```sh
node tests/visible-contact.mjs
node tests/contact-respawn.mjs
ARENA_TEST_DEATH=1 node tests/multiplayer.mjs
node tests/network-lag.mjs
```

Fixture scripts refuse non-loopback URLs. Never reset production data for testing. `.wrangler/`, `.sites-runtime/`, dependencies, credentials, and preview screenshots are ignored. The hosting identity in `.openai/hosting.json` belongs to the existing public Site; preserve it when publishing updates.

## Movement and collision timing

`lib/physics.ts` supplies the same swept-circle collision, sliding, wall, and boundary rules to players, bots, remote prediction, and display corrections. Body radius and desired speed are actor parameters. The solver checks the whole movement segment, so a long frame cannot skip through a rock. Snapshots publish actual post-collision velocities.

Players predict their own movement at 60 Hz. The server replays sequenced commands with a time budget capped at three seconds; acknowledgements prevent duplicate movement and life counters reject inputs sent before a death. Bots simulate at 30 Hz. Remote actors extrapolate bounded movement and ease corrections without teleporting on ordinary packets. A generation transition starts each displayed bot at its fixed home, including when a late snapshot already places it farther away.

New clients negotiate `visible-v1` contact handling. A server overlap with an older player position is **not** a death: that was the source of unseen kills during delayed updates. The browser detects overlap using the exact positions drawn, then submits the contact to the server. Newly introduced bot tracks have 250 ms of visual exposure before contact is eligible. The server validates the issued frame, life, acknowledged input, obstacle clearance, bounded projection/correction and overlap. It then commits the death, score and outside respawn atomically. Reports are private, expire, and are idempotent. The recorded time ends at the validated contact rather than including network confirmation delay. Older tabs retain the previous collision protocol until refreshed or upgraded.

This is a casual training experiment, not a cheat-resistant competitive server. Visible-contact detection relies on the browser reporting contacts; modified clients could withhold reports. The server still validates submitted contacts and movement, owns bot evolution and durable scores, and keeps player identities private. A competitive version needs a persistent room server, synchronized input history and stronger replay verification.

Transport is serialized HTTP polling with a 60 ms interval plus network latency. It is not a WebSocket room. Smoothing removes position snaps, but cannot eliminate delayed information or connection outages. The 12-player cap is enforced; maximum-load performance is not established.

## Learning

Each bot runs a feed-forward network using target offsets, actor velocities, nearest-obstacle direction and clearance, distance, and bias. Outputs choose movement; pursuit is not scripted. Fitness rewards closing distance (+0.04/unit), contact (+50), and proximity, and penalizes obstacle contact (−3/second).

The best two genomes survive each generation. Compatibility groups share selection pressure; children inherit weights and mutate weights, connections, and hidden nodes. Historical split IDs align descendant topology. This TypeScript implementation is **NEAT-inspired**, not neat-python, and exported champions are not compatible with Python checkpoints. It omits full NEAT stagnation management and recurrent networks. Changing human opponents make fitness an uncontrolled training signal.

## Modules

- `lib/arena.ts`: world simulation, generations, private frame history, deaths and spawns.
- `lib/physics.ts`: shared movement and collision solver.
- `lib/evolution.ts`: neural activation, topology mutation, compatibility and breeding.
- `lib/net-motion.ts`: remote movement and bounded visual corrections.
- `lib/contact-report.ts`, `lib/contact-prediction.ts`: visible contact detection and server validation.
- `lib/renderer.ts`, `lib/collision-effects.ts`: arena, minimap and deduplicated impact animation; reduced-motion support.
- `app/use-arena.ts`: input, networking, prediction, reconciliation and score state.
- `app/page.tsx`, `app/globals.css`: game interface and responsive controls.
- `app/api/arena/route.ts`: sessions, D1 transactions, conflict retries and champion export.
- `db/schema.ts`, `drizzle/`: persistent arena and personal run records.

D1 compare-and-swap revisions serialize world updates. A unique commit marker guards score inserts in the same transaction, so failed retries cannot create duplicate scores. Session tokens stay in session storage and anonymous score identities in local storage; only hashes are persisted server-side. Clearing browser storage creates a new identity. Frame histories, identity hashes and private records are excluded from public world snapshots.
