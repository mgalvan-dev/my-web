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
    const copy = JSON.stringify({
      metadata: dictionary.metadata,
      hero: dictionary.hero,
      capabilities: dictionary.capabilities,
    }).toLocaleLowerCase();
    assert.match(copy, /landing page|landing pages/);
    assert.match(copy, isSpanish ? /sitios web comerciales/ : /commercial website|commercial websites/);
    assert.match(copy, isSpanish ? /productos digitales/ : /digital product|digital products/);
    assert.equal(dictionary.capabilities.items.length, 3);
  }
  assert.match(english.hero.primaryCta, /tell me|describe/i);
  assert.match(spanish.hero.primaryCta, /contame|contar/i);
});

test("capability categories cover web presence, business software, and products", () => {
  const expectedIds = ["web-presence", "business-software", "digital-products"];
  assert.deepEqual(english.capabilities.items.map(({ id }) => id), expectedIds);
  assert.deepEqual(spanish.capabilities.items.map(({ id }) => id), expectedIds);
});

test("capability descriptions name the requested offerings in both locales", () => {
  const expectations = [
    {
      dictionary: english,
      offerings: [
        [/landing pages/i, /institutional and corporate websites/i, /commercial websites/i],
        [/back offices/i, /internal systems/i, /process automation/i, /integrations/i],
        [/web apps/i, /mobile apps/i, /\bSaaS\b/, /\bMVPs\b/],
      ],
    },
    {
      dictionary: spanish,
      offerings: [
        [/landing pages/i, /sitios institucionales.*corporativos/i, /comerciales/i],
        [/back offices/i, /sistemas internos/i, /automatización de procesos/i, /integraciones/i],
        [/aplicaciones web y móviles/i, /\bSaaS\b/, /\bMVPs\b/],
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
  assert.equal(spanish.footer.role, "Desarrollador de Software y Creador de Productos");
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
  assert.doesNotMatch(JSON.stringify([english, spanish]), /Dam Squad|Amparo Seguros/i);
});
