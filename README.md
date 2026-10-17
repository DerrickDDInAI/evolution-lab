# Pursuit Lab

A public multiplayer website inspired by `../../run_game.py`, focused on its second objective: AI bots chase and touch humans. The Pygame application is unchanged.

## Play

Enter a callsign and join the shared arena. Use WASD or arrow keys to move, hold Shift to sprint, or use the touch controls. Zoom buttons reveal more of the 6,000 × 6,000 world. One bot touch kills an active runner, records the survival time and killer generation, and respawns the runner outside. Players start in the safe zone at the south door. Crossing any of the four doors starts the timer; active runs stay inside until death. Share the site URL to play with friends; up to 12 players share 24 bots.

## Training

Every bot runs its own feed-forward neural network. The server supplies signed target offsets, human and bot velocities, nearest-obstacle direction and clearance, target distance, and a bias. Network outputs control both movement axes. There is no scripted pursuit steering.

Fitness rewards distance closed by the bot (+0.04 per world unit) and human contact (+50), gives a small proximity reward, and penalizes obstacle contact (−3 per second). A dead runner respawns outside with a 1.2-second movement pause and a visible death notice. Bots stay inside the arena and cannot kill waiting players. The server records the exact killer generation before reproduction. Bots respawn near active humans at generation boundaries.

Every 45 seconds of simulated active play, the best two genomes survive. Compatibility groups share selection pressure. Children inherit matching connection weights from two parents and mutate weights, connections, and hidden nodes. Historical node split IDs align topology between descendants. This is a compact **NEAT-inspired TypeScript implementation**, not neat-python, and exported JSON is not compatible with neat-python checkpoints. It omits full NEAT stagnation management and recurrent networks. Training outcomes vary; fitness across changing human opponents is not a controlled benchmark.

The original project also contains evade and football objectives. This website implements chase & touch only.

## Shared world

The server owns movement, collisions, rewards, and evolution. Cloudflare D1 persists one arena row. Compare-and-swap revisions serialize concurrent updates across workers. Browsers immediately predict their own movement at 60 Hz using the same collision and movement code as the server. Sequenced input commands are acknowledged by the server, and only unacknowledged commands replay during reconciliation. Brief key taps are latched for one simulation step. Other players and bots extrapolate bounded movement between updates and blend corrections over time. Respawns and generation changes snap immediately. A server-time movement budget limits input spam; life counters discard delayed inputs after death. Authentication uses a random per-session token stored only in that tab; the server persists its SHA-256 hash and never sends hashes in world snapshots. Players expire after 15 seconds without a heartbeat; movement advances only through validated input commands. Training pauses without active runners inside the arena. Time since the previous update is capped at three seconds, so offline time is never replayed as training.

This is a small-session prototype using HTTP polling (one request at a time, a 60 ms delay between updates, shortened when input changes, plus network latency), not a WebSocket game server. The 12-player cap is enforced; maximum-load performance has not been established. For larger populations or latency-sensitive competitive play, move the same simulation module to a persistent authoritative room service with WebSockets.

## Development

Requires Node >=22.13.

1. Install with the Sites dependency helper or `npm run install:ci`.
2. Run `npm run build` to create local Worker configuration.
3. Apply each new migration once: `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_<generated-name>.sql`.
4. Run `npm run dev` and open the printed loopback URL.
5. Run `node --test tests/arena.test.mjs` for simulation/evolution checks and `npx tsc --noEmit` for type checks.

Hosted migrations are applied by Sites when publishing. Do not reset the production database to run tests.

## Modules

- `lib/evolution.ts`: network activation, topology mutation, compatibility groups, crossover.
- `lib/arena.ts`: deterministic world state, movement, collisions, rewards, and generations.
- `app/api/arena/route.ts`: durable shared arena, session validation, atomic updates, champion export.
- `lib/renderer.ts`: canvas world, camera and minimap.
- `app/page.tsx`: lobby, input, networking and live training dashboard.
- `db/schema.ts`: persistent arena schema.

## Survival records

A random anonymous identity secret stays in this browser's local storage. The server hashes it and stores completed runs in the indexed `runs` table. Best time and the ten latest runs are restored when joining again; the page displays the five latest (three on small screens). Records belong to that browser identity, with no account required. Clearing browser storage creates a new identity. Personal records and profile hashes are excluded from public arena snapshots.

Deaths and score inserts commit in one D1 transaction. A unique world commit marker guards each score insert, preventing scores from failed optimistic updates. Existing version-one worlds upgrade their geometry and player states while preserving learned bot genomes, generation number and training history.

Additional modules: `lib/physics.ts` shares movement and arena walls between browser and server; `lib/prediction.ts` replays unacknowledged movement; `app/use-arena.ts` handles frame updates, input buffering, networking and personal scores.

For the full local multiplayer/death persistence check, run `ARENA_TEST_DEATH=1 node tests/multiplayer.mjs`. Its controlled-contact fixture is restricted to the loopback preview and never targets production data.

## Lag handling

Player movement credit accumulates from elapsed server time up to three seconds, so an ordinary 600–800 ms production update does not discard valid movement. Clients keep up to six seconds of unacknowledged commands, sending at most three seconds per packet; sequence acknowledgements prevent duplicate movement. Minor display corrections ease out over 80 ms. The server simulates bots at 30 Hz and caches sorted neural activation plans during each request. Each normal update reads the shared world once, then commits its revision; concurrent writes retry from a fresh read.

Canvas bounds update through ResizeObserver instead of forcing a layout read each frame. Canvas pixel density is capped at 1.5 to reduce Retina fill cost. Network latency still depends on the hosting region and HTTP transport; these changes remove discarded-input rollbacks and reduce visible stutter rather than making network round trips instantaneous.

Run `node tests/network-lag.mjs` against the local preview for four successive 750 ms delayed input packets. The simulation suite also checks the latency budget, correction smoothing, continuous remote movement at 750 ms latency, and cached neural output equivalence.

## Collision animation

Lethal player/bot contacts publish a small authoritative impact event containing the contact point, bot, player and respawn point. Events expire after five seconds and are capped at 24. Clients deduplicate them, skip old events on page load, and discard completed effects after 1.25 seconds. The effect uses 16 particles, expanding rings, a short hit flash and a fading avatar silhouette. The caught player's camera holds at the impact for 500 ms before returning to the outside spawn, where a green pulse marks the return. Existing death timing, score writes and movement validation stay authoritative.

With reduced motion enabled, the camera stays with the player and moving particles and expanding rings are replaced by a brief static ring and gentle fade. Effects require no assets, dependencies, or additional network requests.


Local contact feedback is detected from the exact player and bot positions drawn each frame (`lib/contact-prediction.ts`). The impact and frozen timer appear immediately with a pending contact notice. The client sends that contact alongside its sequenced movement, retaining the stopped state across retries. It does not announce death or invent an outside respawn before server confirmation.

The server keeps up to eight recent private bot frames per player, expiring after eight seconds (`lib/contact-report.ts`). Reports must reference an issued frame, the current life, acknowledged movement, and an actual overlap consistent with bounded extrapolation and correction. This accepts a visible contact even when the bot has moved past it before the request arrives. Validated contact uses the same atomic death, score and outside-respawn transaction as server-detected contact. Retrying a report from an ended life cannot cause another death or score. Generation-boundary reports retain the observed killer generation without rewarding its replacement. Frame histories and identifiers are excluded from public snapshots.

Only a confirmed newer life resets the client to the outside spawn, discards old-life inputs and sets the chrono to zero. The chrono starts again only on a new door entry. A movement acknowledgement alone or a request timeout cannot resurrect a player. Invalid contact reports are explicitly rejected; they never display a confirmed death. Impact effects remain deduplicated by player/life. Held-key repeats after input clearing do not automatically restart movement.

Run `node tests/contact-respawn.mjs` against the local preview for the moving-bot regression, atomic score persistence, report retries and stale-life input checks. The simulation suite covers repeated deaths, fresh door entry, safe zones, invalid reports and generation changes. Browser QA with 750 ms delayed API replies verifies that a completed nonzero run respawns outside and the timer remains at zero after the death notice disappears.
