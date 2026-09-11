import type { DemoModule } from "./demo-types";
import { DemoImportError } from "./demo-import-error";

/** Each opening gets a fresh module instance and its own cancellation boundary. */
export function createDemoSession(
  container: HTMLElement,
  announce: (message: string) => void,
  reducedMotion = false,
) {
  let generation = 0;
  let active: { controller: AbortController; module?: DemoModule } | undefined;

  const close = async () => {
    generation += 1;
    const previous = active;
    active = undefined;
    previous?.controller.abort();
    await previous?.module?.unmount?.();
  };

  return {
    async open(load: () => Promise<DemoModule>) {
      const closing = close();
      const current = ++generation;
      await closing;
      if (current !== generation) return false;
      const entry: { controller: AbortController; module?: DemoModule } = {
        controller: new AbortController(),
      };
      active = entry;
      try {
        const module = await load();
        if (current !== generation) return false;
        entry.module = module;
        await module.mount(container, {
          signal: entry.controller.signal,
          reducedMotion,
          announce: (message) => {
            if (current === generation) announce(message);
          },
        });
        return current === generation;
      } catch (error) {
        if (current !== generation) return false;
        await close();
        throw entry.module ? error : new DemoImportError(error);
      }
    },
    close,
  };
}
