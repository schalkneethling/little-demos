import { describe, expect, test } from "vite-plus/test";
import { KeyboardInput } from "../../src/world/input/keyboard-input.ts";

function keyboardEvent(type: "keydown" | "keyup", code: string, repeat = false) {
  return Object.assign(new Event(type, { cancelable: true }), { code, repeat }) as KeyboardEvent;
}

describe("world keyboard input", () => {
  test("queues one explicit interaction for Enter or Space while active", () => {
    const target = new EventTarget() as HTMLElement;
    const input = new KeyboardInput(target, "arrows-and-wasd");
    input.activate();

    const enter = keyboardEvent("keydown", "Enter");
    target.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(input.consumeInteraction()).toBe(true);
    expect(input.consumeInteraction()).toBe(false);

    target.dispatchEvent(keyboardEvent("keydown", "Space"));
    expect(input.consumeInteraction()).toBe(true);
    input.destroy();
  });

  test("does not queue interactions while inactive or from key repeat", () => {
    const target = new EventTarget() as HTMLElement;
    const input = new KeyboardInput(target, "arrows-and-wasd");

    target.dispatchEvent(keyboardEvent("keydown", "Enter"));
    input.activate();
    target.dispatchEvent(keyboardEvent("keydown", "Enter", true));

    expect(input.consumeInteraction()).toBe(false);
    input.destroy();
  });

  test("does not retain a consumed interaction for a later attraction selection", () => {
    const target = new EventTarget() as HTMLElement;
    const input = new KeyboardInput(target, "arrows-and-wasd");
    input.activate();

    target.dispatchEvent(keyboardEvent("keydown", "Space"));
    expect(input.consumeInteraction()).toBe(true);
    expect(input.consumeInteraction()).toBe(false);
    input.destroy();
  });
});
