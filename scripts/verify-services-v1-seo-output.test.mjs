import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("./verify-services-v1-seo-output.mjs", import.meta.url),
  "utf8",
);

test("checks the origin of every sitemap URL before using its pathname", () => {
  const loopStart = source.indexOf("for (const location of sitemapUrls)");
  assert.ok(loopStart >= 0, "the sitemap URL loop must exist");
  const loopEnd = source.indexOf("const robots", loopStart);
  const loop = source.slice(loopStart, loopEnd);
  const originCheck = loop.indexOf("url.origin === SITE_ORIGIN");
  const pathnameUse = loop.indexOf(".pathname");

  assert.ok(originCheck >= 0, "each sitemap URL must check its origin");
  assert.ok(pathnameUse >= 0, "the sitemap URL pathname must be read");
  assert.ok(
    originCheck < pathnameUse,
    "the origin must be checked before the pathname is considered",
  );
});

test("collects JSON-LD types declared as strings or string arrays", () => {
  const visitStart = source.indexOf("const visit =");
  const visitEnd = source.indexOf("visit(structuredData)", visitStart);
  const visit = source.slice(visitStart, visitEnd);

  assert.match(visit, /Array\.isArray\(value\["@type"\]\)/);
  assert.match(visit, /typeof type === "string"/);
});

const { socialImageFailures, socialMetadataFailures } = await import(
  "./verify-services-v1-seo-output.mjs"
);
const validImage = await readFile(new URL("../public/og-image.png", import.meta.url));
const validMetadata = `
  <meta property="og:image" content="https://mgalvan.dev/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://mgalvan.dev/og-image.png">
`;

test("accepts the published PNG and absolute social metadata", () => {
  assert.deepEqual(socialImageFailures(validImage, "fixture"), []);
  assert.deepEqual(socialMetadataFailures(validMetadata, "/"), []);
});

test("rejects missing, truncated, or non-PNG image data without throwing", () => {
  for (const image of [Buffer.alloc(0), validImage.subarray(0, 20), Buffer.from("<svg></svg>")]) {
    assert.ok(socialImageFailures(image, "fixture").length > 0);
  }
});

for (const [offset, dimension, size] of [[16, "width", 1200], [20, "height", 630]]) {
  test(`rejects a PNG with the wrong ${dimension}`, () => {
    const image = Buffer.from(validImage);
    image.writeUInt32BE(size - 1, offset);
    assert.deepEqual(socialImageFailures(image, "fixture"), [
      `fixture: og-image.png ${dimension} is not ${size}`,
    ]);
  });
}

for (const [name, value, replacement] of [
  ["og:image", "https://mgalvan.dev/og-image.png", "/og-image.png"],
  ["og:image:width", "1200", "1199"],
  ["og:image:height", "630", "629"],
  ["twitter:card", "summary_large_image", "summary"],
  ["twitter:image", "https://mgalvan.dev/og-image.png", "https://mgalvan.dev/og-image.svg"],
]) {
  test(`rejects incorrect or missing ${name}`, () => {
    const tag = new RegExp(`<meta [^>]*["']${name}["'][^>]*>`);
    const invalidMetadata = validMetadata.replace(tag, (match) => match.replace(value, replacement));
    assert.equal(socialMetadataFailures(invalidMetadata, "/es/").length, 1);
    assert.equal(socialMetadataFailures(validMetadata.replace(tag, ""), "/es/").length, 1);
  });
}
