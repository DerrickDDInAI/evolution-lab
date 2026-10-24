# Immunity

A standalone multiplayer survival game inspired by Enter the Pygame. Each mode supports up to 12 human players sharing a 6,000 × 6,000 world with 24 evolving bots. This repository has its own Git history and does not depend on the Python project.

Live game: https://pursuit-lab-derrick.amber-sugar-8860.chatgpt.site/

## Play

Choose **Survival** or **Motion Hunt** by moving the survivor into a glass floor circle in the Expedition Nursery with WASD/arrows. Stay in it for **850 ms**, or press **Enter** immediately. Click/touch a clearing to walk there; keyboard users can also focus its button and press Enter. Then choose a name and enter the shallows. Use **Change mode** to leave and return to the menu.

**Survival:** survive as long as possible. Move with WASD or arrows; hold Shift to sprint. Phones have a movement pad and Sprint button. Players join outside the arena. Crossing a door starts a survival timer, and a validated bot touch ends the run and returns the player outside. Best and recent times, including the killer generation, are saved for the browser's anonymous identity.

**Motion Hunt:** collect the life-support seed marked by a gold diamond at the central corridor, then reach any passage to extract. Each player collects their own seed. This experimental population learns movement detection from recent position samples. Stillness may help, but bots can make detection mistakes and continue moving. Physical contact remains lethal, including incidental contact. Capture loses the seed; extraction and capture return you outside. Records show successful/failed missions and the fastest successful extraction. Survival and Motion Hunt have separate arenas, populations, champions and scores.

Every 45 seconds of active simulation, a new generation returns to the same central starting points. Bots are closed pearl seeds and harmless for at least three seconds. A spawn stays harmless while a player is within 120 world units. Training pauses when nobody is inside.

The arena fills the screen inside each mode. Shell-like organs carry breath, field sense and run records; seven stamina lamellae also follow your survivor on the ground. The **Adaptation** organ always shows bot fitness and its recent evolution. Open it for best/average fitness, captures per active minute, live bot leaders, completed-generation results and champion export. Training observations are separate per mode and do not establish controlled improvement. The small generation organ shows time to the next generation. See [the living interface](docs/organic-interface.md).

## Development

This game lives in `immunity/` inside the Evolution Lab repository. Run the commands below from that directory (`cd immunity` from the repository root).

Contributor guidance: [AGENTS.md](AGENTS.md). Shared context and focused chat starters: [project wiki](docs/index.md). Verification scope and current gaps: [engineering](docs/engineering.md) and [project state](docs/project-state.md).

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
npm run verify
```

With a disposable local preview running, use the integration runner. It runs the existing tests **sequentially** because they stage controlled fixtures in the same local database. These fixtures change arena state and create scores; see [integration prerequisites and coverage](docs/engineering.md#local-integration-checks):

```sh
npm run test:integration
```

The integration runner rejects non-loopback URLs before running fixtures. Never reset production data for testing. `.wrangler/`, `.sites-runtime/`, dependencies, credentials, and preview screenshots are ignored. The hosting identity in `.openai/hosting.json` belongs to the existing public Site; preserve it when publishing updates.

## Movement and collision timing

`lib/physics.ts` supplies the same swept-circle collision, sliding, wall, and boundary rules to players, bots, remote prediction, and display corrections. Body radius and desired speed are actor parameters. The solver checks the whole movement segment, so a long frame cannot skip through a rock. Snapshots publish actual post-collision velocities.

Players predict their own movement at 60 Hz. The server replays sequenced commands with a time budget capped at three seconds; acknowledgements prevent duplicate movement and life counters reject inputs sent before a death. Bots simulate at 30 Hz. Remote actors extrapolate bounded movement and ease corrections without teleporting on ordinary packets. A generation transition starts each displayed bot at its fixed home, including when a late snapshot already places it farther away.

New clients negotiate `visible-v1` contact handling. A server overlap with an older player position is **not** a death: that was the source of unseen kills during delayed updates. The browser detects overlap using the exact positions drawn, then submits the contact to the server. Newly introduced bot tracks have 250 ms of visual exposure before contact is eligible. The server validates the issued frame, life, acknowledged input, obstacle clearance, bounded projection/correction and overlap. It then commits the death, score and outside respawn atomically. Reports are private, expire, and are idempotent. The recorded time ends at the validated contact rather than including network confirmation delay. Older tabs retain the previous collision protocol until refreshed or upgraded.

This is a casual training experiment, not a cheat-resistant competitive server. Visible-contact detection relies on the browser reporting contacts; modified clients could withhold reports. The server still validates submitted contacts and movement, owns bot evolution and durable scores, and keeps player identities private. A competitive version needs a persistent room server, synchronized input history and stronger replay verification.

Transport is serialized HTTP polling with a 60 ms interval plus network latency. It is not a WebSocket room. Smoothing removes position snaps, but cannot eliminate delayed information or connection outages. The 12-player cap is enforced; maximum-load performance is not established.

## Learning

Survival retains its feed-forward network using target offsets, actor velocities, nearest-obstacle direction and clearance, distance, and bias. Motion Hunt uses the experimental `motion-history-v1` controller: each bot evaluates every player from positions now, about 100 ms ago and about 200 ms ago, plus history coverage, obstacle direction/clearance and bias. Older samples are centered on the latest player position to remove absolute location and bot movement as distractions. The network receives no player velocity, speed or movement flag. Its third output chooses attention across candidates, with nonpositive attention selecting rest; the other two steer. There is no moving-player filter or forced halt when players stop. Samples are bounded, private, sampled simulation observations, not reconstructed continuous trajectories. See [the experiment](docs/motion-hunt.md#experimental-history-controller--2026-10-24).

Survival fitness rewards closing distance (+0.04/unit), contact (+50), and proximity, and penalizes obstacle contact (−3/second). Motion Hunt additionally rewards attention matching observed movement, penalizes attending to stationary players and movement cost, and gives stationary captures −25. Ground-truth post-collision speed (above 8 world units/second) is used by the training evaluator only. Moving-capture rewards still use private issued-frame observations across delayed contact reports. A one-time controller migration starts Motion Hunt at generation 1 with fresh networks and clears its old training records/pending imports; Survival and player records remain intact. Legacy Motion Hunt models are rejected because their observations differ. The fresh live population is not pretrained, and reliable detection or improved live hunting is not established.

The best two genomes survive each generation. Compatibility groups share selection pressure; children inherit weights and mutate weights, connections, and hidden nodes. Historical split IDs align descendant topology. This TypeScript implementation is **NEAT-inspired**, not neat-python, and exported champions are not compatible with Python checkpoints. It omits full NEAT stagnation management and recurrent networks. Changing human opponents make fitness an uncontrolled training signal.

## Modules

- `lib/game-mode.ts`, `app/mode-menu.tsx`: mode identity, objective constants and survivor-controlled selection.
- `lib/arena.ts`: world simulation, generations, private frame history, deaths and spawns.
- `lib/physics.ts`: shared movement and collision solver.
- `lib/training-metrics.ts`, `app/training-organ.tsx`: public training summaries, fitness trends and accessible details.
- `lib/evolution.ts`: neural activation, topology mutation, compatibility and breeding.
- `lib/motion-observation.ts`: bounded position histories and experimental attention/steering observations.
- `lib/net-motion.ts`: remote movement and bounded visual corrections.
- `lib/contact-report.ts`, `lib/contact-prediction.ts`: visible contact detection and server validation.
- `lib/renderer.ts`, `lib/collision-effects.ts`: arena and deduplicated impact animation; reduced-motion support.
- `app/use-arena.ts`: input, networking, prediction, reconciliation and score state.
- `app/page.tsx`, `app/globals.css`: game interface and responsive controls.
- `app/api/arena/route.ts`: sessions, D1 transactions, conflict retries and champion export.
- `db/schema.ts`, `drizzle/`: persistent arena and personal run records.

D1 compare-and-swap revisions serialize world updates. A unique commit marker guards score inserts in the same transaction, so failed retries cannot create duplicate scores. Session tokens stay in session storage and anonymous score identities in local storage; only hashes are persisted server-side. Clearing browser storage creates a new identity. Frame histories, identity hashes and private records are excluded from public world snapshots.

Motion Hunt uses the `motion` arena row; Survival retains `shared`. Mode-specific anonymous profile hashes separate records without a schema migration; `bot = -1` represents an extraction, and only successful extractions contribute to its fastest time. World transitions and run inserts share the existing atomic commit guard. See [Motion Hunt implementation and verification](docs/motion-hunt.md).

### Training archive and administrator access

Open Adaptation's training details to export the all-time best saved model or the latest full population checkpoint. Administrator imports are validated and queued for the next generation boundary; the previous population is backed up automatically and can be restored. Player scores and earlier history remain intact, with imports/rollbacks marked as training branches.

Set the host password locally with `npm run admin:password`; it uses a hidden prompt and stores only a hash in ignored `.dev.vars`. Production requires the corresponding server secret to be configured separately. See [Training archive](docs/training-checkpoints.md) for setup, compatibility, retention, security and testing limits.
