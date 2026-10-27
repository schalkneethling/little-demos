export interface MapRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FairgroundMap {
  width: number;
  height: number;
  spawn: { x: number; y: number };
  paths: MapRectangle[];
}

export const FAIRGROUND_MAP: FairgroundMap = {
  width: 1_920,
  height: 1_280,
  spawn: { x: 960, y: 1_120 },
  paths: [
    // The spines stop at solid structures instead of painting underneath them.
    { x: 840, y: 280, width: 240, height: 190 },
    { x: 840, y: 810, width: 240, height: 470 },
    // The upper apron reaches across above the landmark, then splits around it.
    { x: 295, y: 420, width: 1_330, height: 50 },
    { x: 295, y: 470, width: 490, height: 50 },
    { x: 1_135, y: 470, width: 490, height: 50 },
    // Split the cross-path at the central landmark.
    { x: 0, y: 520, width: 785, height: 240 },
    { x: 1_135, y: 520, width: 785, height: 240 },
    // Matched side routes and a southern connector form a clear plaza bypass.
    { x: 665, y: 420, width: 120, height: 390 },
    { x: 1_135, y: 420, width: 120, height: 390 },
    { x: 665, y: 810, width: 590, height: 70 },
    // One continuous apron connects all lower attraction entrances to the spine.
    { x: 270, y: 1_060, width: 1_380, height: 110 },
  ],
};
