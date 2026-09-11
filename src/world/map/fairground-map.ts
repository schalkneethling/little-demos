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
    { x: 840, y: 0, width: 240, height: 1_280 },
    { x: 0, y: 520, width: 1_920, height: 240 },
    { x: 360, y: 180, width: 1_200, height: 160 },
  ],
};
