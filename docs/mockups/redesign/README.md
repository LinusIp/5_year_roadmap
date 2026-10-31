# The redesign mockup (pull request #43)

The twelve boards of "Atlas — Redesign mockup", supplied by the user on 31 October 2026 as one bundled HTML page,
unpacked here one screen per file with the bundled fonts and runtime stripped and the scene images' blob addresses
replaced. Each file is the board's markup and styles plus the logic that filled it (the scene order, the sample data);
they are the source of truth the screens were drawn to, not something the app loads.

| Board | File | Screen |
|---|---|---|
| Today | `today.html` | `src/screens/Today.tsx` |
| Plan | `plan.html` | `src/screens/Plan.tsx`, `src/screens/plan/Timeline.tsx` |
| Five-year map | `five-year-map.html` | `src/screens/PhaseMap.tsx` |
| Calendar | `calendar.html` | `src/screens/Calendar.tsx`, `src/screens/calendar/DayColumn.tsx` |
| Daily scenes | `daily-scenes.html` | `src/screens/Scenes.tsx` |
| Library | `library.html` | `src/screens/Library.tsx`, `src/screens/library/Home.tsx` |
| Resource sheet | `resource-sheet.html` | `src/screens/parts/ItemSheet.tsx` |
| Stats | `stats.html` | `src/screens/Activity.tsx` (the Stats tab) |
| Focus | `focus.html` | `src/screens/Focus.tsx` |
| Internships | `internships.html` | `src/screens/Internships.tsx` |
| Sleep | `sleep.html` | `src/screens/Sleep.tsx` |
| Daily log | `daily-log.html` | `src/screens/BlogPost.tsx` |

Where a screen departs from its board, DECISIONS.md ("The redesign mockup") says where and why.
