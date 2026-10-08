import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const readJson = async (path) =>
  JSON.parse(await readFile(new URL(path, root), "utf8"));

test("Home dictionaries present the same three services and factual timeline in both locales", async () => {
  const [english, spanish] = await Promise.all([
    readJson("src/dictionaries/en.json"),
    readJson("src/dictionaries/es.json"),
  ]);

  assert.deepEqual(
    english.capabilities.items.map(({ title }) => title),
    ["Custom software", "Websites", "Automation & AI"],
  );
  assert.deepEqual(
    spanish.capabilities.items.map(({ title }) => title),
    ["Software a medida", "Sitios web", "Automatización e IA"],
  );

  assert.equal(english.hero.title, "Software and digital solutions for your business.");
  assert.equal(english.hero.description, "I build custom apps, websites, and AI-powered automations to help businesses simplify processes, improve operations, and create new digital products.");
  assert.equal(spanish.hero.title, "Software y soluciones digitales para tu negocio.");
  assert.equal(spanish.hero.description, "Desarrollo aplicaciones a medida, sitios web y automatizaciones con IA para ayudar a empresas a simplificar procesos, mejorar sus operaciones y crear nuevos productos digitales.");

  assert.match(english.capabilities.items[0].description, /apps, MVPs, internal systems, SaaS, integrations, and software evolution/i);
  assert.match(english.capabilities.items[1].description, /landing pages, corporate websites, and web experiences/i);
  assert.match(english.capabilities.items[2].description, /automations, integrations, assistants, and agents/i);
  assert.match(spanish.capabilities.items[0].description, /aplicaciones, MVPs, sistemas internos, SaaS, integraciones y evolución de software/i);
  assert.match(spanish.capabilities.items[1].description, /landing pages, sitios corporativos y experiencias web/i);
  assert.match(spanish.capabilities.items[2].description, /automatizaciones, integraciones, asistentes y agentes/i);

  assert.match(english.experienceSummary.paragraphs.join(" "), /since 2021/);
  assert.match(spanish.experienceSummary.paragraphs.join(" "), /desde 2021/);
});
