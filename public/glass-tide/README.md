# Glass Tide runtime artwork

Generated on 2026-10-20 with the built-in `image_gen.imagegen` tool for Pursuit Lab's tilted Glass Tide branch. Exact prompts and transparency settings are in [generation-prompts.json](generation-prompts.json).

- `sprites.png`: original transparent 1536×1024 atlas, three columns and two rows. Cells, in row order: shell flora, colony ruin, survivor, active sentinel, dormant sentinel, small fern clump. The renderer samples equal cells directly; the generated alpha is preserved.
- `shallows.png`: opaque, low-contrast pearl-silt/teal-water ground texture, repeated in world space.

The artwork uses original biological and survivor forms. The user's film/series references guided atmosphere and material choices; no film stills or promotional artwork are shipped as runtime assets. No external asset service or runtime image generation is required.

See [implementation and verification](../../docs/glass-tide-implementation.md) for projection, contact-footprint and readability constraints.

## Directional update

`directions.png` is a new transparent 1254×1254 generated atlas with survivor views in the top two rows and active sentinel views in the lower two. The renderer selects inspected front/back/profile/three-quarter poses and mirrored counterparts for eight-way facing; explicit source rows and anchors prevent clipping and foot drift. The dormant seed retains its original closed form. Exact initial and correction prompts are in [directional-prompts.json](directional-prompts.json). Generated originals were copied without alpha alteration.

## Sprint animation

`sprint.png` contains five survivor views (front, front-right, right, back-right, back) with four sprint phases each. Left views mirror the corresponding right views. Explicit row boundaries and hip/foot anchors keep bodies aligned while cape and limbs move. The renderer samples the original alpha without image postprocessing. [Sprint prompts](sprint-prompts.json) include the initial generation and gait correction.

## Walking animation

`walk.png` provides four upright, short-step walking phases for five camera views, mirrored for eight headings. The separate walking cadence is driven by travelled distance. Explicit atlas rows and hip/foot anchors preserve alignment; original generated alpha is unchanged. See [walking prompt](walk-prompts.json).
