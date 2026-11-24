// Solmar Keys — world and tuning constants.
//
// One place for every number the rest of the game agrees on: the island's size,
// its road grid, movement speeds, the wanted system and the mission payouts.

export const WORLD = { w: 3200, h: 2400 };

// The island's road grid. Avenues run north-south, streets east-west; every
// crossing is an intersection traffic can turn at.
export const AVENUES = [400, 1200, 2000, 2800];
export const STREETS = [300, 900, 1500, 2100];
export const ROAD_W = 64;

// Deterministic seed: the same seed always builds the same city, so screenshots
// staged with ?shot= are reproducible.
export const SEED = 20261124;

// Movement: on foot in pixels per second, driving in pixels per second.
export const WALK_SPEED = 180;
export const RUN_SPEED = 285;
export const CAR_TOP_SPEED = 430;
export const CAR_ACCEL = 320;
export const CAR_BRAKE = 520;
export const CAR_TURN = 2.6;
export const TRAFFIC_SPEED = 130;
export const PED_SPEED = 55;

// The wanted system: 0 to 5 stars. Heat rises with crime and cools when the
// player stays clean; each whole 20 heat is one star.
export const WANTED_MAX = 5;
export const HEAT_PER_STAR = 20;
export const HEAT_DECAY_PER_SEC = 1.6;
export const CRIME_HIT_PED = 20;
export const CRIME_HIT_CAR = 12;
export const CRIME_STEAL_CAR = 20;
export const CRIME_PUNCH = 12;

// Cars and the player.
export const CAR_HEALTH = 100;
export const PLAYER_HEALTH = 100;
export const POLICE_RAM_DAMAGE = 14;
export const BUSTED_CASH_LOSS = 0.1;

// The story: three jobs for Rico Vega, paid on delivery.
export const MISSIONS = [
  {
    id: 'pickup',
    title: 'The Pickup',
    payout: 300,
    intro: 'Rico Vega needs a package picked up from the marina and dropped at the Coral Court hotel. No questions.',
    steps: [
      { kind: 'goto', label: 'Pick up the package at the marina', x: 2900, y: 2180 },
      { kind: 'goto', label: 'Deliver it to the Coral Court hotel', x: 1375, y: 280 },
    ],
  },
  {
    id: 'getaway',
    title: 'The Getaway',
    payout: 600,
    intro: 'Rico\'s associate is pinned down by the Solmar PD near the north docks. Get him out and lose the tail.',
    steps: [
      { kind: 'goto', label: 'Reach Rico\'s associate at the north docks', x: 400, y: 180 },
      { kind: 'escape', label: 'Lose the police, then reach the safehouse', x: 2000, y: 1500 },
    ],
  },
  {
    id: 'score',
    title: 'The Big Score',
    payout: 1000,
    intro: 'An armored van is parked outside the Solmar Bank. Take it, and bring it to the warehouse on Pier 9.',
    steps: [
      { kind: 'goto', label: 'Steal the armored van at Solmar Bank', x: 2090, y: 1000 },
      { kind: 'goto', label: 'Deliver the van to the Pier 9 warehouse', x: 3050, y: 2180 },
    ],
  },
];

// Where the player starts: on foot on the promenade by the south beach.
export const PLAYER_START = { x: 1200, y: 2250 };

// localStorage key for the save.
export const SAVE_KEY = 'solmar-keys-save-v1';

// Sun-soaked palette for the island: warm sand, teal water, pastel blocks.
export const PALETTE = {
  grass: '#7fae62',
  grassDark: '#74a258',
  road: '#3c3f46',
  roadLine: '#e8d44d',
  sidewalk: '#b9b3a4',
  sand: '#e8d29a',
  water: '#2e8fb5',
  waterDeep: '#1f6f92',
  buildingRoofs: ['#c96f4a', '#d9a441', '#7d9bb5', '#b56a7d', '#8fae7e', '#c9b458'],
  carColors: ['#d94f3d', '#3d7dd9', '#e8c33d', '#7ed957', '#9b59b6', '#e8e8e8', '#2c2c34', '#e07b39'],
  police: '#2f6fd0',
  player: '#f2c14e',
};
