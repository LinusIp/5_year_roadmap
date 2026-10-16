# Build your own front-end framework

**Goal.** A small TypeScript UI library with a virtual DOM, keyed diffing, function components with state hooks and batched updates, proven by a counter that shows unchanged nodes are never re-created, and a to-do app written in it.

**Why.** Software Architect roadmap: `software-architect/react-vue-angular`, `software-architect/spa-ssr-ssg`, `software-architect/reactive-programming` and `software-architect/w3c-and-whatwg`. Skills: tree diffing, the DOM API underneath every framework, scheduling renders, and the rules of hooks understood from the inside rather than memorised.

**Scope.** MVP: `h()` element factory and JSX via the TypeScript compiler, mount and patch of elements, text and props, keyed child reconciliation, function components, `useState` and `useEffect`, render batching in a microtask, event handlers. Stretch: a longest-increasing-subsequence move pass, context, a tiny router, server-side render to a string.

**Architecture.** Components return virtual nodes. The renderer keeps the previous tree for each mounted root. On a state change the scheduler queues the component and, in one microtask, re-renders it. The differ walks old and new trees: same type means patch props and recurse, different type means replace, and keyed children are matched by key so existing DOM nodes are moved instead of rebuilt. A DOM instrumentation layer counts every create, move and remove.

```
setState ─▶ scheduler (microtask) ─▶ component() ─▶ new vtree
                                                       │
            DOM ◀── patches ◀── diff(old vtree, new) ◀─┘
             └─▶ counters: created / moved / removed
```

**Stack.** TypeScript, Vite for the dev server, Vitest with jsdom for tests, no runtime dependencies; Preact or the vanilla-JS baseline for comparison.

**Milestones.** Virtual nodes, mount and props patching (4 h) · keyed children reconciliation with DOM counters (6 h) · components, hooks and batched scheduling (6 h) · to-do app (add, toggle, delete, filter, persist to localStorage) (5 h) · benchmark, tests and write-up (4 h). Total 25 h.

**Done when.** Reversing, shuffling and inserting into the middle of a 1,000-row keyed list creates zero new row elements, shown by the counter; the same operations without keys show the difference. The to-do app works end to end and keeps input focus while typing. At least 40 unit tests cover diffing edge cases (type changes, null children, text to element, key moves).

**Measure and report.** Milliseconds to create 1,000 rows, update every tenth row, swap two rows and clear, against vanilla JS and Preact (median of 10 runs); DOM operations per update; bundle size minified and gzipped.

**Pitfalls.** Using array indices as keys, which defeats reconciliation and mixes up state between rows. Hooks called conditionally, so state slots shift between renders. Stale closures in event handlers that read old state. Re-rendering synchronously inside a render. Replacing an input element on every keystroke and losing focus and cursor position.

**References.** build-your-own-x, project-based-learning, app-ideas, roadmap-software-architect.

**Write-up.** A GIF of the to-do app beside the live DOM counter during a shuffle, the benchmark table against vanilla and Preact, a diagram of the reconciliation pass, and what a fibre-style interruptible renderer would add.
