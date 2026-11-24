# Solmar Keys

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/krakennew/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/krakennew/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Keys** is an original top-down open-world crime game for make.fun's
"Make GTA 6" bounty: a sun-soaked island city to explore on foot and by car,
with traffic and pedestrians, cars to steal, a wanted level with police, three
story missions for Rico Vega, combat, a HUD with a minimap, a start screen and
a save. Everything in it — the city, characters, vehicles, names, story, art
and sound — is original. Nothing comes from any commercial game.

Referral: https://make.fun/r/szzykaht

## Play it

Serve the static files and open the game in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request, no install. Keyboard and mouse only.

| Key | Action |
| --- | --- |
| WASD / Arrows | Walk or drive |
| E | Get in / out of a car (stealing one brings the police) |
| F / Click | Punch |
| Shift | Run |
| P | Pause |
| M | Mute |

## The story

You are a driver for hire with nothing but a borrowed car and a phone full of
Rico Vega's jobs:

1. **The Pickup** ($300) — collect a package at the marina, deliver it to the
   Coral Court hotel.
2. **The Getaway** ($600) — pull Rico's associate out of the north docks and
   lose the Solmar PD tail.
3. **The Big Score** ($1,000) — steal the armored van outside Solmar Bank and
   deliver it to the Pier 9 warehouse.

Finish all three and the island is yours — free roam, no curfew. Progress saves
to the browser automatically.

## How it is built

- `main.ts` — the entry program (Node 22, stdlib only): copies `game/` and
  `screenshots/` to `/output` and writes `dossier.json` with the vendored
  make.fun library.
- `game/index.html` + `game/style.css` — the page and its HUD.
- `game/src/` — one module per system: `config`, `random`, `world` (the
  procedural city), `entities` (player, traffic, pedestrians), `police` (the
  wanted system), `missions` (Rico's jobs), `render` (canvas + minimap),
  `audio` (synthesized sound), `input`, `save`, `shots` (staged scenes).
- `screenshots/` — four staged renders of the game itself (cover, chase, on
  foot, mission), taken with `?shot=<name>` and listed in `shots.json`.

## License

MIT — see LICENSE.
