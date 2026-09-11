# Browser support

Version 1 targets current stable and previous-major releases of:

- Chrome and Chromium-based Edge
- Firefox
- Safari on macOS and iOS

The semantic directory and demo content are the baseline experience. The
enhanced fairground requires JavaScript, Canvas 2D/WebGL support as selected by
Phaser, keyboard events for keyboard movement, and the native `dialog` API.

Support is verified through automated Chromium end-to-end tests plus targeted
manual checks in current Chrome. Cross-browser CI can be expanded after the
vertical slice establishes stable behaviour.
