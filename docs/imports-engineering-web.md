# Engineering resources found on the web (pull request #28)

Asked for more engineering resources, Claude searched the web on 22 October 2026 for free electrical, mechanical and
aerospace courses, books, docs and tutorials in the subjects the engineering track was thinnest in (vibration, heat
transfer, thermodynamics, electromagnetics, finite elements, structures, aerodynamics, flight and space mechanics,
materials, manufacturing, batteries, machines and drives). Every URL is one a search result returned, never typed
from memory; the one-off `links-engineering-web` job checked them on the runner. `scratch/eng-build.py` wrote the 86
rows of `scratch/eng-resources.jsonl` in the import format and `scratch/import-eng.ts` (the usual runner, pointed at
that file) upserted them: 82 are new (`data/resources/library-engineering-web.yaml`), four matched an entry the Library
had. No URL was changed and no existing entry was filled.

The sources: MIT OpenCourseWare and MITx (Unified Engineering, Bathe's finite element lectures, 16.100 Aerodynamics,
16.20 Structural Mechanics, 2.810 Manufacturing, 2.25.1x, 16.00x), NPTEL courses from the IITs (forty-six, each free
to learn with an optional paid certificate; the short versions of eleven more on Ansys Innovation Space under CC
BY-SA), TU Delft (the edX aeronautics course and Alderliesten's open textbook), Embry-Riddle (Leishman's open
webbook), UC3M (Soler's textbook), Virginia Tech (Ellingson's open Electromagnetics volumes), NASA JPL, Braeunig's
site, KiCad, Contextual Electronics, MathWorks, OpenFOAM, Analog Devices, Simon Bramble and Brian Douglas's free
control theory book.

## Merged into an entry the Library had

| Import id | Library entry | By |
|---|---|---|
| `mitx-2-005-1x-thermal-fluids` | `mitx-thermal-fluids-engineering-1` | URL |
| `nptel-space-environment` | `course-nptel-space-environment-effects` | URL |
| `nptel-space-flight-mechanics` | `course-nptel-space-flight-mechanics` | title (the same IIT Kharagpur course under an older NPTEL course id) |
| `kicad-getting-started-10` | `tutorial-kicad-getting-started` | title (the 9.0 guide; the 10.0 PDF is the same guide a release on) |

Nothing was filled on them. Searches also found 2.003SC, 2.005, 6.013, 2.092, 16.346, 2.25, 2.007, 2.14, 2.72,
3.091SC, Engineering Statics, Lessons in Electric Circuits, NASA's Beginner's Guide to Aeronautics, Falstad's
simulator, Phil's Lab and Brunton's Control Bootcamp, which the Library already had; those were left out of the file.
