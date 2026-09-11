import { createAppController } from "./app-controller";
import { createWorldBridge } from "../world/bridge/world-events";
import { createRuntimeManager } from "../world/runtime-manager";
import { CATALOG } from "../catalog/catalog";
import { assertNoCatalogErrors } from "./catalog-diagnostics";
import { createPanelDismissal } from "../ui/panel-dismissal";

function requireElement<ElementType extends Element>(
  selector: string,
  constructor: { new (): ElementType },
): ElementType {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required application element is missing: ${selector}`);
  }
  return element;
}

export function bootstrap() {
  const exploreButton = requireElement("[data-explore]", HTMLButtonElement);
  const worldControl = requireElement("[data-world-control]", HTMLElement);
  const canvasHost = requireElement("[data-world-canvas]", HTMLElement);
  const worldStatus = requireElement("[data-world-status]", HTMLElement);
  const loadingStatus = requireElement("[data-loading-status]", HTMLElement);
  const debugPanel = requireElement("[data-world-debug]", HTMLElement);
  const debugPosition = requireElement("[data-debug-position]", HTMLOutputElement);
  const debugFps = requireElement("[data-debug-fps]", HTMLOutputElement);
  const debug = new URLSearchParams(window.location.search).has("debug-world");
  debugPanel.hidden = !debug;
  const bridge = createWorldBridge();
  const controller = createAppController(
    {
      exploreButton,
      worldControl,
      worldStatus,
      loadingStatus,
      debugPosition,
      debugFps,
    },
    bridge,
  );
  const stopPanelDismissal = createPanelDismissal();
  const runtime = createRuntimeManager(async () => {
    // Validate before starting the world in every build; the directory remains usable
    // even when a catalog cannot safely drive world interactions.
    const [{ validateCatalog }, { FAIRGROUND_MAP }] = await Promise.all([
      import("../catalog/validate-catalog"),
      import("../world/map/fairground-map"),
    ]);
    assertNoCatalogErrors(validateCatalog(CATALOG, FAIRGROUND_MAP));
    const { createGame } = await import("../world/create-game");
    return createGame({
      canvasHost,
      controlTarget: worldControl,
      bridge,
      settings: controller.getState().settings,
      debug,
    });
  });

  runtime.mount().catch((cause: unknown) => {
    const error =
      cause instanceof Error ? cause : new Error("The fairground could not load.", { cause });
    bridge.emit({ type: "world-error", error });
    if (import.meta.env.DEV) {
      console.error(error);
      loadingStatus.textContent = error.message;
    }
  });

  const destroy = () => {
    stopPanelDismissal();
    runtime.unmount();
    controller.destroy();
  };
  const handlePageHide = (event: PageTransitionEvent) => {
    // Keep the live application intact when the browser freezes it in BFCache.
    if (!event.persisted) destroy();
  };
  window.addEventListener("pagehide", handlePageHide);

  return { destroy };
}
