# Capacity measurements

Latest outcome: the local preview leak and per-mode write starvation are repaired. The current twelve-player cap passed in both modes simultaneously, including a five-minute 24-client sustained run. See [repaired results](#repaired-local-results-2026-10-29). Earlier inspector-enabled failures below are historical diagnostics, not current game-capacity measurements. Production settings and data are unchanged.

## Scope accepted 2026-10-29

The owner requested starting player/sentinel load tests. The bounded outcome is a reproducible local capacity screen, followed by longer checks of useful combinations and a real-browser rendering measurement where tools permit. No production traffic, publication, live configuration changes, or existing training/score mutations are authorized by this test.

Checkpoints: (1) preserve original runtime files and create a disposable source/database; (2) screen simulation at 1/4/8/12 players and 8/16/24/32/48/64 sentinels; (3) measure the actual HTTP/D1 path under moving clients; (4) inspect browser drawing, repeat useful cases and retain aggregate evidence. A local pass does not establish hosted D1, WAN, or physical-phone capacity.

Proposed acceptance targets are response p95 below 200 ms, failed input updates below 1%, simulation plus serialization p95 below the 33.3 ms simulation budget, and drawing near 60 FPS on the observed device. These are test criteria, not measured guarantees. Record active-player fraction and successful update frequency so closed-loop polling cannot conceal reduced throughput. Record generation changes and stalls rather than relying only on averages.

## Reproduce

Run commands from a disposable copy of `immunity/`, with installed dependencies. `scripts/load-test.mjs` uses the existing TypeScript compiler, Node 22's experimental SQLite API and synthetic identities. It does not require another load-testing package.

The simulation screen runs without a server:

```sh
node scripts/load-test.mjs --kind=simulation --seconds=20 --complexity=fresh,grown --output=outputs/simulation.json
```

For HTTP, create a source snapshot under a temporary directory, link dependencies, build it, apply both local SQL migrations and start its production preview using the [README](../README.md#run-locally). Add an `.immunity-load-test` marker only in that disposable copy. Keep its `.wrangler/state` separate from all existing runtime data. The script refuses external URLs and unmarked/non-temporary checkouts before opening SQLite. No test endpoint is added to the application.

```sh
node scripts/load-test.mjs --kind=http --url=http://127.0.0.1:5186 --modes=survival --players=1,4,8,12 --bots=24 --seconds=60 --warmup=10 --output=outputs/survival.json
node scripts/load-test.mjs --kind=http --url=http://127.0.0.1:5186 --modes=motion --players=1,4,8,12 --bots=24 --seconds=60 --warmup=10 --output=outputs/motion.json
```

Selecting both modes together, such as `--modes=survival,motion --players=12`, creates 12 synthetic clients in each independent mode, 24 in total. Requests retain completion-plus-60-ms pacing, movement sequences, acknowledgements, bounded command queues, and visible-contact negotiation. Counts refer to each mode. `--repeats=3` repeats the matrix; `--seconds=1800` requests a 30-minute case.

The HTTP fixture seeds fresh worlds, signs in synthetic players normally, then places them inside the arena to avoid an idle-lobby benchmark. Subsequent movement, contact reports, respawn/re-entry and mission progress go through the normal endpoint. Contact reports use server-issued frames; these clients do not render or reproduce the entire browser contact predictor. Different movement patterns include pursuing sentinels, circulating, collecting and escaping. Terrain can obstruct these simple controllers; measured activity/movement must accompany results.

The default `--workload=journey` includes contact reports and repeated lives. `--workload=sustained` circulates clients inside the arena and intentionally withholds contact reports so captures do not remove the load. This stress case keeps pursuit, contact-frame storage, film collection and evolution active; it does not represent normal contact behavior. Measure both workloads before making a gameplay claim.

Before joining, the runner verifies that the server exposes the exact fixture timestamp, bot count and empty player list just written to its disposable database. A mismatched server is rejected. It saves progress every 30 seconds, ends the current case after six seconds with no successful update, and saves aggregate results before cleanup. An unreachable preview stops the remaining cases, and failed thresholds or incomplete duration produce a nonzero exit status. Inspect the preview's full process tree after a crash: helper workers can remain after the listener exits. Restart the owned preview between comparisons and retain the failure evidence.

Sentinel counts other than 24 are synthetic worlds inserted only in the disposable database. Their homes are distributed around the existing central ring. The runtime's population metadata remains 24, so these are load experiments, not supported gameplay configurations or balance validation. `grown` applies 150 mutations to each synthetic genome to exercise larger networks; it does not read or represent the owner's learned models. Film collection, contact-frame history and normal persistence remain enabled.

Aggregate JSON contains timing distributions, statuses, world/response size, update frequency, activity, life transitions and generation counts. It omits tokens, identity hashes, frame IDs and raw world/player records. Keep generated bundles, local databases and raw runtime logs ignored and private.

## Initial inspector-enabled evidence, 2026-10-29

Baseline: `24341561633fcc6018f05b75ddbb28cb0b8ef585`, Apple M1, 8 logical CPUs, 8 GiB RAM, macOS ARM64, Node 22.22.3. The production bundle was built in `/private/tmp/evogoo-load-20261029/source` with fresh local SQLite state. A passive animation timing overlay was added only to that copy's `app/use-arena.ts`; the HTTP endpoint and game rules remain the baseline source. No production requests were generated.

The first 96-case simulation screen used both modes, all six sentinel counts, all four player counts, and fresh/grown synthetic networks. Each case measured 20 simulated seconds after 20 seconds of warm-up. Worst case p95: simulation 1.655 ms and serialization 7.868 ms. The initial output predates the runner's `combinedMs` field; a conservative combined bound, adding each case's maximum simulation and maximum serialization times, is 24.899 ms, below the 33.3 ms budget. This screen did not cross a generation boundary; the HTTP cases below did. Simulation results alone do not validate persistence, rendering or hosted performance.

| HTTP workload | Players / sentinels | Measured duration | HTTP response p95 | Failed updates | Observation |
| --- | --- | --- | --- | --- | --- |
| Survival journey | 1 / 24 | 60 s | 18.653 ms | 0 / 788 | PASS; active fraction 26%, 25 life transitions. |
| Survival journey | 4 / 24 | 60 s | 15.271 ms | 0 / 3,390 | PASS; active fraction 57%, 60 life transitions; generation 2. |
| Survival journey ramp, same preview after the two cases above | 8 / 24 | 60 s | 94.251 ms before disconnection | 7,105 connection failures | FAIL; V8 heap exhaustion in the preview at about 163 s cumulative server age; only 228 successful measured updates. This is not a fresh eight-player capacity estimate. |
| Fresh Survival sustained, reduced preview logging | 12 / 24 | 90 s | 324.512 ms before disconnection | 117 HTTP 503s, then 13,591 connection failures | FAIL; all players active, 451 successful updates; command queues filled. |
| Motion Hunt sustained plus browser | 3 synthetic + 1 browser / 24 | 90 s | 26.030 ms for synthetic clients | 0 / 3,539 | PASS; four players observed, synthetic clients active throughout, generation 3. Maximum response 852.808 ms. |
| Fresh Motion Hunt sustained | 4 / 32 | 60 s | 16.310 ms | 0 / 3,315 | PASS; all players active; generation 2. |
| Fresh Motion Hunt sustained | 4 / 48 | 60 s | 23.257 ms before disconnection | 552 connection failures | FAIL; preview stopped accepting connections; 2,682 successful updates. |
| Fresh Motion Hunt sustained | 4 / 64 | 60 s | 27.144 ms before disconnection | 1,351 connection failures | FAIL; preview stopped accepting connections; 1,968 successful updates; generation 2. |
| Fresh Motion Hunt sustained, five-minute stability attempt | 4 / 24 | 99.14 s of 300 s requested | 16.907 ms before disconnection | 380 connection failures | FAIL; service loss after about 93 measured seconds; stopped early after six seconds without success; 5,198 successful updates; generation 3. |

Response percentiles exclude attempts that never returned an HTTP response. Connection-failure totals include retries after the preview stopped and must not be interpreted as steady-state packet-loss rates. The first two ramp cases did not maintain every player inside the arena; that is why separate sustained cases were added. Exact exit causes for the subsequent reduced-logging preview losses are not established. The first default-logging ramp contains explicit V8 heap-exhaustion diagnostics. No game feature has yet been identified as the cause of memory growth.

The real-browser Motion Hunt observation recorded about 100 animation callbacks per second, frame-interval p95 12 ms and draw-callback p95 1 ms, with four players, 24 sentinels and the document visible. These are animation/CPU drawing measurements, not GPU presentation counters. A single frame over 50 ms was recorded across 8,675 callbacks, including startup. The browser moved through the gate and among sentinels. No physical phone, CPU throttling, real WAN, simultaneous two-mode traffic or hosted D1 test is implied.

The original longer test overturned any safe-limit conclusion from its short passes: four continuously active players with the normal 24 sentinels lost the unrepaired local service. The five-minute attempt stopped after 99.14 measured seconds rather than completing. The game listener disappeared while the preview helper remained; sampled listener-worker RSS fluctuated from about 124 MiB to over 550 MiB before its disappearance. That sampling alone did not identify the exit cause. These inspector-enabled runs justified diagnosis, not a lower-cap recommendation; the repair findings and retests below supersede their capacity interpretation. Configured caps and gameplay were not changed.

### Verification and artifacts

PASS: 127 domain regressions, TypeScript, focused runner lint, runner syntax, external-target refusal and normal-checkout refusal. Both the baseline and test-instrumented production bundles built successfully in the disposable copy. All ten original runtime/hosting/secret-file preservation hashes match. Owned preview/helper processes were stopped and the test port no longer listens. No new full gameplay integration suite, production test or physical-device check was run.

Aggregate local evidence: [results JSON](../outputs/performance/2026-10-29/results.json), [browser screenshot](../outputs/performance/2026-10-29/browser-four-players.jpg) and [verification log](../outputs/performance/2026-10-29/verify.log). These files are ignored local outputs, not published assets. Raw private logs, local SQLite and memory samples remain in `/private/tmp/evogoo-load-20261029`. The first ramp and twelve-player run used an older cleanup path that threw after saving their failed measurements; their missing completion timestamp does not make them successful cases.

### Interpretation and next checks

The measured failure is in the server/preview path even when no browser renders. Shared-world persistence and conflict retries are candidates for investigation: `app/api/arena/route.ts` can repeat each world read/JSON parse/simulation/write up to five times; `rememberContactFrame` retains up to eight private all-bot frames per player; film buffers are also serialized in the world. This is a source-backed hypothesis, not an attributed memory leak. At four players the measured private world p95 was about 182 KiB with 24 sentinels versus a public response around 11 KiB, and about 434 KiB versus 19 KiB at 64 sentinels.

Before advertising a capacity or increasing caps: isolate application versus local-emulator memory growth, repeat the passing workloads for longer and on separate machines, measure both modes together, then run against separately authorized staging with the actual hosting/database path. Keep the existing production limits until that evidence exists.

## Instability repair investigation, 2026-10-29

The owner explicitly requested finding/fixing the instability and rerunning tests. Outcome: eliminate the reproduced listener exits, repeat the failed sustained workloads, and preserve gameplay, atomic score/world writes, learned populations and local identities. Exclusions: production publication, live data changes and cap increases. Acceptance: the formerly failing five-minute four-player case completes; higher-load cases report completed duration, errors and response percentiles; existing regression/integration checks still pass; shutdown leaves no owned preview workers.

Inspection found the pinned Wrangler 4.92.0's `InspectorProxyWorker` unconditionally enables Network events, appends every incoming debugger message to `runtimeMessageBuffer`, and only drains that buffer when DevTools is attached. The existing `--inspector-port 0` enabled inspection on a random port. This matches [Cloudflare issue 14191](https://github.com/cloudflare/workers-sdk/issues/14191) and its [upstream repair](https://github.com/cloudflare/workers-sdk/pull/14243); it explains why reducing log verbosity did not prevent the earlier failures. The installed source, rather than the report alone, establishes that this checkout contains the faulty path.

The A/B run used the exact previous application bundle and synthetic database with the existing programmatic Wrangler API's `dev.inspector: false`. No game rules, request cadence, contact-frame buffers, film recording or database behavior were disabled. It completed 300.06 measured seconds with 17,153 successful updates, no failures, response p95 13.311 ms, all four players active and generation 7 reached. The earlier inspector-enabled run lost service around 93 measured seconds. This controlled comparison supports attributing the reproduced listener exits to the local inspector; it does not establish hosted capacity. The comparison and memory samples are in `/private/tmp/evogoo-instability-fix-20261029`.

The repair changes the built local preview launcher to that programmatic API, defaults to inspection disabled, retains `--inspect` as an explicit debugging option, preserves loopback/D1 persistence/ignored-secret handling, and disposes the owned runtime directly on shutdown. Four regression checks protect the inspector default, explicit opt-in, secret discovery and invalid arguments. The checked-in launcher serves the disposable copy and reports configured local administrator authentication from a synthetic secret file. The diagnostic launcher's shutdown removed both owned workerd processes. Full matrix/integration evidence follows after the repaired launcher runs.

### Separate write-starvation finding

The inspector-only repaired Survival ramp stayed alive but its 12-player case failed: 4,725 successful inputs, 106 conflict 503s and 886 expired-session 401s, with only ten players present at the median sample. Some clients continually lost the five-attempt revision race and never refreshed `lastSeen` for 15 seconds. This is independent of the preview crash. The diagnostic result is retained as `repaired-survival.json` in the private QA folder and must not be confused with the final two-fix runs.

Added a FIFO turn per mode for arena POSTs and administrator training operations in a shared Worker isolate. Each operation still reads the database afresh; all revision checks, unique score commit markers and atomic archive batches are unchanged. Pending work is bounded to 64 per mode, failed operations release their turn, and idle queues are removed. Shared state contains numeric ticket/lease metadata only. Each request waits on its own timer; a shared-promise handoff is incompatible with Workers request isolation and produced `SpanParent` errors under longer real-runtime load. Five regressions cover twelve competing writers, independent modes/failure recovery, overload/recovery, abandoned leases and bounded waiting. Queue waiting expires at five seconds; an active lease expires at ten seconds so a cancelled request cannot permanently block the mode. D1 guards remain authoritative if a slow operation outlives its lease or another isolate writes concurrently.

The earlier shared-promise prototype passed its short preflight but failed the longer twelve-player run and was replaced before completion. Its results are diagnostic only. The final request-owned ticket queue passed the full-duration matrices and simultaneous five-minute run below. The runner reports each mode separately and rejects a pass if any nominal players disappear, so one healthy mode cannot hide another mode's failure.

## Repaired local results, 2026-10-29

All rows below use the final request-owned ticket queue and disabled headless inspector, with normal persistence, film collection, contact-frame storage and evolution enabled. Both modes run at once unless noted. Counts are **per mode**; twelve per mode means 24 clients total. The threshold remains p95 under 200 ms and fewer than 1% failed updates, with completed duration and every nominal player retained.

| Players / sentinels per mode | Measured duration | Survival p95 | Motion Hunt p95 | Failed updates | Result |
| --- | --- | --- | --- | --- | --- |
| 1 / 24 | 60 s | 18.346 ms | 15.830 ms | 0 / 1,620 | PASS |
| 4 / 24 | 60 s | 19.212 ms | 16.829 ms | 0 / 6,794 | PASS |
| 8 / 24 | 60 s | 68.010 ms | 70.867 ms | 0 / 9,159 | PASS |
| 12 / 24 | 60 s | 175.266 ms | 173.857 ms | 0 / 7,728 | PASS |
| 4 / 32, experimental population | 60 s | 19.801 ms | 18.261 ms | 0 / 6,759 | PASS |
| 4 / 48, experimental population | 60 s | 25.765 ms | 25.171 ms | 0 / 6,559 | PASS |
| 4 / 64, experimental population | 60 s | 37.753 ms | 35.511 ms | 0 / 6,012 | PASS |
| 12 / 24, sustained | 300.17 s | 163.896 ms | 163.290 ms | 2 transient 503s / 39,826 | PASS; every player retained, both generation 8 |
| 12 / 24, journey with contact/respawn | 60.13 s | 84.476 ms | 84.902 ms | 2 transient 503s / 13,394 | PASS; 44 life transitions, active fraction 97.7% |

The final isolated Survival twelve-player validation also completed 120.08 seconds with all 17,314 inputs successful and p95 34.212 ms. The repaired twelve-player Motion Hunt browser check used eleven synthetic clients plus the browser player: all 8,727 measured background updates succeeded, response p95 80.296 ms. The browser visibly joined as player twelve, crossed the gate and moved among sentinels; its captured animation cadence was 100 callbacks/s, frame-interval p95 11.9 ms and CPU draw p95 1 ms. This is not a GPU/physical-phone measurement. The passive timing panel exists only in the disposable preview.

The five-minute simultaneous run had no network errors, expired sessions, HTTP 500s or listener exits. The two busy replies are retained in the result (about 0.005% of updates), rather than reported as zero errors. Its HTTP response p99 was about 199 ms and maximum 363.496 ms. Therefore this establishes the defined local threshold, not an absolute no-hitch guarantee. Across the corrected suite the two workerd processes stayed alive for over twenty minutes and were disposed during teardown; whole-process RSS includes native/runtime allocation and is not a production isolate-memory measurement.

PASS: 136 domain/tooling tests and TypeScript; final production bundle; focused lint on new code with no additional API-route findings; all five ordered gameplay HTTP/D1 fixtures; both-mode player collision fixture; authenticated training import/reset/rollback/expiry fixture; and automatic film/privacy/archive fixture. Each integration group used its own fresh local database, so authentication expiry/limiting and film history could not contaminate another group. Local secret loading was exercised with a synthetic credential. All ten original runtime/hosting/secret-file preservation hashes match. Both test ports are closed and all owned previews/helpers are stopped.

Current evidence: [repair results JSON](../outputs/performance/2026-10-29/repair-results.json), [twelve-player browser screenshot](../outputs/performance/2026-10-29/repair-browser-twelve.jpg), [136-test verification log](../outputs/performance/2026-10-29/repair-verify.log). These are ignored local artifacts. Raw diagnostics, failed prototype evidence, integration logs and synthetic runtime data remain private in `/private/tmp/evogoo-instability-fix-20261029` and its disposable fixture directories. The tested application/runner source hashes are in the results JSON.

Configured limits remain twelve players and 24 sentinels per mode. Counts above twelve players were not tested; 32–64 sentinels are fixture experiments, not promoted configurations. Hosted D1/WAN behavior, multiple distributed isolates, physical phones, arbitrary latency and the owner's larger learned populations remain unverified. These changes are local and uncommitted; no deployment or production data change was performed.

The owner subsequently authorized commit, push and deployment on 2026-10-29. The [project-state release receipt](project-state.md#repair-release-authorized-2026-10-29) records publication preparation and outcome; the local load measurements above do not become production-capacity claims when the repair is released.
