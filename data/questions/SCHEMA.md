# The practice question bank

Atlas's daily Practice sets are drawn from the files in this folder. The format is plain YAML so that the same
bank can be reused by another app later; nothing in it is specific to Atlas's screens. `src/seed/questions.ts`
enforces it with Zod, `npm run validate:data` checks it, and `npm run verify:questions` recomputes every answer.

```
data/questions/
  topics.yaml                       subjects and their topics, in teaching order
  SCHEMA.md                         this file
  <subject>/<topic>.yaml            the questions of one topic
```

Adding a subject needs no schema change: add it to `topics.yaml` with its topics, and a folder of the same id.

## topics.yaml

A list of subjects. Each has `id`, `title`, `short`, `level` (a phrase such as "MIT 18.06"), `tracks` (Atlas
track ids), optional `follows` (a resource whose lecture progress steers new questions), and `topics`: each with
`id`, `title`, optional `units` (lecture ids of the `follows` resource that teach it) and optional `covers`
(roadmap.sh node ids, `roadmap/node`, ticked when the topic's accuracy reaches 85 % over its last 20 answers).
Topic ids are stable: history is stored against them.

## A topic file

```yaml
subject: linear-algebra          # must match the folder
topic: eigenvalues-and-eigenvectors   # must match the file name and topics.yaml
questions:
  - id: la-eig-001               # unique across the whole bank; never reused once shipped
    difficulty: 2                # 1 (recall) to 5 (hard); topics need 1-4
    type: numeric                # see "Types"
    prompt: "Markdown with KaTeX: $A = {{A}}$. What is the larger eigenvalue?"
    params: { p: { int: [-4, 6] }, q: { int: [-4, 6] }, s: { int: [1, 3] } }   # optional: makes it a template
    let: { A: "[[p, s], [0, q]]", big: "max(p, q)" }                        # optional: computed values
    require: ["p != q"]                                                       # optional: constraints on a draw
    answer: big                  # an expression, or a number
    tolerance: { rel: 0.001 }    # optional (numeric, estimate, vector, matrix)
    hints: ["one", "two"]        # 1 to 3, revealed one at a time, each a bigger step
    solution: "Full worked steps, Markdown + KaTeX, may use {{…}}."
    verify: "max(Matrix([[p, s], [0, q]]).eigenvals().keys())"  # independent check, Python + SymPy
    covers: [mit-18-06/lecture-21, game-developer/matrix]       # optional
    source: Original             # or "Adapted from MIT OCW 18.06 problem set 7, problem 3"
    license: CC BY-NC-SA 4.0
    estMinutes: 3
```

### Templates

A question with `params` is a template. Each daily set draws its params from a seed made of the date and the
question id, so two devices see the same numbers and the next day's draw is different.

| Param | Draws |
|---|---|
| `{ int: [lo, hi], not: [0] }` | an integer in [lo, hi], skipping the `not` values |
| `{ real: [lo, hi], step: 0.5 }` | a multiple of `step` from `lo` (default step 0.1) |
| `{ choice: [2, 3, 5] }` | one of the values (numbers or strings) |

`let` computes further values from the params, in order, with mathjs (`det`, `inv`, `transpose`, `max`, matrix
literals `[[1, 2], [3, 4]]`, `sqrt`, `sin`, `pi`, …). `require` lists mathjs conditions every draw must meet
("eigenvalues are integers" is usually easier to build in: choose the eigenvalues as params and construct the
matrix from them in `let`). A draw is retried until every condition holds.

Use templates wherever a question has a numeric core: eigenvalues, determinants, least squares, derivatives,
integrals, Taylor coefficients, kinematics, collisions, orbits. At least 40 % of each subject is templates.

### Filling in text: `{{…}}`

`prompt`, `options`, `hints` and `solution` may contain `{{expression}}`, evaluated in the scope of the draw:

| Form | Gives |
|---|---|
| `{{a + 1}}` | the value: `7`, `0.25`; a matrix becomes a LaTeX `bmatrix`, a 1D array a column vector |
| `{{frac: a/b}}` | an exact fraction in LaTeX, `\frac{3}{4}` |
| `{{signed: b}}` | the value with its sign spelled out: `+ 3` or `- 3`, for "$x {{signed: b}}$" |
| `{{tex: a*x^2 + b*x}}` | the expression with params substituted and simplified, as LaTeX |
| `{{row: v}}` | an array as a row, `(1, 2, 3)` |

Inside LaTeX, keep a space between braces and `{{`: write `x^{ {{n}} }`, not `x^{{{n}}}`.

## Types

| `type` | `answer` | The user enters | Marked correct when |
|---|---|---|---|
| `mc` | index of the correct option, in the order written; `options` 2-6 strings | a choice (options are shuffled per set) | the right option |
| `numeric` | expression → number; optional `units` ("m/s^2") and `tolerance` | `24.5`, or with units `9.81 m/s^2` (any compatible unit: `981 cm/s^2`) | within tolerance (default rel 0.001 or abs 1e-6) after unit conversion; a missing unit is wrong |
| `expression` | mathjs expression over `vars` (e.g. `n*x^(n-1)*sin(x)`); optional `domain` [lo, hi] | `2x sin(x) + x^2 cos(x)` | equal to the answer at random points of the domain (no CAS) |
| `vector` | expression → 1D array; optional `upToScale: true` | `1, 2, 3` or `[1, 2, 3]` | element-wise within tolerance, or a non-zero multiple when up to scale |
| `matrix` | expression → 2D array | `[[1, 2], [3, 4]]` or `1 2; 3 4` | element-wise within tolerance |
| `multipart` | none; `parts:` 2-4 entries, each with `prompt`, `type` and its own answer fields and `verify` | one answer per part | per part; a later part's answer may use `part1`, `part2`, … and is also marked correct (and flagged) when it follows from the user's own wrong earlier answer |
| `proof` | none (no `answer`, no `verify`) | free text | self-graded after revealing the solution: got it / partly / missed |
| `estimate` | expression → number; `factor` (e.g. 2); optional `units` | a number, with units if asked | within `factor` of the answer, either way |

## verify

Every answer is checked by `npm run verify:questions` before it ships. The app computes the answer from `answer`
with mathjs for 200 draws of each template (one for a fixed question); `scripts/verify-questions.py` evaluates
`verify` with SymPy/NumPy for the same params and they must agree:

- `verify` is a Python expression. It sees the params as numbers, `part1`, `part2`, … (the app's answers to
  earlier parts), every SymPy name (`Matrix`, `diff`, `integrate`, `Rational`, `sqrt`, `pi`, `solve`, …), `np`
  (NumPy), `math`, and the symbols `x, y, z, t`. Other symbols: `Symbol('u')`.
- Write it **independently** of `answer`: compute from the problem's statement (`Matrix(...).det()`,
  `diff(f, x)`, `integrate(...)`), not by copying the answer formula. That is what catches a wrong formula.
- `mc`: `verify` returns the index of the correct option; when the options are computed, compute which one is
  right. `vector`/`matrix`: a list or a `Matrix`. `expression`: a SymPy expression in the same variables.
  Numbers must agree to a relative 1e-6. Python's `/` on two ints is a float; use `Rational(a, b)` when exactness
  matters.

## Copyright

Write questions originally. Adapting MIT OpenCourseWare problems (18.06, 18.01SC, 18.02SC, 8.01SC) is fine under
CC BY-NC-SA 4.0 with the problem set named in `source` and `license: CC BY-NC-SA 4.0`. Never copy problems from
copyrighted textbooks (Strang's book, Stewart, Halliday, Morin, …); cite the chapter a question practises instead.
Original questions carry `source: Original` and `license: CC BY-NC-SA 4.0`, the licence of the rest of the bank.
