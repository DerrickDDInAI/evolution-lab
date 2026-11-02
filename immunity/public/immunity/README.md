# Immunity runtime artwork

Generated on 2026-10-20 with the built-in `image_gen.imagegen` tool for Immunity's tilted Glass Tide branch. Exact prompts and transparency settings are in [generation-prompts.json](generation-prompts.json). Runtime copies are lossily compressed WebP at quality 88 to reduce download and source-transfer size; the generated PNG originals remain available in Git history.

- `sprites.webp`: original transparent 1536×1024 atlas, three columns and two rows. Cells, in row order: shell flora, colony ruin, survivor, active sentinel, dormant sentinel, small fern clump. The renderer samples equal cells directly; the generated alpha is preserved.
- `shallows.webp`: opaque, low-contrast pearl-silt/teal-water ground texture, repeated in world space.

The artwork uses original biological and survivor forms. The user's film/series references guided atmosphere and material choices; no film stills or promotional artwork are shipped as runtime assets. No external asset service or runtime image generation is required.

See [implementation and verification](../../docs/glass-tide-implementation.md) for projection, contact-footprint and readability constraints.

## Directional update

`directions.webp` is a new transparent 1254×1254 generated atlas with survivor views in the top two rows and active sentinel views in the lower two. The renderer selects inspected front/back/profile/three-quarter poses and mirrored counterparts for eight-way facing; explicit source rows and anchors prevent clipping and foot drift. The dormant seed retains its original closed form. Exact initial and correction prompts are in [directional-prompts.json](directional-prompts.json). WebP retains transparency.

## Sprint animation

`sprint.webp` contains five survivor views (front, front-right, right, back-right, back) with four sprint phases each. Left views mirror the corresponding right views. Explicit row boundaries and hip/foot anchors keep bodies aligned while cape and limbs move. WebP retains transparency. [Sprint prompts](sprint-prompts.json) include the initial generation and gait correction.

## Walking animation

`walk.webp` retains the original four-pose, five-view painting and transparency. The walking renderer now samples its first pose per view into masked thigh, shin/boot and body layers, articulating two legs half a cycle apart with continuous distance-driven motion. Left headings mirror the matching right view; bodies do not flip within a stride. Explicit sampling and hip/ground anchors preserve the original identity and scale. See the [original walking prompt](walk-prompts.json) and [walking realism correction](../../docs/glass-tide-implementation.md#walking-realism-correction--2026-10-21).


## Whole-body running correction — 2026-10-22

The existing `walk.webp` now supplies layered torso/cape, upper/lower arm and thigh/shin/boot samples for the shared normal-run/sprint rig. Arms oppose the legs, elbows bend, the torso leans/counter-rotates, and longer strides use continuous distance-based phases. Source arm regions are covered with sampled cape texture before moving arms are composited. `sprint.webp` remains a safe loading fallback. Menu cadence accounts for actual CSS travel, actor size and the tilted ground projection. See the [whole-body correction](../../docs/glass-tide-implementation.md#whole-body-locomotion-correction--2026-10-22).

## Selectable watercolor worlds — 2026-10-30

`themes/` contains Sunseed Garden, Watercolor Glass Tide and Moonbloom Nursery. Each includes a transparent 1448×1086 twelve-sprite atlas, a 1254×1254 ground painting, and a 1672×941 menu backdrop. The atlas rows contain scenery/dormant bud, four survivor views, and two active-sentinel views/collectible/border plant. Inspected per-row gutters in `lib/theme-art.ts` preserve complete silhouettes; generated columns are not a uniform grid. Alpha bounds anchor each sprite to the ground.

Exact prompts are in [themes/generation-prompts.json](themes/generation-prompts.json). Built-in image generation used the owner's three concept boards. Runtime assets are WebP (atlas quality 92 with preserved alpha; opaque paintings quality 86), approximately 3.9 MB across all three sets. They are loaded on selection, with original art as the fallback. No external image service is used at runtime. See [implementation and checks](../../docs/watercolor-themes.md).


### Reference fidelity additions

The three themes also include `sign.webp` and `ground.webp`: individual painted menu plaques and walkable scenery washes. Shared `themes/paper.webp` supplies the cream ink-edged HUD surface. These seven assets were generated with the built-in image tool using the same reference boards; [exact prompts](themes/fidelity-prompts.json) are retained. WebP quality 91 preserves their transparent edges. The complete theme directory is approximately 6.3 MiB. Moonbloom borrows the cream-clad human row from the Sunseed atlas to match the board's traveler.
