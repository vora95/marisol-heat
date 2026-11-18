// The six-mission story chain. Each mission is a small state machine:
// objectives complete in order, then a payout and the next mission unlocks.
// The mission controller owns wanted-level targets and scripted spawns.

import { MISSIONS } from './config.js';
import { dist } from './random.js';
import { makeCar, makePolice } from './entities.js';

export function makeMissionState() {
  return {
    index: 0, // 0-based into MISSIONS
    stage: 0, // per-mission sub-stage
    done: false,
    crates: 0,
    guards: 0,
    message: '',
    messageT: 0,
    chaseCar: null,
    chaseHp: 100,
    spawned: false,
  };
}

export function currentMission(ms) {
  return MISSIONS[Math.min(ms.index, MISSIONS.length - 1)];
}

function say(ms, text) {
  ms.message = text;
  ms.messageT = 260;
}

export function missionTarget(ms, game) {
  const m = currentMission(ms);
  if (ms.index === 3 && ms.chaseCar) return { x: ms.chaseCar.x, y: ms.chaseCar.y, label: 'Rico' };
  return m.target;
}

// Called every frame; returns { completed:boolean, failed:boolean }.
export function updateMissions(ms, game, dt) {
  if (ms.done) return { completed: false, failed: false };
  const m = currentMission(ms);
  const p = game.player;
  const d = dist(p.x, p.y, m.target.x, m.target.y);

  switch (ms.index) {
    case 0: {
      if (ms.stage === 0) {
        if (!ms.spawned) {
          ms.spawned = true;
          say(ms, "Mama Luz: ambil van kuning di depan diner, nak.");
          game.spawnVan = true;
        }
        if (!p.onFoot && p.car && p.car.model === 'Pickup') {
          ms.stage = 1;
          say(ms, 'Van didapat! Antar ke lapak pasar.');
        }
      } else if (d < 120) {
        return complete(ms, game, 150, 'Paket sampai. Mama Luz senang.');
      }
      break;
    }
    case 1: {
      if (d < 120) return complete(ms, game, 250, 'Paket diterima di kantor pelabuhan.');
      break;
    }
    case 2: {
      if (ms.stage === 0) {
        if (!ms.spawned) {
          ms.spawned = true;
          say(ms, 'Falcon GT ada di belakang garasi Palm Heights. Ambil diam-diam.');
          game.spawnFalcon = true;
        }
        if (!p.onFoot && p.car && p.car.model === 'Falcon GT') {
          ms.stage = 1;
          game.wanted = Math.max(game.wanted, 2);
          say(ms, 'Alarm berbunyi! Polisi datang — kabur ke safehouse!');
        }
      } else if (d < 140) {
        return complete(ms, game, 400, 'Falcon GT aman di safehouse.');
      }
      break;
    }
    case 3: {
      if (!ms.chaseCar) {
        ms.chaseCar = makeCar('Sedan', 1800, 1500, Math.PI / 2);
        ms.chaseCar.color = '#c23a3a';
        ms.chaseHp = 100;
        say(ms, 'Itu Rico! Tabrak mobilnya sampai menyerah!');
      }
      const c = ms.chaseCar;
      // Rico flees along the road grid toward the bridge.
      const flee = Math.atan2(c.y - p.y, c.x - p.x);
      c.angle += Math.sin(flee - c.angle) * 0.02 * dt;
      c.speed = Math.min(c.speed + 0.02 * dt, 5.2);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      c.x = Math.max(200, Math.min(3400, c.x));
      c.y = Math.max(200, Math.min(3400, c.y));
      if (dist(p.x, p.y, c.x, c.y) < 70 && p.car && Math.abs(p.car.speed) > 3) {
        ms.chaseHp -= 22;
        p.car.speed *= 0.5;
        game.shake = 10;
      }
      if (ms.chaseHp <= 0) {
        ms.chaseCar = null;
        return complete(ms, game, 500, 'Rico menyerah. Mobilnya jadi barang bukti.');
      }
      break;
    }
    case 4: {
      if (!ms.spawned) {
        ms.spawned = true;
        game.spawnGuards = true;
        say(ms, 'Gudang dijaga 4 penjaga. Lawan dengan tinju atau pistol.');
      }
      if (ms.guards >= 4 && ms.crates >= 3) {
        return complete(ms, game, 600, 'Semua peti diamankan dari gudang.');
      }
      break;
    }
    case 5: {
      game.wanted = Math.max(game.wanted, 5);
      if (d < 140) return complete(ms, game, 1000, 'Kamu lolos. Marisol milikmu sekarang.');
      break;
    }
    default:
      break;
  }
  return { completed: false, failed: false };
}

function complete(ms, game, payout, text) {
  const p = game.player;
  p.money += payout;
  game.wanted = 0;
  game.police = [];
  say(ms, text + ` (+$${payout})`);
  ms.index += 1;
  ms.stage = 0;
  ms.spawned = false;
  ms.crates = 0;
  ms.guards = 0;
  if (ms.index >= MISSIONS.length) {
    ms.done = true;
    game.storyDone = true;
  }
  return { completed: true, failed: false };
}

export function spawnPoliceForWanted(game, wanted) {
  const want = wanted === 0 ? 0 : wanted <= 1 ? 1 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : 4;
  while (game.police.length < want) {
    const a = Math.random() * Math.PI * 2;
    const r = 500 + Math.random() * 300;
    game.police.push(makePolice(
      game.player.x + Math.cos(a) * r,
      game.player.y + Math.sin(a) * r,
    ));
  }
  while (game.police.length > want) game.police.pop();
}
