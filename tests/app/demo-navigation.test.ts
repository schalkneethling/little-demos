import { expect, test, vi } from "vite-plus/test";
import { setupNavigation } from "../../src/demos/dynamic-imports/navigation";

test("settles active smooth scrolling when reduced motion is enabled", () => {
  const previous = new EventTarget();
  const next = new EventTarget();
  const scrollBy = vi.fn();
  const scrollTo = vi.fn();
  const track = { clientWidth: 100, scrollLeft: 31, scrollTop: 4, scrollBy, scrollTo };
  let notifyMotionChange!: (reducedMotion: boolean) => void;
  const stopMotionSubscription = vi.fn();
  const controller = new AbortController();

  setupNavigation(
    {
      querySelector: (selector: string) =>
        selector === ".cards-track" ? track : selector.includes("previous") ? previous : next,
    } as unknown as HTMLElement,
    controller.signal,
    false,
    (listener) => {
      notifyMotionChange = listener;
      listener(false);
      return stopMotionSubscription;
    },
  );

  next.dispatchEvent(new Event("click"));
  expect(scrollBy).toHaveBeenLastCalledWith({ left: 85, behavior: "smooth" });

  notifyMotionChange(true);
  expect(scrollTo).toHaveBeenCalledWith({ left: 31, top: 4, behavior: "instant" });
  next.dispatchEvent(new Event("click"));
  expect(scrollBy).toHaveBeenLastCalledWith({ left: 85, behavior: "instant" });

  controller.abort();
  expect(stopMotionSubscription).toHaveBeenCalledOnce();
});
