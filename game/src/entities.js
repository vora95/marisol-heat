// Entities: the player (on foot / driving), traffic cars, pedestrians,
// police cruisers and roadblocks. All movement is plain arcade physics
// with building collision resolved by axis separation.

import { WORLD, CARS } from './config.js';
import { clamp, dist, angleTo, turnToward, range } from './random.js';
import { onRoad, hitBuilding, inWater } from './world.js';

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    onFoot: true, car: null, hp: 100, money: 120, ammo: 12,
    punchCd: 0, shotCd: 0, invuln: 0,
  };
}

export function makeCar(model, x, y, angle) {
  const spec = CARS.find((c) => c.model === model) || CARS[1];
  return {
    model: spec.model, color: spec.color, top: spec.top, accel: spec.accel,
    max: spec.max, hp: spec.hp, maxHp: spec.hp,
    x, y, angle, speed: 0, w: spec.top * 0.42, l: spec.top,
  };
}

export function makeTraffic(city, rng, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng() < 0.5;
    const roadAt = (1 + Math.floor(rng() * 8)) * WORLD.block - WORLD.block / 2;
    const along = range(rng, 200, WORLD.size - 200);
    const dir = rng() < 0.5 ? 1 : -1;
    const car = makeCar(
      CARS[Math.floor(rng() * 4)].model,
      vertical ? roadAt + (dir > 0 ? -20 : 20) : along,
      vertical ? along : roadAt + (dir > 0 ? -20 : 20),
      vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    );
    car.speed = range(rng, 1.6, 2.6);
    car.ai = { vertical, dir, target: range(rng, 1.4, 2.8) };
    list.push(car);
  }
  return list;
}

export function makePedestrians(city, rng, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      x: range(rng, 200, WORLD.size - 200),
      y: range(rng, 200, WORLD.size - 200),
      angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 0.4, 0.9),
      color: ['#d8c8a8', '#a8b8d8', '#d8a8a8', '#b8d8a8', '#d8d8a8'][i % 5],
      panic: 0,
      wander: range(rng, 60, 200),
    });
  }
  return list;
}

export function makePolice(x, y) {
  const car = makeCar('Sedan', x, y, 0);
  car.color = '#222831';
  car.police = true;
  car.speed = 0;
  return car;
}

function collideMove(city, e, nx, ny, radius) {
  // Move x then y, cancelling the axis that hits a building or water.
  if (!hitBuilding(city, nx, e.y, radius) && !inWater(city, nx, e.y)) e.x = nx;
  if (!hitBuilding(city, e.x, ny, radius) && !inWater(city, e.x, ny)) e.y = ny;
  e.x = clamp(e.x, 40, WORLD.size - 40);
  e.y = clamp(e.y, 40, WORLD.size - 40);
}

export function updatePlayer(p, input, city, dt) {
  p.punchCd = Math.max(0, p.punchCd - dt);
  p.shotCd = Math.max(0, p.shotCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  if (p.onFoot) {
    const sp = 3.4;
    const nx = p.x + input.x * sp * dt;
    const ny = p.y + input.y * sp * dt;
    if (input.x !== 0 || input.y !== 0) p.angle = Math.atan2(input.y, input.x);
    collideMove(city, p, nx, ny, 12);
  } else if (p.car) {
    const c = p.car;
    if (input.y < 0) c.speed += c.accel * dt;
    else if (input.y > 0) c.speed -= c.accel * 0.8 * dt;
    else c.speed *= Math.pow(0.94, dt);
    if (input.x !== 0 && Math.abs(c.speed) > 0.3) {
      c.angle += input.x * 0.045 * dt * Math.sign(c.speed);
    }
    c.speed = clamp(c.speed, -c.max * 0.45, c.max);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    const before = { x: c.x, y: c.y };
    collideMove(city, c, nx, ny, 16);
    if ((c.x === before.x && Math.abs(nx - before.x) > 0.5) || (c.y === before.y && Math.abs(ny - before.y) > 0.5)) {
      c.speed *= 0.4; // bumped a wall
      c.hp -= 0.4;
    }
    p.x = c.x;
    p.y = c.y;
    p.angle = c.angle;
  }
}

export function updateTraffic(list, city, dt) {
  for (const c of list) {
    const a = c.ai;
    if (!a) continue;
    c.speed += (a.target - c.speed) * 0.02 * dt;
    let nx = c.x;
    let ny = c.y;
    if (a.vertical) ny += a.dir * c.speed * dt;
    else nx += a.dir * c.speed * dt;
    if (nx < 120 || nx > WORLD.size - 120 || ny < 120 || ny > WORLD.size - 120) {
      // Wrap around the far side of the same road.
      if (a.vertical) ny = ny < 120 ? WORLD.size - 120 : 120;
      else nx = nx < 120 ? WORLD.size - 120 : 120;
    }
    if (!hitBuilding(city, nx, ny, 14)) {
      c.x = nx;
      c.y = ny;
    }
  }
}

export function updatePedestrians(list, city, player, dt) {
  for (const p of list) {
    const d = dist(p.x, p.y, player.x, player.y);
    if (d < 160) p.panic = 60;
    if (p.panic > 0) {
      p.panic -= dt;
      const away = angleTo(player.x, player.y, p.x, p.y);
      p.angle = away;
      const nx = p.x + Math.cos(away) * 2.2 * dt;
      const ny = p.y + Math.sin(away) * 2.2 * dt;
      if (!hitBuilding(city, nx, ny, 8) && !inWater(city, nx, ny)) {
        p.x = nx;
        p.y = ny;
      }
      continue;
    }
    p.wander -= dt;
    if (p.wander <= 0) {
      p.wander = range(Math.random, 60, 220);
      p.angle = range(Math.random, 0, Math.PI * 2);
    }
    const nx = p.x + Math.cos(p.angle) * p.speed * dt;
    const ny = p.y + Math.sin(p.angle) * p.speed * dt;
    if (!hitBuilding(city, nx, ny, 8) && !inWater(city, nx, ny) && onRoad(city, nx, ny) === false) {
      p.x = nx;
      p.y = ny;
    } else {
      p.angle += Math.PI / 2;
    }
    p.x = clamp(p.x, 60, WORLD.size - 60);
    p.y = clamp(p.y, 60, WORLD.size - 60);
  }
}

export function updatePolice(list, player, city, dt) {
  for (const c of list) {
    const d = dist(c.x, c.y, player.x, player.y);
    const want = angleTo(c.x, c.y, player.x, player.y);
    c.angle = turnToward(c.angle, want, 0.06 * dt);
    const target = d > 700 ? 7.2 : d > 260 ? 6.4 : 4.2;
    c.speed += (target - c.speed) * 0.03 * dt;
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    if (!hitBuilding(city, nx, ny, 14)) {
      c.x = nx;
      c.y = ny;
    } else {
      c.angle += 0.5 * dt;
    }
    // Ram the player when close.
    if (d < 46 && player.invuln <= 0) {
      player.hp -= 6;
      player.invuln = 30;
    }
  }
}
