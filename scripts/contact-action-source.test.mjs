import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

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
  const match = source.match(new RegExp(`<(?:input|textarea)\\b[^>]*\\bname=["']${name}["'][^>]*>`, "i"));
  assert.ok(match, `${name} must have a form control`);
  return match[0];
};

const labelFor = (source, name) => {
  const match = source.match(new RegExp(`<label\\b[^>]*\\bfor=["']${name}["'][^>]*>[^<]+</label>`, "i"));
  assert.ok(match, `${name} must have a visible label`);
  return match[0];
};

test("contact Action has the strict Astro form, validation, and Resend boundary", async () => {
  const source = await readSource("src/actions/index.ts");

  assert.match(source, /import\s+\{\s*ActionError\s*,\s*defineAction\s*\}\s+from\s+["']astro:actions["']/);
  assert.match(source, /import\s+\{\s*z\s*\}\s+from\s+["']astro\/zod["']/);
  assert.match(source, /import\s+\{\s*Resend\s*\}\s+from\s+["']resend["']/);
  assert.match(source, /export\s+const\s+server\s*=\s*\{/);
  assert.match(source, /contact\s*:\s*defineAction\s*\(/);
  assert.match(source, /accept\s*:\s*["']form["']/);
  assert.match(source, /\.strict\(\)/);

  for (const [field, limit] of Object.entries({ name: 120, contact: 240, request: 1600 })) {
    assert.match(
      source,
      new RegExp(`${field}\\s*:\\s*z\\.string\\(\\)\\.trim\\(\\)\\.min\\(1\\)\\.max\\(${limit}\\)`),
      `${field} must use the approved required limit`,
    );
  }
  assert.match(source, /company\s*:\s*z\.string\(\)\.trim\(\)\.max\(120\)\.optional\(\)/);
  for (const [field, limit] of Object.entries({ website: 120 })) {
    assert.match(
      source,
      new RegExp(`${field}\\s*:\\s*z\\.string\\(\\)\\.trim\\(\\)[^,\\n}]*max\\(${limit}\\)[^,\\n}]*\\.optional\\(\\)`),
      `${field} must use the approved optional limit`,
    );
  }

  assert.match(source, /input\s*:\s*contactInput/);
  assert.match(source, /input\.website/);
  assert.match(source, /code\s*:\s*["']BAD_REQUEST["']/);
  assert.match(source, /code\s*:\s*["']INTERNAL_SERVER_ERROR["']/);
  assert.match(source, /import\.meta\.env\.RESEND_API_KEY/);
  assert.match(source, /import\.meta\.env\.RESEND_FROM_EMAIL/);
  assert.match(source, /new\s+Resend\s*\(/);
  assert.match(source, /resend\.emails\.send\s*\(/);
  assert.match(source, /from(?:\s*:\s*from)?\s*[,}]/);
  assert.match(source, /to\s*:\s*\[\s*CONTACT_EMAIL_ADDRESS\s*\]/);
  assert.doesNotMatch(source, /\breplyTo\b/);
  assert.doesNotMatch(source, /https?:\/\/.*resend\.com|\bfetch\s*\(/i);

  assert.match(source, /function\s+escapeHtml\s*\(/);
  assert.match(source, /replace\s*\(/);
  const emailBody = source.slice(source.indexOf("const rows"), source.indexOf("export const server"));
  assert.match(emailBody, /escapeHtml\s*\(\s*value\s*\)/);
  for (const field of ["name", "company", "contact", "request"]) {
    assert.match(emailBody, new RegExp(`\\b${field}\\b`), `${field} must be represented in email output`);
  }
  assert.doesNotMatch(source, /currentSolution|\btools\b|\bcontext\b|Process/);
  assert.doesNotMatch(emailBody, /website/);
  assert.match(source, /\bhtml\s*:/);
  assert.match(source, /\btext\s*:/);
});

test("ContactCta keeps the form static and exposes only the approved controls", async () => {
  const source = await readSource("src/components/contact-cta/contact-cta.astro");
  assert.match(source, /<form\b[^>]*\bid=["']contact-form["'][^>]*\bdata-analytics-form=["']contact["']/);
  assert.doesNotMatch(source, /\baction\s*=|\bmethod\s*=|CONTACT_FORM_ACTION|\/api\/contact/);

  for (const field of ["name", "company", "contact", "request"]) {
    const control = formControl(source, field);
    const controlId = {
      contact: "contact-detail",
      request: "request-detail",
    }[field] ?? field;
    const label = labelFor(source, controlId);
    assert.match(control, new RegExp(`\\bid=["']${controlId}["']`));
    assert.match(label, new RegExp(`\\bfor=["']${controlId}["']`));
    assert.match(source, new RegExp(`data-field-error=["']${field}["']`));
  }

  for (const [field, controlId] of Object.entries({
    contact: "contact-detail",
    request: "request-detail",
  })) {
    const expectedAnchorCount = field === "contact" ? 1 : 0;
    assert.equal(
      (source.match(new RegExp(`\\bid=["']${field}["']`, "g")) ?? []).length,
      expectedAnchorCount,
    );
    assert.match(source, new RegExp(`\\bname=["']${field}["']`));
    assert.match(formControl(source, field), new RegExp(`\\bid=["']${controlId}["']`));
  }

  for (const field of ["name", "contact", "request"]) {
    assert.match(formControl(source, field), /\brequired\b/);
  }
  assert.doesNotMatch(formControl(source, "company"), /\brequired\b/);

  assert.match(formControl(source, "name"), /\btype=["']text["']/);
  assert.match(formControl(source, "company"), /\btype=["']text["']/);
  assert.match(formControl(source, "contact"), /\btype=["']text["']/);
  assert.match(formControl(source, "name"), /\bmaxlength=["']120["']/);
  assert.match(formControl(source, "company"), /\bmaxlength=["']120["']/);
  assert.match(formControl(source, "contact"), /\bmaxlength=["']240["']/);
  assert.match(formControl(source, "request"), /\bmaxlength=["']1600["']/);
  assert.match(formControl(source, "request"), /^<textarea\b/);
  assert.match(formControl(source, "name"), /\bautocomplete=["']name["']/);
  assert.match(formControl(source, "company"), /\bautocomplete=["']organization["']/);
  assert.doesNotMatch(formControl(source, "contact"), /\bautocomplete=["']email["']/);

  const honeypot = formControl(source, "website");
  assert.match(honeypot, /\btabindex=["']-1["']/);
  assert.match(honeypot, /\bautocomplete=["']off["']/);
  assert.match(honeypot, /\baria-hidden=["']true["']/);
  assert.doesNotMatch(source, /<label[^>]*for=["']website["']/i);
  assert.doesNotMatch(source, /name=["'](?:budget|employees|deadline|requirements|brief|process|currentSolution|tools|context)["']/);
  assert.match(source, /dictionary\.form\.companyLabel/);

  assert.match(source, /data-form-idle/);
  assert.match(source, /data-form-sending/);
  assert.match(source, /data-form-success/);
  assert.match(source, /data-form-error/);
  assert.match(source, /data-form-success[^>]*aria-live=["']polite["']/);
  assert.match(source, /data-form-error[^>]*aria-live=["']assertive["']/);
  assert.match(source, /const fieldNames = \["name", "company", "contact", "request"\]/);
  assert.doesNotMatch(source, /currentSolution|process-detail|toolsLabel|contextLabel/);
});

test("contact form has complete localized copy and four visible fields", async () => {
  const [english, spanish] = await Promise.all([
    readFile(file("src/dictionaries/en.json"), "utf8").then(JSON.parse),
    readFile(file("src/dictionaries/es.json"), "utf8").then(JSON.parse),
  ]);
  assert.equal(spanish.contact.form.title, "Contame qué necesitás");
  assert.equal(spanish.contact.form.intro, "No necesitás tener una solución definida. Contame brevemente qué querés construir o mejorar.");
  assert.equal(spanish.contact.form.nameLabel, "Nombre");
  assert.equal(spanish.contact.form.companyLabel, "Empresa (opcional)");
  assert.equal(spanish.contact.form.contactLabel, "Email o WhatsApp");
  assert.equal(spanish.contact.form.requestLabel, "¿Qué necesitás?");
  assert.equal(spanish.contact.form.submitLabel, "Enviar consulta");
  assert.equal(english.contact.form.title, "Tell me what you need");
  assert.equal(english.contact.form.nameLabel, "Name");
  assert.equal(english.contact.form.companyLabel, "Company (optional)");
  assert.equal(english.contact.form.contactLabel, "Email or WhatsApp");
  assert.equal(english.contact.form.requestLabel, "What do you need?");
  assert.equal(english.contact.form.submitLabel, "Send inquiry");
  for (const dictionary of [english, spanish]) {
    for (const value of Object.values(dictionary.contact.form)) assert.ok(value.trim(), "all visible form copy must be non-empty");
    assert.match(dictionary.contact.form.successMessage, /.+/);
    assert.match(dictionary.contact.form.errorMessage, /.+/);
    assert.doesNotMatch(JSON.stringify(dictionary.contact.form), /current solution|tools|context|herramientas|contexto|implementado hoy/i);
  }
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

test("ContactCta falls back to the general status for unrecognized Action fields", async () => {
  const source = await readSource("src/components/contact-cta/contact-cta.astro");
  const helperStart = source.indexOf("const showActionFieldErrors");
  const helperEnd = source.indexOf("const showGeneralError");
  assert.ok(helperStart >= 0 && helperEnd > helperStart, "field error helper must be present");
  const helper = source.slice(helperStart, helperEnd);

  assert.match(helper, /hasRecognizedField/);
  assert.match(helper, /if\s*\(\s*!hasRecognizedField\s*\)[\s\S]*generalError\.hidden\s*=\s*false[\s\S]*generalError\.focus\(\s*\)[\s\S]*return/);
});

test("ContactCta localizes server field errors without losing accessible field focus", async () => {
  const source = await readSource("src/components/contact-cta/contact-cta.astro");
  const helper = source.slice(source.indexOf("const showActionFieldErrors"), source.indexOf("const showGeneralError"));
  const fieldNames = ["name", "company", "contact", "request"];

  class Control {
    attributes = {};
    focused = false;
    setAttribute(name, value) { this.attributes[name] = value; }
    focus() { this.focused = true; }
  }

  for (const [language, message] of [["es", "Revisá este campo."], ["en", "Please check this field."]]) {
    const controls = Object.fromEntries(fieldNames.map((name) => [name, new Control()]));
    const errors = Object.fromEntries(fieldNames.map((name) => [name, {
      id: `${name}-error`,
      dataset: { validationMessage: message },
      textContent: "",
    }]));
    const generalError = { hidden: false };
    let state;
    const currentForm = {
      elements: { namedItem: (name) => controls[name] },
      querySelector: (selector) => selector === "[data-form-error]"
        ? generalError
        : errors[selector.match(/data-field-error="([^"]+)"/)[1]],
    };
    const showErrors = new Function(
      "fieldNames", "setState", "HTMLInputElement", "HTMLTextAreaElement",
      `${ts.transpile(helper)}; return showActionFieldErrors;`,
    )(fieldNames, (value) => { state = value; }, Control, Control);

    showErrors(currentForm, {
      name: ["Too small: expected string to have >=1 characters"],
      company: ["Too big: expected string to have <=120 characters"],
      contact: ["Too small: expected string to have >=1 characters"],
      request: ["Too small: expected string to have >=1 characters"],
    });

    for (const name of fieldNames) {
      assert.equal(errors[name].textContent, message, `${language} ${name} must not expose Zod's English messages`);
      assert.equal(controls[name].attributes["aria-invalid"], "true");
      assert.equal(controls[name].attributes["aria-describedby"], `${name}-error`);
      assert.equal(controls[name].focused, name === "name");
    }
    assert.equal(state, "error");
    assert.equal(generalError.hidden, true);
    const dictionary = JSON.parse(await readSource(`src/dictionaries/${language}.json`));
    assert.equal(dictionary.contact.form.validationMessage, message);
  }

  assert.equal((source.match(/data-validation-message=\{dictionary\.form\.validationMessage\}/g) ?? []).length, 4);
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
