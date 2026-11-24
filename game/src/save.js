// Solmar Keys — saving to the browser's localStorage.
//
// The save holds the player's cash, how far through Rico's jobs they are, and
// where they were standing. It is written whenever a mission pays out and when
// the player is busted, and read back on the start screen's Continue button.

import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function saveGame(game) {
  try {
    const data = {
      cash: game.player.cash,
      missionIndex: game.missions.index,
      missionStep: game.missions.step,
      missionDone: game.missions.done,
      x: game.player.x,
      y: game.player.y,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage may be full or unavailable (private mode): the game plays on.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to do.
  }
}
