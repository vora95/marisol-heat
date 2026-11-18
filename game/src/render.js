// All canvas drawing: the city, cars, people, HUD (wanted stars, health,
// money, mission objective) and the minimap.

import { WORLD, CARS } from './config.js';
import { districtAt } from './world.js';
import { currentMission, missionTarget } from './missions.js';

function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const l = car.l || 100;
  const w = car.w || 42;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-l / 2 + 4, -w / 2 + 5, l, w);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-l / 2, -w / 2, l, w, 9);
  ctx.fill();
  ctx.fillStyle = '#1c2733';
  ctx.beginPath();
  ctx.roundRect(-l * 0.18, -w * 0.36, l * 0.34, w * 0.72, 5);
  ctx.fill();
  ctx.fillStyle = '#d8e8f8';
  ctx.fillRect(l * 0.28, -w * 0.32, 4, w * 0.64);
  ctx.fillStyle = '#f8e84a';
  ctx.fillRect(l / 2 - 5, -w / 2 + 4, 3, 6);
  ctx.fillRect(l / 2 - 5, w / 2 - 10, 3, 6);
  if (car.police) {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-l * 0.1, -w / 2, l * 0.2, w);
    ctx.fillStyle = '#d23a3a';
    ctx.fillRect(-l * 0.32, -w / 2 - 3, 10, 6);
    ctx.fillStyle = '#2a6ad8';
    ctx.fillRect(-l * 0.32, w / 2 - 3, 10, 6);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color, scale) {
  const s = scale || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 9 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c898';
  ctx.beginPath();
  ctx.arc(5 * s, 0, 4.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawWorld(ctx, game, cam) {
  const { city } = game;
  const x0 = cam.x - 40;
  const y0 = cam.y - 40;
  const x1 = cam.x + cam.w + 40;
  const y1 = cam.y + cam.h + 40;

  // Ground: district colours.
  for (const d of WORLD.districts) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(
      Math.max(d.x0, x0), Math.max(d.y0, y0),
      Math.min(d.x1, x1) - Math.max(d.x0, x0),
      Math.min(d.y1, y1) - Math.max(d.y0, y0),
    );
  }
  // Water.
  ctx.fillStyle = '#2a5a7a';
  ctx.fillRect(city.water.x, city.water.y, city.water.w, city.water.h);
  ctx.fillStyle = '#3a7aa8';
  for (let i = 0; i < 8; i++) {
    const wx = city.water.x + 60 + i * 100;
    ctx.fillRect(wx, 120 + (i % 3) * 90, 46, 4);
  }
  // Roads.
  for (const r of city.roads) {
    ctx.fillStyle = '#2e2e33';
    if (r.vertical) ctx.fillRect(r.at - WORLD.road / 2, Math.max(0, y0), WORLD.road, Math.min(WORLD.size, y1) - Math.max(0, y0));
    else ctx.fillRect(Math.max(0, x0), r.at - WORLD.road / 2, Math.min(WORLD.size, x1) - Math.max(0, x0), WORLD.road);
  }
  // Centre dashes.
  ctx.fillStyle = '#c8b84a';
  for (const r of city.roads) {
    for (let t = 100; t < WORLD.size; t += 90) {
      if (r.vertical) {
        if (t > y0 && t < y1) ctx.fillRect(r.at - 2, t, 4, 34);
      } else if (t > x0 && t < x1) {
        ctx.fillRect(t, r.at - 2, 34, 4);
      }
    }
  }
  // Parks: simple green circles on empty blocks.
  ctx.fillStyle = '#4a7a3a';
  for (let bx = 0; bx < 8; bx++) {
    for (let by = 0; by < 8; by++) {
      if ((bx * 7 + by * 3) % 6 === 0) {
        ctx.beginPath();
        ctx.arc(bx * WORLD.block + 210, by * WORLD.block + 210, 52, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Buildings.
  for (const b of city.buildings) {
    if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x, b.y, b.w, 8);
    if (b.roof) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.2, b.w * 0.6, b.h * 0.6);
    }
    // Windows.
    ctx.fillStyle = '#ffe9a8';
    for (let wx = b.x + 12; wx < b.x + b.w - 14; wx += 26) {
      for (let wy = b.y + 12; wy < b.y + b.h - 14; wy += 26) {
        if ((wx + wy) % 52 === 0) ctx.fillRect(wx, wy, 10, 12);
      }
    }
  }
  // Landmarks.
  for (const l of city.landmarks) {
    if (l.x + l.w < x0 || l.x > x1 || l.y + l.h < y0 || l.y > y1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(l.x + 5, l.y + 6, l.w, l.h);
    ctx.fillStyle = l.color;
    ctx.fillRect(l.x, l.y, l.w, l.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(l.name, l.x + l.w / 2, l.y + l.h / 2 + 4);
  }
  // Parked cars.
  for (const c of city.parked) {
    if (c.taken) continue;
    drawCar(ctx, { ...c, l: 96, w: 40, color: (CARS.find((k) => k.model === c.model) || {}).color || '#888' });
  }
  // Mission van / falcon spawns.
  if (game.vanCar) drawCar(ctx, game.vanCar);
  if (game.falconCar) drawCar(ctx, game.falconCar);
  // Crates (mission 5).
  for (const c of game.crates) {
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(c.x - 14, c.y - 14, 28, 28);
    ctx.strokeStyle = '#5a4218';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x - 14, c.y - 14, 28, 28);
    ctx.beginPath();
    ctx.moveTo(c.x - 14, c.y - 14);
    ctx.lineTo(c.x + 14, c.y + 14);
    ctx.moveTo(c.x + 14, c.y - 14);
    ctx.lineTo(c.x - 14, c.y + 14);
    ctx.stroke();
  }
  // Guards (mission 5).
  for (const g of game.guards) {
    drawPerson(ctx, g.x, g.y, g.angle, '#3a3a3a', 1.15);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(g.x - 12, g.y - 20, 24 * (g.hp / 40), 4);
  }
  // Traffic.
  for (const c of game.traffic) drawCar(ctx, c);
  // Rico chase car.
  if (game.missions.chaseCar) drawCar(ctx, game.missions.chaseCar);
  // Police.
  for (const c of game.police) drawCar(ctx, c);
  // Pedestrians.
  for (const p of game.peds) drawPerson(ctx, p.x, p.y, p.angle, p.color, 1);
  // Player.
  const pl = game.player;
  if (pl.onFoot) {
    drawPerson(ctx, pl.x, pl.y, pl.angle, '#e84a4a', 1.2);
    if (pl.punchCd > 12) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pl.x + Math.cos(pl.angle) * 22, pl.y + Math.sin(pl.angle) * 22, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (pl.car) {
    drawCar(ctx, pl.car);
  }
  // Objective marker (pulsing).
  const t = missionTarget(game.missions, game);
  if (!game.missions.done) {
    const pulse = 14 + Math.sin(game.time / 12) * 4;
    ctx.strokeStyle = '#ffe14a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, pulse + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y - 34);
    ctx.lineTo(t.x - 9, t.y - 16);
    ctx.lineTo(t.x + 9, t.y - 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe14a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.label, t.x, t.y - 42);
  }
}

export function drawHUD(ctx, game, w, h) {
  const pl = game.player;
  // Top-left: wanted stars + money + health.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(12, 12, 320, 92, 10);
  ctx.fill();
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < game.wanted ? '★' : '☆';
  ctx.fillStyle = game.wanted > 0 ? '#ffd23a' : '#888';
  ctx.fillText(stars, 24, 42);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`$${pl.money}`, 24, 68);
  ctx.fillStyle = '#ff6a6a';
  ctx.fillText(`HP ${Math.max(0, Math.round(pl.hp))}`, 130, 68);
  ctx.fillStyle = '#8ad8ff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(pl.onFoot ? 'ON FOOT' : `DRIVING ${pl.car ? pl.car.model : ''}`, 24, 92);
  if (!pl.onFoot && pl.car) {
    ctx.fillStyle = '#ffb84a';
    ctx.fillText(`CAR ${Math.max(0, Math.round(pl.car.hp))}`, 240, 92);
  }
  // Mission panel top-centre.
  const m = currentMission(game.missions);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const mw = 460;
  ctx.beginPath();
  ctx.roundRect(w / 2 - mw / 2, 12, mw, 64, 10);
  ctx.fill();
  ctx.fillStyle = '#ffe14a';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.missions.done ? 'STORY COMPLETE — Marisol is yours!' : `MISSION ${m.id}/6 — ${m.title}`, w / 2, 36);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(game.missions.done ? 'Free roam: cause chaos or relax.' : m.brief, w / 2, 58);
  // Message banner.
  if (game.missions.messageT > 0) {
    ctx.fillStyle = 'rgba(20,20,40,0.8)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 300, 92, 600, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(game.missions.message, w / 2, 114);
  }
  // Controls hint bottom-left.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.roundRect(12, h - 64, 420, 52, 8);
  ctx.fill();
  ctx.fillStyle = '#ddd';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD drive/walk · E enter/exit car · F punch · G pistol (ammo ' + pl.ammo + ')', 22, h - 42);
  ctx.fillText('P pause · M mute · autosave on', 22, h - 24);
  // District label bottom-centre.
  const d = districtAt(pl.x, pl.y);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.roundRect(w / 2 - 90, h - 40, 180, 28, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(d.name, w / 2, h - 21);
}

export function drawMinimap(ctx, game, w, h) {
  const size = 168;
  const mx = w - size - 14;
  const my = h - size - 14;
  const scale = size / WORLD.size;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(mx - 6, my - 6, size + 12, size + 12, 10);
  ctx.fill();
  for (const d of WORLD.districts) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(mx + d.x0 * scale, my + d.y0 * scale, (d.x1 - d.x0) * scale, (d.y1 - d.y0) * scale);
  }
  ctx.fillStyle = '#2a5a7a';
  ctx.fillRect(mx + game.city.water.x * scale, my + game.city.water.y * scale, game.city.water.w * scale, game.city.water.h * scale);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  for (const r of game.city.roads) {
    ctx.beginPath();
    if (r.vertical) {
      ctx.moveTo(mx + r.at * scale, my);
      ctx.lineTo(mx + r.at * scale, my + size);
    } else {
      ctx.moveTo(mx, my + r.at * scale);
      ctx.lineTo(mx + size, my + r.at * scale);
    }
    ctx.stroke();
  }
  const t = missionTarget(game.missions, game);
  if (!game.missions.done) {
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath();
    ctx.arc(mx + t.x * scale, my + t.y * scale, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const c of game.police) {
    ctx.fillStyle = '#3a8aff';
    ctx.fillRect(mx + c.x * scale - 2, my + c.y * scale - 2, 4, 4);
  }
  const pl = game.player;
  ctx.fillStyle = '#ff4a4a';
  ctx.beginPath();
  ctx.arc(mx + pl.x * scale, my + pl.y * scale, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawTitle(ctx, w, h, save) {
  ctx.fillStyle = '#14101e';
  ctx.fillRect(0, 0, w, h);
  // Skyline silhouette.
  ctx.fillStyle = '#241a33';
  for (let i = 0; i < 24; i++) {
    const bw = 40 + ((i * 53) % 60);
    const bh = 90 + ((i * 97) % 180);
    ctx.fillRect(i * 56, h - 260 - bh, bw, bh + 260);
  }
  ctx.fillStyle = '#ff9a3a';
  ctx.beginPath();
  ctx.arc(w - 220, 150, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff4a4a';
  ctx.font = 'bold 84px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MARISOL', w / 2, 250);
  ctx.fillStyle = '#ffe14a';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('HEAT', w / 2, 310);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('An open-world crime game — drive, steal, run missions, outrun the law.', w / 2, 360);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#c8c8c8';
  ctx.fillText('WASD move/drive · E enter car · F punch · G shoot · P pause', w / 2, 400);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(save && save.mission > 1 ? `▶ CONTINUE — Mission ${save.mission}/6 ($${save.money})` : '▶ PRESS ENTER TO START', w / 2, 470);
  ctx.fillStyle = '#888';
  ctx.font = '14px sans-serif';
  ctx.fillText('All characters, places and story are original fiction. No real-world brands.', w / 2, h - 30);
}

export function drawPause(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', w / 2, h / 2 - 20);
  ctx.font = '18px sans-serif';
  ctx.fillText('Press P to resume · progress autosaves after every mission', w / 2, h / 2 + 20);
}

export function drawGameOver(ctx, w, h, reason) {
  ctx.fillStyle = 'rgba(20,0,0,0.75)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ff4a4a';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUSTED', w / 2, h / 2 - 20);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(reason, w / 2, h / 2 + 20);
  ctx.fillText('Press R to restart from the last autosave', w / 2, h / 2 + 56);
}
