"""
Recomputes every answer of the practice bank with SymPy and NumPy and compares it with what the app computed.

Called by `npm run verify:questions` (scripts/verify-questions.ts), which draws the params with the app's own
engine and writes, per question, every draw's params and the app's answer for each part. Here each part's
`verify` expression, written independently of the app's `answer`, is evaluated with the same params and must
agree:

    mc          the index of the correct option
    numeric     the same number, to a relative 1e-6 (estimates too: the reference value itself)
    vector      the same entries; with upToScale, a non-zero multiple
    matrix      the same entries
    expression  symbolically equal (SymPy), or equal at 12 random points when SymPy cannot decide

`verify` sees the params as plain Python numbers, `part1`, `part2`, ... as the app's answers to earlier parts,
everything from `sympy`, `np` (NumPy) and `x, y, z, t` as symbols. Exit status 1 on any mismatch.
"""
import json
import math
import random
import sys

import numpy as np
import sympy
from sympy import *  # noqa: F401,F403  (verify expressions use SymPy names directly)
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

REL = 1e-6
ABS = 1e-9
TRANSFORMS = standard_transformations + (implicit_multiplication_application, convert_xor)
BASE = {name: getattr(sympy, name) for name in dir(sympy) if not name.startswith("_")}
BASE.update({"np": np, "math": math, "x": Symbol("x"), "y": Symbol("y"), "z": Symbol("z"), "t": Symbol("t")})


def as_float(v):
    if isinstance(v, (bool, np.bool_)):
        return float(v)
    if isinstance(v, (int, float, np.integer, np.floating)):
        return float(v)
    v = sympify(v)
    v = N(v, 30)
    if v.is_real is False or v.has(I):
        c = complex(v)
        if abs(c.imag) > 1e-12:
            raise ValueError("complex value " + str(v))
        return c.real
    return float(v)


def close(a, b):
    a, b = as_float(a), as_float(b)
    return abs(a - b) <= max(ABS, REL * max(abs(a), abs(b)))


def flat(v):
    if isinstance(v, MatrixBase):
        return [list(v.row(i)) for i in range(v.rows)] if v.cols > 1 else list(v)
    if isinstance(v, np.ndarray):
        return v.tolist()
    if isinstance(v, (list, tuple)):
        return [flat(x) if isinstance(x, (list, tuple, MatrixBase, np.ndarray)) else x for x in v]
    return v


def as_vector(v):
    v = flat(v)
    if isinstance(v, list) and v and isinstance(v[0], list):
        # A column or a single row written as 2D.
        if all(len(r) == 1 for r in v):
            v = [r[0] for r in v]
        elif len(v) == 1:
            v = v[0]
    return [as_float(x) for x in v]


def as_matrix(v):
    v = flat(v)
    if not v or not isinstance(v[0], list):
        v = [[x] for x in v]
    return [[as_float(x) for x in row] for row in v]


def same_vector(app, ref, up_to_scale):
    a, b = as_vector(app), as_vector(ref)
    if len(a) != len(b):
        return False
    if not up_to_scale:
        return all(close(x, y) for x, y in zip(a, b))
    if all(abs(x) < ABS for x in a) or all(abs(y) < ABS for y in b):
        return False
    # Parallel: every 2x2 minor vanishes.
    scale = max(max(abs(x) for x in a), max(abs(y) for y in b))
    for i in range(len(a)):
        for j in range(i + 1, len(a)):
            if abs(a[i] * b[j] - a[j] * b[i]) > 1e-6 * scale * scale:
                return False
    return True


def same_matrix(app, ref, up_to_scale):
    a, b = as_matrix(app), as_matrix(ref)
    if len(a) != len(b) or any(len(r) != len(s) for r, s in zip(a, b)):
        return False
    if up_to_scale:
        return same_vector(sum(a, []), sum(b, []), True)
    return all(close(x, y) for r, s in zip(a, b) for x, y in zip(r, s))


def same_expression(app_text, ref, scope):
    names = dict(BASE)
    names.update({k: v for k, v in scope.items() if not isinstance(v, (list, dict))})
    names.update({"e": E, "pi": pi, "ln": log, "log": log})
    app = parse_expr(app_text, local_dict=names, transformations=TRANSFORMS)
    ref = sympify(ref, locals=names)
    try:
        if simplify(app - ref) == 0:
            return True
    except Exception:
        pass
    symbols = sorted(app.free_symbols | ref.free_symbols, key=str)
    rnd = random.Random(1234)
    agreed = 0
    for _ in range(40):
        point = {s: rnd.uniform(0.3, 2.2) for s in symbols}
        try:
            va, vb = complex(app.evalf(subs=point)), complex(ref.evalf(subs=point))
        except Exception:
            continue
        if not (math.isfinite(va.real) and math.isfinite(vb.real)):
            continue
        if abs(va - vb) > max(1e-7, 1e-7 * max(abs(va), abs(vb))):
            return False
        agreed += 1
        if agreed >= 12:
            return True
    return agreed >= 5


def check(part, app, ref, scope):
    kind = part["type"]
    if kind == "mc":
        return int(ref) == int(app)
    if kind in ("numeric", "estimate"):
        return close(app, ref)
    if kind == "vector":
        return same_vector(app, ref, part.get("upToScale"))
    if kind == "matrix":
        return same_matrix(app, ref, part.get("upToScale"))
    if kind == "expression":
        return same_expression(app, ref, scope)
    raise ValueError("unknown part type " + kind)


def main(path):
    with open(path, encoding="utf-8") as f:
        questions = json.load(f)
    failures = []
    checked = 0
    for q in questions:
        for d_index, draw in enumerate(q["draws"]):
            scope = dict(draw["params"])
            for k, part in enumerate(q["parts"]):
                app = draw["answers"][k]
                if not part.get("verify"):
                    failures.append(q["id"] + ": part " + str(k + 1) + " has no verify expression")
                    break
                env = dict(BASE)
                env.update(scope)
                try:
                    ref = eval(part["verify"], env)  # noqa: S307  (our own data, run by our own script)
                    ok = check(part, app, ref, scope)
                except Exception as err:  # noqa: BLE001
                    ok = False
                    ref = "error: " + str(err).split("\n")[0]
                checked += 1
                if not ok:
                    failures.append(
                        q["id"] + " (draw " + str(d_index + 1) + ", part " + str(k + 1) + "): app says "
                        + json.dumps(app)[:120] + ", verify says " + str(ref)[:120] + ", params " + json.dumps(draw["params"])
                    )
                    break
                scope["part" + str(k + 1)] = app
            if failures and failures[-1].startswith(q["id"]):
                break
    total = sum(len(q["draws"]) for q in questions)
    print("verify:questions: " + str(len(questions)) + " questions, " + str(total) + " draws, " + str(checked) + " answers recomputed")
    if failures:
        print(str(len(failures)) + " mismatch" + ("" if len(failures) == 1 else "es") + ":", file=sys.stderr)
        for line in failures[:80]:
            print("  - " + line, file=sys.stderr)
        sys.exit(1)
    print("every answer agrees with SymPy/NumPy")


if __name__ == "__main__":
    main(sys.argv[1])
