// Browser stubs for the three node builtins `generators/FLU-OPCHAIN-01.mjs` imports.
//
// WHY THIS EXISTS. `stage2-inspectors/opchain.js` imports `applyOp`, `applyChain` and `figureKey`
// from the generator that wrote the bank, so "what the machine does" has exactly one definition and
// the review window cannot quietly disagree with the items it is drawing. But that generator is
// also a CLI that writes the two `.jsonl` banks, so it statically imports `node:fs`, `node:path`
// and `node:url`, and a browser refuses the whole module graph on that alone.
//
// The alternative was to split the pure figure algebra out of the generator into its own module.
// That is the better shape and it is the right change to make eventually — but the generator is
// shared with the demo and bank workstreams, and a stub confined to this window's own files does
// not reach into theirs. Recorded here so the trade is visible rather than discovered later.
//
// WHAT IS SAFE ABOUT IT. Exactly one top-level statement in the generator touches node
// (`const __dirname = dirname(fileURLToPath(import.meta.url))`), and it only stores a string. Every
// other use is inside the CLI block, which never runs in the browser because `isMain()` reads
// `process.argv[1]` from the empty stub `stage2-review.html` installs. The filesystem functions
// therefore throw rather than no-op: if the algebra ever grows a real dependency on the filesystem,
// this must fail loudly at that call rather than silently return the wrong figure.
//
// Mapped onto all three specifiers by the import map in `stage2-review.html`, which is why one
// module exports the union of their names.

const unavailable = (name) => () => {
  throw new Error(
    `stage2-review: ${name}() is not available in the browser. The Stage 2 review window imports ` +
      'the bank generator for its figure algebra only; anything that touches the filesystem ' +
      'belongs in the generator CLI, not in code the window reaches.',
  );
};

/* node:fs */
export const writeFileSync = unavailable('writeFileSync');
export const mkdirSync = unavailable('mkdirSync');
export const readFileSync = unavailable('readFileSync');
export const existsSync = () => false;

/* node:path — pure string work, so these are real rather than stubs. */
export const dirname = (p) => String(p).replace(/\/[^/]*$/, '') || '/';
export const basename = (p) => String(p).split('/').pop() ?? '';
export const join = (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');
export const resolve = (...parts) => join(...parts);

/* node:url */
export const fileURLToPath = (url) => String(url).replace(/^file:\/\//, '');
