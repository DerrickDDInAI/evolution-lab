# Living interface and visible adaptation

## Accepted outcome — 2026-10-21

The user asked for a diegetic, organic interface after entering a mode, keeping the existing menu, plus bot performance metrics and evolution visible to everyone. The user's situation is a player exploring the shared training experiment; they need an unobstructed field, readable survival feedback and an honest indication of what the bots are doing.

Selected design: extend tilted Glass Tide with a symbiotic shell at the screen edges. An [initial vector layout](design/2026-10-21-organic-hud.svg) established the composition before the UI implementation. The builder owns experience review; this task used no additional agents. Acceptance: unchanged Nursery selection; full-field gameplay; organic stamina, map, records and controls; training visible without opening a hidden panel; completed and provisional results clearly distinguished; usable keyboard/narrow/short layouts and recovery.

This scope does not change pursuit rewards, breeding, physics, movement/contact validation, modes or score identity. No publication is included in this local task.

## Implementation

- `app/page.tsx` and `app/globals.css` give each mode a full-viewport field with pearl membranes, leaf veins, lamellar breath feedback, shell controls and records. The Nursery retains its existing styling and behavior. Changing mode also exits expanded view.
- `lib/renderer.ts` draws seven stamina lamellae on the ground beneath the local survivor. They follow the survivor and reflect actual predicted energy. The inner contact footprint is unchanged. The wreath is static apart from stamina/position changes, including under reduced motion. Short windows lift the shore instruction above the record shell.
- `app/training-organ.tsx` shows a persistent **Adaptation** organ, accessible to spectators and joined players in either mode. It shows last completed best fitness, a best/average trend and rewarded captures. Before a generation completes, it shows provisional live fitness and an explicit waiting state.
- Opening Adaptation shows completed best and change from the prior generation; captures and captures per active minute; live best/mean, population/species and the top three bots; up to 40 completed generation rows; reward explanations and champion export. It traps keyboard focus, closes with Escape/backdrop/close button and returns focus. Local movement input is cleared while open; this does not pause the shared simulation.
- `lib/training-metrics.ts` owns framework-independent public summaries and plotting coordinates. True negative fitness values are retained; missing data is unavailable rather than zero. Tables give a textual alternative to the graph.
- `lib/arena.ts` records optional `meanFitness` alongside existing best fitness/tags before resetting the population. This extends arena JSON, requiring no schema migration. Old generations, learned genomes and modes are preserved. Missing old averages remain unavailable; the plot does not interpolate across gaps. Existing public snapshots carry the additional aggregate; no private player fields are added.

## Metric interpretation

Fitness is the existing reward: closing distance (+0.04/unit), proximity, a rewarded capture (+50), and obstacle penalties (−3/second). Captures in the training display use the existing generation reward counter, which can differ from total contacts (for example stationary Motion Hunt contact). Captures per active minute is completed captures × 60 / the 45-second active round. It is not normalized for player count. Live numbers reset each generation; comparisons use completed generations only.

These are uncontrolled observations with changing human opponents. The interface states that rising fitness alone does not prove better bots. Survival and Motion Hunt remain separate, and no measured generalization or NEAT checkpoint compatibility is claimed.

## Verification — 2026-10-21

Disposable preview: `/private/tmp/immunity-organic-qa-20261021`, loopback port 5177, fresh migrated local D1 and shared installed dependencies. Existing project/production game data was not used. This machine briefly ran out of free disk space; replacing duplicate copied art with read-only source links recovered the preview. Temporary preview shutdown also exercised the disconnected/last-known-results state.

- PASS: 75 domain tests and TypeScript. Added tests verify actual mean fitness before reset, negative fitness, provisional/completed separation, normalized capture rate, deterministic bot ranking without source mutation, empty/single/legacy histories, and missing-average plot gaps.
- PASS: production build; new training component/metrics and changed renderer pass focused lint. Existing page/arena/test findings remain baseline debt (10 errors, 13 warnings across those existing files); no rules suppressed.
- PASS browser: preserved Nursery; both mode join flows; shore → passage → pursuit/sprint, stamina drain and ground wreath; controlled visible sentinel touch → outside respawn → stopped run and saved record; leave/rejoin restores record; mode switching keeps training/records separate. A single stationary sentinel was staged beside the QA player in this disposable database to check visible contact.
- PASS browser: real generations completed during play; best/average graph, live ranking, completed rows and champion availability updated. Adaptation opening/closing, Escape and focus return, scrollable narrow details, initial empty history and network recovery states were checked.
- Responsive review covered measured 390×844 and 800×360 CSS pixels plus desktop. Review found and corrected a mobile mission/empty-training overlap and a short-window training/map overlap. Final rendering and sequential HTTP/D1 checks are recorded in the handoff below.

Physical touch, OS reduced-motion visuals, maximum-player load and measured evolutionary improvement remain unverified. The HUD contains functional live controls and in-world stamina cues, not a fully modeled wearable creature.

**Final review:** all five sequential HTTP/D1 fixtures pass (visible contact; score/respawn; multiplayer/privacy; 750 ms packet delays; Motion Hunt extraction and isolation). Final production build and 75-test/TypeScript verification pass. Direct before/after lint comparison confirms identical existing-file rule/severity counts. Final 390×844 review measures a 16 px gap between empty-history Adaptation and the mission cue with no horizontal overflow; 800×360 review confirms clear training/map and shore-instruction/record separation. Browser evidence is saved in ignored `outputs/organic-hud-desktop.png` and `outputs/organic-hud-mobile.png`.


## Best generation follow-up — 2026-10-21

User requested best generation so far in the interface. Adaptation now names the completed generation with highest recorded best fitness; training details include its generation and score. Ties keep the earliest generation. The arena saves this mode-specific record separately from the 40-result chart window and publishes it as a non-personal aggregate. Existing worlds initialize from retained history; already discarded older results cannot be reconstructed. No migration, champion replacement, reward changes or reset of learned data.

Verification: 77 tests, TypeScript, production build and focused training component/helper lint pass. Regressions cover negative scores, ties, legacy initialization without genome changes, record retention across history rollover and save/load, later replacement and mode isolation. Browser confirmed best Gen 3 (50.1) alongside latest Gen 5 (22.7), and the added label fits measured 390 CSS pixels without horizontal overflow. Short-window review identified extra height; a bounded map-height adjustment was built, but its final browser recheck was blocked by recurring machine disk exhaustion. Prior integration evidence remains from the organic-interface task; no new HTTP fixtures were run for this follow-up. Local, uncommitted and undeployed.


## Tidal Lens — selected implementation, 2026-10-21

The user selected the [Tidal Lens mockup](design/2026-10-21-tidal-lens.webp): deep teal reading membranes, thin pearl/amber shell edges, perimeter capillaries, luminous stamina chambers, and a live fitness chart with best generation and score visible together. Players need readable survival feedback with an open view of the world. Builder owns review, single-agent. This presentation change preserves menu, simulation, rewards, genomes, scores and hosting identity. No publication included. Acceptance: selected materials and hierarchy with actual metrics; complete joining, help, training, records, offline and contact states; desktop, phone and short layouts; keyboard focus and reduced-motion support. Checks: domain suite/TypeScript, focused lint, build and browser gameplay/responsive comparison.


### Implemented and reviewed

- `app/tidal-shell.tsx` supplies native SVG membranes and peripheral capillaries. Opaque teal surfaces support ivory text; decorative veins stay separate from data and ignore pointer events. No new raster runtime assets or continuously animated HUD effects.
- `app/page.tsx`, `app/globals.css`, and `app/training-organ.tsx` apply the selected design to generation timing, stamina vesicles, minimap, controls, joining, help, training and recovery messages. Best generation and its fitness sit beside latest completed fitness; live fitness is labeled before the first result. Amber solid and cyan dashed chart lines distinguish best and average. Compact charts use readable HTML legends; full details retain numeric axes and history.
- User follow-up explicitly prioritized the game over interface size. Reduced header, survival and training organs; removed persistent keyboard hints (retained in Help); moved recent runs into an accessible disclosure. Mobile mission cues fit beside training. The smallest phones use their actual viewport height, without forcing page scrolling. Expand/zoom, mode exit, saved scores and training remain reachable.
- Decorative materials approximate the approved concept using responsive code; they are not a rendered 3D wearable. Existing world art, terrain, actors, collision/contact, learning, profiles and score persistence are unchanged.

Verification, 2026-10-21: 77/77 domain tests and TypeScript pass; final production build passes. New shell and training files pass focused lint. Page retains the existing 8 errors/1 warning; no lint rules were suppressed. All five sequential HTTP/D1 fixtures pass in the disposable QA database: visible contact, contact/respawn, multiplayer, delayed movement, and Motion Hunt collection/extraction/isolation. The only change after those fixtures was the phone minimum-height CSS adjustment, included in the final build and browser checks.

Browser review covers both modes, joining, movement/sprint, actual completed generations, best generation, empty training, training/Help focus and Escape, recent-run disclosure, saved identity/score on rejoin, contact → outside respawn → re-entry, and menu preservation. Final measured layouts: 1600×900, 390×844, 800×360, and 320×567; no horizontal overflow or overlapping persistent HUD rectangles. The 320×567 screen also has no vertical overflow. Permanent HUD bounding rectangles occupy approximately 13.7%, 30.3%, 34.6%, and 48.5% respectively in the sampled Survival states. This deliberately overcounts rounded transparent corners, excludes transient notices/open dialogs and untested touch controls, and is not a general device-performance claim. The central play area stays clear; very small screens remain denser. Text palette contrast against the lightest principal membrane color is 6.37:1 or higher for the checked ivory, muted, amber and cyan colors; this is palette calculation, not a complete accessibility audit.

Evidence: ignored `outputs/tidal-lens-desktop.jpg`, `outputs/tidal-lens-mobile.jpg`, `outputs/tidal-lens-landscape.jpg`, and `outputs/tidal-lens-contact.jpg`. Disposable QA: `/private/tmp/immunity-organic-qa-20261021`, loopback 5177. Early disk exhaustion was resolved by removing only generated builds from prior disposable previews. Existing project databases were never used by fixtures. Physical touch, OS reduced-motion visuals, maximum-player load, and controlled learning-quality tests remain unverified. All added HUD art is static; reduced-motion rules suppress interface transitions.

Local, uncommitted, undeployed; applied to the existing `main` checkout at `9562c33`, preserving the earlier rename and publication receipt.
