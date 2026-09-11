/** Light-dismiss the shell panels without interfering with a native modal dialog. */
export function createPanelDismissal() {
  const panels = [
    ...document.querySelectorAll<HTMLDetailsElement>(
      "[data-demo-directory], [data-camera-controls], [data-control-deck]",
    ),
  ];
  const listeners = new AbortController();
  const { signal } = listeners;
  const modalOpen = () => !!document.querySelector("dialog[open]");
  const close = (panel: HTMLDetailsElement) => {
    panel.open = false;
  };

  document.addEventListener(
    "keydown",
    (event) => {
      // World Escape has its own stop-exploring/focus-restoration action.
      if (event.key !== "Escape" || event.defaultPrevented || modalOpen()) return;
      const openPanels = panels.filter((panel) => panel.open);
      if (!openPanels.length) return;
      const focused = openPanels.find((panel) => panel.contains(document.activeElement));
      openPanels.forEach(close);
      event.preventDefault();
      // Only restore focus if closing concealed the focused element. Do not steal
      // focus from another part of the document merely because a panel was open.
      focused?.querySelector("summary")?.focus({ preventScroll: true });
    },
    { signal },
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (modalOpen()) return;
      for (const panel of panels) {
        if (!panel.open || event.composedPath().includes(panel)) continue;
        const containedFocus = panel.contains(document.activeElement);
        close(panel);
        // The pointer's normal default action can then focus its intended target.
        if (containedFocus) panel.querySelector("summary")?.focus({ preventScroll: true });
      }
    },
    { signal },
  );

  return () => listeners.abort();
}
