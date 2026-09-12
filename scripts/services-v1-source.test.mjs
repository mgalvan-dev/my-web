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
const delimitedEnd = (source, start, open, close) => {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === open) depth += 1;
    if (source[index] === close) depth -= 1;
    if (depth === 0) return index;
  }
  assert.fail(`Expected a closed ${open}${close} block`);
};
const callArgumentsAt = (source, openParen) => source.slice(openParen + 1, delimitedEnd(source, openParen, "(", ")"));
const blockBody = (source, bodyStart) => {
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(bodyStart + 1, index);
  }
  assert.fail("Expected a closed block");
};
const contactAction = (source) => {
  const server = /export\s+const\s+server\s*=\s*\{/.exec(source);
  assert.ok(server, "Actions must use export const server");
  const serverStart = server.index + server[0].lastIndexOf("{");
  const serverBody = source.slice(serverStart + 1, delimitedEnd(source, serverStart, "{", "}"));
  const contact = /\bcontact\s*:\s*defineAction\s*\(/.exec(serverBody);
  assert.ok(contact, "server.contact must define the contact Action");
  const openParen = serverBody.indexOf("(", contact.index);
  return callArgumentsAt(serverBody, openParen);
};
const actionHandler = (definition) => {
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
  assert.deepEqual(
    english.selectedWork.items.map(({ name }) => name),
    ["Marfen", "Insurance operations ecosystem", "Helmcode Cloud Products"],
  );
  assert.deepEqual(
    spanish.selectedWork.items.map(({ name }) => name),
    ["Marfen", "Ecosistema digital para operaciones de seguros", "Helmcode Cloud Products"],
  );
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
  const structuralSources = await Promise.all(
    homeComponents
      .slice(5)
      .filter((path) =>
        !["src/components/footer/footer.astro", "src/components/marfen-case/marfen-case.astro"].includes(path),
      )
      .map(readSource),
  );
  for (const source of structuralSources) assert.match(source, /<section\b/);
  const featured = await readSource("src/components/featured/featured.astro");
  assert.match(featured, /import\s+MarfenCase\s+from\s+["'][^"']*marfen-case[^"']*["']/);
  assert.match(featured, /<MarfenCase\b/);
});

test("Services V1 professional case is anonymized and uses the non-numeric result fallback", async () => {
  const [english, spanish] = await Promise.all([readJson("src/dictionaries/en.json"), readJson("src/dictionaries/es.json")]);
  assert.equal(spanish.professionalCase.result, "Un proceso que requería varios días pasó a completarse en cuestión de horas.");
  assert.equal(english.professionalCase.result, "A process that took several days was completed in a matter of hours.");
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
  for (const professionalCase of [english.professionalCase, spanish.professionalCase]) {
    const serialized = JSON.stringify(professionalCase);
    assert.doesNotMatch(serialized, /\d|client(?:e|Name)?|company|empresa|private|email|phone|telefono|teléfono/i);
    assert.notEqual(professionalCase.decision, professionalCase.solution);
  }
});

test("Services V1 professional case exposes four localized narrative siblings", async () => {
  const source = await readSource("src/components/professional-case/professional-case.astro");
  assert.match(source, /locale:\s*["']en["']\s*\|\s*["']es["']/);
  assert.doesNotMatch(source, /dictionary\.eyebrow\s*===/);
  assert.match(source, /const narrativeBlocks\s*=\s*\[/);
  assert.match(source, /dictionary\.decision/);
  const narrativeStart = source.indexOf("const narrativeBlocks = [");
  const narrativeEnd = source.indexOf("];", narrativeStart);
  assert.ok(narrativeStart >= 0 && narrativeEnd > narrativeStart, "narrativeBlocks must be a closed ordered list");
  const narrative = source.slice(narrativeStart, narrativeEnd);
  const order = ["dictionary.problem", "dictionary.decision", "dictionary.solution", "dictionary.result"];
  let previousIndex = -1;
  for (const value of order) {
    const currentIndex = narrative.indexOf(value);
    assert.ok(currentIndex > previousIndex, `${value} must preserve Problem → Decision and redesign → Solution → Result order`);
    previousIndex = currentIndex;
  }
  assert.match(source, /narrativeBlocks\.map/);
  assert.doesNotMatch(source, /styles\.solution/);
});

test("Services V1 Marfen proof list does not hard-code an English visible label", async () => {
  const source = await readSource("src/components/marfen-case/marfen-case.astro");
  assert.doesNotMatch(source, />\s*Proof\s*<\/p>/);
  assert.doesNotMatch(source, /proof_label/);
  assert.match(source, /<ul\b[\s\S]*content\.proof\.map/);
});

test("Services V1 analytics maps conversion events to owning components", async () => {
  const [navbar, hero, capabilities, featured, marfen, professional, contact, footer, experience] = await Promise.all([
    readSource("src/components/navbar/navbar.astro"),
    readSource("src/components/hero/hero.astro"),
    readSource("src/components/capabilities/capabilities.astro"),
    readSource("src/components/featured/featured.astro"),
    readSource("src/components/marfen-case/marfen-case.astro"),
    readSource("src/components/professional-case/professional-case.astro"),
    readSource("src/components/contact-cta/contact-cta.astro"),
    readSource("src/components/footer/footer.astro"),
    readSource("src/components/experience-summary/experience-summary.astro"),
  ]);

  const eventCount = (source, eventName) =>
    (source.match(new RegExp(`data-analytics-event\\s*=\\s*["']${eventName}["']`, "g")) ?? []).length;

  assert.equal(eventCount(navbar, "contact_cta_clicked"), 1, "header CTA must emit contact_cta_clicked");
  assert.equal(eventCount(hero, "contact_cta_clicked"), 1, "hero CTA must emit contact_cta_clicked");
  assert.equal(eventCount(contact, "contact_cta_clicked"), 1, "final CTA must emit contact_cta_clicked");
  assert.equal(eventCount(capabilities, "services_cta_clicked"), 1, "the mapped service CTA template must emit services_cta_clicked");
  assert.match(capabilities, /dictionary\.items\.map[\s\S]*data-analytics-event=["']services_cta_clicked["']/);
  assert.equal(eventCount(professional, "case_clicked"), 1, "ProfessionalCase must emit case_clicked");
  assert.equal(eventCount(featured, "case_clicked"), 0, "Featured must not own case_clicked");
  assert.equal(eventCount(marfen, "marfen_clicked"), 1, "Marfen must emit marfen_clicked");
  assert.equal(eventCount(contact, "whatsapp_clicked"), 1, "ContactCta/final CTA must emit whatsapp_clicked");
  assert.match(contact, /data-analytics-form=["']contact["']/);

  assert.match(navbar, /data-analytics-event=["']language_changed["']/);
  for (const [eventName, source] of [["email_clicked", footer], ["linkedin_clicked", footer], ["github_clicked", footer], ["x_clicked", footer], ["linkedin_clicked", experience]]) {
    assert.match(source, new RegExp(`data-analytics-event=["']${eventName}["']`));
  }
  const analytics = await readSource("src/components/analytics/analytics-events.astro");
  assert.equal((analytics.match(/document\.addEventListener/g) ?? []).length, 1);
  assert.match(analytics, /document\.addEventListener\(\s*["']click["']/);
  assert.match(analytics, /closest(?:<HTMLElement>)?\(\s*["']\[data-analytics-event\]["']\s*,?\s*\)/);
  assert.match(analytics, /track\s*\(\s*eventName\s*\)/);
  assert.match(analytics, /\.catch\(/);
  assert.match(analytics, /addEventListener\(\s*["']focusin["']/);
  assert.match(analytics, /addEventListener\(\s*["']submit["']/);
  assert.match(analytics, /formStarted\s*=\s*false/);
  assert.match(analytics, /formSubmitted\s*=\s*false/);
  assert.match(analytics, /checkValidity\(\)/);
  assert.match(analytics, /website/);
  assert.doesNotMatch(analytics, /preventDefault/);
  assert.doesNotMatch(analytics, /stopPropagation/);
  assert.doesNotMatch(analytics, /data-analytics-location/);
  for (const argumentsSource of callArguments(analytics, "track")) {
    assert.equal(argumentsSource.trim(), "eventName", "Analytics must call track with the event name only");
  }
  const otherHomeSources = await readSources(homeSourcePaths.filter((path) => path !== "src/components/analytics/analytics-events.astro"));
  for (const [path, source] of otherHomeSources) assert.doesNotMatch(source, /document\.addEventListener\(\s*["']click["']/, path);
  for (const source of [navbar, footer, experience, analytics]) assert.doesNotMatch(source, /signup_completed/);

  const allHomeSource = (await readSources(homeSourcePaths)).map(([, source]) => source).join("\n");
  const approvedEvents = new Set([
    "services_cta_clicked",
    "case_clicked",
    "marfen_clicked",
    "contact_cta_clicked",
    "whatsapp_clicked",
    "language_changed",
    "email_clicked",
    "linkedin_clicked",
    "github_clicked",
    "x_clicked",
  ]);
  const eventNames = [...allHomeSource.matchAll(/data-analytics-event\s*=\s*["']([^"']+)["']/g)].map(([, name]) => name);
  assert.ok(eventNames.every((eventName) => approvedEvents.has(eventName)), "no event outside the approved taxonomy may be instrumented");
});

test("Services V1 contact form exposes only the approved fields and requiredness", async () => {
  const contact = await readSource("src/components/contact-cta/contact-cta.astro");
  const controls = contact.match(/<(?:input|textarea)\b[^>]*>/g) ?? [];
  const labels = contact.match(/<label\b[^>]*>/g) ?? [];
  const controlFor = (field) => {
    const matches = controls.filter((tag) => new RegExp(`\\bname\\s*=\\s*["']${field}["']`).test(tag));
    assert.equal(matches.length, 1, `${field} must have exactly one form control`);
    return matches[0];
  };
  const attribute = (tag, name) => new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`).exec(tag)?.[1];
  assert.match(contact, /<form\b/);
  for (const field of ["name", "company", "contact", "process", "currentSolution"]) assert.match(controlFor(field), /\brequired\b/);
  for (const field of ["tools", "context"]) assert.doesNotMatch(controlFor(field), /\brequired\b/);
  for (const field of ["budget", "employees", "deadline", "requirements", "brief"]) assert.doesNotMatch(contact, new RegExp(`name=["']${field}["']`));
  assert.doesNotMatch(contact, /action=\{actions\.contact\}|CONTACT_FORM_ACTION|\/api\/contact/);
  assert.match(contact, /import\s+\{\s*actions\s*,\s*isInputError\s*\}\s+from\s+["']astro:actions["']/);
  assert.match(contact, /new FormData\(form\)/);
  assert.match(contact, /actions\.contact\(formData\)/);
  assert.match(contact, /isInputError\(error\)/);
  for (const field of ["name", "company", "contact", "process", "currentSolution", "tools", "context"]) {
    const controlId = {
      contact: "contact-detail",
      process: "process-detail",
    }[field] ?? field;
    const matchingLabels = labels.filter((tag) => attribute(tag, "for") === controlId);
    assert.equal(matchingLabels.length, 1, `${field} must have one visible label`);
    assert.equal(attribute(controlFor(field), "id"), attribute(matchingLabels[0], "for"), `${field} label must target its control`);
  }
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
  const definition = contactAction(action);
  const handler = actionHandler(definition);
  assert.match(definition, /\baccept\s*:\s*["']form["']/);
  assert.match(definition, /\binput\s*:/);
  assert.match(definition, /\bhandler\s*:/);
  assert.match(action, /import \{ z \} from ["']astro\/zod["']/);
  assert.match(action, /import\s+\{\s*ActionError\s*,\s*defineAction\s*\}\s+from\s+["']astro:actions["']/);
  assert.match(action, /import \{ Resend \} from ["']resend["']/);
  assert.match(action, /RESEND_API_KEY/);
  assert.match(action, /RESEND_FROM_EMAIL/);
  assert.match(action, /CONTACT_EMAIL_ADDRESS/);
  const resendClient = /\b(?:const|let)\s+resend\s*=\s*new\s+Resend\s*\(\s*([\w.]+)\s*\)/.exec(handler);
  assert.ok(resendClient, "the Action handler must construct the Resend client");
  const apiKey = resendClient[1];
  assert.ok(
    apiKey === "RESEND_API_KEY" ||
      /(?:process\.env|import\.meta\.env)\.RESEND_API_KEY/.test(apiKey) ||
      new RegExp(`\\b(?:const|let)\\s+${apiKey}\\s*=\\s*(?:(?:process\\.env|import\\.meta\\.env)\\.)?RESEND_API_KEY\\b`).test(handler),
    "the handler's Resend client must use RESEND_API_KEY",
  );
  const [email] = callArguments(handler, "resend\\.emails\\.send");
  assert.ok(email, "the Action handler must send the email");
  assert.match(email, /\bfrom(?:\s*:\s*(?:from|RESEND_FROM_EMAIL))?\s*[,}]/);
  assert.match(email, /\bto\s*:\s*\[?\s*CONTACT_EMAIL_ADDRESS\b/);
  assert.match(email, /\.\.\.buildContactEmail\(input\)/);
  const html = functionBody(action, "buildContactEmail");
  assert.match(html, /escapeHtml\s*\(\s*value\s*\)/);
  for (const field of ["name", "company", "contact", "process", "currentSolution", "tools", "context"]) {
    assert.match(html, new RegExp(`\\b${field}\\b`), field);
  }
  assert.match(html, /\bhtml\s*:/);
  assert.match(html, /\btext\s*:/);
  assert.ok((handler.match(/throw\s+new\s+ActionError\s*\(/g) ?? []).length >= 2);
  assert.doesNotMatch(action, /https?:\/\/.*resend|api\/contact\.ts|PUBLIC_|fetch\(|axios|sendgrid|mailgun/i);
});

test("Services V1 uses the approved WhatsApp destination and prefilled message", async () => {
  const contact = await readSource("src/components/contact-cta/contact-cta.astro");
  const consts = await readSource("src/consts.ts");
  assert.match(consts, /WHATSAPP_PHONE_NUMBER\s*=\s*["']5493855205726["']/);
  assert.match(consts, /wa\.me\/\$\{WHATSAPP_PHONE_NUMBER\}/);
  assert.match(consts, /encodeURIComponent\(message\)/);
  assert.match(contact, /getWhatsAppUrl\(dictionary\.whatsappMessage\)/);
  assert.match(contact, /whatsapp_clicked/);
  const marfen = await readSource("src/components/marfen-case/marfen-case.astro");
  assert.match(marfen, /href=\{item\.url\}/);
  assert.match(marfen, /data-analytics-event=["']marfen_clicked["']/);
});

test("Services V1 preserves static Astro and page-family SEO contracts", async () => {
  const [config, vercelConfig, english, spanish, cvEnglish, cvSpanish, cvLayout] = await Promise.all([
    readSource("astro.config.mjs"), readJson("vercel.json"), readSource("src/pages/index.astro"), readSource("src/pages/es/index.astro"), readSource("src/pages/cv/en.astro"), readSource("src/pages/cv/es.astro"), readSource("src/layouts/CVLayout.astro"),
  ]);
  assert.match(config, /output:\s*["']static["']/);
  assert.match(config, /import\s+vercel\s+from\s+["']@astrojs\/vercel["']/);
  assert.match(config, /adapter:\s*vercel\(\)/);
  assert.deepEqual(vercelConfig.redirects, [
    { source: "/en", destination: "/", permanent: true },
    { source: "/en/", destination: "/", permanent: true },
  ]);
  assert.match(config, /redirects:\s*\{\s*["']\/en\/["']\s*:\s*["']\/["']\s*,?\s*\}/);
  assert.doesNotMatch(config, /["']\/en["']\s*:/);
  assert.doesNotMatch(config, /output:\s*["']server["']|server:\s*\{?\s*defer|ServerIsland|api\//);
  for (const [source, canonical] of [[english, "/"], [spanish, "/es/"]]) {
    assert.match(source, /metadata:\s*dictionary\.metadata/);
    assert.match(source, new RegExp(`canonicalPath:\\s*["']${canonical.replace("/", "\\/")}["']`));
    assert.match(source, /alternates/);
    for (const lang of ["en", "es", "x-default"]) assert.match(source, new RegExp(`lang:\\s*["']${lang}["']`));
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
