# Immunity architecture and learning

Implementation reference for contributors. For setup and play instructions, see the [game README](../README.md).

## Movement and collision timing

`lib/physics.ts` supplies the same swept-circle collision, sliding, wall, and boundary rules to players, bots, remote prediction, and display corrections. Body radius and desired speed are actor parameters. The solver checks the whole movement segment, so a long frame cannot skip through a rock. Snapshots publish actual post-collision velocities.

Survivors have radius 16. `playerObstacles` adds every other player as a stationary circular obstacle for authoritative command replay, local prediction/reconciliation, display corrections and remote survivor extrapolation. Both modes and the shore use this rule. Contact stops or slides the mover without pushing, damage, capture events or score changes. Join and death-respawn placement resolve occupied positions. Sentinels retain their existing pursuit/contact rules. HTTP snapshots can differ from current remote positions during latency; this does not provide simultaneous lockstep physics.

Players predict their own movement at 60 Hz. The server replays sequenced commands with a time budget capped at three seconds; acknowledgements prevent duplicate movement and life counters reject inputs sent before a death. Bots simulate at 30 Hz. Remote actors extrapolate bounded movement and ease corrections without teleporting on ordinary packets. A generation transition starts each displayed bot at its fixed home, including when a late snapshot already places it farther away.

New clients negotiate `visible-v1` contact handling. A server overlap with an older player position is **not** a death: that was the source of unseen kills during delayed updates. The browser detects overlap using the exact positions drawn, then submits the contact to the server. Newly introduced bot tracks have 250 ms of visual exposure before contact is eligible. The server validates the issued frame, life, acknowledged input, obstacle clearance, bounded projection/correction and overlap. It then commits the death, score and outside respawn atomically. Reports are private, expire, and are idempotent. The recorded time ends at the validated contact rather than including network confirmation delay. Older tabs retain the previous collision protocol until refreshed or upgraded.

This is a casual training experiment, not a cheat-resistant competitive server. Visible-contact detection relies on the browser reporting contacts; modified clients could withhold reports. The server still validates submitted contacts and movement, owns bot evolution and durable scores, and keeps player identities private. A competitive version needs a persistent room server, synchronized input history and stronger replay verification.

Transport is serialized HTTP polling with a 60 ms interval plus network latency. It is not a WebSocket room. Smoothing removes position snaps, but cannot eliminate delayed information or connection outages. The 12-player cap is enforced; [local load evidence](performance.md#repaired-local-results-2026-10-29) covers both modes at that cap. Hosted, WAN and physical-device limits remain unverified.

## Learning

Survival retains its feed-forward network using target offsets, actor velocities, nearest-obstacle direction and clearance, distance, and bias. Motion Hunt uses the experimental `motion-history-v1` controller: each bot evaluates every player from positions now, about 100 ms ago and about 200 ms ago, plus history coverage, obstacle direction/clearance and bias. Older samples are centered on the latest player position to remove absolute location and bot movement as distractions. The network receives no player velocity, speed or movement flag. Its third output chooses attention across candidates, with nonpositive attention selecting rest; the other two steer. There is no moving-player filter or forced halt when players stop. Samples are bounded, private, sampled simulation observations, not reconstructed continuous trajectories. See [the experiment](motion-hunt.md#experimental-history-controller--2026-10-24).

Survival fitness rewards closing distance (+0.04/unit), contact (+50), and proximity, and penalizes obstacle contact (−3/second). Motion Hunt additionally rewards attention matching observed movement, penalizes attending to stationary players and movement cost, and gives stationary captures −25. Ground-truth post-collision speed (above 8 world units/second) is used by the training evaluator only. Moving-capture rewards still use private issued-frame observations across delayed contact reports. A one-time controller migration starts Motion Hunt at generation 1 with fresh networks and clears its old training records/pending imports; Survival and player records remain intact. Legacy Motion Hunt models are rejected because their observations differ. The fresh live population is not pretrained, and reliable detection or improved live hunting is not established.

The best two genomes survive each generation. Compatibility groups share selection pressure; children inherit weights and mutate weights, connections, and hidden nodes. Historical split IDs align descendant topology. This TypeScript implementation is **NEAT-inspired**, not neat-python, and exported champions are not compatible with Python checkpoints. It omits full NEAT stagnation management and recurrent networks. Changing human opponents make fitness an uncontrolled training signal.

## Modules

- `lib/game-mode.ts`, `app/mode-menu.tsx`: mode identity, objective constants and survivor-controlled selection.
- `lib/arena.ts`: world simulation, generations, private frame history, deaths and spawns.
- `lib/arena-write-queue.ts`: bounded per-mode write tickets with request-owned waiting and abandoned-request leases; database guards remain authoritative.
- `lib/physics.ts`: shared movement and collision solver.
- `lib/behavior-film.ts`, `lib/film-store.ts`, `app/api/film/route.ts`: sampled anonymous highlights, immutable commit-guarded archives and authenticated reads.
- `app/film-studio.tsx`, `lib/film-renderer.ts`: chronological replay, video export and replay-data download using the existing arena artwork.
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

Within one Worker isolate, arena POSTs and administrator training operations take a FIFO turn per mode through `lib/arena-write-queue.ts`. Shared state contains only numeric ticket/lease metadata, never cached arenas, shared promises or request I/O objects. At most 64 writes are pending per mode. Each caller waits on its own short timer, times out after five seconds in the queue, and has a ten-second active lease so abandoned requests cannot permanently lock the mode. Failed/completed operations release their ticket; stale leases are reaped on subsequent activity and idle queues are removed. Every operation still reads fresh D1 state and uses the existing revision/commit-marker guards; those remain necessary for other isolates, migration writers and an unusually slow operation outliving its lease. This local coordination prevents repeated conflict losses from starving a player until their 15-second session expires. It does not create a globally synchronized room or establish distributed capacity.

Motion Hunt uses the `motion` arena row; Survival retains `shared`. Mode-specific anonymous profile hashes separate records without a schema migration; `bot = -1` represents an extraction, and only successful extractions contribute to its fastest time. World transitions and run inserts share the existing atomic commit guard. See [Motion Hunt implementation and verification](motion-hunt.md).
