import type { DemoDefinition } from "../demos/demo-types";
import type { AttractionDefinition } from "../world/attractions/attraction-types";

export type DemoAvailability = DemoDefinition["status"];

export type AvailableDirectoryDemo = Extract<DemoDefinition, { status: "available" }>;

export type DirectoryDemoDefinition = DemoDefinition;

export type DirectoryAttraction = Pick<AttractionDefinition, "id" | "demoId" | "name" | "status">;

export interface DirectoryEntry {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: DemoAvailability;
  location: string | null;
  canOpen: boolean;
  canLocate: boolean;
}

export function isAvailableDemo(demo: DirectoryDemoDefinition): demo is AvailableDirectoryDemo {
  return demo.status === "available";
}

export function findAvailableDemo(
  demos: readonly DirectoryDemoDefinition[],
  id: string,
): AvailableDirectoryDemo | undefined {
  const demo = demos.find((entry) => entry.id === id);
  return demo && isAvailableDemo(demo) ? demo : undefined;
}

export function findOpenableDemo(
  demos: readonly DirectoryDemoDefinition[],
  attractions: readonly DirectoryAttraction[],
  id: string,
): AvailableDirectoryDemo | undefined {
  const demo = findAvailableDemo(demos, id);
  const attraction = demo?.attractionId
    ? attractions.find((entry) => entry.id === demo.attractionId)
    : undefined;
  return demo && isDemoOpenable(demo, attraction) ? demo : undefined;
}

export function findAvailableDemoForAttraction(
  demos: readonly DirectoryDemoDefinition[],
  attractions: readonly DirectoryAttraction[],
  attractionId: string,
): AvailableDirectoryDemo | undefined {
  const demo = demos.find((entry) => entry.attractionId === attractionId);
  return demo ? findOpenableDemo(demos, attractions, demo.id) : undefined;
}

export function createDirectoryEntries(
  demos: readonly DirectoryDemoDefinition[],
  attractions: readonly DirectoryAttraction[],
): readonly DirectoryEntry[] {
  const attractionsById = new Map(attractions.map((attraction) => [attraction.id, attraction]));

  return demos.flatMap((demo) => {
    const attraction = demo.attractionId ? attractionsById.get(demo.attractionId) : undefined;
    if (attraction?.status === "decorative") return [];

    const available = isDemoOpenable(demo, attraction);
    return [
      {
        id: demo.id,
        title: demo.title,
        summary: demo.summary,
        category: demo.category,
        status: demo.status,
        location:
          attraction?.name ??
          (demo.attractionId === null ? null : "Fairground location unavailable"),
        canOpen: available,
        canLocate: available && attraction?.status === "available",
      },
    ];
  });
}

function isDemoOpenable(
  demo: DirectoryDemoDefinition,
  attraction: DirectoryAttraction | undefined,
): demo is AvailableDirectoryDemo {
  return (
    isAvailableDemo(demo) &&
    (demo.attractionId === null ||
      (attraction?.demoId === demo.id && attraction.status === "available"))
  );
}
