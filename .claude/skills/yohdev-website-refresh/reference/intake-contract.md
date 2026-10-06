# Brand Intake Contract

The single, machine-readable input this skill runs on. It replaces the old flow of a human
manually unzipping a **Sales Handoff** folder and Phase 01 asking free-form "canonical questions."

## Where phases read it from

At the start of a run, look for a JSON file at:

```
intake/answers.json
```

(relative to the workspace root — the same level as `output/`). The path is configurable: if
`state.config.intake_file` is set in `.yohdev-state.json`, or the `YOHDEV_INTAKE_FILE` environment
variable is set, that path wins instead.

The file's contents must satisfy `BrandIntakeAnswers` (schema below). Phase 01 fails fast — with a
list of the specific missing/invalid fields — if the file is absent or doesn't match. It does not
pause to ask a human to fill gaps; the contract is expected to already be validated upstream (the
platform validates it against this same shape before handing a tenant's build to this skill).

## Shape (`BrandIntakeAnswers`)

This mirrors the platform's own runtime-validated type — see
`yohdev-playbook-sass`'s `src/client/agent-authoring/brandIntakeStore.ts`
(`BrandIntakeAnswersSchema`, a zod schema; `BrandIntakeAnswers` is `z.infer` of it). Reproduced here
so this repo has no dependency on that one:

```ts
interface BrandIntakeAnswers {
  discoveryBrief: {
    summary: string;
    companyName: string;
  };
  brandIdentity: {
    positioning: string;
    voiceAdjectives: string[];
    toneDos: string[];
    toneDonts: string[];
  };
  logoAndColors: {
    logoAssetPath?: string;
    primaryColor: string;
  };
  currentWebsite: {
    hasExistingSite: boolean;
    url?: string;
  };
  targetAudience: {
    description: string;
    primaryPersona: string;
  };
  strategy: {
    messagingPillars: string[];
    keyMessage: string;
  };
  clientProfile: {
    industry: string;
  };
  techStack: {
    productionPath: "nextjs" | "wordpress";
  };
  projectLogistics: {
    budgetRange: string;
    timeline: string;
    signOffAuthority: string;
    successMetric: string;
    killConditions: string;
    lockedElements: string;
    referenceSitesPositive: string[];
    referenceSitesNegative: string[];
  };
}
```

All fields are required except `logoAndColors.logoAssetPath` and `currentWebsite.url`.

## Required top-level keys (what `run-skill.js` checks)

This repo has no `zod` dependency and doesn't want one just to re-validate what the platform
already validated. `run-skill.js` does a lightweight structural check — every top-level key above
must be present as an object — and Phase 01 does the real read of the field values. It is **not**
a substitute for full schema validation; it only catches "wrong file" / "empty file" / "totally
malformed" mistakes fast.

## Mapping from the old 10 Canonical Questions

Phase 01 used to *ask* these 10 questions interactively. Most are now answered directly by the
contract, so Phase 01's job shifts from "ask" to "read + cross-check." Coverage:

| # | Canonical question | Contract field(s) | Coverage |
|---|---|---|---|
| 1 | Single most important thing the home page must communicate | `strategy.keyMessage`, `strategy.messagingPillars` | Covered |
| 2 | Primary persona to convert | `targetAudience.primaryPersona` | Covered |
| 3 | The one action you want them to take | — | **Not covered.** No field captures a primary CTA / desired visitor action. Phase 01 must still surface this as an open question or a documented assumption. |
| 4 | Tone to hit / avoid | `brandIdentity.toneDos`, `brandIdentity.toneDonts` | Covered |
| 5 | Positive / negative reference sites | `projectLogistics.referenceSitesPositive`, `referenceSitesNegative` | Covered |
| 6 | What's locked vs. open (logo, colors, copy, platform) | `projectLogistics.lockedElements` | **Partially covered** — one free-text field, not broken out per category. Phase 01 should parse/restate it against logo/colors/copy/platform explicitly. |
| 7 | Timeline, and what's driving it | `projectLogistics.timeline` | **Partially covered** — captures the timeline, not the "why." |
| 8 | Sign-off authority, and who else is in the room | `projectLogistics.signOffAuthority` | **Partially covered** — captures the decision-maker, not the full review-room roster. |
| 9 | How will you know this worked (one measurable outcome) | `projectLogistics.successMetric` | Covered |
| 10 | What would make you cancel mid-flight | `projectLogistics.killConditions` | Covered |

See `SKILL.md`'s "The 10 Canonical Questions" section for the question list itself; it's kept for
reference (other skills, e.g. `guided-build`, point users at it) even though Phase 01 no longer asks
these interactively.
