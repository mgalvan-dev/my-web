import assert from "node:assert/strict";
import test from "node:test";

import {
  contactInputSchema,
  projectTypeInput,
  addProjectTypeValidation,
  buildContactEmail,
  buildProjectTypeEmailRow,
} from "../src/actions/contact-project-type.mjs";

const validate = (locale, projectType) =>
  addProjectTypeValidation(projectTypeInput).safeParse({ locale, projectType });

const supportedTypes = ["custom-software", "website", "automation-ai", "unsure"];

test("project type accepts omitted and empty selections", () => {
  assert.equal(validate("en").success, true);
  assert.equal(validate("es", undefined).success, true);
  assert.equal(validate("en", "").success, true);
});

test("project type accepts every supported value", () => {
  for (const value of supportedTypes) {
    assert.equal(validate("en", value).success, true, `${value} should be accepted`);
  }
});

test("unsupported project type returns localized field feedback", () => {
  for (const [locale, expected] of [["en", "Select a valid option."], ["es", "Seleccioná una opción válida."]]) {
    const result = validate(locale, "unsupported");
    assert.equal(result.success, false);
    assert.deepEqual(result.error.issues[0].path, ["projectType"]);
    assert.equal(result.error.issues[0].message, expected);
  }
});

test("email row serializes the selected localized label", () => {
  assert.deepEqual(buildProjectTypeEmailRow("website", "en"), ["Project type", "Website or landing page"]);
  assert.deepEqual(buildProjectTypeEmailRow("website", "es"), ["Tipo de proyecto", "Sitio web o landing page"]);
});

test("email row omits an absent project type", () => {
  assert.equal(buildProjectTypeEmailRow(undefined, "en"), undefined);
});

const validContact = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "I need a website for my project.",
  locale: "en",
};

test("contact schema requires a trimmed name, valid email, and non-empty message", () => {
  assert.equal(contactInputSchema.safeParse(validContact).success, true);
  assert.equal(contactInputSchema.safeParse({ ...validContact, name: "  Ada  " }).data.name, "Ada");
  assert.equal(contactInputSchema.safeParse({ ...validContact, message: "  hello  " }).data.message, "hello");

  for (const [field, value] of [["name", "   "], ["email", "not-an-email"], ["message", "   "]]) {
    const result = contactInputSchema.safeParse({ ...validContact, [field]: value });
    assert.equal(result.success, false, `${field} should be rejected`);
    assert.deepEqual(result.error.issues[0].path, [field]);
  }
  for (const field of ["name", "email", "message"]) {
    const { [field]: _omitted, ...input } = validContact;
    assert.equal(contactInputSchema.safeParse(input).success, false, `${field} should be required`);
  }
  assert.equal(contactInputSchema.safeParse({ ...validContact, email: `${"x".repeat(250)}@a.com` }).success, false);
});

test("contact schema keeps the project type optional and rejects old or unsupported fields", () => {
  assert.equal(contactInputSchema.safeParse(validContact).success, true);
  assert.equal(contactInputSchema.safeParse({ ...validContact, projectType: "website" }).success, true);

  const unsupported = contactInputSchema.safeParse({ ...validContact, locale: "es", projectType: "unsupported" });
  assert.equal(unsupported.success, false);
  assert.deepEqual(unsupported.error.issues[0].path, ["projectType"]);
  assert.equal(unsupported.error.issues[0].message, "Seleccioná una opción válida.");

  const oldFields = contactInputSchema.safeParse({
    ...validContact,
    company: "Acme",
    contact: "ada@example.com",
    process: "diagnosis",
    currentSolution: "diagnosis",
    tools: "tools",
    context: "context",
  });
  assert.equal(oldFields.success, false);
});

test("contact email serializes localized inquiry fields as escaped HTML and plain text", () => {
  const english = buildContactEmail({
    ...validContact,
    name: "Ada <Lovelace>",
    email: "ada&co@example.com",
    message: "<script>alert('x')</script>\nBuild an app & site",
    projectType: "website",
  });
  assert.equal(english.subject, "New inquiry: Website or landing page");
  assert.match(english.html, /<strong>Name<\/strong><br>Ada &lt;Lovelace&gt;/);
  assert.match(english.html, /<strong>Email<\/strong><br>ada&amp;co@example\.com/);
  assert.match(english.html, /<strong>Project type<\/strong><br>Website or landing page/);
  assert.match(english.html, /&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/);
  assert.doesNotMatch(english.html, /<script>/);
  assert.match(english.text, /Name: Ada <Lovelace>/);
  assert.match(english.text, /Email: ada&co@example\.com/);
  assert.match(english.text, /Project type: Website or landing page/);
  assert.match(english.text, /Message: <script>alert\('x'\)<\/script>/);

  const spanish = buildContactEmail({
    ...validContact,
    locale: "es",
    projectType: "automation-ai",
    message: "Necesito automatizar una tarea.",
  });
  assert.equal(spanish.subject, "Nueva consulta: Automatización o agente de IA");
  assert.match(spanish.html, /<strong>Nombre<\/strong>/);
  assert.match(spanish.html, /<strong>Email<\/strong>/);
  assert.match(spanish.html, /<strong>Tipo de proyecto<\/strong><br>Automatización o agente de IA/);
  assert.match(spanish.html, /<strong>Mensaje<\/strong>/);
  assert.match(spanish.text, /Mensaje: Necesito automatizar una tarea\./);
});

test("contact email omits the optional project type row", () => {
  const email = buildContactEmail(validContact);
  assert.doesNotMatch(email.html, /Project type/);
  assert.doesNotMatch(email.text, /Project type/);
});
