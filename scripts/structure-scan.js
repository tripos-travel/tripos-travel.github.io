#!/usr/bin/env node
'use strict';

/**
 * structure-scan.js — zero-dependency structural-consistency scanner for the
 * playbook's per-brand output pages. The companion to ada-scan.js: same CLI,
 * same finding/exit contract, wired into the same pre-commit hook and CI gate.
 *
 * Where ada-scan asks "is this page accessible?", structure-scan asks
 * "does this page belong to the site, and is the site still wired together?".
 * It is the guardrail that keeps a build on the beaten trail: it catches the
 * failure where a builder spawns a stray top-level artifact (e.g. a standalone
 * "Components.html" of product-card grids) instead of folding the work into the
 * brand's existing canonical pages (the Style Guide, homepage, etc.).
 *
 * Source of truth is a per-brand, OPTIONAL manifest: demos/<brand>/site.manifest.json.
 *   - If present, it declares the canonical pages, their roles, and where
 *     component/pattern work belongs (the page with role "style-guide").
 *   - If absent, the scanner degrades gracefully: the canonical set is inferred
 *     from what the brand's hub page (index.html) actually links to, and only
 *     the orphan / broken-link checks run.
 *
 * Checks:
 *   ERROR orphan-page        an output/*.html neither declared in the manifest
 *                            nor reachable from the brand hub (index.html).
 *   ERROR broken-link        a same-brand .html link that resolves to no file.
 *   ERROR missing-page       a manifest pages[] entry whose file is not on disk.
 *   WARN  placement          a non-declared page that looks like a component /
 *                            pattern gallery — belongs in the Style Guide page.
 *
 * Usage:
 *   node scripts/structure-scan.js [paths...]   # default: every brand under demos/
 *   node scripts/structure-scan.js --staged     # only brands touched by staged files
 *   node scripts/structure-scan.js --json        # machine-readable output
 *   node scripts/structure-scan.js --quiet       # only print failures
 *   node scripts/structure-scan.js --html=out.html [--title="..."]
 *   node scripts/structure-scan.js --fix         # auto-fix what's provably safe
 *   node scripts/structure-scan.js --fix --changed-out=FILE  # + list touched files
 *
 * Exit code is 0 when there are no ERROR-level findings, 1 otherwise (after any
 * --fix). WARN-level findings never fail the build. --fix only applies
 * deterministic, non-destructive repairs (see "Auto-fix" below); anything that
 * needs judgment or would delete/overwrite content is left to the
 * `structure-fix` skill, which confirms first.
 *
 * Scope note: when given an explicit/staged file set, findings are reported only
 * for the files in that set — so a pre-existing orphan never blocks an unrelated
 * commit; it is surfaced by the full audit (`npm run structure:scan`) instead.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/* ------------------------------------------------------------------ *
 * Tiny HTML parser (shared shape with ada-scan.js)
 * ------------------------------------------------------------------ */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'template', 'textarea']);

function parseHTML(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null, text: '' };
  let cur = root;
  let i = 0;
  const len = html.length;

  while (i < len) {
    if (html[i] === '<') {
      if (html.startsWith('<!--', i)) {
        const end = html.indexOf('-->', i + 4);
        i = end === -1 ? len : end + 3;
        continue;
      }
      if (html[i + 1] === '!') {
        const end = html.indexOf('>', i);
        i = end === -1 ? len : end + 1;
        continue;
      }
      const close = html.indexOf('>', i);
      if (close === -1) break;
      const raw = html.slice(i + 1, close);
      i = close + 1;

      if (raw[0] === '/') {
        const name = raw.slice(1).trim().toLowerCase();
        let n = cur;
        while (n && n.tag !== name) n = n.parent;
        if (n && n.parent) cur = n.parent;
        continue;
      }

      const m = raw.match(/^([a-zA-Z][\w:-]*)/);
      if (!m) continue;
      const tag = m[1].toLowerCase();
      const selfClose = /\/\s*$/.test(raw);
      const node = {
        tag, attrs: parseAttrs(raw.slice(m[1].length)),
        children: [], parent: cur, text: '',
      };
      cur.children.push(node);

      if (RAW.has(tag)) {
        const closeTag = `</${tag}`;
        const idx = html.toLowerCase().indexOf(closeTag, i);
        const inner = html.slice(i, idx === -1 ? len : idx);
        node.text = inner;
        i = idx === -1 ? len : html.indexOf('>', idx) + 1;
        continue;
      }
      if (!VOID.has(tag) && !selfClose) cur = node;
    } else {
      const next = html.indexOf('<', i);
      const text = html.slice(i, next === -1 ? len : next);
      if (text.trim()) cur.text += ' ' + text.trim();
      i = next === -1 ? len : next;
    }
  }
  return { root };
}

function parseAttrs(s) {
  const attrs = {};
  const re = /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s">]+))?/g;
  let m;
  while ((m = re.exec(s))) {
    let v = m[2] || '';
    if (v && (v[0] === '"' || v[0] === "'")) v = v.slice(1, -1);
    attrs[m[1].toLowerCase()] = v;
  }
  return attrs;
}

function walk(node, fn) {
  for (const c of node.children) {
    fn(c);
    walk(c, fn);
  }
}

/* ------------------------------------------------------------------ *
 * Page inspection helpers
 * ------------------------------------------------------------------ */

// Local .html link targets found in a page, resolved to absolute paths.
// Skips external (http/mailto/tel), in-page anchors, and non-.html targets.
function localHtmlLinks(file) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch { return []; }
  const { root } = parseHTML(html);
  const dir = path.dirname(file);
  const links = [];
  walk(root, (n) => {
    if (n.tag !== 'a') return;
    const href = n.attrs.href;
    if (!href) return;
    if (/^(https?:|mailto:|tel:|#|javascript:|data:)/i.test(href)) return;
    const clean = href.split('#')[0].split('?')[0].trim();
    if (!clean) return;
    const resolved = path.resolve(dir, clean);
    if (resolved.toLowerCase().endsWith('.html')) links.push({ href: clean, resolved });
  });
  return links;
}

// A cheap "what is this page about" probe for the placement heuristic.
function pageIdentity(file) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch { return { title: '', h1: '' }; }
  const { root } = parseHTML(html);
  let title = '';
  let h1 = '';
  walk(root, (n) => {
    if (n.tag === 'title' && !title) title = (n.text || '').trim();
    if (n.tag === 'h1' && !h1) h1 = (n.text || '').replace(/\s+/g, ' ').trim();
  });
  return { title, h1 };
}

const COMPONENT_GALLERY = /\b(component|components|pattern library|pattern-library|ui[\s_-]?kit|design[\s_-]?tokens?|card grid|card-grid)\b/i;

function looksLikeComponentGallery(file) {
  const base = path.basename(file, '.html');
  if (COMPONENT_GALLERY.test(base.replace(/[-_]/g, ' '))) return true;
  const { title, h1 } = pageIdentity(file);
  return COMPONENT_GALLERY.test(title) || COMPONENT_GALLERY.test(h1);
}

/* ------------------------------------------------------------------ *
 * Manifest
 * ------------------------------------------------------------------ */
function loadManifest(brandDir) {
  const p = path.join(brandDir, 'site.manifest.json');
  if (!fs.existsSync(p)) return null;
  try {
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    m.__path = p;
    m.outputDir = m.outputDir || 'output';
    m.hub = m.hub || 'index.html';
    m.pages = Array.isArray(m.pages) ? m.pages : [];
    return m;
  } catch (e) {
    return { __path: p, __error: e.message, outputDir: 'output', hub: 'index.html', pages: [] };
  }
}

// Resolve a manifest page `file` (relative to the output dir unless it has a slash).
function resolveManifestPage(brandDir, manifest, file) {
  if (file.includes('/')) return path.resolve(brandDir, file);
  return path.resolve(brandDir, manifest.outputDir, file);
}

/* ------------------------------------------------------------------ *
 * Per-brand evaluation
 * ------------------------------------------------------------------ */
function outputPages(brandDir, outputDir) {
  const dir = path.join(brandDir, outputDir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => path.join(dir, f));
}

// BFS reachability from the brand hub, following same-brand .html links.
function reachableFromHub(brandDir, hubFile) {
  const seen = new Set();
  if (!fs.existsSync(hubFile)) return seen;
  const queue = [path.resolve(hubFile)];
  seen.add(path.resolve(hubFile));
  while (queue.length) {
    const cur = queue.shift();
    for (const { resolved } of localHtmlLinks(cur)) {
      // stay within the brand dir; ignore portal/cross-brand escapes
      if (!resolved.startsWith(brandDir + path.sep)) continue;
      if (!fs.existsSync(resolved)) continue;
      if (!seen.has(resolved)) { seen.add(resolved); queue.push(resolved); }
    }
  }
  return seen;
}

function evaluateBrand(brandDir) {
  const findings = [];
  const manifest = loadManifest(brandDir);
  const outDir = manifest ? manifest.outputDir : 'output';
  const hubFile = path.resolve(brandDir, manifest ? manifest.hub : 'index.html');

  if (manifest && manifest.__error) {
    findings.push({ file: manifest.__path, level: 'ERROR', rule: 'manifest',
      message: `site.manifest.json is not valid JSON: ${manifest.__error}`, where: '' });
    return findings; // can't reason further with a broken manifest
  }

  const pages = outputPages(brandDir, outDir);
  const reachable = reachableFromHub(brandDir, hubFile);

  // Declared (allowed) set from the manifest.
  const declared = new Set();
  let styleGuideFile = null;
  if (manifest) {
    for (const pg of manifest.pages) {
      if (!pg || !pg.file) continue;
      const abs = resolveManifestPage(brandDir, manifest, pg.file);
      declared.add(abs);
      if (pg.role === 'style-guide') styleGuideFile = pg.file;
    }
    if (manifest.components && manifest.components.home) styleGuideFile = manifest.components.home;
  }

  // ERROR: a declared page that isn't on disk.
  if (manifest) {
    for (const pg of manifest.pages) {
      if (!pg || !pg.file) continue;
      const abs = resolveManifestPage(brandDir, manifest, pg.file);
      if (!fs.existsSync(abs)) {
        findings.push({ file: manifest.__path, level: 'ERROR', rule: 'missing-page',
          message: `manifest declares "${pg.file}" but no such file exists in ${outDir}/.`,
          where: `pages[].file = ${pg.file}` });
      }
    }
  }

  // Orphan + placement checks, per on-disk output page.
  const allowed = new Set([...declared, ...reachable]);
  for (const pageFile of pages) {
    const isAllowed = allowed.has(path.resolve(pageFile));
    const rel = path.relative(brandDir, pageFile);
    if (!isAllowed) {
      const hint = manifest
        ? `not listed in site.manifest.json and not reachable from ${path.basename(hubFile)}`
        : `not reachable from ${path.basename(hubFile)} (no site.manifest.json to declare it)`;
      findings.push({ file: pageFile, level: 'ERROR', rule: 'orphan-page',
        message: `Orphan page — ${hint}. Wire it into the site (nav + hub) and declare it in site.manifest.json, or remove it.`,
        where: rel });
    }
    // Placement smell: a component/pattern gallery living as its own artifact.
    const declaredHere = declared.has(path.resolve(pageFile));
    if (!declaredHere && looksLikeComponentGallery(pageFile)) {
      const target = styleGuideFile ? ` — its home is the Style Guide page (${styleGuideFile})` : ' — its home is the brand Style Guide / Design System';
      findings.push({ file: pageFile, level: 'WARN', rule: 'placement',
        message: `This looks like a component / pattern gallery${target}. Fold component work into the existing Style Guide rather than adding a standalone artifact.`,
        where: rel });
    }
  }

  // ERROR: broken same-brand links from the hub and every output page.
  const linkSources = [hubFile, ...pages].filter((f) => fs.existsSync(f));
  const seenBroken = new Set();
  for (const src of linkSources) {
    for (const { href, resolved } of localHtmlLinks(src)) {
      if (!resolved.startsWith(brandDir + path.sep)) continue; // only in-brand links
      if (fs.existsSync(resolved)) continue;
      const key = src + '::' + href;
      if (seenBroken.has(key)) continue;
      seenBroken.add(key);
      findings.push({ file: src, level: 'ERROR', rule: 'broken-link',
        message: `Broken internal link "${href}" — resolves to a file that does not exist.`,
        where: path.relative(brandDir, src), href, brandDir });
    }
  }

  return findings;
}

/* ------------------------------------------------------------------ *
 * Auto-fix — deterministic, non-destructive only
 * ------------------------------------------------------------------ *
 * The gate self-heals what it can prove safe. Today that is exactly one
 * class of fix: repointing a broken internal link when there is exactly one
 * same-named file in the brand it obviously meant. Everything that needs a
 * judgment call or would delete/overwrite content (wiring in a disconnected
 * page, folding a component gallery into the Style Guide) is intentionally
 * left to the `structure-fix` skill, which confirms before it destroys
 * anything. This keeps the git hook's automatic fixes predictable and safe.
 */
function findingKey(f) {
  return `${path.resolve(f.file)}|${f.rule}|${f.message}`;
}

function brandHtmlFiles(brandDir) {
  const outDir = (loadManifest(brandDir) || {}).outputDir || 'output';
  const files = [path.join(brandDir, 'index.html'), path.join(brandDir, 'prephase.html')];
  return [...files, ...outputPages(brandDir, outDir)].filter((f) => fs.existsSync(f));
}

// Returns absolute paths of files it modified.
function applyBrandFixes(brandDir, findings) {
  const changed = [];
  const htmlFiles = brandHtmlFiles(brandDir);
  for (const f of findings) {
    if (f.rule !== 'broken-link' || !f.href) continue;
    const base = path.basename(f.href).toLowerCase();
    const targets = htmlFiles.filter((p) => path.basename(p).toLowerCase() === base);
    if (targets.length !== 1) continue; // ambiguous or none → leave for the skill
    const newHref = path.relative(path.dirname(f.file), targets[0]);
    if (!newHref || newHref === f.href) continue;
    let text;
    try { text = fs.readFileSync(f.file, 'utf8'); } catch { continue; }
    const esc = f.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(href\\s*=\\s*)("${esc}"|'${esc}')`, 'g');
    const next = text.replace(re, (_m, p1) => `${p1}"${newHref}"`);
    if (next !== text) {
      fs.writeFileSync(f.file, next);
      if (!changed.includes(f.file)) changed.push(f.file);
    }
  }
  return changed;
}

/* ------------------------------------------------------------------ *
 * Discovery — brands & target files
 * ------------------------------------------------------------------ */
function allBrandDirs() {
  const demos = path.join(process.cwd(), 'demos');
  if (!fs.existsSync(demos)) return [];
  return fs.readdirSync(demos)
    .map((b) => path.join(demos, b))
    .filter((d) => fs.statSync(d).isDirectory());
}

function brandDirOf(file) {
  const demos = path.join(process.cwd(), 'demos') + path.sep;
  const abs = path.resolve(file);
  if (!abs.startsWith(demos)) return null;
  const rest = abs.slice(demos.length);
  const slug = rest.split(path.sep)[0];
  return slug ? path.join(process.cwd(), 'demos', slug) : null;
}

// Files that matter to structure: any .html plus site.manifest.json.
function relevant(f) {
  return f.endsWith('.html') || path.basename(f) === 'site.manifest.json';
}

function stagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
    return out.split('\n').map((s) => s.trim()).filter(relevant)
      .map((f) => path.join(process.cwd(), f))
      .filter((f) => fs.existsSync(f));
  } catch {
    return [];
  }
}

function expandArgs(args) {
  const files = [];
  for (const a of args) {
    if (!fs.existsSync(a)) continue;
    const st = fs.statSync(a);
    if (st.isDirectory()) {
      for (const f of fs.readdirSync(a)) if (relevant(f)) files.push(path.join(a, f));
    } else if (relevant(a)) {
      files.push(path.resolve(a));
    }
  }
  return files;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */
function main() {
  const argv = process.argv.slice(2);
  const opts = {};
  const positional = [];
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq === -1) opts[a.slice(2)] = true;
      else opts[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      positional.push(a);
    }
  }

  // Determine mode: full audit (all brands, report everything) vs. targeted
  // (staged / explicit paths → report only findings on those files).
  let targetFiles = null; // null = full audit
  if (opts.staged) targetFiles = stagedFiles();
  else if (positional.length) targetFiles = expandArgs(positional);

  let brandDirs;
  let targetSet = null; // Set of absolute paths to restrict reporting to
  if (targetFiles === null) {
    brandDirs = allBrandDirs();
  } else {
    targetSet = new Set(targetFiles.map((f) => path.resolve(f)));
    const dirs = new Set();
    for (const f of targetFiles) {
      const d = brandDirOf(f);
      if (d) dirs.add(d);
    }
    brandDirs = [...dirs];
  }

  const all = [];
  const fixed = [];
  const changedFiles = new Set();
  const evalBrand = (dir) => {
    try { return evaluateBrand(dir); }
    catch (e) { return [{ file: dir, level: 'ERROR', rule: 'scanner', message: `scanner crashed: ${e.message}`, where: '' }]; }
  };
  for (const dir of brandDirs.sort()) {
    let findings = evalBrand(dir);
    if (opts.fix) {
      const before = findings;
      const changed = applyBrandFixes(dir, before);
      if (changed.length) {
        changed.forEach((c) => changedFiles.add(c));
        const after = evalBrand(dir);
        const afterKeys = new Set(after.map(findingKey));
        for (const f of before) if (!afterKeys.has(findingKey(f))) fixed.push(f);
        findings = after;
      }
    }
    for (const f of findings) {
      if (targetSet && !targetSet.has(path.resolve(f.file))) continue;
      all.push(f);
    }
  }

  // Emit the list of files auto-fix touched, for the pre-commit hook to re-stage.
  if (typeof opts['changed-out'] === 'string') {
    fs.writeFileSync(opts['changed-out'], [...changedFiles].join('\n') + (changedFiles.size ? '\n' : ''));
  }

  const errors = all.filter((f) => f.level === 'ERROR');
  const warns = all.filter((f) => f.level === 'WARN');
  const fixedShown = targetSet ? fixed.filter((f) => targetSet.has(path.resolve(f.file))) : fixed;

  // Count of things scanned (for headers): brands in full mode, files in targeted mode.
  const scanned = targetFiles === null ? brandDirs.length : targetFiles.length;

  if (typeof opts.html === 'string') {
    const title = typeof opts.title === 'string' ? opts.title : 'Site structure / consistency report';
    fs.writeFileSync(opts.html, renderHtml(scanned, all, errors, warns, title, targetFiles === null));
  }

  if (targetFiles !== null && targetFiles.length === 0) {
    if (opts.json) console.log(JSON.stringify({ files: 0, errors: 0, warnings: 0, findings: [] }));
    else console.log('Structure scan: no relevant files staged/selected to check.');
    process.exit(0);
  }
  if (!brandDirs.length) {
    if (opts.json) console.log(JSON.stringify({ files: 0, errors: 0, warnings: 0, findings: [] }));
    else console.log('Structure scan: no brands found under demos/.');
    process.exit(0);
  }

  if (opts.json) {
    console.log(JSON.stringify({
      files: scanned, errors: errors.length, warnings: warns.length,
      fixed: fixedShown, changedFiles: [...changedFiles], findings: all,
    }, null, 2));
    process.exit(errors.length ? 1 : 0);
  }

  report(scanned, all, errors, warns, !!opts.quiet, targetFiles === null, fixedShown);
  process.exit(errors.length ? 1 : 0);
}

function report(scanned, all, errors, warns, quiet, fullAudit, fixedShown) {
  const C = process.stdout.isTTY
    ? { red: (s) => `\x1b[31m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m` }
    : { red: (s) => s, yellow: (s) => s, green: (s) => s, dim: (s) => s, bold: (s) => s };

  if (fixedShown && fixedShown.length) {
    console.log(C.green(`\n✎ Auto-fixed ${fixedShown.length} issue(s):`));
    for (const f of fixedShown) {
      console.log(`  ${C.green('✓')} ${C.dim('[' + f.rule + ']')} ${path.relative(process.cwd(), f.file)} — ${f.message}`);
    }
  }

  const byFile = new Map();
  for (const f of all) {
    if (quiet && f.level !== 'ERROR') continue;
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }

  console.log(C.bold('\nSite structure / consistency scan'));
  const unit = fullAudit ? 'brand(s)' : 'file(s)';
  console.log(C.dim(`Scanned ${scanned} ${unit} · ${errors.length} error(s) · ${warns.length} warning(s)\n`));

  for (const [file, list] of byFile) {
    const rel = path.relative(process.cwd(), file);
    console.log(C.bold(rel));
    for (const f of list) {
      const tag = f.level === 'ERROR' ? C.red('✗ ERROR') : C.yellow('! WARN ');
      console.log(`  ${tag} ${C.dim('[' + f.rule + ']')} ${f.message}`);
      if (f.where) console.log(`         ${C.dim(f.where)}`);
    }
    console.log('');
  }

  if (errors.length === 0) {
    console.log(C.green('✓ No structural issues.') + (warns.length ? C.dim(` (${warns.length} warning(s) to review)`) : ''));
  } else {
    console.log(C.red(`✗ ${errors.length} structural issue(s). Fix these before committing.`));
  }
}

/* ------------------------------------------------------------------ *
 * Self-contained HTML report (uploaded as a CI artifact, never committed)
 * ------------------------------------------------------------------ */
function renderHtml(scanned, all, errors, warns, title, fullAudit) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let generated = '';
  try { generated = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'; } catch { /* ignore */ }

  const byFile = new Map();
  for (const f of all) {
    const rel = path.relative(process.cwd(), f.file);
    if (!byFile.has(rel)) byFile.set(rel, []);
    byFile.get(rel).push(f);
  }
  const order = [...byFile.entries()].sort((a, b) => {
    const ea = a[1].some((x) => x.level === 'ERROR'); const eb = b[1].some((x) => x.level === 'ERROR');
    if (ea !== eb) return ea ? -1 : 1;
    return (b[1].length - a[1].length) || a[0].localeCompare(b[0]);
  });

  const fileSections = order.map(([rel, list]) => {
    const rows = list
      .sort((x, y) => (x.level === y.level ? 0 : x.level === 'ERROR' ? -1 : 1))
      .map((f) => `
        <li class="f ${f.level.toLowerCase()}">
          <span class="badge ${f.level.toLowerCase()}">${f.level}</span>
          <span class="rule">${esc(f.rule)}</span>
          <div class="msg">${esc(f.message)}</div>
          ${f.where ? `<div class="where">${esc(f.where)}</div>` : ''}
        </li>`).join('');
    const ec = list.filter((f) => f.level === 'ERROR').length;
    const wc = list.filter((f) => f.level === 'WARN').length;
    return `<section class="file"><h2>${esc(rel)} <span class="counts">${ec} error${ec === 1 ? '' : 's'} · ${wc} warning${wc === 1 ? '' : 's'}</span></h2><ul>${rows}</ul></section>`;
  }).join('\n');

  const verdict = errors.length
    ? `<span class="v-fail">${errors.length} blocking issue${errors.length === 1 ? '' : 's'}</span>`
    : `<span class="v-pass">No blocking issues</span>`;
  const unit = fullAudit ? 'brand' : 'file';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root{--err:#c62828;--warn:#b26a00;--ok:#1e7d4f;--ink:#1a1a1a;--mut:#6b7280;--line:#e5e7eb;--bg:#f7f7f8}
  *{box-sizing:border-box}
  body{margin:0;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg)}
  header{background:#0d1b2a;color:#fff;padding:28px 24px}
  header h1{margin:0 0 6px;font-size:20px}
  header .meta{color:#aab4c2;font-size:13px}
  .summary{display:flex;flex-wrap:wrap;gap:10px;padding:18px 24px;border-bottom:1px solid var(--line);background:#fff}
  .chip{border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:13px;background:#fff}
  .chip b{font-weight:700}
  .v-fail{color:var(--err);font-weight:700}.v-pass{color:var(--ok);font-weight:700}
  .note{padding:14px 24px;color:var(--mut);font-size:13px;background:#fff;border-bottom:1px solid var(--line)}
  main{padding:8px 24px 48px;max-width:1000px}
  .file{background:#fff;border:1px solid var(--line);border-radius:10px;margin:16px 0;overflow:hidden}
  .file h2{margin:0;font-size:15px;padding:12px 16px;border-bottom:1px solid var(--line);background:#fafafa;display:flex;justify-content:space-between;gap:12px;align-items:center;word-break:break-all}
  .counts{color:var(--mut);font-weight:500;font-size:12px;white-space:nowrap}
  ul{list-style:none;margin:0;padding:0}
  li.f{padding:12px 16px;border-bottom:1px solid var(--line)}
  li.f:last-child{border-bottom:0}
  .badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;padding:2px 8px;border-radius:6px;color:#fff;vertical-align:middle}
  .badge.error{background:var(--err)}.badge.warn{background:var(--warn)}
  .rule{display:inline-block;margin-left:8px;font-size:12px;color:var(--mut);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .msg{margin-top:6px}
  .where{margin-top:4px;color:var(--mut);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;word-break:break-word}
</style></head>
<body>
<header>
  <h1>${esc(title)}</h1>
  <div class="meta">Structural consistency audit of ${scanned} ${unit}${scanned === 1 ? '' : 's'}${generated ? ` · generated ${esc(generated)}` : ''}</div>
</header>
<div class="summary">
  <span class="chip">Verdict: ${verdict}</span>
  <span class="chip">${fullAudit ? 'Brands' : 'Files'}: <b>${scanned}</b></span>
  <span class="chip">Errors: <b style="color:var(--err)">${errors.length}</b></span>
  <span class="chip">Warnings: <b style="color:var(--warn)">${warns.length}</b></span>
</div>
<div class="note">
  Structural consistency. <b>ERROR</b> blocks merge for changed pages; <b>WARN</b> is advisory.
  The canonical page set is declared in each brand's <code>site.manifest.json</code> (or inferred from the
  brand hub's links when absent). Fold component work into the Style Guide; wire new pages into nav + hub.
</div>
<main>
${fileSections || '<p>No structural issues found.</p>'}
</main>
</body></html>
`;
}

main();
