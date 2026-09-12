# Services V1 Final Corrections Design

**Date:** 2026-09-12

## Goal

Apply only the concrete post-implementation audit fixes required to close Services V1: repair the `/en` compatibility redirect, close the mobile navigation after internal anchor selection, make Home section numbering intentional and bilingual, strengthen the anonymized professional case without exposing confidential information, anonymize the public Home reference to Amparo Seguros unless explicitly authorized, and perform one controlled real form submission with synthetic QA data.

## Scope and constraints

- Keep Astro static output, existing routes, anchors, layout, visual system, `details/summary` navigation, Astro Action, Resend transport, analytics taxonomy, WhatsApp destination, and Marfen link.
- Do not redesign the hero, add services or pages, change pricing, add a blog, introduce server islands, migrate framework, add dependencies, add analytics events, or perform unrelated refactors.
- Preserve `/` as the English Home, `/es/` as the Spanish Home, `/cv/en/`, and `/cv/es/`.
- Do not modify CV content for the Home anonymization correction.
- Use one real form submission only, with synthetic data clearly marked as QA.

## Design

### 1. Compatibility redirect and SEO

Keep `trailingSlash: "always"` unchanged and make both compatibility inputs explicit in `astro.config.mjs`:

```js
redirects: {
  "/en": "/",
  "/en/": "/",
}
```

The generated output and SEO verification must confirm that both `/en` and `/en/` resolve to `/`, while the Home canonical and hreflang links remain `/` and `/es/`. The CV canonical/hreflang pairs remain unchanged. The sitemap must continue to publish only the canonical Home and CV routes.

### 2. Mobile anchor navigation

Extend the existing inline script in `src/components/navbar/navbar.astro` with a delegated click listener on the existing links container. When the activated link has an `href` beginning with `#` and the viewport matches the current mobile breakpoint, set `menu.open = false` without preventing the browser's native anchor navigation.

This closes Services, Work/Cases, About, Contact, and the menu CTA on mobile. It leaves the language switcher, external links, desktop menu state, keyboard activation, visible focus, and current anchors unchanged. No library or hydration framework is added.

### 3. Intentional Home numbering

Use one shared sequence in the existing components, which automatically preserves EN/ES equivalence:

| Number | Section |
| --- | --- |
| `01` | Problem / Problema |
| `02` | Services / Servicios |
| `03` | Selected work / Trabajo seleccionado |
| `04` | Process / Proceso |
| `05` | About / Sobre mí |
| `06` | Fit |
| `07` | Contact / Contacto |

Hero and the professional case remain unnumbered. The four process steps keep their separate internal `01–04` sequence.

### 4. Anonymized professional case

Add a localized `decision` property to `ProfessionalCaseContent` and render it between `problem` and `solution`. The visible order remains Problem → Decision and redesign → Solution → Result.

Use the following copy, with no names, numeric metrics, internal names, or confidential details:

- EN decision: `The process was mapped end to end to identify bottlenecks, clarify handoffs, and remove steps that did not add control or value.`
- ES decision: `Se mapeó el proceso de punta a punta para detectar cuellos de botella, aclarar los traspasos y eliminar pasos que no aportaban control ni valor.`

Keep the approved non-numeric result exactly:

- EN: `A process that took several days was completed in a matter of hours.`
- ES: `Un proceso que requería varios días pasó a completarse en cuestión de horas.`

Use these localized solution sentences so the decision and solution remain distinct:

- EN solution: `Automations, data transformations, and validations were added to reduce manual work and make each step easier to trace.`
- ES solution: `Se incorporaron automatizaciones, transformaciones de datos y validaciones para reducir el trabajo manual y hacer más trazable cada etapa.`

### 5. Public Home anonymization

Replace every Home-facing `Amparo Seguros` mention in `selectedWork.items` with the generic, commercially useful names:

- EN: `Insurance operations ecosystem`
- ES: `Ecosistema digital para operaciones de seguros`

Retain the description of the actual work at a generic level: digital products and systems supporting insurance operations across mobile applications, backend services, internal tools, integrations, and automations. Leave CV data untouched because it is a separate professional context.

## Files and responsibilities

- `astro.config.mjs`: explicit `/en` and `/en/` redirects.
- `src/components/navbar/navbar.astro`: mobile-only close on internal hash navigation.
- `src/components/problem/problem.astro`: section kicker `01`.
- `src/components/capabilities/capabilities.astro`: section kicker `02`.
- `src/components/featured/featured.astro`: section kicker `03`.
- `src/components/process/process.astro`: section kicker `04`.
- `src/components/experience-summary/experience-summary.astro`: section kicker `05`.
- `src/components/fit/fit.astro`: section kicker `06`.
- `src/components/contact-cta/contact-cta.astro`: section kicker `07`.
- `src/components/professional-case/professional-case.astro`: consume the localized `decision` field.
- `src/models/dictionary.model.ts`: type the new `decision` field.
- `src/dictionaries/en.json` and `src/dictionaries/es.json`: localized professional-case narrative and anonymized public work item.
- Existing source tests under `scripts/`: update assertions and add focused regressions for the approved fixes; do not create a new testing framework.

## Validation

Run the required release commands:

```sh
pnpm test
pnpm check
pnpm build
pnpm verify:seo
git diff --check
```

Review the built/deployed site in a browser at `/`, `/es/`, `/en`, `/en/`, `/cv/en/`, and `/cv/es/`, at 390 px and 1440 px. Confirm redirects, anchors, mobile menu closing, canonical, hreflang, sitemap, console cleanliness, WhatsApp destination, and Marfen link.

For the controlled form smoke test, submit once with:

- Name: `QA Test`
- Company: `Test Company`
- Contact: `qa@example.com`
- Process: `Controlled test submission from mgalvan.dev QA`
- Current solution: `Test only`

Verify browser validation, loading, Astro Action, Resend, success state, no reload, no double submission, no console errors, and no QA/lead fields in Analytics requests. Production already has `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; if the Action still fails, report the exact external configuration error without changing the architecture.

## Acceptance criteria

- `/en` and `/en/` redirect to `/`.
- `/`, `/es/`, `/cv/en/`, and `/cv/es/` remain reachable and preserve their existing SEO relationships.
- Any internal hash navigation selected from the mobile menu closes the menu immediately and preserves native anchor behavior.
- Home section kickers are coherent and equivalent in EN/ES: `01–07`, with no number added to Hero or the professional case.
- The professional case reads as Problem → Decision and redesign → Solution → Result, with the approved non-numeric result and full anonymity.
- No Home content contains `Amparo Seguros`; CV content is not changed by this correction.
- Exactly one synthetic QA submission is attempted; its outcome is recorded and no retry is made if an external configuration error prevents delivery.
- All required commands and browser checks pass, or any external blocker is reported precisely.
