import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const file = (path) => new URL(path, root);

const readJson = async (path) =>
  JSON.parse(await readFile(file(path), "utf8"));

const readSource = async (path) => readFile(file(path), "utf8");

test("Home routes use the approved product-first section order", async () => {
  const routes = await Promise.all([
    readSource("src/pages/index.astro"),
    readSource("src/pages/es/index.astro"),
  ]);

  for (const route of routes) {
    assert.match(route, /<Layout\b/);
    for (const component of [
      "Header",
      "Hero",
      "Featured",
      "ExperienceSummary",
      "ProfessionalWork",
      "ProblemSection",
      "Capabilities",
      "Process",
      "Fit",
      "ContactCta",
      "Footer",
    ]) {
      assert.match(route, new RegExp(`<${component}\\b`));
    }

    const order = [
      "<Header",
      "<Hero",
      "<Featured",
      "<ExperienceSummary",
      "<ProfessionalWork",
      "<ProblemSection",
      "<Capabilities",
      "<Process",
      "<Fit",
      "<ContactCta",
      "<Footer",
    ].map((marker) => route.indexOf(marker));

    assert.ok(order.every((index) => index >= 0));
    assert.deepEqual([...order].sort((a, b) => a - b), order);
    const locale = route.includes('lang: "es"') ? "es" : "en";
    assert.match(route, new RegExp(`lang:\\s*["']${locale}["']`));
    assert.match(
      route,
      /<Featured\s+dictionary=\{dictionary\.selectedWork\}\s+marfenCase=\{dictionary\.marfenCase\}\s*\/>/,
    );
    assert.match(route, /<ProfessionalWork\s+dictionary=\{dictionary\.professionalWork\}\s*\/>/);
    assert.doesNotMatch(route, /<Journal\b|<Projects\b|<Experience\b|<StandaloneExperience\b/);
  }
});

test("Home sections omit decorative indexes while retaining process step numbers", async () => {
  const [problem, capabilities, featured, process, experience, fit, contact] =
    await Promise.all([
      readSource("src/components/problem/problem.astro"),
      readSource("src/components/capabilities/capabilities.astro"),
      readSource("src/components/featured/featured.astro"),
      readSource("src/components/process/process.astro"),
      readSource("src/components/experience-summary/experience-summary.astro"),
      readSource("src/components/fit/fit.astro"),
      readSource("src/components/contact-cta/contact-cta.astro"),
    ]);

  for (const source of [problem, capabilities, featured, process, experience, fit, contact]) {
    assert.doesNotMatch(source, /class={styles\.kicker}>\s*\d{2}\s*<\/p>/);
  }

  assert.doesNotMatch(capabilities, /class={styles\.number}|padStart\(2, "0"\)/);
  assert.match(process, /<span class={styles\.number} aria-hidden="true">\{step\.number\}<\/span>/);
});

test("Home dictionaries contain bilingual Software Developer & Product Builder positioning", async () => {
  const [english, spanish] = await Promise.all([
    readJson("src/dictionaries/en.json"),
    readJson("src/dictionaries/es.json"),
  ]);

  assert.deepEqual(Object.keys(english), Object.keys(spanish));
  assert.deepEqual(Object.keys(english.navigation), Object.keys(spanish.navigation));
  assert.deepEqual(Object.keys(english.capabilities), Object.keys(spanish.capabilities));
  assert.deepEqual(Object.keys(english.process), Object.keys(spanish.process));
  assert.deepEqual(Object.keys(english.selectedWork), Object.keys(spanish.selectedWork));
  assert.deepEqual(
    Object.keys(english.experienceSummary),
    Object.keys(spanish.experienceSummary),
  );

  assert.match(english.hero.eyebrow, /independent developer.*own products/i);
  assert.equal(
    spanish.hero.eyebrow,
    "Desarrollo independiente · Productos propios",
  );
  assert.equal(english.footer.role, "Software developer & product builder");
  assert.equal(spanish.footer.role, "Desarrollador de software y creador de productos");
  assert.equal(english.hero.title, "I'm Marco. I build software and digital products.");
  assert.equal(
    spanish.hero.title,
    "Soy Marco. Construyo software y productos digitales.",
  );
  assert.equal(
    english.hero.description,
    "I'm a software developer and the creator of Marfen, a management system for retail businesses with real users. I'm also developing new products of my own and work with companies on software projects.",
  );
  assert.equal(
    spanish.hero.description,
    "Soy desarrollador de software y creador de Marfen, un sistema de gestión para comercios con usuarios reales. También desarrollo nuevos productos propios y colaboro con empresas en proyectos de software.",
  );
  for (const key of [
    "navigation",
    "hero",
    "capabilities",
    "problem",
    "process",
    "selectedWork",
    "professionalWork",
    "marfenCase",
    "professionalCase",
    "experienceSummary",
    "fit",
    "contact",
  ]) {
    assert.deepEqual(Object.keys(english[key] ?? {}), Object.keys(spanish[key] ?? {}));
  }

  for (const dictionary of [english, spanish]) {
    const serializedHero = JSON.stringify(dictionary.hero);
    assert.doesNotMatch(serializedHero, /React|Next\.js|React Native|TypeScript|n8n/i);
    assert.doesNotMatch(JSON.stringify(dictionary), /Open to remote opportunities|Abierto a oportunidades remotas/);
    assert.equal("journal" in dictionary, false);
  }

  assert.deepEqual(
    english.selectedWork.items.map(({ name }) => name),
    ["Marfen", "Practice management"],
  );
  assert.deepEqual(
    spanish.selectedWork.items.map(({ name }) => name),
    ["Marfen", "Gestión de consultorios"],
  );
  for (const dictionary of [english, spanish]) {
    assert.doesNotMatch(JSON.stringify(dictionary.selectedWork), /Amparo Seguros/i);
  }
});

test("Home keeps CV routes available without Home navigation links", async () => {
  const [englishRoute, spanishRoute, header, navbar, experience, footer, consts] =
    await Promise.all([
    readSource("src/pages/index.astro"),
    readSource("src/pages/es/index.astro"),
    readSource("src/components/header/header.astro"),
    readSource("src/components/navbar/navbar.astro"),
    readSource("src/components/experience-summary/experience-summary.astro"),
    readSource("src/components/footer/footer.astro"),
    readSource("src/consts.ts"),
    ]);

  for (const source of [englishRoute, spanishRoute, header, navbar, experience, footer]) {
    assert.doesNotMatch(source, /cvUrl|CV_PATHS|resumeLabel|resume_link/);
  }

  assert.ok(consts.includes('en: "/Marco-Galvan-CV-EN.pdf"'));
  assert.ok(consts.includes('es: "/Marco-Galvan-CV-ES.pdf"'));
});

test("Home uses the localized role in JSON-LD and keeps the CV outside the Home journey", async () => {
  const [layout, englishPage, spanishPage, header, navbar, experience, footer] =
    await Promise.all([
      readSource("src/layouts/Layout.astro"),
      readSource("src/pages/index.astro"),
      readSource("src/pages/es/index.astro"),
      readSource("src/components/header/header.astro"),
      readSource("src/components/navbar/navbar.astro"),
      readSource("src/components/experience-summary/experience-summary.astro"),
      readSource("src/components/footer/footer.astro"),
    ]);

  assert.match(layout, /role:\s*string/);
  assert.match(layout, /headline:\s*["']Marco Galván — ["']\s*\+\s*role/);
  assert.match(layout, /jobTitle:\s*role/);
  assert.match(englishPage, /role:\s*dictionary\.footer\.role/);
  assert.match(spanishPage, /role:\s*dictionary\.footer\.role/);

  for (const source of [englishPage, spanishPage, header, navbar, experience, footer]) {
    assert.doesNotMatch(source, /cvUrl|CV_PATHS|resumeLabel|resume_link/);
  }

  assert.match(await readSource("src/pages/cv/en.astro"), /<CVLayout\b/);
  assert.match(await readSource("src/pages/cv/es.astro"), /<CVLayout\b/);
});

test("Home routes consume localized commercial SEO metadata", async () => {
  const [english, spanish, englishRoute, spanishRoute] = await Promise.all([
    readJson("src/dictionaries/en.json"),
    readJson("src/dictionaries/es.json"),
    readSource("src/pages/index.astro"),
    readSource("src/pages/es/index.astro"),
  ]);

  assert.match(englishRoute, /metadata: dictionary\.metadata/);
  assert.match(spanishRoute, /metadata: dictionary\.metadata/);
  assert.equal(english.metadata.title, "Marco Galván — Software Developer & Product Builder");
  assert.equal(spanish.metadata.title, "Marco Galván — Desarrollador y creador de productos");
  assert.match(english.metadata.description, /build Marfen.*new products of my own/i);
  assert.match(spanish.metadata.description, /Desarrollo Marfen.*nuevos productos propios/i);
  assert.equal(
    english.metadata.ogImageAlt,
    "Marco Galván — Software Developer",
  );
  assert.equal(
    spanish.metadata.ogImageAlt,
    "Marco Galván — Desarrollador de software",
  );
});

test("Home navigation and sections expose stable anchors without social navigation", async () => {
  const [header, navbar, capabilities, process, featured, experience, contact, footer] =
    await Promise.all([
      readSource("src/components/header/header.astro"),
      readSource("src/components/navbar/navbar.astro"),
      readSource("src/components/capabilities/capabilities.astro"),
      readSource("src/components/process/process.astro"),
      readSource("src/components/featured/featured.astro"),
      readSource("src/components/experience-summary/experience-summary.astro"),
      readSource("src/components/contact-cta/contact-cta.astro"),
      readSource("src/components/footer/footer.astro"),
    ]);

  for (const id of ["top", "services", "process", "work", "about", "contact"]) {
    const source = [header, capabilities, process, featured, experience, contact].join("\n");
    assert.match(source, new RegExp(`id=["']${id}["']`));
  }

  assert.match(header, /homeHref/);
  assert.match(footer, /homeHref/);
  for (const anchor of ["#services", "#work", "#about", "#contact"]) {
    assert.match(navbar, new RegExp(`href=["']${anchor}["']`));
  }

  assert.doesNotMatch(navbar, /cvUrl|resumeLabel|cv_clicked|resume_link/);
  assert.doesNotMatch(navbar, /SOCIAL_LINKS/);
  assert.match(footer, /SOCIAL_LINKS/);
});

test("Responsive navigation synchronizes its initial state with the viewport", async () => {
  const navbar = await readSource("src/components/navbar/navbar.astro");

  assert.match(navbar, /<details[^>]*\sopen(?:\s|>)/);
  assert.match(navbar, /data-navigation-menu/);
  assert.match(navbar, /matchMedia\("\(width <= 880px\)"\)/);
  assert.match(navbar, /menu\.open = !mobileViewport\.matches/);
  assert.match(navbar, /mobileViewport\.addEventListener\("change", syncMenuState\)/);
});

test("Home navigation closes its mobile details menu on internal anchors", async () => {
  const navbar = await readSource("src/components/navbar/navbar.astro");

  assert.match(navbar, /data-navigation-links/);
  assert.match(navbar, /linksContainer\.addEventListener\(\s*["']click["']/);
  assert.match(navbar, /closest\(\s*["']a\[href\^=["']#["']\]["']\s*\)/);
  assert.match(navbar, /mobileViewport\.matches/);
  assert.match(navbar, /menu\.open\s*=\s*false/);
  assert.doesNotMatch(navbar, /preventDefault/);
});

test("Selected work exposes Marfen as a truthful live own product", async () => {
  const [english, spanish] = await Promise.all([
    readJson("src/dictionaries/en.json"),
    readJson("src/dictionaries/es.json"),
  ]);

  assert.equal(english.selectedWork.title, "My products");
  assert.equal(spanish.selectedWork.title, "Productos propios");
  assert.deepEqual(
    english.selectedWork.items.map(({ context, status, url, linkLabel }) => ({
      context,
      status,
      url,
      linkLabel,
    })),
    [
      { context: "own-product", status: "live", url: "https://marfen.com.ar", linkLabel: "Explore Marfen" },
      { context: "own-product", status: "in-development", url: undefined, linkLabel: undefined },
    ],
  );
  assert.deepEqual(
    spanish.selectedWork.items.map(({ context, status, url, linkLabel }) => ({
      context,
      status,
      url,
      linkLabel,
    })),
    [
      { context: "own-product", status: "live", url: "https://marfen.com.ar", linkLabel: "Conocer Marfen" },
      { context: "own-product", status: "in-development", url: undefined, linkLabel: undefined },
    ],
  );
  assert.deepEqual(Object.keys(english.selectedWork.labels.contexts).sort(), [
    "dam-squad",
    "own-product",
    "professional-experience",
  ]);
  assert.equal(english.selectedWork.labels.statuses.live, "Live");
  assert.equal(spanish.selectedWork.labels.statuses.live, "En producción");
  assert.equal(english.selectedWork.labels.statuses["in-development"], "In development");
  assert.equal(spanish.selectedWork.labels.statuses["in-development"], "En desarrollo");
  assert.deepEqual(english.professionalWork.items.map(({ name }) => name), ["Insurance operations ecosystem", "Helmcode Cloud Products"]);
  assert.deepEqual(spanish.professionalWork.items.map(({ name }) => name), ["Ecosistema digital para operaciones de seguros", "Helmcode Cloud Products"]);

  const [englishMarfen, spanishMarfen] = [
    english.selectedWork.items[0],
    spanish.selectedWork.items[0],
  ];
  assert.equal(englishMarfen.name, "Marfen");
  assert.equal(spanishMarfen.name, "Marfen");
  assert.equal(
    englishMarfen.description,
    "Marfen is the sales and management system I develop for retail businesses. It is live and has real users. It brings together sales, inventory, cash management, purchasing, suppliers, customer credit and profitability. I handle its design, architecture, development and ongoing improvements informed by everyday use.",
  );
  assert.equal(
    spanishMarfen.description,
    "Marfen es el sistema de ventas y gestión que desarrollo para comercios. Está en producción y tiene usuarios reales. Reúne ventas, stock, caja, compras, proveedores, fiados y rentabilidad. Me ocupo del diseño, la arquitectura, el desarrollo y su evolución a partir del uso cotidiano.",
  );
  assert.equal(
    englishMarfen.role,
    "Product design · Architecture and development · Maintenance · Iteration with users",
  );
  assert.equal(
    spanishMarfen.role,
    "Diseño de producto · Arquitectura y desarrollo · Mantenimiento · Iteración con usuarios",
  );

  for (const dictionary of [english, spanish]) {
    const serializedMarfen = JSON.stringify(dictionary.selectedWork.items[0]);
    assert.doesNotMatch(
      serializedMarfen,
      /In validation|En validación|being prepared for validation|en preparación para ser validado|not yet a consolidated SaaS|Todavía no es un SaaS consolidado|marfen\.mgalvan\.dev|pos\.mgalvan\.dev/i,
    );
  }
});

test("Home dictionaries contain the approved localized metadata and CTA copy", async () => {
  const [english, spanish] = await Promise.all([
    readJson("src/dictionaries/en.json"),
    readJson("src/dictionaries/es.json"),
  ]);

  assert.equal(english.metadata.title, "Marco Galván — Software Developer & Product Builder");
  assert.equal(
    spanish.metadata.title,
    "Marco Galván — Desarrollador y creador de productos",
  );
  assert.match(english.metadata.description, /build Marfen.*new products of my own/i);
  assert.match(spanish.metadata.description, /Desarrollo Marfen.*nuevos productos propios/i);
  assert.match(english.hero.description, /creator of Marfen.*real users/i);
  assert.deepEqual(english.process.steps.map(({ number }) => number), ["01", "02", "03", "04"]);
  assert.deepEqual(spanish.process.steps.map(({ number }) => number), ["01", "02", "03", "04"]);
  assert.equal(english.experienceSummary.paragraphs.length, 3);
  assert.equal(spanish.experienceSummary.paragraphs.length, 3);
  assert.match(english.experienceSummary.paragraphs[0], /Marco Galván.*software developer/i);
  assert.match(spanish.experienceSummary.paragraphs[0], /Marco Galván.*desarrollador de software/i);
  assert.deepEqual(
    english.capabilities.items.map(({ title }) => title),
    ["Custom software", "Websites", "Automation and integrations"],
  );
  assert.deepEqual(
    spanish.capabilities.items.map(({ title }) => title),
    ["Software a medida", "Sitios web", "Automatizaciones e integraciones"],
  );
  assert.match(english.capabilities.items[0].description, /Applications, internal tools and integrations/i);
  assert.match(english.contact.text, /learn more about my products.*software project/i);
  assert.match(spanish.contact.text, /saber más sobre mis productos.*proyecto de software/i);
});

test("Selected work cards retain semantic static fallbacks", async () => {
  const [productCard, featured] = await Promise.all([
    readSource("src/components/product-card/product-card.astro"),
    readSource("src/components/featured/featured.astro"),
  ]);

  assert.match(productCard, /<article/);
  assert.doesNotMatch(productCard, /role=["']link["']/);
  assert.equal((productCard.match(/<a\b/g) ?? []).length, 1);
  assert.match(productCard, /target=["']_blank["']/);
  assert.match(productCard, /rel=["']noopener noreferrer["']/);
  const [linkedBranch, staticBranch] = productCard.split(") : (");
  assert.match(linkedBranch, /<a[\s\S]*dictionary\.linkLabel[\s\S]*<\/a>/);
  assert.doesNotMatch(staticBranch, /<a\b|dictionary\.linkLabel/);
  assert.match(featured, /contextLabel/);
  assert.match(featured, /statusLabel/);
  assert.match(featured, /import\s+MarfenCase\s+from\s+["'][^"']*marfen-case[^"']*["']/);
  assert.match(featured, /<MarfenCase\b/);
});

test("Home pages consume localized metadata and preserve page-family alternates", async () => {
  const [englishRoute, spanishRoute, layout, cvLayout] = await Promise.all([
    readSource("src/pages/index.astro"),
    readSource("src/pages/es/index.astro"),
    readSource("src/layouts/Layout.astro"),
    readSource("src/layouts/CVLayout.astro"),
  ]);

  assert.match(englishRoute, /metadata:\s*dictionary\.metadata/);
  assert.match(spanishRoute, /metadata:\s*dictionary\.metadata/);
  assert.match(layout, /og:locale:alternate/);
  assert.match(layout, /alternate\.lang !== lang/);
  assert.match(cvLayout, /metadata\.alternates/);
  assert.match(cvLayout, /metadata\.canonical/);
});

test("Home analytics uses one shared event listener and named events", async () => {
  const sources = await Promise.all([
    readSource("src/layouts/Layout.astro"),
    readSource("src/components/navbar/navbar.astro"),
    readSource("src/components/contact-cta/contact-cta.astro"),
    readSource("src/components/footer/footer.astro"),
    readSource("src/components/experience-summary/experience-summary.astro"),
    readSource("src/components/hero/hero.astro"),
    readSource("src/components/capabilities/capabilities.astro"),
    readSource("src/components/marfen-case/marfen-case.astro"),
    readSource("src/components/professional-case/professional-case.astro"),
  ]);
  const [layout, ...components] = sources;
  const source = components.join("\n");
  const analytics = await readSource("src/components/analytics/analytics-events.astro");

  assert.match(layout, /AnalyticsEvents/);
  assert.match(analytics, /track/);
  assert.equal((analytics.match(/document\.addEventListener/g) ?? []).length, 1);
  const clickEventSource = `${source}\n${analytics}`;
  for (const eventName of [
    "services_cta_clicked",
    "case_clicked",
    "marfen_clicked",
    "contact_cta_clicked",
    "whatsapp_clicked",
    "form_started",
    "form_submitted",
    "language_changed",
  ]) {
    assert.match(clickEventSource, new RegExp(eventName));
  }
  assert.doesNotMatch(analytics, /preventDefault/);
  assert.doesNotMatch(analytics, /stopPropagation/);
  assert.match(analytics, /addEventListener\(\s*["']focusin["']/);
  assert.match(analytics, /addEventListener\(\s*["']submit["']/);
  assert.match(analytics, /formStarted/);
  assert.match(analytics, /formSubmitted/);
  assert.match(analytics, /\.catch\(/);
  assert.doesNotMatch(source, /signup_completed/);
});
