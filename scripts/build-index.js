#!/usr/bin/env node
'use strict';

// Generates the demo-portal index from demos/*/demo.json manifests.
// Adding a new demo folder with a demo.json makes it appear automatically.
//
// Usage: node scripts/build-index.js [outputPath]   (default: dist/index.html)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEMOS_DIR = path.join(ROOT, 'demos');
const TEMPLATE = path.join(ROOT, 'scripts', 'portal-template.html');
const OUT = path.resolve(ROOT, process.argv[2] || path.join('dist', 'index.html'));

const STATUS_LABELS = {
  complete: 'Complete',
  'intake-only': 'Intake-only',
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusClass(status) {
  return String(status || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function loadDemos() {
  if (!fs.existsSync(DEMOS_DIR)) return [];
  return fs
    .readdirSync(DEMOS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const slug = d.name;
      const manifestPath = path.join(DEMOS_DIR, slug, 'demo.json');
      if (!fs.existsSync(manifestPath)) {
        console.warn(`  ! skipping demos/${slug} (no demo.json)`);
        return null;
      }
      let manifest;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (err) {
        console.warn(`  ! skipping demos/${slug} (invalid demo.json: ${err.message})`);
        return null;
      }
      return { slug, ...manifest };
    })
    .filter(Boolean)
    .filter((d) => !d.hidden)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.title).localeCompare(String(b.title)));
}

function renderLogo(demo) {
  const { slug, logo, title, company } = demo;
  if (logo && fs.existsSync(path.join(DEMOS_DIR, slug, logo))) {
    return `<img src="demos/${esc(slug)}/${esc(logo)}" alt="${esc(title)}">`;
  }
  return `<span class="demo-card__logo-fallback">${esc(company || title)}</span>`;
}

function renderStatus(demo) {
  if (!demo.status) return '';
  const cls = statusClass(demo.status);
  const label = STATUS_LABELS[demo.status] || demo.status;
  return `<span class="demo-card__status demo-card__status--${esc(cls)}">${esc(label)}</span>`;
}

function renderReadme(demo) {
  if (!fs.existsSync(path.join(DEMOS_DIR, demo.slug, 'README.md'))) return '';
  return `<a href="demos/${esc(demo.slug)}/README.md" class="demo-card__link">README</a>`;
}

function renderCard(demo) {
  const entry = demo.entry || 'index.html';
  const href = `demos/${esc(demo.slug)}/${esc(entry)}`;
  return `        <div class="demo-card">
          <a href="${href}" class="demo-card__main">
            <div class="demo-card__logo">${renderLogo(demo)}</div>
            <h3>${esc(demo.title || demo.slug)}</h3>
            <div class="demo-card__meta">
              ${demo.location ? `<span class="demo-card__location">${esc(demo.location)}</span>` : ''}
              ${renderStatus(demo)}
            </div>
            <p>${esc(demo.blurb || '')}</p>
          </a>
          <div class="demo-card__links">
            <a href="${href}" class="demo-card__link">View Demo →</a>
            ${renderReadme(demo)}
          </div>
        </div>`;
}

function main() {
  const template = fs.readFileSync(TEMPLATE, 'utf8');
  const demos = loadDemos();

  const cards = demos.length
    ? demos.map(renderCard).join('\n\n')
    : '        <p style="color:var(--gray-600);">No demos found. Add a folder under <code>demos/</code> with a <code>demo.json</code>.</p>';

  if (!template.includes('<!--DEMO_CARDS-->')) {
    throw new Error('portal-template.html is missing the <!--DEMO_CARDS--> placeholder');
  }
  const html = template.replace('<!--DEMO_CARDS-->', cards);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
  console.log(`  → portal written to ${path.relative(ROOT, OUT)} (${demos.length} demo${demos.length === 1 ? '' : 's'}: ${demos.map((d) => d.slug).join(', ') || 'none'})`);
}

main();
