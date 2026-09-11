# Little Demos

An explorable fairground for small, interactive web demos. The Phaser world is
an enhancement over a semantic application shell: every demo will also be
available through a conventional HTML directory.

The current milestone is Phase 3: a data-driven, viewport-filling grey-box
fairground with validated attraction, demo, and asset registries. Dynamic
JavaScript Imports is available at the arcade; Zipper is available through the
HTML directory. Both support accessible dialogs, direct links, visited-state
persistence, and keyboard access without entering the world. The Funhouse is
marked coming soon; the remaining landmarks are decorative.

## Demos

| Demo                                                        | Description                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [accent-color](./accent-color/)                             | Theme native form controls and a button with a shared `accent-color` custom property.      |
| [crisp-edges](./crisp-edges/)                               | Scale pixel art and compare default browser smoothing with `image-rendering: crisp-edges`. |
| [property-transition](./property-transition/)               | Register custom properties with `@property` so CSS transitions can interpolate them.       |
| [dynamic-javascript-imports](./dynamic-javascript-imports/) | Load optional slider navigation on demand.                                                 |
| [zipper](./zipper/)                                         | Compress and decompress local files using browser streams.                                 |

## Getting started

Install dependencies with [Vite+](https://viteplus.dev/guide/):

```bash
vp install
```

Run the development server:

```bash
vp dev
```

Then visit [http://localhost:5173/](http://localhost:5173/). The existing
standalone demos remain available at their folder paths while they are migrated
into the registry-driven platform.

## Development

This project uses Vite+ (`vp`) for tooling. See [AGENTS.md](./AGENTS.md) for the full review checklist.

| Task                         | Command           | Notes                                     |
| ---------------------------- | ----------------- | ----------------------------------------- |
| Install dependencies         | `vp install`      | Run after pulling changes                 |
| Dev server                   | `vp dev`          | Serves the app and standalone demos       |
| Format, lint, and type-check | `vp check`        | Oxfmt, Oxlint, Stylelint, and TypeScript  |
| Unit tests                   | `vp test --run`   | Vitest                                    |
| Browser tests                | `vp run test:e2e` | Build first; Playwright Chromium plus axe |
| Production build             | `vp build`        | Builds the Vite application               |

Fix formatting and auto-fixable lint issues:

```bash
vp check --fix
bun run lint:fix
```

## Project structure

```
little-demos/
├── index.html               # Semantic application shell
├── src/
│   ├── app/                 # DOM application state and controller
│   ├── styles/              # Tokens, shell, layout, and utilities
│   └── world/               # Phaser-only world runtime
├── tests/
│   ├── app/                 # Application unit tests
│   ├── runtime/             # Lifecycle and bridge tests
│   ├── world/               # Movement tests
│   └── e2e/                 # Playwright keyboard and axe tests
├── docs/architecture/       # Architecture decision records
├── accent-color/            # Existing standalone demo
├── crisp-edges/             # Existing standalone demo
└── property-transition/     # Existing standalone demo
```

The existing root demos remain standalone. Integrated demos are registered in
`src/demos/demo-registry.ts` and implement the isolated mount/unmount lifecycle.
Attraction geometry lives in `src/world/attractions/attraction-registry.ts`;
directory-only demos do not need world geometry. Use `?demo=zipper` or
`?demo=dynamic-javascript-imports` for direct links, and `?debug-world` for
development diagnostics.

## Camera navigation

Drag with the mouse or scroll with two fingers over the world to look around.
Alt/Option + scroll changes camera zoom. Pinch, Ctrl+scroll, and browser zoom
shortcuts keep their native page-magnification behavior. The collapsible View
controls panel provides keyboard- and touch-accessible pan/zoom buttons and
Return to player. Moving the player restores camera follow. Camera gestures
do not operate over dialogs or the directory, and zoom stays within map bounds.

## Adding a demo or attraction

1. Add demo metadata to `src/demos/demo-registry.ts`. Available demos provide a
   lazy loader returning a fresh mount/unmount instance. Coming-soon and
   unavailable entries have no loader. Use `attractionId: null` for directory-only
   demos.
2. For a world attraction, add its placeholder asset metadata to
   `src/world/assets/asset-registry.ts` and its definition to
   `src/world/attractions/attraction-registry.ts`. Both sides of the demo/attraction
   relationship must agree, including availability. Decorative attractions have
   no demo. Do not add structures to the map or special cases to the scene.
3. Keep visual dimensions, collision rectangles, and interaction zones separate.
   Entrance positions and exit endpoints locate the player's visual centre; interaction
   selection and clearance use the shared player-foot geometry. The development
   validator checks references, geometry, conflicts, and conservative reachability.
4. Run `vp check`, `vp test --run`, `vp build`, and `vp run test:e2e`. Invalid
   catalogs prevent world startup; development builds show detailed diagnostics.
   The semantic directory remains available.

Tests can use `tests/helpers/temporary-demo.ts` to create isolated, validated
registrations without mutating the application catalog. See the fixture test in
`tests/runtime/temporary-demo.test.ts` for a complete attraction example.

## Agent guidance

Coding agent skills (semantic HTML, CSS patterns, testing, security) are installed from [claude-toolkit](https://github.com/schalkneethling/claude-toolkit). The source files live in `.claude-toolkit/skills/` and are symlinked into:

- `.claude/skills/` for Claude Code
- `.cursor/skills/` for Cursor

## License

MIT © Schalk Neethling. See [LICENSE](./LICENSE).
