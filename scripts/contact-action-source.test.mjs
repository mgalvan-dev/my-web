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

const formControl = (source, name) => {
  const match = source.match(new RegExp(`<(?:input|textarea|select)\\b[^>]*\\bname=["']${name}["'][^>]*>`, "i"));
  assert.ok(match, `${name} must have a form control`);
  return match[0];
};

const labelFor = (source, name) => {
  const match = source.match(new RegExp(`<label\\b[^>]*\\bfor=["']${name}["'][^>]*>[^<]+</label>`, "i"));
  assert.ok(match, `${name} must have a visible label`);
  return match[0];
};

test("contact Action uses the shared strict schema and localized email serializer at the Resend boundary", async () => {
  const source = await readSource("src/actions/index.ts");
  const projectTypeSource = await readSource("src/actions/contact-project-type.mjs");

  assert.match(source, /import\s+\{\s*ActionError\s*,\s*defineAction\s*\}\s+from\s+["']astro:actions["']/);
  assert.match(source, /import\s+\{\s*Resend\s*\}\s+from\s+["']resend["']/);
  assert.match(source, /export\s+const\s+server\s*=\s*\{/);
  assert.match(source, /contact\s*:\s*defineAction\s*\(/);
  assert.match(source, /accept\s*:\s*["']form["']/);
  assert.match(projectTypeSource, /\.strict\(\)/);
  assert.match(source, /import\s+\{\s*buildContactEmail\s*,\s*contactInputSchema\s*\}\s+from\s+["']\.\/contact-project-type\.mjs["']/);
  assert.match(source, /input\s*:\s*contactInputSchema/);
  assert.match(source, /buildContactEmail\s*\(\s*input\s*\)/);
  assert.match(projectTypeSource, /email:\s*z\.string\(\)\.trim\(\)\.max\(254\)\.pipe\(z\.email\(\)\)/);
  assert.match(projectTypeSource, /message:\s*z\.string\(\)\.trim\(\)\.min\(1\)/);
  assert.match(projectTypeSource, /name:\s*z\.string\(\)\.trim\(\)\.min\(1\)/);
  for (const value of ["custom-software", "website", "automation-ai", "unsure"]) {
    assert.match(projectTypeSource, new RegExp(`\\b${value}\\b`));
  }
  assert.match(projectTypeSource, /input\.locale\s*===\s*["']es["']/);
  assert.match(projectTypeSource, /projectTypeError/);

  assert.match(source, /import\s+\{[^}]*isHoneypotSubmission[^}]*\}\s+from\s+["']\.\/contact-project-type\.mjs["']/);
  assert.match(projectTypeSource, /export\s+function\s+isHoneypotSubmission\s*\(/);
  const honeypotGuard = source.indexOf("if (isHoneypotSubmission(input))");
  const resendConfig = source.indexOf("import.meta.env.RESEND_API_KEY");
  const resendClient = source.indexOf("new Resend(");
  assert.ok(honeypotGuard >= 0 && honeypotGuard < resendConfig && honeypotGuard < resendClient, "honeypot must short-circuit before Resend configuration and construction");
  assert.match(source.slice(honeypotGuard, resendConfig), /return\s+\{\s*ok:\s*true\s*\}/);
  assert.doesNotMatch(source, /code\s*:\s*["']BAD_REQUEST["']/);
  assert.match(source, /code\s*:\s*["']INTERNAL_SERVER_ERROR["']/);
  assert.match(source, /import\.meta\.env\.RESEND_API_KEY/);
  assert.match(source, /import\.meta\.env\.RESEND_FROM_EMAIL/);
  assert.match(source, /new\s+Resend\s*\(/);
  assert.match(source, /resend\.emails\.send\s*\(/);
  assert.match(source, /from(?:\s*:\s*from)?\s*[,}]/);
  assert.match(source, /to\s*:\s*\[\s*CONTACT_EMAIL_ADDRESS\s*\]/);
  assert.doesNotMatch(source, /\breplyTo\b/);
  assert.doesNotMatch(source, /https?:\/\/.*resend\.com|\bfetch\s*\(/i);

  assert.match(projectTypeSource, /function\s+escapeHtml\s*\(/);
  assert.match(projectTypeSource, /buildContactEmail/);
  assert.match(projectTypeSource, /escapeHtml\s*\(/);
  for (const field of ["name", "email", "message"]) {
    assert.match(projectTypeSource, new RegExp(`input\\.${field}`), `${field} must be represented in email output`);
  }
  assert.match(projectTypeSource, /projectTypeRow/);
  assert.match(projectTypeSource, /html\s*:/);
  assert.match(projectTypeSource, /text\s*:/);
  assert.match(projectTypeSource, /subject\s*:/);
});

test("ContactCta keeps the form static and exposes only the approved controls", async () => {
  const source = await readSource("src/components/contact-cta/contact-cta.astro");
  const ctaGroup = /<div class=\{styles\.button_group\}>([\s\S]*?)<\/div>/.exec(source)?.[1] ?? "";
  assert.equal((ctaGroup.match(/<a\b/g) ?? []).length, 2, "the contact CTA group must contain exactly two visible links");
  assert.match(ctaGroup, /href=\{CONTACT_EMAIL\}/);
  assert.match(ctaGroup, /href=\{whatsappHref\}/);
  assert.doesNotMatch(ctaGroup, /#contact-form/);
  assert.match(source, /<form\b[^>]*\bid=["']contact-form["'][^>]*\bdata-analytics-form=["']contact["']/);
  assert.doesNotMatch(source, /\baction\s*=|\bmethod\s*=|CONTACT_FORM_ACTION|\/api\/contact/);

  for (const field of ["name", "email", "message", "projectType"]) {
    const control = formControl(source, field);
    const controlId = field;
    const label = labelFor(source, controlId);
    assert.match(control, new RegExp(`\\bid=["']${controlId}["']`));
    assert.match(label, new RegExp(`\\bfor=["']${controlId}["']`));
    assert.match(source, new RegExp(`data-field-error=["']${field}["']`));
  }

  for (const field of ["name", "email", "message"]) {
    assert.match(formControl(source, field), /\brequired\b/);
  }
  assert.doesNotMatch(formControl(source, "projectType"), /\brequired\b/);
  assert.match(formControl(source, "projectType"), /\bid=["']projectType["']/);
  assert.match(source, /data-field-error=["']projectType["']/);

  const [es, en] = await Promise.all([
    readSource("src/dictionaries/es.json"),
    readSource("src/dictionaries/en.json"),
  ]).then(([esSource, enSource]) => [JSON.parse(esSource), JSON.parse(enSource)]);
  assert.deepEqual(es.contact.form.projectTypeOptions.map(({ value }) => value), [
    "custom-software", "website", "automation-ai", "unsure",
  ]);
  assert.deepEqual(en.contact.form.projectTypeOptions.map(({ value }) => value), [
    "custom-software", "website", "automation-ai", "unsure",
  ]);
  assert.deepEqual(es.contact.form.projectTypeOptions.map(({ label }) => label), [
    "Software o aplicación a medida", "Sitio web o landing page", "Automatización o agente de IA", "No estoy seguro",
  ]);
  assert.deepEqual(en.contact.form.projectTypeOptions.map(({ label }) => label), [
    "Custom software or application", "Website or landing page", "Automation or AI agent", "I’m not sure yet",
  ]);

  assert.match(formControl(source, "name"), /\btype=["']text["']/);
  assert.match(formControl(source, "email"), /\btype=["']email["']/);
  assert.match(formControl(source, "message"), /<textarea\b/);
  assert.match(formControl(source, "name"), /\bmaxlength=["']120["']/);
  assert.match(formControl(source, "email"), /\bmaxlength=["']254["']/);
  assert.match(formControl(source, "message"), /\bmaxlength=["']4000["']/);
  assert.match(formControl(source, "name"), /\bautocomplete=["']name["']/);

  for (const removedField of ["company", "contact", "process", "currentSolution", "tools", "context"]) {
    assert.doesNotMatch(source, new RegExp(`name=["']${removedField}["']|data-field-error=["']${removedField}["']`));
  }
  assert.match(source, /href=\{CONTACT_EMAIL\}/);
  assert.match(source, /getWhatsAppUrl\(dictionary\.whatsappMessage\)/);

  const honeypot = formControl(source, "website");
  assert.match(honeypot, /\btabindex=["']-1["']/);
  assert.match(honeypot, /\bautocomplete=["']off["']/);
  assert.match(honeypot, /\baria-hidden=["']true["']/);
  assert.doesNotMatch(source, /<label[^>]*for=["']website["']/i);
  assert.doesNotMatch(source, /name=["'](?:budget|employees|deadline|requirements|brief)["']/);

  assert.match(source, /data-form-idle/);
  assert.match(source, /data-form-sending/);
  assert.match(source, /data-form-success/);
  assert.match(source, /data-form-error/);
  assert.match(source, /data-form-success[^>]*aria-live=["']polite["']/);
  assert.match(source, /data-form-error[^>]*aria-live=["']assertive["']/);

  assert.equal(es.contact.title, "¿Tenés un proyecto en mente?");
  assert.equal(es.contact.text, "Ya sea una aplicación, un sitio web o una automatización, contame qué necesitás y vemos cómo puedo ayudarte.");
  assert.equal(es.contact.emailLabel, "Enviar un email");
  assert.equal(en.contact.title, "Have a project in mind?");
  assert.equal(en.contact.text, "Whether you need an app, a website, or an AI automation, tell me what you need and we'll see how I can help.");
  assert.equal(en.contact.emailLabel, "Send an email");
  assert.equal(es.contact.form.messageLabel, "Contame brevemente qué necesitás");
  assert.equal(en.contact.form.messageLabel, "Briefly tell me what you need");
  assert.equal(es.contact.whatsappMessage, "Hola Marco, tengo un proyecto en mente y me gustaría contarte qué necesito.");
  assert.equal(en.contact.whatsappMessage, "Hi Marco, I have a project in mind and would like to tell you what I need.");
});

test("ContactCta submits through the Astro Action with inline accessible states", async () => {
  const source = await readSource("src/components/contact-cta/contact-cta.astro");

  assert.match(source, /import\s+\{\s*actions\s*,\s*isInputError\s*\}\s+from\s+["']astro:actions["']/);
  assert.match(source, /addEventListener\s*\(\s*["']submit["']/);
  assert.match(source, /checkValidity\s*\(\)/);
  assert.match(source, /event\.preventDefault\s*\(\)/);
  assert.match(source, /new\s+FormData\s*\(\s*form\s*\)/);
  assert.match(source, /actions\.contact\s*\(\s*formData\s*\)/);
  assert.match(source, /isInputError\s*\(\s*error\s*\)/);
  assert.match(source, /submit\.disabled\s*=\s*true/);
  assert.match(source, /submit\.disabled\s*=\s*false/);
  assert.match(source, /setState\(\s*["']sending["']\s*\)/);
  assert.match(source, /setState\(\s*["']success["']\s*\)/);
  assert.match(source, /setState\(\s*["']error["']\s*\)/);
  assert.match(source, /clearActionErrors\s*\(\s*form\s*\)/);
  assert.match(source, /showActionFieldErrors\s*\(\s*form\s*,\s*error\.fields\s*\)/);
  assert.match(source, /showGeneralError\s*\(\s*form\s*\)/);
  assert.match(source, /showSuccess\s*\(\s*form\s*\)/);
  assert.match(source, /form\.reset\s*\(\)/);
  assert.match(source, /textContent\s*=/);
  assert.match(source, /setAttribute\s*\(\s*["']aria-invalid["']/);
  assert.match(source, /removeAttribute\s*\(\s*["']aria-invalid["']/);
  assert.match(source, /focus\s*\(\)/);
  assert.doesNotMatch(source, /window\.location|location\.href|navigate\(|thanks|gracias\s+page/i);
  assert.doesNotMatch(source, /\btrack\s*\(/);

  const handlerStart = source.indexOf('addEventListener("submit"');
  assert.ok(handlerStart >= 0, "submit handler must be present");
  const handler = source.slice(handlerStart);
  assert.ok(handler.indexOf("checkValidity") < handler.indexOf("preventDefault"));
  assert.ok(handler.indexOf("preventDefault") < handler.indexOf("new FormData"));
  assert.ok(handler.indexOf("actions.contact") < handler.indexOf("form.reset"));
});

test("ContactCta submits the optional project type and supports localized select errors", async () => {
  const source = await readSource("src/components/contact-cta/contact-cta.astro");
  assert.match(source, /fieldNames\s*=\s*\[[^\]]*["']projectType["']/);
  assert.match(source, /<select\b[^>]*\bname=["']projectType["']/);
  assert.match(source, /locale["']\s+value=/);
  assert.match(source, /HTMLSelectElement/);
});

test("ContactCta falls back to the general status for unrecognized Action fields", async () => {
  const source = await readSource("src/components/contact-cta/contact-cta.astro");
  const helperStart = source.indexOf("const showActionFieldErrors");
  const helperEnd = source.indexOf("const showGeneralError");
  assert.ok(helperStart >= 0 && helperEnd > helperStart, "field error helper must be present");
  const helper = source.slice(helperStart, helperEnd);

  assert.match(helper, /hasRecognizedField/);
  assert.match(helper, /if\s*\(\s*!hasRecognizedField\s*\)[\s\S]*generalError\.hidden\s*=\s*false[\s\S]*generalError\.focus\(\s*\)[\s\S]*return/);
});

test("Astro keeps static pages while exposing only the adapter runtime boundary", async () => {
  const [config, packageJson] = await Promise.all([
    readSource("astro.config.mjs"),
    readFile(file("package.json"), "utf8"),
  ]);
  const manifest = JSON.parse(packageJson);

  assert.match(config, /output\s*:\s*["']static["']/);
  assert.match(config, /import\s+vercel\s+from\s+["']@astrojs\/vercel["']/);
  assert.match(config, /adapter\s*:\s*vercel\(\)/);
  assert.doesNotMatch(config, /output\s*:\s*["']server["']|server:\s*defer|ServerIsland|server:defer/);
  assert.equal(manifest.dependencies.astro.startsWith("^7."), true);
  assert.ok(manifest.dependencies["@astrojs/vercel"]);
  assert.ok(manifest.dependencies.resend);
  assert.equal(manifest.dependencies.zod, undefined);
  for (const forbidden of ["react", "react-dom", "preact", "@astrojs/react", "@astrojs/preact", "@resend/react-email", "react-email"]) {
    assert.equal(manifest.dependencies[forbidden], undefined, `${forbidden} must not be added`);
  }
});

test("contact secrets stay server-only and no manual contact endpoint exists", async () => {
  const action = await readSource("src/actions/index.ts");
  assert.match(action, /import\.meta\.env\.RESEND_API_KEY/);
  assert.match(action, /import\.meta\.env\.RESEND_FROM_EMAIL/);
  assert.doesNotMatch(action, /PUBLIC_RESEND|PUBLIC_CONTACT/);

  for (const sourcePath of [
    "src/components/contact-cta/contact-cta.astro",
    "src/layouts/Layout.astro",
    "src/pages/index.astro",
    "src/pages/es/index.astro",
  ]) {
    const source = await readSource(sourcePath);
    assert.doesNotMatch(source, /RESEND_API_KEY|RESEND_FROM_EMAIL/);
    assert.doesNotMatch(source, /\/api\/contact/);
  }
});
