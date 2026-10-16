# Build your own emulator

**Goal.** A CHIP-8 interpreter that plays the classic ROMs, followed by a Game Boy (Sharp LR35902) CPU core that passes the public instruction test ROMs, both with an SDL front end.

**Why.** Game Developer roadmap: `game-developer/c-cpp`. Skills: fetch-decode-execute loops, flags and two's-complement arithmetic, memory maps and memory-mapped I/O, timing against a real clock, and test-driven work against an external oracle (the test ROMs). It ties the computer-architecture material of nand2tetris and CS61C to code you can play.

**Scope.** MVP: complete CHIP-8 (35 opcodes, 64×32 display, keypad, delay and sound timers, configurable quirks), then the full Game Boy CPU instruction set with interrupts and the timer, enough memory map and serial port to run test ROMs. Stretch: Game Boy PPU background and sprites so Tetris boots, a debugger with breakpoints and a disassembly view, save states.

**Architecture.** A loader maps the ROM into memory. The CPU core keeps registers and flags and executes one instruction per step, returning the cycles it took. A bus routes reads and writes to ROM, RAM and I/O registers. Timers and interrupts tick by the cycles consumed. The front end runs the core for one frame's worth of cycles, then draws the frame buffer, plays sound and polls input at 60 Hz. A headless test runner feeds test ROMs and reads their serial output.

```
ROM ─▶ memory ◀─▶ bus ◀─▶ CPU (fetch, decode, execute)
                    │            │ cycles
             I/O, timers ◀───────┘
                    │
       SDL: video, audio, keys     test runner: serial out
```

**Stack.** C (C17) or Rust, SDL2, the Timendus CHIP-8 test suite and Blargg's Game Boy `cpu_instrs` and `instr_timing` ROMs, a reference opcode table, gdb or a built-in trace log.

**Milestones.** CHIP-8 core, display and input (8 h) · CHIP-8 quirks, timers, sound and test suite (4 h) · Game Boy CPU: registers, loads, ALU and flags (10 h) · jumps, CB-prefixed ops, interrupts and timer (8 h) · test ROMs passing, benchmark and write-up (5 h). Total 35 h.

**Done when.** The Timendus CHIP-8 suite passes its opcode, flags and quirks tests, and ten classic ROMs (Pong, Space Invaders, Tetris, Breakout and others) play correctly. The Game Boy core passes all 11 `cpu_instrs` sub-tests and `instr_timing`, run headless in CI with the serial output checked. A trace-diff against a known-good log matches for the first 100,000 instructions of one test ROM.

**Measure and report.** Emulated instructions per second for each core and the speed as a multiple of real hardware (4.19 MHz for the Game Boy); frame-time p50 and p99 in the SDL front end; number of ROMs and sub-tests passed; lines of code per core.

**Pitfalls.** CHIP-8 interpreters disagree on shift and load/store semantics, so a ROM written for one breaks on another; make quirks switchable. The Game Boy half-carry flag and DAA instruction, which most cores get wrong first. Signed relative jumps and 8-bit wrap-around. Running timers off the host clock instead of consumed cycles. Testing by eye instead of reading the test ROM's serial output.

**References.** nand2tetris, cs61c, harris-ddca, sdl, beej-c, m43, build-your-own-x.

**Write-up.** A GIF of two CHIP-8 games and the Game Boy test ROM passing, the test-results table, the speed numbers, and what a cycle-accurate PPU would take next.
