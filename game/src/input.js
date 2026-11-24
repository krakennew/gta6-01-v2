// Solmar Keys — keyboard and mouse input.
//
// One object owns the key state. The game reads it every frame; menus read the
// "pressed" edge (a key that went down since the last frame) so a held key does
// not repeat a menu action.

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, clicked: false };
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.down.add(e.key.toLowerCase());
    };
    this._onKeyUp = (e) => this.down.delete(e.key.toLowerCase());
    this._onMouse = (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.clicked = true;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousedown', this._onMouse);
  }

  isDown(key) {
    return this.down.has(key.toLowerCase());
  }

  // True once, on the frame the key went down. Cleared by endFrame().
  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }

  // WASD or arrows, as a normalized {x, y} vector (y down is positive).
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;
    if (this.isDown('w') || this.isDown('arrowup')) y -= 1;
    if (this.isDown('s') || this.isDown('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  // Call at the end of every frame.
  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
