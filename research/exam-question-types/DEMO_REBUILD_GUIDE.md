# Demo Rebuild Guide (Phase-2 build fleet)

Every rebuilt/new demo is a **self-contained single-file** `demos/<type_id>.html`
(inline CSS + vanilla JS, NO external network deps, opens by double-click). Match
the house pattern below and honor the type's change-spec in `CATEGORY_MAP.md` and
the measurement framework in `METRIC_FRAMEWORK.md`.

Gold-standard reference to imitate: `demos/FLU-GRIDCOPY-01.html`.

## 1. Required layout (two columns)

- `#wrap` (left/main): `#badge` (`TYPE-ID · Name`), a phase cue (emoji), the
  interactive stage, controls.
- `#telemetry` (right, dark aside): `<h3>Live telemetry · per-child</h3>`, a
  `#mlist` of measurement rows, and an `#logwrap`/`#log` event log.
- Responsive: stack columns under ~860px.

## 2. Telemetry panel (automated — no human entry)

Define a `METERS` array of `{id, name, get}` where `id` is a measurement ID from
`measurements.json` **that the spec's `measurements` list declares**, and `get()`
returns the live value. Render rows `M-ID · value · name`, refresh on every
action via `renderMeters()`. Log timestamped events to `#log`.

Minimum: render EVERY measurement ID in the type's spec. Always include the
type's declared signals; wire real values (accuracy, RT, path, revisions,
difficulty reached, etc.). No value may require a human judge or self-report.

## 3. Self-teach (mandatory, <10s, wordless)

Phases: `demo → warmup → scored → done`.
- `runDemo()`: a wordless **ghost-hand** (👆) animates one full correct solution.
- `startWarmup()`: ONE unscored warm-up trial with gentle feedback.
- `startScored()`: scored items begin; `finish()` shows a done cue.
- A replay (↻) button re-runs the demo. No written instructions anywhere.

## 4. NEW: difficulty spectrum + escalation (adaptivity)

This is required on every type (it is how `M-DIFFREACH`/`M-LEARNRATE` are
obtained, and folds "Challenge Mountain" escalation in as the RULE):

- Parameterize item generation by a numeric `level` (procedural / AIG). Provide
  concrete `difficulty_levers` from the spec (grid size, rule count, angle,
  distractor similarity, span length, ratio hardness, etc.).
- **Escalate on success, back off on failure** (e.g. +1 level after a correct
  scored item, −1 after a miss), walking to a fail-band = the child's ceiling.
- Show a **difficulty meter** in telemetry and track:
  - `M-DIFFREACH` — max level solved.
  - `M-LEARNRATE` — improvement across the escalation sequence (levels gained /
    trials, or trials-to-first-ceiling) — the Timeback-fit core.
- Keep ≥4–6 escalating scored items so a slope is visible.

## 5. Engagement gate (any type crediting speed)

If the type credits speed (`M-RT`,`M-COMBO`,`M-SPEEDACC`), also compute the gate:
- `M-ENGAGE` (idle/blur), `M-RAPIDGUESS` (response faster than a plausible floor
  → flag & exclude), `M-DRIFT` (late-session slump). Speed values shown as
  "gated" when the gate fails. Never reward fast-but-wrong (`M-FALSEALARM`).

## 6. Fluid / nonverbal item quality (cross-type rule)

Use **unique, clearly distinct symbols/colors** (not all the same
circle/square/diamond/star). Each item has **exactly one unambiguous correct
answer**; key each distractor to a specific rule violation where possible
(`M-ERRTYPE`).

## 7. Speed demos → keyboard hotkeys

Every speeded response must be answerable by a **keyboard hotkey** (e.g. F/J,
1–4, arrow keys), shown on-screen, in addition to tap. Log the input modality.

## 8. 3D for spatial (self-contained, reliable)

Prefer robust, dependency-free 3D. Two sanctioned approaches (pick per type):

**(a) CSS 3D transforms** — best for cube rotation, perspective, folding.
Use `transform-style:preserve-3d`, `perspective`, `rotateX/Y/Z`, `translateZ`.
Provide keyboard hotkeys (arrows/Q-E) to rotate where the task allows it.

**(b) Inlined canvas parallel-projection helper** — best for cross-sections,
stacked blocks, hidden-cube counting. Minimal, paste into the file:

```js
// Minimal 3D: rotate (yaw,pitch) + orthographic project; painter's-algorithm faces.
function proj(p, yaw, pit, s, cx, cy){
  const cy_=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pit),sp=Math.sin(pit);
  let x=p[0]*cy_+p[2]*sy, z=-p[0]*sy+p[2]*cy_, y=p[1]*cp-z*sp; z=p[1]*sp+z*cp;
  return {x:cx+x*s, y:cy - y*s, z};           // z = depth for sorting
}
function drawFaces(ctx, verts, faces, yaw, pit, s, cx, cy){
  const P=verts.map(v=>proj(v,yaw,pit,s,cx,cy));
  faces.map(f=>({f,depth:f.idx.reduce((a,i)=>a+P[i].z,0)/f.idx.length}))
       .sort((a,b)=>a.depth-b.depth)           // far → near
       .forEach(({f})=>{ctx.beginPath();f.idx.forEach((i,k)=>k?ctx.lineTo(P[i].x,P[i].y):ctx.moveTo(P[i].x,P[i].y));
         ctx.closePath();ctx.fillStyle=f.fill;ctx.fill();ctx.strokeStyle='#26304a';ctx.lineWidth=2;ctx.stroke();});
}
```

You MAY instead inline a tiny vendored three.js only if truly necessary; CSS-3D /
canvas projection is preferred for portability. Whatever you choose, the file
must render on double-click with no network access.

## 9. Do / Don't (isolation)

- DO edit only your assigned `demos/<type_id>.html` file(s). Each is independent.
- DO read the type's spec object (in `specs/types_<domain>.jsonl`) and
  `CATEGORY_MAP.md` change-spec before rebuilding.
- DON'T edit shared files, other demos, specs, measurements.json, or run git /
  build_types.py. DON'T touch apps/, packages/, supabase/, or other worktrees.
- Keep it working: open the file mentally / verify the JS has no syntax errors and
  the scored flow reaches `done`.
