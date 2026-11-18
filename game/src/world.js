// City generation for Marisol: a road grid, building blocks, parks,
// the harbour water strip and fixed story landmarks. Deterministic from seed.

import { WORLD, CARS } from './config.js';
import { mulberry32, range, pick } from './random.js';

export function buildCity(seed) {
  const rng = mulberry32(seed);
  const roads = [];
  const step = WORLD.block;
  for (let x = step / 2; x < WORLD.size; x += step) {
    roads.push({ vertical: true, at: x });
    roads.push({ vertical: false, at: x });
  }
  // Buildings fill the blocks between roads.
  const buildings = [];
  const palette = ['#6b5a49', '#5a6b7a', '#7a6a5a', '#4f5a4a', '#715a6b', '#5a5a6b', '#8a7a5a'];
  for (let bx = 0; bx < 8; bx++) {
    for (let by = 0; by < 8; by++) {
      const x0 = bx * step + 150;
      const y0 = by * step + 150;
      const w = step - 300;
      const h = step - 300;
      if (rng() < 0.16) continue; // park / empty lot
      const n = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const bw = w * (n === 1 ? 0.8 : 0.42);
        const bh = h * (n === 1 ? 0.8 : 0.42);
        buildings.push({
          x: x0 + (n === 1 ? w * 0.1 : i * (w * 0.5)),
          y: y0 + (n === 1 ? h * 0.1 : (i % 2) * 0),
          w: bw,
          h: bh,
          color: pick(rng, palette),
          roof: rng() < 0.5,
        });
      }
    }
  }
  // Harbour water along the top-right edge.
  const water = { x: 2700, y: 0, w: 900, h: 420 };
  // Fixed story landmarks (kept clear of buildings).
  const landmarks = [
    { id: 'diner', name: "Mama Luz Diner", x: 420, y: 2940, w: 180, h: 120, color: '#a34a3a' },
    { id: 'market', name: 'Market Stall', x: 560, y: 3080, w: 120, h: 90, color: '#c28a2a' },
    { id: 'harbour', name: 'Harbour Office', x: 3220, y: 700, w: 180, h: 120, color: '#3a6a8a' },
    { id: 'garage', name: 'Palm Heights Garage', x: 2940, y: 2940, w: 200, h: 130, color: '#5a4a6a' },
    { id: 'warehouse', name: 'Warehouse', x: 2940, y: 420, w: 240, h: 150, color: '#6a5a3a' },
    { id: 'safehouse', name: 'Old Town Safehouse', x: 560, y: 560, w: 160, h: 110, color: '#3a7a4a' },
    { id: 'bridge', name: 'Bridge', x: 1720, y: 1720, w: 160, h: 90, color: '#7a7a7a' },
  ];
  // Parked cars scattered on road edges.
  const parked = [];
  const models = CARS.map((c) => c.model);
  for (let i = 0; i < 26; i++) {
    const vertical = rng() < 0.5;
    const roadAt = (1 + Math.floor(rng() * 8)) * step - step / 2;
    const along = range(rng, 300, WORLD.size - 300);
    parked.push({
      model: pick(rng, models),
      x: vertical ? roadAt + 34 : along,
      y: vertical ? along : roadAt + 34,
      angle: vertical ? Math.PI / 2 : 0,
      taken: false,
    });
  }
  return { roads, buildings, water, landmarks, parked, rng };
}

export function districtAt(x, y) {
  for (const d of WORLD.districts) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return WORLD.districts[0];
}

export function onRoad(city, x, y) {
  const half = WORLD.road / 2 + 6;
  for (const r of city.roads) {
    if (r.vertical && Math.abs(x - r.at) < half) return true;
    if (!r.vertical && Math.abs(y - r.at) < half) return true;
  }
  return false;
}

export function hitBuilding(city, x, y, pad) {
  const p = pad || 0;
  for (const b of city.buildings) {
    if (x > b.x - p && x < b.x + b.w + p && y > b.y - p && y < b.y + b.h + p) return b;
  }
  for (const l of city.landmarks) {
    if (x > l.x - p && x < l.x + l.w + p && y > l.y - p && y < l.y + l.h + p) return l;
  }
  return null;
}

export function inWater(city, x, y) {
  const w = city.water;
  return x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h;
}
