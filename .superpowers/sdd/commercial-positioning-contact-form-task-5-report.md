# Task 5: Simplify the bilingual contact inquiry

## Result

Implemented the reduced bilingual inquiry form with required name, email, and message fields, plus the optional localized project type selector. Added the `CONTACT_EMAIL` mailto CTA, kept the existing WhatsApp helper and configured number, replaced the prefills with the approved generic messages, and retained the Astro Action states, accessible field feedback, locale field, honeypot, server-only Resend credentials, and Resend send boundary.

The Action and direct runtime tests share the exported strict Zod schema and email serializer in `src/actions/contact-project-type.mjs`. Email output includes the localized subject, name, email, optional localized project type, and message; HTML values are escaped and the plain-text version remains readable. Tests call only the schema and serializer; no email was sent.

## TDD evidence

- **RED:** `node --test scripts/contact-action-source.test.mjs scripts/contact-project-type.test.mjs` was run after revising the tests and before production changes. The source assertions failed on the missing new schema/serializer import and the old form lacking an email control; the runtime test could not import the not-yet-added serializer. These failures showed the expected missing behavior. The test harness was then corrected to import the chosen shared serializer name.
- **GREEN:** The same focused command passed after implementation: 16 tests passed, 0 failed, 0 skipped.

## Verification

- `node --test scripts/contact-action-source.test.mjs scripts/contact-project-type.test.mjs`: exit 0; 16 passed, 0 failed, 0 skipped.
- `npm test`: exit 1; 54 passed, 5 failed, 0 skipped (59 total). The five failures are stale assertions in tests outside the allowed Task 5 edit surface:
  - `Home dictionaries contain the approved localized metadata and CTA copy` still requires “process” or “problem” in the English contact description.
  - `Services V1 dictionaries contain exact Spanish commercial copy` still expects the former Spanish contact title.
  - `Services V1 dictionaries have bilingual matching shapes and semantic English entries` still expects the former form title and diagnostic wording.
  - `Services V1 contact form exposes only the approved fields and requiredness` still expects the removed company control.
  - `Services V1 contact action uses the approved Astro Action and Resend contract` still expects the schema to be declared in `src/actions/index.ts` rather than shared with the direct runtime tests.
- `npm run check`: exit 0; 0 errors, 0 warnings, 1 existing TypeScript hint in `scripts/export-cv.mjs:42` (“This may be converted to an async function”).
- `npm run build`: exit 0; Astro completed the static/Vercel build. The `/en/` prerender log says “file not created, response body was empty”, consistent with the existing redirect route.
- `npm run verify:seo`: exit 0; Services V1 SEO verification passed for metadata, canonical, hreflang, JSON-LD, sitemap, robots, redirects, and the Vercel boundary.
- `git diff --check`: exit 0, no whitespace errors.
- Browser inspection of `/` and `/es/` at desktop and mobile widths was not available: the CUA browser inventory returned no browsers. No form submission was attempted.

## Files changed

- `scripts/contact-action-source.test.mjs`
- `scripts/contact-project-type.test.mjs`
- `src/components/contact-cta/contact-cta.astro`
- `src/actions/index.ts`
- `src/actions/contact-project-type.mjs`
- `src/dictionaries/en.json`
- `src/dictionaries/es.json`
- `src/models/dictionary.model.ts`

## Self-review and concerns

- The requested form and serialization behavior is covered by direct runtime tests against the same schema and serializer used by the Action.
- At the time of the initial implementation report, five stale assertions kept the full suite red; this corrective follow-up updates those assertions and the full suite now passes.
- The initial desktop/mobile visual inspection was skipped because no browser was exposed in that environment; this corrective follow-up did not repeat browser inspection.
- Pre-existing unrelated workspace state was preserved: `.gitignore` is modified, `.vscode/extensions.json` and `.vscode/launch.json` are deleted, and `.vercel/` is untracked. None is included in the Task 5 commit.

## Corrective follow-up

- Removed the obsolete `#contact-form` link from the visible CTA group. The group now contains exactly the email link (`CONTACT_EMAIL`) and WhatsApp link (`getWhatsAppUrl`).
- Added a source regression assertion for exactly two visible CTA anchors and their expected destinations. The test failed before the component edit with `3 !== 2`.
- Updated stale home and Services V1 assertions for the current bilingual contact copy, required `name`/`email`/`message` fields, optional project selector, shared schema/serializer module, and the email CTA analytics event. Unrelated page assertions remain intact.
- Verification: focused contact tests passed (16/16); `npm test` passed (59/59); `npm run check` passed with 0 errors and 0 warnings (one existing hint in `scripts/export-cv.mjs:42`); `npm run build` passed; `npm run verify:seo` passed; `git diff --check` passed.
- Corrective implementation commit: `f96f9a2` (`fix(contact): remove redundant contact form CTA`).

## Commit

`a77f6fa` — `feat(contact): simplify bilingual project inquiry form`
