import assert from "node:assert/strict";
import test from "node:test";

import { projectTypeInput, addProjectTypeValidation, buildProjectTypeEmailRow } from "../src/actions/contact-project-type.mjs";

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
