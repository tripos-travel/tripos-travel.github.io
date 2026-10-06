# Phase 01 - Intake

## Purpose
Gather all necessary information and decisions before starting design work.

## Inputs
- Structured intake data — `intake/answers.json`, a `BrandIntakeAnswers`-shaped JSON file (see
  `reference/intake-contract.md` for the schema and where the file is looked up)

## Process
1. Read and validate `intake/answers.json` against the contract (`run-skill.js` already did a
   lightweight structural check before this phase starts; this step is the real read of values)
2. Cross-check the data against the 10 canonical questions below using
   `reference/intake-contract.md`'s coverage table — most are directly answered by a contract field;
   for the ones that are only partially covered or not covered at all (there is no field for the
   primary desired visitor action), document an explicit assumption instead of leaving it blank
3. Identify known vs. unknown information
4. Document all decisions and assumptions

## The 10 Canonical Questions
1. What's the single most important thing the home page must communicate?
2. Who is the primary person this page must convert? (One persona, not three.)
3. What's the one action you want them to take?
4. What tone must this absolutely hit — and what tone must it absolutely avoid?
5. Are there sites you want us to look at as positive references? Negative references?
6. What's locked (logo, colors, copy, platform) and what's open?
7. What's your timeline, and what's driving it?
8. Who has sign-off authority, and who else is in the room at reviews?
9. How will you know this worked? (One measurable outcome.)
10. What would make you cancel this project mid-flight?

## Outputs
- `output/01-intake-summary.md`
  - Client information
  - Project constraints
  - Decisions made
  - Assumptions documented
  - Open items with owners

## Exit Criteria
- All canonical questions answered from the contract or covered by a documented assumption
- All project-specific questions resolved
- `output/01-intake-summary.md` written — advances automatically, no approval pause