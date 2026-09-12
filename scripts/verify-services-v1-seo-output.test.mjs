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
