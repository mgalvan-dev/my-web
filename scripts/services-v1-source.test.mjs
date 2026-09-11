import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const file = (path) => new URL(path, root);
const readSource = async (path) => {
  try {
    return await readFile(file(path), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
};
const readJson = async (path) => JSON.parse(await readFile(file(path), "utf8"));

const homeRoutes = ["src/pages/index.astro", "src/pages/es/index.astro"];
const homeComponents = [
  "src/pages/index.astro",
  "src/pages/es/index.astro",
  "src/components/header/header.astro",
  "src/components/navbar/navbar.astro",
  "src/components/hero/hero.astro",
  "src/components/capabilities/capabilities.astro",
  "src/components/featured/featured.astro",
  "src/components/process/process.astro",
  "src/components/experience-summary/experience-summary.astro",
  "src/components/contact-cta/contact-cta.astro",
  "src/components/footer/footer.astro",
  "src/components/problem/problem.astro",
  "src/components/marfen-case/marfen-case.astro",
  "src/components/professional-case/professional-case.astro",
  "src/components/fit/fit.astro",
];

test("Services V1 dictionaries contain exact Spanish commercial copy", async () => {
  const spanish = await readJson("src/dictionaries/es.json");
  const required = [
    ["hero.eyebrow", "Software a medida · Automatizaciones · Integraciones"],
    ["hero.title", "Construyo software para empresas que necesitan ordenar procesos, automatizar tareas y conectar sus sistemas."],
    ["problem.title", "Cuando la operación crece, las herramientas improvisadas empiezan a costar tiempo."],
    ["capabilities.title", "Qué puedo resolver"],
    ["marfenCase.eyebrow", "Producto propio · En producción"],
    ["marfenCase.title", "Convertir una operación comercial real en software"],
    ["professionalCase.eyebrow", "Automatización operativa"],
    ["professionalCase.title", "De un proceso de varios días a ejecutarlo en horas"],
    ["process.title", "Del problema a producción"],
    ["fit.title", "Probablemente pueda ayudarte si…"],
    ["contact.title", "¿Qué parte de tu operación te está haciendo perder tiempo?"],
    ["contact.formTitle", "Contame qué querés mejorar"],
    ["contact.whatsappLabel", "Escribirme por WhatsApp"],
  ];
  for (const [path, value] of required) {
    const actual = path.split(".").reduce((object, key) => object?.[key], spanish);
    assert.equal(actual, value, path);
  }
  assert.equal(spanish.capabilities.items.find((item) => item.id === "automation").cta, "Contame qué tarea se repite");
  assert.equal(spanish.capabilities.items.find((item) => item.id === "internal-systems").cta, "Contame qué necesitás organizar");
  assert.equal(spanish.capabilities.items.find((item) => item.id === "integrations").cta, "Mostrame qué sistemas necesitás conectar");
});

test("Services V1 dictionaries have bilingual matching shapes and semantic English entries", async () => {
  const [english, spanish] = await Promise.all([readJson("src/dictionaries/en.json"), readJson("src/dictionaries/es.json")]);
  assert.deepEqual(Object.keys(english), Object.keys(spanish));
  for (const key of ["navigation", "hero", "capabilities", "problem", "process", "selectedWork", "marfenCase", "professionalCase", "experienceSummary", "fit", "contact"]) {
    assert.deepEqual(Object.keys(english[key] ?? {}), Object.keys(spanish[key] ?? {}), key);
  }
  assert.match(english.hero.eyebrow, /custom software.*automations.*integrations/i);
  assert.match(english.hero.title, /businesses.*processes.*automate.*systems/i);
  assert.match(english.capabilities.title, /what I can solve/i);
  assert.match(english.marfenCase.eyebrow, /own product.*production/i);
  assert.match(english.professionalCase.title, /days.*hours/i);
  assert.match(english.process.title, /problem.*production/i);
  assert.match(english.fit.title, /probably.*help/i);
  assert.match(english.contact.formTitle, /tell me.*improve/i);
});

test("Services V1 Home routes expose the required anchors and semantic future components", async () => {
  const sharedSources = await Promise.all(homeComponents.slice(2).map(readSource));
  for (const routePath of homeRoutes) {
    const route = await readSource(routePath);
    for (const component of ["Header", "Hero", "ProblemSection", "Capabilities", "Featured", "MarfenCase", "ProfessionalCase", "Process", "ExperienceSummary", "Fit", "ContactCta", "Footer"]) assert.match(route, new RegExp(`<${component}\\b`));
    const source = [route, ...sharedSources].join("\n");
    for (const id of ["services", "work", "process", "about", "fit", "contact"]) assert.match(source, new RegExp(`id=["']${id}["']`));
    assert.doesNotMatch(route, /\/servicios\/|\/blog\/|\/sector\/|\/diagnostico\//);
    assert.doesNotMatch(route, /<Journal\b|<Projects\b|<Experience\b/);
  }
  const sources = await Promise.all(homeComponents.map(readSource));
  for (const source of sources) assert.doesNotMatch(source, /\/servicios\/|\/blog\/|\/sector\/|\/diagnostico\//);
  for (const routePath of homeRoutes) {
    const route = await readSource(routePath);
    assert.equal((route.match(/<h1\b/g) ?? []).length, 1);
  }
  const structuralSources = await Promise.all(homeComponents.slice(-4).map(readSource));
  for (const source of structuralSources) assert.match(source, /<section\b/);
});

test("Services V1 professional case is anonymized and uses the non-numeric result fallback", async () => {
  const spanish = await readJson("src/dictionaries/es.json");
  const professionalCase = spanish.professionalCase ?? {};
  const serialized = JSON.stringify(professionalCase);
  assert.match(serialized, /cuestión de horas|cuestion de horas/i);
  assert.doesNotMatch(serialized, /cinco|5|dos|2|seis|6|client(?:e|Name)?|company|empresa|private|identif|email|phone|telefono|teléfono/i);
});

test("Services V1 analytics maps seven conversion events and preserves delegated analytics", async () => {
  const sources = await Promise.all(homeComponents.map(readSource));
  const analytics = await readSource("src/components/analytics/analytics-events.astro");
  const combined = sources.join("\n");
  for (const eventName of ["services_cta_clicked", "case_clicked", "marfen_clicked", "contact_cta_clicked", "whatsapp_clicked", "form_started", "form_submitted"]) assert.match(combined, new RegExp(eventName));
  assert.match(combined, /language_changed/);
  assert.equal((analytics.match(/document\.addEventListener/g) ?? []).length, 1);
  assert.doesNotMatch(analytics, /preventDefault/);
  assert.doesNotMatch(combined, /signup_completed/);
});

test("Services V1 contact form exposes only the approved fields and requiredness", async () => {
  const contact = await readSource("src/components/contact-cta/contact-cta.astro");
  assert.match(contact, /<form\b/);
  for (const field of ["name", "company", "contact", "process", "currentSolution", "tools", "context"]) assert.match(contact, new RegExp(`name=["']${field}["']`));
  for (const field of ["name", "company", "contact", "process", "currentSolution"]) assert.match(contact, new RegExp(`name=["']${field}["'][^>]*\\brequired\\b`));
  for (const field of ["tools", "context"]) assert.doesNotMatch(contact, new RegExp(`name=["']${field}["'][^>]*\\brequired\\b`));
  for (const field of ["budget", "employees", "deadline", "requirements", "brief"]) assert.doesNotMatch(contact, new RegExp(`name=["']${field}["']`));
  assert.doesNotMatch(contact, /action=\{actions\.contact\}|CONTACT_FORM_ACTION|\/api\/contact/);
  assert.match(contact, /import \{ actions \} from ["']astro:actions["']/);
  assert.match(contact, /new FormData\(form\)/);
  assert.match(contact, /actions\.contact\(formData\)/);
  assert.match(contact, /isInputError\(error\)/);
  assert.match(contact, /event\.preventDefault\(\)/);
  assert.match(contact, /if \(form\.checkValidity\(\)/);
  for (const field of ["name", "company", "contact", "process", "currentSolution", "tools", "context"]) assert.match(contact, new RegExp(`<label[^>]*for=["']${field}["']`));
  assert.match(contact, /submit[\s\S]*form\.checkValidity\(\)[\s\S]*event\.preventDefault\(\)/);
  assert.doesNotMatch(contact, /window\.location|location\.href|navigate\(/);
});

test("Services V1 contact action uses the approved Astro Action and Resend contract", async () => {
  const action = await readSource("src/actions/index.ts");
  assert.match(action, /server\.contact\s*=\s*defineAction\(\{\s*accept:\s*["']form["']/s);
  assert.match(action, /input[\s,}]/);
  assert.match(action, /handler/);
  assert.match(action, /import \{ z \} from ["']astro\/zod["']/);
  assert.match(action, /import \{ ActionError \} from ["']astro:actions["']/);
  assert.match(action, /import \{ Resend \} from ["']resend["']/);
  assert.match(action, /RESEND_API_KEY/);
  assert.match(action, /RESEND_FROM_EMAIL/);
  assert.match(action, /CONTACT_EMAIL_ADDRESS/);
  assert.doesNotMatch(action, /https?:\/\/.*resend|api\/contact\.ts|PUBLIC_|fetch\(|axios|sendgrid|mailgun/i);
});

test("Services V1 uses the approved WhatsApp destination and prefilled message", async () => {
  const sources = await Promise.all(homeComponents.map(readSource));
  const source = sources.join("\n");
  const message = "Hola Marco, estoy buscando mejorar un proceso de mi empresa. Actualmente lo resolvemos de esta manera:";
  assert.match(source, /5493855205726/);
  assert.match(source, /wa\.me\/5493855205726/);
  assert.match(source, new RegExp(`encodeURIComponent\\(["']${message.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}["']\\)`));
  assert.match(source, /whatsapp_clicked/);
  assert.doesNotMatch(source, /wa\.me\/(?!5493855205726)/);
});

test("Services V1 preserves static Astro and page-family SEO contracts", async () => {
  const [config, english, spanish, cvEnglish, cvSpanish, cvLayout] = await Promise.all([
    readSource("astro.config.mjs"), readSource("src/pages/index.astro"), readSource("src/pages/es/index.astro"), readSource("src/pages/cv/en.astro"), readSource("src/pages/cv/es.astro"), readSource("src/layouts/CVLayout.astro"),
  ]);
  assert.match(config, /output:\s*["']static["']/);
  assert.match(config, /import\s+vercel\s+from\s+["']@astrojs\/vercel["']/);
  assert.match(config, /adapter:\s*vercel\(\)/);
  assert.doesNotMatch(config, /output:\s*["']server["']|server:\s*\{?\s*defer|ServerIsland|api\//);
  for (const [source, canonical] of [[english, "/"], [spanish, "/es/"]]) {
    assert.match(source, /metadata:\s*dictionary\.metadata/);
    assert.match(source, new RegExp(`canonicalPath:\s*["']${canonical.replace("/", "\\/")}["']`));
    assert.match(source, /alternates/);
    for (const lang of ["en", "es", "x-default"]) assert.match(source, new RegExp(`lang:\s*["']${lang}["']`));
    assert.match(source, canonical === "/" ? /\{ lang: "es", href: "\/es\/" \}/ : /\{ lang: "en", href: "\/" \}/);
  }
  const action = await readSource("src/actions/index.ts");
  const nonActionSources = await Promise.all([
    readSource("src/components/contact-cta/contact-cta.astro"),
    readSource("src/layouts/Layout.astro"),
    readSource("src/pages/index.astro"),
    readSource("src/pages/es/index.astro"),
  ]);
  for (const source of nonActionSources) assert.doesNotMatch(source, /RESEND_API_KEY|RESEND_FROM_EMAIL/);
  assert.match(action, /RESEND_API_KEY|RESEND_FROM_EMAIL/);
  assert.match(cvEnglish, /<CVLayout\b/); assert.match(cvSpanish, /<CVLayout\b/);
  assert.match(cvEnglish, /cvData/); assert.match(cvSpanish, /cvData/); assert.match(cvLayout, /metadata/);
});
