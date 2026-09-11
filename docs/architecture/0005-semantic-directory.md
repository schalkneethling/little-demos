# ADR 0005: Provide an equivalent semantic directory

- Status: Accepted
- Date: 2026-07-30

## Context

Canvas movement cannot be the only route to demos. Some people use touch,
switches, assistive technology, small screens, or simply prefer conventional
navigation. Rendering can also fail.

## Decision

Expose every available demo through a semantic HTML directory generated from the
same registries as the fairground. The directory is a complete route, not a
reduced fallback. World activation is deliberate and never required to browse
demos.

## Consequences

Every demo must be tested from both entry routes. Small screens may default to
the directory. The document remains navigable and useful before or without
Phaser initialisation.
