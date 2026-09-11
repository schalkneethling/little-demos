import { describe, expect, test, vi } from "vite-plus/test";
import { getPlayerArtFrame } from "../../src/world/rendering/player-art";
import { cancelPendingImage, resolveAssetState } from "../../src/world/assets/asset-loading";
import {
  createAttractionRenderPlan,
  getInteractionMarkerPosition,
  getAttractionCaptionPosition,
  getAttractionVisualState,
} from "../../src/world/rendering/attraction-render-plan";
import type { AttractionDefinition } from "../../src/world/attractions/attraction-types";

describe("production art without geometry changes", () => {
  test("cancels pending decode and XHR before a late callback can mutate the loader", () => {
    const processed = vi.fn();
    const abort = vi.fn();
    const revoke = vi.fn();
    const image = {
      src: "blob:pending",
      onload: (() => {}) as (() => void) | null,
      onerror: (() => {}) as (() => void) | null,
      removeAttribute: vi.fn(),
    };
    const xhr = {
      abort,
      onload: processed,
      onerror: processed,
      onprogress: processed,
      ontimeout: processed,
      onabort: processed,
      onreadystatechange: processed,
    };
    const file = {
      xhrLoader: xhr as unknown as XMLHttpRequest,
      data: image,
      onProcessComplete: processed,
      onProcessError: processed,
    };
    const lateDecode = () => file.onProcessComplete();
    cancelPendingImage(file, revoke);
    lateDecode();
    expect(processed).not.toHaveBeenCalled();
    expect(abort).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:pending");
    expect(xhr.ontimeout).toBeNull();
    expect(image.onload).toBeNull();
    expect(image.removeAttribute).toHaveBeenCalledWith("src");
    expect(file.data).toBe(image);
  });
  test("places artwork by presentation anchor while retaining legacy fallback geometry", () => {
    const attraction: AttractionDefinition = {
      id: "proof",
      demoId: "proof",
      name: "Proof",
      shortDescription: "Proof",
      category: "Test",
      position: { x: 210, y: 870 },
      presentation: { worldAnchor: { x: 360, y: 1060 } },
      entrancePosition: { x: 360, y: 1085 },
      interactionZone: { x: 270, y: 1060, width: 180, height: 110 },
      collisionShapes: [{ type: "rectangle", x: 210, y: 870, width: 300, height: 190 }],
      assetKey: "proof",
      status: "available",
      sortAnchor: { x: 360, y: 1060 },
    };
    const [plan] = createAttractionRenderPlan(
      [attraction],
      new Map([
        [
          "proof",
          {
            key: "proof",
            placeholder: { width: 300, height: 190, color: 0x123456 },
            runtime: {
              kind: "transparent-raster",
              width: 320,
              height: 310,
              anchor: { x: 160, y: 310 },
              url: "/proof.png",
              loadGroup: "initial-world",
              dependsOn: [],
              transferBytes: 20,
              decodedBytes: 396800,
              outputSha256: "0".repeat(64),
              pixelSha256: "0".repeat(64),
            },
          },
        ],
      ]),
    );
    expect(plan).toMatchObject({
      center: { x: 360, y: 965 },
      size: { width: 300, height: 190 },
      structureDepth: 1060,
      artwork: { key: "proof", x: 200, y: 750, width: 320, height: 310 },
      collisionShapes: attraction.collisionShapes,
    });
    expect(getAttractionCaptionPosition(plan!)).toEqual({ x: 540, y: 1072 });
    expect(getInteractionMarkerPosition(plan!)).toEqual({ x: 540, y: 1132 });
    expect(getAttractionCaptionPosition(plan!, { width: 700, height: 1100 })).toEqual({
      x: 12,
      y: 1004,
    });
    for (const selected of [false, true]) {
      for (const visited of [false, true]) {
        expect(
          getAttractionVisualState(plan!, { selected, visited, highContrast: false }),
        ).toMatchObject({ strokeWidth: 0, glow: { visible: selected, highContrast: false } });
      }
    }
    expect(
      getAttractionVisualState(plan!, { selected: true, visited: true, highContrast: true }),
    ).toMatchObject({
      strokeWidth: 0,
      glow: { visible: true, highContrast: true },
      label: "Proof\nVisited",
      showInteractionMarker: true,
    });
    expect(
      getAttractionVisualState(plan!, {
        selected: true,
        visited: false,
        highContrast: false,
        artworkReady: false,
      }),
    ).toMatchObject({ strokeWidth: 9 });
    expect(getInteractionMarkerPosition({ ...plan!, artwork: undefined })).toEqual({
      x: 360,
      y: 1092,
    });
  });

  test("maps four sheet directions and keeps a stable facing at rest", () => {
    expect(getPlayerArtFrame({ x: 0, y: 0 }, "north", false, 0)).toEqual({
      facing: "north",
      frame: 12,
    });
    expect(getPlayerArtFrame({ x: 1, y: 1 }, "south", false, 0)).toEqual({
      facing: "east",
      frame: 9,
    });
    expect(getPlayerArtFrame({ x: -1, y: 0 }, "south", true, 120)).toEqual({
      facing: "west",
      frame: 4,
    });
    expect(getPlayerArtFrame({ x: 0, y: 1 }, "north", false, 120)).toEqual({
      facing: "south",
      frame: 2,
    });
    expect(getPlayerArtFrame({ x: 0, y: -1 }, "south", false, 240)).toEqual({
      facing: "north",
      frame: 15,
    });
  });

  test("readiness requires a decoded texture and every expected sheet frame", () => {
    expect(resolveAssetState(false, undefined, () => true)).toBe("fallback");
    expect(resolveAssetState(true, undefined, () => true)).toBe("ready");
    expect(resolveAssetState(true, { columns: 4, rows: 4 }, (index) => index < 15)).toBe(
      "fallback",
    );
    expect(resolveAssetState(true, { columns: 4, rows: 4 }, (index) => index < 16)).toBe("ready");
  });
});
