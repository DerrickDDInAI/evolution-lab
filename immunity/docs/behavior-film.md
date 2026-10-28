# Sentinel behavior film

## Accepted outcome, 2026-10-28

The user requested a final video showing sentinel pursuit across generations, selected highlights from real player sessions, and authorized implementation now. Preserve populations, scores, contact validation and existing hosting identity. Builder reviews; single agent. Publication requires its own scope under AGENTS.md.

Automatically retain one bounded chase highlight for every newly completed generation in each mode. Record sampled authoritative positions during real play, never substitute generated opponents or re-run models. Keep captures tied to confirmed events. No historical footage can be reconstructed. Store the archive separately from frequent public snapshots, exclude participant names/identities/secrets/scores, and restrict reads to the existing administrator session.

## Experience and review mockup

Reuse the existing Training archive and painted arena rendering. A compact addition inside Administrator leads to the film controls; no new game HUD or menu redesign.

```text
Administrator (existing sign-in)
  Sentinel behavior film
  Real sessions · one highlight per completed generation
  [Refresh highlights] [Load older generations]
  [ ] Gen 77 · branch 1 · 10 s · chase
  [x] Gen 78 · branch 1 · 10 s · capture
  [x] Gen 91 · branch 2 · 10 s · chase
  [Preview selected] [Export video] [Download replay data]
  +------------------------------------------------+
  | Immunity · Survival · Generation 78 · Branch 1  |
  |        existing Glass Tide game artwork        |
  |        amber sentinels / anonymous survivors   |
  | Sampled live session                 03 / 10 s |
  +------------------------------------------------+
  [Stop]  Progress / errors / downloadable video
```

Acceptance: collection survives browser closure; active recording is bounded; one immutable clip per generation is committed with the world revision guard; mode/branch boundaries stay separate; no archive enters public snapshots; authenticated pagination, chronological multi-generation preview, downloadable video, replay-data backup, cancellation and error recovery work. Export includes generation labels and explains sampled live movement. Existing domain/type/build checks, focused archive/privacy/commit tests, disposable HTTP/D1 fixtures and browser checks cover the new flow and core gameplay. Physical touch and production behavior must be reported separately.

## Implementation and release verification, 2026-10-28

The user subsequently authorized committing, pushing and deploying all current changes. Implemented the recorder, immutable D1 archive under the existing world commit guard, administrator-only list/detail API, chronological selection, video export, replay download and stop/error recovery. Active recording is bounded to ten-second windows sampled every 200 ms; no earlier footage is reconstructed. Archive rows persist independently of active populations and resets. No schema migration is required.

The combined release passes 127 domain tests, TypeScript, production build, all five sequential gameplay HTTP/D1 fixtures, authenticated training/reset fixtures and the dedicated behavior-film fixture in a fresh disposable preview. Browser review confirms sign-in, two archived generations, chronological export, ready feedback and an actual MP4 download. Changed-file lint has identical findings to HEAD; new film files pass. An initial admin expiry fixture was disrupted by a concurrent browser sign-in, then passed in isolation. Physical touch, OS reduced-motion, full rendered gameplay, export cancellation/error paths, other browsers and production film collection were not newly exercised. Publication receipt is recorded in [project state](project-state.md).
