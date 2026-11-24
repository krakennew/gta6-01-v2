// Solmar Keys — the wanted system and the Solmar PD.
//
// Crime adds heat; heat cools when the player stays clean; every 20 heat is one
// star, up to five. Police cars spawn at the island's edges while the player is
// wanted, chase the player and ram; when the heat is gone they give up and drive
// off. Getting caught on foot means busted: a fine and a trip to the hospital.

import {
  WANTED_MAX, HEAT_PER_STAR, HEAT_DECAY_PER_SEC, CAR_HEALTH, POLICE_RAM_DAMAGE,
  BUSTED_CASH_LOSS,
} from './config.js';
import { mulberry32, range, pick } from './random.js';
import { makeCar, circlesTouch, CAR_R } from './entities.js';
import { clampToIsland, collideBuildings } from './world.js';

export class Wanted {
  constructor(world) {
    this.world = world;
    this.heat = 0;
    this.level = 0;
    this.cops = [];
    this.spawnTimer = 0;
    this.rng = mulberry32(777);
  }

  addCrime(amount) {
    this.heat = Math.min(WANTED_MAX * HEAT_PER_STAR, this.heat + amount);
    this.level = Math.min(WANTED_MAX, Math.floor(this.heat / HEAT_PER_STAR));
  }

  // For missions that script a wanted level (the getaway, the big score).
  setLevel(level) {
    this.heat = level * HEAT_PER_STAR + 10;
    this.level = level;
  }

  clear() {
    this.heat = 0;
    this.level = 0;
    this.cops = [];
  }

  update(dt, player, traffic) {
    // Cool down when the player has been clean for a while.
    this.heat = Math.max(0, this.heat - HEAT_DECAY_PER_SEC * dt);
    const newLevel = Math.floor(this.heat / HEAT_PER_STAR);
    if (newLevel !== this.level) this.level = newLevel;

    // Spawn police while wanted, up to level + 1 cars.
    const want = this.level > 0 ? this.level + 1 : 0;
    this.spawnTimer -= dt;
    if (this.cops.length < want && this.spawnTimer <= 0) {
      this.spawnTimer = 1.6;
      const edge = pick(this.rng, ['n', 's', 'e', 'w']);
      let x = 200;
      let y = 200;
      if (edge === 'n') { x = range(this.rng, 200, 3000); y = 120; }
      if (edge === 's') { x = range(this.rng, 200, 3000); y = 2280; }
      if (edge === 'e') { x = 3080; y = range(this.rng, 200, 2200); }
      if (edge === 'w') { x = 120; y = range(this.rng, 200, 2200); }
      const cop = makeCar('police', x, y, 0, '#2f6fd0');
      cop.speed = 200;
      this.cops.push(cop);
    }
    // Too many cops when the heat dropped: the extras drive off and despawn.
    while (this.cops.length > want) this.cops.pop();

    for (const cop of this.cops) this.chase(cop, player, dt, traffic);
  }

  // A police car steers toward the player and rams; on foot, a touch busts.
  chase(cop, player, dt, traffic) {
    const tx = player.onFoot ? player.x : player.car.x;
    const ty = player.onFoot ? player.y : player.car.y;
    const dx = tx - cop.x;
    const dy = ty - cop.y;
    const dist = Math.hypot(dx, dy) || 1;
    const want = Math.atan2(dy, dx);
    let diff = want - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-3.0 * dt, Math.min(3.0 * dt, diff));
    const targetSpeed = dist > 320 ? 380 : 300;
    cop.speed += Math.max(-260 * dt, Math.min(260 * dt, targetSpeed - cop.speed));
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    collideBuildings(this.world, cop);
    clampToIsland(cop);

    // Ramming the player's car damages it; touching the player on foot busts.
    const target = player.onFoot ? player : player.car;
    const tr = player.onFoot ? 12 : CAR_R;
    const ddx = target.x - cop.x;
    const ddy = target.y - cop.y;
    if (ddx * ddx + ddy * ddy < (tr + CAR_R) * (tr + CAR_R)) {
      if (player.onFoot) {
        if (player.invuln <= 0) player.busted = true;
      } else if (player.car) {
        player.car.health -= POLICE_RAM_DAMAGE * dt * 4;
        // Shove the player's car a little so the ram is visible.
        player.car.x += (ddx / (Math.hypot(ddx, ddy) || 1)) * 26 * dt * 4;
        player.car.y += (ddy / (Math.hypot(ddx, ddy) || 1)) * 26 * dt * 4;
      }
    }
  }

  // The player is safe from the law when no cop can see them and heat is low.
  get hidden() {
    return this.level === 0;
  }
}
