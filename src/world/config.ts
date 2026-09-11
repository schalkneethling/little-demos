export const ARCADE_PHYSICS_CONFIG = {
  debug: false,
  // Phaser's fixed mode advances at most one 60 Hz step per rendered frame.
  // Elapsed-time integration keeps player speed stable when rendering is slower.
  fixedStep: false,
} as const;
