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
    ["Custom software", "Websites", "Automation and integrations"],
  );
  assert.deepEqual(
    spanish.capabilities.items.map(({ title }) => title),
    ["Software a medida", "Sitios web", "Automatizaciones e integraciones"],
  );

  assert.equal(english.hero.title, "I'm Marco. I build software and digital products.");
  assert.match(english.hero.description, /creator of Marfen.*real users.*developing new products/i);
  assert.equal(spanish.hero.title, "Soy Marco. Construyo software y productos digitales.");
  assert.match(spanish.hero.description, /creador de Marfen.*usuarios reales.*desarrollo nuevos productos/i);

  assert.match(english.capabilities.items[0].description, /Applications, internal tools and integrations/i);
  assert.match(english.capabilities.items[1].description, /Landing pages and websites/i);
  assert.match(english.capabilities.items[2].description, /Connecting tools and automating tasks/i);
  assert.match(spanish.capabilities.items[0].description, /aplicaciones, herramientas internas e integraciones/i);
  assert.match(spanish.capabilities.items[1].description, /Landing pages y sitios/i);
  assert.match(spanish.capabilities.items[2].description, /Conexión de herramientas y automatización de tareas/i);

  assert.match(english.experienceSummary.paragraphs.join(" "), /portfolio of SaaS products/i);
  assert.match(spanish.experienceSummary.paragraphs.join(" "), /portfolio de productos SaaS/i);
});
