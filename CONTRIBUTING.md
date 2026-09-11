# Contributing

Run `vp install` after pulling changes. Before requesting review, run:

```sh
vp check
vp test
vp run build
```

Run any end-to-end script declared in `package.json` as well.

## Dependencies

Do not add a runtime or development dependency without recording:

- the capability it provides;
- alternatives considered, including the platform;
- client bundle impact;
- maintenance status;
- whether it runs in the end-user environment.

Prefer browser APIs and focused dependencies. Demo-specific code must lazy-load,
clean up listeners and timers on unmount, and avoid global CSS or global keyboard
handlers.

## Architecture constraints

- Keep Phaser-specific code in `src/world`.
- Keep dialogs, instructions, settings, and demos in the DOM application.
- Communicate across that boundary with typed events and commands.
- Derive the fairground and semantic directory from the same registries.
- Never open a demo solely because the player entered a proximity zone.
- Treat accessibility failures as implementation defects.
- Use placeholders until the Phase 2 vertical slice passes.
