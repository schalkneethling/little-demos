# little-demos

Small, self-contained web demos for exploring CSS, HTML, and browser behaviour. Each demo lives in its own folder with plain HTML, CSS, and JavaScript — no framework required.

## Demos

| Demo                                          | Description                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [accent-color](./accent-color/)               | Theme native form controls and a button with a shared `accent-color` custom property.      |
| [crisp-edges](./crisp-edges/)                 | Scale pixel art and compare default browser smoothing with `image-rendering: crisp-edges`. |
| [property-transition](./property-transition/) | Register custom properties with `@property` so CSS transitions can interpolate them.       |

## Getting started

Install dependencies with [Vite+](https://viteplus.dev/guide/):

```bash
vp install
```

Run the development server and open a demo in the browser:

```bash
vp dev
```

Then visit [http://localhost:5173/crisp-edges/](http://localhost:5173/crisp-edges/), [http://localhost:5173/accent-color/](http://localhost:5173/accent-color/), or [http://localhost:5173/property-transition/](http://localhost:5173/property-transition/).

## Development

This project uses Vite+ (`vp`) for tooling. See [AGENTS.md](./AGENTS.md) for the full review checklist.

| Task                                 | Command         | Notes                                   |
| ------------------------------------ | --------------- | --------------------------------------- |
| Install dependencies                 | `vp install`    | Run after pulling changes               |
| Dev server                           | `vp dev`        | Serves demos from the repo root         |
| Format, lint, and type-check (JS/TS) | `vp check`      | Oxlint, Oxfmt, and tsgolint             |
| Full project check                   | `bun run check` | Includes Stylelint for CSS              |
| Tests                                | `vp test`       | Vitest unit tests                       |
| Build library                        | `vp pack`       | Packages the TypeScript entry in `src/` |

Fix formatting and auto-fixable lint issues:

```bash
vp check --fix
bun run lint:fix
```

## Project structure

```
little-demos/
├── accent-color/         # Native form control theming demo
│   ├── index.html
│   ├── css/main.css
│   ├── js/main.js
│   └── media/
├── crisp-edges/          # Pixel art scaling demo
│   ├── index.html
│   ├── css/main.css
│   └── js/main.js
├── property-transition/  # Registered custom property transition demo
│   ├── index.html
│   ├── css/main.css
│   ├── css/properties.css
│   └── js/main.js
├── .claude-toolkit/      # Canonical agent skill definitions
├── .claude/skills/       # Symlinks for Claude Code
├── .cursor/skills/       # Symlinks for Cursor
├── src/                  # TypeScript library entry (Vite+ starter)
└── tests/                # Unit tests
```

Each demo is a standalone folder. Add new demos at the repository root following the same layout: `index.html`, `css/`, and `js/`.

## Agent guidance

Coding agent skills (semantic HTML, CSS patterns, testing, security) are installed from [claude-toolkit](https://github.com/schalkneethling/claude-toolkit). The source files live in `.claude-toolkit/skills/` and are symlinked into:

- `.claude/skills/` for Claude Code
- `.cursor/skills/` for Cursor

## License

MIT © Schalk Neethling. See [LICENSE](./LICENSE).
