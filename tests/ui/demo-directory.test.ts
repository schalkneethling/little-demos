import { describe, expect, test } from "vite-plus/test";
import {
  createDirectoryEntries,
  findAvailableDemo,
  findAvailableDemoForAttraction,
  findOpenableDemo,
  type DirectoryAttraction,
} from "../../src/ui/demo-directory";
import type { DemoDefinition, DemoModule } from "../../src/demos/demo-types";

const load = async (): Promise<DemoModule> => ({ mount: () => {} });

describe("demo directory model", () => {
  const attractions: readonly DirectoryAttraction[] = [
    { id: "arcade", demoId: "arcade-demo", name: "The Arcade", status: "available" },
    { id: "funhouse", demoId: "funhouse-demo", name: "The Funhouse", status: "coming-soon" },
    { id: "closed-arcade", demoId: "closed-demo", name: "Closed arcade", status: "unavailable" },
    { id: "ferris-wheel", demoId: null, name: "Ferris Wheel", status: "decorative" },
    { id: "mismatched", demoId: "different-demo", name: "Mismatched ride", status: "available" },
  ];
  const demos = [
    {
      id: "arcade-demo",
      title: "Arcade demo",
      summary: "Ready to play.",
      category: "Games",
      attractionId: "arcade",
      status: "available",
      load,
    },
    {
      id: "directory-demo",
      title: "Directory demo",
      summary: "No world location.",
      category: "Tools",
      attractionId: null,
      status: "available",
      load,
    },
    {
      id: "funhouse-demo",
      title: "Funhouse demo",
      summary: "Under construction.",
      category: "Experiments",
      attractionId: "funhouse",
      status: "coming-soon",
    },
    {
      id: "retired-demo",
      title: "Retired demo",
      summary: "Unavailable right now.",
      category: "Archives",
      attractionId: null,
      status: "unavailable",
    },
    {
      id: "decorative-demo",
      title: "Should not be listed",
      summary: "A decorative world object is not a demo location.",
      category: "Hidden",
      attractionId: "ferris-wheel",
      status: "available",
      load,
    },
    {
      id: "closed-demo",
      title: "Closed arcade demo",
      summary: "The attraction is unavailable.",
      category: "Games",
      attractionId: "closed-arcade",
      status: "available",
      load,
    },
    {
      id: "mismatched-demo",
      title: "Mismatched demo",
      summary: "The catalog references another demo.",
      category: "Tests",
      attractionId: "mismatched",
      status: "available",
      load,
    },
    {
      id: "missing-attraction-demo",
      title: "Missing attraction demo",
      summary: "Its attraction has been removed.",
      category: "Tests",
      attractionId: "missing-attraction",
      status: "available",
      load,
    },
  ] as const satisfies readonly DemoDefinition[];

  test("derives titles, locations, and actions from injected catalog definitions", () => {
    expect(createDirectoryEntries(demos, attractions)).toEqual([
      {
        id: "arcade-demo",
        title: "Arcade demo",
        summary: "Ready to play.",
        category: "Games",
        status: "available",
        location: "The Arcade",
        canOpen: true,
        canLocate: true,
      },
      {
        id: "directory-demo",
        title: "Directory demo",
        summary: "No world location.",
        category: "Tools",
        status: "available",
        location: null,
        canOpen: true,
        canLocate: false,
      },
      {
        id: "funhouse-demo",
        title: "Funhouse demo",
        summary: "Under construction.",
        category: "Experiments",
        status: "coming-soon",
        location: "The Funhouse",
        canOpen: false,
        canLocate: false,
      },
      {
        id: "retired-demo",
        title: "Retired demo",
        summary: "Unavailable right now.",
        category: "Archives",
        status: "unavailable",
        location: null,
        canOpen: false,
        canLocate: false,
      },
      {
        id: "closed-demo",
        title: "Closed arcade demo",
        summary: "The attraction is unavailable.",
        category: "Games",
        status: "available",
        location: "Closed arcade",
        canOpen: false,
        canLocate: false,
      },
      {
        id: "mismatched-demo",
        title: "Mismatched demo",
        summary: "The catalog references another demo.",
        category: "Tests",
        status: "available",
        location: "Mismatched ride",
        canOpen: false,
        canLocate: false,
      },
      {
        id: "missing-attraction-demo",
        title: "Missing attraction demo",
        summary: "Its attraction has been removed.",
        category: "Tests",
        status: "available",
        location: "Fairground location unavailable",
        canOpen: false,
        canLocate: false,
      },
    ]);
  });

  test("only resolves demos that are available to load", () => {
    expect(findAvailableDemo(demos, "arcade-demo")?.id).toBe("arcade-demo");
    expect(findOpenableDemo(demos, attractions, "arcade-demo")?.id).toBe("arcade-demo");
    expect(findOpenableDemo(demos, attractions, "closed-demo")).toBeUndefined();
    expect(findOpenableDemo(demos, attractions, "mismatched-demo")).toBeUndefined();
    expect(findOpenableDemo(demos, attractions, "missing-attraction-demo")).toBeUndefined();
    expect(findAvailableDemoForAttraction(demos, attractions, "arcade")?.id).toBe("arcade-demo");
    expect(findAvailableDemoForAttraction(demos, attractions, "funhouse")).toBeUndefined();
    expect(findAvailableDemo(demos, "funhouse-demo")).toBeUndefined();
    expect(findAvailableDemo(demos, "retired-demo")).toBeUndefined();
    expect(findAvailableDemo(demos, "missing")).toBeUndefined();
  });
});
