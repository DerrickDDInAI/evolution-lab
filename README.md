# Pursuit Lab

A public multiplayer website inspired by `../../run_game.py`, focused on its second objective: AI bots chase and touch humans. The Pygame application is unchanged.

## Play

Enter a callsign and join the shared arena. Use WASD or arrow keys to move, hold Shift to sprint, or use the touch controls. Zoom buttons reveal more of the 6,000 × 6,000 world. Touches never eliminate humans. Share the site URL to play with friends; up to 12 players share 24 bots.

## Training

Every bot runs its own feed-forward neural network. The server supplies signed target offsets, human and bot velocities, nearest-obstacle direction and clearance, target distance, and a bias. Network outputs control both movement axes. There is no scripted pursuit steering.

Fitness rewards distance closed by the bot (+0.04 per world unit) and human contact (+50), gives a small proximity reward, and penalizes obstacle contact (−3 per second). A 1.2-second grace period after a tag prevents repeated overlap rewards. Bots respawn near humans after tags and at generation boundaries.

Every 45 seconds of simulated active play, the best two genomes survive. Compatibility groups share selection pressure. Children inherit matching connection weights from two parents and mutate weights, connections, and hidden nodes. Historical node split IDs align topology between descendants. This is a compact **NEAT-inspired TypeScript implementation**, not neat-python, and exported JSON is not compatible with neat-python checkpoints. It omits full NEAT stagnation management and recurrent networks. Training outcomes vary; fitness across changing human opponents is not a controlled benchmark.

The original project also contains evade and football objectives. This website implements chase & touch only.

## Shared world

The server owns movement, collisions, rewards, and evolution. Cloudflare D1 persists one arena row. Compare-and-swap revisions serialize concurrent updates across workers. Browsers send normalized inputs and interpolate authoritative snapshots. Authentication uses a random per-session token stored only in that tab; the server persists its SHA-256 hash and never sends hashes in world snapshots. Players expire after 15 seconds without a heartbeat; movement stops after 750 ms without input. Training pauses without players. Time since the previous update is capped at 250 ms, so offline time is never replayed as training.

This is a small-session prototype using HTTP polling (one request at a time, approximately 6–8 updates per second before network latency), not a WebSocket game server. The 12-player cap is enforced; maximum-load performance has not been established. For larger populations or latency-sensitive competitive play, move the same simulation module to a persistent authoritative room service with WebSockets.

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
