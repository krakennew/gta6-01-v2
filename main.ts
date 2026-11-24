// Solmar Keys — a make.fun gta6-01 entry (Node 22, standard library only).
//
// The game lives in this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html plus its ES modules, no library and no
// network request). This program hands the game in: it copies game/ and
// screenshots/ from beside this file into /output and writes /output/dossier.json,
// the summary the judge reads, using the vendored make.fun library.
//
// The game itself is an original top-down open-world crime game: an island city
// to explore on foot and by car, traffic and pedestrians, cars to steal, a wanted
// level with police, three story missions for Rico Vega, combat, a HUD with a
// minimap, a start screen and a save. Nothing in it comes from a commercial game.
//
// Run it locally like the grader does, with MAKEFUN_OUTPUT_DIR standing in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game itself with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Directory this file lives in, and the output directory (the grader's /output,
// or MAKEFUN_OUTPUT_DIR when running it by hand).
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty (reference/gate.json): the dossier text is
// capped at 160 KiB; the rest refuse an entry the scorer would refuse anyway —
// more than 4 screenshots or one over 256 KiB; game/ over 993 files or 48 MiB in
// all, or a path under game/ over 1,000 bytes. game/ counts beside /output's own
// 1,000-entry cap, together with screenshots/ and dossier.json.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));
console.log(`Solmar Keys handed in: game/ + screenshots/ + dossier.json written to ${outputDir}`);
