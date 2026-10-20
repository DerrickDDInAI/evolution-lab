# Visual directions: a planet defending its equilibrium

Date: 2026-10-20. Status: the user selected **tilted Glass Tide** and requested implementation on a new branch. See [implementation and verification](glass-tide-implementation.md). The proposals and comparison below preserve the design exploration; new gameplay mechanics remain proposals.

## Accepted brief and intent

Humanity has fled to a vast Earth-like planet where nature is sovereign. A simple native life form perceives settlers as a threat to ecological equilibrium and genetically adapts to pursue and kill them. Human survival ultimately depends on adaptation and respect. Present the response as instinctive biology, not a malicious villain or a proven scientifically realistic mechanism.

The user requests a lush sci-fi survival arena, immense flora, bioluminescence, overgrown colony wreckage, floating translucent seed-pod/chitin sentinels, atmospheric light and a diegetic organic interface. Supplied references: a *The Wild Robot* promotional image (tactile rounded machinery, warmth, vulnerability within nature) and a *Scavengers Reign* poster triptych (unfamiliar biological forms, ecosystem relationships and overwhelming landscape scale). These are mood references, not characters or compositions to reproduce. Original reference files remain in the user's attachment history; they are not runtime dependencies.

Desired experience: wonder on arrival, vulnerability during pursuit, and the sense of being a guest within a functioning ecosystem. Originality should come from biological relationships and behavior, as well as surface decoration.

## 01 — Verdant Wound

[Concept board](design/2026-10-20/01-verdant-wound.png)

- **World:** cathedral roots and giant fern crowns engulf a failed ivory-ceramic colony. Warm shafts of sunlight reveal jade mist and amber spores. Tiny human remnants establish scale.
- **Arena:** the settlement's exposed clearing is a wound in the forest. Root buttresses reclaim its edges; four root arches mark passages. Wreckage and rooted nodules distinguish solid obstacles from quiet traversable ground.
- **Sentinels:** one recognizable seed organism with a translucent jade envelope and amber core. Harmless folded husks open into compact three-lobed hunters with chitin fins. No robot face or villainous eyes.
- **Survivors:** repaired ceramic rain-shells, soft dark joints, seed-shaped life-support packs and an asymmetric rust-colored cloth marker. Use silhouette and cloth patterns to distinguish people at game scale.
- **Interface:** a wearable lichen symbiont forms pale membranes, breathing lamellae and a leaf-vein map. At rest it folds against the wrist/backpack; expanded information is a close view of that physical organ.
- **Strength/tradeoff:** clearest emotional link to settlement versus wilderness; needs stranger plant structures and behaviors to avoid becoming an ordinary overgrown jungle.

## 02 — Glass Tide

[Concept board](design/2026-10-20/02-glass-tide.png)

- **World:** a lush translucent wetland under lilac daylight. Bladder trees, shell terraces, coral-like reeds and drowned colony ribs stretch into haze.
- **Arena:** a continuous shallow basin with clear dry/silt paths and rooted obstacle islands. Water may initially be decorative; currents, swimming or jumping would require separate mechanics and collision decisions.
- **Sentinels:** floating glassy seed pods expose branching nerves and coral-colored nuclei. Fine cilia steer beneath compact chitin stabilizers. Growth stages share a core silhouette so players recognize the species.
- **Survivors:** kelp-fiber split mantles, ochre ceramic breathing hoods and asymmetric salvaged field kits. Dark legs and warm shoulders separate humans from translucent fauna.
- **Interface:** a symbiotic pearl membrane with a ribbed respiration organ; pigment gathers in its veins to show movement energy and known positions. Numerals sit on opaque readable patches.
- **Strength/tradeoff:** the most unfamiliar biological direction. Transparency and reflective ground risk concealing threats; gameplay sprites need consistent solid cores, outlines and shadows.

## 03 — Mycelial Choir

[Concept board](design/2026-10-20/03-mycelial-choir.png)

- **World:** a dusk forest of enormous fungi and dark trunks connected by softly luminous capillaries. A ruined colony observatory disappears beneath a living canopy.
- **Arena:** a quiet moss clearing around a central germination bed. Root passages and fungal shelves contain the playable area; luminous paths suggest an ecosystem responding as a whole.
- **Sentinels:** ivory husks unfold into dark chitin crescents surrounding an amber seed abdomen. Folded/open poses distinguish harmless and active organisms without relying on color alone.
- **Survivors:** warm ivory fabric/ceramic suits with a single leaf shoulder mantle, visible human proportions and small woven identity markings.
- **Interface:** an attached membrane collects amber sap in breathing chambers. Vein signals travel slowly between the suit organ and its map. Keep this motion subtle and provide a static reduced-motion equivalent.
- **Strength/tradeoff:** best expression of a connected planetary immune response; excessive darkness, pulses or ornate framing would impair navigation and push the tone toward fantasy horror.

## Biological feedback that communicates real game state

The interface should have an in-world source: a proposed wearable organism that humans have learned to cooperate with. This symbiosis is a narrative proposal. A readable screen-space close-up of its organs is acceptable for top-down play, provided the matching physical organ is visible on the character. Organic borders alone do not make a HUD diegetic.

| Existing information/action | Proposed expression | Readability and truthfulness |
| --- | --- | --- |
| Sprint energy | Lamellae fill/open at rest and contract as energy is spent | Retain a labeled, countable gauge; not a health bar |
| Survival duration | Quiet precise numerals on a matte membrane | Preserve timing precision; the art's `01:24` is illustrative |
| Generation/countdown | Seed chamber gradually prepares to germinate | Keep explicit generation/countdown and paused state; preparation must reflect actual simulation state |
| Harmless warm-up | Closed pale seed, compact silhouette and visible progress | Opening marks actual activation, including delayed activation when a spawn is occupied |
| Minimap | Leaf-vein diagram with distinct human/seed/gate symbols | Show only data the current game legitimately exposes |
| Pending contact | Membrane briefly holds its breath; explicit confirmation label | Stop the displayed run immediately; distinguish confirmed versus rejected reports |
| Lost connection | Signal veins become static/dim plus a plain recovery message | Do not present a network failure as a new ecological threat |
| Join/help/history | Symbiont unfurls into a readable field-journal membrane | Preserve names, keyboard focus, normal text, touch targets and empty/error states |
| Training details/export | Optional naturalist's record of generations and lineages | Retain honest NEAT-inspired terminology and current export behavior |

Keep menus restrained and the playfield dominant. The generated boards exaggerate frames and organism size to communicate the concepts; the production HUD should be lighter. Decorative veins must not cross text, obscure contact positions or imply new resources. Do not add oxygen, health, ammunition or ecosystem-alignment meters without an accepted mechanic.

## Glass Tide camera comparison — 2026-10-20

The user requested Glass Tide views using the current top-down camera approach and a tilted alternative. This initially selected Glass Tide for exploration; the later user request selected the tilted camera for implementation. These two generated mockups reuse approximately the same local arena layout, palette, organisms, timer values and HUD placement for comparison; they are not pixel-exact reprojections or live game screenshots.

| View | Image | Design implication |
| --- | --- | --- |
| Overhead | [Top-down mockup](design/2026-10-20/glass-tide-top-down.png) | Closest to the current flat X/Y renderer: small hood/shoulder and seed silhouettes, recognizable obstacle footprints, clear space around actors. New artwork/rendering work would still be required. |
| Tilted | [Tilted mockup](design/2026-10-20/glass-tide-tilted.png) | Shows character bodies, seed anatomy and ruin height. Needs a planned projection, depth ordering and occlusion treatment; tilting the whole canvas would also distort the HUD and is insufficient. |

The top-down image was revised after an initial pass retained too much oblique perspective. The retained pair reduces the earlier large interface border into separate timer/sprint and map organs. These are art targets, not pixel-perfect specifications: dense water detail, some large plants, scale and precise collision alignment still need validation in a playable slice. For a strict overhead implementation, use consistently zenithal production sprites even where painted details imply relief.

Recommendation for comparison: retain overhead for immediate movement/contact clarity; explore tilted if showing biological forms and world height is the stronger priority. Keep gameplay geometry and authoritative contacts unchanged while testing either presentation. A tilted version should fade occluding foliage or show actor silhouettes without revealing information the game does not otherwise expose.

At the comparison stage, no gameplay, runtime assets or behavior changed. Verification at that stage: visual inspection of both mockups and local documentation-link checks, not browser or performance testing. The [camera prompt set](design/2026-10-20/glass-tide-camera-prompts.json) records the built-in image-generation prompts. The user subsequently selected tilted; see the implementation record above.

## Recommendation and implementation boundary

Recommended base: **Verdant Wound**, with the transparent internal anatomy explored in **Glass Tide**. Use Mycelial Choir's restrained environmental signaling as a behavior reference, not an additional competing visual theme. This was the initial recommendation; the user subsequently chose tilted Glass Tide.

The original implementation at `93a20c9` was a top-down Canvas game: `lib/renderer.ts` draws circular players, arrow-like bots, circular obstacles and a rectangular arena with four doors. `app/page.tsx` contains the HUD and panels. The concept paintings use a more cinematic perspective and expanded creature scale; they are art references, not screenshots, production sprites or evidence of a working camera/terrain change.

The selected implementation uses the bounded visual slice: one survivor, one sentinel in folded/active states, one obstacle, one gate and the sprint/timer UI, rendered at actual game scale. Keep current movement, hitboxes, contact timing, safe entry, private data and score behavior. Root silhouettes can dress existing geometry; any changed arena geometry or perspective needs a separate design and verification decision. Decorative ground details must not look solid if they have no collision.

Genetic visual variation is a separate proposal. Do not imply that longer fins or additional limbs provide new speed/sensing abilities unless the simulation implements those traits. Existing neural evolution can remain represented by lineage markings and subtle visual variation without changing rules.

The story currently leaves the repeated death/outside-respawn loop unexplained. Resolve extraction, nonliteral training runs or another narrative convention before shipping story text; do not silently add cloning or resurrection lore.

## Review and next handoff

The selected direction is now tilted Glass Tide. Next is user review of the actual implementation and remaining device/readability checks. The user owns selection; the implementing agent owns technical and experience review, with user review of visual intent.

Acceptance for the first playable slice: distinguish player, active sentinel, harmless seed, gate and solid obstacle at default zoom and on a narrow viewport; collision silhouettes remain accurate; critical timings and confirmation/recovery messages are readable; keyboard/touch use and reduced motion remain supported. Run the existing regression/type checks when implementing and review the complete join → enter → pursuit → contact → respawn → saved-score journey. Explicitly test multiple simultaneous actors for visual clutter.

Evidence from the original proposal stage: source inspection and visual review of three images generated with the built-in image tool. Each contains a world/arena scene, survivor and sentinel studies, and interface detail. No gameplay code changed; no browser, performance or user test was performed. Cinematic framing, scale and ornate UI need translation into the actual renderer. Exact prompts are retained in [generation-prompts.json](design/2026-10-20/generation-prompts.json).
