import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
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
const listFiles = async (directory) => {
  const entries = await readdir(file(directory), { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const relative = `${directory}/${entry.name}`;
    return entry.isDirectory() ? listFiles(relative) : [relative];
  }));
  return nested.flat();
};
const sourceFiles = async (directory) => (await listFiles(directory)).filter((path) => /\.(?:astro|[cm]?[jt]sx?)$/.test(path));
const readSources = async (paths) => Promise.all(paths.map(async (path) => [path, await readSource(path)]));
const callArguments = (source, name) => {
  const calls = [];
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "g");
  for (const match of source.matchAll(matcher)) {
    const start = source.indexOf("(", match.index);
    let depth = 0;
    for (let index = start; index < source.length; index += 1) {
      if (source[index] === "(") depth += 1;
      if (source[index] === ")") depth -= 1;
      if (depth === 0) {
        calls.push(source.slice(start + 1, index));
        break;
      }
    }
  }
  return calls;
};
const blockBody = (source, bodyStart) => {
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(bodyStart + 1, index);
  }
  assert.fail("Expected a closed block");
};
const actionHandler = (source) => {
  const definition = callArguments(source, "defineAction").find((candidate) => /\bhandler\s*:/.test(candidate));
  assert.ok(definition, "contact must define an Action handler");
  const handler = /\bhandler\s*:\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>\s*\{/.exec(definition);
  assert.ok(handler, "contact Action handler must be inline");
  return blockBody(definition, handler.index + handler[0].lastIndexOf("{"));
};
const functionBody = (source, name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const definition = new RegExp(`(?:function\\s+${escapedName}\\s*\\([^)]*\\)|(?:const|let)\\s+${escapedName}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>)\\s*\\{`).exec(source);
  assert.ok(definition, `${name} must be an HTML builder with a body`);
  return blockBody(source, definition.index + definition[0].lastIndexOf("{"));
};
const submitHandler = (source) => {
  const listener = /addEventListener\s*\(\s*["']submit["']\s*,/.exec(source);
  assert.ok(listener, "ContactCta must register a submit handler");
  const bodyStart = source.indexOf("{", listener.index);
  assert.ok(bodyStart >= 0, "ContactCta submit handler must have a body");

  return blockBody(source, bodyStart);
};

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
const homeSourcePaths = [
  ...homeComponents,
  "src/components/analytics/analytics-events.astro",
  "src/components/product-card/product-card.astro",
  "src/layouts/Layout.astro",
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
    assert.match(route, /<Layout\b/);
    for (const component of ["Header", "Hero", "ProblemSection", "Capabilities", "Featured", "ProfessionalCase", "Process", "ExperienceSummary", "Fit", "ContactCta", "Footer"]) assert.match(route, new RegExp(`<${component}\\b`));
    const source = [route, ...sharedSources].join("\n");
    for (const id of ["services", "work", "process", "about", "fit", "contact"]) assert.match(source, new RegExp(`id=["']${id}["']`));
    assert.doesNotMatch(route, /\/servicios\/|\/blog\/|\/sector\/|\/diagnostico\//);
    assert.doesNotMatch(route, /<Journal\b|<Projects\b|<Experience\b/);
  }
  const sources = await Promise.all(homeComponents.map(readSource));
  for (const source of sources) assert.doesNotMatch(source, /\/servicios\/|\/blog\/|\/sector\/|\/diagnostico\//);
  const heroPath = "src/components/hero/hero.astro";
  const hero = await readSource(heroPath);
  assert.equal((hero.match(/<h1\b/g) ?? []).length, 1);
  const nonHeroSources = await Promise.all(homeComponents.filter((path) => path !== heroPath).map(readSource));
  for (const source of nonHeroSources) assert.doesNotMatch(source, /<h1\b/);
  const structuralSources = await Promise.all(homeComponents.slice(5).map(readSource));
  for (const source of structuralSources) assert.match(source, /<section\b/);
  const featured = await readSource("src/components/featured/featured.astro");
  assert.match(featured, /import\s+MarfenCase\s+from\s+["'][^"']*marfen-case[^"']*["']/);
  assert.match(featured, /<MarfenCase\b/);
});

test("Services V1 professional case is anonymized and uses the non-numeric result fallback", async () => {
  const [english, spanish] = await Promise.all([readJson("src/dictionaries/en.json"), readJson("src/dictionaries/es.json")]);
  assert.equal(spanish.professionalCase.result, "Un proceso que requería varios días pasó a completarse en cuestión de horas.");
  assert.equal(english.professionalCase.result, "A process that took several days was completed in a matter of hours.");
  for (const professionalCase of [english.professionalCase, spanish.professionalCase]) {
    const serialized = JSON.stringify(professionalCase);
    assert.doesNotMatch(serialized, /\d|client(?:e|Name)?|company|empresa|private|identif|email|phone|telefono|teléfono/i);
  }
});

test("Services V1 analytics maps conversion events to owning components", async () => {
  const owners = new Map([
    ["services_cta_clicked", "src/components/capabilities/capabilities.astro"],
    ["case_clicked", "src/components/featured/featured.astro"],
    ["marfen_clicked", "src/components/marfen-case/marfen-case.astro"],
    ["contact_cta_clicked", "src/components/contact-cta/contact-cta.astro"],
    ["whatsapp_clicked", "src/components/contact-cta/contact-cta.astro"],
    ["form_started", "src/components/contact-cta/contact-cta.astro"],
    ["form_submitted", "src/components/contact-cta/contact-cta.astro"],
  ]);
  for (const [eventName, owner] of owners) {
    const source = await readSource(owner);
    assert.match(source, new RegExp(`data-analytics-event=["']${eventName}["']`), `${eventName} owner: ${owner}`);
  }
  const [navbar, footer, experience] = await Promise.all([
    readSource("src/components/navbar/navbar.astro"),
    readSource("src/components/footer/footer.astro"),
    readSource("src/components/experience-summary/experience-summary.astro"),
  ]);
  assert.match(navbar, /data-analytics-event=["']language_changed["']/);
  for (const [eventName, source] of [["email_clicked", footer], ["linkedin_clicked", footer], ["github_clicked", footer], ["x_clicked", footer], ["linkedin_clicked", experience]]) {
    assert.match(source, new RegExp(`data-analytics-event=["']${eventName}["']`));
  }
  const analytics = await readSource("src/components/analytics/analytics-events.astro");
  assert.equal((analytics.match(/document\.addEventListener/g) ?? []).length, 1);
  assert.match(analytics, /document\.addEventListener\(\s*["']click["']/);
  assert.match(analytics, /closest(?:<HTMLElement>)?\(\s*["']\[data-analytics-event\]["']\s*\)/);
  assert.match(analytics, /track\s*\(\s*eventName\s*\)/);
  assert.doesNotMatch(analytics, /preventDefault/);
  for (const argumentsSource of callArguments(analytics, "track")) {
    assert.doesNotMatch(argumentsSource, /\b(?:name|company|contact|process|currentSolution|tools|context)\b/i);
  }
  const otherHomeSources = await readSources(homeSourcePaths.filter((path) => path !== "src/components/analytics/analytics-events.astro"));
  for (const [path, source] of otherHomeSources) assert.doesNotMatch(source, /document\.addEventListener\(\s*["']click["']/, path);
  for (const source of [navbar, footer, experience, analytics]) assert.doesNotMatch(source, /signup_completed/);
});

test("Services V1 contact form exposes only the approved fields and requiredness", async () => {
  const contact = await readSource("src/components/contact-cta/contact-cta.astro");
  const controls = contact.match(/<(?:input|textarea)\b[^>]*>/g) ?? [];
  const controlFor = (field) => {
    const matches = controls.filter((tag) => new RegExp(`\\bname\\s*=\\s*["']${field}["']`).test(tag));
    assert.equal(matches.length, 1, `${field} must have exactly one form control`);
    return matches[0];
  };
  assert.match(contact, /<form\b/);
  for (const field of ["name", "company", "contact", "process", "currentSolution"]) assert.match(controlFor(field), /\brequired\b/);
  for (const field of ["tools", "context"]) assert.doesNotMatch(controlFor(field), /\brequired\b/);
  for (const field of ["budget", "employees", "deadline", "requirements", "brief"]) assert.doesNotMatch(contact, new RegExp(`name=["']${field}["']`));
  assert.doesNotMatch(contact, /action=\{actions\.contact\}|CONTACT_FORM_ACTION|\/api\/contact/);
  assert.match(contact, /import \{ actions \} from ["']astro:actions["']/);
  assert.match(contact, /new FormData\(form\)/);
  assert.match(contact, /actions\.contact\(formData\)/);
  assert.match(contact, /isInputError\(error\)/);
  for (const field of ["name", "company", "contact", "process", "currentSolution", "tools", "context"]) assert.match(contact, new RegExp(`<label[^>]*for=["']${field}["']`));
  const handler = submitHandler(contact);
  const validIndex = handler.indexOf("checkValidity");
  const preventDefaultIndex = handler.indexOf("preventDefault");
  const actionIndex = handler.indexOf("actions.contact");
  assert.ok(validIndex >= 0 && preventDefaultIndex > validIndex && actionIndex > preventDefaultIndex);
  assert.equal((contact.match(/preventDefault/g) ?? []).length, 1);
  assert.doesNotMatch(contact, /window\.location|location\.href|navigate\(/);
});

test("Services V1 contact action uses the approved Astro Action and Resend contract", async () => {
  const action = await readSource("src/actions/index.ts");
  const handler = actionHandler(action);
  assert.match(action, /export\s+const\s+server\s*=\s*\{[\s\S]*?\bcontact\s*:\s*defineAction\(\s*\{[\s\S]*?\baccept\s*:\s*["']form["'][\s\S]*?\binput\s*:[\s\S]*?\bhandler\s*:/);
  assert.match(action, /import \{ z \} from ["']astro\/zod["']/);
  assert.match(action, /import \{ ActionError \} from ["']astro:actions["']/);
  assert.match(action, /import \{ Resend \} from ["']resend["']/);
  assert.match(action, /RESEND_API_KEY/);
  assert.match(action, /RESEND_FROM_EMAIL/);
  assert.match(action, /CONTACT_EMAIL_ADDRESS/);
  const [email] = callArguments(handler, "resend\\.emails\\.send");
  assert.ok(email, "the Action handler must send the email");
  assert.match(email, /\bfrom\s*:/);
  assert.match(email, /\bto\s*:\s*\[?\s*CONTACT_EMAIL_ADDRESS\b/);
  const htmlBuilder = /\bhtml\s*:\s*(\w*(?:html|email)\w*)\s*\(/i.exec(email)?.[1];
  assert.ok(htmlBuilder, "the email payload must use an HTML builder");
  assert.match(email, /\btext\s*:\s*\w*(?:text|plain)\w*\s*\(/i);
  const html = functionBody(action, htmlBuilder);
  for (const field of ["name", "company", "contact", "process", "currentSolution", "tools", "context"]) {
    assert.match(html, new RegExp(`escapeHtml\\s*\\(\\s*(?:\\w+\\.)?${field}\\b`), field);
  }
  assert.ok((handler.match(/throw\s+new\s+ActionError\s*\(/g) ?? []).length >= 2);
  assert.doesNotMatch(action, /https?:\/\/.*resend|api\/contact\.ts|PUBLIC_|fetch\(|axios|sendgrid|mailgun/i);
});

test("Services V1 uses the approved WhatsApp destination and prefilled message", async () => {
  const contact = await readSource("src/components/contact-cta/contact-cta.astro");
  const source = contact;
  const message = "Hola Marco, estoy buscando mejorar un proceso de mi empresa. Actualmente lo resolvemos de esta manera:";
  assert.match(source, /5493855205726/);
  assert.match(source, /wa\.me\/5493855205726/);
  assert.match(source, new RegExp(`encodeURIComponent\\(["']${message.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}["']\\)`));
  assert.match(source, /whatsapp_clicked/);
  assert.doesNotMatch(source, /wa\.me\/(?!5493855205726)/);
  const marfen = await readSource("src/components/marfen-case/marfen-case.astro");
  assert.match(marfen, /https:\/\/marfen\.com\.ar/);
  assert.match(marfen, /data-analytics-event=["']marfen_clicked["']/);
});

test("Services V1 preserves static Astro and page-family SEO contracts", async () => {
  const [config, english, spanish, cvEnglish, cvSpanish, cvLayout] = await Promise.all([
    readSource("astro.config.mjs"), readSource("src/pages/index.astro"), readSource("src/pages/es/index.astro"), readSource("src/pages/cv/en.astro"), readSource("src/pages/cv/es.astro"), readSource("src/layouts/CVLayout.astro"),
  ]);
  assert.match(config, /output:\s*["']static["']/);
  assert.match(config, /import\s+vercel\s+from\s+["']@astrojs\/vercel["']/);
  assert.match(config, /adapter:\s*vercel\(\)/);
  assert.match(config, /redirects:\s*\{[\s\S]*["']\/en["']\s*:\s*["']\/["']/);
  assert.doesNotMatch(config, /output:\s*["']server["']|server:\s*\{?\s*defer|ServerIsland|api\//);
  for (const [source, canonical] of [[english, "/"], [spanish, "/es/"]]) {
    assert.match(source, /metadata:\s*dictionary\.metadata/);
    assert.match(source, new RegExp(`canonicalPath:\s*["']${canonical.replace("/", "\\/")}["']`));
    assert.match(source, /alternates/);
    for (const lang of ["en", "es", "x-default"]) assert.match(source, new RegExp(`lang:\s*["']${lang}["']`));
    assert.match(source, canonical === "/" ? /\{ lang: "es", href: "\/es\/" \}/ : /\{ lang: "en", href: "\/" \}/);
  }
  const layout = await readSource("src/layouts/Layout.astro");
  assert.match(english, /<Layout\b/);
  assert.match(spanish, /<Layout\b/);
  assert.match(layout, /AnalyticsEvents/);
  assert.match(cvEnglish, /<CVLayout\b/); assert.match(cvSpanish, /<CVLayout\b/);
  assert.match(cvEnglish, /cvData/); assert.match(cvSpanish, /cvData/); assert.match(cvLayout, /metadata/);
});

test("Services V1 rejects excluded route families and manual API routes", async () => {
  const pageFiles = await listFiles("src/pages");
  for (const pageFile of pageFiles) {
    assert.doesNotMatch(pageFile, /(?:^|[\/_.-])(?:servicios?|services?|blogs?|sectors?|diagn[oó]sticos?|diagnostics?)(?=$|[\/_.-])/i);
    assert.doesNotMatch(pageFile, /(?:^|\/)api(?:\/|$)/i);
  }
  for (const [path, source] of await readSources(pageFiles)) assert.doesNotMatch(source, /\/?api\/contact\b/i, path);
});

test("Services V1 keeps Resend transport, credentials, and static rendering scoped", async () => {
  const sources = await readSources(await sourceFiles("src"));
  for (const [path, source] of sources) {
    if (path !== "src/actions/index.ts") {
      assert.doesNotMatch(source, /https?:\/\/(?:api\.)?resend\.com|\bfetch\s*\(/i, path);
      assert.doesNotMatch(source, /RESEND_API_KEY|RESEND_FROM_EMAIL/, path);
    }
    assert.doesNotMatch(source, /\bServerIsland\b|server\s*:\s*defer/i, path);
  }
});
