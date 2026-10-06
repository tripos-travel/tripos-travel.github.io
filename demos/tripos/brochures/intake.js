#!/usr/bin/env node
'use strict';

/**
 * TripOS brochure intake. Zero dependencies.
 *
 * Turns a Google Form responses export (File > Download > .csv from the linked
 * Sheet) into one draft trip file per response in brochures/data/. Each draft
 * holds the student's own answers word for word, plus TODO markers for the parts
 * that need research (the board, the plan B, the destination essentials).
 *
 * Usage:
 *   node demos/tripos/brochures/intake.js responses.csv
 *   npm run brochure:intake -- ~/Downloads/responses.csv
 *
 * Existing trip files are never overwritten.
 *
 * Columns are matched by keywords in the question text, so the form wording can
 * change. If a column isn't found, the matching field is left as a TODO.
 */

const fs = require('fs');
const path = require('path');
const { slugify } = require('./build.js');

const DATA = path.join(__dirname, 'data');

// field -> keywords that identify the form question (first match wins)
const FIELDS = {
  firstName: ['first name', 'name'],
  contact: ['email', 'phone', 'contact', 'reach'],
  nextTrip: ['next trip', 'where are you going', 'going next', 'destination'],
  storedIn: ['saved', 'save', 'stored', 'store', 'keep', 'lives'],
  lastTrip: ['last trip', 'went wrong', 'previous trip'],
  worry: ['mid-trip', 'mid trip', 'during', 'help with'],
};

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== '')) rows.push(row);
  return rows;
}

function mapColumns(header) {
  const lower = header.map((h) => h.toLowerCase());
  const used = new Set();
  const map = {};
  for (const [field, keys] of Object.entries(FIELDS)) {
    for (const k of keys) {
      const idx = lower.findIndex((h, i) => !used.has(i) && h.includes(k));
      if (idx !== -1) { map[field] = idx; used.add(idx); break; }
    }
  }
  return map;
}

function draft(r, map, header) {
  const get = (f) => (map[f] != null ? (r[map[f]] || '').trim() : '');
  const firstName = get('firstName').split(/\s+/)[0] || 'TODO first name';
  const to = get('nextTrip') || 'TODO destination';
  return {
    slug: slugify(`${firstName}-${to}`),
    preparedOn: 'TODO date sent',
    traveler: { firstName, contact: get('contact') || 'TODO contact' },
    trip: {
      name: `TODO short trip name, e.g. "Long weekend in ${to}"`,
      from: 'TODO where they leave from',
      to,
      dates: 'TODO dates',
      crew: [firstName],
    },
    answers: {
      storedIn: get('storedIn') || 'TODO',
      lastTrip: get('lastTrip') || 'TODO',
      worry: get('worry') || 'TODO',
    },
    board: [
      { day: 'TODO', time: 'TODO', what: 'TODO plan', src: 'TODO where it came from', status: 'TODO', kind: 'go' },
    ],
    boardNote: '',
    planB: { title: 'TODO, e.g. "If your train is cancelled."', steps: [{ title: 'TODO', text: 'TODO' }] },
    lastTripFix: 'TODO one concrete fix for what went wrong last time',
    essentials: [{ k: 'Emergency', v: 'TODO (look it up for the destination)' }],
    checklist: ['TODO'],
    contact: 'TODO how they reach you mid-trip',
    sources: [{ label: 'TODO', url: 'https://TODO' }],
    _form: Object.fromEntries(header.map((h, i) => [h, r[i] || ''])),
  };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.log('Usage: node demos/tripos/brochures/intake.js responses.csv'); process.exit(1); }
  const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const [header, ...responses] = rows;
  const map = mapColumns(header);
  const missing = Object.keys(FIELDS).filter((f) => map[f] == null);
  console.log(`TripOS intake: ${responses.length} response(s)`);
  if (missing.length) console.warn(`  ! no column found for: ${missing.join(', ')} (left as TODO)`);
  fs.mkdirSync(DATA, { recursive: true });
  for (const r of responses) {
    const d = draft(r, map, header);
    const out = path.join(DATA, `${d.slug}.json`);
    if (fs.existsSync(out)) { console.log(`  = ${path.basename(out)} exists, skipped`); continue; }
    fs.writeFileSync(out, JSON.stringify(d, null, 2) + '\n');
    console.log(`  + ${path.relative(process.cwd(), out)}`);
  }
}
