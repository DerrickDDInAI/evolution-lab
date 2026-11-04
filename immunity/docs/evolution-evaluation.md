# Controlled evolution evaluation

## Scope and acceptance

Owner request, 2026-10-31: implement controlled evaluation first, then compare persistent species management and mutation changes separately, preserving learned genomes and live training.

The accepted outcome is a reproducible offline comparison against the current breeder, with matched initial populations, fixed training opponents, unseen evaluation scenarios, multiple seeds, and results for both Survival and Motion Hunt. Checks must establish deterministic replay, production-baseline parity, no holdout influence on selection, correct capture/detection accounting, and preservation of current runtime data. No candidate is promoted to production by this task.

Exclusions: live training changes, imports/resets, deployment, real-player observations, HTTP/D1 fixtures, genome-format migrations, recurrence, larger populations, and changes to game rewards. Existing visual-theme work remains unrelated and preserved.

## Running it

From `immunity/`, with installed dependencies and Node.js >=22.13:

```sh
npm run evaluate:evolution -- --profile=smoke
npm run evaluate:evolution -- --profile=screen
```

Smoke: one seed, two breeding steps, two-second episodes. It validates execution, not learning quality. Screen: seeds `71,42719,982451653,20261031,314159`, 30 breeding steps, eight-second episodes. Both run all four arms in both modes, with 24 genomes per population. Optional overrides are `--generations=1..200`, `--seconds=2..20`, `--seeds=comma,separated,uint32s`, and `--modes=survival,motion` (either mode may be selected). The executable rejects unknown and duplicate options. It has no URL, database, credential, checkpoint-import or promotion options.

Each invocation creates a unique directory under ignored `outputs/evolution-evaluation/`. `protocol.json` records the configuration before training; `partial.json` is updated after each completed arm; `report.json` and `report.md` appear only on full completion. JSON includes source hashes, full scenario definitions, paired seed results, initial/final population hashes, training curves, network sizes, per-opponent breakdowns and detection denominators. It intentionally contains no importable population or live participant data.

Fresh domain code is transpiled into a unique system temporary directory and removed on normal completion/failure. This does not depend on pre-existing `.sites-runtime/tests` output. Domain import closure is limited to in-memory game modules and Zod. No server, storage adapter, administrator API or persistence endpoint is invoked. Runtime databases, hosting configuration, learned genomes and secrets are never inputs to the runner.

## Protocol v1

1. Independently generate fixed scenario suites with seeds `104729` (train) and `130363` (holdout). Scenario RNG never consumes evolutionary RNG.
2. For each mode/evolution seed, create the same fresh 24-genome population for each arm. The complete initial population and RNG state must have the same hash across arms.
3. Evaluate every genome in eight training episodes: stationary, straight-line, turning and stop/go opponents, each with diametrically mirrored bot starts. Starting gap is 240–420 world units; heading, turn rate and stop/go offset are seeded. Alternating opponent types have one circular obstacle.
4. Each episode resets to a fresh one-bot/one-player world, skips spawn warm-up, runs at 30 Hz, and stops on physical capture or the fixed time limit. It reuses `arena.advance`, `physics.movePlayer`, real motion histories, controller inputs, fitness, and collision rules. There is no extraction objective. Scripted movement may hit walls/obstacles; labels use realized speed, as in the game.
5. Training fitness is the mean actual game fitness across those episodes. This evaluation boundary differs from the live 45-second shared arena: it equalizes opportunities and starting conditions. All arms receive the same episode/evaluation budget; early capture can shorten simulated time.
6. Evaluate generation zero and each newly bred generation. The screen therefore scores 31 populations and performs 30 breeding steps. Select the final champion by training fitness only. Global two-genome elitism remains in all arms.
7. Only after all breeding ends, evaluate initial and final training champions on 12 holdout episodes: fresh parameters for the four training opponent types, plus previously unseen zigzag and reactive evasion with sprinting, again mirrored. No holdout metric selects a genome or influences reproduction.
8. Compare each experimental arm with baseline using matching evolutionary seeds. Report individual deltas, mean, median, range and positive/negative/tied seed counts. Frames and episodes are not treated as independent evolutionary repetitions.

The suites are deterministic scripted tasks, not a representative sample of human behavior. They are fixed across evolutionary seeds so those seeds measure sensitivity to initialization and evolutionary randomness, not different task samples. Reusing the holdout to tune subsequent experiments would turn it into a development set; reserve a fresh final suite before promoting any candidate.

## Separate arms

| Arm | Change from current production algorithm |
| --- | --- |
| `baseline` | Unmodified `lib/evolution.ts`, freshly compiled. |
| `persistent-species` | Retain species IDs/representatives, track best training fitness and last improvement, stop reproduction after 15 non-improving generations except for the current global champion's species, and assign remaining offspring by largest-remainder quotas proportional to mean shifted fitness. Keep the current two global elites, compatibility formula/threshold, crossover and mutation unchanged. Choose next representatives from the current species. Empty species disappear. |
| `low-structure` | Change only node-insertion attempt probability from 0.18 to 0.03 and connection-insertion attempt probability from 0.25 to 0.05. |
| `weight-reset` | Keep baseline structural rates. Within the existing 80% per-gene mutation chance, replace the weight uniformly in [-1,1] with 10% probability; otherwise retain the current bounded perturbation. |

The species arm is a management package: its results cannot isolate the contributions of persistence, quotas and stagnation. Quotas reduce roulette variation but do not guarantee survival for every niche. It deliberately retains baseline elitism instead of adding per-species champion copies as another confounder. The mutation arms never include persistent species or each other.

Mutation experiments modify guarded source anchors in temporary copies only, then run that copy's complete breeder. Anchor changes fail loudly and require review. Production `evolution.ts` remains byte-identical; no mutation defaults or genome schema change. These are NEAT-inspired experimental settings, not a claim of full paper fidelity or Python compatibility.

## Metrics and interpretation

- Mean holdout fitness: same rewards as the game; useful as a task score, not sufficient proof of better play.
- Capture rate: fraction of episodes ending in any capture. For Motion Hunt, stationary capture is undesirable, so inspect rewarded captures and stationary captures separately. Their rates also use all episodes as the denominator.
- Capture time among successes: unavailable if nothing was captured; biased toward whichever episodes succeeded. Capped capture time assigns the full time limit to uncaptured episodes, and is primarily useful for Survival.
- Moving recall and stationary false-positive rate: computed from actual evaluator decisions with complete history. Balanced accuracy averages the two class recalls. Missing classes produce null, never an invented zero. Counts and elapsed simulated time are included because capture changes observation exposure.
- Detection frames are correlated and occur on policy-dependent trajectories. Balanced accuracy alone cannot establish better hunting; read per-opponent outcomes alongside it.
- Training curves include best/mean training fitness, mean hidden-node count and species count; the species arm additionally records persistent IDs, sizes, stagnation ages and reproductive quotas. Quotas exclude the two global elites.

Five seeds are an exploratory screen, not a significance claim. Broader scenario suites, more seeds, longer training, multi-bot competition, physical-client latency and human play remain necessary before any live promotion. No change to existing learned populations follows automatically from a favorable screen.

## Verification and results

Implementation checkpoints: establish isolation and baseline parity; verify scoring and held-out separation; run the matched screen; inspect paired outcomes; document limits and preservation.

2026-10-31 checks: `npm run verify` passes 147 tests (including 11 new evaluator regressions) and TypeScript. Focused lint passes for every new script/test. Full lint retains the pre-existing 16 errors and 44 warnings, with no findings in these additions. Smoke completes all eight arms. Regression coverage includes 25-generation production-baseline parity in both modes, deterministic evaluation, input/template immutability, identical initial populations, holdout independence, actual capture rewards/penalties, detection denominators, species persistence/stagnation and exact offspring budgets. Local documentation links and diff whitespace also pass.

Relevant files: [runner](../scripts/evaluate-evolution.mjs), [temporary compiler](../scripts/evaluation/domain.mjs), [scenarios and scoring](../scripts/evaluation/scenarios.mjs), [experiment loop](../scripts/evaluation/experiment.mjs), [species experiment](../scripts/evaluation/species.mjs), and [regressions](../tests/evolution-evaluation.test.mjs). `npm run verify` includes these regressions and TypeScript; focused lint covers the new scripts/test. Build/browser/HTTP checks are unnecessary for this offline-only addition and do not establish learning quality.

### Completed screen — 2026-10-31

Completed all 40 arms (two modes × five seeds × four variants), each with 30 breeding steps and eight-second episodes, in 365.1 seconds. All paired initial population hashes and initial holdout results match, and the recorded domain/experiment source hashes match the evaluated files. Evidence is in ignored `outputs/evolution-evaluation/screen-aeT3yP/report.json` and `report.md`; this table preserves the main findings in tracked documentation.

The following are means across the five final training champions, each evaluated on 12 holdout episodes. Capture columns use all episodes as denominator; Motion Hunt rewarded captures exclude stationary captures. Detection columns average per-seed rates, with balanced accuracy giving equal weight to each class.

| Variant | Survival capture rate | Motion rewarded capture rate | Motion stationary capture rate | Motion balanced accuracy | Motion stationary false-positive rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | 21.7% | 1.7% | 3.3% | 61.4% | 41.2% |
| Persistent species | 28.3% | 5.0% | 0.0% | 53.9% | 56.3% |
| Lower structural mutation | 25.0% | 8.3% | 0.0% | 55.3% | 52.1% |
| Occasional weight reset | 23.3% | 8.3% | 3.3% | 48.6% | 78.6% |

Survival persistent species has the strongest average capture result: +6.7 percentage points, improving two seeds and tying three; mean fitness delta is +2.855, improving three seeds and worsening two. Lower structural mutation is +3.3 capture points, with two improvements, one regression and two ties; weight reset is +1.7 points, with three improvements and two regressions. These small-sample results do not establish robust superiority.

Motion Hunt exposes a tradeoff: weight reset has the highest mean fitness (+7.966 versus baseline, improving four seeds), but balanced detection accuracy falls by 12.8 points and stationary false-positive rate rises from 41.2% to 78.6%. Persistent species and lower structural mutation also reduce mean balanced accuracy (−7.6 and −6.2 points); each experimental arm loses balanced accuracy on four of five seeds. No arm is an overall demonstrated improvement for Motion Hunt.

No species reached the 15-generation stagnation cutoff with zero reproductive quota in this screen. The stagnation behavior is covered by regression tests, but its learning benefit is unmeasured here. The observed species-arm differences therefore should not be attributed to successful stagnation removal.

Decision for this task: retain the production algorithm and existing learned populations. A proposed next experiment is a longer, broader matched-seed Survival species screen, followed by a separate final unseen suite; Motion Hunt needs joint detection/pursuit assessment before considering any promotion. This is a proposal, not an automatic follow-up or deployment.

Preservation: all 14 pre-recorded protected file hashes match after execution (ten local runtime/hosting/secret files and four production domain sources). No production traffic, database writes, imports or resets occurred. Changes are local and uncommitted on `main` at `cd9b6b7`; existing theme work is preserved. No build, HTTP fixtures, browser testing, push or deployment was performed for this offline-only task.

## Extended Survival protocol v2 — 2026-10-31

The owner requested a longer, broader Survival comparison with more seeds and fresh test scenarios, still preserving live training and saved genomes. This follow-up compares only the unchanged baseline and the same persistent-species management package; it does not retune the species algorithm, mutation, crossover, elitism, population size or game rewards.

Run from `immunity/`:

```sh
npm run evaluate:survival -- --profile=smoke --workers=2
npm run evaluate:survival -- --workers=4
```

The extended protocol is fixed before outcomes are inspected: 12 new evolutionary seeds (`101,211,307,401,503,601,701,809,907,1009,1103,1201`), 100 breeding steps, 24 genomes and 12-second episodes. There are 16 training scenarios and 60 fresh test scenarios. Scenario seeds `49979687` and `67867967` are new relative to v1. Both arms receive identical initial genomes and fixed scenario suites. Source hashes and the full protocol are saved before workers start; workers refuse source drift. Up to four bounded CPU workers evaluate independent arms, without connecting to a service or database. Scheduling has no effect on training randomness; serial/worker parity is tested.

Training now includes stationary, line, turn, stop/go, zigzag, reactive evasion, orbit and sprint-burst opponents. Heading and approach direction vary independently; gaps range from 180 to 600 world units; centers, turn rates, timing and rock radii vary deterministically. Every training opponent has mirrored starts and one of three obstacle layouts. Each test opponent receives all three layouts (open, slalom, cluster) with mirrored starts; held-out reversal and figure-eight opponents bring the total to ten families. These two new families never enter training. All tested starts are obstacle-clear and inside the arena.

The primary outcome is final-champion holdout capture rate; capped time to capture is secondary, with failed captures assigned the full 12-second horizon. Fitness is diagnostic. Champions are selected by training fitness only, and initial/final holdout evaluation occurs after breeding ends. No hyperparameter or stopping decision uses holdout outcomes. Paired results include per-seed differences and descriptive 95% percentile bootstrap intervals from 10,000 resamples of seed pairs (resampling seed `32452843`). These intervals are conditional on this fixed synthetic suite and do not establish performance against human players. Per-opponent breakdowns are exploratory, not separately corrected significance tests.

Species diagnostics now explicitly record whether a species is excluded for stagnation. This is observational metadata only; reproductive behavior is unchanged. Reporting distinguishes actual exclusion from an ordinary zero offspring quota. The arm still bundles species persistence, quotas and stagnation, so even successful exclusion cannot identify stagnation's independent effect.

Acceptance: complete all 24 arms, validate matched initialization and fresh train/test separation, report captures/times and uncertainty plus actual stagnation exposure, verify source/runtime preservation, and leave live training unchanged regardless of the winner. Build, browser and HTTP fixtures remain outside this offline task. Checks pass 151 tests and TypeScript, including new broad-scenario, worker-parity and paired-summary regressions; focused lint and the four-arm extended smoke pass. Results are recorded below.

Implementation: [extended runner](../scripts/evaluate-survival-extended.mjs), [broad scenarios and paired summaries](../scripts/evaluation/broad-survival.mjs), [isolated CPU worker](../scripts/evaluation/survival-worker.mjs). Outputs use a unique ignored `outputs/evolution-evaluation/survival-extended-*` directory. `protocol.json` precedes training; individual `seed-*-*.json` files record completed arms; final `report.json` and `report.md` appear only after all arms and source audits pass. No checkpoint import or automatic promotion is supported.

### Completed extended comparison — 2026-10-31

All 24 arms completed in 631.1 seconds using four CPU workers. Evidence: ignored `outputs/evolution-evaluation/survival-extended-Fysxp6/report.json` and `report.md`, with the frozen protocol and individual arm files alongside them. All 12 pairs have identical initial population hashes and initial holdout outcomes; every arm completed 100 breeding steps and 60 final holdout episodes. All recorded source hashes match the evaluated files.

| Metric | Current algorithm | Persistent species | Paired change, species minus current | Descriptive 95% paired bootstrap interval |
| --- | ---: | ---: | ---: | --- |
| Capture rate | 60.97% | 64.31% | +3.33 percentage points | −6.94 to +12.92 points |
| Capped time to capture | 7.902 s | 7.567 s | −0.335 s | −1.027 to +0.397 s |
| Mean game fitness | 78.022 | 80.969 | +2.948 | −0.939 to +6.424 |

Persistent species wins capture rate on 7 seeds and loses on 5, with individual changes from −35 to +25 points. It has lower capped capture time on 7 seeds and higher time on 5. The average direction is favorable, but the intervals include no difference and meaningful regressions; this comparison does **not** establish a dependable advantage. The earlier screen's positive average signal is not a sufficient reason to promote this package.

Opponent breakdown is mixed. Persistent species improves capture rate most against reversal (+12.50 points), straight-line (+9.72) and stop/go (+8.33) opponents, but worsens against zigzag (−13.89) and reactive evasion (−2.78). These are exploratory subdivisions of the same fixed suite, not independent confirmatory tests. The fresh test includes 720 final-champion episodes per arm, but the uncertainty calculation correctly uses 12 evolutionary seed pairs rather than treating the repeated scenarios as 720 independent learning runs.

Stagnation exclusion actually occurs in 4 of 12 species runs: seeds 101, 503, 809 and 1103, each with one unique species excluded for one generation (after evaluated generations 32, 96, 58 and 61 respectively). Exclusion means no newly bred offspring quota; baseline global elites remain protected. The maximum simultaneous species count is only 1–3. This demonstrates execution of the cutoff, not a benefit attributable to that cutoff, because the treatment still bundles persistence, quotas and stagnation.

Conclusion/recommendation: keep the current algorithm and existing learned populations. A future research question would be whether quotas, persistent identity or stagnation independently help, and whether gains survive more diverse obstacle fields and multi-bot/human opponents. This task does not authorize or launch that follow-up. Do not reuse these inspected holdouts as a new final confirmation set after tuning.

Final verification: 151 tests and TypeScript pass; new/changed evaluation files pass focused lint. Full lint remains at the pre-existing 16 errors and 44 warnings. Documentation links and diff whitespace pass. All 39 protected local runtime/hosting/secret/domain-source hashes match before and after. No existing genomes were imported, reset or modified; no production traffic, deployment, push, build or browser/HTTP fixture occurred. Work remains local and uncommitted on `main` at `cd9b6b7`; pre-existing theme edits and preview are preserved.
