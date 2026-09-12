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

  for (const [field, limit] of Object.entries({
    name: 120,
    company: 120,
    contact: 240,
    process: 1600,
    currentSolution: 1600,
  })) {
    assert.match(
      source,
      new RegExp(`${field}\\s*:\\s*z\\.string\\(\\)\\.trim\\(\\)\\.min\\(1\\)\\.max\\(${limit}\\)`),
      `${field} must use the approved required limit`,
    );
  }
  for (const [field, limit] of Object.entries({ tools: 1200, context: 1600, website: 120 })) {
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
  for (const field of ["name", "company", "contact", "process", "currentSolution", "tools", "context"]) {
    assert.match(emailBody, new RegExp(`\\b${field}\\b`), `${field} must be represented in email output`);
  }
  assert.doesNotMatch(emailBody, /website/);
  assert.match(source, /\bhtml\s*:/);
  assert.match(source, /\btext\s*:/);
});

test("ContactCta keeps the form static and exposes only the approved controls", async () => {
  const source = await readSource("src/components/contact-cta/contact-cta.astro");
  assert.match(source, /<form\b[^>]*\bid=["']contact-form["'][^>]*\bdata-analytics-form=["']contact["']/);
  assert.doesNotMatch(source, /\baction\s*=|\bmethod\s*=|CONTACT_FORM_ACTION|\/api\/contact/);

  for (const field of ["name", "company", "contact", "process", "currentSolution", "tools", "context"]) {
    const control = formControl(source, field);
    const controlId = {
      contact: "contact-detail",
      process: "process-detail",
    }[field] ?? field;
    const label = labelFor(source, controlId);
    assert.match(control, new RegExp(`\\bid=["']${controlId}["']`));
    assert.match(label, new RegExp(`\\bfor=["']${controlId}["']`));
    assert.match(source, new RegExp(`data-field-error=["']${field}["']`));
  }

  for (const [field, controlId] of Object.entries({
    contact: "contact-detail",
    process: "process-detail",
  })) {
    const expectedAnchorCount = field === "contact" ? 1 : 0;
    assert.equal(
      (source.match(new RegExp(`\\bid=["']${field}["']`, "g")) ?? []).length,
      expectedAnchorCount,
    );
    assert.match(source, new RegExp(`\\bname=["']${field}["']`));
    assert.match(formControl(source, field), new RegExp(`\\bid=["']${controlId}["']`));
  }

  for (const field of ["name", "company", "contact", "process", "currentSolution"]) {
    assert.match(formControl(source, field), /\brequired\b/);
  }
  for (const field of ["tools", "context"]) {
    assert.doesNotMatch(formControl(source, field), /\brequired\b/);
  }

  assert.match(formControl(source, "name"), /\btype=["']text["']/);
  assert.match(formControl(source, "company"), /\btype=["']text["']/);
  assert.match(formControl(source, "contact"), /\btype=["']text["']/);
  assert.match(formControl(source, "name"), /\bmaxlength=["']120["']/);
  assert.match(formControl(source, "company"), /\bmaxlength=["']120["']/);
  assert.match(formControl(source, "contact"), /\bmaxlength=["']240["']/);
  assert.match(formControl(source, "process"), /\bmaxlength=["']1600["']/);
  assert.match(formControl(source, "currentSolution"), /\bmaxlength=["']1600["']/);
  assert.match(formControl(source, "tools"), /\bmaxlength=["']1200["']/);
  assert.match(formControl(source, "context"), /\bmaxlength=["']1600["']/);
  assert.match(formControl(source, "name"), /\bautocomplete=["']name["']/);
  assert.match(formControl(source, "company"), /\bautocomplete=["']organization["']/);
  assert.doesNotMatch(formControl(source, "contact"), /\bautocomplete=["']email["']/);

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
