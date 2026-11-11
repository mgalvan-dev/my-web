import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("bilingual Home presents products, about, professional experience, services, then contact", async () => {
  const [enPage, esPage, en, es, professional] = await Promise.all([
    read("src/pages/index.astro"),
    read("src/pages/es/index.astro"),
    json("src/dictionaries/en.json"),
    json("src/dictionaries/es.json"),
    read("src/components/professional-work/professional-work.astro"),
  ]);
  for (const page of [enPage, esPage]) {
    const order = ["<Hero", "<Featured", "<ExperienceSummary", "<ProfessionalWork", "<ProblemSection", "<Capabilities", "<Process", "<Fit", "<ContactCta"].map((marker) => page.indexOf(marker));
    assert.ok(order.every((index) => index >= 0));
    assert.deepEqual([...order].sort((a, b) => a - b), order);
    assert.doesNotMatch(page, /<ProfessionalCase\b/);
  }
  for (const dictionary of [en, es]) {
    assert.equal(dictionary.selectedWork.items[0].name, "Marfen");
    const practice = dictionary.selectedWork.items[1];
    assert.equal(practice.status, "in-development");
    assert.equal(practice.url, undefined);
    assert.deepEqual(dictionary.professionalWork.items.map(({ name }) => name), dictionary === en ? ["Insurance operations ecosystem", "Helmcode Cloud Products"] : ["Ecosistema digital para operaciones de seguros", "Helmcode Cloud Products"]);
  }
  assert.match(professional, /ProductCard/);
});

test("Hero routes products and contact links without mislabeling the product event", async () => {
  const hero = await read("src/components/hero/hero.astro");
  assert.match(hero, /href="#work"/);
  assert.match(hero, /href="#contact"\s+data-analytics-event="contact_cta_clicked"/);
  assert.equal((hero.match(/data-analytics-event="contact_cta_clicked"/g) ?? []).length, 1);
});

test("contact form renders route locale and an optional, localized empty selection", async () => {
  const [component, enPage, esPage] = await Promise.all([
    read("src/components/contact-cta/contact-cta.astro"),
    read("src/pages/index.astro"),
    read("src/pages/es/index.astro"),
  ]);
  assert.match(enPage, /<ContactCta dictionary=\{dictionary\.contact\} lang=\{config\.lang\}/);
  assert.match(esPage, /<ContactCta dictionary=\{dictionary\.contact\} lang=\{config\.lang\}/);
  assert.match(component, /name="locale" value=\{lang\}/);
  assert.match(component, /value=""\s*>\{lang === "es" \? "Sin especificar" : "Not specified"\}/);
  assert.doesNotMatch(component, /id="projectType"[^>]*required/);
});

test("motion stays CSS-only, visible by default, and respects reduced motion", async () => {
  const [hero, cards, heroButtons, contactButtons, nav, marfen, sources] = await Promise.all([
    read("src/components/hero/hero.module.css"),
    read("src/components/product-card/product-card.module.css"),
    read("src/components/hero/hero.module.css"),
    read("src/components/contact-cta/contact-cta.module.css"),
    read("src/components/navbar/navbar.module.css"),
    read("src/components/marfen-case/marfen-case.module.css"),
    Promise.all([read("src/pages/index.astro"), read("src/pages/es/index.astro"), read("src/components/hero/hero.astro")]),
  ]);
  assert.match(hero, /animation:\s*hero-enter 320ms/);
  assert.match(hero, /translateY\(6px\)/);
  for (const css of [cards, heroButtons, contactButtons]) {
    assert.match(css, /translateY\(-2px\)/);
    assert.match(css, /prefers-reduced-motion:\s*no-preference/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
  }
  assert.match(nav, /transition:\s*color 160ms/);
  assert.match(marfen, /transition:\s*border-color 160ms/);
  assert.doesNotMatch(sources.join("\n"), /IntersectionObserver|requestAnimationFrame|scroll\s*listener/i);
});
