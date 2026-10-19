# Fettle — a quiet habit tracker

A calm, editorial habit tracker built with plain HTML, CSS and JavaScript. Log a habit, keep a streak, and watch your consistency take shape across a 12-week heatmap.

**Live demo:** https://muhammadawais047.github.io/tracker-app/

## Features

- **Today at a glance** — a progress ring, current streak highlight, and one card per habit.
- **One-tap logging** — a big check button for today, plus tappable week dots for any of the last seven days.
- **Streaks & schedules** — habits can repeat daily, on weekdays, weekends, or custom days. Current streaks skip rest days instead of breaking on them.
- **Insights view** — 30-day completion rate, perfect days, total check-ins, longest streak, a 12-week consistency heatmap, an 8-week rhythm chart, and a per-habit breakdown.
- **Add, edit, delete** — a modal with 24 icons, 6 colours, and a custom weekday picker. Deleting asks for a second tap so nothing disappears by accident.
- **Demo data included** — five seeded habits with ~14 weeks of history so the charts have something to say on first load. Everything is generated locally and deterministically.
- **Private by default** — all habits and logs live in `localStorage`; there is no backend, account, or network request.
- **Responsive & accessible** — keyboard focus states, `aria-pressed` toggles, skip link, reduced-motion support, and a compact mobile layout.

## How streaks work

A habit's current streak counts consecutive **scheduled** days that were completed, walking backwards from today. Unscheduled days are skipped, so a weekday-only habit does not lose its streak over the weekend. If today is scheduled but not yet checked, the streak starts from yesterday rather than resetting to zero.

## Tech

- Vanilla JavaScript (no frameworks, no build step)
- Hand-built CSS and SVG (progress ring, charts, heatmap)
- `localStorage` for persistence
- Deterministic seeded demo data

## Run locally

```bash
git clone https://github.com/MuhammadAwais047/tracker-app.git
cd tracker-app
# open index.html directly, or serve it:
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `n` | New habit |
| `Esc` | Close the habit dialog |

## Licence

MIT © 2026 Muhammad Awais
