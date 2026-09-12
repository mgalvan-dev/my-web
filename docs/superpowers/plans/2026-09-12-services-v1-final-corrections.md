# Services V1 Final Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax (`- [ ]`) for tracking.

**Goal:** Apply only the six approved post-audit corrections and verify that the bilingual Home and contact conversion flow are ready for Services V1 prospecting.

**Architecture:** Keep the existing static Astro page family, shared Home components, details/summary mobile navigation, Astro Action, Resend transport, and current analytics implementation. Store the professional-case decision copy with the other localized dictionary content, make the compatibility redirects explicit, and validate the public behavior with source contracts, build/SEO checks, and browser QA.

**Tech Stack:** Astro 7, TypeScript, Astro Actions, Resend, CSS Modules, Node node:test, pnpm, Playwright/browser QA.

## Global Constraints

- Preserve / as the English Home, /es/ as the Spanish Home, /cv/en/, and /cv/es/.
- Preserve canonical, hreflang, sitemap, existing redirects, current anchors, desktop behavior, keyboard navigation, focus-visible styles, WhatsApp, Marfen, Astro Action, Resend, and the approved Analytics taxonomy.
- Keep output: "static", adapter: vercel(), and trailingSlash: "always".
- Close the mobile menu with the existing details/summary implementation and plain browser JavaScript; add no dependency.
- Keep the professional case fully anonymous, use no numeric metrics, and retain the approved non-numeric result in EN and ES.
- Do not reintroduce the excluded `5 days → 2–6 hours` metric or an equivalent numeric timing claim.
- Replace every Home-facing Amparo Seguros mention with generic insurance-operations wording; do not change src/data/cv/**.
- Make one real contact submission only, using the synthetic QA values in the specification; do not retry if an external configuration error blocks delivery.
- Do not add services, pages, pricing, blog content, server islands, a framework migration, analytics events, or unrelated refactors.

---

### Task 1: Add regression contracts for the approved fixes

**Files:**
- Modify: scripts/home-source.test.mjs
- Modify: scripts/services-v1-source.test.mjs

**Interfaces:**
- Consumes: Current Home source contracts and bilingual dictionary assertions.
- Produces: Failing, focused regression tests that later implementation tasks must satisfy.

- [ ] **Step 1: Add the redirect, mobile-menu, and section-number assertions.**

In the existing scripts/services-v1-source.test.mjs SEO-contract test, keep the current /en assertion and add an explicit assertion for /en/:

~~~js
assert.match(config, /redirects:\s*\{[\s\S]*["']\/en["']\s*:\s*["']\/["']/);
assert.match(config, /["']\/en\/["']\s*:\s*["']\/["']/);
~~~

In scripts/home-source.test.mjs, add this test after the existing responsive-navigation test:

~~~js
test("Home navigation closes its mobile details menu on internal anchors", async () => {
  const navbar = await readSource("src/components/navbar/navbar.astro");

  assert.match(navbar, /data-navigation-links/);
  assert.match(navbar, /linksContainer\.addEventListener\(\s*["']click["']/);
  assert.match(navbar, /closest\(\s*["']a\[href\^=["']#["']\]["']\s*\)/);
  assert.match(navbar, /mobileViewport\.matches/);
  assert.match(navbar, /menu\.open\s*=\s*false/);
  assert.doesNotMatch(navbar, /preventDefault/);
});
~~~

Add a second test in the same file for the shared section components:

~~~js
test("Home section kickers use one ordered sequence in both locales", async () => {
  const numberedSections = [
    ["src/components/problem/problem.astro", "01"],
    ["src/components/capabilities/capabilities.astro", "02"],
    ["src/components/featured/featured.astro", "03"],
    ["src/components/process/process.astro", "04"],
    ["src/components/experience-summary/experience-summary.astro", "05"],
    ["src/components/fit/fit.astro", "06"],
    ["src/components/contact-cta/contact-cta.astro", "07"],
  ];

  for (const [path, number] of numberedSections) {
    const source = await readSource(path);
    assert.match(source, new RegExp("<p\\s+class=\\{styles\\.kicker\\}>" + number + "<\\/p>"), path);
  }
});
~~~

- [ ] **Step 2: Update the content contracts to describe the approved result and anonymized Home item.**

In scripts/services-v1-source.test.mjs, update the professional-case test with the new localized decision and solution assertions:

~~~js
assert.equal(
  spanish.professionalCase.decision,
  "Se mapeó el proceso de punta a punta para detectar cuellos de botella, aclarar los traspasos y eliminar pasos que no aportaban control ni valor.",
);
assert.equal(
  english.professionalCase.decision,
  "The process was mapped end to end to identify bottlenecks, clarify handoffs, and remove steps that did not add control or value.",
);
assert.equal(
  spanish.professionalCase.solution,
  "Se incorporaron automatizaciones, transformaciones de datos y validaciones para reducir el trabajo manual y hacer más trazable cada etapa.",
);
assert.equal(
  english.professionalCase.solution,
  "Automations, data transformations, and validations were added to reduce manual work and make each step easier to trace.",
);
~~~

Inside the existing loop over both professional cases, add:

~~~js
assert.notEqual(professionalCase.decision, professionalCase.solution);
~~~

Update the narrative-order assertion from narrativeCopy.decision to dictionary.decision, and require the component to read the localized field:

~~~js
const order = [
  "dictionary.problem",
  "dictionary.decision",
  "dictionary.solution",
  "dictionary.result",
];
assert.match(source, /dictionary\.decision/);
~~~

Update the existing expected selectedWork.items names in scripts/home-source.test.mjs and scripts/services-v1-source.test.mjs to:

~~~js
["Marfen", "Insurance operations ecosystem", "Helmcode Cloud Products"]
["Marfen", "Ecosistema digital para operaciones de seguros", "Helmcode Cloud Products"]
~~~

Add a Home-only anonymity assertion alongside those dictionary checks:

~~~js
for (const dictionary of [english, spanish]) {
  assert.doesNotMatch(JSON.stringify(dictionary.selectedWork), /Amparo Seguros/i);
}
~~~

- [ ] **Step 3: Run the new contracts and confirm they fail for the current implementation.**

Run:

~~~sh
node --test --test-name-pattern="Home navigation closes|Home section kickers|professional case|Selected work|page-family SEO" scripts/home-source.test.mjs scripts/services-v1-source.test.mjs
~~~

Expected: FAIL because /en/ is not explicit, the navbar has no close listener, the current kickers are 02/04/06/05 in the later sections, the decision is hardcoded and generic, and Home still contains Amparo Seguros.

- [ ] **Step 4: Commit the regression contracts.**

~~~sh
git add scripts/home-source.test.mjs scripts/services-v1-source.test.mjs
git commit -m "test: cover final Services V1 audit fixes"
~~~

### Task 2: Make both English compatibility redirects explicit

**Files:**
- Modify: astro.config.mjs

**Interfaces:**
- Consumes: Astro's existing redirects configuration and static trailing-slash policy.
- Produces: /en and /en/ redirect to / without changing canonical Home/CV routes or global trailing-slash behavior.

- [ ] **Step 1: Add the /en/ redirect without changing existing config.**

Change the existing config block to exactly:

~~~js
redirects: {
  "/en": "/",
  "/en/": "/",
},
~~~

Leave output: "static", adapter: vercel(), site, trailingSlash: "always", and sitemap configuration unchanged.

- [ ] **Step 2: Run the redirect source contract.**

Run:

~~~sh
node --test --test-name-pattern="page-family SEO contracts" scripts/services-v1-source.test.mjs
~~~

Expected: PASS for the redirect assertions and the existing canonical/hreflang/static-output assertions.

- [ ] **Step 3: Commit the route fix.**

~~~sh
git add astro.config.mjs
git commit -m "fix: redirect both English Home compatibility paths"
~~~

### Task 3: Close the mobile menu after internal navigation

**Files:**
- Modify: src/components/navbar/navbar.astro

**Interfaces:**
- Consumes: Existing [data-navigation-menu] details element, matchMedia("(width <= 880px)"), and current hash links.
- Produces: Mobile-only menu closing after hash-link click, with native anchor navigation preserved.

- [ ] **Step 1: Expose the existing links container to the inline script.**

Add the data attribute without changing the class or its links:

~~~astro
<div class={styles.links_container} data-navigation-links>
~~~

- [ ] **Step 2: Add the delegated close handler to the existing details script.**

Inside the current if (menu instanceof HTMLDetailsElement) { ... } block, keep syncMenuState and append:

~~~astro
        const linksContainer = menu.querySelector("[data-navigation-links]");

        if (linksContainer instanceof HTMLElement) {
            linksContainer.addEventListener("click", (event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;

                const link = target.closest('a[href^="#"]');
                if (!(link instanceof HTMLAnchorElement)) return;

                if (mobileViewport.matches) menu.open = false;
            });
        }
~~~

Do not call preventDefault, do not change the link hrefs, and do not close the details element on desktop.

- [ ] **Step 3: Run the source and existing responsive-navigation tests.**

Run:

~~~sh
node --test --test-name-pattern="Responsive navigation|Home navigation closes" scripts/home-source.test.mjs
~~~

Expected: PASS for both tests.

- [ ] **Step 4: Commit the navigation fix.**

~~~sh
git add src/components/navbar/navbar.astro
git commit -m "fix: close mobile menu after anchor navigation"
~~~

### Task 4: Correct the shared Home section numbering

**Files:**
- Modify: src/components/problem/problem.astro
- Modify: src/components/capabilities/capabilities.astro
- Modify: src/components/featured/featured.astro
- Modify: src/components/process/process.astro
- Modify: src/components/experience-summary/experience-summary.astro
- Modify: src/components/fit/fit.astro
- Modify: src/components/contact-cta/contact-cta.astro

**Interfaces:**
- Consumes: Existing shared components rendered by both Home routes.
- Produces: One intentional section-kicker sequence shared by EN and ES.

- [ ] **Step 1: Change only the seven section kicker literals.**

Use these exact replacements, leaving all headings, IDs, layout, and process-step numbers unchanged:

~~~text
src/components/problem/problem.astro                         01 → 01
src/components/capabilities/capabilities.astro               02 → 02
src/components/featured/featured.astro                       03 → 03
src/components/process/process.astro                         02 → 04
src/components/experience-summary/experience-summary.astro   04 → 05
src/components/fit/fit.astro                                 06 → 06
src/components/contact-cta/contact-cta.astro                 05 → 07
~~~

The unchanged 01, 02, and 06 entries are included to make the intended final sequence explicit; only the four inconsistent literals require edits.

- [ ] **Step 2: Run the ordered-kicker contract.**

Run:

~~~sh
node --test --test-name-pattern="Home section kickers" scripts/home-source.test.mjs
~~~

Expected: PASS with all seven shared components matching 01–07.

- [ ] **Step 3: Commit the numbering fix.**

~~~sh
git add src/components/problem/problem.astro src/components/capabilities/capabilities.astro src/components/featured/featured.astro src/components/process/process.astro src/components/experience-summary/experience-summary.astro src/components/fit/fit.astro src/components/contact-cta/contact-cta.astro
git commit -m "fix: make Home section numbering sequential"
~~~

### Task 5: Improve the anonymized case and remove the public client name

**Files:**
- Modify: src/models/dictionary.model.ts
- Modify: src/dictionaries/en.json
- Modify: src/dictionaries/es.json
- Modify: src/components/professional-case/professional-case.astro

**Interfaces:**
- Consumes: Dictionary["professionalCase"] passed from the EN and ES Home routes.
- Produces: A localized decision field rendered in Problem → Decision and redesign → Solution → Result order, plus an anonymized insurance-operations work item for Home.

- [ ] **Step 1: Add the typed decision field.**

In ProfessionalCaseContent, insert decision between problem and solution:

~~~ts
export interface ProfessionalCaseContent {
  eyebrow: string;
  title: string;
  problem: string;
  decision: string;
  solution: string;
  result: string;
  cta: string;
}
~~~

- [ ] **Step 2: Replace the two localized professional-case objects.**

The relevant EN object must contain these exact values:

~~~json
"professionalCase": {
  "eyebrow": "Operational automation",
  "title": "From a process that took days to one completed in hours",
  "problem": "An operational process depended on different information sources, validations, and manual steps that required coordination among several parties.",
  "decision": "The process was mapped end to end to identify bottlenecks, clarify handoffs, and remove steps that did not add control or value.",
  "solution": "Automations, data transformations, and validations were added to reduce manual work and make each step easier to trace.",
  "result": "A process that took several days was completed in a matter of hours.",
  "cta": "Do you have a similar process?"
}
~~~

The relevant ES object must contain these exact values:

~~~json
"professionalCase": {
  "eyebrow": "Automatización operativa",
  "title": "De un proceso de varios días a ejecutarlo en horas",
  "problem": "Un proceso operativo dependía de diferentes fuentes de información, validaciones y pasos manuales que requerían coordinación entre varias partes.",
  "decision": "Se mapeó el proceso de punta a punta para detectar cuellos de botella, aclarar los traspasos y eliminar pasos que no aportaban control ni valor.",
  "solution": "Se incorporaron automatizaciones, transformaciones de datos y validaciones para reducir el trabajo manual y hacer más trazable cada etapa.",
  "result": "Un proceso que requería varios días pasó a completarse en cuestión de horas.",
  "cta": "¿Tenés un proceso parecido?"
}
~~~

- [ ] **Step 3: Render the dictionary decision instead of a generic hardcoded sentence.**

Keep the localized labels, but make the narrative array use dictionary.decision:

~~~astro
const narrativeCopy = {
    en: {
        problem: "Problem",
        decision: "Decision and redesign",
        solution: "Solution",
        result: "Result",
    },
    es: {
        problem: "Problema",
        decision: "Decisión y rediseño",
        solution: "Solución",
        result: "Resultado",
    },
}[locale];

const narrativeBlocks = [
    { label: narrativeCopy.problem, copy: dictionary.problem },
    { label: narrativeCopy.decision, copy: dictionary.decision },
    { label: narrativeCopy.solution, copy: dictionary.solution },
    { label: narrativeCopy.result, copy: dictionary.result },
];
~~~

Do not add a new CSS class or visual treatment.

- [ ] **Step 4: Anonymize only the Home selected-work item.**

In src/dictionaries/en.json, change the second selected-work item to use:

~~~json
{
  "name": "Insurance operations ecosystem",
  "category": "Product, automation & integrations",
  "context": "dam-squad",
  "title": "Evolving a digital ecosystem connected to real insurance operations.",
  "description": "As part of the Dam Squad team, I contribute to digital products and systems that support insurance operations, working across mobile applications, backend services, internal tools, integrations, and automations.",
  "role": "Contribution within the Dam Squad team across product decisions, architecture, development, and systems integration.",
  "tags": ["React Native", "Next.js", "Payload CMS"]
}
~~~

In src/dictionaries/es.json, use the equivalent:

~~~json
{
  "name": "Ecosistema digital para operaciones de seguros",
  "category": "Producto, automatización e integraciones",
  "context": "dam-squad",
  "title": "Evolución de un ecosistema digital conectado con procesos reales de seguros.",
  "description": "Como parte del equipo de Dam Squad, participo en la evolución de productos y sistemas que apoyan operaciones de seguros, trabajando en aplicaciones móviles, servicios backend, herramientas internas, integraciones y automatizaciones.",
  "role": "Contribución dentro del equipo de Dam Squad en decisiones de producto, arquitectura, desarrollo e integración de sistemas.",
  "tags": ["React Native", "Next.js", "Payload CMS"]
}
~~~

Do not edit the matching entries in src/data/cv/en.ts or src/data/cv/es.ts.

- [ ] **Step 5: Run content, shape, and anonymity contracts.**

Run:

~~~sh
node --test --test-name-pattern="professional case|bilingual matching shapes|Home dictionaries|Selected work" scripts/services-v1-source.test.mjs scripts/home-source.test.mjs
~~~

Expected: PASS for the exact result, distinct decision/solution, four-block narrative order, bilingual dictionary shape, generic Home work item, and absence of Amparo Seguros in Home dictionaries.

Then run:

~~~sh
if rg -n -i "Amparo Seguros" src/dictionaries src/pages src/components; then exit 1; fi
~~~

Expected: no output and exit status 0. A separate check must confirm the CV remains unchanged:

~~~sh
git diff -- src/data/cv
~~~

Expected: empty output.

- [ ] **Step 6: Commit the narrative and anonymization fix.**

~~~sh
git add src/models/dictionary.model.ts src/dictionaries/en.json src/dictionaries/es.json src/components/professional-case/professional-case.astro
git commit -m "fix: clarify anonymized case and public work copy"
~~~

### Task 6: Run release validation and browser/form QA

**Files:**
- Verify: all tracked source files and generated build output; do not commit dist/ or .vercel/.

**Interfaces:**
- Consumes: Completed Tasks 1–5 and production Resend configuration.
- Produces: Evidence that the fixed Home, CV routes, redirects, conversion flow, SEO output, and one real QA submission meet the acceptance criteria.

- [ ] **Step 1: Run the complete automated validation set.**

Run each command separately from the repository root:

~~~sh
pnpm test
pnpm check
pnpm build
pnpm verify:seo
git diff --check
~~~

Expected: each command exits 0; pnpm build emits the existing static Home/CV artifacts and no new route family; pnpm verify:seo confirms metadata, canonical, hreflang, sitemap, robots, JSON-LD, and static/Action boundaries.

- [ ] **Step 2: Start the fixed app for browser inspection.**

Run:

~~~sh
pnpm dev --host 127.0.0.1 --port 4321
~~~

Use the browser QA workflow against http://127.0.0.1:4321 for source/build behavior. Use the deployed https://mgalvan.dev URL only for the real Resend submission once it serves the corrected build.

- [ ] **Step 3: Verify the six required routes and SEO relationships.**

At both 390 px and 1440 px, inspect /, /es/, /en, /en/, /cv/en/, and /cv/es/.

Expected:

- /en and /en/ resolve to / and show the English Home.
- / and /es/ show the correct localized Home.
- /cv/en/ and /cv/es/ load the existing CV pages.
- Home canonical/hreflang remain / and /es/; CV canonical/hreflang remain their current pairs.
- The generated sitemap contains only the canonical Home and CV URLs.

- [ ] **Step 4: Verify responsive navigation and public links.**

At 390 px, open the native menu and activate each of Services, Cases/Casos, About/Sobre mí, Contact/Contacto, and the menu CTA. For each activation, confirm the URL hash changes to the existing target and the details element closes immediately. Confirm the language link still navigates between / and /es/ and does not use hash behavior.

At 1440 px, confirm the navigation remains visible/open and selecting an internal anchor does not collapse the desktop links.

On both sizes, confirm visible focus, no horizontal overflow, the WhatsApp link opens the existing wa.me/5493855205726 destination, and the Marfen link remains https://marfen.com.ar.

- [ ] **Step 5: Inspect console and analytics behavior.**

During the route and interaction checks, collect browser console messages and fail the QA pass on page errors or uncaught exceptions. Confirm no new analytics event names appear and no form field values occur in Analytics request URLs or request bodies.

- [ ] **Step 6: Perform exactly one real synthetic form submission.**

On the corrected deployed site, submit once with these exact values:

~~~text
Name: QA Test
Company: Test Company
Contact: qa@example.com
Process: Controlled test submission from mgalvan.dev QA
Current solution: Test only
~~~

Before submitting, verify native required-field validation with one controlled empty-field check and restore the synthetic values. Click submit once. Record the following without submitting again:

- validation accepts the complete payload;
- button/loading state appears and disables the submit control;
- the Astro Action request completes through Resend;
- success state appears without a reload;
- only one Action request is sent;
- no console error appears;
- Analytics requests contain event names only, not QA values or lead fields.

If Resend rejects the request, record the exact response/configuration error and the missing or invalid external variable; do not modify the Action architecture or retry the send.

- [ ] **Step 7: Run final diff and repository checks before handoff.**

Run:

~~~sh
git status --short
git diff --check
git diff --stat origin/main..HEAD
~~~

Expected: only the approved source/tests/spec-plan commits are present, no generated output or .env is staged, and no whitespace errors are reported. Include the pre-existing untracked .playwright-mcp/ and mgalvan-services-v1-design-spec.md in the handoff as untouched user files if they remain present.

- [ ] **Step 8: Request final code review and verify before completion.**

Review the final diff against the approved specification, then rerun the full validation set if the review changes any source. Report modified files, applied fixes, the single smoke-test result, command results, remaining issues, and an explicit prospecting-readiness decision.
