# TripOS

The organizer and in-trip companion for students abroad. *TripOS is a working name.*

This repo is the TripOS website and brochure machine, built on the
[YohDev Website Playbook](docs/PLAYBOOK-README.md) (MIT). It holds:

| What | Where |
|---|---|
| Pilot landing page | `demos/tripos/output/Landing-Page.html` |
| Sample trip brochure | `demos/tripos/output/Sample-Brochure.html` |
| Design system | `demos/tripos/output/Style-Guide.html` and `demos/tripos/output/assets/css/tripos.css` |
| Brochure tools | `demos/tripos/brochures/` |
| Brand hub | `demos/tripos/index.html` |

The live site's front door redirects to the landing page (set in `site.home`).

## Make a brochure

1. Export the pilot Google Form responses as a `.csv`.
2. `npm run brochure:intake -- path/to/responses.csv` creates one draft trip file per response in `demos/tripos/brochures/data/`.
3. Fill the `TODO`s, or open Claude Code here and say *"make Maya's brochure"*. The `trip-brochure` skill researches the destination and fills them.
4. `npm run brochure -- demos/tripos/brochures/data/maya-paris.json`
5. Open `demos/tripos/brochures/out/maya-paris.html`, press Print, save as PDF (Letter, margins none, background graphics on), send.

**Privacy:** real trip files and brochures are git-ignored. Only `sample-*` files are ever published.

## Set the pilot form link

At the bottom of `Landing-Page.html`, paste the Google Form link into `const PILOT_FORM_URL = "";`. Every "Join the pilot" button will open it.

## Quality gates

```bash
npm run ada:scan        # accessibility, WCAG AA
npm run structure:scan  # pages wired together
npm run craft:scan      # looks designed, not generated
npm run install-hook    # run the gates on every commit
```

Pushing to `main` builds the site and publishes it to GitHub Pages (`.github/workflows/deploy.yml`).
