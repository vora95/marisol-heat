// Keyboard input: held keys plus edge-triggered presses.

export const keys = Object.create(null);
const pressed = new Set();

export function initInput() {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!keys[k]) pressed.add(k);
    keys[k] = true;
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
  });
}

export function wasPressed(k) {
  return pressed.has(k);
}

export function endFrame() {
  pressed.clear();
}

export function axis() {
  // Returns {x, y} movement intent from WASD / arrows, normalised.
  let x = 0;
  let y = 0;
  if (keys['a'] || keys['ArrowLeft']) x -= 1;
  if (keys['d'] || keys['ArrowRight']) x += 1;
  if (keys['w'] || keys['ArrowUp']) y -= 1;
  if (keys['s'] || keys['ArrowDown']) y += 1;
  if (x !== 0 && y !== 0) {
    x *= 0.7071;
    y *= 0.7071;
  }
  return { x, y };
}
