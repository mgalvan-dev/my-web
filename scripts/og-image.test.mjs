import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readAsset = (path) =>
  readFile(new URL(`../public/${path}`, import.meta.url));

test("the social image source contains the approved shared copy", async () => {
  const svg = await readSource("public/og-image.svg");
  assert.match(svg, /Marco Galv[aá]n/);
  assert.match(svg, /Software Developer/i);
  assert.match(svg, /Software · Web · Automation/);
  assert.match(svg, /width="1200"/);
  assert.match(svg, /height="630"/);
});

test("the published social image is a 1200 by 630 PNG", async () => {
  const png = await readAsset("og-image.png");
  assert.deepEqual(
    png.subarray(0, 8),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test("Home and CV layouts use the shared PNG and declare its dimensions", async () => {
  const [homeLayout, cvLayout] = await Promise.all([
    readSource("src/layouts/Layout.astro"),
    readSource("src/layouts/CVLayout.astro"),
  ]);

  for (const source of [homeLayout, cvLayout]) {
    assert.match(source, /og-image\.png/);
    assert.match(
      source,
      /property="og:image:width"\s+content="1200"/,
    );
    assert.match(
      source,
      /property="og:image:height"\s+content="630"/,
    );
  }
});
