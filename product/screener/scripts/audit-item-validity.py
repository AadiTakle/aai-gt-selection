#!/usr/bin/env python3
"""
Audit the item banks for items that admit more than one defensible answer.

    python3 screener/scripts/audit-item-validity.py

Written for the six types the 10 Aug review flagged as validity problems (see
`docs/review/2026-08-10-question-bank-review.md`). A validity defect is not a polish issue: a child who picks
the *other* right answer is marked wrong and the ability estimate moves against them, so an item with two
answers is worse than a missing item.

This checks the bank data only. It cannot see the rendered item, so a defect that exists purely in the
presentation — a discriminating attribute drawn too small to see — is out of reach here and is the other half
of that review.

Exit code is the number of types with confirmed defects, so CI could gate on it later.
"""

import json
import os
import sys
from collections import Counter
from itertools import combinations

BANKS = os.path.join(os.path.dirname(__file__), '..', '..', 'qbank-library', 'banks')

# Rotational symmetry order per shape name: how many rotations look identical.
# Conservative on purpose — a shape absent here is treated as having no symmetry, so this under-reports rather
# than inventing defects.
SYMMETRY = {
    'circle': 360,   # any rotation is invisible
    'square': 4,
    'diamond': 4,
    'triangle': 3,
    'pentagon': 5,
    'hexagon': 6,
    'star': 5,
    'cross': 4,
    'plus': 4,
}


def items(type_code):
    path = os.path.join(BANKS, f'{type_code}.jsonl')
    with open(path) as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def renders_identically(a, b):
    """Two figures a child cannot tell apart: equal on everything, or differing only by an invisible rotation."""
    if a == b:
        return True
    keys = set(a) | set(b)
    differing = [k for k in keys if a.get(k) != b.get(k)]
    if differing != ['rot']:
        return False
    order = SYMMETRY.get(str(a.get('shape', '')).lower())
    if not order:
        return False
    step = 360 / order
    delta = abs(float(a.get('rot', 0)) - float(b.get('rot', 0))) % 360
    return abs(delta / step - round(delta / step)) < 1e-9


# --------------------------------------------------------------------------------------------------
# FLU-ANALOGY-01 — "some figures have rotational symmetry so it is impossible to tell them apart"
# --------------------------------------------------------------------------------------------------
def audit_analogy():
    bad = []
    for r in items('FLU-ANALOGY-01'):
        opts = r['content']['options']
        for x, y in combinations(opts, 2):
            if renders_identically(x['tile'], y['tile']):
                bad.append((r['itemId'], r['difficulty'], f"{x['key']} and {y['key']} render alike",
                            f"shape={x['tile'].get('shape')} rot {x['tile'].get('rot')} vs {y['tile'].get('rot')}"))
                break
    return bad


# --------------------------------------------------------------------------------------------------
# FLU-ODDPAIR-01 — "sometimes there are multiple odd ones out"
# --------------------------------------------------------------------------------------------------
def audit_oddpair():
    """Rows are pairs. Every row changes the same attribute, so the odd row is the one whose *transition* is not
    shared with another row — `amber->purple` twice is a matched pair, `purple->azure` alone is not.

    First attempt grouped by which attributes changed, which is too coarse: every row changes colour, so all four
    landed in one group and the audit reported all 120 items broken. Grouping by the transition itself is what the
    task actually turns on.
    """
    bad = []
    for r in items('FLU-ODDPAIR-01'):
        groups = {}
        for row in r['content']['rows']:
            transition = tuple(sorted((k, str(row['left'].get(k)), str(row['right'].get(k)))
                                      for k in set(row['left']) | set(row['right'])
                                      if row['left'].get(k) != row['right'].get(k)))
            groups.setdefault(transition, []).append(row['key'])
        singles = [ks[0] for ks in groups.values() if len(ks) == 1]
        if len(singles) > 1:
            bad.append((r['itemId'], r['difficulty'], f'{len(singles)} rows are defensibly the odd one',
                        f"unmatched: {','.join(sorted(singles))}  key={r['answer']['correctKey']}"))
        elif len(singles) == 1 and singles[0] != r['answer']['correctKey']:
            bad.append((r['itemId'], r['difficulty'], 'the unmatched row is not the key',
                        f"unmatched={singles[0]} key={r['answer']['correctKey']}"))
    return bad


# --------------------------------------------------------------------------------------------------
# FLU-VENN-01 — does a distractor satisfy every rule the correct answer does?
# --------------------------------------------------------------------------------------------------
def audit_venn():
    bad = []
    for r in items('FLU-VENN-01'):
        c = r['content']
        left, right = c['leftExemplars'], c['rightExemplars']
        # Two rules, one per side, and the answer is the figure in the OVERLAP. Each side's rule is the attribute
        # value all of its exemplars share and none of the other side's do — left might be "all pentagons" while
        # right is "all coral", and the answer is the coral pentagon.
        #
        # First attempt looked for an attribute where each side shared a *different single* value, which is not the
        # shape of this task at all, and reported all 120 items broken.
        def rule_for(side, other):
            for attr in sorted(side[0]):
                values = {e.get(attr) for e in side}
                if len(values) == 1:
                    v = next(iter(values))
                    if all(e.get(attr) != v for e in other):
                        return attr, v
            return None

        lr, rr = rule_for(left, right), rule_for(right, left)
        if lr is None or rr is None:
            bad.append((r['itemId'], r['difficulty'], 'one side has no single shared attribute the other lacks',
                        f'left={lr} right={rr}'))
            continue
        satisfies = [o['key'] for o in c['options']
                     if o['figure'].get(lr[0]) == lr[1] and o['figure'].get(rr[0]) == rr[1]]
        if len(satisfies) != 1:
            bad.append((r['itemId'], r['difficulty'], f'{len(satisfies)} options sit in the overlap',
                        f"{','.join(satisfies) or 'none'}  rules {lr[0]}={lr[1]} and {rr[0]}={rr[1]}"))
        elif satisfies[0] != r['answer']['correctKey']:
            bad.append((r['itemId'], r['difficulty'], 'the overlap figure is not the key',
                        f"overlap={satisfies[0]} key={r['answer']['correctKey']}"))
    return bad


# --------------------------------------------------------------------------------------------------
# FLU-GRIDCOPY-01 — "impossible to determine a clear rule, becomes guesswork"
# --------------------------------------------------------------------------------------------------
def grid_transforms(rows, cols):
    """Simple whole-grid rules a child could plausibly infer."""
    def shift(dr, dc):
        # Cells falling off the edge disappear. Wrapping was the first attempt and produced ten false positives:
        # the wrapped cell reappeared on the far side and disagreed with the stored key.
        def go(g):
            out = [[0] * cols for _ in range(rows)]
            for i in range(rows):
                for j in range(cols):
                    ni, nj = i + dr, j + dc
                    if 0 <= ni < rows and 0 <= nj < cols:
                        out[ni][nj] = g[i][j]
            return out
        return go

    t = {
        'shift-down': shift(1, 0), 'shift-up': shift(-1, 0),
        'shift-right': shift(0, 1), 'shift-left': shift(0, -1),
        'rot180': lambda g: [row[::-1] for row in g[::-1]],
        'flip-h': lambda g: [row[::-1] for row in g],
        'flip-v': lambda g: g[::-1],
        'identity': lambda g: [row[:] for row in g],
    }
    if rows == cols:
        t['rot90'] = lambda g: [[g[rows - 1 - j][i] for j in range(rows)] for i in range(rows)]
        t['rot270'] = lambda g: [[g[j][cols - 1 - i] for j in range(rows)] for i in range(rows)]
        t['transpose'] = lambda g: [[g[j][i] for j in range(rows)] for i in range(cols)]
    return t


def audit_gridcopy():
    bad = []
    for r in items('FLU-GRIDCOPY-01'):
        c = r['content']
        rows, cols = c['rows'], c['cols']
        transforms = grid_transforms(rows, cols)
        consistent = [name for name, fn in transforms.items()
                      if all(fn(ex['input']) == ex['output'] for ex in c['examples'])]
        if not consistent:
            # The intended rule is outside this vocabulary — not a defect, just beyond this audit.
            continue
        key = c and r['answer']['correctKey']
        outputs = {}
        for name in consistent:
            got = '/'.join(''.join(str(v) for v in row) for row in transforms[name](c['probeInput']))
            outputs.setdefault(got, []).append(name)
        if len(outputs) > 1:
            bad.append((r['itemId'], r['difficulty'],
                        f'{len(consistent)} rules fit the examples and disagree on the probe',
                        '; '.join(f"{'/'.join(v)}->{k}" for k, v in outputs.items())[:120]))
        elif key not in outputs:
            bad.append((r['itemId'], r['difficulty'], 'the fitting rule disagrees with the stored key',
                        f"rules={consistent} give {list(outputs)[0]}, key={key}"))
    return bad


# --------------------------------------------------------------------------------------------------
# QUANT-WORD-01 — "sometimes you need all the numbers, so introduce a distractor"
# --------------------------------------------------------------------------------------------------
def audit_word():
    """Not a defect audit: a story with no spare number is answerable, just easier. Reported as a distribution
    so the reviewer's suggestion can be costed."""
    counts = Counter()
    for r in items('QUANT-WORD-01'):
        c = r['content']
        nums = [int(w) for w in c['storyText'].replace('.', ' ').split() if w.isdigit()]
        counts[len(nums)] += 1
    return counts


# --------------------------------------------------------------------------------------------------
# SPA-FOLDNET-01 — "edges touching edges, not vertices touching edges"
# --------------------------------------------------------------------------------------------------
def audit_foldnet():
    bad = []
    for r in items('SPA-FOLDNET-01'):
        cells = r['content'].get('net', {}).get('cells') or []
        boxes = [(c['x'], c['y'], c.get('w'), c.get('h')) for c in cells if 'x' in c and 'y' in c]
        if len(boxes) < 2:
            continue
        # Every cell must share a full edge with at least one other. A cell touching only at a corner is the
        # defect the reviewer described.
        def shares_edge(a, b):
            ax, ay, aw, ah = a
            bx, by, bw, bh = b
            if aw is None or ah is None or bw is None or bh is None:
                return False
            horizontal = (ax + aw == bx or bx + bw == ax) and min(ay + ah, by + bh) - max(ay, by) > 0
            vertical = (ay + ah == by or by + bh == ay) and min(ax + aw, bx + bw) - max(ax, bx) > 0
            return horizontal or vertical

        lonely = [i for i, a in enumerate(boxes) if not any(shares_edge(a, b) for j, b in enumerate(boxes) if i != j)]
        if lonely:
            bad.append((r['itemId'], r['difficulty'], f'{len(lonely)} cell(s) share no full edge',
                        f'indices {lonely}'))
    return bad


def report(name, claim, bad, total):
    status = 'CONFIRMED' if bad else 'not reproducible'
    print(f'\n{"=" * 96}\n{name}  —  {status}')
    print(f'  reviewer: "{claim}"')
    print(f'  {len(bad)} of {total} items affected')
    for row in bad[:4]:
        print(f'    {row[0][:8]}  d{row[1]:<3} {row[2]}')
        if row[3]:
            print(f'              {row[3]}')
    if len(bad) > 4:
        print(f'    … and {len(bad) - 4} more')
    return 1 if bad else 0


def main():
    print('Item-validity audit — does any item admit more than one defensible answer?')
    print('Bank data only; a defect visible solely in the rendering is out of reach here.')
    failing = 0

    failing += report('FLU-ANALOGY-01', 'rotational symmetry makes some figures impossible to tell apart',
                      audit_analogy(), sum(1 for _ in items('FLU-ANALOGY-01')))
    failing += report('FLU-ODDPAIR-01', 'sometimes there are multiple odd ones out',
                      audit_oddpair(), sum(1 for _ in items('FLU-ODDPAIR-01')))
    failing += report('FLU-VENN-01', 'the same symbol appears twice so they cannot be separate venn diagrams',
                      audit_venn(), sum(1 for _ in items('FLU-VENN-01')))
    failing += report('FLU-GRIDCOPY-01', 'impossible to determine a clear rule, becomes guesswork',
                      audit_gridcopy(), sum(1 for _ in items('FLU-GRIDCOPY-01')))
    failing += report('SPA-FOLDNET-01', 'the net should be edges touching edges, not vertices touching edges',
                      audit_foldnet(), sum(1 for _ in items('SPA-FOLDNET-01')))

    print(f'\n{"=" * 96}\nQUANT-WORD-01  —  measured, not a defect')
    print('  reviewer: "sometimes you need all the numbers so doesn\'t make sense; always introduce a distractor"')
    counts = audit_word()
    total = sum(counts.values())
    print(f'  numbers per story: {dict(sorted(counts.items()))} over {total} items')
    print('  A story with no spare number is answerable, only easier. This costs the suggestion rather than')
    print('  confirming a defect: adding a distractor is a generator change across every item.')

    print(f'\n{"=" * 96}\n{failing} of 5 checked types have confirmed validity defects.')
    return failing


if __name__ == '__main__':
    sys.exit(main())
