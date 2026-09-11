interface VisualFixture {
  readonly player: { readonly x: number; readonly y: number };
  readonly camera: { readonly x: number; readonly y: number; readonly zoom: number };
  readonly visited: boolean;
}

const camera = { x: 360, y: 980, zoom: 1 } as const;
const fixtures: ReadonlyMap<string, VisualFixture> = new Map([
  ["arcade", { player: { x: 360, y: 1120 }, camera, visited: false }],
  ["arcade-behind", { player: { x: 360, y: 820 }, camera, visited: false }],
  ["arcade-west", { player: { x: 185, y: 940 }, camera, visited: false }],
  ["arcade-east", { player: { x: 535, y: 940 }, camera, visited: false }],
  ["arcade-exit", { player: { x: 360, y: 1160 }, camera, visited: true }],
]);

/** Explicit QA presets only: no arbitrary URL-provided coordinates or state. */
export function getVisualFixture(debug: boolean, name: string | null): VisualFixture | undefined {
  return debug && name !== null ? fixtures.get(name) : undefined;
}
