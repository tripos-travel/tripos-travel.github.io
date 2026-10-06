# Trip Brochure Skill

## Identity
- **Name:** `trip-brochure`
- **Display name:** Trip Brochure (TripOS)
- **Description:** Turn one TripOS pilot form response into a personalized, printable trip brochure: the trip on one board, a plan B for the student's own mid-trip worry, and sourced destination essentials. Output is one self-contained HTML file that prints to four Letter pages.
- **Version:** 1.0.0

## Activation Triggers
- "make a brochure for [name]", "make [name]'s brochure", "brochure for the new responses"
- The user drops a Google Form responses .csv for TripOS
- `/trip-brochure`

## Files
| What | Where |
|---|---|
| Builder | `demos/tripos/brochures/build.js` (`npm run brochure -- <file.json>` or `--all`) |
| CSV intake | `demos/tripos/brochures/intake.js` (`npm run brochure:intake -- responses.csv`) |
| Trip files | `demos/tripos/brochures/data/<slug>.json` (git-ignored except `sample-*.json`) |
| Output | `demos/tripos/brochures/out/<slug>.html` (git-ignored). A file with `"sample": true` writes `demos/tripos/output/Sample-Brochure.html` instead |
| Reference | `demos/tripos/brochures/data/sample-london.json` (a complete, good example) |
| Design system | `demos/tripos/output/assets/css/tripos.css`. Never add styles to a brochure by hand |

## Process
1. **Intake.** If given a CSV, run the intake. If given answers in chat, write the trip file yourself with the same shape as the sample. The student's answers go in `answers` **word for word**. Fix spelling only.
2. **Ask what you can't know.** Dates, where they leave from, who's going and what's booked come from the student. Ask the user once, in one batch. If they don't know, leave the board to what the student said and keep the rest of the brochure.
3. **Research the destination.** Look up every fact on the essentials page for *that* destination and *now*: emergency numbers, entry rules for the student's citizenship (ask if unknown), how to pay for transit, currency, plugs, nearest embassy or consulate. Add each source to `sources`. If something can't be verified, leave it out.
4. **Write the plan B for their worry.** 3 to 5 steps, each a short bold title plus one or two plain sentences. Be concrete for the place and the transport (which passenger rules apply, which app, what to screenshot). Never promise compensation amounts.
5. **Write `lastTripFix`.** One concrete habit that would have prevented what went wrong last time.
6. **Build**, then check: `node scripts/ada-scan.js demos/tripos/brochures/out/<slug>.html`. Render it (open, or print to PDF) and confirm every page fits on one Letter sheet. If a page overflows, cut words, not font size.
7. **Hand off.** Tell the user the file path and to print it to PDF (Letter, margins none, background graphics on).

## Voice
Friendly, wise, capable. Short sentences. Sentence-case headlines ending in a period. No em dashes. No stock phrases ("seamless", "elevate", "unlock"…). Talk to the student as "you".

## Board rows
`{ "day": "FRI", "time": "09:55", "what": "Flight to London Gatwick", "src": "airline app", "status": "Checked in", "kind": "go" }`
- `kind`: `go` (sorted), `flap` (needs one thing from them), `alert` (a problem or someone owes money).
- `src` is where that plan lives today, using the student's own answer to "where is your info saved".

## Rules
- **No invented facts.** Bookings, names and plans come from the student. Destination facts come from sources you checked.
- **Privacy.** Real brochures and trip files never get committed or published. Only `sample-*` files are public, and they must be clearly marked `"sample": true`.
- **One brochure per student per trip.** Re-running the build overwrites that student's HTML, never their trip file.
