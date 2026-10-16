# One finished small game (close the GameDevHQ loop)

**Goal.** One small Unity game, finished: a title screen, one complete loop of play, a win and a lose state, restart, sound, and a build published on itch.io that runs on someone else's machine.

**Why.** Finishing is the skill: scoping, the game loop and cutting. It uses `game-developer/unity-3d`, `game-developer/csharp`, `game-developer/state-machine` and `game-developer/collision-detection`, and closes the GameDevHQ course with something shipped. After this, games become the vehicle for graphics and physics work rather than the goal.

**Scope.** MVP: one mechanic, one level or one endless loop lasting 3–10 minutes, title, pause, game-over and win screens, music and 5–10 sound effects, keyboard and gamepad input, a WebGL build and a Windows build. Stretch: a high-score table, a second level, volume and resolution settings, controller rebinding.

**Architecture.** A GameManager owns a state machine (Title → Playing → Paused → Won or Lost → Title) and loads scenes. Gameplay objects talk to it through events, never directly to the UI. An AudioManager plays music and pooled effects. The UI layer subscribes to score and health events. Physics and input run in the fixed update; rendering and UI in the frame update.

```
Input ─▶ Player ─▶ events ─▶ GameManager (FSM) ─▶ SceneLoader
            │                     │
     Physics, enemies        UI, Audio ◀── score, health events
```

**Stack.** Unity 6 LTS (or the version GameDevHQ used), C#, the Input System package, Cinemachine, free or self-made assets with their licences listed, Git LFS, itch.io with butler for uploads.

**Milestones.** One-page design, scope and cut list (4 h) · core mechanic playable in a grey-box level (16 h) · complete loop with lose, win and restart (14 h) · menus, pause, audio and juice (14 h) · playtests with three people and fixes (12 h) · builds, itch.io page and README (10 h). Total 70 h.

**Done when.** Three people who have not seen the game play it from the title screen to a win or a loss and restart, without help and without the editor. WebGL and Windows builds are downloadable or playable on itch.io. The build holds 60 FPS at 1080p on a mid-range laptop. The public repository has a README, the list of what was cut to ship it, and asset credits.

**Measure and report.** Hours spent against the plan per milestone; frame time p50 and p99 at 1080p in the release build; build size; playtest notes (where each tester got stuck, how long a run lasted); the cut list with one line on why each item went.

**Pitfalls.** Scope creep: a second mechanic before the first is fun. Leaving menus, audio and builds to the last weekend, when they take a third of the time. WebGL builds that break on audio autoplay rules or compression settings. Movement in `Update` without `Time.deltaTime`, so speed depends on frame rate. Nobody else plays it until the end.

**References.** gamedevhq, itch-jams, game-engine-architecture, gaffer-on-games, cert-unity-associate-programmer.

**Write-up.** A 20-second gameplay GIF at the top, the itch.io link, controls, the playtest findings, the cut list, and what you would build next with the same engine.
