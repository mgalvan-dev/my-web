import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const file = (path) => new URL(path, root);

const readJson = async (path) =>
  JSON.parse(await readFile(file(path), "utf8"));

const readSource = async (path) => readFile(file(path), "utf8");

test("Home routes use the Services V1 section order", async () => {
  const routes = await Promise.all([
    readSource("src/pages/index.astro"),
    readSource("src/pages/es/index.astro"),
  ]);

  for (const route of routes) {
    assert.match(route, /<Layout\b/);
    for (const component of [
      "Header",
      "Hero",
      "ProblemSection",
      "Capabilities",
      "Featured",
      "ProfessionalCase",
      "Process",
      "ExperienceSummary",
      "Fit",
      "ContactCta",
      "Footer",
    ]) {
      assert.match(route, new RegExp(`<${component}\\b`));
    }

    const order = [
      "<Header",
      "<Hero",
      "<ProblemSection",
      "<Capabilities",
      "<Featured",
      "<ProfessionalCase",
      "<Process",
      "<ExperienceSummary",
      "<Fit",
      "<ContactCta",
      "<Footer",
    ].map((marker) => route.indexOf(marker));

    assert.ok(order.every((index) => index >= 0));
    assert.deepEqual([...order].sort((a, b) => a - b), order);
    assert.doesNotMatch(route, /<Journal\b|<Projects\b|<Experience\b|<StandaloneExperience\b/);
  }
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

  assert.match(english.hero.eyebrow, /custom software.*automations.*integrations/i);
  assert.equal(
    spanish.hero.eyebrow,
    "Software a medida · Automatizaciones · Integraciones",
  );
  assert.equal(english.footer.role, "Software Developer & Product Builder");
  assert.equal(spanish.footer.role, "Desarrollador de Software & Product Builder");
  assert.match(english.hero.title, /businesses.*processes.*automate.*systems/i);
  assert.equal(
    spanish.hero.title,
    "Construyo software para empresas que necesitan ordenar procesos, automatizar tareas y conectar sus sistemas.",
  );
  for (const key of [
    "navigation",
    "hero",
    "capabilities",
    "problem",
    "process",
    "selectedWork",
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
    ["Marfen", "Amparo Seguros", "Helmcode Cloud Products"],
  );
  assert.deepEqual(
    spanish.selectedWork.items.map(({ name }) => name),
    ["Marfen", "Amparo Seguros", "Helmcode Cloud Products"],
  );
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
  assert.equal(english.metadata.title, "Digital Products, Automations & Integrations | Marco Galván");
  assert.equal(spanish.metadata.title, "Productos digitales, automatizaciones e integraciones | Marco Galván");
  assert.equal(
    english.metadata.description,
    "Software Developer & Product Builder helping businesses turn operational problems into digital products, automations, integrations and internal systems built to evolve.",
  );
  assert.equal(
    spanish.metadata.description,
    "Desarrollador de Software & Product Builder que ayuda a empresas a convertir problemas operativos en productos digitales, automatizaciones, integraciones y sistemas pensados para evolucionar.",
  );
  assert.equal(
    english.metadata.ogImageAlt,
    "Marco Galván — Software Developer & Product Builder",
  );
  assert.equal(
    spanish.metadata.ogImageAlt,
    "Marco Galván — Desarrollador de Software & Product Builder",
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
  for (const anchor of ["#work", "#process", "#about", "#contact"]) {
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

test("Selected work exposes Marfen as a truthful live own product", async () => {
  const [english, spanish] = await Promise.all([
    readJson("src/dictionaries/en.json"),
    readJson("src/dictionaries/es.json"),
  ]);

  assert.equal(english.selectedWork.title, "Selected products & professional work");
  assert.equal(spanish.selectedWork.title, "Productos y experiencia seleccionada");
  assert.deepEqual(
    english.selectedWork.items.map(({ context, status, url, linkLabel }) => ({
      context,
      status,
      url,
      linkLabel,
    })),
    [
      {
        context: "own-product",
        status: "live",
        url: "https://marfen.com.ar",
        linkLabel: "Visit Marfen",
      },
      { context: "dam-squad", status: undefined, url: undefined, linkLabel: undefined },
      {
        context: "professional-experience",
        status: undefined,
        url: undefined,
        linkLabel: undefined,
      },
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
      {
        context: "own-product",
        status: "live",
        url: "https://marfen.com.ar",
        linkLabel: "Ver Marfen",
      },
      { context: "dam-squad", status: undefined, url: undefined, linkLabel: undefined },
      {
        context: "professional-experience",
        status: undefined,
        url: undefined,
        linkLabel: undefined,
      },
    ],
  );
  assert.deepEqual(Object.keys(english.selectedWork.labels.contexts).sort(), [
    "dam-squad",
    "own-product",
    "professional-experience",
  ]);
  assert.equal(english.selectedWork.labels.statuses.live, "Live");
  assert.equal(spanish.selectedWork.labels.statuses.live, "En producción");

  const [englishMarfen, spanishMarfen] = [
    english.selectedWork.items[0],
    spanish.selectedWork.items[0],
  ];
  assert.equal(englishMarfen.name, "Marfen");
  assert.equal(spanishMarfen.name, "Marfen");
  assert.equal(
    englishMarfen.description,
    "Marfen is a management system for kiosks, convenience stores and small retailers. I designed and built it from scratch to centralize sales, inventory, cash management, purchases, suppliers, store credit and profitability. It is currently live and being used in a real retail operation while I continue iterating from direct user feedback.",
  );
  assert.equal(
    spanishMarfen.description,
    "Marfen es un sistema de gestión para kioscos, despensas y pequeños comercios. Lo diseñé y construí desde cero para centralizar ventas, stock, caja, compras, proveedores, fiados y rentabilidad. Actualmente está en producción y se utiliza en una operación comercial real, mientras sigo iterándolo a partir del feedback directo de usuarios.",
  );
  assert.equal(
    englishMarfen.role,
    "Product strategy, product discovery, product design, architecture, full-stack development, and ongoing product evolution.",
  );
  assert.equal(
    spanishMarfen.role,
    "Estrategia y descubrimiento de producto, diseño de producto, arquitectura, desarrollo full-stack y evolución continua del producto.",
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

  assert.equal(
    english.metadata.title,
    "Digital Products, Automations & Integrations | Marco Galván",
  );
  assert.equal(
    spanish.metadata.title,
    "Productos digitales, automatizaciones e integraciones | Marco Galván",
  );
  assert.match(english.metadata.description, /operational problems into digital products/);
  assert.match(spanish.metadata.description, /problemas operativos en productos digitales/);
  assert.match(english.hero.description, /custom software|automations|integrations/i);
  assert.deepEqual(
    english.process.steps.map(({ description }) => description),
    [
      "I learn how the business works today, where the problem appears, and what outcome matters.",
      "I decide what is worth solving first and the smallest scope that can create value.",
      "I design a simple solution around the real workflow.",
      "I build and ship usable software, not just features on a checklist.",
      "I observe real usage, measure results, and improve where it makes sense.",
    ],
  );
  assert.deepEqual(
    spanish.process.steps.map(({ description }) => description),
    [
      "Entiendo cómo funciona hoy el negocio o proceso, dónde está el problema y qué resultado importa.",
      "Determino qué vale la pena resolver primero y cuál es el alcance mínimo que genera valor.",
      "Diseño una solución simple alrededor del flujo de trabajo real.",
      "Construyo y entrego software usable, no solo funcionalidades marcadas como terminadas.",
      "Observo el uso real, mido resultados y mejoro donde tiene sentido.",
    ],
  );
  assert.match(
    english.experienceSummary.text,
    /You work directly with me from understanding the problem to shipping and evolving the solution\./,
  );
  assert.match(
    spanish.experienceSummary.text,
    /Trabajás directamente conmigo desde entender el problema hasta lanzar y evolucionar la solución\./,
  );
  assert.match(english.capabilities.items[0].description, /test with real users and evolve/);
  assert.match(english.contact.text, /process|problem/i);
  assert.match(spanish.contact.text, /proceso|problema/i);
  assert.match(english.contact.contactLabel, /tell me|problem|improv/i);
  assert.match(spanish.contact.contactLabel, /contame|problema|mejorar/i);
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
