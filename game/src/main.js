// Solmar Keys — the game itself: state, loop, HUD and the rules that join the
// systems together.
//
// The Game owns the world, the player, the traffic, the police and the missions.
// It runs in three states: menu (the start screen over a quiet city), playing,
// and paused; busted and story-complete are short overlays on top of playing.
// With ?shot=<name> in the URL it stages one deterministic scene instead and
// freezes it for the screenshot.

import { WORLD, SEED, MISSIONS, PLAYER_START, CRIME_HIT_PED, CRIME_HIT_CAR, CRIME_STEAL_CAR, CRIME_PUNCH, CAR_HEALTH, PLAYER_HEALTH, BUSTED_CASH_LOSS } from './config.js';
import { mulberry32 } from './random.js';
import { buildWorld, collideBuildings, clampToIsland } from './world.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import {
  makePlayer, makeCar, spawnTraffic, spawnPeds, updateTraffic, updatePeds,
  drivePlayerCar, stepPlayerOnFoot, circlesTouch, nearestCar, CAR_R,
} from './entities.js';
import { Wanted } from './police.js';
import { MissionManager } from './missions.js';
import { drawScene, drawMinimap, cameraFor } from './render.js';
import { loadSave, saveGame } from './save.js';
import { stageShot } from './shots.js';

const VIEW_W = 1280;
const VIEW_H = 720;

export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.minimap = document.getElementById('minimap');
    this.mctx = this.minimap.getContext('2d');
    this.hud = {
      cash: document.getElementById('hud-cash'),
      stars: document.getElementById('hud-stars'),
      speed: document.getElementById('hud-speed'),
      mission: document.getElementById('hud-mission'),
      objective: document.getElementById('hud-objective'),
      toast: document.getElementById('toast'),
    };
    this.audio = new AudioSys();
    this.input = new Input();
    this.time = 0;
    this.state = 'menu';
    this.staged = false;
    this.bustedTimer = 0;
    this.toastTimer = 0;

    this.world = buildWorld(SEED);
    this.rng = mulberry32(SEED + 1);
    this.player = makePlayer(PLAYER_START.x, PLAYER_START.y);
    this.playerCar = makeCar('player', 1200, 2130, -Math.PI / 2, '#f2c14e');
    this.playerCar.health = CAR_HEALTH;
    this.parked = [];
    this.traffic = spawnTraffic(this.world, mulberry32(SEED + 2));
    this.peds = spawnPeds(this.world, mulberry32(SEED + 3));
    this.wanted = new Wanted(this.world);
    this.missions = new MissionManager();

    this._wireMenu();
  }

  // The start screen: Start begins a new game, Continue resumes a save.
  _wireMenu() {
    const startBtn = document.getElementById('btn-start');
    const continueBtn = document.getElementById('btn-continue');
    const resumeBtn = document.getElementById('btn-resume');
    const againBtn = document.getElementById('btn-again');
    const keepBtn = document.getElementById('btn-keep-playing');
    const save = loadSave();
    if (save && continueBtn) {
      continueBtn.style.display = 'inline-block';
      continueBtn.textContent = `Continue — $${save.cash} · Job ${Math.min(save.missionIndex + 1, 3)} of 3`;
    }
    startBtn?.addEventListener('click', () => this.start(false));
    continueBtn?.addEventListener('click', () => this.start(true));
    resumeBtn?.addEventListener('click', () => this.togglePause(false));
    againBtn?.addEventListener('click', () => this.start(false));
    keepBtn?.addEventListener('click', () => {
      document.getElementById('complete').classList.add('hidden');
      this.state = 'playing';
    });
    document.getElementById('btn-mute')?.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      document.getElementById('btn-mute').textContent = muted ? '🔇 Muted' : '🔊 Sound';
    });
  }

  start(fromSave) {
    this.audio.ensure();
    const save = fromSave ? loadSave() : null;
    if (save) {
      this.player.cash = save.cash;
      this.missions.index = save.missionIndex;
      this.missions.step = save.missionStep;
      this.missions.done = save.missionDone;
      this.player.x = save.x;
      this.player.y = save.y;
    } else {
      this.player.cash = 0;
      this.missions = new MissionManager();
      this.player.x = PLAYER_START.x;
      this.player.y = PLAYER_START.y;
      this.wanted.clear();
    }
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('busted').classList.add('hidden');
    document.getElementById('complete').classList.add('hidden');
    this.state = 'playing';
    this.toast(`Rico Vega: ${this.missions.current ? this.missions.current.intro : 'Free roam. Solmar is yours.'}`, 6);
  }

  togglePause(paused) {
    if (this.state !== 'playing' && this.state !== 'paused') return;
    this.state = paused ? 'paused' : 'playing';
    document.getElementById('pause').classList.toggle('hidden', !paused);
  }

  toast(text, seconds = 3) {
    this.hud.toast.textContent = text;
    this.hud.toast.classList.remove('hidden');
    this.toastTimer = seconds;
  }

  // One simulation step. staged=true runs without input (screenshot staging).
  stepWorld(dt, staged = false) {
    this.time += dt;
    const p = this.player;

    updateTraffic(this.traffic, this.world, dt, this.rng);
    updatePeds(this.peds, this.world, dt, this.rng);
    this.wanted.update(dt, p, this.traffic);

    if (!staged) {
      if (p.invuln > 0) p.invuln -= dt;
      if (p.punchTimer > 0) p.punchTimer -= dt;
      if (this.input.wasPressed('p') || this.input.wasPressed('escape')) this.togglePause(true);
      if (this.input.wasPressed('m')) this.audio.toggleMute();
      if (this.input.wasPressed('e')) this.toggleCar();
      if ((this.input.wasPressed('f') || this.input.mouse.clicked) && p.onFoot) this.punch();
    }

    if (p.onFoot) {
      if (!staged) stepPlayerOnFoot(p, this.input, dt, this.world);
    } else if (p.car) {
      if (staged) {
        // Keep the staged car rolling straight so the scene settles in motion.
        p.car.x += Math.cos(p.car.angle) * p.car.speed * dt;
        p.car.y += Math.sin(p.car.angle) * p.car.speed * dt;
        collideBuildings(this.world, p.car);
        clampToIsland(p.car);
      } else {
        const speed01 = drivePlayerCar(p.car, this.input, dt);
        this.audio.engine(speed01, true);
        if (collideBuildings(this.world, p.car)) {
          // A crash: lose speed, take damage, and the law notices a hard hit.
          if (Math.abs(p.car.speed) > 200) {
            this.audio.crash();
            this.wanted.addCrime(CRIME_HIT_CAR);
          }
          p.car.speed *= -0.25;
          p.car.health -= 6;
        }
        clampToIsland(p.car);
        this.collideCarWorld(p.car);
        if (p.car.health <= 0) this.wreckCar();
      }
      p.x = p.car.x;
      p.y = p.car.y;
    }

    if (!staged) this.audio.siren(dt, this.wanted.level);

    // Missions: scripted wanted levels, payouts and the story's end.
    if (!staged && this.state === 'playing') {
      const res = this.missions.update(p.x, p.y, this.wanted.level);
      if (res === 'step') {
        this.audio.blip();
        const m = this.missions.current;
        this.toast(m.steps[this.missions.step].label, 4);
        if (this.missions.index === 1 && this.missions.step === 1) {
          this.wanted.setLevel(2);
          this.toast('The PD is onto you — lose them, then reach the safehouse!', 5);
        }
        if (this.missions.index === 2 && this.missions.step === 1) {
          this.wanted.setLevel(3);
          this.toast('The van is yours. The whole island is looking for it now.', 5);
        }
      } else if (res === 'mission') {
        const paid = this.missions.justPaid;
        p.cash += paid;
        this.audio.fanfare();
        saveGame(this);
        if (this.missions.done) {
          document.getElementById('complete').classList.remove('hidden');
          this.state = 'playing';
          this.toast(`Story complete! Rico paid $${paid}. Solmar is yours now.`, 6);
        } else {
          this.toast(`Job done — Rico paid $${paid}. Next job: ${this.missions.current.title}`, 5);
        }
      } else if (res === 'hidden') {
        this.toast('Lose the police first — the safehouse is no good with a tail.', 3);
      }
    }

    // Busted: caught on foot by the PD.
    if (p.busted) {
      p.busted = false;
      const fine = Math.floor(p.cash * BUSTED_CASH_LOSS);
      p.cash -= fine;
      p.health = PLAYER_HEALTH;
      p.x = PLAYER_START.x;
      p.y = PLAYER_START.y;
      p.onFoot = true;
      p.car = null;
      this.wanted.clear();
      saveGame(this);
      document.getElementById('busted').classList.remove('hidden');
      this.bustedTimer = 2.5;
      this.state = 'busted';
      this.toast(`Busted! The PD fined you $${fine} and dropped you at the hospital.`, 4);
    }
  }

  // The player's car against traffic, pedestrians and the police.
  collideCarWorld(car) {
    const p = this.player;
    for (const other of this.traffic) {
      if (circlesTouch(car, other)) {
        car.speed *= 0.6;
        other.speed *= 0.5;
        this.audio.thud();
        this.wanted.addCrime(2);
      }
    }
    for (const ped of this.peds) {
      if (ped.state === 'walk' && circlesTouch(car, ped)) {
        ped.state = 'down';
        ped.timer = 4;
        car.speed *= 0.7;
        this.audio.thud();
        this.wanted.addCrime(CRIME_HIT_PED);
        this.toast('You hit a pedestrian! The PD noticed.', 3);
      }
    }
    for (const cop of this.wanted.cops) {
      if (circlesTouch(car, cop)) {
        car.speed *= 0.7;
        cop.speed *= 0.6;
        this.audio.thud();
      }
    }
  }

  wreckCar() {
    const p = this.player;
    this.audio.crash();
    this.toast('Your car is wrecked! You bail out on foot.', 4);
    p.car = null;
    p.onFoot = true;
    p.x += 30;
    p.y += 30;
    p.invuln = 2;
  }

  // E: get in the nearest car, or get out of the one you are driving.
  toggleCar() {
    const p = this.player;
    if (!p.onFoot) {
      // Get out, leaving the car parked where it stands.
      this.parked.push(p.car);
      p.car = null;
      p.onFoot = true;
      p.x += Math.cos(p.angle) * 30;
      p.y += Math.sin(p.angle) * 30;
      clampToIsland(p);
      this.audio.engine(0, false);
      return;
    }
    const car = nearestCar(p, [...this.traffic, ...this.parked, this.playerCar]);
    if (!car) return;
    // Stealing a car the city owns is a crime; your own car is free.
    if (car.kind === 'traffic') {
      this.wanted.addCrime(CRIME_STEAL_CAR);
      this.toast('You stole the car! The PD is on its way.', 3);
      this.traffic = this.traffic.filter((c) => c !== car);
      car.kind = 'player';
    } else if (car === this.playerCar) {
      this.parked = this.parked.filter((c) => c !== car);
    } else {
      this.parked = this.parked.filter((c) => c !== car);
    }
    car.health = Math.max(car.health, 40);
    p.car = car;
    p.onFoot = false;
    p.x = car.x;
    p.y = car.y;
    this.audio.blip(520, 780);
  }

  // F or click: a punch on foot. Knocks a pedestrian down and draws the law.
  punch() {
    const p = this.player;
    if (p.punchTimer > 0) return;
    p.punchTimer = 0.28;
    this.audio.thud();
    for (const ped of this.peds) {
      if (ped.state !== 'walk') continue;
      const dx = ped.x - p.x;
      const dy = ped.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 46) {
        const dot = (dx * Math.cos(p.angle) + dy * Math.sin(p.angle)) / (d || 1);
        if (dot > 0.3) {
          ped.state = 'down';
          ped.timer = 4;
          this.wanted.addCrime(CRIME_PUNCH);
        }
      }
    }
  }

  updateHud() {
    const p = this.player;
    this.hud.cash.textContent = `$${p.cash.toLocaleString()}`;
    this.hud.stars.textContent = '★'.repeat(this.wanted.level) + '☆'.repeat(5 - this.wanted.level);
    this.hud.stars.className = this.wanted.level > 0 ? 'wanted-hot' : '';
    const speed = p.onFoot ? Math.round(p.speed * 2.2) : Math.round(Math.abs(p.car?.speed ?? 0) * 0.32);
    this.hud.speed.textContent = p.onFoot ? `${speed} on foot` : `${speed} mph`;
    const m = this.missions.current;
    this.hud.mission.textContent = m ? `${m.title} — $${m.payout}` : 'Free roam';
    this.hud.objective.textContent = this.missions.label;
    if (this.toastTimer > 0) {
      this.toastTimer -= 1 / 60;
      if (this.toastTimer <= 0) this.hud.toast.classList.add('hidden');
    }
  }

  render() {
    const p = this.player;
    const cam = cameraFor(p, VIEW_W, VIEW_H);
    drawScene(this.ctx, this, cam, VIEW_W, VIEW_H);
    drawMinimap(this.mctx, this, 200, 150);
    this.updateHud();
  }

  frame = (t) => {
    if (this.staged) return;
    const dt = Math.min(1 / 30, (t - (this._last ?? t)) / 1000 || 1 / 60);
    this._last = t;
    // The pause key is caught in exactly one branch per frame: stepWorld
    // handles it while playing, and this branch while paused. A plain `if`
    // here would catch the same press twice in the frame that pauses.
    if (this.state === 'playing') {
      this.stepWorld(dt);
    } else if (this.state === 'paused') {
      if (this.input.wasPressed('p') || this.input.wasPressed('escape')) this.togglePause(false);
    }
    if (this.state === 'busted') {
      this.bustedTimer -= dt;
      if (this.bustedTimer <= 0) {
        document.getElementById('busted').classList.add('hidden');
        this.state = 'playing';
      }
    }
    this.render();
    this.input.endFrame();
    requestAnimationFrame(this.frame);
  };

  // Boot: normal play, or one frozen staged scene for a screenshot.
  boot() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      this.staged = true;
      this.state = 'playing';
      document.getElementById('menu').classList.add('hidden');
      stageShot(this, shot);
      this.render();
      document.title = `Solmar Keys — ${shot}`;
      return;
    }
    requestAnimationFrame(this.frame);
  }
}

// The player car is part of the world the renderer draws.
Object.defineProperty(Game.prototype, 'allCars', {
  get() {
    return [...this.traffic, ...this.parked, ...(this.player.car ? [this.player.car] : [])];
  },
});

const game = new Game();
window.__solmar = game;
game.boot();
