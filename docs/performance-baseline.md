# Performance baseline

Recorded on 2026-07-30 from `vp build`.

| Output                  |    Minified |      Gzip |
| ----------------------- | ----------: | --------: |
| HTML shell              |     3.25 kB |   1.18 kB |
| Shell CSS               |     7.81 kB |   2.35 kB |
| Shell JavaScript        |     6.38 kB |   2.52 kB |
| Lazy world/Phaser chunk | 1,381.29 kB | 360.11 kB |

The semantic shell does not wait for the world chunk. The Phaser chunk exceeds
Vite's default 500 kB warning threshold and is the first explicit optimization
target after the interaction architecture is proven. Future baselines should add
startup duration, frame consistency, and decoded texture memory once production
assets exist.
