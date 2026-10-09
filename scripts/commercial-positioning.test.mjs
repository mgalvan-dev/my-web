import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (path) =>
  JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [english, spanish] = await Promise.all([
  readJson("src/dictionaries/en.json"),
  readJson("src/dictionaries/es.json"),
]);

test("home positioning is bilingual and spans websites through digital products", () => {
  for (const [dictionary, isSpanish] of [[english, false], [spanish, true]]) {
    const copy = JSON.stringify({ hero: dictionary.hero, capabilities: dictionary.capabilities }).toLocaleLowerCase();
    assert.match(copy, isSpanish ? /software a medida/ : /custom software/);
    assert.match(copy, isSpanish ? /sitios web/ : /websites/);
    assert.match(copy, isSpanish ? /automatizaci[oó]n e ia/ : /automation & ai/);
    assert.equal(dictionary.capabilities.items.length, 3);
  }
  assert.match(english.hero.primaryCta, /tell me|describe/i);
  assert.match(spanish.hero.primaryCta, /contame|contar/i);
});

test("capability categories cover web presence, business software, and products", () => {
  const expectedIds = ["custom-software", "website", "automation-ai"];
  assert.deepEqual(english.capabilities.items.map(({ id }) => id), expectedIds);
  assert.deepEqual(spanish.capabilities.items.map(({ id }) => id), expectedIds);
});

test("capability descriptions name the requested offerings in both locales", () => {
  const expectations = [
    {
      dictionary: english,
      offerings: [
        [/apps/i, /MVPs/i, /internal systems/i, /SaaS/i, /integrations/i],
        [/landing pages/i, /corporate websites/i, /web experiences/i],
        [/automations/i, /integrations/i, /assistants/i, /agents/i],
      ],
    },
    {
      dictionary: spanish,
      offerings: [
        [/aplicaciones/i, /MVPs/i, /sistemas internos/i, /SaaS/i, /integraciones/i],
        [/landing pages/i, /sitios corporativos/i, /experiencias web/i],
        [/automatizaciones/i, /integraciones/i, /asistentes/i, /agentes/i],
      ],
    },
  ];

  for (const { dictionary, offerings } of expectations) {
    dictionary.capabilities.items.forEach(({ description }, categoryIndex) => {
      for (const offering of offerings[categoryIndex]) {
        assert.match(description, offering, `${dictionary.metadata.title}: ${offering}`);
      }
    });
  }
});

test("Marfen is described as commerce management and point of sale without unsupported claims", () => {
  for (const dictionary of [english, spanish]) {
    const marfen = JSON.stringify({
      item: dictionary.selectedWork.items[0],
      case: dictionary.marfenCase,
    }).toLocaleLowerCase();
    assert.match(marfen, /point.of.sale|punto de venta/);
    assert.match(marfen, /commerce management|gesti[oó]n comercial/);
    assert.match(marfen, /sales|ventas/);
    assert.match(marfen, /inventory|stock/);
    assert.doesNotMatch(marfen, /arca|e.invoicing|facturaci[oó]n electr[oó]nica|customers|clientes/);
    assert.doesNotMatch(marfen, /validation.only|early experiment|solo validaci[oó]n|experimento temprano/);
    assert.doesNotMatch(marfen, /kiosks?|convenience stores?|small retailers?|kioscos?|despensas?|pequeños comercios?/i);
    assert.equal(dictionary.selectedWork.items[0].url, "https://marfen.com.ar");
    assert.equal(dictionary.selectedWork.items[0].status, "live");
    assert.match(dictionary.marfenCase.eyebrow, /own product.*in production|producto propio.*en producción/i);
    assert.match(JSON.stringify(dictionary.marfenCase.proof), /real users|usuarios reales/i);
  }
  assert.equal(spanish.marfenCase.body[0], "Marfen es un sistema de gestión y punto de venta para comercios.");
  assert.ok(spanish.selectedWork.items[0].description.startsWith("Marfen es un sistema de gestión y punto de venta para comercios."));
  assert.match(english.marfenCase.body[0], /commerce management and point.of.sale system for businesses/i);
  assert.equal(english.selectedWork.items[0].linkLabel, "Visit Marfen");
  assert.equal(spanish.selectedWork.items[0].linkLabel, "Ver Marfen");
});

test("Spanish footer role is localized without changing its English equivalent", () => {
  assert.equal(spanish.footer.role, "Desarrollador de Software & Product Builder");
  assert.equal(english.footer.role, "Software Developer & Product Builder");
});

test("direct WhatsApp contact and the anonymized case stay within existing scope", async () => {
  const [consts, contact] = await Promise.all([
    readSource("src/consts.ts"),
    readSource("src/components/contact-cta/contact-cta.astro"),
  ]);
  assert.match(consts, /WHATSAPP_PHONE_NUMBER\s*=\s*["']5493855205726["']/);
  assert.match(contact, /getWhatsAppUrl\(dictionary\.whatsappMessage\)/);
  assert.match(english.contact.whatsappLabel, /WhatsApp/i);
  assert.match(spanish.contact.whatsappLabel, /WhatsApp/i);
  assert.match(english.professionalCase.title, /days.*hours/i);
  assert.match(spanish.professionalCase.title, /d[ií]as.*horas/i);
  assert.doesNotMatch(JSON.stringify([english, spanish]), /Amparo Seguros/i);
});
