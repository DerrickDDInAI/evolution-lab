# Current project state

Source baseline: `main` at `93a20c9`, inspected 2026-10-19 when the checkout was clean. Updated 2026-10-20 for the tilted Glass Tide implementation on `codex/glass-tide-tilted`; earlier uncommitted workflow/design work and the proposed gameplay mode were preserved. Recheck status and source before relying on this snapshot.

## Purpose and current outcome

**Observed product:** a standalone browser multiplayer survival game and NEAT-inspired learning experiment. The [README](../README.md) owns gameplay and technical details. Casual players and people exploring evolving bot behavior are the inferred audience; no participant research or formally accepted product roadmap was found.

**Current outcome (2026-10-20):** the user selected tilted Glass Tide and requested implementation on a new branch. The [playable implementation](glass-tide-implementation.md) adds an oblique camera, original flora/ruin/survivor/seed artwork and an organic interface. The existing survival mechanics remain intact. Workflow setup and earlier [art proposals](visual-directions.md) are preserved locally.

Source inspection confirms the join → safe staging → arena entry → contact/death → outside respawn → saved-score flow in `app/page.tsx`, `app/use-arena.ts`, `lib/arena.ts` and `app/api/arena/route.ts`. The implementation has a 12-player cap, 24 bots, fixed generation homes with warm-up, sequenced movement, visible-contact negotiation, private frame history, and revision/commit-marker guarded D1 writes. This is implementation evidence, not a fresh live-game observation.

**Visual follow-up (2026-10-20):** the user requested Glass Tide in overhead and tilted views. Two [camera comparison mockups](visual-directions.md#glass-tide-camera-comparison--2026-10-20) are saved for review. The user subsequently selected the tilted view for implementation. The comparison images remain generated illustrations; implementation and actual browser evidence are recorded separately in [Glass Tide implementation](glass-tide-implementation.md). Other recorded gameplay proposals are preserved.

## Decisions and assumptions

| Status | Choice / rationale | Source / owner / date |
| --- | --- | --- |
| Accepted scope | Inspect first, preserve unrelated work, add only missing guidance/context/verification. | User's setup request, 2026-10-19 |
| Setup implementation | Reuse README for product/architecture/setup; keep rules in AGENTS and dated state here to avoid parallel authorities. | Setup agent adapting the requested workflow, 2026-10-19 |
| Existing convention | Keep this repository independent of the Python project and preserve the existing Site identity and data. | README and inspected source at `93a20c9`, reviewed 2026-10-19; original decision date/owner not established |
| Accepted preference | Offer delegation for larger tasks; agree scope and usage limits first. Work single-agent until that agreement. | User reply in the setup chat, 2026-10-19 |
| Accepted design brief | Nature-sovereign alien planet, ecological pursuit, lush arena and diegetic organic UI; develop several original directions using the supplied visual references. Tilted Glass Tide subsequently selected. | User request, 2026-10-20; [brief and proposals](visual-directions.md) |
| Accepted implementation | Tilted Glass Tide on a new branch, preserving current gameplay; one additional agent for bounded rendering/contact review, no further delegation. | User requests/reply, 2026-10-20 |
| Proposal | Prioritize validating the complete casual-play journey under latency before adding features. | Setup agent recommendation, 2026-10-19; requires user selection |

## Proposed mode: motion-sensitive hunters

**User idea, recorded 2026-10-20:** AIBots should learn to detect and chase humans only when they move. Scope is to record and explain the concept; implementation and deployment are not requested. Working name: Motion Hunt. This remains a proposal, not an implemented feature or selected milestone.

**User-defined objective, clarified 2026-10-20:** the player must first collect something valuable and essential to humanity’s survival on this planet, then exit with it. The core loop is enter → locate and collect the resource → carry it to the exit → successful extraction. Standing still may avoid detection but cannot complete the mission. The resource’s identity, quantity, collection interaction and consequences of capture remain unspecified. This establishes the proposed mode’s objective; it does not authorize implementation.

**Design recommendation:** make successful extraction with the required resource the primary victory condition. Use stop/start movement to create decisions about when to advance, hide and resume the journey. Train and evaluate bots against resource-seeking humans that must return to an exit, varying resource and exit placement to reduce memorization. Keep hidden player positions and inventory out of bot senses unless a later explicit rule makes them perceptible. Track human extraction success alongside bot capture metrics; longer survival alone is no longer mission success.

**Observed baseline:** `lib/arena.ts` selects the nearest arena player regardless of motion, supplies their position/velocity, and rewards distance reduction, proximity and contact. `lib/evolution.ts` evolves feed-forward networks with 11 inputs and two movement outputs. It has no recurrent memory. These observations were checked against the local source on 2026-10-20.

**Recommended first experiment:** make motion-only visibility an explicit sensory rule; evolve pursuit within that rule. Use server-validated, post-collision displacement over simulation time, with a small configurable speed threshold and start/stop hysteresis. Do not infer motion from key presses, camera-relative movement or packet arrival timing. Optional range and obstacle occlusion further constrain visibility. Select targets only among detectable humans, and provide an explicit detection flag with masked target position, velocity and distance when no target is detected. Stationary hidden humans must not affect target selection or proximity rewards. Network inputs require a versioned mode-specific layout because existing output IDs immediately follow the 11 inputs.

**Evolution:** evaluate every genome over the same varied episodes containing moving, stationary and stop/start humans, with randomized positions and obstacles. Reward progress toward the same detected target and valid moving-target captures; penalize collisions and unnecessary movement when no signal exists. Reset distance baselines when targets change or visibility is lost. Avoid positive rewards for simply waiting, and avoid allowing easy progress rewards to dominate captures. Retain successful genomes, breed/mutate descendants, and evaluate on unseen episodes. Keep this mode's population, champions and scores separate so existing learning is preserved. The existing NEAT-inspired loop is reusable; reliable improvement is an experimental result, not a guarantee.

**Important distinction:** masking stationary humans implements motion detection as a sensor capability; the evolved skill is responding to that signal. For detection itself to evolve, later supply unlabeled temporal observations (for example, occupancy samples now and previously), account for the bot's own movement, and evolve a detection output alongside movement. Giving true speed or a moving/not-moving flag already supplies detection. A hard gameplay guarantee that bots never pursue stationary humans still needs an explicit rule; fitness alone cannot guarantee it.

**Open choices:** does stopping immediately cancel pursuit, or may a bot inspect the last detected position briefly? Never update remembered coordinates from a hidden human. Does incidental contact with a stationary human kill? Invisibility does not itself provide immunity. The collect-then-exit objective now supplies the reason to move; resource identity, collection rules and capture consequences remain open. Suggested first version: immediate signal loss, no target memory, and explicit contact rules before implementation.

**Acceptance evidence for a future implementation:** no hidden stationary-player data in bot observations or target selection; matching detectable observations yield matching controller behavior regardless of hidden-player placement; no false motion from walls or network timing; pursuit response on moving targets and signal loss on stopping; stationary-contact behavior matches the chosen rule; held-out moving-target captures improve over initial random genomes across repeated training seeds without increased false pursuit. Report detection/reaction, captures, collisions and false-pursuit metrics separately.

**Next handoff:** retain the user-defined collect-then-exit objective; choose the resource, collection/capture and stop/contact rules, then prototype isolated observations and deterministic training episodes before connecting this mode to multiplayer. No gameplay code, stored genomes or deployment changed for this note.

## Verification evidence

The workflow check results below are from 2026-10-19 on local macOS with Node.js 22.22.3 and npm 10.9.8, using existing dependencies; they were not rerun for the 2026-10-20 art proposals. The later task inspected the current UI/renderer, visually reviewed three generated concept boards and checked the documentation links. No game implementation or runtime test is claimed for these concepts.

| Check | Result and scope |
| --- | --- |
| `npm test` | PASS: 48/48 domain regression tests at the baseline revision. |
| `npm run typecheck` | PASS at the baseline revision. |
| `npm run lint` | FAIL before edits: 40 findings (16 errors, 24 warnings). Existing debt; no rule suppression or gameplay cleanup included in this setup. |
| `npm run verify` after setup edits | PASS: 48/48 tests followed by TypeScript checking. |
| Integration runner | PASS: syntax and focused ESLint; temporary harness checked ordering/environment, default/local origin, stop-on-failure/signal and launch failure with stubbed child execution. Five invalid origins were rejected by actual runner invocations before fixtures. No HTTP/D1 pass implied. |
| Documentation and preservation | PASS: 32 local links/anchors, balanced fences, whitespace and final newlines across six Markdown files; `git diff --check`; final diff limited to guidance, README links, package scripts and the runner. |
| Build, local HTTP/D1 integration, browser/device journey, live game and maximum load | Not run during this workflow setup. Existing scripts or screenshots do not establish a current pass. |
| Hosted CI | Not configured or run; no Git remote/provider is configured. See [engineering](engineering.md#ci). |

## Glass Tide verification

The 2026-10-20 implementation passed 51 domain tests, TypeScript and the production build. Sequential HTTP/D1 fixtures passed against a disposable database. Browser checks covered the full join/contact/respawn/saved-score/rejoin journey, keyboard help, zoom, field notes, foliage fading and narrow/short layouts. Focused lint adds no findings: renderer/helpers/layout pass; page retains its baseline 8 errors and 1 warning. See [detailed evidence and limits](glass-tide-implementation.md#verification--2026-10-20). Physical touch, OS reduced-motion visuals, maximum-player visual/load testing and hosted CI remain unverified.

## Gaps and next handoff

The selected visual implementation is ready for user review. New ecological gameplay, competitive cheat resistance and deployment remain outside this task.

1. Review tilted Glass Tide's appearance and scale in the playable branch.
2. Before release, check physical touch controls, reduced-motion visuals and multiple players for readability and performance.
3. Triage existing lint debt separately; decide whether lint can become a required gate.
4. Choose a repository host/CI provider if remote collaboration is wanted. The motion-sensitive collect/extract proposal above still needs its own mechanic decisions.

**Current handoff:** tilted Glass Tide implementation is on `codex/glass-tide-tilted`, based on `93a20c9`. Initial implementation commit: `42b0b67`. The directional follow-up adds eight-way survivor/sentinel views, idle heading retention and travel-based gait; 54 tests, type checking, build, focused lint and browser facing checks pass. See the implementation record for limits. The preexisting workflow/design documents and scripts remain uncommitted and separate. Nothing pushed or deployed. Entry points: [implementation](glass-tide-implementation.md), [renderer](../lib/renderer.ts), [camera/art helpers](../lib/glass-tide.ts), [UI](../app/page.tsx), [assets](../public/glass-tide/README.md) and [AGENTS.md](../AGENTS.md). Local screenshots are in ignored `outputs/`. The disposable QA database is separate from project data.

**Sprint follow-up:** survivor sprint frames now animate across eight headings with distance-based timing, idle/walk suppression and reduced-motion fallback. 56 tests, TypeScript, build and focused renderer/helper lint pass; live Shift movement was visually checked. The same disposable preview folder was rebuilt. No new gameplay mechanics or deployment.

**Walking follow-up:** separate walking sprite cycle implemented across eight headings, alongside the existing sprint animation. 58 tests, TypeScript, build and focused lint pass; normal movement and Shift transition were checked in the rebuilt local preview. No gameplay changes or deployment.
