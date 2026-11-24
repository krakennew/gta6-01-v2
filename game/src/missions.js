// Solmar Keys — the story: three jobs for Rico Vega.
//
// Missions run in order. Each has steps: drive to a marker, then the next.
// Reaching a marker advances the step; finishing the last step pays out and
// unlocks the next job. The 'escape' step is special: the player must first
// drop to zero stars (lose the tail) before the safehouse marker counts.

import { MISSIONS } from './config.js';

export class MissionManager {
  constructor() {
    this.index = 0;
    this.step = 0;
    this.done = false;
    this.justPaid = 0;
  }

  get current() {
    return this.done ? null : MISSIONS[this.index];
  }

  get currentStep() {
    const m = this.current;
    return m ? m.steps[this.step] : null;
  }

  get label() {
    const s = this.currentStep;
    return s ? s.label : (this.done ? 'Story complete — free roam' : '');
  }

  // The marker the HUD and the minimap point at.
  get target() {
    const s = this.currentStep;
    return s ? { x: s.x, y: s.y, label: s.label } : null;
  }

  // Call every frame with the player's position and wanted level.
  // Returns 'step' when a step completed, 'mission' when a job paid out, else null.
  update(playerX, playerY, wantedLevel) {
    const step = this.currentStep;
    if (!step) return null;
    const d = Math.hypot(step.x - playerX, step.y - playerY);
    if (d > 90) return null;
    if (step.kind === 'escape' && wantedLevel > 0) return 'hidden';
    const mission = this.current;
    this.step += 1;
    if (this.step >= mission.steps.length) {
      this.justPaid = mission.payout;
      this.index += 1;
      this.step = 0;
      if (this.index >= MISSIONS.length) this.done = true;
      return 'mission';
    }
    return 'step';
  }

  // Skip to a mission (used by the staged screenshots, not by normal play).
  jumpTo(index, step = 0) {
    this.index = Math.min(index, MISSIONS.length - 1);
    this.step = step;
    this.done = false;
  }
}
