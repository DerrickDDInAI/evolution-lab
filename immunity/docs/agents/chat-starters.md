# Focused chat starters

Replace bracketed inputs. Each starter assumes a chat opened in `evolution-lab/immunity` and a checkout containing [AGENTS.md](../../AGENTS.md), [the wiki index](../index.md) and [project state](../project-state.md). These prompts do not create chats or authorize additional scope.

## Product & experience design

```text
Read AGENTS.md, docs/index.md and docs/project-state.md. Resolve [one product
question] for [players/context], using the relevant README sections and current
implementation. Separate facts, hypotheses, proposals and accepted decisions.
Define one small milestone, exclusions, the complete journey, interaction and
failure states, accessibility and observable success criteria. Preserve the casual
game and data constraints unless a change is explicitly accepted. Define intended
feeling and distinctive choices with references and reasons, and name the
experience reviewer. For new visual surfaces, generate a design/mockup before
implementation and specify how the rendered result will be compared with it.
Prototype only to resolve a bounded uncertainty. Ask focused material questions.
Record accepted decisions with owner/source, date and rationale in the owning doc;
leave proposals labeled and update the current handoff. Done when the next outcome
and its experience/acceptance criteria are clear.
```

## Research & studies

```text
Read AGENTS.md, docs/index.md and docs/project-state.md. Investigate [specific
question] to inform [decision about play, latency, accessibility or learning].
Reuse repository evidence and relevant available methods. Prefer primary sources;
record publication/review dates, method, access limits, uncertainty, contradictions
and applicability to this HTTP-polled, NEAT-inspired game. Separate published
studies, participant observations and product inferences. Preserve original/private
material; do not infer demand or training quality from a fitness chart. Add a linked
research topic page only if substantive findings need it, and update the handoff.
Done when there is a supported answer or explicit evidence gap and actionable
implications. Research does not authorize contacting participants.
```

## Implementation

```text
Read AGENTS.md, docs/index.md and docs/project-state.md. Deliver [one accepted
feature/fix] against [spec/criteria] in [branch/worktree]. Inspect current status and
affected source, preserve unrelated work, and establish constraints, exclusions,
checkpoints and checks. Preserve shared physics, visible-contact validation, legacy
compatibility, private data and atomic score writes where affected. Test meaningful
rules and regressions using docs/engineering.md. For UI work, follow the selected
design through the complete journey and recovery states; compare the rendered
result, revise the design where evidence requires it, then implement/review again.
Review the diff, run appropriate checks and experience review, and update owning
docs. Done when the accepted outcome works with scoped evidence. Report failures,
unverified areas and an actionable handoff. Do not assume another chat's uncommitted
files are present or treat proposals as accepted requirements.
```

## External testing

```text
Read AGENTS.md, docs/index.md and docs/project-state.md. Independently evaluate
[journey/criteria] on [revision/build, environment and test data]. Confirm access
and preserve user data. Use a disposable local preview for the HTTP/D1 fixtures;
run them sequentially as described in docs/engineering.md. Walk join, arena entry,
movement, visible contact, respawn, reconnect and saved scores where relevant.
Check feedback, next actions, consistency, keyboard/touch/reduced-motion paths and
recovery. Simulate interruptions only with test data. Record reproducible steps,
expected/observed behavior, severity, evidence and pass/fail/inconclusive per
criterion. Distinguish domain, local HTTP/D1, rendered-browser, live and participant
evidence; identify checks requiring a human, device or additional access. Update
the testing handoff. Done when each criterion has a scoped result or explicit gap.
Testing does not authorize production fixes, resets, deployments or contacting people.
```
