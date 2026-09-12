import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const file = (path) => new URL(path, root);
const readSource = async (path) => readFile(file(path), "utf8");
const readJson = async (path) => JSON.parse(await readFile(file(path), "utf8"));

test("Task 6 process renders four localized production steps", async () => {
  const [english, spanish, source, styles] = await Promise.all([
    readJson("src/dictionaries/en.json"),
    readJson("src/dictionaries/es.json"),
    readSource("src/components/process/process.astro"),
    readSource("src/components/process/process.module.css"),
  ]);

  assert.deepEqual(
    english.process.steps.map(({ title }) => title),
    ["Understand", "Define", "Build", "Put into production"],
  );
  assert.deepEqual(
    spanish.process.steps.map(({ title }) => title),
    ["Entender", "Definir", "Construir", "Poner en producción"],
  );
  assert.equal(english.process.steps.length, 4);
  assert.equal(spanish.process.steps.length, 4);
  assert.doesNotMatch(JSON.stringify(english.process), /Design|Evolve/i);
  assert.doesNotMatch(JSON.stringify(spanish.process), /Diseñ|Evoluc/i);
  assert.match(source, /id=["']process["']/);
  assert.match(source, /aria-labelledby=["']process-title["']/);
  assert.match(source, /<ol\b/);
  assert.match(source, /dictionary\.steps\.map/);
  assert.match(styles, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styles, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)/);
  assert.match(styles, /grid-template-columns:\s*1fr/);
});

test("Task 6 About renders three localized paragraphs without CV content", async () => {
  const [english, spanish, source] = await Promise.all([
    readJson("src/dictionaries/en.json"),
    readJson("src/dictionaries/es.json"),
    readSource("src/components/experience-summary/experience-summary.astro"),
  ]);

  assert.equal(english.experienceSummary.paragraphs.length, 3);
  assert.equal(spanish.experienceSummary.paragraphs.length, 3);
  assert.match(source, /id=["']about["']/);
  assert.match(source, /aria-labelledby=["']about-title["']/);
  assert.match(source, /dictionary\.paragraphs\.map/);
  assert.match(source, /<p[^>]*class=\{styles\.description\}/);
  assert.doesNotMatch(source, /dictionary\.text/);
  assert.match(source, /data-analytics-event=["']linkedin_clicked["']/);
  assert.match(source, /src=["']\/profile\.jpg["']/);
  assert.match(source, /alt=["']Marco Galván["']/);
  assert.doesNotMatch(source, /CV_PATHS|cvUrl|resumeLabel|cvData|experienceData/);
});

test("Task 6 Fit renders seven criteria and the localized note", async () => {
  const [english, spanish, source, styles] = await Promise.all([
    readJson("src/dictionaries/en.json"),
    readJson("src/dictionaries/es.json"),
    readSource("src/components/fit/fit.astro"),
    readSource("src/components/fit/fit.module.css"),
  ]);

  assert.equal(english.fit.items.length, 7);
  assert.equal(spanish.fit.items.length, 7);
  assert.equal(
    spanish.fit.note,
    "Si solamente buscás horas de programación al menor costo posible, probablemente no sea el mejor encaje.",
  );
  assert.equal(
    english.fit.note,
    "If you are only looking for programming hours at the lowest possible cost, I am probably not the best fit.",
  );
  assert.match(source, /Dictionary\["fit"\]/);
  assert.match(source, /id=["']fit["']/);
  assert.match(source, /aria-labelledby=["']fit-title["']/);
  assert.match(source, /<h2[^>]*id=["']fit-title["']/);
  assert.match(source, /<ul\b/);
  assert.match(source, /dictionary\.items\.map/);
  assert.match(source, /dictionary\.note/);
  assert.doesNotMatch(source, /data-analytics-event/);
  assert.match(styles, /@media/);
});
