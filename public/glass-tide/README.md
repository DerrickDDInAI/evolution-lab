# Glass Tide runtime artwork

Generated on 2026-10-20 with the built-in `image_gen.imagegen` tool for Pursuit Lab's tilted Glass Tide branch. Exact prompts and transparency settings are in [generation-prompts.json](generation-prompts.json).

- `sprites.png`: original transparent 1536×1024 atlas, three columns and two rows. Cells, in row order: shell flora, colony ruin, survivor, active sentinel, dormant sentinel, small fern clump. The renderer samples equal cells directly; the generated alpha is preserved.
- `shallows.png`: opaque, low-contrast pearl-silt/teal-water ground texture, repeated in world space.

The artwork uses original biological and survivor forms. The user's film/series references guided atmosphere and material choices; no film stills or promotional artwork are shipped as runtime assets. No external asset service or runtime image generation is required.

See [implementation and verification](../../docs/glass-tide-implementation.md) for projection, contact-footprint and readability constraints.
