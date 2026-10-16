# Build your own text editor

**Goal.** A terminal text editor in C in the style of kilo: raw mode, a row buffer, scrolling, editing, safe saving, incremental search and syntax highlighting for one language, able to edit real files without ever corrupting them.

**Why.** No roadmap.sh node fits; the skills are C memory management in a long-lived program, the terminal as an API (termios, VT100 escape sequences), data structures for text, and testing an interactive program by replaying input. Resources: beej-c and modern-c for the language, missing-semester for the terminal.

**Scope.** MVP: raw mode with clean restore, arrow and page keys, a status bar and message line, insert and delete characters and lines, tabs rendered to spaces, open and save with a dirty flag and quit confirmation, incremental search forward and back, highlighting of C keywords, numbers, strings and comments including multi-line comments. Stretch: undo and redo, a rope or gap buffer instead of row arrays, a second language, soft wrap.

**Architecture.** The terminal layer switches to raw mode, reads keys and decodes escape sequences. The buffer holds an array of rows, each with its raw characters, a rendered form (tabs expanded) and a highlight array. The editor core maps the cursor between raw and rendered columns, handles commands and tracks scroll offsets. The highlighter updates a row and carries an "inside comment" flag to the next. The renderer builds one append buffer per frame and writes it in a single call.

```
keys ─▶ terminal (raw mode) ─▶ editor core ─▶ rows (chars, render, hl)
                                    │               │
         screen ◀── one write ◀── renderer ◀────────┘
```

**Stack.** C17, termios and POSIX I/O only, make, valgrind or AddressSanitizer, a small replay harness that feeds keystroke scripts through a pseudo-terminal.

**Milestones.** Raw mode, key reading and screen drawing (5 h) · row buffer, file loading and scrolling (6 h) · editing and safe saving (7 h) · incremental search (4 h) · syntax highlighting, replay tests and write-up (8 h). Total 30 h.

**Done when.** A replay test applies 1,000 random edit scripts to real source files and compares the saved bytes with a reference model of the same edits: zero mismatches, including files with tabs, very long lines, CRLF endings and no trailing newline. Saving writes a temporary file and renames it, so a killed process never leaves a truncated file. AddressSanitizer reports no errors over the whole replay suite. Search and highlighting work on a 10,000-line C file.

**Measure and report.** Time to open files of 1 MB and 50 MB; keystroke-to-redraw latency p50 and p99; bytes written to the terminal per frame; memory per line of text; replay suite size and pass rate.

**Pitfalls.** Crashing without restoring the terminal, leaving the shell unusable (restore in an atexit handler and on signals). Mixing up raw and rendered column indices, so the cursor drifts on lines with tabs. Truncating the file before the new contents are fully written. Highlighting state that does not propagate when a multi-line comment opens or closes. Drawing piece by piece, which flickers.

**References.** beej-c, kr-c, modern-c, missing-semester, w-rope, build-your-own-x.

**Write-up.** A GIF of editing, searching and highlighting a C file, the replay-test results, the latency and file-size table, and what a rope would change for large files.
