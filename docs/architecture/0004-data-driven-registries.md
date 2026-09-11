# ADR 0004: Use data-driven registries

- Status: Accepted
- Date: 2026-07-30

## Context

Attractions appear in both the rendered world and the semantic directory.
Maintaining separate lists would allow their identifiers, availability, and demo
relationships to drift.

## Decision

Typed attraction and demo registries are the single source of truth. World
objects and directory entries are derived from them. Demo modules are loaded
only when requested and implement an explicit mount/unmount contract.

## Consequences

Registry validation becomes a required development check. Adding an attraction
is mostly data and assets after the interaction system stabilises. Demo cleanup
and relationship integrity can be tested without rendering the full world.
