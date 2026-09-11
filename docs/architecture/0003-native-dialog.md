# ADR 0003: Use native modal dialogs

- Status: Accepted
- Date: 2026-07-30

## Context

Demos need a modal surface with predictable semantics, keyboard behaviour, focus
containment, and an explicit close action.

## Decision

Use the native HTML `dialog` element and `showModal()` for demo presentation
within the supported-browser policy. The DOM application manages loading,
focus, cleanup, errors, and focus restoration.

## Consequences

The platform supplies modal semantics and focus containment. Tests must still
verify the accessible name, Escape and close-button behaviour, initial focus,
and focus restoration. A compatibility fallback may be added only if browser
support evidence requires it.
