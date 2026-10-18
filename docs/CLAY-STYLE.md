# Atlas style guide: soft clay (include with every UI prompt)

Atlas uses a **soft clay (neumorphic)** look. It replaces the earlier green, flat style, which felt overwhelming. The reference boards on the Atlas Mockups canvas are the source of truth: Today, Today dark, Today timer running, Plan, Activity, Library home, Library shelf, Tech doc, Pick a project, and the phase map.

The idea is that every surface is the **same colour as the background**. Cards, buttons and tabs look pressed out of it (raised) or pressed into it (sunken), using a soft light on the top-left and a soft shadow on the bottom-right. The only colours are **dusty periwinkle blue** and **ice-cold aqua**. Everything else is sage-grey and ink.

## Tokens (CSS variables; never hard-code hex in components)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #E6EAE7 | #2B2F36 | page **and** every surface |
| `--hi` | #FFFFFF | #363B44 | light side of shadows |
| `--lo` | #C3CBC6 | #1F2227 | dark side of shadows |
| `--edge` | rgba(255,255,255,.55) | rgba(255,255,255,.04) | 2px rim on raised tiles |
| `--ink` | #3B404B | #E9ECF1 | main text |
| `--ink2` | #5E6476 | #B1B7C2 | secondary text, inactive icons |
| `--ink3` | #7F8590 | #7B818C | chevrons and decoration only, never text |
| `--blue` | #5A72AB | #8EA3D6 | primary button, checked boxes, done dots |
| `--blue-deep` | #465E9A | #A9BAE3 | blue text and icons, active tab |
| `--blue-soft` | #D9E0F1 | #3A4256 | blue wells (badges, stat tiles, stage band) |
| `--ice` | #BFE2EC | #8CCBDC | secondary button, "today" and "current" markers |
| `--ice-deep` | #2B6A7C | #A6DCEA | ice text and icons, "behind" status |
| `--ice-soft` | #DCEFF4 | #2D4249 | ice wells (big numbers, Watch out) |
| `--on-blue` / `--on-ice` | #FFFFFF / #3B404B | #1F2330 / #2B2F36 | text on filled blue or ice |
| `--deco` | #8EA2D2 | #8EA3D6 | decorative fills only (progress, path lines) |
| `--dash` | #C9D0CB | #3A3F48 | dashed row dividers, path lines not yet reached |
| `--ramp-0…4` | #DCE1DD #CBD5EC #AEBDE0 #8FA3D3 #6A82BC | #24282E #3A4562 #52638F #6E83B8 #8EA3D6 | activity heatmap |

Every text pair above has been checked to be at least 4.5:1, so keep them as they are.

**Block icons** use two colours only. The meaning comes from the icon, not the colour:
- A GameDevHQ: box, ice
- B coding lessons: code, blue
- C ML Zoomcamp: cpu, blue
- D projects (not in the daily template; used for project items): hammer, ice
- E math and physics: sigma, blue
- H Hugging Face: graduation-cap, ice

Retire the multi-colour `--block-*` and `--track-*` palettes from the UI. The heatmap and charts use the ramp.

## Depth (three utilities, used everywhere)

- **raised** (`.tile`): `box-shadow: 6px 6px 14px var(--lo), -6px -6px 14px var(--hi)`, `border: 2px solid var(--edge)`, radius 26px. Used for cards, list groups, the tab bar and widgets.
- **small raised** (`.knob`): `3px 3px 7px var(--lo), -3px -3px 7px var(--hi)`, radius 16px. Used for icon buttons, icon tiles in rows, and chips.
- **sunken** (`.well`): `inset 3px 3px 7px var(--lo), inset -3px -3px 7px var(--hi)`, radius 16px. Used for:
  - the search field
  - progress tracks
  - the segmented-control track
  - unchecked checkboxes
  - the selected chip or tab
  - number badges (optionally tinted with `--blue-soft` or `--ice-soft`)
- No other shadows and no borders on surfaces. Pressing a raised control switches it to sunken for 120 ms.

## Type: Nunito (600, 700, 800), self-hosted

- Page title: 26px, 800
- Card title or Now title: 24px, 800
- Big numbers: 28–32px, 800
- Row title: 16px, 700
- Body: 16px, 600, line-height 1.55
- Meta: 14px, 600, `--ink2`
- Section label: 13px, 800, `--ink2`, sentence case ("Later today")
- Mono (code, the interface block): `ui-monospace`, 13px

## Components

- **Screen:** 20px side padding, 18px gap between tiles, content inside tiles at 14–18px. There's no top app bar; each screen starts with its header row (title and meta on the left, 48px knob buttons on the right).
- **List group:** one `.tile` with a section label, rows of a 40px knob icon tile, title, meta and right meta (or a chevron), with **1.5px dashed `--dash` dividers**. Minimum row height is 64px.
- **Buttons:** 48px pills (radius 999px).
  - The primary is a filled blue gradient (`--blue` to `--blue-deep`) with white text and an inner top highlight. There's one per screen.
  - The secondary is an ice pill, or a `.knob` pill for neutral actions.
- **Chips:** `.knob` pills, 44px. The selected one becomes `.well` with `--blue-deep` text.
- **Segmented control:** a `.well` pill track; the selected segment is a `.knob` pill in `--blue-deep`.
- **Progress:** a `.well` track 14px high with 3px padding; the fill is an ice-to-`--deco` gradient pill.
- **Checkbox:** a 24px sunken square with an 8px radius, inside a 44px hit area. Checked becomes a filled blue gradient with a white tick, and its label gets struck through in `--ink2`.
- **Week strip** (Today): seven 34px circles.
  - Past days are filled blue with white numbers.
  - Today is an ice gradient.
  - A missed day is sunken with `--ink2`.
- **Today header widget:** today's time in a big ice well ("2 h 10 m"). While the timer runs, it shows the running time in a blue well instead ("24:37").
- **Small widgets:** two half-width tiles (Blocks today 2/5 with dots; days left in the phase).
- **Paths (Library):** a subway line.
  - Done stops are `--deco` dots and the current stop is an ice gradient dot.
  - Stops still to come are sunken dots.
  - The connecting line is `--deco` up to the current stop and `--dash` after it.
- **Sheet (Tech doc and other sheets):** the sheet surface is `--bg` with a 32px top radius, a sunken grab handle, a header with a title and a close knob, then tiles.
  - The jump bar is the segmented control.
  - The Interface code sits in a `.well`.
  - Watch out is a tile tinted `--ice-soft` with a zap icon.
- **Diagram:**
  - core boxes: `--blue-soft` fill, `--blue` stroke and `--blue-deep` text
  - offline boxes: `--ice-soft` fill and `--ice` stroke
  - external boxes: `--bg` fill with a dashed `--ink3` stroke
  - all boxes have a 12px radius
- **Tab bar:** a raised pill tile floating 24px above the bottom (plus the safe area). Its four icon buttons are 60×48. The active one is sunken in `--blue-deep`; the others are `--ink2`. The labels stay for screen readers.
- **Icons:** lucide-react only, stroke 2.2, 19–22px.
- **Images:** none in the UI. Don't add illustrations or stock art.

## Scrolling

No visible scrollbars anywhere. Horizontal strips open at the latest item and use an edge fade instead of a bar.

- No visible scrollbars anywhere (`scrollbar-width: none`, plus the WebKit equivalent). Scrolling still works by touch, wheel and keyboard.
- Horizontal strips (heatmaps, chip rows) open at the latest item. They use a soft 24 px edge fade from `--bg` instead of a bar when more content is hidden.

## Accessibility and performance

- Contrast passes as listed. Don't put text in `--ink3`, `--deco` or `--ice`.
- Shadows alone must never be the only signal. Selected and checked states also change colour or icon.
- `prefers-reduced-motion`: no press animation.
- `prefers-contrast: more`: add a 1px `--ink2` outline to tiles and knobs.
- Big shadows are costly on long lists. Virtualised lists use `.knob` icons only, with no per-row tile.

## Checks

- Screenshot each restyled screen beside its board on the canvas in the PR description, light and dark.
- A test fails on hard-coded hex values in components (tokens only).
- Keep: one filled button per screen, 44px targets, Lighthouse accessibility 100, and Today without scrolling past "Later today" at 390×844.
