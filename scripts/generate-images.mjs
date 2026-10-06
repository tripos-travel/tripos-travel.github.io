#!/usr/bin/env node
/**
 * generate-images.mjs — brand-aware image generation via Banana Stand.
 *
 * Turns a page's image brief into real, locally-hosted assets: composes an
 * on-brand prompt from the brand's imagery profile, asks Banana Stand to
 * generate it, downloads the result into the brand's assets/images/, and
 * records provenance so a slot can be re-rolled or reused across a cluster.
 *
 * The playbook's rule is "real images, hosted locally — never hotlink", so the
 * CDN URL Banana Stand returns is only ever an intermediate: we fetch the blob
 * and commit the bytes. Nothing in a built page points at bananastandai.com.
 *
 * Zero dependencies (Node 18+ global fetch), matching the rest of scripts/.
 *
 * Usage:
 *   node scripts/generate-images.mjs --brand=yohdev --spec=path/to/03-image-brief.json
 *   node scripts/generate-images.mjs --brand=yohdev --spec=... --dry-run
 *
 * Flags:
 *   --brand=<slug>     brand under demos/ (required)
 *   --spec=<path>      image brief JSON (required unless --dry-run of profile only)
 *   --dry-run          print composed prompts + targets, make zero network calls
 *   --force            regenerate even if the target file already exists
 *   --concurrency=<n>  parallel generations (default 3)
 *   --strict           exit non-zero if any entry fails (default: report and continue)
 *
 * Env:
 *   BANANA_STAND_TOKEN   X-Gen-Token for the instance. Unset => skip cleanly, exit 0.
 *   BANANA_STAND_URL     instance base URL (default https://www.bananastandai.com)
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

const DEFAULT_INSTANCE = "https://www.bananastandai.com";
const VALID_STYLES = ["web", "photographic", "illustration", "abstract", "3d", "minimal"];
const MIN_DIM = 64;
const MAX_DIM = 2048;
const MAX_PIXELS = 4_000_000;

// Magic bytes, so an HTML error page can never be written out as a .webp.
const MAGIC = [
  { ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "webp", bytes: [0x52, 0x49, 0x46, 0x46] } // RIFF; WEBP checked at offset 8
];

function parseArgs(argv) {
  const args = { concurrency: 3 };
  for (const arg of argv.slice(2)) {
    const [key, value] = arg.startsWith("--") ? arg.slice(2).split("=") : [null, null];
    if (!key) continue;
    if (value === undefined) args[key.replace(/-./g, (m) => m[1].toUpperCase())] = true;
    else args[key.replace(/-./g, (m) => m[1].toUpperCase())] = value;
  }
  if (args.concurrency) args.concurrency = Math.max(1, parseInt(args.concurrency, 10) || 3);
  return args;
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

/**
 * Compose the prompt sent to Banana Stand.
 *
 * Order is fixed and the output is trimmed/collapsed so the same slot always
 * produces byte-identical text — Banana Stand's cache key is a SHA-256 over the
 * normalized prompt, so stable text means a re-run costs nothing and returns the
 * identical image.
 */
function composePrompt(profile, entry) {
  const parts = [];
  // Concept mode (brand-mark exploration) swaps the house prefix for a mark-specific one
  // and adds the no-lettering guardrails. These renders are directions to choose between,
  // never a shipped logo — see the brand-identity skill.
  const prefix = entry.concept ? profile.conceptPrefix ?? profile.promptPrefix : profile.promptPrefix;
  if (prefix) parts.push(prefix.trim());
  parts.push(entry.subject.trim());
  if (profile.palette?.length) parts.push(`Color palette: ${profile.palette.join(", ")}.`);
  const avoid = [...(profile.avoid ?? []), ...(entry.concept ? profile.conceptAvoid ?? [] : [])];
  if (avoid.length) parts.push(`Avoid: ${avoid.join(", ")}.`);
  return parts
    .map((p) => (p.endsWith(".") ? p : `${p}.`))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve an entry against its slot preset and the profile defaults. */
function resolveEntry(profile, entry, index) {
  const where = `entry ${index + 1}${entry.slot ? ` (${entry.slot})` : ""}`;
  if (!entry.subject) fail(`${where}: "subject" is required`);
  if (!entry.file) fail(`${where}: "file" is required`);
  if (entry.file.includes("/") || entry.file.includes("..")) {
    fail(`${where}: "file" must be a bare filename, got "${entry.file}"`);
  }

  const slot = entry.slot ? profile.slots?.[entry.slot] : null;
  if (entry.slot && !slot) fail(`${where}: slot "${entry.slot}" is not defined in the imagery profile`);

  const width = Number(entry.width ?? slot?.width);
  const height = Number(entry.height ?? slot?.height);
  if (!width || !height) fail(`${where}: no width/height — set them on the entry or define the slot`);
  if (width < MIN_DIM || width > MAX_DIM || height < MIN_DIM || height > MAX_DIM) {
    fail(`${where}: dimensions must be ${MIN_DIM}-${MAX_DIM} per side, got ${width}x${height}`);
  }
  if (width * height > MAX_PIXELS) {
    fail(`${where}: ${width}x${height} exceeds the ~4 megapixel ceiling`);
  }

  const style = entry.style ?? slot?.style ?? profile.defaultStyle ?? "web";
  if (!VALID_STYLES.includes(style)) {
    fail(`${where}: style "${style}" is not one of ${VALID_STYLES.join(", ")}`);
  }

  const format = entry.format ?? profile.defaultFormat ?? "webp";
  const concept = entry.concept ?? entry.slot === "mark";
  const prompt = composePrompt(profile, { ...entry, concept });
  if (prompt.length > 1000) {
    fail(`${where}: composed prompt is ${prompt.length} chars, over Banana Stand's 1000 limit — shorten promptPrefix, palette, or avoid`);
  }

  return {
    ...entry,
    concept,
    width,
    height,
    style,
    format,
    quality: Number(entry.quality ?? profile.quality ?? 82),
    seed: Number(entry.seed ?? 0),
    prompt
  };
}

function looksLikeImage(buffer) {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  const match = MAGIC.find((m) => m.bytes.every((b, i) => bytes[i] === b));
  if (!match) return false;
  if (match.ext === "webp") {
    const tag = new TextDecoder().decode(bytes.slice(8, 12));
    return tag === "WEBP";
  }
  return true;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Generate one entry: ask Banana Stand, then download the blob it points at. */
async function generateOne(entry, { instance, token, targetDir }) {
  const target = path.join(targetDir, entry.file);

  const response = await fetch(`${instance}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Gen-Token": token },
    body: JSON.stringify({
      prompt: entry.prompt,
      width: entry.width,
      height: entry.height,
      style: entry.style,
      seed: entry.seed,
      format: entry.format,
      quality: entry.quality
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    // Banana Stand returns the same "X-Gen-Token header required" body whether the
    // token is missing or simply wrong, so say so rather than echoing a message
    // that sends people looking for a header they already sent.
    const hint = response.status === 401 ? " — BANANA_STAND_TOKEN is missing or not valid for this instance" : "";
    throw new Error(
      `generate failed: HTTP ${response.status}${hint}${detail && !hint ? ` — ${detail.slice(0, 200)}` : ""}`
    );
  }

  const result = await response.json();
  if (!result.url) throw new Error("generate returned no url");

  const blob = await fetch(result.url);
  if (!blob.ok) throw new Error(`download failed: HTTP ${blob.status}`);

  const contentType = blob.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`download returned "${contentType}", not an image`);
  }

  const buffer = await blob.arrayBuffer();
  if (!looksLikeImage(buffer)) {
    throw new Error("downloaded bytes are not a recognizable image");
  }

  await writeFile(target, Buffer.from(buffer));

  // The provenance record: enough to re-roll this exact slot (bump seed and
  // rerun) and to recognize the same image requested twice across a cluster.
  return {
    file: path.posix.join("assets/images", entry.file),
    source: "generated",
    role: entry.concept ? "concept" : "asset",
    generator: "banana-stand",
    model: result.model ?? null,
    id: result.id ?? null,
    prompt: entry.prompt,
    style: entry.style,
    seed: entry.seed,
    width: result.width ?? entry.width,
    height: result.height ?? entry.height,
    bytes: buffer.byteLength,
    alt: entry.alt ?? null,
    usedBy: entry.page ? [entry.page] : [],
    cached: Boolean(result.cached)
  };
}

/** Run tasks with a bounded number in flight. */
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.brand) fail("--brand=<slug> is required");
  if (!args.spec) fail("--spec=<path to image brief JSON> is required");

  const brandDir = path.join("demos", args.brand);
  const profilePath = path.join(brandDir, "imagery.profile.json");

  if (!(await exists(profilePath))) {
    fail(
      `no imagery profile at ${profilePath}\n` +
        `       Create one first — see demos/README-imagery.md for the schema.`
    );
  }

  let profile;
  let spec;
  try {
    profile = JSON.parse(await readFile(profilePath, "utf8"));
  } catch (e) {
    fail(`${profilePath} is not valid JSON: ${e.message}`);
  }
  try {
    spec = JSON.parse(await readFile(args.spec, "utf8"));
  } catch (e) {
    fail(`${args.spec} is not valid JSON: ${e.message}`);
  }

  const entries = Array.isArray(spec) ? spec : spec.images;
  if (!Array.isArray(entries) || entries.length === 0) {
    fail(`${args.spec} has no images — expected an array, or an object with an "images" array`);
  }

  const resolved = entries.map((entry, i) => resolveEntry(profile, entry, i));
  const targetDir = path.join(brandDir, profile.outputDir ?? "output", "assets", "images");

  if (args.dryRun) {
    console.log(`Dry run — ${resolved.length} image(s) for "${args.brand}". No network calls, nothing written.\n`);
    for (const entry of resolved) {
      console.log(`  ${path.join(targetDir, entry.file)}`);
      console.log(`    ${entry.width}x${entry.height}  style=${entry.style}  seed=${entry.seed}  fmt=${entry.format}`);
      console.log(`    prompt: ${entry.prompt}`);
      const altNote =
        entry.alt === "" ? '(decorative — alt="")' : (entry.alt ?? "(none — write one before this ships)");
      console.log(`    alt:    ${altNote}\n`);
    }
    return;
  }

  const token = process.env.BANANA_STAND_TOKEN;
  if (!token) {
    // House style, matching the SURGE_TOKEN handling in deploy.yml: a missing
    // credential degrades to a no-op, it never fails a build.
    console.log("BANANA_STAND_TOKEN not set — skipping image generation, placeholders left in place.");
    console.log("Set it to generate, or run with --dry-run to preview the prompts.");
    return;
  }

  const instance = (profile.instance ?? process.env.BANANA_STAND_URL ?? DEFAULT_INSTANCE).replace(/\/$/, "");
  await mkdir(targetDir, { recursive: true });

  console.log(`Generating ${resolved.length} image(s) for "${args.brand}" via ${instance}\n`);

  const failures = [];
  const provenance = [];

  await pool(resolved, args.concurrency, async (entry) => {
    const target = path.join(targetDir, entry.file);
    if (!args.force && (await exists(target))) {
      console.log(`  skip   ${entry.file} (exists — use --force to regenerate)`);
      return;
    }
    try {
      const record = await generateOne(entry, { instance, token, targetDir });
      const size = (record.bytes / 1024).toFixed(0);
      console.log(`  ok     ${entry.file}  ${record.width}x${record.height}  ${size} KB${record.cached ? "  (cache hit)" : ""}`);
      provenance.push(record);
    } catch (e) {
      console.log(`  FAILED ${entry.file}: ${e.message}`);
      failures.push({ file: entry.file, error: e.message });
    }
  });

  if (provenance.length) {
    console.log(`\nProvenance for ${path.join(brandDir, "site.manifest.json")} — merge into "assets":`);
    console.log(JSON.stringify(provenance, null, 2));
  }

  if (failures.length) {
    console.log(`\n${failures.length} image(s) failed — leave their placeholders in place and note them in the delivery summary.`);
    if (args.strict) process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
