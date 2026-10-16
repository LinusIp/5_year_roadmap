# Build your own regex engine

**Goal.** A regular-expression library that parses patterns to an AST, compiles them to a Thompson NFA, and matches with a Pike VM that supports capture groups, character classes and lazy quantifiers in time linear in the input.

**Why.** No roadmap.sh node fits; it builds recursive-descent parsing, automata theory put to work, and the reason production engines like RE2 and Rust's regex refuse backreferences. It is the full version of the weekly card w-regex-engine-mini, and the parser techniques carry over from crafting-interpreters.

**Scope.** MVP: literals, `.`, anchors `^` and `$`, alternation, grouping, `*`, `+`, `?`, `{m,n}`, their lazy forms, character classes with ranges and negation, `\d \w \s` and their complements, numbered capture groups, leftmost-first (Perl-style) match priority, a `find_all` API. Stretch: a lazy DFA cache for match-only queries, Unicode classes, named groups, a literal prefix scan with memchr.

**Architecture.** The parser builds an AST and reports errors with positions. The compiler lowers the AST to a program of NFA instructions (char, class, split, jump, save, match), expanding counted repetition. The Pike VM advances a list of threads in lock-step over the input, one character at a time; each thread carries its capture slots, and thread order encodes priority so lazy and greedy quantifiers come out right. A test harness reads cases borrowed from an existing engine's suite.

```
pattern ─▶ parser ─▶ AST ─▶ compiler ─▶ NFA program
                                             │
input ─▶ Pike VM (thread list per position) ◀┘ ─▶ match + captures
```

**Stack.** Rust, C++ or Python for a first version (then the hot loop in a compiled language); a test subset adapted from RE2's or Rust regex's test data; Python's `re` as the backtracking comparison; hyperfine or a criterion benchmark.

**Milestones.** Parser and AST with error messages (5 h) · Thompson NFA compiler and a match-only simulation (5 h) · Pike VM with captures and priorities (7 h) · classes, counted and lazy quantifiers (4 h) · borrowed test suite, pathological benchmarks and write-up (4 h). Total 25 h.

**Done when.** At least 300 cases from the borrowed suite pass, with unsupported features (backreferences, lookaround) listed and skipped, not silently failing. Captures agree with Python's `re` on every passing case. The pattern `(a?){n}a{n}` against `a` repeated n times runs in under 10 ms for n = 30, where Python's `re` takes seconds, and matching time grows linearly with input length up to 10 MB.

**Measure and report.** Time against n for two or three pathological patterns, for your engine and Python's `re`, on a log scale; throughput in MB/s on a 100 MB log file for five realistic patterns; NFA size against pattern size; pass rate on the borrowed suite.

**Pitfalls.** Empty loops such as `(a*)*` sending the NFA into an infinite epsilon cycle. Leftmost-longest semantics where the tests expect leftmost-first. Thread priority lost when adding threads, so lazy quantifiers behave greedily. Counted repetition `{1000}` blowing up the program size. Mixing bytes and characters for non-ASCII input.

**References.** w-regex-engine-mini, crafting-interpreters, skiena-adm, build-your-own-x.

**Write-up.** The time-against-n chart beside Python's `re`, the pass-rate table, a diagram of the NFA for one pattern with its Pike VM threads, and what a DFA cache would buy for match-only queries.
