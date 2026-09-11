# Production source provenance

Generated on 2026-09-11 with the built-in image-generation tool using the approved concept at `docs/art/concepts/arcade-direction-v1.png` as a style reference. Independently generated transparent sources; not extracted pieces of the concept.

| Source             | Natural dimensions | Intended output                                  |
| ------------------ | ------------------ | ------------------------------------------------ |
| arcade.png         | 1254 × 1254        | 320 × 310 anchored pavilion                      |
| player.png         | 960 × 1639         | 4 × 4 normalized frames, each 34 × 58            |
| player-walk-v2.png | 1246 × 1263        | Corrected walking sheet, 4 × 4 normalized frames |
| planter.png        | 1254 × 1254        | 28 × 28 low prop                                 |

Source PNGs remain unchanged. Alpha > 10 was an inspection aid for measuring subject bounds; explicit two-pixel padding is recorded in the inventory. The exporter applies recorded rectangles, not implicit alpha trimming. Generated rows were not equally registered, so sixteen explicit player rectangles fit the same content box and foot baseline. Collision and ground anchors remain independent.

The near-isometric concept is adapted to front-facing elevated orthographic production cutouts so the south entrance and axis-aligned collision footprint remain legible. Critical text is not baked into artwork. Source PNGs are excluded from runtime imports and budgets.

## Arcade prompt

Use case: stylized-concept. Reference image is APPROVED STYLE only. Generate ONE isolated production game sprite: the teal painted-timber arcade pavilion with coral/cream scalloped striped awning and blank mustard stepped marquee from the reference. Fully transparent background, no ground, NO cast shadow, no props, no people, no labels/text. Front-facing elevated orthographic view, symmetrical front opening centered at bottom, horizontal ground-contact baseline, roof visible behind; avoid diagonal projected ground footprint. Matte handcrafted material, much simpler surface detail than concept so legible at320x310 logical pixels. Broad silhouette, subtle navy edge separation, two simplified dark arcade cabinets inside the opening. Preserve blank sign face and warm palette. Entire building fully inside image with small transparent margin, square canvas. Sprite ONLY, no sheet or environment. This is a cutout for a 2D navigation game, not scene illustration.

## Player prompt

Use case: stylized-concept. Production game sprite sheet on GENUINELY TRANSPARENT background. Reference is approved character/style only. Exactly 4 columns by 4 rows, precisely equal cells with generous transparent margins; no grid lines no labels no shadows no background no props. SAME tiny friendly adult visitor in mustard hooded jacket, dark blue trousers, dark simple shoes, short dark hair, subtly rounded proportions. Handcrafted matte miniature game art, clean simple silhouettes, no face detail necessary, no outline heavy pixel-art. Full body in every cell, feet on identical local baseline, same apparent height and width across frames, no overlapping cells. Row1 faces viewer/south, row2 faces left/west, row3 faces right/east, row4 faces away/north. In EACH row columns: idle feet together, walking left leg forward, walking feet passing, walking right leg forward. Arms swing subtly opposite feet; no positional jumping, no bobbing. Orthographic elevated game view, consistent upper-left light. Center each figure at same local anchor, compact body, clear separation between shoes. Sheet tall portrait aspect ratio approximating 136:232. Render exactly16 isolated characters, no extra character or object. Will be downsampled to34x58 pixels per frame so prioritize strong simple shapes and consistent registration.

## Planter prompt

Use case: stylized-concept. Production game sprite, ONE isolated low square planter from approved reference style. Pale cream painted timber crate with a small rounded cluster of sage/teal leaves, a few broad light leaf accents, no individual flowers or tiny detail. Elevated orthographic front view matching front-facing arcade sprite, horizontal ground baseline, vertical edges vertical, warm upper-left light. True transparent background, no ground patch, NO cast shadow, no text labels watermark or extra objects. Entire compact planter centered with small transparent margin. Handcrafted matte miniature, clean silhouette, lightly navy edge separation. Readable when reduced to28x28 logical pixels, therefore simple rather than intricate. Square canvas.

## Player walking correction

Native and optimized review found overly similar south/north steps in `player.png`.
That original is retained for provenance but is superseded by `player-walk-v2.png`.
A reference-edit attempt was rejected for a painted checkerboard and insufficient
pose correction; it is not an export input. The replacement was generated fresh
with the same visual language, now with small eyes and more distinct opposed steps.
Its explicit measured crops preserve the original runtime frame and physics contract.

### Replacement prompt

Create a transparent-background game sprite sheet, 4 columns and 4 rows, no checkerboard painted in image. Cute miniature handcrafted matte 3D-like cartoon human visitor, short charcoal hair, mustard yellow hooded jacket, dark navy trousers, brown shoes, small featureless face. ALL sixteen sprites are same character size, evenly placed, whole bodies separated by large transparent margins. Elevated frontal orthographic camera. Row1 faces viewer south. Row2 faces left west. Row3 faces right east. Row4 faces away north. Each row's columns: 1 standing neutral feet side by side; 2 walking left foot forward right foot back; 3 walking passing pose feet aligned crossing below hips; 4 walking right foot forward left foot back. IMPORTANT col2 and col4 legs are OPPOSITE poses, not duplicates. In front row col2 shoe on IMAGE RIGHT is clearly LOW, shoe on IMAGE LEFT is clearly HIGH; col4 shoe on IMAGE LEFT is clearly LOW, IMAGE RIGHT is clearly HIGH. In back row also visibly swap which shoe extends lower between cols2 and4. Arms counter-swing correspondingly. Torso stays centered in its cell, feet ground contact same baseline, constant height, coherent anatomy. Stylized clear silhouettes readable at34x58px individual sprite. Each full character has generous transparent margin all sides. True empty alpha background, no grey, no checker pattern, no floor, no ground shadows, no text, no grid, no scenery. Production-ready modular game assets.
