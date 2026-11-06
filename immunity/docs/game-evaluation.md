# EvoGoo game evaluation — 2026-11-06

## Verdict and evidence boundary

**Provisional design assessment: 5.6/10.** EvoGoo has a distinctive ecological identity and an interesting evolving-pursuer premise. Its implemented player decisions, run variation and reasons to return are less developed than that premise. It is a promising playable experiment; the available evidence does not establish a compelling long-term game yet.

This is an expert design review, not a player-review average, retention study or fresh hands-on gameplay review. Inspected clean `main` at `c07762b`, current gameplay/UI/controller source, the project wiki, controlled-learning results, and the actual 2026-11-05 live-menu screenshot at `/private/tmp/evogoo-live-release-20261105.png`. The accompanying release report confirms that day's asset matching and HTTP checks, not today's performance. Browser initialization failed in this review; no new gameplay session, physical-device test or production load test was completed. Prior test receipts are historical evidence, not fresh passes. Technical reliability, control feel, real multiplayer fairness and retention remain unscored.

The review's scores are subjective hypotheses grounded in implementation. Decimal precision only comes from the stated weighting. Proposed target scores are acceptance ambitions, not predicted outcomes. All recommendations below are proposals; this review authorizes no gameplay implementation, deployment, training reset or data operation.

## Relevant reference games

The closest category is a short-session browser pursuit game with a collection/extraction mode. Arena survival games provide useful adjacent lessons. The references are successful examples, not a claim to rank every game in the genre; Steam approval is not equivalent to design quality or active player count.

| Reference and verified source | Relevant lesson, as design interpretation | Application to EvoGoo |
| --- | --- | --- |
| [Agar.io official gameplay guide](https://support.miniclip.com/hc/en-us/articles/4404685562641-How-to-start-playing-Agar-io) | Growth, predation and splitting make a simple spatial game support changing risk decisions. | Keep entry simple and make player decisions visibly alter the situation. Add social context before elaborate community systems. |
| [Vampire Survivors](https://store.steampowered.com/app/1794680/Vampire_Survivors/) | Its documented choices, escalating power and run-to-run upgrades give survival a forward trajectory. | Borrow the rhythm of anticipation, choice and payoff through ecological events and objectives. Combat and permanent power increases are optional, not requirements. |
| [Brotato](https://store.steampowered.com/app/1942280/Brotato/) | Different traits, items and builds make repeated arena runs structurally different. | Test a few meaningful route or utility choices before adding maps or modes. |
| [Alien: Isolation](https://store.steampowered.com/app/214490/Alien_Isolation/) | Its survival, scavenging and stealth framing is an adjacent reference for a threatening pursuer. | Make pursuit and escape understandable through sound, animation and environmental cues. Its production scope is not an appropriate benchmark. |

At lookup, Vampire Survivors and Brotato had Overwhelmingly Positive English Steam reviews with substantial review volumes. This supports their use as successful reference points; it does not establish that copying features will transfer their success. All source-derived statements here are paraphrases. Current Slither.io source access failed, so its mechanics are not used as verified evidence.

## Scorecard

Scale: 1–3 major gaps; 4–5 thin or partially communicated; 6 functional foundation; 7–8 strong execution; 9–10 exceptional, supported by play evidence. Ratings concern current design support and presentation evidence, with uncertainty especially high for moment-to-moment enjoyment.

| Dimension | Weight | Current /10 | Reason | Proposed target /10 |
| --- | --- | --- | --- | --- |
| Identity and distinctive premise | 15% | 8 | Ecological art and NEAT-inspired sentinels form a recognizable combination; perceived adaptation is not established. | 8 |
| Core decisions and tension | 25% | 6 | Routing, sprint stamina, collision and collection/extraction exist. No loadout or comparable branch of tactical tools was found. Enjoyment remains a playtest question. | 8 |
| Onboarding and rule readability | 15% | 5 | Help, controls, mission text and markers exist. Mode selection, name entry and walking through a gate add steps; probabilistic motion detection is difficult to explain. | 8 |
| Replayability and goals | 15% | 4 | Separate personal records and recent runs exist. One fixed seed location and limited objective variety constrain novelty; shared evolution does not guarantee enjoyable variation. | 7 |
| Visual identity and hierarchy | 10% | 7 | The inspected menu has cohesive sea-glass scenery and clear mode signs. Dense ornament competes for attention. Arena animation/readability needs fresh visual review. | 8 |
| Multiplayer purpose | 10% | 4 | Shared arenas, solid player bodies, player count and a copy-link invite exist. No explicit team objective or party destination was found. More humans need a stronger designed purpose. | 7 |
| Feedback and reward delivery | 10% | 4 | Capture effects, stamina, mission notices and records exist. No audio implementation was found in app/lib. Results give little actionable explanation or celebration. | 8 |

Weighted calculation: `(15×8 + 25×6 + 15×5 + 15×4 + 10×7 + 10×4 + 10×4) / 100 = 5.55`, rounded to **5.6/10**. Meeting every proposed target would yield **7.8/10** under this rubric, but only a new review and player evidence can justify that score.

## What is working

- The Nursery menu has a memorable place-based identity. Preserve it while improving clarity.
- Motion Hunt has an understandable mission arc: enter, retrieve, escape, succeed or lose cargo. It is the stronger candidate for a featured expedition; validate that with players.
- Sprint is a limited resource, so timing can matter. Shared physics, contact footprints, spawn warm-up and capture effects support consistent rules.
- Training is inspectable through Adaptation and exports. The project explicitly distinguishes higher fitness from proven improvement, which is a sound foundation for trustworthy messaging.
- Records survive ordinary rejoining through anonymous browser identity. Preserve that behavior and explain its browser/domain boundary.

## Highest-value changes, in order

### 1. Teach the first successful attempt in context

**Addresses clarity and core-loop scores. Effort: small to medium.** Retain the current default name and offer a clear primary join action; do not add mandatory account setup. Show one contextual instruction at a time: cross the gate, use a short sprint, recover the seed, find an exit. Add an off-screen objective indicator. Explain exhaustion with “Release Sprint to sprint again” when the latch is active. Existing Help remains available.

Test with 8–12 first-time players using a fresh disposable arena. Proposed acceptance: at least 80% enter without coaching within 30 seconds; at least 80% can explain their objective and capture rule after one attempt. Report actual counts, not population-wide certainty. Record where people hesitate before changing the menu again.

### 2. Make detection, capture and success legible

**Addresses clarity, feedback and fairness. Effort: medium.** Give sentinels readable dormant, active and pursuing poses. If adding a detected indicator, reflect actual controller attention and permitted public observations; do not promise invisibility or expose private contact history. Motion Hunt currently evaluates recent positions with learned attention, so stillness is not a guaranteed safe state.

Add restrained, independently adjustable audio for activation, sprint exhaustion, pickup, capture and extraction, paired with visual cues. Preserve reduced-motion support. Extend existing capture feedback with an optional short local replay or precise contact highlight and one reliable tip. Build on the existing collision effects and behavior-film infrastructure; verify access/privacy before reusing admin film features publicly.

Proposed acceptance: 80% of testers correctly explain a shown capture; 80% notice pickup and extraction without reading Help. Include silent play, reduced motion and a color-vision check. Measure this before increasing difficulty.

### 3. Create different decisions between attempts

**Addresses core-loop and replay scores. Effort: medium to large.** First test three validated seed sites and two meaningful routes, with a visible choice between safety and speed. Reserve optional side objectives for after the basic extraction is understood. Validate reachability, bot spawn clearance, path cost and camera guidance for every arrangement.

Compare Survival with small, telegraphed ecological events or optional time milestones. Assess whether prolonged circling, waiting or gate camping dominates; these are risks, not confirmed exploits. Prefer terrain and route decisions before adding several new abilities. If introducing a decoy or other utility, prototype one at a time in an isolated branch.

Proposed acceptance: players can describe at least two useful tactics, and observed successful attempts use more than one route. A changed layout is valuable only if it changes decisions. Preserve existing records; version or separate scores when rules change.

### 4. Give players a reason for the next run

**Addresses replay and feedback scores. Effort: medium.** Add a small set of skill milestones such as first extraction, three successful expeditions and a clean stamina-management run. Reward them with field notes or cosmetic details. Make the result screen show the record comparison, one earned milestone and a clear return action.

A seeded daily challenge can support comparable conditions, but freeze its layout, rules and bot population snapshot in a separate challenge context. A shared arena with evolving opponents cannot establish equal difficulty just because the map seed matches. Keep challenge scores separate from historical personal records. Avoid global ranked claims while visible-contact reporting remains client-assisted.

Proposed acceptance: in an exploratory 10-minute session, at least 60% voluntarily start a third attempt. Later compare return behavior with a baseline; this target is a product hypothesis, not an industry benchmark. Use consented observation or minimal aggregate measures; keep participant records private.

### 5. Make a friend change the experience

**Addresses multiplayer purpose. Effort: medium to large.** The existing invite copies only the site origin. Start with mode-aware invitations and an intelligible indication that a friend arrived in the same arena. Then prototype an optional cooperative seed relay or shared extraction task. Test body-blocking, gate congestion, disconnects and one-player availability before promoting it. A party/room system is a later step if the prototype demonstrates demand.

Proposed acceptance: two invited players reach the intended same mode without coaching, identify each other, and can explain how cooperating helped. Keep solo play usable. Do not require public chat or cross-browser identity migration for this experiment.

### 6. Make evolution meaningful without promising steadily smarter enemies

**Addresses identity, core tension and trust. Effort: medium.** Keep detailed Adaptation statistics, but lead with a plain-language observation backed by actual measurements, with sample sizes and uncertainty. Generation number is not a difficulty rating. Do not label a generation “better at flanking” unless that behavior has been measured.

Evaluate detection and pursuit jointly against fresh held-out scenarios. Existing offline results expose tradeoffs: weight-reset Motion Hunt improves mean fitness while stationary false positives increase from 41.2% to 78.6%; the extended Survival species comparison's +3.33 capture-point estimate has a paired interval of −6.94 to +12.92. These are synthetic evaluator outcomes, not current human-player detection rates. Maximizing fitness alone can make the promised mechanic worse. Retain the current algorithm and populations unless separately authorized evidence supports a change.

Separate onboarding difficulty from experimental shared evolution through an explicit practice environment if required. Do not silently weaken or replace the production population to make a tutorial pass.

## Verification and next decision

Recommended sequence: first-session teaching and feedback → observed route/tactic experiment → result goals → cooperative prototype. Physical touch, narrow-screen pursuit readability, reduced motion, reconnects and representative WAN latency should be checked before promoting any affected release. Prior local twelve-player tests do not establish hosted capacity. No fresh performance score is warranted.

The next accepted outcome should be a bounded onboarding/feedback prototype with the above observational checks, followed by rescoring the same rubric. The largest opportunity is helping a player understand, make a satisfying choice and want another attempt. Additional menu ornament or a more complicated breeder has lower priority until those behaviors are demonstrated.

## Local evidence map

- [Current gameplay and limits](../README.md)
- [Player HUD, notices, controls and personal records](../app/page.tsx)
- [Menu selection](../app/mode-menu.tsx)
- [Seed location and exits](../lib/game-mode.ts)
- [Arena, generations and mission completion](../lib/arena.ts)
- [Learned motion observation and attention](../lib/motion-observation.ts)
- [Shared movement and sprint exhaustion](../lib/physics.ts)
- [Renderer and existing capture effects](../lib/renderer.ts)
- [Controlled learning results and uncertainty](evolution-evaluation.md)
- [Local capacity evidence and limits](performance.md)
- [Release and browser evidence receipts](project-state.md)
