export interface DestroyableRuntime {
  destroy(): void;
}

export interface RuntimeManager {
  mount(): Promise<void>;
  unmount(): void;
}

export function createRuntimeManager(start: () => Promise<DestroyableRuntime>): RuntimeManager {
  let runtime: DestroyableRuntime | null = null;
  let mounting: Promise<void> | null = null;
  let generation = 0;

  return {
    mount() {
      if (runtime || mounting) {
        return mounting ?? Promise.resolve();
      }

      const mountGeneration = generation;
      mounting = start()
        .then((startedRuntime) => {
          if (mountGeneration !== generation) {
            startedRuntime.destroy();
            return;
          }

          runtime = startedRuntime;
        })
        .finally(() => {
          mounting = null;
        });

      return mounting;
    },
    unmount() {
      generation += 1;
      runtime?.destroy();
      runtime = null;
    },
  };
}
