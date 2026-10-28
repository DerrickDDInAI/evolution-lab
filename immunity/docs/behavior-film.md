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


## Use and recording limits

Open **Models & admin**, choose a mode, sign in under **Administrator**, then expand **Sentinel behavior film**. Refresh the archive, select up to 24 generations and choose **Preview selected** or **Export video**. Videos are 1280×720 at a target 30 fps, with MP4/H.264 preferred when supported and a browser-supported fallback. Download the finished video from its link; **Download replay data** saves the selected anonymous samples separately. Export takes the film's duration. Keep the tab visible; Stop, closing the panel or leaving it cancels playback/export without removing saved clips.

Sampling uses authoritative game positions every 200 ms, in active simulation time. It is a rendered replay of actual sessions rather than a screen recording; interpolation is approximate and does not bridge different survivor lives or observation gaps over 600 ms. Generation labels and training branches are baked into the video. Captures take priority when choosing a ten-second window, then nearby pursuit and moving survivors. This selection is illustrative, not a controlled evaluation of learning. Capture reports received after their generation has already been archived are not retroactively inserted. Empty/paused arenas do not advance recording. A generation reset discards its unfinished buffer; completed clips remain. Generations before deployment have no recordings.

Each completed generation with enough samples retains an immutable clip in a separate mode-specific arena row. The working ring and best window each hold at most 52 frames; player lookup keys are private and bounded to current survivors. Archived clips contain numeric survivor slots, bot positions, obstacles and generation metadata, with no participant names, tokens, profiles, contact-frame IDs, scores or genomes. Archive reads require the existing administrator session. Retention accumulates with completed generations; no automatic pruning or archive import is implemented.

## Additional film verification

The film implementation's disposable preview at `/private/tmp/immunity-film-qa-20261028` passes its authenticated recording/privacy/immutability HTTP fixture and the five sequential gameplay fixtures. An initial Motion Hunt contact fixture failed once, then passed both a focused retry and the complete final sequential run. Film-domain coverage includes bounded buffers, captured contact coordinates, non-mutation, generation/life/branch separation, replay gaps and guarded immutable SQLite writes with pagination. The combined shared checkout subsequently passes 127 tests, TypeScript and build.

Browser review also verified persisted highlights after a server restart/reload, selected-generation preview, Stop with controls restored and a neutral status, a measured 390×844 layout without horizontal overflow, and two completed 1280×720 exports. The first downloaded MP4 is an ignored local QA artifact at `outputs/behavior-film-qa-sample.mp4`: 11.9725 seconds, approximately 30 fps, decodable VP9 in an MP4 container. The final build's H.264-preferred export reached ready state and playable metadata (12.9965 seconds, 1280×720, no video error); its second automated download check stalled in the browser-control tool, so no second download pass is claimed. Physical touch, OS reduced-motion, other browsers, maximum load and production collection remain unverified. The normal hosting/runtime preservation snapshot still matches all eight files. No normal database or production fixture was run by this film task.
