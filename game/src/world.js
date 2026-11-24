// Solmar Keys — the island city of Solmar, generated from one seed.
//
// A grid of avenues and streets cuts the island into blocks. Each block holds
// buildings, a park, or a plaza; the south edge is a beach promenade with palms
// and the water beyond it. Everything is deterministic: the same seed always
// builds the same city.
//
// The world also answers the questions gameplay needs: is this point on a road,
// which building (if any) blocks this circle, and where is a random road point.

import { AVENUES, STREETS, ROAD_W, WORLD, PALETTE, PLAYER_START } from './config.js';
import { mulberry32, range, int, pick, chance } from './random.js';

export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const parks = [];
  const palms = [];
  const plazas = [];

  // Block intervals between the roads (and the island edges).
  const xs = [0, ...AVENUES, WORLD.w];
  const ys = [0, ...STREETS, WORLD.h];

  for (let bi = 0; bi < xs.length - 1; bi++) {
    for (let bj = 0; bj < ys.length - 1; bj++) {
      const x0 = xs[bi] + ROAD_W / 2 + 24;
      const x1 = xs[bi + 1] - ROAD_W / 2 - 24;
      const y0 = ys[bj] + ROAD_W / 2 + 24;
      const y1 = ys[bj + 1] - ROAD_W / 2 - 24;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;

      // The south strip is the beach promenade: palms and open sand, no buildings.
      if (y0 > 2050) {
        for (let p = 0; p < 7; p++) {
          palms.push({ x: range(rng, x0 + 20, x1 - 20), y: range(rng, 2140, 2240) });
        }
        continue;
      }

      const roll = rng();
      if (roll < 0.18) {
        // A park: grass, a pond and a few palms.
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let p = 0; p < 3; p++) {
          palms.push({ x: range(rng, x0 + 30, x1 - 30), y: range(rng, y0 + 30, y1 - 30) });
        }
      } else if (roll < 0.28) {
        // A plaza: open paving with a fountain circle.
        plazas.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      } else {
        // Buildings filling the block, one to six of them.
        const cols = (x1 - x0) > 420 ? (chance(rng, 0.5) ? 3 : 2) : 1;
        const rows = (y1 - y0) > 300 ? (chance(rng, 0.5) ? 2 : 1) : 1;
        const cw = (x1 - x0) / cols;
        const ch = (y1 - y0) / rows;
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const bw = range(rng, cw * 0.55, cw * 0.85);
            const bh = range(rng, ch * 0.55, ch * 0.85);
            const bx = x0 + c * cw + (cw - bw) / 2;
            const by = y0 + r * ch + (ch - bh) / 2;
            buildings.push({
              x: bx, y: by, w: bw, h: bh,
              color: pick(rng, PALETTE.buildingRoofs),
              roof: pick(rng, ['flat', 'flat', 'peaked']),
              h: int(rng, 18, 46),
            });
          }
        }
      }
    }
  }

  // Landmark buildings the missions name, placed on fixed spots clear of the
  // roads (a landmark overlapping a road would block traffic and the player).
  const landmarks = [
    { name: 'Coral Court Hotel', x: 1300, y: 150, w: 150, h: 110, color: '#d9a441', roof: 'peaked', h: 52 },
    { name: 'Solmar Bank', x: 2060, y: 950, w: 130, h: 100, color: '#7d9bb5', roof: 'flat', h: 40 },
    { name: 'Pier 9 Warehouse', x: 2960, y: 2160, w: 170, h: 110, color: '#8a6f5c', roof: 'flat', h: 30 },
    { name: 'Marina Office', x: 2900, y: 2160, w: 120, h: 80, color: '#c96f4a', roof: 'flat', h: 26 },
  ];
  // Clear any generated building that would overlap a landmark.
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const cleared = buildings.filter((b) => !landmarks.some((lm) => overlaps(b, lm)));
  for (const lm of landmarks) cleared.push(lm);
  buildings.length = 0;
  buildings.push(...cleared);

  // Grass speckles: deterministic darker patches so the lawn is not flat.
  const speckles = [];
  for (let i = 0; i < 220; i++) {
    speckles.push({ x: range(rng, 0, WORLD.w), y: range(rng, 0, WORLD.h), r: range(rng, 8, 30) });
  }

  return {
    avenues: AVENUES,
    streets: STREETS,
    roadW: ROAD_W,
    buildings,
    parks,
    palms,
    plazas,
    speckles,
    landmarks,
    beachY: 2260,
    waterY: 2340,
    spawn: { ...PLAYER_START },
  };
}

// Is the point (x, y) on a road (including the sidewalk edge)?
export function isOnRoad(world, x, y) {
  const half = world.roadW / 2 + 10;
  for (const ax of world.avenues) if (Math.abs(x - ax) <= half) return true;
  for (const sy of world.streets) if (Math.abs(y - sy) <= half) return true;
  return false;
}

// Is the point (x, y) near a road (on it or on its sidewalk)? Pedestrians
// walk the sidewalks, so they stay within this band and out of the traffic.
export function isNearRoad(world, x, y, pad = 44) {
  const half = world.roadW / 2 + pad;
  for (const ax of world.avenues) if (Math.abs(x - ax) <= half) return true;
  for (const sy of world.streets) if (Math.abs(y - sy) <= half) return true;
  return false;
}

// The nearest point on the road network to (x, y).
export function nearestRoadPoint(world, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const ax of world.avenues) {
    const d = Math.abs(x - ax);
    if (d < bestD) { bestD = d; best = { x: ax, y }; }
  }
  for (const sy of world.streets) {
    const d = Math.abs(y - sy);
    if (d < bestD) { bestD = d; best = { x, y: sy }; }
  }
  return best;
}

// A random point on a random road, for spawning traffic.
export function randomRoadPoint(world, rng) {
  if (rng() < 0.5) {
    return { x: pick(rng, world.avenues) + range(rng, -14, 14), y: range(rng, 80, WORLD.h - 120) };
  }
  return { x: range(rng, 80, WORLD.w - 80), y: pick(rng, world.streets) + range(rng, -14, 14) };
}

// All intersections of the grid.
export function intersections(world) {
  const out = [];
  for (const ax of world.avenues) for (const sy of world.streets) out.push({ x: ax, y: sy });
  return out;
}

// Push a circle (x, y, r) out of every building it overlaps. Returns true if
// any building blocked it. The circle's position is corrected in place.
export function collideBuildings(world, body) {
  let hit = false;
  for (const b of world.buildings) {
    const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < body.r * body.r) {
      hit = true;
      const d = Math.sqrt(d2) || 0.001;
      const push = body.r - d;
      body.x += (dx / d) * push;
      body.y += (dy / d) * push;
    }
  }
  return hit;
}

// Keep a body inside the island. The water is a wall: you cannot swim away,
// so the south edge is the waterline, not the map's edge.
export function clampToIsland(body) {
  body.x = Math.max(24, Math.min(WORLD.w - 24, body.x));
  body.y = Math.max(24, Math.min(2330, body.y));
}
