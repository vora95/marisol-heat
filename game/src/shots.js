// Deterministic scene setups for the four screenshots. Each one places the
// player, cars, police and mission state so a single static frame tells
// the story of that scene. Runs only when ?shot=<name> is in the URL.

import { makeCar, makePolice } from './entities.js';
import { dist } from './random.js';

export function setupShot(game, shot) {
  const p = game.player;
  if (shot === 'cover') {
    // Police chase: player in a Falcon GT, wanted 3, two cruisers closing in,
    // minimap + mission objective visible in the HUD.
    p.car = makeCar('Falcon GT', 1800, 1800, -Math.PI / 4);
    p.car.color = '#c23a3a';
    p.onFoot = false;
    p.x = 1800;
    p.y = 1800;
    p.angle = -Math.PI / 4;
    p.money = 540;
    game.wanted = 3;
    game.police = [
      makePolice(1560, 1620),
      makePolice(2040, 1980),
      makePolice(1800, 2150),
    ];
    game.police[0].angle = Math.PI / 4;
    game.police[1].angle = -Math.PI * 0.75;
    game.missions.index = 2;
    game.missions.message = 'Alarm berbunyi! Polisi datang — kabur ke safehouse!';
    game.missions.messageT = 9999;
  } else if (shot === 'drive') {
    // Cruising through Downtown in a sedan, traffic ahead, pedestrians around.
    p.car = makeCar('Sedan', 1800, 1500, Math.PI / 2);
    p.onFoot = false;
    p.x = 1800;
    p.y = 1500;
    p.angle = Math.PI / 2;
    p.money = 310;
    game.wanted = 0;
    game.missions.index = 1;
    game.missions.message = '';
    game.missions.messageT = 0;
    for (const c of game.traffic) {
      c.x = 1800 + (c.x % 700) - 350;
      c.y = 1500 + (c.y % 900) - 450;
    }
  } else if (shot === 'mission') {
    // Warehouse fight: player on foot with pistol, guards and crates,
    // mission 5 banner up.
    p.onFoot = true;
    p.car = null;
    p.x = 3030;
    p.y = 560;
    p.angle = 0;
    p.hp = 78;
    p.ammo = 9;
    p.money = 890;
    game.wanted = 2;
    game.missions.index = 4;
    game.missions.spawned = true;
    game.spawnGuards = true;
    game.missions.message = 'Gudang dijaga 4 penjaga. Lawan dengan tinju atau pistol.';
    game.missions.messageT = 9999;
    game.guards = [
      { x: 3120, y: 500, angle: Math.PI, hp: 40, speed: 1.1 },
      { x: 3080, y: 620, angle: -Math.PI / 2, hp: 25, speed: 1.1 },
      { x: 3180, y: 560, angle: Math.PI * 0.75, hp: 40, speed: 1.1 },
      { x: 2980, y: 640, angle: 0, hp: 40, speed: 1.1 },
    ];
    game.crates = [
      { x: 2980, y: 440, taken: false },
      { x: 3120, y: 520, taken: false },
      { x: 3050, y: 480, taken: false },
    ];
    game.police = [makePolice(2900, 420)];
  } else if (shot === 'walk') {
    // Start / on-foot scene: player walking near Mama Luz Diner, traffic
    // passing, mission 1 objective marker visible.
    p.onFoot = true;
    p.car = null;
    p.x = 620;
    p.y = 2900;
    p.angle = Math.PI / 2;
    p.money = 120;
    game.wanted = 0;
    game.missions.index = 0;
    game.missions.spawned = true;
    game.spawnVan = true;
    game.vanCar = makeCar('Pickup', 470, 2900, 0);
    game.vanCar.color = '#e0b52a';
    game.missions.message = "Mama Luz: ambil van kuning di depan diner, nak.";
    game.missions.messageT = 9999;
    for (const ped of game.peds) {
      ped.x = 620 + ((ped.x * 7) % 500) - 250;
      ped.y = 2900 + ((ped.y * 11) % 420) - 210;
    }
  }
  // Keep the player away from buildings in every scene.
  const b = game.city.buildings.find((bb) =>
    p.x > bb.x - 20 && p.x < bb.x + bb.w + 20 && p.y > bb.y - 20 && p.y < bb.y + bb.h + 20);
  if (b) {
    p.x = b.x + b.w + 60;
    p.y = b.y + b.h + 60;
    if (p.car) {
      p.car.x = p.x;
      p.car.y = p.y;
    }
  }
  void dist;
}
