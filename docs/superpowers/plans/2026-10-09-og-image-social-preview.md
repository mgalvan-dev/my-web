# Social Preview Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one compatible 1200 × 630 PNG social image for mgalvan.dev, use it for Open Graph and Twitter metadata, and preserve localized page metadata.

**Architecture:** Keep `public/og-image.svg` as the editable source and render it to `public/og-image.png` with the existing Playwright installation and the existing Geist Sans font files. Point both Home and CV layouts at the shared absolute PNG URL. Extend the static SEO verifier to validate the generated metadata and PNG bytes.

**Tech Stack:** Astro 7, Node.js test runner, pnpm, existing Playwright package, Geist Sans Fontsource assets.

## Global Constraints

- The published image must be exactly 1200 × 630 pixels and served as `image/png`.
- The shared image copy must include “Marco Galván”, “Software Developer”, and “Software · Web · Automation”.
- Keep the existing centered type layout and dark gradient identity.
- Keep `/` and `/es/` metadata localized; use the same image for both routes.
- Do not add runtime or image-processing dependencies.
- Work on `fix/og-image-social-preview`, merge to local `main` only after verification, and do not push.

## File Structure

- Create `scripts/og-image.test.mjs` to guard the visible image copy, PNG signature and dimensions, and both layouts’ image metadata.
- Modify `public/og-image.svg` as the editable social graphic source.
- Create `public/og-image.png` as the public social image.
- Modify `src/layouts/Layout.astro` and `src/layouts/CVLayout.astro` to use the PNG; add dimensions in the CV layout.
- Modify `scripts/verify-services-v1-seo-output.mjs` and its test to verify the PNG and dimensions in generated output.
- Modify `README.md` to describe the SVG source and published PNG.

---

### Task 1: Create the shared raster image and point both layouts at it

**Files:**
- Create: `scripts/og-image.test.mjs`
- Modify: `public/og-image.svg`
- Create: `public/og-image.png`
- Modify: `src/layouts/Layout.astro`
- Modify: `src/layouts/CVLayout.astro`

**Interfaces:**
- The Home layout keeps `ogImage` as an optional absolute or site-relative override; its default becomes `https://mgalvan.dev/og-image.png` through the existing `new URL(ogImage, SITE_URL)` handling.
- The CV layout uses `https://mgalvan.dev/og-image.png` for both Open Graph and Twitter metadata.
- The SVG is the editable source; the PNG is the asset referenced in metadata.

- [ ] **Step 1: Add regression tests before changing the image or layouts**

Create `scripts/og-image.test.mjs` with:

```js
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
```

- [ ] **Step 2: Run the new test and confirm it fails for the current implementation**

Run: `pnpm exec node --test scripts/og-image.test.mjs`

Expected: the source-copy test fails because the current SVG says “FULL STACK DEVELOPER”; the PNG test fails because `public/og-image.png` does not exist; the layout test fails because the layouts still reference SVG and the CV layout has no dimensions.

- [ ] **Step 3: Replace the SVG contents with the approved centered composition**

Set `public/og-image.svg` to this complete source:

```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title description">
  <title id="title">Marco Galván — Software Developer</title>
  <desc id="description">Software · Web · Automation</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0a0a0a" />
      <stop offset="1" stop-color="#171721" />
    </linearGradient>
    <linearGradient id="name" x1="318" y1="0" x2="882" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffffff" />
      <stop offset="1" stop-color="#a1a1aa" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#background)" />
  <text x="600" y="286" text-anchor="middle" fill="url(#name)" font-family="Geist Sans, Arial, sans-serif" font-size="82" font-weight="700" letter-spacing="-2">Marco Galván</text>
  <text x="600" y="378" text-anchor="middle" fill="#71717a" font-family="Geist Sans, Arial, sans-serif" font-size="30" font-weight="400" letter-spacing="6">SOFTWARE DEVELOPER</text>
  <text x="600" y="435" text-anchor="middle" fill="#a3a3a3" font-family="Geist Sans, Arial, sans-serif" font-size="21" font-weight="400" letter-spacing="4">SOFTWARE · WEB · AUTOMATION</text>
</svg>
```

- [ ] **Step 4: Render the SVG as an exact 1200 × 630 PNG using existing Playwright and Geist files**

Run this command from the repository root:

```bash
node --input-type=module <<'NODE'
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const svg = await readFile("public/og-image.svg", "utf8");
const regularFont = (
  await readFile("node_modules/@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff2")
).toString("base64");
const boldFont = (
  await readFile("node_modules/@fontsource/geist-sans/files/geist-sans-latin-700-normal.woff2")
).toString("base64");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(`<!doctype html><html><head><style>
@font-face { font-family: "Geist Sans"; font-style: normal; font-weight: 400; src: url(data:font/woff2;base64,${regularFont}) format("woff2"); }
@font-face { font-family: "Geist Sans"; font-style: normal; font-weight: 700; src: url(data:font/woff2;base64,${boldFont}) format("woff2"); }
html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
svg { display: block; width: 1200px; height: 630px; }
</style></head><body>${svg}</body></html>`);
await page.evaluate(async () => { await document.fonts.ready; });
await page.screenshot({ path: "public/og-image.png" });
await browser.close();
NODE
```

- [ ] **Step 5: Point the Home and CV layouts at the PNG and make the CV dimensions explicit**

In `src/layouts/Layout.astro`, change the default to:

```ts
ogImage = SITE_URL + "/og-image.png",
```

Keep the existing `ogImageURL = new URL(ogImage, SITE_URL).href`, localized dictionaries, `og:image:alt`, and Twitter metadata unchanged.

In `src/layouts/CVLayout.astro`, change the image URL and add the dimensions after `og:image:alt`:

```ts
const ogImageURL = SITE_URL + "/og-image.png";
```

```astro
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

- [ ] **Step 6: Run the regression test and inspect the exported image**

Run: `pnpm exec node --test scripts/og-image.test.mjs`

Expected: 3 tests pass. Inspect `public/og-image.png` at original resolution and confirm the text is centered, readable, and not clipped.

- [ ] **Step 7: Commit the image and layout change**

```bash
git add public/og-image.svg public/og-image.png src/layouts/Layout.astro src/layouts/CVLayout.astro scripts/og-image.test.mjs
git commit -m "feat: publish raster social preview image"
```

### Task 2: Verify generated SEO metadata and update the asset documentation

**Files:**
- Modify: `scripts/verify-services-v1-seo-output.test.mjs`
- Modify: `scripts/verify-services-v1-seo-output.mjs`
- Modify: `README.md`

**Interfaces:**
- `pnpm verify:seo` continues to verify the built Home and CV pages and additionally verifies the PNG asset bytes and shared Open Graph dimensions.
- `OG_IMAGE` in the verifier is `https://mgalvan.dev/og-image.png`.

- [ ] **Step 1: Add a failing regression test for the verifier’s PNG and dimension checks**

Append this test to `scripts/verify-services-v1-seo-output.test.mjs`:

```js
test("checks the shared PNG image and Open Graph dimensions", () => {
  assert.match(source, /const OG_IMAGE = `\$\{SITE_ORIGIN\}\/og-image\.png`;/);
  assert.match(
    source,
    /getMeta\(html, "property", "og:image:width"\)\s*===\s*"1200"/,
  );
  assert.match(
    source,
    /getMeta\(html, "property", "og:image:height"\)\s*===\s*"630"/,
  );
  assert.match(source, /readUInt32BE\(16\)/);
  assert.match(source, /readUInt32BE\(20\)/);
});
```

- [ ] **Step 2: Run the verifier unit test and confirm it fails against the old verifier**

Run: `pnpm exec node --test scripts/verify-services-v1-seo-output.test.mjs`

Expected: the new test fails because the verifier expects `.svg` and does not check the Open Graph width, height, or PNG dimensions.

- [ ] **Step 3: Update the SEO verifier to validate the new URL, dimensions, and built asset**

In `scripts/verify-services-v1-seo-output.mjs`, set:

```js
const OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
```

In `verifyPage`, after checking `og:image`, add:

```js
check(
  getMeta(html, "property", "og:image:width") === "1200",
  `${route}: og:image:width must be 1200`,
);
check(
  getMeta(html, "property", "og:image:height") === "630",
  `${route}: og:image:height must be 630`,
);
```

Add this function before `verifySitemapAndRobots`:

```js
async function verifySocialImage(staticRoot) {
  const imagePath = join(staticRoot, "og-image.png");
  let image;
  try {
    image = await readFile(imagePath);
  } catch (error) {
    check(false, `${relative(ROOT, staticRoot)}: unable to read og-image.png (${error.code ?? error.message})`);
    return;
  }

  check(
    image.subarray(0, 8).equals(PNG_SIGNATURE),
    `${relative(ROOT, staticRoot)}: og-image.png is not a PNG`,
  );
  check(
    image.length >= 24 && image.readUInt32BE(16) === 1200,
    `${relative(ROOT, staticRoot)}: og-image.png width is not 1200`,
  );
  check(
    image.length >= 24 && image.readUInt32BE(20) === 630,
    `${relative(ROOT, staticRoot)}: og-image.png height is not 630`,
  );
}
```

In the `if (staticRoots.length > 0)` block, call `await verifySocialImage(staticRoot)` for every `staticRoot` alongside `verifySitemapAndRobots(staticRoot)`. Update the success log to say the verifier checked the shared PNG and its dimensions.

- [ ] **Step 4: Update the README’s public asset list and SEO description**

List both `og-image.svg` (editable source) and `og-image.png` (published social card) under `public/`. Replace the sentence that identifies the SVG as the Open Graph image with a sentence that says the Home and CV layouts use the shared 1200 × 630 PNG, sourced from the SVG.

- [ ] **Step 5: Run the verifier unit test and built SEO verification**

Run: `pnpm exec node --test scripts/verify-services-v1-seo-output.test.mjs`

Expected: all verifier unit tests pass.

Run after a fresh build in Task 3: `pnpm verify:seo`

Expected: `Services V1 SEO verification passed.` and the verifier reports the Home/CV metadata plus the PNG image checks.

- [ ] **Step 6: Commit the SEO verifier and README updates**

```bash
git add scripts/verify-services-v1-seo-output.test.mjs scripts/verify-services-v1-seo-output.mjs README.md
git commit -m "test: verify social preview metadata and asset"
```

### Task 3: Run the requested checks and merge locally

**Files:**
- No additional source files; verify the committed changes from Tasks 1 and 2.

**Interfaces:**
- All checks run on `fix/og-image-social-preview` before the branch is merged into local `main`.
- No remote push is performed.

- [ ] **Step 1: Run the complete test suite**

Run: `pnpm test`

Expected: Node reports all project tests passing.

- [ ] **Step 2: Build the Astro site**

Run: `pnpm build`

Expected: Astro finishes successfully and emits static output under `.vercel/output/static`.

- [ ] **Step 3: Run the SEO verifier against the generated pages**

Run: `pnpm verify:seo`

Expected: the verifier confirms `/`, `/es/`, both CV routes, localized metadata, absolute image URLs, card tags, image dimensions, sitemap, robots, and static output boundaries.

- [ ] **Step 4: Verify the built PNG over local HTTP**

Run this command in a terminal:

```bash
python3 -m http.server 4173 --directory .vercel/output/static
```

In another terminal, run:

```bash
curl -sS -o /dev/null -D - http://127.0.0.1:4173/og-image.png | rg -i '^(HTTP/|content-type:)'
```

Expected: HTTP 200 and `Content-type: image/png`. Stop the local HTTP server after the check.

- [ ] **Step 5: Confirm the branch is clean and merge it into local main**

```bash
git status --short
git switch main
git merge --no-ff fix/og-image-social-preview -m "merge: add compatible social preview image"
git status --short --branch
git log -3 --oneline --decorate
```

Expected: `main` contains the verified implementation and documentation; the working tree is clean. Do not run `git push`.
