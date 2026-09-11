import type { MovementScheme } from "../../app/app-state";
import { getMovementIntent } from "../player/player-movement";

const movementCodes = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyA",
  "KeyD",
  "KeyS",
  "KeyW",
]);
const interactionCodes = new Set(["Enter", "Space"]);

export class KeyboardInput {
  readonly #pressedCodes = new Set<string>();
  readonly #target: HTMLElement;
  #active = false;
  #interactionRequested = false;
  #scheme: MovementScheme;

  constructor(target: HTMLElement, scheme: MovementScheme) {
    this.#target = target;
    this.#scheme = scheme;
    target.addEventListener("keydown", this.#handleKeyDown);
    target.addEventListener("keyup", this.#handleKeyUp);
    target.addEventListener("blur", this.#handleBlur);
  }

  activate() {
    this.#active = true;
  }

  deactivate() {
    this.#active = false;
    this.#pressedCodes.clear();
    this.#interactionRequested = false;
  }

  setScheme(scheme: MovementScheme) {
    this.#scheme = scheme;
    this.#pressedCodes.clear();
  }

  getIntent() {
    return getMovementIntent(this.#pressedCodes, this.#scheme);
  }

  consumeInteraction() {
    const requested = this.#interactionRequested;
    this.#interactionRequested = false;
    return requested;
  }

  destroy() {
    this.deactivate();
    this.#target.removeEventListener("keydown", this.#handleKeyDown);
    this.#target.removeEventListener("keyup", this.#handleKeyUp);
    this.#target.removeEventListener("blur", this.#handleBlur);
  }

  readonly #handleKeyDown = (event: KeyboardEvent) => {
    if (!this.#active) {
      return;
    }

    if (interactionCodes.has(event.code)) {
      if (!event.repeat) {
        this.#interactionRequested = true;
      }
      event.preventDefault();
      return;
    }

    if (!movementCodes.has(event.code)) {
      return;
    }

    this.#pressedCodes.add(event.code);
    event.preventDefault();
  };

  readonly #handleKeyUp = (event: KeyboardEvent) => {
    if (!this.#active || !movementCodes.has(event.code)) {
      return;
    }

    this.#pressedCodes.delete(event.code);
    event.preventDefault();
  };

  readonly #handleBlur = () => {
    this.deactivate();
  };
}
