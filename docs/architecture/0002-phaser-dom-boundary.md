# ADR 0002: Separate the Phaser world from the DOM shell

- Status: Accepted
- Date: 2026-07-30

## Context

The fairground benefits from a game runtime, but navigation, instructions,
settings, dialogs, and demos must remain accessible as ordinary web content.

## Decision

Phaser owns world rendering, movement, collision, camera behaviour, proximity,
and decorative state. The DOM application owns document landmarks, controls,
status text, the demo directory, dialogs, focus, settings, and errors. They
communicate through typed events and commands. World code lives under
`src/world`; it must not query or mutate dialog DOM.

## Consequences

The page remains useful if rendering fails. The event boundary adds a little
ceremony, but prevents scene code from becoming an application controller and
makes both sides independently testable.
