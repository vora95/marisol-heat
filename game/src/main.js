// Marisol Heat — game loop, state machine, combat, car stealing,
// wanted/heat, autosave and deterministic screenshot scenes.

import { WORLD, SAVE_KEY, VIEW_W, VIEW_H } from './config.js';
import { clamp, dist, mulberry32 } from './random.js';
import { buildCity, onRoad, hitBuilding } from './world.js';
import {
  makePlayer, makeCar, makeTraffic, makePedestrians,
  updatePlayer, updateTraffic, updatePedestrians, updatePolice,
} from './entities.js';
import { makeMissionState, updateMissions, spawnPoliceForWanted } from './missions.js';
import { drawWorld, drawHUD, drawMinimap, drawTitle, drawPause, drawGameOver } from './render.js';
import { keys, wasPressed, initInput, axis, endFrame } from './input.js';
import { ensureAudio, sfx, setSiren } from './audio.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSave(game) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      mission: game.missions.index + 1,
      money: game.player.money,
      hp: game.player.hp,
    }));
  } catch { /* storage unavailable */ }
}

export function newGame(seed, save) {
  const city = buildCity(seed);
  const rng = mulberry32(seed + 7);
  const player = makePlayer(630, 2940);
  const game = {
    seed, city, time: 0, shake: 0,
    player,
    traffic: makeTraffic(city, rng, 14),
    peds: makePedestrians(city, rng, 26),
    police: [],
    guards: [],
    crates: [],
    wanted: 0,
    heatT: 0,
    missions: makeMissionState(),
    storyDone: false,
    state: 'title',
    muted: false,
    save: save || null,
    vanCar: null,
    falconCar: null,
    spawnVan: false,
    spawnFalcon: false,
    spawnGuards: false,
    gameOverReason: '',
    shot: null,
  };
  if (save && save.mission > 1) {
    game.missions.index = Math.min(save.mission - 1, 5);
    game.player.money = save.money || 120;
    game.player.hp = save.hp || 100;
  }
  return game;
}

let game = null;
let last = performance.now();

function nearestParked(game, maxD) {
  const p = game.player;
  let best = null;
  let bestD = maxD;
  for (const c of game.city.parked) {
    if (c.taken) continue;
    const d = dist(p.x, p.y, c.x, c.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  if (game.vanCar && !game.vanCar.taken) {
    const d = dist(p.x, p.y, game.vanCar.x, game.vanCar.y);
    if (d < bestD) {
      bestD = d;
      best = game.vanCar;
    }
  }
  if (game.falconCar && !game.falconCar.taken) {
    const d = dist(p.x, p.y, game.falconCar.x, game.falconCar.y);
    if (d < bestD) {
      bestD = d;
      best = game.falconCar;
    }
  }
  return best;
}

function enterCar(game, parked) {
  const p = game.player;
  const car = makeCar(parked.model, parked.x, parked.y, parked.angle);
  car.taken = true;
  parked.taken = true;
  if (parked === game.vanCar) game.vanCar.taken = true;
  if (parked === game.falconCar) game.falconCar.taken = true;
  p.car = car;
  p.onFoot = false;
  p.x = car.x;
  p.y = car.y;
  sfx.click();
  // Stealing a stranger's car raises heat.
  if (parked.model !== 'Pickup' || game.missions.index !== 0) {
    if (game.wanted < 1) game.wanted = 1;
  }
}

function exitCar(game) {
  const p = game.player;
  if (!p.car) return;
  p.car.x = p.x + Math.cos(p.angle + Math.PI / 2) * 30;
  p.car.y = p.y + Math.sin(p.angle + Math.PI / 2) * 30;
  p.car.speed = 0;
  // Leave the car parked in the world.
  game.city.parked.push({
    model: p.car.model, x: p.car.x, y: p.car.y, angle: p.car.angle, taken: false,
  });
  p.car = null;
  p.onFoot = true;
  sfx.click();
}

function combat(game, dt) {
  const p = game.player;
  if (!p.onFoot) return;
  // Punch: hits guards / peds in front.
  if (wasPressed('f') && p.punchCd <= 0) {
    p.punchCd = 18;
    sfx.punch();
    const hx = p.x + Math.cos(p.angle) * 30;
    const hy = p.y + Math.sin(p.angle) * 30;
    for (const g of game.guards) {
      if (dist(hx, hy, g.x, g.y) < 30) {
        g.hp -= 20;
        if (g.hp <= 0) {
          game.guards.splice(game.guards.indexOf(g), 1);
          game.missions.guards += 1;
          sfx.pickup();
        }
      }
    }
    for (const ped of game.peds) {
      if (dist(hx, hy, ped.x, ped.y) < 26) ped.panic = 90;
    }
    if (game.wanted < 1 && game.guards.length > 0) game.wanted = 1;
  }
  // Pistol: hits the nearest guard / police in the facing cone.
  if (wasPressed('g') && p.shotCd <= 0 && p.ammo > 0) {
    p.shotCd = 22;
    p.ammo -= 1;
    sfx.shot();
    const rangeMax = 320;
    let best = null;
    let bestD = rangeMax;
    for (const g of [...game.guards, ...game.police]) {
      const d = dist(p.x, p.y, g.x, g.y);
      if (d > rangeMax) continue;
      const ang = Math.atan2(g.y - p.y, g.x - p.x);
      let diff = ang - p.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.35 && d < bestD) {
        best = g;
        bestD = d;
      }
    }
    if (best) {
      if (best.hp !== undefined && game.guards.includes(best)) {
        best.hp -= 40;
        if (best.hp <= 0) {
          game.guards.splice(game.guards.indexOf(best), 1);
          game.missions.guards += 1;
        }
      } else if (best.police) {
        best.hp -= 40;
        if (best.hp <= 0) game.police.splice(game.police.indexOf(best), 1);
      }
      if (game.wanted < 2) game.wanted = 2;
    }
  }
}

function updateWanted(game, dt) {
  // Heat decays when the player stays out of police sight.
  game.heatT += dt;
  const nearCop = game.police.some((c) => dist(c.x, c.y, game.player.x, game.player.y) < 420);
  if (!nearCop && game.wanted > 0 && game.heatT > 480) {
    game.wanted -= 1;
    game.heatT = 0;
  }
  spawnPoliceForWanted(game, game.wanted);
  setSiren(game.wanted > 0 && game.state === 'playing');
  sfx.engine(!game.player.onFoot && game.state === 'playing');
}

function update(game, dt) {
  game.time += dt;
  if (game.missions.messageT > 0) game.missions.messageT -= dt;
  if (game.shake > 0) game.shake -= dt * 0.5;

  // Mission spawns.
  if (game.spawnVan && !game.vanCar) {
    game.vanCar = makeCar('Pickup', 470, 2900, 0);
    game.vanCar.color = '#e0b52a';
  }
  if (game.spawnFalcon && !game.falconCar) {
    game.falconCar = makeCar('Falcon GT', 3060, 2900, Math.PI);
  }
  if (game.spawnGuards && game.guards.length === 0 && game.missions.guards === 0 && game.crates.length === 0) {
    const rng = mulberry32(game.seed + 99);
    for (let i = 0; i < 4; i++) {
      game.guards.push({
        x: 3000 + rng() * 160, y: 460 + rng() * 90,
        angle: rng() * Math.PI * 2, hp: 40, speed: 1.1,
      });
    }
    game.crates = [
      { x: 2980, y: 440, taken: false },
      { x: 3120, y: 520, taken: false },
      { x: 3050, y: 480, taken: false },
    ];
  }
  // Guard AI: chase and hit the player on foot.
  for (const g of game.guards) {
    const d = dist(g.x, g.y, game.player.x, game.player.y);
    if (d < 260 && game.player.onFoot) {
      const a = Math.atan2(game.player.y - g.y, game.player.x - g.x);
      g.angle = a;
      g.x += Math.cos(a) * g.speed * dt;
      g.y += Math.sin(a) * g.speed * dt;
      if (d < 26 && game.player.invuln <= 0) {
        game.player.hp -= 8;
        game.player.invuln = 30;
      }
    }
  }
  // Crate pickup.
  for (const c of game.crates) {
    if (!c.taken && dist(game.player.x, game.player.y, c.x, c.y) < 34) {
      c.taken = true;
      game.missions.crates += 1;
      sfx.pickup();
    }
  }
  game.crates = game.crates.filter((c) => !c.taken);

  const input = axis();
  updatePlayer(game.player, input, game.city, dt);
  updateTraffic(game.traffic, game.city, dt);
  updatePedestrians(game.peds, game.city, game.player, dt);
  updatePolice(game.police, game.player, game.city, dt);
  combat(game, dt);

  // Enter / exit car.
  if (wasPressed('e')) {
    if (game.player.onFoot) {
      const near = nearestParked(game, 70);
      if (near) enterCar(game, near);
    } else {
      exitCar(game);
    }
  }

  // Car wrecked while driving.
  if (!game.player.onFoot && game.player.car && game.player.car.hp <= 0) {
    game.player.car = null;
    game.player.onFoot = true;
    game.player.hp -= 15;
    sfx.crash();
  }

  const res = updateMissions(game.missions, game, dt);
  if (res.completed) {
    writeSave(game);
    sfx.mission();
  }

  updateWanted(game, dt);

  // Busted / wasted.
  if (game.player.hp <= 0) {
    game.state = 'over';
    game.gameOverReason = game.wanted > 0 ? 'The Marisol PD caught up with you.' : 'You did not survive the streets.';
    setSiren(false);
    sfx.engine(false);
    sfx.fail();
  }
}

function render(game) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (game.state === 'title') {
    drawTitle(ctx, w, h, game.save);
    return;
  }
  const shakeX = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  const shakeY = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  const cam = {
    x: clamp(game.player.x - w / 2 + shakeX, 0, WORLD.size - w),
    y: clamp(game.player.y - h / 2 + shakeY, 0, WORLD.size - h),
    w, h,
  };
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  drawWorld(ctx, game, cam);
  ctx.restore();
  drawHUD(ctx, game, w, h);
  drawMinimap(ctx, game, w, h);
  if (game.state === 'paused') drawPause(ctx, w, h);
  if (game.state === 'over') drawGameOver(ctx, w, h, game.gameOverReason);
}

function frame(now) {
  const dt = Math.min(3, (now - last) / 16.667);
  last = now;
  if (game.state === 'playing') update(game, dt);
  if (wasPressed('p') && (game.state === 'playing' || game.state === 'paused')) {
    game.state = game.state === 'playing' ? 'paused' : 'playing';
    sfx.click();
  }
  if (wasPressed('m')) {
    game.muted = !game.muted;
  }
  if (game.state === 'title' && (wasPressed('Enter') || wasPressed(' '))) {
    ensureAudio();
    game.state = 'playing';
    sfx.mission();
  }
  if (game.state === 'over' && wasPressed('r')) {
    const save = loadSave();
    game = newGame(game.seed, save);
    game.state = 'playing';
  }
  render(game);
  endFrame();
  requestAnimationFrame(frame);
}

function resize() {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
}

export function boot() {
  resize();
  initInput();
  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed') || '1');
  const shot = params.get('shot');
  const save = loadSave();
  game = newGame(seed, save);
  if (shot) {
    game.shot = shot;
    setupShot(game, shot);
    game.state = 'playing';
    // Advance the world a fixed number of ticks so traffic/police settle.
    for (let i = 0; i < 90; i++) update(game, 1);
    game.state = 'playing';
    render(game);
    window.__shotReady = true;
    return;
  }
  requestAnimationFrame(frame);
}

boot();
