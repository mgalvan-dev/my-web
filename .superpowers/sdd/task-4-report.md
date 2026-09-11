# Task 4 report — Hero, operational problems, and service cards

## Scope delivered

- Updated `src/components/hero/hero.astro` and `hero.module.css`.
  - Renders all localized Hero dictionary fields, including the proof line.
  - Keeps the sole Hero `h1` and changes the primary CTA to `#contact-form` with `contact_cta_clicked`.
  - Keeps the secondary CTA at `#work` with no analytics event.
  - Reduces the H1 scale and Hero vertical space so the primary CTA remains in the initial viewport; CTAs stack below 560 px.
- Added `src/components/problem/problem.astro` and `problem.module.css`.
  - Consumes `Dictionary["problem"]` and renders the exact localized title, body, seven-item semantic `ul`, and closing copy.
- Updated `src/components/capabilities/capabilities.astro` and `capabilities.module.css`.
  - Retains the `Dictionary["capabilities"]` prop boundary and typed `ServiceItem[]` items from Task 2.
  - Renders the title, intro, exactly three mapped service cards, their result-oriented copy, and one subdued IA capability note outside the card grid.
  - Each service CTA links to `#contact-form` and emits `services_cta_clicked`.

## Scope safeguards

- No routes, dictionaries/types, analytics listener, runtime/configuration, assets, CV, or sibling checkout were modified.
- No `/servicios/` path was added.
- Existing dark CSS tokens, global focus-visible styling, reduced-motion behavior, and responsive button sizing are retained.
- The future `ProblemSection` import/render remains intentionally deferred to later route wiring, per Task 3 context and the six-file limit.

## Verification

- Direct Task 4 source contract: passed. It verifies both language dictionaries are consumed; exact component boundaries; one Hero H1; Hero and service CTA destinations/events; no secondary Hero event; semantic problem list; exactly one mapped service-card template backed by three dictionary items; IA note; and no `/servicios/` path.
- `pnpm build`: passed. Static output built all four pages.
- Generated HTML inspection: `dist/index.html` and `dist/es/index.html` each contain exactly one `h1`.
- `git diff --check`: passed.
- `pnpm check`: blocked by a pre-existing, out-of-scope error in `src/components/experience-summary/experience-summary.astro:28`: `dictionary.text` is absent from the current `Dictionary["experienceSummary"]` type.
- `node --test scripts/services-v1-source.test.mjs`: 5 passed, 6 failed. Task 4's `services_cta_clicked` owner contract now passes; remaining failures are deferred/out-of-scope expectations for route imports, case analytics, Contact form/Action/WhatsApp, and static adapter configuration.

## Review follow-up: narrow mobile Hero geometry

- Baseline Playwright measurement at 375 × 812 showed the approved English H1 at 40.125 px over seven lines and Spanish over eight lines. The Spanish primary CTA reached 791 px, leaving only 21 px before the bottom of the viewport.
- Tuned only `hero.module.css`: narrow mobile (`<= 560px`) uses a 36 px floor at 375 px, scales to 37.05 px at 390 px, and reaches the requested 40 px at approximately 421 px (44 px by approximately 463 px). It also uses 0.96 leading, slightly tighter tracking, reduced Hero padding/gaps, a 1rem description, and zero extra CTA top margin. Buttons remain stacked and at least 48 px high.
- The small 10% reduction at 375 px is measured and deliberate. The approved Spanish H1 cannot reach three to four lines in a 375 px viewport while retaining 40–44 px type: even a simulated 28 px title remained at five lines. Reducing farther would compromise the specified mobile typography more than the present 6–7-line result.
- Final Playwright dev-server geometry, with no page or console errors:
  - 375 × 812: EN 36 px / 6 lines / CTA bottom 569 px; ES 36 px / 7 lines / CTA bottom 611 px. Both primary CTAs fully visible.
  - 390 × 844: EN 37.05 px / 6 lines / CTA bottom 559 px; ES 37.05 px / 7 lines / CTA bottom 618 px. Both primary CTAs fully visible.
  - 1440 × 900: EN and ES 56 px / 4 lines; CTA bottoms 657 px and 692 px respectively. Both primary CTAs fully visible.
- Post-review `pnpm build` passed, and the generated `dist/index.html` and `dist/es/index.html` each contain exactly one `h1`.
