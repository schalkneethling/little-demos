# Little Demos — Implementation Plan

**Purpose:** A Codex-ready technical and delivery specification for an explorable, isometric fairground that acts as the navigation interface for a collection of interactive web demos.

**Working title:** Little Demos  
**Primary experience:** Explore a fairground as a small character, approach attractions, and open demos in accessible HTML dialogs.  
**Fallback experience:** Browse and open every demo through a conventional semantic directory without using the fairground.

---

## 1. Product vision

Little Demos should feel like a small, charming place rather than a conventional portfolio grid. Each demo is represented by a fairground attraction, booth, food stand, or entertainment area. The user moves a character around the fairground with a keyboard. When the character approaches an attraction, the attraction is identified and an explicit interaction prompt appears. Activating the attraction opens the corresponding demo in a modal dialog layered above the fairground. Closing the dialog returns the user to the world and plays a brief exit animation.

The fairground is an enhancement, not the only navigation mechanism. Every demo must remain discoverable and operable through semantic HTML.

---

## 2. Core principles

1. **Build the interaction before the illustration.**  
   Validate movement, collision, camera behaviour, interaction zones, dialogs, focus restoration, and responsive behaviour using temporary geometry.

2. **Treat the fairground as level design.**  
   Paths, spacing, entrances, sightlines, and collision boundaries are functional decisions.

3. **Use generated artwork as art direction, not as a flattened implementation.**  
   The production world must be assembled from separate, reusable assets.

4. **Keep demos in the DOM.**  
   The game world may be canvas-rendered, but demos, headings, controls, descriptions, and dialogs must use semantic HTML.

5. **Provide an equivalent non-game route.**  
   Users must be able to reach every demo without moving the character.

6. **Prefer deterministic, data-driven behaviour.**  
   Attractions, triggers, demo metadata, visited state, and asset references should be defined in data rather than scattered through scene code.

7. **Ship a vertical slice before expanding the world.**  
   One attraction with the complete interaction loop is more valuable than a visually complete but non-functional fairground.

---

## 3. Recommended technical direction

### 3.1 Rendering model

Use a **2.5D isometric world** rendered through a 2D game framework.

Recommended initial stack:

- **Vite**
- **TypeScript**
- **Phaser**
- Native HTML, CSS, and `<dialog>` for the application shell and demos
- Vitest for unit and integration-level logic tests
- Playwright for end-to-end, keyboard, accessibility, and visual regression tests
- axe-core through Playwright for automated accessibility checks

The fairground should use a fixed isometric or near-isometric camera. The player moves on a two-dimensional navigation plane; depth is a rendering and sorting concern rather than true 3D geometry.

### 3.2 Why not full 3D initially

Full 3D would add camera control, 3D asset production, lighting, model loading, texture budgets, occlusion, and broader performance risks without improving the core demo-navigation loop enough to justify the cost.

The architecture should not prevent a future 3D version, but the first production version should be 2.5D.

### 3.3 Framework boundary

Phaser owns:

- World rendering
- Sprite animation
- Player movement
- Collision detection
- Camera movement
- Attraction proximity detection
- World state presentation
- Decorative animation

The DOM application owns:

- Page landmarks and heading structure
- Introductory content
- Demo directory
- Interaction instructions
- Current-attraction text
- Dialog lifecycle
- Demo content
- Focus management
- Reduced-motion controls
- Audio controls
- Settings
- Error messages and loading status

The two layers communicate through a narrow event bridge.

---

## 4. Scope

### 4.1 Version 1 scope

Version 1 should include:

- A compact explorable fairground
- One entrance area and central plaza
- 6–8 attractions
- One player character
- Eight-direction movement, or four-direction movement if animation cost is a concern
- Collision with scenery and attraction structures
- Attraction interaction zones
- Explicit activation using Enter, Space, or a visible DOM control
- Demo dialogs
- Exit animations
- Visited-state indicators
- A semantic demo directory
- Keyboard support
- Pointer/touch alternative controls or direct directory access
- Reduced-motion mode
- Persistent settings
- Responsive desktop and tablet layouts
- A simplified small-screen presentation
- Automated tests and basic performance budgets

### 4.2 Explicitly out of scope for Version 1

- Multiplayer
- User accounts
- Inventory
- Currency or ticket systems
- Open-world procedural generation
- Free camera rotation
- Dynamic day/night cycles
- Complex NPC behaviour
- Physics-based rides
- Full 3D models
- User-created attractions
- Server-side persistence
- Narrative quests
- A dependency-heavy content-management system

---

## 5. Experience model

### 5.1 Primary loop

1. The page loads.
2. The user sees the page title, a short explanation, controls, and a start or explore action.
3. The fairground initializes.
4. Focus moves to an appropriate world control or remains in the application shell according to the chosen start flow.
5. The user moves the character.
6. The character enters an attraction’s interaction zone.
7. The attraction highlights.
8. The attraction name and a short instruction appear in DOM text.
9. The user activates the attraction.
10. Movement and world-level shortcuts pause.
11. The corresponding demo opens in a modal dialog.
12. The user interacts with the demo.
13. The user closes the dialog.
14. Focus returns to the world control or the element that opened the dialog.
15. The character appears to exit the attraction.
16. Movement resumes.
17. The attraction is marked as visited.

### 5.2 Interaction must not be proximity-only

Crossing a trigger boundary must not automatically open a dialog. Proximity should only select the attraction and expose an activation prompt.

Default controls:

- Move: Arrow keys or WASD
- Interact: Enter or Space
- Close demo: Escape or dialog close button
- Open directory: D, plus a visible button
- Toggle instructions: `?`, plus a visible button
- Pause world: automatically while a dialog is open
- Mute audio: visible button; keyboard shortcut optional

Do not rely on keyboard shortcuts as the only way to perform any action.

### 5.3 World startup

Avoid immediately capturing keyboard input on page load. The page should begin as an ordinary document.

Recommended start flow:

- Heading and introduction
- “Explore the fairground” button
- “Browse all demos” link or button
- Controls summary
- Fairground preview or initialized but inactive canvas

Selecting “Explore the fairground” activates world controls and places focus on a dedicated focusable world container.

---

## 6. Fairground layout

### 6.1 First functional map

The initial map should contain:

- Entrance arch with “Little Demos” signage
- Main avenue
- Central plaza
- Ferris wheel
- Carousel
- Roller coaster or compact coaster façade
- Haunted house or funhouse
- Arcade tent
- Skill-game booth
- Corn-dog or snack stand
- Cotton-candy stand
- Rest area
- “Coming soon” construction plot

Not every visual structure must represent a demo. Decorative and non-interactive structures help the place feel coherent, but interactive attractions must be visually distinguishable.

### 6.2 Layout rules

- Keep main paths broad.
- Avoid one-tile bottlenecks.
- Keep interaction zones clear of collision corners.
- Ensure every attraction entrance faces a traversable path.
- Avoid placing important entrances behind tall foreground objects.
- Provide more than one route around the central plaza.
- Keep the initial world compact enough that crossing it does not become tedious.
- Keep attraction entrances separated enough that interaction zones do not overlap.
- Reserve expansion edges for future attractions.
- Provide a recognisable visual landmark near the spawn point.
- Ensure the user can return to the entrance without navigating a maze.

### 6.3 Recommended initial world dimensions

Treat these as starting values, not immutable requirements:

- Logical world grid: approximately 30 × 24 cells
- Isometric tile source size: approximately 128 × 64 pixels
- Player collision footprint: materially smaller than the visible sprite
- Main paths: at least 2–3 logical cells wide
- Interaction zone depth: approximately 1–2 cells in front of an entrance
- Camera viewport: enough to show the player and at least one nearby landmark

Tune dimensions through playtesting rather than matching the concept art literally.

---

## 7. Architecture

### 7.1 High-level structure

```text
Browser document
├── Application shell
│   ├── Header and introduction
│   ├── Explore controls
│   ├── Status and instructions
│   ├── Fairground host
│   │   └── Phaser canvas
│   ├── Demo directory
│   ├── Settings
│   └── Demo dialog host
│
├── World runtime
│   ├── Boot scene
│   ├── Fairground scene
│   ├── Player controller
│   ├── Collision system
│   ├── Interaction system
│   ├── Camera controller
│   ├── Depth-sorting system
│   ├── Animation system
│   └── World-state adapter
│
└── Shared application state
    ├── Active mode
    ├── Active attraction
    ├── Open demo
    ├── Visited demos
    ├── Settings
    └── Loading/error state
```

### 7.2 Suggested source structure

```text
src/
├── app/
│   ├── bootstrap.ts
│   ├── app-controller.ts
│   ├── app-state.ts
│   ├── events.ts
│   └── persistence.ts
│
├── world/
│   ├── create-game.ts
│   ├── config.ts
│   ├── scenes/
│   │   ├── boot-scene.ts
│   │   └── fairground-scene.ts
│   ├── player/
│   │   ├── player-controller.ts
│   │   ├── player-animation.ts
│   │   └── player-types.ts
│   ├── attractions/
│   │   ├── attraction-registry.ts
│   │   ├── attraction-controller.ts
│   │   └── attraction-types.ts
│   ├── systems/
│   │   ├── collision-system.ts
│   │   ├── interaction-system.ts
│   │   ├── depth-sort-system.ts
│   │   ├── camera-system.ts
│   │   └── reduced-motion-system.ts
│   ├── map/
│   │   ├── fairground-map.ts
│   │   ├── map-loader.ts
│   │   └── coordinate-utils.ts
│   └── bridge/
│       ├── world-events.ts
│       └── world-adapter.ts
│
├── demos/
│   ├── demo-registry.ts
│   ├── demo-types.ts
│   ├── demo-loader.ts
│   └── entries/
│       ├── example-one/
│       │   ├── index.ts
│       │   ├── demo.ts
│       │   └── demo.css
│       └── ...
│
├── ui/
│   ├── fairground-shell.ts
│   ├── demo-dialog.ts
│   ├── demo-directory.ts
│   ├── interaction-prompt.ts
│   ├── instructions-panel.ts
│   ├── settings-panel.ts
│   └── loading-state.ts
│
├── styles/
│   ├── global.css
│   ├── tokens.css
│   ├── layout.css
│   ├── dialog.css
│   └── utilities.css
│
├── assets/
│   ├── world/
│   ├── player/
│   ├── attractions/
│   ├── props/
│   └── audio/
│
└── main.ts
```

The exact component model may change if the host site already uses React, Preact, Svelte, or Web Components. Keep the world-to-DOM boundary unchanged.

---

## 8. State model

### 8.1 Application state

```ts
type AppMode =
  | "document"
  | "exploring"
  | "demo-open"
  | "directory-open"
  | "paused"
  | "error";

interface AppState {
  mode: AppMode;
  worldReady: boolean;
  activeAttractionId: string | null;
  openDemoId: string | null;
  visitedDemoIds: Set<string>;
  lastPlayerPosition: { x: number; y: number } | null;
  settings: UserSettings;
}
```

### 8.2 User settings

```ts
interface UserSettings {
  reducedMotion: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  movementScheme: "arrows-and-wasd" | "arrows-only" | "wasd-only";
  showInteractionHints: boolean;
  highContrastWorldIndicators: boolean;
}
```

Respect `prefers-reduced-motion` by default. A user override may be stored locally.

### 8.3 Attraction model

```ts
interface AttractionDefinition {
  id: string;
  demoId: string | null;
  name: string;
  shortDescription: string;
  category: string;
  position: { x: number; y: number };
  entrancePosition: { x: number; y: number };
  interactionZone: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  collisionShapes: CollisionShape[];
  assetKey: string;
  highlightAssetKey?: string;
  exitAnimation?: ExitAnimationDefinition;
  status: "available" | "coming-soon" | "decorative";
  sortAnchor?: { x: number; y: number };
}
```

### 8.4 Demo model

```ts
interface DemoDefinition {
  id: string;
  title: string;
  summary: string;
  category: string;
  attractionId: string;
  load: () => Promise<DemoModule>;
  status: "available" | "draft" | "coming-soon";
  tags: string[];
  instructions?: string;
  sourceUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
}
```

### 8.5 Demo module contract

```ts
interface DemoModule {
  mount(container: HTMLElement, context: DemoContext): void | Promise<void>;
  unmount?(): void | Promise<void>;
}

interface DemoContext {
  signal: AbortSignal;
  announce(message: string): void;
}
```

Every demo must clean up event listeners, timers, observers, workers, media streams, and generated DOM during unmount.

---

## 9. Event bridge

Avoid allowing Phaser scenes to manipulate dialog DOM directly.

Suggested events from world to application:

```ts
type WorldEvent =
  | { type: "world-ready" }
  | { type: "attraction-entered"; attractionId: string }
  | { type: "attraction-left"; attractionId: string }
  | { type: "attraction-activated"; attractionId: string }
  | { type: "player-position-changed"; x: number; y: number }
  | { type: "world-error"; error: Error };
```

Suggested commands from application to world:

```ts
type WorldCommand =
  | { type: "activate-controls" }
  | { type: "deactivate-controls" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "play-attraction-exit"; attractionId: string }
  | { type: "set-visited"; demoId: string }
  | { type: "teleport-to-attraction"; attractionId: string }
  | { type: "apply-settings"; settings: UserSettings };
```

Use `EventTarget`, a small typed event emitter, or a minimal application controller. Do not add a broad state-management dependency unless the implementation demonstrates a real need.

---

## 10. Scene design

### 10.1 Boot scene

Responsibilities:

- Load the minimum assets required for the first paint.
- Display progress through the DOM loading UI.
- Validate the attraction and demo registries.
- Initialize map data.
- Transition to the fairground scene.
- Emit `world-ready`.

Do not load every demo’s JavaScript during world boot.

### 10.2 Fairground scene

Responsibilities:

- Render the map.
- Instantiate scenery and attractions.
- Instantiate the player.
- Configure collision.
- Detect proximity.
- Manage the camera.
- Perform depth sorting.
- Pause and resume world updates.
- Reflect visited and unavailable states.

Keep dialog and demo details out of the scene.

### 10.3 Depth sorting

For isometric presentation, sort world objects using their ground-contact position rather than the top-left corner of their visible image.

Each object should expose a sort anchor. A common starting approach is:

```ts
depth = sortAnchor.y;
```

For larger structures, use a deliberate anchor at the point where the structure meets the ground. Split very large foreground structures into separate layers when required so the player can correctly pass behind and in front of them.

### 10.4 Occlusion

Use a combination of:

- Correct depth anchors
- Semi-transparent foreground treatment where appropriate
- Deliberate path placement
- Optional roof or canopy fading
- Camera framing
- Avoidance of tall objects immediately in front of entrances

Do not solve every occlusion problem through transparency; the map layout should prevent most of them.

---

## 11. Player movement

### 11.1 Movement behaviour

- Support arrows and WASD by default.
- Normalize diagonal velocity so diagonal movement is not faster.
- Use velocity-based movement rather than directly changing position per key event.
- Stop movement when controls are inactive or a dialog is open.
- Prevent default page scrolling only while the fairground control has focus and the relevant movement key is being handled.
- Do not capture keys when focus is inside a form field, interactive demo, dialog control, or directory.
- Keep movement speed configurable.
- Save position only after meaningful movement and with throttling.

### 11.2 Collision footprint

The visual character sprite may be taller than its ground footprint. Use a small collision body around the character’s feet. This reduces snagging and matches the visual world.

### 11.3 Animation

Minimum animation set:

- Idle
- Walk north
- Walk north-east
- Walk east
- Walk south-east
- Walk south
- Walk south-west
- Walk west
- Walk north-west
- Enter attraction
- Exit attraction

A four-direction sprite set is acceptable for the first grey-box version.

### 11.4 Exit sequence

On dialog close:

1. Keep world movement paused.
2. Hide or reposition the character at the attraction entrance if needed.
3. Play an exit animation moving from inside the entrance to the interaction zone.
4. Restore the player’s idle state.
5. Resume movement.
6. Restore world focus.
7. Mark the attraction as visited.

Under reduced motion:

- Skip the walking sequence.
- Place the character at the exit point immediately.
- Resume controls without decorative delay.

---

## 12. Attraction interaction system

### 12.1 Proximity states

Each interactive attraction may be in one of these states:

- Inactive
- Nearby
- Selected
- Activating
- Demo open
- Exiting
- Visited
- Unavailable

Only one attraction may be selected at a time.

If zones overlap despite layout safeguards, select the closest entrance using the distance from the player’s ground position.

### 12.2 Interaction prompt

The prompt should be DOM-rendered and associated with a live status region carefully enough to avoid repetitive announcements.

Example visual content:

```text
Carousel
A small animation timing demo.
Press Enter to explore.
```

The prompt must include:

- Attraction name
- Short description or demo title
- Activation instruction
- Availability state

Avoid announcing the same message on every frame. Announce only when the selected attraction changes.

### 12.3 Visual highlighting

Use one or more of:

- Entrance light
- Outline
- Animated sign
- Ground marker
- Arrow
- Subtle scale or brightness change

Reduced-motion mode should replace animated indicators with static emphasis.

Do not rely on colour alone.

---

## 13. Dialog and demo lifecycle

### 13.1 Dialog requirements

Use a native modal `<dialog>` where supported by the project’s browser policy.

Each dialog requires:

- Accessible name
- Demo title
- Demo summary or instructions
- Visible close button
- Demo mount point
- Optional source-code link
- Optional previous/next demo navigation
- Error state
- Loading state

### 13.2 Opening sequence

1. Receive an attraction activation event.
2. Resolve the corresponding demo definition.
3. Pause world updates.
4. Deactivate world keyboard controls.
5. Store the element that currently owns focus.
6. Open the dialog.
7. Show a loading state.
8. Dynamically import the demo.
9. Mount the demo.
10. Move focus to the dialog heading, first meaningful control, or a deliberate introductory element.
11. Update URL state if deep linking is enabled.

### 13.3 Closing sequence

1. Abort the current demo context.
2. Call the demo’s unmount method.
3. Clear the mount container.
4. Close the dialog.
5. Update visited state.
6. Remove demo URL state.
7. Command the world to play the exit sequence.
8. Restore focus after the exit sequence, or immediately in reduced-motion mode.
9. Resume movement.

### 13.4 Failure handling

If a demo fails to load:

- Keep the dialog open.
- Display an understandable error message.
- Offer Retry and Close actions.
- Log technical details separately.
- Do not leave world controls active behind the dialog.
- Ensure closing still restores the world correctly.

---

## 14. Demo isolation

Demos are likely to vary significantly. Prevent one demo from destabilizing the shell.

### 14.1 Required controls

- Lazy-load each demo.
- Give each demo its own root element.
- Scope styles through a naming convention, Shadow DOM, CSS layers, or a combination.
- Use an `AbortSignal` in the demo context.
- Require cleanup on unmount.
- Do not allow demos to register global keyboard listeners without cleanup.
- Do not allow demos to mutate application-level CSS custom properties without restoring them.
- Do not load third-party libraries globally.
- Review every dependency added by a demo for bundle, privacy, security, and maintenance impact.

### 14.2 Optional iframe isolation

Use an iframe only for demos that genuinely require stronger isolation, conflicting dependencies, navigation, or unusual document-level behaviour.

Iframe demos must have:

- A meaningful title
- Explicit sandbox permissions
- A defined resizing strategy
- A message protocol
- A fallback explanation
- No unnecessary permissions

Do not make iframe isolation the default because it complicates sizing, focus, communication, and shared styling.

---

## 15. Semantic directory and alternate navigation

### 15.1 Directory requirements

The directory must expose the same available demos as the world registry.

Each entry should include:

- Demo title
- Summary
- Category
- Attraction name
- Visited state
- Availability
- Open action

Optional:

- Search
- Category filters
- Sort by newest, title, or recently updated
- “Locate in fairground” action
- “Continue exploring” action

### 15.2 Single source of truth

Generate the directory and world attraction relationships from the same registries. Do not maintain a separate manual list.

### 15.3 Locate action

A “Locate in fairground” action may:

1. Close or collapse the directory.
2. Activate world mode.
3. Move the camera to the attraction.
4. Optionally teleport the player to a nearby valid path position.
5. Highlight the attraction.
6. Announce the result.

Teleporting should be an explicit user action, not an automatic effect of merely focusing a directory item.

---

## 16. Accessibility requirements

### 16.1 Baseline

Target WCAG 2.2 Level AA for the application shell, demo directory, dialogs, controls, and included demos.

### 16.2 Keyboard

- All functionality must be keyboard operable.
- The page must remain navigable as a normal document.
- Entering world-control mode must be deliberate.
- Exiting world-control mode must be easy and documented.
- Dialog focus must remain within the modal while open.
- Escape should close the dialog unless a demo temporarily needs Escape; any exception must be documented and provide an equivalent close control.
- Focus must return predictably.
- World shortcuts must not fire while focus is inside demo controls.
- No keyboard trap may exist in the world or demos.

### 16.3 Canvas alternative

The canvas does not need to expose every decorative object to assistive technology. It must have:

- A meaningful accessible name
- Concise instructions
- Current location or nearby-attraction status in DOM text
- A complete semantic directory alternative
- No duplicate noisy representation of all world decoration

### 16.4 Motion

- Respect `prefers-reduced-motion`.
- Provide an explicit user setting.
- Remove or reduce camera easing, bobbing, attraction animation, particle effects, and exit walks.
- Avoid parallax that cannot be disabled.
- Do not use flashing effects.
- Never make progress dependent on waiting for a decorative animation.

### 16.5 Sound

- Do not autoplay audio before user interaction.
- Provide independent mute controls if music and effects differ.
- Persist user preference.
- Do not encode critical information through sound alone.
- Ensure audio does not continue unexpectedly after leaving the page or opening a demo.

### 16.6 Colour and visibility

- Do not rely on colour alone for nearby, visited, selected, or unavailable states.
- Ensure prompt text meets contrast requirements.
- Provide high-contrast world indicators.
- Test browser zoom and operating-system scaling.
- Avoid tiny text inside raster assets for critical labels; render important names as HTML.

### 16.7 Touch and switch access

The primary desktop world may use keyboard movement, but users must still be able to access demos through visible controls and the directory.

A later enhancement may provide:

- On-screen directional controls
- Click/tap-to-move
- Gamepad support

These are enhancements, not substitutes for the semantic directory.

---

## 17. Responsive strategy

### 17.1 Large screens

- Fairground occupies a substantial but bounded viewport.
- Supporting instructions and controls remain visible.
- Camera follows the player within the world bounds.
- Dialog can use a large presentation area.

### 17.2 Medium screens

- Reduce surrounding chrome.
- Preserve minimum fairground interaction size.
- Allow instructions to collapse.
- Ensure dialogs do not exceed viewport height.

### 17.3 Small screens

Do not shrink the full desktop fairground until it becomes illegible.

Recommended approach:

- Present the demo directory as the default.
- Offer a simplified world mode if performance and usability allow.
- Use touch controls or tap-to-move only after testing.
- Keep demos fully usable.
- Avoid landscape-only requirements.
- Explain when the exploratory view works best on a larger display without blocking access.

### 17.4 Resize behaviour

- Resize the renderer without recreating the entire game.
- Preserve player position.
- Recalculate camera bounds.
- Pause movement during disruptive orientation changes.
- Ensure the dialog remains stable independently of canvas resizing.

---

## 18. Map and asset pipeline

### 18.1 Concept stage

Create:

1. A functional top-down map.
2. A perspective and composition guide.
3. Generated concept art based on the functional map.
4. A visual language sheet.
5. An asset inventory.

### 18.2 Asset inventory

At minimum:

- Ground tile set
- Path tile set
- Edge and corner tiles
- Entrance arch
- Fences
- Lamps
- Benches
- Trees and planters
- Signs
- Waste bins
- Attraction exteriors
- Interaction highlights
- Player sprite sheet
- Construction-area assets
- Ambient decorative assets

### 18.3 Production rules

- Keep source artwork at a consistent scale.
- Use transparent backgrounds.
- Define ground anchors for every object.
- Define collision shapes separately from visible bounds.
- Avoid critical text baked into assets.
- Use texture atlases when they materially reduce requests and improve rendering.
- Keep original source files separate from optimized runtime assets.
- Document export settings.
- Generate multiple resolution variants only where testing demonstrates a need.

### 18.4 Placeholder-first policy

Codex should implement with geometric placeholders and labelled temporary assets. Production artwork must not block functional milestones.

---

## 19. Persistence and URL state

### 19.1 Local persistence

Reasonable local preferences:

- Visited demo IDs
- Reduced-motion override
- Sound settings
- Control scheme
- Optional last player position

Use versioned storage:

```ts
interface PersistedStateV1 {
  version: 1;
  visitedDemoIds: string[];
  lastPlayerPosition?: { x: number; y: number };
  settings: UserSettings;
}
```

Invalid or incompatible stored data must fail safely.

### 19.2 Deep links

Recommended URL patterns:

```text
/demos/
/demos/?demo=animation-timing
/demos/#demo=animation-timing
```

A direct demo link should:

1. Load the shell.
2. Open the requested demo dialog.
3. Keep the fairground available in the background.
4. On close, return to the directory or world according to the entry context.

Do not encode live player coordinates in normal share URLs.

---

## 20. Performance budgets

Set budgets before adding production art.

Initial targets for a modern desktop connection:

- Application shell interactive without waiting for all world art.
- Initial world bundle separated from demo bundles.
- No demo code loaded until requested, except tiny shared utilities.
- Stable movement at 60 fps on the primary target hardware.
- Graceful 30 fps floor on lower-powered supported devices.
- Avoid large frame-time spikes during attraction proximity checks.
- Avoid per-frame DOM updates.
- Avoid recreating sprites or geometry in the update loop.
- Avoid unbounded particles.
- Pause or substantially reduce rendering when the page is hidden.
- Pause the world while a demo dialog is open unless a deliberate background animation is retained and proven inexpensive.
- Compress textures appropriately.
- Prefer a few coherent atlases over hundreds of small requests.
- Track total decoded texture memory, not only transfer size.

Define measurable project-specific bundle and asset budgets after the grey-box prototype establishes realistic baselines.

---

## 21. Security and privacy

- Do not inject untrusted HTML into demos or metadata.
- Validate URL-derived demo IDs against the registry.
- Avoid broad iframe permissions.
- Avoid analytics that record raw keyboard input.
- Do not collect movement history unless there is a clear product need.
- Review all third-party demo dependencies.
- Use a restrictive Content Security Policy compatible with the deployment.
- Do not dynamically execute code from remote URLs.
- Keep source links separate from executable demo modules.
- Ensure error reporting excludes sensitive user-provided demo content.

---

## 22. Testing strategy

### 22.1 Unit tests

Test:

- Coordinate conversion
- Diagonal speed normalization
- Attraction selection
- Overlapping-zone resolution
- Registry validation
- Demo-to-attraction relationships
- Persistence parsing and migration
- Settings defaults
- URL state parsing
- Reduced-motion decisions
- Event bridge state transitions

### 22.2 Integration tests

Test:

- Activating world controls
- Movement pause and resume
- Entering and leaving attraction zones
- Prompt updates
- Opening a demo
- Loading failure
- Demo cleanup
- Dialog closure
- Exit sequence
- Visited-state persistence
- Directory opening the same demos
- Deep-link opening

### 22.3 End-to-end keyboard tests

At minimum:

1. Load the page using only the keyboard.
2. Read instructions.
3. Activate fairground exploration.
4. Move to the first attraction.
5. Confirm the prompt appears.
6. Activate the attraction.
7. Confirm focus enters the dialog.
8. Interact with the demo.
9. Close using the visible close button.
10. Confirm focus returns.
11. Confirm movement works again.
12. Open the directory.
13. Open a different demo.
14. Confirm no world shortcut leaks into the dialog.

### 22.4 Accessibility tests

Automate:

- axe checks on the initial document
- axe checks with the directory open
- axe checks with every demo dialog open
- focus order
- visible focus
- dialog name
- focus containment
- focus restoration
- reduced-motion mode
- 200% and 400% zoom layouts where practical
- keyboard-only operation

Manual checks:

- Screen reader flow
- Announcement frequency
- Canvas alternative quality
- High-contrast mode
- Windows forced-colours mode
- Browser text zoom
- Motion sensitivity review
- Touch target sizing
- Small-screen directory experience

### 22.5 Visual regression tests

Capture stable views for:

- Entrance
- Central plaza
- Every attraction
- Nearby highlight
- Visited state
- Coming-soon state
- Reduced-motion indicators
- Major viewport classes
- Dialog presentation

Disable non-deterministic particles and animations in visual-test mode.

### 22.6 Performance tests

Track:

- Initial JavaScript
- World chunk size
- Per-demo chunks
- Asset transfer size
- Texture memory estimate
- Startup duration
- Long tasks
- Frame consistency while moving
- Frame consistency near animated attractions
- Dialog-open idle cost
- Memory after repeatedly opening and closing demos

---

## 23. Observability

Development-only diagnostics should include:

- Current player coordinates
- Current attraction zone
- Active collision bodies
- Sort anchors
- Camera bounds
- FPS
- Loaded asset count
- Active demo
- World mode
- Reduced-motion state

Hide diagnostics in production unless enabled by an explicit debug query parameter.

Log recoverable errors through a small boundary:

```ts
interface AppErrorReport {
  area: "world" | "demo" | "persistence" | "assets";
  code: string;
  message: string;
  cause?: unknown;
  demoId?: string;
  attractionId?: string;
}
```

---

## 24. Delivery phases

## Phase 0 — Repository and decision record

### Goal

Establish the project skeleton and lock the major architecture boundaries.

### Tasks

- Initialize Vite and TypeScript.
- Configure linting, formatting, type checking, Vitest, and Playwright.
- Add baseline HTML document structure.
- Add CSS tokens and page layout.
- Add architectural decision records:
  - 2.5D instead of full 3D
  - Phaser world plus DOM application shell
  - Native dialog
  - Data-driven registries
  - Semantic directory as equivalent access
- Add CI for type checking, unit tests, end-to-end smoke tests, and builds.
- Add a basic deployment preview.
- Add bundle analysis.
- Define supported browsers.
- Add a strict dependency-review note to the contributing guide.

### Exit criteria

- Production build succeeds.
- CI runs.
- Initial page has a heading, introduction, Explore button, and directory placeholder.
- Phaser can mount and unmount cleanly.
- No world code owns dialog DOM.

---

## Phase 1 — Functional map and grey-box world

### Goal

Validate the world scale, camera, movement, collision, and layout.

### Tasks

- Define a temporary logical map.
- Add flat ground and paths.
- Add placeholder attraction blocks.
- Add placeholder player sprite.
- Implement camera bounds and follow.
- Implement keyboard activation mode.
- Implement arrows and WASD.
- Normalize diagonal movement.
- Implement collision bodies.
- Add a debug collision overlay.
- Add resize handling.
- Add world pause/resume commands.
- Add reduced-motion plumbing, even if little animation exists yet.

### Exit criteria

- Player can traverse the whole map.
- Player cannot pass through attraction structures.
- No major route contains snagging or bottlenecks.
- Camera never exposes outside-world voids unintentionally.
- Page scrolling is not broken when the world lacks focus.
- Movement stops when the world loses control.
- The map remains usable at target desktop and tablet viewport sizes.

---

## Phase 2 — First complete attraction vertical slice

### Goal

Complete the entire loop with one attraction.

### Tasks

- Add one attraction definition.
- Add an entrance and interaction zone.
- Add proximity selection.
- Add DOM interaction prompt.
- Add explicit activation.
- Add demo registry.
- Implement dynamic demo loading.
- Implement the native dialog.
- Implement focus entry and restoration.
- Pause and resume the world.
- Implement demo cleanup.
- Implement exit animation.
- Add visited state.
- Add a directory entry opening the same demo.
- Add deep-link support for the demo.
- Add failure and retry behaviour.

### Exit criteria

- The attraction can be reached and activated by keyboard.
- Touching the zone alone does not open the demo.
- The prompt is updated without repeated announcements.
- Dialog focus is correct.
- World input cannot leak into the dialog.
- Closing restores a usable state.
- The exit sequence plays or is skipped under reduced motion.
- The same demo is accessible from the directory.
- Direct linking works.
- Automated keyboard and accessibility tests pass.

**This phase is the first release candidate for an internal prototype.**

---

## Phase 3 — Data-driven attraction system

### Goal

Make additional attractions mostly a content and asset task.

### Tasks

- Finalize attraction and demo schemas.
- Add registry validation.
- Generate directory content from registry data.
- Instantiate attractions from definitions.
- Add unavailable and decorative states.
- Add visited styling.
- Add interaction-zone conflict detection.
- Add development warnings for:
  - Missing demo
  - Missing asset
  - Overlapping interaction zones
  - Invalid entrance position
  - Duplicate IDs
  - Unreachable attraction metadata
- Add a test helper for registering temporary demos.

### Exit criteria

- A new attraction can be added without modifying the interaction system.
- Registry errors fail clearly in development.
- Directory and fairground cannot drift apart.
- Coming-soon entries are represented consistently.

---

## Phase 4 — Art direction and asset pipeline

### Goal

Replace grey-box presentation with a coherent production visual system.

### Tasks

- Finalize functional map.
- Generate concept art from the functional map.
- Extract visual-language decisions:
  - Perspective
  - Palette
  - Materials
  - Lighting
  - Character scale
  - Signage
  - Attraction silhouette
- Produce the asset inventory.
- Establish export and optimization scripts.
- Create ground and path tiles.
- Create environmental props.
- Create production player sprite.
- Replace one attraction completely before producing all others.
- Validate depth sorting and occlusion.
- Add visual-regression test mode.
- Document anchor and collision conventions.

### Exit criteria

- One production-quality area proves the art pipeline.
- Assets sort correctly.
- Collision does not depend on opaque pixels.
- Critical labels are not baked into raster artwork.
- Runtime asset sizes remain within the provisional budget.
- Art can be replaced independently of interaction code.

---

## Phase 5 — Complete initial fairground

### Goal

Populate the initial compact world.

### Tasks

- Add 6–8 attractions.
- Add decorative structures.
- Add central plaza landmark.
- Add entrance signage.
- Add coming-soon plot.
- Add visited-state treatments.
- Add restrained ambient animation.
- Add world map or directory shortcut.
- Add optional locate-in-world feature.
- Tune path widths and world crossing time.
- Tune camera dead zone and easing.
- Add attraction categories.
- Add persistent visited state and optional position restoration.

### Exit criteria

- Every attraction is reachable.
- No interaction zones overlap unintentionally.
- World traversal remains enjoyable rather than slow.
- Every demo is reachable through the directory.
- Camera and occlusion issues have been resolved.
- The fairground has a coherent visual hierarchy.
- Expansion edges remain available.

---

## Phase 6 — Responsive and input expansion

### Goal

Make the experience robust outside the primary desktop keyboard case.

### Tasks

- Finalize tablet layout.
- Finalize small-screen directory-first experience.
- Evaluate tap-to-move.
- Evaluate on-screen direction controls.
- Add pointer activation for visible world prompts if useful.
- Test orientation changes.
- Add optional gamepad support only after keyboard and touch paths are stable.
- Ensure no input mode hides or blocks another.

### Exit criteria

- Every demo is accessible on small screens.
- No orientation lock is required.
- Touch targets meet size requirements.
- Keyboard remains fully supported.
- The project does not pretend the full world is usable when the viewport makes it illegible.

---

## Phase 7 — Hardening and release

### Goal

Prepare for public deployment.

### Tasks

- Run complete accessibility review.
- Run performance profiling on representative hardware.
- Test slow network and asset failures.
- Test repeated demo mounting/unmounting.
- Test local-storage corruption.
- Test unsupported or disabled WebGL fallback.
- Add a canvas/rendering failure fallback to the directory.
- Review CSP.
- Review third-party dependencies.
- Optimize texture loading.
- Add metadata, social preview, and favicons.
- Add privacy-conscious analytics only if required.
- Finalize documentation for adding a new demo.
- Create release checklist.
- Conduct user testing with keyboard-only and non-game navigation.

### Exit criteria

- Critical and serious accessibility violations are resolved.
- All demos clean up correctly.
- The page remains useful when the world fails to initialize.
- Performance budgets pass.
- CI is green.
- Deployment rollback is documented.
- Adding a new demo is documented and reproducible.

---

## 25. Vertical-slice acceptance criteria

Codex should treat these as non-negotiable for the first functional milestone.

### World

- [ ] The world is rendered from data.
- [ ] The player can move using arrows and WASD.
- [ ] Diagonal movement is normalized.
- [ ] Collision uses the player’s ground footprint.
- [ ] Camera movement remains inside world bounds.
- [ ] World input activates only after deliberate user action.
- [ ] World input pauses when a dialog opens.

### Attraction

- [ ] One attraction has a separate collision shape and interaction zone.
- [ ] Entering the zone selects but does not activate it.
- [ ] The attraction is identified in visible DOM text.
- [ ] Enter or Space activates it.
- [ ] Leaving the zone removes the prompt.
- [ ] Re-entering does not duplicate listeners or announcements.

### Dialog

- [ ] The demo opens in a modal HTML dialog.
- [ ] The dialog has an accessible name.
- [ ] A visible close button is present.
- [ ] Focus enters the dialog.
- [ ] Escape closes the dialog.
- [ ] Focus returns predictably.
- [ ] Loading and error states are accessible.
- [ ] Demo cleanup runs on close.

### Return to world

- [ ] An exit sequence plays after closing.
- [ ] Reduced-motion mode skips the decorative sequence.
- [ ] Movement resumes only after the return sequence completes.
- [ ] The attraction becomes visited.
- [ ] Visited state is persisted.

### Equivalent access

- [ ] The same demo appears in a semantic directory.
- [ ] The directory can open the demo without the world.
- [ ] The page remains useful if Phaser fails to initialize.
- [ ] A direct URL can open the demo.

### Quality

- [ ] Type checking passes.
- [ ] Unit tests pass.
- [ ] Keyboard end-to-end test passes.
- [ ] Automated accessibility checks pass.
- [ ] No uncaught error occurs after ten open/close cycles.
- [ ] No global listeners or timers remain after demo unmount.

---

## 26. Definition of done for each new demo

A demo is complete only when:

- It has a registry entry.
- It has a related attraction or an intentional directory-only designation.
- It has a title and useful summary.
- It lazy-loads.
- It works with keyboard input.
- It has visible focus.
- It passes automated accessibility checks.
- It supports browser zoom.
- It cleans up after itself.
- It does not leak global CSS.
- It handles reduced motion where relevant.
- It does not autoplay audio.
- Its dependencies have been reviewed.
- It has at least one end-to-end smoke test.
- It has a stable direct URL.
- It works when opened from the directory.
- It works when opened from the fairground.
- Its source or explanation link is included when appropriate.

---

## 27. Codex implementation instructions

Codex should follow these operating constraints:

1. Implement one phase at a time.
2. Do not start production artwork before Phase 2 passes.
3. Prefer small, reviewable commits.
4. Add tests with each behavioural change.
5. Do not add a dependency without documenting:
   - Why it is needed
   - Alternatives considered
   - Client bundle impact
   - Maintenance status
   - Whether it runs in the end-user environment
6. Keep Phaser-specific code inside `src/world`.
7. Keep demo DOM and dialog management outside Phaser.
8. Do not use canvas text for critical instructions.
9. Do not infer collision from image dimensions.
10. Do not open demos automatically on collision.
11. Do not capture global keyboard input while the user is interacting with page or demo controls.
12. Do not build separate hard-coded fairground and directory inventories.
13. Keep every demo lazy-loaded.
14. Implement cleanup before adding multiple demos.
15. Treat accessibility failures as implementation defects, not post-launch polish.
16. Use placeholders when assets are unavailable.
17. Record material architecture changes in decision records.
18. Stop a phase when its exit criteria pass and produce a review summary before proceeding.

---

## 28. Suggested first Codex task

```text
Implement Phase 0 and the minimum portion of Phase 1 for Little Demos.

Create a Vite + TypeScript application with:

- A semantic document shell containing:
  - h1: Little Demos
  - Introductory paragraph
  - “Explore the fairground” button
  - “Browse all demos” button
  - Controls/instructions region
  - Fairground host
  - Empty demo directory
  - Empty native dialog host
- A Phaser world mounted only inside the fairground host
- A temporary rectangular ground plane
- A placeholder player character
- Keyboard movement using arrows and WASD
- Normalized diagonal movement
- A deliberate world-control activation state
- Correct prevention of page scrolling only while world movement is active
- Pause, resume, activate-controls, and deactivate-controls commands
- Basic resize handling
- A debug overlay that can show player coordinates and FPS
- Vitest unit tests for movement-vector normalization
- A Playwright test proving the page can be navigated before world controls are activated
- An architecture document describing the boundary between Phaser and the DOM

Do not add production artwork, demo content, complex state-management libraries, audio, particles, or multiple scenes beyond what is necessary for boot and the fairground.

Before finishing:
- Run type checking.
- Run unit tests.
- Run Playwright.
- Run the production build.
- Summarize changed files, architectural decisions, test results, and the next Phase 1 tasks.
```

---

## 29. Suggested second Codex task

```text
Complete the Little Demos Phase 2 vertical slice using the existing Phase 0–1 foundation.

Add exactly one interactive attraction and one minimal demo.

Requirements:

- Define the attraction and demo through typed registries.
- Give the attraction:
  - A visible placeholder structure
  - A collision body
  - A separate interaction zone
  - A clear entrance position
- Entering the interaction zone must:
  - Select the attraction
  - Highlight it
  - Update a DOM-rendered prompt
  - Not open the demo automatically
- Enter or Space must activate the selected attraction.
- Activation must:
  - Pause world movement
  - Deactivate world shortcuts
  - Open a native modal dialog
  - Dynamically import and mount the demo
  - Place focus correctly
- Closing must:
  - Abort and unmount the demo
  - Clear the demo root
  - Mark the attraction as visited
  - Play a placeholder exit sequence
  - Skip the sequence under reduced motion
  - Restore focus and movement
- Generate a semantic directory entry from the same registry.
- The directory entry must open the same demo.
- Add direct URL support for the demo.
- Add loading, failure, Retry, and Close states.
- Add automated tests for:
  - Proximity without automatic activation
  - Keyboard activation
  - Dialog focus
  - World input isolation
  - Cleanup
  - Focus restoration
  - Reduced-motion return
  - Directory access
  - Direct URL access
  - axe checks

Do not add additional attractions until this vertical slice meets every acceptance criterion.
```

---

## 30. Key open decisions

These decisions can be deferred until the grey-box prototype provides evidence:

- Four-direction or eight-direction player artwork
- Fixed camera versus follow camera with dead zone
- Exact isometric angle
- Whether player position persists
- Whether directory access pauses or hides the world
- Whether demos support previous/next navigation
- Whether tap-to-move is worthwhile
- Whether optional gamepad support adds enough value
- Whether the world includes ambient NPCs
- Whether large attractions require multi-part sprites
- Whether selected attractions use HTML labels positioned over the canvas or a fixed status region
- Whether a mini-map adds value or unnecessary complexity

Do not defer:

- DOM/canvas separation
- Explicit activation
- Semantic directory
- Demo cleanup
- Reduced-motion support
- Focus management
- Data-driven registries
- Lazy loading
- Failure fallback

---

## 31. Final architectural outcome

A successful implementation will have three loosely coupled layers:

1. **The fairground world**  
   A visually expressive, game-like navigation surface.

2. **The demo platform**  
   A lifecycle-managed collection of lazy-loaded interactive modules.

3. **The accessible web application**  
   The semantic shell, directory, instructions, dialogs, settings, URLs, and fallbacks.

The fairground should make Little Demos memorable. The underlying document structure should make it reliable, accessible, indexable, maintainable, and resilient.
