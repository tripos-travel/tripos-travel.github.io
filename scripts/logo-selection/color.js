// Colour maths for the logo-selection sheets. Every number the pages print comes
// from here, so a designer reading the spec is reading a computed value rather
// than a typed one.
//
// Ported from the Beyond Infinity VisID generator (PR #55) unchanged — the
// conversion is not brand-specific and there is no reason for two copies of it
// to drift.

const chan = hex => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));

const rgb = hex => chan(hex).join(', ');

// Naive device CMYK — the same conversion every design tool shows before a
// colour profile is applied. It is the right starting figure for a spec sheet
// and the wrong figure to send to a printer, which the sheet says out loud.
function cmyk(hex) {
  const [r, g, b] = chan(hex).map(v => v / 255);
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return '0, 0, 0, 100';
  const f = v => Math.round(((1 - v - k) / (1 - k)) * 100);
  return `${f(r)}, ${f(g)}, ${f(b)}, ${Math.round(k * 100)}`;
}

const lum = hex => {
  const c = chan(hex).map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

const ratio = (a, b) => {
  const x = lum(a), y = lum(b);
  return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
};

// WCAG AA verdicts, stated per use rather than as one pass/fail — the whole
// point of the Solas two-accent rule is that one colour can carry a mark and
// not carry body text, and a single boolean hides exactly that.
const aa = {
  body:  r => r >= 4.5,   // text under 18.66px, or under 14px bold
  large: r => r >= 3,     // 24px+, or 18.66px+ bold
  ui:    r => r >= 3,     // icons, rules, focus rings, and a mark's own artwork
};

module.exports = { rgb, cmyk, ratio, lum, aa };
