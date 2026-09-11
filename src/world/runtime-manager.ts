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
  let mountingGeneration = -1;
  let generation = 0;

  return {
    mount() {
      if (runtime) return Promise.resolve();
      if (mounting && mountingGeneration === generation) return mounting;

      const mountGeneration = generation;
      mountingGeneration = mountGeneration;
      mounting = start()
        .then((startedRuntime) => {
          if (mountGeneration !== generation) {
            startedRuntime.destroy();
            return;
          }

          runtime = startedRuntime;
        })
        .finally(() => {
          if (mountingGeneration === mountGeneration) mounting = null;
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
