# Training exports and administrator restore

## Accepted outcome — 2026-10-21

User accepted public best-model exports, automatic population checkpoints, password-protected imports at generation boundaries, a pre-import backup, rollback and visible training branches. Preserve shared player scores, sessions, prior history, mode separation and existing hosting identity. No publication or private sandbox is included. Builder reviews this implementation; single-agent.

UI reuses the selected Tidal Lens design. Inside the existing expandable training dialog: public “Export best model” and “Export training checkpoint”; a collapsed “Administrator” section with password sign-in, file selection, compatibility preview, explicit queue action, pending cancellation, and rollback. Status and errors stay beside controls. No new persistent HUD panel. Chart lines break between training branches and the generation table labels them.

Acceptance: exports contain only model/training state; best model matches the recorded best generation or explicitly reports legacy model unavailable; checkpoints preserve all 24 genomes and evolution state; authenticated imports validate bounded JSON/topology/mode/rules, survive reload, apply exactly once at a generation boundary, and create a rollback checkpoint atomically. Existing scores and players survive unchanged. Login attempts are persistently limited, sessions expire/revoke on password rotation, mutating requests require same-origin checks, and missing admin configuration fails closed. Test domain/security cases, concurrent HTTP/D1 commits, existing gameplay fixtures, build/types and browser flow/narrow layout.

Checkpoints hold the population prepared for the next generation, not a full game-world backup. Replaying the same human interactions is not promised. Imported fitness is provenance, not trusted evidence of local improvement. An independent standardized model evaluation suite is outside this restore feature.

## Using the archive

Open **Models & admin** from the menu and select Survival or Motion Hunt. The same controls remain inside **Adaptation → View training → Training archive**. Everyone can download the best recorded bot, the current generation (all 24 active models and evolution state), or the latest automatic checkpoint. The current-generation export reads the saved arena without mutating it, works before a first boundary checkpoint, and uses the existing v2 checkpoint format with fitness reset for a fresh-generation resume. It returns an explicit unavailable response if no saved population exists. Checkpoints are saved after each completed generation and contain the population prepared for the next generation. The all-time model is saved when a new local fitness record is reached; ties retain the earliest record. Existing worlds can recover that model only if their retained latest champion matches the all-time record. Otherwise the export remains unavailable until a new record; no older genome is invented.

Open **Administrator**, sign in, then choose a JSON file. Review its mode, source generation, save time and type before choosing **Queue import for next generation**. File fitness is a claim, not a verified benchmark. A champion seeds one preserved bot plus mutated copies; a checkpoint restores all 24 genomes and the evolution state. Uploading/previewing does not modify the arena. Importing waits for active play and the next generation boundary. A queued change can be cancelled by its operation ID. A lost response can be resolved by reopening the panel and inspecting the persistent pending status; a second queued import is rejected.

At the boundary, the just-trained population is saved as the pre-change backup, the import becomes the next population, and the global generation counter continues forward. Players, active runs, scores, obstacles and earlier fitness history remain. A new branch marks the change; chart lines and improvement deltas do not cross branches. Imported fitness does not replace local records. **Restore pre-change backup…** previews a rollback confirmation; the restored population also takes effect at a boundary, and the population it replaces becomes the new backup. Download backups you wish to keep before a later restore replaces them.

## Host password setup

From the `immunity/` directory, run `npm run admin:password` in an interactive terminal. The hidden prompt asks twice for a 16–256-character passphrase, writes only a salted scrypt hash to ignored `.dev.vars` with owner-only permissions, and preserves other bindings in that file. Do not share the passphrase in chat or put it in a source file. Re-run this command to rotate it.

`npm start` automatically loads that ignored file for the built local preview; `npm run dev` uses the normal local secret binding. Production requires the **server secret** `IMMUNITY_ADMIN_PASSWORD_HASH` containing the generated hash, configured separately in the hosting environment. Never put this in a `NEXT_PUBLIC_` variable or commit/upload `.dev.vars`. Hosting secret configuration and deployment are not performed by this feature. Missing or malformed configuration disables administrator login while public gameplay/exports continue.

Passwords use scrypt N=16384, r=8, p=5, a random 16-byte salt and constant-time comparison. The runtime already enables Node compatibility; [Cloudflare documents its crypto support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/). See [OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Login attempts are limited in persistent storage to five per originating IP and forty globally per rolling 15 minutes, including successful attempts. The global limit is a deliberate small-prototype tradeoff: abuse may temporarily deny administrator login, but public play continues. Only Cloudflare's supplied client-IP header is used; local/unknown clients share a bucket.

Administrator sessions expire after 30 minutes, with at most eight sessions retained. Cookies are HttpOnly, SameSite=Strict, scoped to `/`, and Secure with a `__Host-` name on HTTPS. HTTP is accepted only on loopback for development. Sign-out removes the session. Changing the configured hash invalidates previous sessions on the next request. Every administrative action checks the session; mutation requests require the page's exact Origin and JSON content type. Shared credentials cannot identify individual human administrators; events record changes, not claimed personal attribution.

## Storage and compatibility

No SQL schema migration is required. Training snapshots use two separate rows per mode in the existing `arena` table (`<arena-key>:training:latest` and `:rollback`); they are not included in frequent public snapshots. Authentication uses the independent `immunity:admin-auth:v1` row. Each checkpoint/rollback write shares the existing transactional world/score batch and is guarded by its successful world commit marker. A losing optimistic update cannot overwrite a checkpoint. Administrative queue/cancel writes also use world revision checks. Concurrent updates retry against fresh state.

Model files use `immunity-training-v2`, the game mode and `immunity-pursuit-v1` rules identifier. Validation rejects unsupported versions/rules, cross-mode files, unexpected fields, non-finite/out-of-range numbers, incorrect population counts, duplicate/missing nodes, non-forward connections, duplicate edges and colliding evolution IDs. The file limit is 512 KiB; request bodies are streamed with bounded retained memory. No executable serialization is accepted. Exports contain no player names, tokens, profile hashes, scores or contact frames.

The legacy `/api/arena?export=1` endpoint remains compatible and still exports the latest champion in its old v1 format. Its files lack evolution state and are deliberately rejected by the new importer; use the new archive exports for round trips. A checkpoint resumes training at a fresh generation in the destination world; it does not reproduce old player movement, map layout or active runs. Storage retains the latest checkpoint, one pre-change backup, one all-time best model and up to 40 change markers; download any additional versions you want to keep.

## Verification

Domain/security tests are included in `npm run verify`. `tests/training-import.mjs` is an additional destructive **disposable-local-only** HTTP/D1 fixture: set `ARENA_TEST_URL` to its HTTP loopback preview and `IMMUNITY_TEST_PASSWORD` to its test-only configured password. It checks public exports, validation, unauthorized/foreign-origin rejection, concurrent queue/boundary changes, rollback, mode/player preservation, cancellation, expiry/sign-out and persistent throttling. It intentionally exhausts the local test sign-in limiter. Do not run it on the developer's normal database or a public deployment.

Final evidence and remaining limits are recorded in project state after verification.

Verified locally: 90 domain/security tests, TypeScript, production build, new-file/focused UI lint, the dedicated archive/authentication HTTP fixture and all five gameplay fixtures pass. Browser review covers signed-out export, sign-in/out, file preview, queue/cancel, rollback confirmation, 390px overflow checks and focus/Escape recovery. Existing lint debt is unchanged. Physical-device, load and production-host behavior remain unverified; confirm the host CPU budget accommodates password hashing before release. The local preview's temporary test credential is not copied into the source checkout.


## Motion Hunt experimental compatibility — 2026-10-24

Motion Hunt now uses `immunity-motion-history-v1` archives with three outputs (steering x/y and learned attention). Its old `immunity-pursuit-v1` models and checkpoints are incompatible and rejected. Survival retains its existing two-output archive format and rules. The user-authorized one-time Motion Hunt reset clears its generation history, champions and pending imports; score records remain. Stored incompatible backup slots are not offered for export/restore and compatible checkpoints replace them as training proceeds. See [the experiment and limits](motion-hunt.md#experimental-history-controller--2026-10-24).


## Menu model manager — 2026-10-27

The menu now provides **Models & admin** with a mode selector, best-model export, current-generation export, and administrator sign-in/import. Automatic boundary checkpoints remain under a disclosure. Current export uses the same v2 checkpoint contract and captures all saved active genomes plus evolution state, with fitness reset for a fresh-generation resume. It never exports player data or writes the arena. The owner configured the hosted password hash privately; deployments preserve the existing authentication/session protections. Local integration and browser evidence are recorded in project state.


## Per-mode administrator reset — 2026-10-28

Accepted user request: add a generation reset for each mode. In **Models & admin**, select Survival or Motion Hunt, sign in, and choose **Reset generation…**. Review the named mode and current generation, then choose **Confirm reset to generation 1** or **Keep current generation**. The in-game Training archive exposes the same controls.

A confirmed reset takes effect immediately, including while training is paused. It starts generation 1 with 24 untrained bots, clears elapsed training time, fitness/detection history, champions and the best-model record, and marks a new training branch. Player identities, active lives/runs, scores, cargo, terrain and the other mode remain. Issued contact frames are invalidated because they refer to the old population; fresh bots receive the normal spawn warm-up. Cancel a pending import/rollback before resetting.

The current population/evolution state is saved in the pre-change backup, replacing the previous backup, and the fresh generation becomes the latest checkpoint. Download an existing backup before confirming if you wish to retain it. Recovery uses the existing boundary-based rollback flow and restores the population/evolution state; cleared fitness history and best-model records are not restored. World, backup and checkpoint writes share one revision/commit-marker guarded transaction. Reset requires the existing admin session and same-origin protections, plus the reviewed generation and branch; stale or duplicate confirmations fail without overwriting the recovery backup.

Verification: the isolated reset snapshot passes 117 domain/security tests, TypeScript, production build, the extended authenticated HTTP/D1 fixture (both modes, pending/stale/duplicate rejection, backups and preservation), and all five gameplay fixtures. Changed files add no lint findings; arena retains its existing two errors and eleven warnings. Browser checks cover signed-out protection, sign-in, both mode controls, cancellation, keyboard confirmation, successful reset feedback and phone layout. The developer database and hosted training were not reset. Publication, physical touch, OS reduced-motion and load testing are outside this check.
