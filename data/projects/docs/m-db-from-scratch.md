# A sqlite-style database from scratch

**Goal.** A single-file database in C with a REPL, a pager over fixed-size pages, an on-disk B-tree with leaf and internal node splits, and CREATE TABLE, INSERT and SELECT with WHERE on a small schema, benchmarked against SQLite on the same data.

**Why.** It follows a query from text to bytes on disk and back. It builds B-trees, paging, C and parsing, and the node `software-architect/sql-databases`. Where m17 hands you BusTub's scaffolding, this one is yours from the first line.

**Scope.** MVP: the 'Let's Build a Simple Database' path (a REPL, row serialisation, a pager with a page cache and 4 KiB pages, a cursor, leaf splits, internal node splits and a growing root), then past it: a tokenizer and recursive-descent parser for CREATE TABLE with INTEGER and TEXT columns, INSERT, and SELECT with WHERE comparisons joined by AND; a catalogue of tables in page 0. Stretch: DELETE with node merging, a secondary index, a rollback journal for atomic commits, an EXPLAIN that prints the plan.

**Architecture.** The REPL reads a statement; the tokenizer and parser build an AST; a small executor turns it into cursor operations on the right table. The B-tree layer finds, inserts and splits nodes stored in pages. The pager reads and writes 4 KiB pages from the file and caches them. The catalogue maps table names to root pages and schemas.

```
REPL ─▶ tokenizer ─▶ parser ─▶ AST ─▶ executor
                                         │ cursor
                              B-tree (leaf / internal nodes)
                                         │ get_page(n)
                              pager (cache) ─▶ db file [0: catalogue][1][2] …
```

**Stack.** C11, Make, a test harness that drives the REPL (RSpec as in the tutorial, or pytest), C unit tests, AddressSanitizer, SQLite 3 as the reference and the benchmark.

**Milestones.** REPL, row format and in-memory table (5 h) · pager and persistence (6 h) · leaf nodes, cursor and leaf splits (9 h) · internal nodes and recursive splits with randomised tests (9 h) · SQL tokenizer, parser and executor (7 h) · SQLite benchmark and README (4 h). Total 40 h.

**Done when.** A randomised test inserts 100 000 rows in random key order across several sessions, reopens the file, and finds every row with a full scan returning keys in order; after every 1 000 inserts it checks the B-tree invariants (sorted keys, equal leaf depth, valid child pointers). CREATE TABLE, INSERT and SELECT with WHERE work on a two-table schema. Inserting and looking up 100 000 rows is timed against SQLite, with the inserts both inside one transaction and one per statement, and the numbers are in the README.

**Measure and report.** Insert and point-lookup throughput against SQLite; file size against SQLite for the same rows; tree depth and average page fill; pager cache hit rate; ASan-clean test runs.

**Pitfalls.** Splitting a node and forgetting to update the parent's key for the new right child. Off-by-one cell offsets inside a page. Losing or double-writing pages when the pager cache is full. Struct padding and byte order when casting page memory. Benchmarking SQLite with an fsync per statement while your engine never syncs.

**References.** cmu-15-445, ddia, crafting-interpreters, sqlbolt, build-your-own-x, m17.

**Write-up.** A diagram of one page's layout and of a root split, the benchmark table against SQLite, the invariant checker, and what a journal would take.
