# Build your own programming language

**Goal.** A small dynamically typed language with first-class functions and closures, implemented twice: a tree-walking interpreter, then a bytecode compiler and stack VM that runs the same test programs faster.

**Why.** No roadmap.sh node fits; the skills are lexing, Pratt parsing, scope resolution, closures and upvalues, bytecode design, and a garbage collector. Resources: crafting-interpreters is the spine, and sicp and cs61a explain environments and closures from the language side.

**Scope.** MVP: numbers, strings, booleans, nil, variables, if, while, for, functions, recursion, closures, a print statement, runtime errors with line numbers, a tree-walker and a VM sharing one parser front end and one test suite. Stretch: classes, a mark-sweep garbage collector in the VM, a REPL with history, constant folding.

**Architecture.** The scanner turns source into tokens. A Pratt parser builds an AST. A resolver binds each variable use to its scope depth. The tree-walker evaluates the AST against environment chains. The compiler emits bytecode into chunks with a constant table, turning captured locals into upvalues. The VM runs a dispatch loop over a value stack and call frames, closing upvalues when their frames return. A test runner executes every program on both back ends and diffs their output.

```
source ─▶ scanner ─▶ parser ─▶ AST ─▶ resolver ─┬─▶ tree-walker
                                                └─▶ compiler ─▶ bytecode ─▶ VM
tests/*.lang ─▶ run on both ─▶ diff expected output
```

**Stack.** One systems language for both back ends (C, Rust or Go) so the speed-up measures the design and not the host language; a shell or Python script as the test runner; hyperfine for timing.

**Milestones.** Scanner and Pratt parser (7 h) · resolver and tree-walking interpreter (8 h) · functions, closures and the shared test suite (6 h) · bytecode compiler and VM (12 h) · upvalues in the VM, benchmark and write-up (7 h). Total 40 h.

**Done when.** Recursive `fib(30)` returns 832040 on both back ends, and a closure-based counter keeps independent state across two instances. At least 60 test programs, including scoping and closure edge cases and expected runtime errors, pass on both. The VM runs `fib(30)` at least 3 times faster than the tree-walker, measured with hyperfine over 10 runs.

**Measure and report.** `fib(30)`, a loop-heavy benchmark and a closure-heavy benchmark on both back ends (median and spread); bytecode instructions executed per second; peak memory; lines of code per component.

**Pitfalls.** Closures that capture a copy of a variable instead of the variable, so a counter never counts. Upvalues not closed when a frame returns, leaving dangling pointers into the stack. Operator precedence and associativity bugs that only show up in mixed expressions. Recursion depth limits in the tree-walker hiding as crashes. Writing the two back ends in different host languages and calling the gap a design win.

**References.** crafting-interpreters, sicp, cs61a, w-json-parser, build-your-own-x.

**Write-up.** A short REPL recording, a sample program, the benchmark table for both back ends, a diagram of how an upvalue moves from stack to heap, and what a JIT or a type checker would change.
