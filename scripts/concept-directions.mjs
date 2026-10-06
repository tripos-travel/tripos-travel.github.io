#!/usr/bin/env node
/**
 * concept-directions.mjs — the bridge between stage one and stage two of brand-identity.
 *
 * Stage one (a reasoning model) authors N logo concept directions. This script does two
 * jobs before any image is generated:
 *
 *   1. ENFORCES DIVERGENCE. The failure mode this whole feature exists to prevent is
 *      handing a client four renders of the same idea ("it just looks very similar,
 *      right?"). Every pair of directions must differ on at least two of five structural
 *      axes — metaphor, geometric primitive, symmetry, space strategy, mass vs line.
 *      Differing only by seed or adjective is not a direction, it is a variation.
 *
 *   2. EMITS THE RENDER BRIEF consumed by generate-images.mjs, so the two stages share
 *      one source of truth and the prompts stay auditable.
 *
 * Zero dependencies. Usage:
 *   node scripts/concept-directions.mjs --brand=yohdev            # check only
 *   node scripts/concept-directions.mjs --brand=yohdev --emit=<out.json>
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const AXES = ["metaphor", "geometricPrimitive", "symmetry", "spaceStrategy", "massVsLine"];
const MIN_DIFFERING_AXES = 2;
const REQUIRED = ["id", "name", "thesis", "subject", "whyDistinct", "reproduction", ...AXES];

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith("--")) continue;
    const [k, v] = a.slice(2).split("=");
    args[k] = v === undefined ? true : v;
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.brand) {
  console.error("error: --brand=<slug> is required");
  process.exit(1);
}

const dirPath =
  args.directions ?? path.join("demos", args.brand, "output", "04-concept-directions.json");

let doc;
try {
  doc = JSON.parse(await readFile(dirPath, "utf8"));
} catch (e) {
  console.error(`error: cannot read ${dirPath} — ${e.message}`);
  process.exit(1);
}

const directions = doc.directions ?? [];
if (directions.length < 2) {
  console.error("error: need at least 2 directions — the point is giving someone a choice");
  process.exit(1);
}

// Completeness
const problems = [];
for (const [i, d] of directions.entries()) {
  for (const key of REQUIRED) {
    if (!d[key] || String(d[key]).trim() === "") {
      problems.push(`direction ${i + 1} (${d.id ?? "unnamed"}): missing "${key}"`);
    }
  }
}
const ids = directions.map((d) => d.id);
if (new Set(ids).size !== ids.length) problems.push("duplicate direction ids");

// Divergence
console.log(`Checking ${directions.length} direction(s) for "${args.brand}"\n`);
let tooSimilar = 0;
for (let i = 0; i < directions.length; i++) {
  for (let j = i + 1; j < directions.length; j++) {
    const a = directions[i];
    const b = directions[j];
    const differing = AXES.filter((k) => a[k] !== b[k]);
    const ok = differing.length >= MIN_DIFFERING_AXES;
    if (!ok) tooSimilar++;
    console.log(
      `  ${ok ? "pass" : "FAIL"}  ${a.id} vs ${b.id} — differ on ${differing.length}/${AXES.length}` +
        (ok ? ` (${differing.join(", ")})` : `  ← same idea twice; rewrite one`)
    );
  }
}

if (problems.length) {
  console.error(`\n${problems.length} incomplete direction(s):`);
  for (const p of problems) console.error(`  - ${p}`);
}
if (tooSimilar) {
  console.error(
    `\n${tooSimilar} pair(s) too similar. A client asked for "one version of each" so they can ` +
      `choose — near-duplicates waste the round. Rewrite until every pair differs on ` +
      `${MIN_DIFFERING_AXES}+ axes.`
  );
}
if (problems.length || tooSimilar) process.exit(1);

console.log(`\nAll pairs differ on ${MIN_DIFFERING_AXES}+ axes — these are genuine alternatives.`);

if (args.emit) {
  const brief = {
    page: doc.page ?? "Logo-Concepts.html",
    images: directions.map((d) => ({
      slot: "mark",
      concept: true,
      file: `concept-${d.id}.webp`,
      page: doc.page ?? "Logo-Concepts.html",
      subject: d.subject,
      alt: `Logo concept "${d.name}" — ${d.thesis}`
    }))
  };
  await writeFile(args.emit, JSON.stringify(brief, null, 2) + "\n");
  console.log(`Render brief → ${args.emit} (${brief.images.length} mark${brief.images.length === 1 ? "" : "s"})`);
}
