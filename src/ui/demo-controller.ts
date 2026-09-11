import { CATALOG } from "../catalog/catalog";
import { createDemoSession } from "../demos/demo-session";
import { DemoImportError } from "../demos/demo-import-error";
import type { WorldBridge } from "../world/bridge/world-events";
import type { AppState } from "../app/app-state";
import { readVisited, writeVisited } from "../app/visited-storage";
import {
  createDirectoryEntries,
  findAvailableDemoForAttraction,
  findOpenableDemo,
  isAvailableDemo,
  type AvailableDirectoryDemo,
  type DirectoryAttraction,
  type DirectoryDemoDefinition,
} from "./demo-directory";

export interface DemoCatalog {
  demos: readonly DirectoryDemoDefinition[];
  attractions: readonly DirectoryAttraction[];
}

interface DemoControllerOptions {
  bridge: WorldBridge;
  worldControl: HTMLElement;
  catalog?: DemoCatalog;
  getState(): AppState;
  setDemo(id: string | null): void;
  setVisited(ids: Set<string>): void;
  returnToWorld(): void;
}

export function createDemoController(options: DemoControllerOptions) {
  const { bridge, worldControl } = options;
  const { demos, attractions } = options.catalog ?? CATALOG;
  const dialog = document.querySelector<HTMLDialogElement>("[data-demo-dialog]")!;
  const list = document.querySelector<HTMLElement>("[data-directory-list]")!;
  dialog.setAttribute("aria-labelledby", "demo-title");
  dialog.removeAttribute("aria-label");
  dialog.innerHTML = `<header class="demo-dialog-header"><h2 id="demo-title" data-demo-title tabindex="-1"></h2><button type="button" data-demo-close aria-label="Close demo">Close</button></header><p data-demo-summary></p><p data-demo-status role="status"></p><button type="button" data-demo-retry hidden>Retry</button><div data-demo-root></div>`;
  const title = dialog.querySelector<HTMLElement>("[data-demo-title]")!;
  const summary = dialog.querySelector<HTMLElement>("[data-demo-summary]")!;
  const status = dialog.querySelector<HTMLElement>("[data-demo-status]")!;
  const retry = dialog.querySelector<HTMLButtonElement>("[data-demo-retry]")!;
  const closeButton = dialog.querySelector<HTMLButtonElement>("[data-demo-close]")!;
  const root = dialog.querySelector<HTMLElement>("[data-demo-root]")!;
  const listeners = new AbortController();
  const known = new Set(demos.filter(isAvailableDemo).map((demo) => demo.id));
  let visited = new Set<string>();
  try {
    visited = readVisited(window.localStorage, known);
  } catch {
    /* Storage may be disabled. */
  }
  options.setVisited(visited);
  let active: AvailableDirectoryDemo | undefined;
  let session: ReturnType<typeof createDemoSession> | undefined;
  let returnFocus: HTMLElement = worldControl;
  let fromWorld = false;
  let loaded = false;
  let closing = false;
  let destroyed = false;
  let attempt = 0;
  let waitingExit: string | undefined;
  let retryNeedsReload = false;

  const updateUrl = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("demo", id);
    else url.searchParams.delete("demo");
    window.history.replaceState(window.history.state, "", url);
  };

  const renderDirectory = () => {
    list.replaceChildren();
    for (const demo of createDirectoryEntries(demos, attractions)) {
      const item = document.createElement("li");
      item.className = "directory-card";
      const heading = document.createElement("h3");
      heading.textContent = demo.title;
      const copy = document.createElement("p");
      copy.textContent = demo.summary;
      const meta = document.createElement("p");
      meta.textContent = `${demo.category} · ${demo.location ?? "Directory exclusive"}`;
      item.append(heading, copy, meta);
      if (demo.canOpen) {
        const open = document.createElement("button");
        open.type = "button";
        open.dataset.openDemo = demo.id;
        open.textContent = `Open ${demo.title}`;
        const marker = document.createElement("span");
        marker.dataset.visited = demo.id;
        marker.textContent = visited.has(demo.id) ? "Visited" : "Not visited yet";
        item.append(open, marker);
      } else {
        const availability = document.createElement("p");
        availability.dataset.demoAvailability = demo.status;
        availability.textContent = demo.status === "coming-soon" ? "Coming soon" : "Unavailable";
        item.append(availability);
      }
      if (demo.canLocate) {
        const locate = document.createElement("button");
        locate.type = "button";
        locate.dataset.locateDemo = demo.id;
        locate.textContent = "Locate in fairground";
        item.append(locate);
      }
      list.append(item);
    }
  };
  renderDirectory();

  const finish = () => {
    waitingExit = undefined;
    closing = false;
    options.setDemo(null);
    if (destroyed) return;
    bridge.command({ type: "resume" });
    const target = returnFocus.isConnected ? returnFocus : worldControl;
    target.focus({ preventScroll: true });
    // Native dialog close may already restore focus before the exit finishes.
    // Reactivating explicitly also covers that no-new-focus-event case.
    if (target === worldControl) options.returnToWorld();
  };

  const load = async () => {
    const demo = active;
    if (!demo || closing) return;
    const current = ++attempt;
    // A root belongs to one attempt, so delayed cleanup cannot touch a newer demo.
    const mountRoot = document.createElement("div");
    const previous = session;
    const next = createDemoSession(
      mountRoot,
      (message) => {
        status.textContent = message;
      },
      options.getState().settings.reducedMotion,
    );
    session = next;
    root.replaceChildren(mountRoot);
    retry.hidden = true;
    retry.disabled = false;
    retryNeedsReload = false;
    status.textContent = "Loading demo…";
    loaded = false;
    try {
      await previous?.close();
      if (current !== attempt) return;
      const mounted = await next.open(() => demo.load());
      if (!mounted || current !== attempt) return;
      loaded = true;
      status.textContent = "Demo ready.";
      // Do not pull focus from a control the user reached while loading.
      if (document.activeElement === dialog || document.activeElement === title) title.focus();
    } catch (error) {
      if (current !== attempt) return;
      mountRoot.replaceChildren();
      retryNeedsReload = error instanceof DemoImportError;
      status.textContent = retryNeedsReload
        ? "This demo could not load. Retry reloads this page and reopens the demo. Your saved visits and preferences will be kept."
        : "This demo could not load. Try again, or close it and continue exploring.";
      retry.hidden = false;
      console.error("Demo loading failed:", error);
    }
  };

  const openDemo = (demo: AvailableDirectoryDemo, source: HTMLElement, world = false) => {
    if (active || closing || destroyed) return;
    active = demo;
    returnFocus = source;
    fromWorld = world;
    options.setDemo(demo.id);
    bridge.command({ type: "deactivate-controls" });
    bridge.command({ type: "pause" });
    title.textContent = demo.title;
    summary.textContent = demo.summary;
    dialog.showModal();
    title.focus();
    updateUrl(demo.id);
    void load();
  };

  const close = async () => {
    if (!active || closing) return;
    closing = true;
    attempt += 1;
    const demo = active;
    active = undefined;
    const wasLoaded = loaded;
    const previous = session;
    session = undefined;
    try {
      await previous?.close();
    } catch (error) {
      console.error("Demo cleanup failed:", error);
    }
    root.replaceChildren();
    dialog.close();
    updateUrl(null);
    if (wasLoaded) {
      visited = new Set([...visited, demo.id]);
      options.setVisited(visited);
      try {
        writeVisited(window.localStorage, visited);
      } catch {
        /* Storage may be disabled. */
      }
      const marker = [...list.querySelectorAll<HTMLElement>("[data-visited]")].find(
        (entry) => entry.dataset.visited === demo.id,
      );
      if (marker) marker.textContent = "Visited";
      bridge.command({ type: "set-visited", demoId: demo.id });
    }
    if (
      fromWorld &&
      demo.attractionId &&
      options.getState().worldReady &&
      !options.getState().error &&
      !destroyed
    ) {
      waitingExit = demo.attractionId;
      bridge.command({ type: "play-attraction-exit", attractionId: demo.attractionId });
    } else finish();
  };

  list.addEventListener(
    "click",
    (event) => {
      const target =
        event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
      if (!target) return;
      const demo = findOpenableDemo(
        demos,
        attractions,
        target.dataset.openDemo ?? target.dataset.locateDemo ?? "",
      );
      if (!demo) return;
      if (target.dataset.openDemo) openDemo(demo, target);
      else if (demo.attractionId && options.getState().worldReady) {
        const directory = document.querySelector("[data-demo-directory]");
        if (directory instanceof HTMLDetailsElement) directory.open = false;
        bridge.command({ type: "teleport-to-attraction", attractionId: demo.attractionId });
        worldControl.focus();
      }
    },
    { signal: listeners.signal },
  );
  closeButton.addEventListener(
    "click",
    () => {
      void close();
    },
    { signal: listeners.signal },
  );
  retry.addEventListener(
    "click",
    () => {
      if (retryNeedsReload && active && !closing) {
        status.textContent = "Reloading the page to retry this demo…";
        retry.disabled = true;
        window.location.reload();
      } else void load();
    },
    { signal: listeners.signal },
  );
  dialog.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      void close();
    },
    { signal: listeners.signal },
  );
  const stopListening = bridge.onEvent((event) => {
    if (event.type === "attraction-activated") {
      const demo = findAvailableDemoForAttraction(demos, attractions, event.attractionId);
      if (demo) openDemo(demo, worldControl, true);
    } else if (event.type === "attraction-exit-complete" && event.attractionId === waitingExit)
      finish();
    else if (event.type === "world-ready") {
      for (const id of visited) bridge.command({ type: "set-visited", demoId: id });
      if (active) bridge.command({ type: "pause" });
    } else if (event.type === "world-error" && waitingExit) finish();
  });

  const requested = new URLSearchParams(window.location.search).get("demo");
  const directDemo = requested ? findOpenableDemo(demos, attractions, requested) : undefined;
  if (directDemo)
    openDemo(
      directDemo,
      document.querySelector<HTMLElement>("[data-demo-directory] summary") ?? worldControl,
    );

  return {
    isBusy: () => !!active || closing,
    openAttraction(attractionId: string) {
      const demo = findAvailableDemoForAttraction(demos, attractions, attractionId);
      if (demo) openDemo(demo, worldControl, true);
    },
    destroy() {
      destroyed = true;
      attempt += 1;
      stopListening();
      listeners.abort();
      void session?.close().catch((error: unknown) => {
        console.error("Demo cleanup failed:", error);
      });
      root.replaceChildren();
      dialog.close();
    },
  };
}
