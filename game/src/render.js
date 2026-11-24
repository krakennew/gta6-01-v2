// Solmar Keys — everything the player sees.
//
// A top-down 2D canvas: the island (grass, roads, beach, water), its buildings
// drawn with a little height so the city reads as a city, then the cars, the
// pedestrians and the player, then the mission marker. A second, smaller canvas
// draws the minimap: the whole island at a glance, with the player, the police
// and the mission marker on it.

import { WORLD, PALETTE } from './config.js';

// Camera: follow the player, clamped so it never shows past the island's edge.
export function cameraFor(player, viewW, viewH) {
  return {
    x: Math.max(0, Math.min(WORLD.w - viewW, player.x - viewW / 2)),
    y: Math.max(0, Math.min(WORLD.h - viewH, player.y - viewH / 2)),
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawScene(ctx, game, cam, viewW, viewH) {
  const { world, traffic, peds, wanted, missions, player, time } = game;
  ctx.clearRect(0, 0, viewW, viewH);

  // Grass base, with deterministic darker patches so the lawn is not flat.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = PALETTE.grassDark;
  for (const s of world.speckles) {
    const sx = s.x - cam.x;
    const sy = s.y - cam.y;
    if (sx < -40 || sy < -40 || sx > viewW + 40 || sy > viewH + 40) continue;
    ctx.beginPath();
    ctx.ellipse(sx, sy, s.r, s.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Water along the south edge, sand above it.
  const waterY = world.waterY - cam.y;
  const beachY = world.beachY - cam.y;
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, Math.max(0, beachY), viewW, Math.max(0, viewH - Math.max(0, beachY)));
  ctx.fillStyle = PALETTE.waterDeep;
  ctx.fillRect(0, Math.max(0, waterY), viewW, Math.max(0, viewH - Math.max(0, waterY)));
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0, Math.max(0, waterY), viewW, 14);
  // Wave lines on the water.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const wy = waterY + 30 + i * 16 + Math.sin(time * 1.4 + i * 2.1) * 3;
    if (wy < 0 || wy > viewH) continue;
    ctx.beginPath();
    for (let x = 0; x < viewW; x += 90) {
      ctx.moveTo(x - cam.x * 0.02, wy);
      ctx.lineTo(x + 40 - cam.x * 0.02, wy);
    }
    ctx.stroke();
  }

  // Parks and plazas.
  for (const park of world.parks) {
    ctx.fillStyle = '#5d9b4e';
    ctx.fillRect(park.x - cam.x, park.y - cam.y, park.w, park.h);
    ctx.fillStyle = '#6fb3c9';
    ctx.beginPath();
    ctx.arc(park.x + park.w / 2 - cam.x, park.y + park.h / 2 - cam.y, Math.min(park.w, park.h) * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const plaza of world.plazas) {
    ctx.fillStyle = '#c9c2b0';
    ctx.fillRect(plaza.x - cam.x, plaza.y - cam.y, plaza.w, plaza.h);
    // A fountain in the middle, benches around it, and a few trees.
    const fx = plaza.x + plaza.w / 2 - cam.x;
    const fy = plaza.y + plaza.h / 2 - cam.y;
    ctx.fillStyle = '#6fb3c9';
    ctx.beginPath();
    ctx.arc(fx, fy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fx, fy, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#7a5a34';
    const bw = 26;
    const bh = 8;
    ctx.fillRect(fx - bw / 2, fy - 52, bw, bh);
    ctx.fillRect(fx - bw / 2, fy + 44, bw, bh);
    ctx.fillRect(fx - 62, fy - bh / 2, bh, bw);
    ctx.fillRect(fx + 54, fy - bh / 2, bh, bw);
    ctx.fillStyle = '#3f8f4f';
    for (const [tx, ty] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.arc(fx + tx * (plaza.w / 2 - 26), fy + ty * (plaza.h / 2 - 26), 13, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Roads: dark asphalt with a pale sidewalk edge and a dashed centre line.
  ctx.fillStyle = PALETTE.road;
  for (const ax of world.avenues) ctx.fillRect(ax - world.roadW / 2 - cam.x, -cam.y, world.roadW, WORLD.h);
  for (const sy of world.streets) ctx.fillRect(-cam.x, sy - world.roadW / 2 - cam.y, WORLD.w, world.roadW);
  ctx.strokeStyle = PALETTE.sidewalk;
  ctx.lineWidth = 4;
  for (const ax of world.avenues) {
    ctx.beginPath();
    ctx.moveTo(ax - world.roadW / 2 - cam.x, -cam.y);
    ctx.lineTo(ax - world.roadW / 2 - cam.x, WORLD.h - cam.y);
    ctx.moveTo(ax + world.roadW / 2 - cam.x, -cam.y);
    ctx.lineTo(ax + world.roadW / 2 - cam.x, WORLD.h - cam.y);
    ctx.stroke();
  }
  for (const sy of world.streets) {
    ctx.beginPath();
    ctx.moveTo(-cam.x, sy - world.roadW / 2 - cam.y);
    ctx.lineTo(WORLD.w - cam.x, sy - world.roadW / 2 - cam.y);
    ctx.moveTo(-cam.x, sy + world.roadW / 2 - cam.y);
    ctx.lineTo(WORLD.w - cam.x, sy + world.roadW / 2 - cam.y);
    ctx.stroke();
  }
  ctx.strokeStyle = PALETTE.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 22]);
  for (const ax of world.avenues) {
    ctx.beginPath();
    ctx.moveTo(ax - cam.x, -cam.y);
    ctx.lineTo(ax - cam.x, WORLD.h - cam.y);
    ctx.stroke();
  }
  for (const sy of world.streets) {
    ctx.beginPath();
    ctx.moveTo(-cam.x, sy - cam.y);
    ctx.lineTo(WORLD.w - cam.x, sy - cam.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Crosswalks at every intersection: white zebra stripes across each road.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const ax of world.avenues) {
    for (const sy of world.streets) {
      const cx = ax - cam.x;
      const cy = sy - cam.y;
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(cx - world.roadW / 2 + 4, cy + i * 12 - 3, world.roadW - 8, 6);
      }
    }
  }

  // Buildings: a shaded wall below the roof, so the city has a little height.
  for (const b of world.buildings) {
    const bx = b.x - cam.x;
    const by = b.y - cam.y;
    if (bx > viewW + 80 || by > viewH + 80 || bx + b.w < -80 || by + b.h < -80) continue;
    // A shaded wall below-right of the roof, so the building reads as solid.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(bx + 8, by + 12, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(bx, by, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, b.w - 2, b.h - 2);
    if (b.roof === 'peaked') {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(bx, by + b.h);
      ctx.lineTo(bx + b.w / 2, by + b.h * 0.28);
      ctx.lineTo(bx + b.w, by + b.h);
      ctx.closePath();
      ctx.fill();
    }
    // Windows: a few lit panes on bigger buildings.
    if (b.w > 70 && b.h > 60) {
      ctx.fillStyle = 'rgba(255,244,190,0.85)';
      for (let wy = by + 12; wy < by + b.h - 14; wy += 24) {
        for (let wx = bx + 12; wx < bx + b.w - 14; wx += 26) {
          if ((wx * 7 + wy * 13) % 5 < 2) ctx.fillRect(wx, wy, 10, 12);
        }
      }
    }
  }

  // Palms along the beach and in the parks.
  for (const palm of world.palms) {
    const px = palm.x - cam.x;
    const py = palm.y - cam.y;
    if (px < -30 || py < -30 || px > viewW + 30 || py > viewH + 30) continue;
    ctx.strokeStyle = '#7a5a34';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 3, py - 16);
    ctx.stroke();
    ctx.fillStyle = '#3f8f4f';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.ellipse(px + 3 + Math.cos(a) * 11, py - 18 + Math.sin(a) * 7, 12, 5, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The mission marker: a bobbing gold diamond with a ring.
  const target = missions.target;
  if (target) {
    const mx = target.x - cam.x;
    const my = target.y - cam.y + Math.sin(time * 3) * 6;
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    // A white ring and a dark outline so the marker reads on any background.
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(mx, my, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(28,28,34,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8d34d';
    ctx.beginPath();
    ctx.moveTo(mx, my - 16);
    ctx.lineTo(mx + 12, my);
    ctx.lineTo(mx, my + 16);
    ctx.lineTo(mx - 12, my);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1c1c22';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1c1c22';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◆', mx, my + 5);
  }

  // Pedestrians.
  for (const ped of peds) {
    const px = ped.x - cam.x;
    const py = ped.y - cam.y;
    if (px < -20 || py < -20 || px > viewW + 20 || py > viewH + 20) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(px, py + 6, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (ped.state === 'down') {
      // Knocked down: lying flat, with dizzy stars.
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.ellipse(px, py, 12, 6, ped.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8d34d';
      ctx.font = '12px sans-serif';
      ctx.fillText('✦', px + 12, py - 10);
    } else {
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(px, py, ped.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c2c34';
      ctx.beginPath();
      ctx.arc(px + Math.cos(ped.angle) * 4, py + Math.sin(ped.angle) * 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cars: traffic, police, parked cars and the player's own car.
  const allCars = [...game.allCars, ...wanted.cops];
  for (const car of allCars) {
    const cx = car.x - cam.x;
    const cy = car.y - cam.y;
    if (cx < -40 || cy < -40 || cx > viewW + 40 || cy > viewH + 40) continue;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, -17, -9, 34, 22, 6);
    ctx.fill();
    ctx.fillStyle = car.color;
    roundRect(ctx, -18, -11, 36, 22, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,30,40,0.85)';
    roundRect(ctx, -4, -9, 12, 18, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,200,0.9)';
    ctx.fillRect(15, -9, 3, 5);
    ctx.fillRect(15, 4, 3, 5);
    if (car.kind === 'police') {
      const flash = Math.floor(time * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#2f6fd0';
      ctx.fillRect(-6, -11, 8, 5);
      ctx.fillStyle = flash ? '#2f6fd0' : '#ff3b30';
      ctx.fillRect(-6, 6, 8, 5);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PD', 2, 3);
    }
    if (car.health < 100 && car.kind === 'player') {
      // Smoke from a damaged car.
      ctx.fillStyle = 'rgba(120,120,120,0.5)';
      ctx.beginPath();
      ctx.arc(-14 + Math.sin(time * 9) * 3, -6, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // The player on foot: a yellow figure with a facing tick, plus the punch arc.
  if (player.onFoot) {
    const px = player.x - cam.x;
    const py = player.y - cam.y;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px, py + 8, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c2c34';
    ctx.beginPath();
    ctx.arc(px + Math.cos(player.angle) * 5, py + Math.sin(player.angle) * 5, 5, 0, Math.PI * 2);
    ctx.fill();
    if (player.punchTimer > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, py, 26, player.angle - 0.7, player.angle + 0.7);
      ctx.stroke();
    }
  }

  // A soft vignette so the scene reads as a camera shot.
  const vg = ctx.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.45, viewW / 2, viewH / 2, viewH * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, viewW, viewH);
}

// The minimap: the whole island shrunk onto a small canvas, with the player,
// the police and the mission marker on it.
export function drawMinimap(mctx, game, mw, mh) {
  const { world, traffic, wanted, missions, player } = game;
  const sx = mw / WORLD.w;
  const sy = mh / WORLD.h;
  mctx.clearRect(0, 0, mw, mh);
  mctx.fillStyle = '#5d8a48';
  mctx.fillRect(0, 0, mw, mh);
  mctx.fillStyle = PALETTE.water;
  mctx.fillRect(0, world.waterY * sy, mw, mh - world.waterY * sy);
  mctx.fillStyle = PALETTE.sand;
  mctx.fillRect(0, world.beachY * sy, mw, (world.waterY - world.beachY) * sy);
  mctx.fillStyle = '#3c3f46';
  for (const ax of world.avenues) mctx.fillRect(ax * sx - 1, 0, 2, mh);
  for (const sy2 of world.streets) mctx.fillRect(0, sy2 * sy - 1, mw, 2);
  mctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (const b of world.buildings) mctx.fillRect(b.x * sx, b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
  const target = missions.target;
  if (target) {
    mctx.fillStyle = '#e8d34d';
    mctx.beginPath();
    mctx.arc(target.x * sx, target.y * sy, 4, 0, Math.PI * 2);
    mctx.fill();
  }
  for (const cop of wanted.cops) {
    mctx.fillStyle = '#2f6fd0';
    mctx.beginPath();
    mctx.arc(cop.x * sx, cop.y * sy, 3, 0, Math.PI * 2);
    mctx.fill();
  }
  const px = player.onFoot ? player.x : player.car.x;
  const py = player.onFoot ? player.y : player.car.y;
  mctx.fillStyle = '#fff';
  mctx.beginPath();
  mctx.arc(px * sx, py * sy, 4, 0, Math.PI * 2);
  mctx.fill();
  mctx.fillStyle = '#f2c14e';
  mctx.beginPath();
  mctx.arc(px * sx, py * sy, 2.5, 0, Math.PI * 2);
  mctx.fill();
  mctx.strokeStyle = 'rgba(255,255,255,0.7)';
  mctx.lineWidth = 1;
  mctx.strokeRect(0.5, 0.5, mw - 1, mh - 1);
}
