import type { DemoDefinition } from "./demo-types";

export const demos: readonly DemoDefinition[] = [
  {
    id: "dynamic-javascript-imports",
    title: "Dynamic JavaScript Imports",
    summary:
      "Two card sliders show how a DOM attribute can opt into a lazy-loaded navigation module.",
    category: "JavaScript",
    attractionId: "arcade",
    status: "available",
    load: async () => (await import("./dynamic-imports/demo")).createDemo(),
  },
  {
    id: "accent-color",
    title: "Accent Color",
    summary: "Explore how CSS accent-color themes native form controls.",
    category: "CSS",
    attractionId: null,
    status: "available",
    load: async () => (await import("./accent-color/demo")).createDemo(),
  },
  {
    id: "crisp-edges",
    title: "Crisp Edges",
    summary: "Compare image-rendering modes when enlarging pixel artwork.",
    category: "CSS",
    attractionId: null,
    status: "available",
    load: async () => (await import("./crisp-edges/demo")).createDemo(),
  },
  {
    id: "layer-cake",
    title: "Layer Cake",
    summary: "Change cascade layer order and see which CSS declaration wins.",
    category: "CSS",
    attractionId: null,
    status: "available",
    load: async () => (await import("./layer-cake/demo")).createDemo(),
  },
  {
    id: "property-transition",
    title: "Property Transitions",
    summary: "Compare transitions of registered and unregistered custom properties.",
    category: "CSS",
    attractionId: null,
    status: "available",
    load: async () => (await import("./property-transition/demo")).createDemo(),
  },
  {
    id: "zipper",
    title: "Zipper",
    summary:
      "Compress or decompress a single gzip file in your browser with the Compression Streams API.",
    category: "Web APIs",
    attractionId: null,
    status: "available",
    load: async () => (await import("./zipper/demo")).createDemo(),
  },
  {
    id: "funhouse",
    title: "Funhouse",
    summary: "A new demo is taking shape behind the scenes.",
    category: "Experiments",
    attractionId: "funhouse",
    status: "coming-soon",
  },
];

export function findDemo(id: string): DemoDefinition | undefined {
  return demos.find((demo) => demo.id === id);
}
