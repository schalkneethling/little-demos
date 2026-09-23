# Spatial approval preview

The isolated `/spatial-preview.html` route is a playable 3,200 × 2,400 blockout. It changes no production scene or demo behavior. The six demo associations retain their existing artwork; construction is marked as unfinished. The route is for reviewing space and one representative fountain-garden treatment, not accepting final scenery.

## Circulation and review walk

- Arrive from the south. The southern promenade frames Dynamic JavaScript Imports to the west and Layer Cake Stand to the east. Both entrances face the promenade; exits return to it.
- Walk north into the fountain court. Its west and east connections lead into one continuous loop around the landmark.
- Follow the west loop north to the Ferris wheel/Zipper and Accent Color Carousel approaches. Both exits lead south toward the loop.
- Follow the east loop to Property Transition Stage and Crisp Edges Booth; their spurs lead to south-facing entrances and back to the loop.
- Continue northeast from the upper east spur to the quieter construction plot; return by the same spur. This plot does not launch a demo.

The on-page plan draws every route and stop. Dark dots mark approaches, light dots mark exits. Paths communicate circulation; grass remains walkable. Choose **Explore** for Arrow keys/WASD; Escape, focus loss, page hiding, or window blur stops movement. Drag to pan, then choose **Return to player**.

## Evidence and limits

- Local Playwright captures at 1× play scale, 1,456 × 900: `/private/tmp/little-demos-refinement/arrival.png`, `fountain.png`, and `rides.png`. Fountain and rides captures use manual camera pan to inspect those areas; a separate timed keyboard run exercised movement from the south arrival. No page errors occurred.
- At 320 × 800, the page has no horizontal overflow and Phaser's canvas and CSS dimensions match (288 × 480).
- Geometry tests cover world size, six associations plus construction, clear approaches/exits, player-footprint route connectivity, and planting bounds. `vp test tests/world/spatial-prototype.test.ts`, `vp check`, and scoped Stylelint pass.
- Prototype paths use 15 world-aligned, tight-bounds canvas-clipped textures: 2,934,450 allocated pixels, about 11.19 MiB RGBA CPU proxy **plus** GPU uploads. This is an approval-only rendering workaround after Phaser 4 WebGL filter-mask misalignment in the proof. Production PR 3 still needs a correct, profiled renderer-specific mask strategy; do not copy this allocation pattern blindly.
- The fountain artwork and loaded planters use their native ground contact. Planting islands, tufts, benches, and several path joins are still blockout-grade. They need visual refinement before treating the garden as finished. User approval of the layout and corner remains open; production expansion is gated on that review.
