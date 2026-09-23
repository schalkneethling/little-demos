export interface DemoContext {
  signal: AbortSignal;
  reducedMotion: boolean;
  /** Subscribes for the session lifetime and immediately receives the latest value. */
  onReducedMotionChange(listener: (reducedMotion: boolean) => void): () => void;
  announce(message: string): void;
}

export interface DemoModule {
  mount(container: HTMLElement, context: DemoContext): void | Promise<void>;
  unmount?(): void | Promise<void>;
}

interface DemoMetadata {
  id: string;
  title: string;
  summary: string;
  category: string;
  attractionId: string | null;
  tags?: readonly string[];
}

export type DemoDefinition = DemoMetadata &
  (
    | { status: "available"; load(): Promise<DemoModule> }
    | { status: "coming-soon" | "unavailable"; load?: never }
  );
