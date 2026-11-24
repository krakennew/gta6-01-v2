// Solmar Keys — the moving things: the player, traffic, pedestrians, police cars.
//
// Cars are circles for collision (radius 16) with a heading angle; pedestrians
// are circles too. Traffic follows the road grid, turning at intersections;
// pedestrians wander the sidewalks. The player's car uses simple arcade
// physics: accelerate, brake, steer by speed.

import {
  CAR_TOP_SPEED, CAR_ACCEL, CAR_BRAKE, CAR_TURN, TRAFFIC_SPEED, PED_SPEED,
  WALK_SPEED, RUN_SPEED, PALETTE,
} from './config.js';
import { mulberry32, range, pick, chance } from './random.js';
import { intersections, randomRoadPoint, collideBuildings, clampToIsland, isNearRoad } from './world.js';

export const CAR_R = 16;
export const PED_R = 9;
export const PLAYER_R = 12;

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    onFoot: true, car: null, health: 100, cash: 0,
    punchTimer: 0, punchHit: false, invuln: 0,
  };
}

export function makeCar(kind, x, y, angle, color) {
  return {
    kind, x, y, angle, speed: 0, color,
    health: 100, r: CAR_R,
    target: null, wait: 0, down: false, downTimer: 0,
  };
}

export function makePed(x, y) {
  return {
    x, y, angle: range(Math.random, 0, Math.PI * 2), speed: PED_SPEED,
    r: PED_R, state: 'walk', timer: range(Math.random, 1, 4),
    color: pick(Math.random, ['#e8e8e8', '#d9a441', '#7d9bb5', '#c96f4a', '#8fae7e']),
  };
}

// Spawn the traffic: 22 cars spread over the road grid, each heading along a road.
export function spawnTraffic(world, rng, count = 22) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(world, rng);
    const angle = chance(rng, 0.5)
      ? (chance(rng, 0.5) ? 0 : Math.PI)
      : (chance(rng, 0.5) ? Math.PI / 2 : -Math.PI / 2);
    const car = makeCar('traffic', p.x, p.y, angle, pick(rng, PALETTE.carColors));
    car.speed = range(rng, TRAFFIC_SPEED * 0.7, TRAFFIC_SPEED);
    car.target = pick(rng, intersections(world));
    cars.push(car);
  }
  return cars;
}

// Spawn 26 pedestrians on sidewalks near the roads.
export function spawnPeds(world, rng, count = 26) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(world, rng);
    p.x += range(rng, -40, 40);
    p.y += range(rng, -40, 40);
    peds.push(makePed(p.x, p.y));
  }
  return peds;
}

// One traffic car: drive toward its target intersection, turn there, keep to
// the road. Slows when another car is right ahead of it.
function stepTrafficCar(car, world, dt, rng, others) {
  if (!car.target) car.target = pick(rng, intersections(world));
  const dx = car.target.x - car.x;
  const dy = car.target.y - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 30) {
    // At the intersection: pick a new one, never straight back.
    const options = intersections(world).filter((p) => Math.hypot(p.x - car.x, p.y - car.y) > 200);
    car.target = pick(rng, options);
    return;
  }
  const want = Math.atan2(dy, dx);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  // Slow for the car ahead.
  let ahead = false;
  for (const o of others) {
    if (o === car) continue;
    const ox = o.x - car.x;
    const oy = o.y - car.y;
    const d = Math.hypot(ox, oy);
    if (d < 64 && d > 1) {
      const dot = (ox * Math.cos(car.angle) + oy * Math.sin(car.angle)) / d;
      if (dot > 0.7) { ahead = true; break; }
    }
  }
  const targetSpeed = ahead ? TRAFFIC_SPEED * 0.35 : TRAFFIC_SPEED;
  car.speed += Math.max(-160 * dt, Math.min(160 * dt, targetSpeed - car.speed));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  collideBuildings(world, car);
  clampToIsland(car);
}

export function updateTraffic(cars, world, dt, rng) {
  for (const car of cars) stepTrafficCar(car, world, dt, rng, cars);
}

// One pedestrian: wander, change direction now and then, stay out of buildings.
function stepPed(ped, world, dt, rng) {
  if (ped.state === 'down') {
    ped.timer -= dt;
    if (ped.timer <= 0) {
      ped.state = 'walk';
      ped.timer = range(rng, 2, 6);
      // Get up and run away from where the trouble was.
      ped.angle += Math.PI;
    }
    return;
  }
  ped.timer -= dt;
  if (ped.timer <= 0) {
    ped.timer = range(rng, 2, 6);
    ped.angle += range(rng, -1.2, 1.2);
  }
  const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
  const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
  const probe = { x: nx, y: ny, r: ped.r };
  if (!collideBuildings(world, probe) && isNearRoad(world, nx, ny)) {
    ped.x = nx;
    ped.y = ny;
  } else {
    ped.angle += Math.PI / 2;
  }
  clampToIsland(ped);
}

export function updatePeds(peds, world, dt, rng) {
  for (const ped of peds) stepPed(ped, world, dt, rng);
}

// Drive the player's car with arcade physics. Returns speed as 0..1 of top speed.
export function drivePlayerCar(car, input, dt) {
  const fwd = input.isDown('w') || input.isDown('arrowup');
  const back = input.isDown('s') || input.isDown('arrowdown');
  const left = input.isDown('a') || input.isDown('arrowleft');
  const right = input.isDown('d') || input.isDown('arrowright');
  if (fwd) car.speed += CAR_ACCEL * dt;
  if (back) car.speed -= CAR_BRAKE * dt;
  if (!fwd && !back) car.speed -= Math.sign(car.speed) * 140 * dt;
  if (Math.abs(car.speed) < 4 && !fwd && !back) car.speed = 0;
  car.speed = Math.max(-140, Math.min(CAR_TOP_SPEED, car.speed));
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  if (steer !== 0 && Math.abs(car.speed) > 8) {
    car.angle += steer * CAR_TURN * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 120);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  return Math.abs(car.speed) / CAR_TOP_SPEED;
}

// Walk the player on foot. Returns true if the player moved.
export function stepPlayerOnFoot(player, input, dt, world) {
  const v = input.moveVector();
  const running = input.isDown('shift');
  const speed = running ? RUN_SPEED : WALK_SPEED;
  if (v.x === 0 && v.y === 0) {
    player.speed = 0;
    return false;
  }
  player.angle = Math.atan2(v.y, v.x);
  player.speed = speed;
  const body = { x: player.x + v.x * speed * dt, y: player.y + v.y * speed * dt, r: PLAYER_R };
  collideBuildings(world, body);
  player.x = body.x;
  player.y = body.y;
  clampToIsland(player);
  return true;
}

// Two circles touching (cars, peds, the player).
export function circlesTouch(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.r + b.r;
  return dx * dx + dy * dy < r * r;
}

// The nearest car within maxDist of the player, for entering and stealing.
export function nearestCar(player, cars, maxDist = 70) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
