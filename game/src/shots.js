// Solmar Keys — staged scenes for the screenshots.
//
// The screenshots are taken by loading the game with ?shot=<name>&seed=1. Each
// shot sets up one deterministic moment — the player driving down an avenue,
// a police chase, the player on foot at the beach, a mission delivery — then
// runs the world forward a fixed number of ticks so traffic and pedestrians
// settle into place. The frame the screenshot catches is the same every time.

import { SEED } from './config.js';

// Fixed staging, per shot: where the player is, whether they are driving, the
// wanted level, which mission is active, and how many ticks to settle.
const SHOTS = {
  cover: {
    label: 'Driving down Coral Avenue',
    onFoot: false, carAngle: -Math.PI / 2, wanted: 0, mission: 0, step: 1,
    x: 1200, y: 550, ticks: 90,
  },
  chase: {
    label: 'Three stars and the PD on your tail',
    onFoot: false, carAngle: Math.PI, wanted: 3, mission: 1, step: 1,
    x: 2000, y: 1500, ticks: 360,
  },
  foot: {
    label: 'On foot at the beach promenade',
    onFoot: true, wanted: 0, mission: 0, step: 0,
    x: 1200, y: 2200, ticks: 150,
  },
  mission: {
    label: 'Delivering the package to the Coral Court',
    onFoot: false, carAngle: -Math.PI / 2, wanted: 1, mission: 0, step: 1,
    x: 1200, y: 700, ticks: 90,
  },
};

export function shotNames() {
  return Object.keys(SHOTS);
}

// Stage one shot on a fresh game. The game object must already have its world,
// traffic, peds, player, wanted and missions built.
export function stageShot(game, name) {
  const shot = SHOTS[name] ?? SHOTS.cover;
  const { player, wanted, missions } = game;

  player.x = shot.x;
  player.y = shot.y;
  player.health = 100;
  player.cash = 1240;
  player.onFoot = shot.onFoot;
  player.angle = shot.carAngle ?? -Math.PI / 2;
  player.punchTimer = 0;

  if (shot.onFoot) {
    player.car = null;
  } else {
    // Give the player a car to drive, parked on the road under them.
    const car = game.playerCar;
    car.x = shot.x;
    car.y = shot.y;
    car.angle = shot.carAngle;
    car.speed = 220;
    car.health = 100;
    player.car = car;
    player.onFoot = false;
  }

  wanted.clear();
  if (shot.wanted > 0) wanted.setLevel(shot.wanted);
  missions.jumpTo(shot.mission, shot.step);

  // Settle the world: run the simulation forward a fixed number of ticks so
  // traffic spreads out and the police close in for the chase shot.
  const dt = 1 / 60;
  for (let i = 0; i < shot.ticks; i++) {
    game.stepWorld(dt, true);
  }
  return shot.label;
}

export function shotLabel(name) {
  return (SHOTS[name] ?? SHOTS.cover).label;
}
