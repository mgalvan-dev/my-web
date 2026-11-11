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
    assert.match(copy, isSpanish ? /automatizaciones e integraciones/ : /automation and integrations/);
    assert.equal(dictionary.capabilities.items.length, 3);
  }
  assert.match(english.hero.primaryCta, /products/i);
  assert.match(spanish.hero.primaryCta, /productos/i);
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
        [/Applications/i, /internal tools/i, /integrations/i],
        [/Landing pages/i, /websites/i, /present a product/i],
        [/Connecting tools/i, /automating tasks/i, /AI/i],
      ],
    },
    {
      dictionary: spanish,
      offerings: [
        [/aplicaciones/i, /herramientas internas/i, /integraciones/i],
        [/landing pages/i, /sitios/i, /dar a conocer un producto/i],
        [/conexión de herramientas/i, /automatización de tareas/i, /IA/i],
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
    assert.match(marfen, /sales and management|ventas y gesti[oó]n/);
    assert.match(marfen, /sales|ventas/);
    assert.match(marfen, /inventory|stock/);
    assert.doesNotMatch(marfen, /arca|e.invoicing|facturaci[oó]n electr[oó]nica|customers|clientes/);
    assert.doesNotMatch(marfen, /validation.only|early experiment|solo validaci[oó]n|experimento temprano/);
    assert.doesNotMatch(marfen, /kiosks?|convenience stores?|small retailers?|kioscos?|despensas?|pequeños comercios?/i);
    assert.equal(dictionary.selectedWork.items[0].url, "https://marfen.com.ar");
    assert.equal(dictionary.selectedWork.items[0].status, "live");
    assert.match(dictionary.marfenCase.eyebrow, /own product.*live|producto propio.*en producción/i);
    assert.match(dictionary.selectedWork.items[0].description, /real users|usuarios reales/i);
  }
  assert.match(spanish.marfenCase.body[0], /ventas y gesti[oó]n.*usuarios reales/i);
  assert.match(spanish.selectedWork.items[0].description, /ventas y gesti[oó]n.*usuarios reales/i);
  assert.match(english.marfenCase.body[0], /sales and management.*real users/i);
  assert.equal(english.selectedWork.items[0].linkLabel, "Explore Marfen");
  assert.equal(spanish.selectedWork.items[0].linkLabel, "Conocer Marfen");
});

test("Spanish footer role is localized without changing its English equivalent", () => {
  assert.equal(spanish.footer.role, "Desarrollador de software y creador de productos");
  assert.equal(english.footer.role, "Software developer & product builder");
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
  assert.deepEqual(english.professionalWork.items.map(({ name }) => name), ["Insurance operations ecosystem", "Helmcode Cloud Products"]);
  assert.deepEqual(spanish.professionalWork.items.map(({ name }) => name), ["Ecosistema digital para operaciones de seguros", "Helmcode Cloud Products"]);
  assert.doesNotMatch(JSON.stringify([english, spanish]), /Amparo Seguros/i);
});
