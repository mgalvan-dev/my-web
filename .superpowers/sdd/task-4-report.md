# Task 4 report — Hero, operational problems, and service cards

## Scope delivered

- Updated `src/components/hero/hero.astro` and `hero.module.css`.
  - Renders all localized Hero dictionary fields, including the proof line.
  - Keeps the sole Hero `h1` and changes the primary CTA to `#contact-form` with `contact_cta_clicked`.
  - Keeps the secondary CTA at `#work` with no analytics event.
  - Reduces the H1 scale and Hero vertical space so the primary CTA remains in the initial viewport; mobile H1 is 40–44 px and CTAs stack below 560 px.
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
