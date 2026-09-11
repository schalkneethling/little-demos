import { afterEach, expect, test, vi } from "vite-plus/test";
import { setupSliderNavigation } from "../../dynamic-javascript-imports/slider-navigation.js";

afterEach(() => vi.unstubAllGlobals());

test("standalone navigation checks current motion preference in both directions", () => {
  let reduced = true;
  vi.stubGlobal("matchMedia", () => ({ matches: reduced }));
  const previous = new EventTarget();
  const next = new EventTarget();
  const scrollBy = vi.fn();
  setupSliderNavigation(
    { querySelector: (selector: string) => (selector.includes("previous") ? previous : next) },
    { clientWidth: 100, scrollBy },
  );
  previous.dispatchEvent(new Event("click"));
  next.dispatchEvent(new Event("click"));
  expect(scrollBy.mock.calls).toEqual([
    [{ left: -85, behavior: "instant" }],
    [{ left: 85, behavior: "instant" }],
  ]);
  reduced = false;
  next.dispatchEvent(new Event("click"));
  expect(scrollBy).toHaveBeenLastCalledWith({ left: 85, behavior: "smooth" });
});
