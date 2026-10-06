#!/usr/bin/env node
// Build the whole logo-selection flow, in order.
//
//   npm run logos            # check → hub + option pages + sheets
//   npm run logos:designs    # optional, needs BANANA_STAND_TOKEN
//   npm run logos:fonts      # optional, needs network; the faces are committed
//
// The gate runs FIRST and the build stops if it fails. Publishing two directions
// that are really one direction, or a colourway nobody can read, is the failure
// this flow exists to prevent — so it is not something to discover afterwards.

const { execFileSync } = require('child_process');
const path = require('path');

const here = f => path.join(__dirname, f);

try {
  execFileSync(process.execPath, [here('check.js')], { stdio: 'inherit' });
} catch {
  console.error('\nThe directions gate failed — nothing was built.');
  process.exit(1);
}

const written = [
  ...require('./review.js').build(),
  ...require('./hub.js').build(),
  ...require('./visid.js').build(),
];

console.log('');
for (const f of written) console.log('wrote', f);

// Say plainly whether the generated studies are in play, because the pages render
// differently depending on it and a silent difference is the kind that ships.
const { onDisk } = require('./designs.js');
const { DIRECTIONS } = require('./directions.js');
const n = DIRECTIONS.reduce((a, d) => a + Object.values(onDisk(d)).filter(Boolean).length, 0);
console.log(n
  ? `\n${n} generated study image(s) on disk — those cards render the study.`
  : '\nNo generated studies on disk: every card renders the drawn vector cut, and the'
    + '\npages say so. Set BANANA_STAND_TOKEN and run `npm run logos:designs` to add them.');
