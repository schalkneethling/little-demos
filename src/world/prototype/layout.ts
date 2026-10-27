import {
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_WIDTH,
  PLAYER_GROUND_OFFSET_Y,
} from "../player/player-geometry";

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle extends Point {
  width: number;
  height: number;
}

export interface Surface {
  id: string;
  points: readonly Point[];
}

export interface Plot {
  id: string;
  demoId: string | null;
  name: string;
  status: "available" | "coming-soon";
  assetKey: string;
  anchor: Point;
  footprint: Rectangle;
  approach: Point;
  exit: Point;
}

/** Approval-only geometry. None of these coordinates change the production fairground. */
export const SPATIAL_PREVIEW = {
  width: 3_200,
  height: 2_400,
  spawn: { x: 1_600, y: 1_980 },
  fountain: { x: 1_600, y: 1_310, footprint: { x: 1_425, y: 1_245, width: 350, height: 80 } },
  paths: [
    {
      id: "arrival-walk",
      points: [
        { x: 1_500, y: 2_400 },
        { x: 1_490, y: 2_090 },
        { x: 1_465, y: 1_840 },
        { x: 1_490, y: 1_620 },
        { x: 1_690, y: 1_620 },
        { x: 1_665, y: 1_840 },
        { x: 1_710, y: 2_090 },
        { x: 1_700, y: 2_400 },
      ],
    },
    {
      id: "arrival-court",
      points: [
        { x: 1_455, y: 1_945 },
        { x: 1_825, y: 1_935 },
        { x: 1_940, y: 2_030 },
        { x: 1_935, y: 2_190 },
        { x: 1_790, y: 2_275 },
        { x: 1_445, y: 2_275 },
        { x: 1_315, y: 2_185 },
        { x: 1_315, y: 2_045 },
      ],
    },
    {
      id: "south-loop",
      points: [
        { x: 760, y: 1_560 },
        { x: 980, y: 1_530 },
        { x: 1_440, y: 1_555 },
        { x: 1_770, y: 1_540 },
        { x: 2_260, y: 1_515 },
        { x: 2_330, y: 1_700 },
        { x: 1_790, y: 1_720 },
        { x: 1_460, y: 1_725 },
        { x: 990, y: 1_690 },
        { x: 760, y: 1_720 },
      ],
    },
    {
      id: "southern-promenade",
      points: [
        { x: 850, y: 1_850 },
        { x: 1_220, y: 1_830 },
        { x: 1_480, y: 1_865 },
        { x: 1_705, y: 1_865 },
        { x: 2_310, y: 1_845 },
        { x: 2_305, y: 2_035 },
        { x: 1_700, y: 2_045 },
        { x: 1_485, y: 2_045 },
        { x: 1_210, y: 2_025 },
        { x: 850, y: 2_035 },
      ],
    },
    {
      id: "west-loop",
      points: [
        { x: 725, y: 720 },
        { x: 905, y: 710 },
        { x: 915, y: 1_060 },
        { x: 870, y: 1_370 },
        { x: 910, y: 1_625 },
        { x: 755, y: 1_700 },
        { x: 690, y: 1_350 },
        { x: 745, y: 1_025 },
      ],
    },
    {
      id: "north-loop",
      points: [
        { x: 755, y: 735 },
        { x: 1_030, y: 740 },
        { x: 1_360, y: 785 },
        { x: 1_750, y: 760 },
        { x: 2_250, y: 740 },
        { x: 2_300, y: 920 },
        { x: 1_770, y: 920 },
        { x: 1_345, y: 945 },
        { x: 1_010, y: 900 },
        { x: 755, y: 905 },
      ],
    },
    {
      id: "east-loop",
      points: [
        { x: 2_175, y: 825 },
        { x: 2_340, y: 810 },
        { x: 2_330, y: 1_165 },
        { x: 2_280, y: 1_425 },
        { x: 2_350, y: 1_650 },
        { x: 2_190, y: 1_700 },
        { x: 2_110, y: 1_430 },
        { x: 2_170, y: 1_120 },
      ],
    },
    {
      id: "fountain-court",
      points: [
        { x: 1_210, y: 980 },
        { x: 1_400, y: 910 },
        { x: 1_780, y: 920 },
        { x: 1_990, y: 1_020 },
        { x: 2_035, y: 1_245 },
        { x: 1_940, y: 1_455 },
        { x: 1_770, y: 1_585 },
        { x: 1_405, y: 1_585 },
        { x: 1_235, y: 1_460 },
        { x: 1_155, y: 1_220 },
      ],
    },
    {
      id: "court-west-connection",
      points: [
        { x: 755, y: 1_130 },
        { x: 1_210, y: 1_135 },
        { x: 1_250, y: 1_315 },
        { x: 760, y: 1_315 },
      ],
    },
    {
      id: "court-east-connection",
      points: [
        { x: 1_945, y: 1_135 },
        { x: 2_265, y: 1_115 },
        { x: 2_300, y: 1_310 },
        { x: 1_955, y: 1_315 },
      ],
    },
    {
      id: "ferris-apron",
      points: [
        { x: 520, y: 730 },
        { x: 810, y: 730 },
        { x: 830, y: 875 },
        { x: 530, y: 875 },
      ],
    },
    {
      id: "carousel-apron",
      points: [
        { x: 920, y: 730 },
        { x: 1_090, y: 735 },
        { x: 1_100, y: 900 },
        { x: 910, y: 900 },
      ],
    },
    {
      id: "property-spur",
      points: [
        { x: 2_190, y: 910 },
        { x: 2_510, y: 900 },
        { x: 2_515, y: 1_065 },
        { x: 2_210, y: 1_075 },
      ],
    },
    {
      id: "crisp-spur",
      points: [
        { x: 2_190, y: 1_380 },
        { x: 2_625, y: 1_355 },
        { x: 2_630, y: 1_540 },
        { x: 2_200, y: 1_560 },
      ],
    },
    {
      id: "construction-spur",
      points: [
        { x: 2_395, y: 955 },
        { x: 2_455, y: 810 },
        { x: 2_580, y: 640 },
        { x: 2_710, y: 625 },
        { x: 2_750, y: 755 },
        { x: 2_660, y: 775 },
        { x: 2_600, y: 920 },
        { x: 2_515, y: 1_035 },
      ],
    },
  ] as readonly Surface[],
  gardenBeds: [
    {
      id: "court-northwest",
      points: [
        { x: 1_255, y: 1_065 },
        { x: 1_275, y: 1_020 },
        { x: 1_320, y: 985 },
        { x: 1_375, y: 972 },
        { x: 1_425, y: 990 },
        { x: 1_460, y: 1_035 },
        { x: 1_468, y: 1_090 },
        { x: 1_440, y: 1_140 },
        { x: 1_385, y: 1_172 },
        { x: 1_325, y: 1_160 },
        { x: 1_275, y: 1_125 },
      ],
    },
    {
      id: "court-northeast",
      points: [
        { x: 1_750, y: 1_035 },
        { x: 1_780, y: 985 },
        { x: 1_835, y: 970 },
        { x: 1_890, y: 985 },
        { x: 1_935, y: 1_020 },
        { x: 1_950, y: 1_075 },
        { x: 1_938, y: 1_130 },
        { x: 1_890, y: 1_168 },
        { x: 1_830, y: 1_170 },
        { x: 1_780, y: 1_140 },
        { x: 1_748, y: 1_090 },
      ],
    },
    {
      id: "court-southwest",
      points: [
        { x: 1_255, y: 1_425 },
        { x: 1_278, y: 1_390 },
        { x: 1_325, y: 1_375 },
        { x: 1_380, y: 1_390 },
        { x: 1_428, y: 1_428 },
        { x: 1_445, y: 1_480 },
        { x: 1_425, y: 1_530 },
        { x: 1_365, y: 1_552 },
        { x: 1_305, y: 1_532 },
        { x: 1_265, y: 1_490 },
      ],
    },
    {
      id: "court-southeast",
      points: [
        { x: 1_755, y: 1_470 },
        { x: 1_778, y: 1_420 },
        { x: 1_830, y: 1_385 },
        { x: 1_890, y: 1_375 },
        { x: 1_938, y: 1_405 },
        { x: 1_952, y: 1_455 },
        { x: 1_930, y: 1_505 },
        { x: 1_880, y: 1_538 },
        { x: 1_815, y: 1_542 },
        { x: 1_775, y: 1_515 },
      ],
    },
  ] as readonly Surface[],
  plots: [
    {
      id: "ferris-wheel",
      demoId: "zipper",
      name: "Zipper",
      status: "available",
      assetKey: "attraction/ferris-wheel/base",
      anchor: { x: 610, y: 710 },
      footprint: { x: 515, y: 640, width: 190, height: 68 },
      approach: { x: 610, y: 780 },
      exit: { x: 610, y: 850 },
    },
    {
      id: "carousel",
      demoId: "accent-color",
      name: "Accent Color Carousel",
      status: "available",
      assetKey: "attraction/carousel/base",
      anchor: { x: 1_000, y: 710 },
      footprint: { x: 905, y: 645, width: 190, height: 63 },
      approach: { x: 1_000, y: 780 },
      exit: { x: 1_000, y: 860 },
    },
    {
      id: "arcade",
      demoId: "dynamic-javascript-imports",
      name: "Dynamic JavaScript Imports",
      status: "available",
      assetKey: "attraction/arcade/base",
      anchor: { x: 1_180, y: 1_820 },
      footprint: { x: 1_050, y: 1_740, width: 260, height: 78 },
      approach: { x: 1_180, y: 1_890 },
      exit: { x: 1_180, y: 1_990 },
    },
    {
      id: "layer-cake",
      demoId: "layer-cake",
      name: "Layer Cake Stand",
      status: "available",
      assetKey: "attraction/tent/base",
      anchor: { x: 1_960, y: 1_820 },
      footprint: { x: 1_840, y: 1_745, width: 240, height: 73 },
      approach: { x: 1_960, y: 1_890 },
      exit: { x: 1_960, y: 1_990 },
    },
    {
      id: "crisp-edges",
      demoId: "crisp-edges",
      name: "Crisp Edges Booth",
      status: "available",
      assetKey: "attraction/arcade/base",
      anchor: { x: 2_545, y: 1_350 },
      footprint: { x: 2_415, y: 1_275, width: 260, height: 73 },
      approach: { x: 2_545, y: 1_420 },
      exit: { x: 2_545, y: 1_510 },
    },
    {
      id: "property-transition",
      demoId: "property-transition",
      name: "Property Transition Stage",
      status: "available",
      assetKey: "attraction/arcade/base",
      anchor: { x: 2_415, y: 900 },
      footprint: { x: 2_285, y: 825, width: 260, height: 73 },
      approach: { x: 2_415, y: 970 },
      exit: { x: 2_415, y: 1_045 },
    },
    {
      id: "funhouse",
      demoId: null,
      name: "New attraction coming soon",
      status: "coming-soon",
      assetKey: "attraction/tent/base",
      anchor: { x: 2_700, y: 625 },
      footprint: { x: 2_580, y: 555, width: 240, height: 68 },
      approach: { x: 2_700, y: 690 },
      exit: { x: 2_700, y: 740 },
    },
  ] as readonly Plot[],
  planters: [
    { x: 1_310, y: 1_125 },
    { x: 1_390, y: 1_075 },
    { x: 1_845, y: 1_080 },
    { x: 1_910, y: 1_145 },
    { x: 1_340, y: 1_455 },
    { x: 1_875, y: 1_460 },
    { x: 1_170, y: 1_330 },
    { x: 2_025, y: 1_325 },
    { x: 1_345, y: 2_040 },
    { x: 1_905, y: 2_035 },
  ] as readonly Point[],
} as const;

export function containsPoint(rectangle: Rectangle, point: Point): boolean {
  return (
    point.x >= rectangle.x &&
    point.x <= rectangle.x + rectangle.width &&
    point.y >= rectangle.y &&
    point.y <= rectangle.y + rectangle.height
  );
}

/** Ray casting; boundary points count as inside for path joins. */
export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let index = 0, prior = polygon.length - 1; index < polygon.length; prior = index++) {
    const a = polygon[prior]!;
    const b = polygon[index]!;
    const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
    if (
      Math.abs(cross) < 0.001 &&
      point.x >= Math.min(a.x, b.x) &&
      point.x <= Math.max(a.x, b.x) &&
      point.y >= Math.min(a.y, b.y) &&
      point.y <= Math.max(a.y, b.y)
    )
      return true;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

export function pointOnPath(point: Point): boolean {
  return SPATIAL_PREVIEW.paths.some((surface) => pointInPolygon(point, surface.points));
}

export function footprintClear(point: Point): boolean {
  const body = {
    x: point.x - PLAYER_BODY_WIDTH / 2,
    y: point.y + PLAYER_GROUND_OFFSET_Y - PLAYER_BODY_HEIGHT / 2,
    width: PLAYER_BODY_WIDTH,
    height: PLAYER_BODY_HEIGHT,
  };
  if (
    body.x < 0 ||
    body.y < 0 ||
    body.x + body.width > SPATIAL_PREVIEW.width ||
    body.y + body.height > SPATIAL_PREVIEW.height
  )
    return false;
  const obstacles = [
    SPATIAL_PREVIEW.fountain.footprint,
    ...SPATIAL_PREVIEW.plots.map((plot) => plot.footprint),
  ];
  return !obstacles.some(
    (obstacle) =>
      body.x < obstacle.x + obstacle.width &&
      body.x + body.width > obstacle.x &&
      body.y < obstacle.y + obstacle.height &&
      body.y + body.height > obstacle.y,
  );
}
