import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SITE_ORIGIN = "https://mgalvan.dev";
const OG_IMAGE = `${SITE_ORIGIN}/og-image.svg`;

const HOME_PAGES = {
  "/": {
    file: "index.html",
    lang: "en",
    title: "Custom Software, Automation & Integrations | Marco Galván",
    description:
      "I build internal systems, automate processes, and integrate tools for businesses that need to bring order to their operations and reduce manual work.",
    ogImageAlt: "Marco Galván — Software Developer",
    role: "Software Developer & Product Builder",
    canonical: `${SITE_ORIGIN}/`,
    alternates: {
      en: `${SITE_ORIGIN}/`,
      es: `${SITE_ORIGIN}/es/`,
      "x-default": `${SITE_ORIGIN}/`,
    },
  },
  "/es/": {
    file: "es/index.html",
    lang: "es",
    title: "Software a medida, automatizaciones e integraciones | Marco Galván",
    description:
      "Desarrollo sistemas internos, automatizo procesos e integro herramientas para empresas que necesitan ordenar su operación y reducir tareas manuales.",
    ogImageAlt: "Marco Galván — Desarrollador de software",
    role: "Desarrollador de Software & Product Builder",
    canonical: `${SITE_ORIGIN}/es/`,
    alternates: {
      en: `${SITE_ORIGIN}/`,
      es: `${SITE_ORIGIN}/es/`,
      "x-default": `${SITE_ORIGIN}/`,
    },
  },
};

const CV_PAGES = {
  "/cv/en/": {
    file: "cv/en/index.html",
    lang: "en",
    title: "Marco Antonio Galván Fernandez — Software Developer",
    description:
      "Software Developer with nearly five years of experience building web, mobile and SaaS products for startups, agencies and businesses. Experienced across product engineering, software architecture and the full development lifecycle, delivering software that solves real business problems.",
    canonical: `${SITE_ORIGIN}/cv/en/`,
    alternates: {
      en: `${SITE_ORIGIN}/cv/en/`,
      es: `${SITE_ORIGIN}/cv/es/`,
      "x-default": `${SITE_ORIGIN}/cv/en/`,
    },
  },
  "/cv/es/": {
    file: "cv/es/index.html",
    lang: "es",
    title: "Marco Galván — CV de Desarrollador de Software",
    description:
      "CV en español de Marco Galván, Desarrollador de Software con experiencia construyendo productos web, móviles, SaaS y soluciones con inteligencia artificial.",
    canonical: `${SITE_ORIGIN}/cv/es/`,
    alternates: {
      en: `${SITE_ORIGIN}/cv/en/`,
      es: `${SITE_ORIGIN}/cv/es/`,
      "x-default": `${SITE_ORIGIN}/cv/en/`,
    },
  },
};

const REQUIRED_ROUTES = new Set([
  ...Object.keys(HOME_PAGES),
  ...Object.keys(CV_PAGES),
]);
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getTags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(
    (match) => match[0],
  );
}

function getAttribute(tag, name) {
  const match = tag.match(
    new RegExp(`\\b${escapeRegExp(name)}\\s*=\\s*["']([^"']*)["']`, "i"),
  );
  return match ? decodeHtml(match[1]) : undefined;
}

function getMeta(html, attribute, value) {
  const tag = getTags(html, "meta").find(
    (candidate) => getAttribute(candidate, attribute) === value,
  );
  return tag ? getAttribute(tag, "content") : undefined;
}

function getTitle(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1].trim()) : undefined;
}

function getHtmlLanguage(html) {
  const htmlTag = getTags(html, "html")[0];
  return htmlTag ? getAttribute(htmlTag, "lang") : undefined;
}

function getAlternateLinks(html) {
  const alternates = new Map();
  for (const tag of getTags(html, "link")) {
    const rel = (getAttribute(tag, "rel") ?? "").split(/\s+/);
    if (!rel.includes("alternate")) continue;
    const lang = getAttribute(tag, "hreflang");
    const href = getAttribute(tag, "href");
    if (lang && href) alternates.set(lang, href);
  }
  return alternates;
}

function htmlRoute(relativePath) {
  const normalized = relativePath.split(sep).join("/");
  if (normalized === "index.html") return "/";
  if (normalized.endsWith("/index.html")) {
    return `/${normalized.slice(0, -"index.html".length)}`;
  }
  return `/${normalized}`;
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function readText(path, label) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    check(false, `${label}: unable to read ${relative(ROOT, path)} (${error.code ?? error.message})`);
    return null;
  }
}

async function listFiles(directory) {
  const files = [];
  if (!(await isDirectory(directory))) return files;

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

async function hasRequiredPages(staticRoot) {
  for (const page of [...Object.values(HOME_PAGES), ...Object.values(CV_PAGES)]) {
    if (!(await isFile(join(staticRoot, page.file)))) return false;
  }
  return true;
}

async function verifyPage(staticRoot, route, page, { home = false } = {}) {
  const path = join(staticRoot, page.file);
  const html = await readText(path, `${route} artifact`);
  if (html === null) return;

  check(html.trim().length > 0, `${route}: static HTML artifact is empty`);
  check(getHtmlLanguage(html) === page.lang, `${route}: incorrect html lang`);
  check(getTitle(html) === page.title, `${route}: title does not match the approved metadata`);
  check(
    getMeta(html, "name", "description") === page.description,
    `${route}: description does not match the approved metadata`,
  );
  check(getMeta(html, "name", "author") === "Marco Galván", `${route}: author is missing`);
  check(
    getMeta(html, "property", "og:title") === page.title,
    `${route}: og:title does not match the page title`,
  );
  check(
    getMeta(html, "property", "og:description") === page.description,
    `${route}: og:description does not match the page description`,
  );
  check(getMeta(html, "property", "og:type") === "profile", `${route}: og:type is not profile`);
  check(getMeta(html, "property", "og:url") === page.canonical, `${route}: og:url is incorrect`);
  check(getMeta(html, "property", "og:image") === OG_IMAGE, `${route}: og:image is incorrect`);
  check(
    getMeta(html, "name", "twitter:card") === "summary_large_image",
    `${route}: Twitter card is missing or incorrect`,
  );
  check(getMeta(html, "name", "twitter:title") === page.title, `${route}: twitter:title is incorrect`);
  check(
    getMeta(html, "name", "twitter:description") === page.description,
    `${route}: twitter:description is incorrect`,
  );
  check(getMeta(html, "name", "twitter:image") === OG_IMAGE, `${route}: twitter:image is incorrect`);

  const canonicalTag = getTags(html, "link").find(
    (tag) => getAttribute(tag, "rel") === "canonical",
  );
  check(
    canonicalTag && getAttribute(canonicalTag, "href") === page.canonical,
    `${route}: canonical is missing or incorrect`,
  );

  const alternates = getAlternateLinks(html);
  check(
    alternates.size === Object.keys(page.alternates).length,
    `${route}: expected exactly en/es/x-default hreflang links`,
  );
  for (const [lang, href] of Object.entries(page.alternates)) {
    check(alternates.get(lang) === href, `${route}: hreflang ${lang} is missing or incorrect`);
  }

  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  check(h1Count === 1, `${route}: expected exactly one H1, found ${h1Count}`);
  check(
    !/server:defer|<astro-island\b|<astro-server-island\b/i.test(html),
    `${route}: server island marker found in static HTML`,
  );
  check(
    !/\/api\/contact\b/i.test(html),
    `${route}: manual /api/contact reference found in static HTML`,
  );

  if (!home) return;

  check(
    getMeta(html, "property", "og:image:alt") === page.ogImageAlt,
    `${route}: localized og:image:alt is incorrect`,
  );
  check(
    getMeta(html, "name", "twitter:image:alt") === page.ogImageAlt,
    `${route}: localized twitter:image:alt is incorrect`,
  );
  check(
    getMeta(html, "name", "robots")?.startsWith("index, follow") === true,
    `${route}: indexable robots metadata is missing`,
  );
  check(getMeta(html, "property", "og:locale") === (page.lang === "en" ? "en_US" : "es_AR"), `${route}: og:locale is incorrect`);
  check(
    getMeta(html, "property", "og:locale:alternate") === (page.lang === "en" ? "es_AR" : "en_US"),
    `${route}: alternate Open Graph locale is missing`,
  );

  const jsonLdScripts = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  check(jsonLdScripts.length === 1, `${route}: expected one JSON-LD graph`);
  if (jsonLdScripts.length !== 1) return;

  let structuredData;
  try {
    structuredData = JSON.parse(jsonLdScripts[0][1].trim());
  } catch (error) {
    check(false, `${route}: JSON-LD is not valid JSON (${error.message})`);
    return;
  }

  check(structuredData?.["@type"] === "ProfilePage", `${route}: JSON-LD is not a ProfilePage`);
  check(structuredData?.url === page.canonical, `${route}: ProfilePage URL is incorrect`);
  check(structuredData?.inLanguage === page.lang, `${route}: ProfilePage language is incorrect`);
  check(structuredData?.mainEntity?.["@type"] === "Person", `${route}: JSON-LD Person entity is missing`);
  check(structuredData?.mainEntity?.jobTitle === page.role, `${route}: JSON-LD role is not localized`);

  const jsonLdTypes = new Set();
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value["@type"] === "string") jsonLdTypes.add(value["@type"]);
    for (const child of Object.values(value)) visit(child);
  };
  visit(structuredData);
  for (const forbiddenType of ["Service", "Offer", "Review", "FAQPage"]) {
    check(!jsonLdTypes.has(forbiddenType), `${route}: out-of-scope ${forbiddenType} JSON-LD found`);
  }
}

async function verifySitemapAndRobots(staticRoot) {
  const sitemapIndexPath = join(staticRoot, "sitemap-index.xml");
  const sitemapIndex = await readText(sitemapIndexPath, `${relative(ROOT, staticRoot)} sitemap index`);
  if (sitemapIndex === null) return;

  const sitemapLocations = [...sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1]);
  check(sitemapLocations.length > 0, `${relative(ROOT, staticRoot)}: sitemap index has no targets`);
  const sitemapUrls = [];
  for (const location of sitemapLocations) {
    let url;
    try {
      url = new URL(location);
    } catch {
      check(false, `${relative(ROOT, staticRoot)}: sitemap target is not a URL`);
      continue;
    }
    check(url.origin === SITE_ORIGIN, `${relative(ROOT, staticRoot)}: sitemap target has an unexpected origin`);
    const targetPath = join(staticRoot, url.pathname.replace(/^\/+/, ""));
    const target = await readText(targetPath, `${relative(ROOT, staticRoot)} sitemap target`);
    if (target === null) continue;
    for (const match of target.matchAll(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi)) {
      sitemapUrls.push(match[1]);
    }
  }

  const requiredSitemapUrls = [
    `${SITE_ORIGIN}/`,
    `${SITE_ORIGIN}/es/`,
    `${SITE_ORIGIN}/cv/en/`,
    `${SITE_ORIGIN}/cv/es/`,
  ];
  for (const url of requiredSitemapUrls) {
    check(sitemapUrls.includes(url), `${relative(ROOT, staticRoot)}: sitemap is missing ${url}`);
  }
  const allowedSitemapRoutes = new Set(requiredSitemapUrls.map((url) => new URL(url).pathname));
  for (const url of sitemapUrls) {
    let pathname;
    try {
      pathname = new URL(url).pathname;
    } catch {
      check(false, `${relative(ROOT, staticRoot)}: sitemap contains an invalid URL`);
      continue;
    }
    check(!/\/(?:servicios?|services?|api)(?:\/|$)/i.test(pathname), `${relative(ROOT, staticRoot)}: sitemap contains an out-of-scope route ${pathname}`);
    check(allowedSitemapRoutes.has(pathname), `${relative(ROOT, staticRoot)}: sitemap contains an unapproved route ${pathname}`);
  }

  const robots = await readText(join(staticRoot, "robots.txt"), `${relative(ROOT, staticRoot)} robots.txt`);
  if (robots !== null) {
    check(
      /(?:^|\n)Sitemap:\s*https:\/\/mgalvan\.dev\/sitemap-index\.xml\s*(?:$|\n)/i.test(robots),
      `${relative(ROOT, staticRoot)}: robots.txt does not point to the sitemap index`,
    );
  }
}

function routeFromStaticHtml(staticRoot, path) {
  return htmlRoute(relative(staticRoot, path));
}

async function verifyStaticRouteBoundary(staticRoots) {
  const bannedRoute = /\/(?:servicios?|services?|api|blog|sectores?|diagn[oó]sticos?)(?:\/|$)/i;
  for (const staticRoot of staticRoots) {
    for (const path of await listFiles(staticRoot)) {
      if (!path.endsWith(".html")) continue;
      const route = routeFromStaticHtml(staticRoot, path);
      check(REQUIRED_ROUTES.has(route), `${relative(ROOT, staticRoot)}: out-of-scope HTML route ${route}`);
      check(!bannedRoute.test(route), `${relative(ROOT, staticRoot)}: banned route ${route}`);
    }
  }
}

async function verifySourceRenderingBoundary() {
  const configSource = await readText(join(ROOT, "astro.config.mjs"), "Astro config");
  if (configSource !== null) {
    check(/\boutput\s*:\s*["']static["']/.test(configSource), "Astro config must keep output: static");
    check(/\badapter\s*:\s*vercel\(\)/.test(configSource), "Astro config must keep the Vercel adapter");
    check(!/output\s*:\s*["']server["']/.test(configSource), "Astro config must not switch to output: server");
  }

  const sourceFiles = await listFiles(join(ROOT, "src"));
  for (const path of sourceFiles) {
    if (!/\.(?:astro|ts|mjs|js)$/.test(path)) continue;
    const source = await readText(path, "source runtime boundary");
    if (source === null) continue;
    const label = relative(ROOT, path);
    check(
      !/server:defer|<ServerIsland\b|<astro-server-island\b/i.test(source),
      `${label}: Server Island marker found in source`,
    );
    check(
      !/\/api\/contact\b/i.test(source),
      `${label}: manual /api/contact reference found in source`,
    );
  }

  const pageFiles = await listFiles(join(ROOT, "src", "pages"));
  for (const path of pageFiles) {
    if (!/\.(?:astro|ts|mjs|js)$/.test(path)) continue;
    const source = await readText(path, "page prerender boundary");
    if (source === null) continue;
    check(
      !/\bprerender\s*(?:=|:)\s*false\b/.test(source),
      `${relative(ROOT, path)}: page opts out of prerendering`,
    );
  }
}

async function verifyAdapterBoundary(staticRoots) {
  const outputRoot = join(ROOT, ".vercel", "output");
  const configPath = join(outputRoot, "config.json");
  const configText = await readText(configPath, "Vercel adapter manifest");
  if (configText === null) return;

  let config;
  try {
    config = JSON.parse(configText);
  } catch (error) {
    check(false, `Vercel adapter manifest is not valid JSON (${error.message})`);
    return;
  }

  const routes = Array.isArray(config.routes) ? config.routes : [];
  const filesystemIndex = routes.findIndex((route) => route?.handle === "filesystem");
  check(filesystemIndex >= 0, "Vercel adapter manifest has no filesystem handler");

  const actionRoute = routes.find(
    (route) => typeof route?.src === "string" && /_actions/.test(route.src) && route.dest === "_render",
  );
  check(actionRoute !== undefined, "Vercel adapter manifest has no internal Astro Actions route");

  const enRedirect = routes.find(
    (route) =>
      route?.src === "^/en$" &&
      route.status === 301 &&
      (route.headers?.Location ?? route.headers?.location) === "/",
  );
  check(enRedirect !== undefined, "Vercel adapter manifest must redirect /en to /");
  const esRedirect = routes.some(
    (route) =>
      route?.status >= 300 &&
      route.status < 400 &&
      ["^/es$", "^/es/$", "^/es/?$"].includes(route.src),
  );
  check(!esRedirect, "Vercel adapter manifest must not redirect /es/");

  const serverRoutes = routes.filter((route) => route?.dest === "_render");
  for (const route of serverRoutes) {
    const src = String(route.src ?? "");
    const isAction = src.startsWith("^/_actions");
    const isAdapterScaffold =
      src.startsWith("^/_server-islands") || src.startsWith("^/_image");
    const isNotFound = src === "^/404/?$" || (src === "^/.*$" && route.status === 404);
    check(isAction || isAdapterScaffold || isNotFound, `unexpected page server route in adapter manifest: ${src}`);
  }
  check(
    filesystemIndex >= 0 && serverRoutes.every((route) => routes.indexOf(route) > filesystemIndex),
    "adapter filesystem handler must precede server-backed fallback routes",
  );

  const functionsRoot = join(outputRoot, "functions");
  const functionEntries = (await isDirectory(functionsRoot))
    ? await readdir(functionsRoot, { withFileTypes: true })
    : [];
  const functionDirectories = functionEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  check(functionDirectories.includes("_render.func"), "Vercel adapter did not emit the internal render function");
  check(
    functionDirectories.every((directory) => directory === "_render.func"),
    `unexpected server function(s) emitted: ${functionDirectories.filter((directory) => directory !== "_render.func").join(", ")}`,
  );

  const adapterStaticRoot = join(outputRoot, "static");
  check(await hasRequiredPages(adapterStaticRoot), "Vercel adapter static output is missing a required page");
  check(
    staticRoots.some((staticRoot) => staticRoot === adapterStaticRoot),
    "static page verification did not use the Vercel adapter static output",
  );

  check(
    !routes.some((route) => /api\/?contact|api-contact/i.test(String(route?.src ?? ""))),
    "Vercel adapter manifest contains a manual contact API route",
  );
  check(
    !configText.includes("server:defer") && !configText.includes("ServerIsland"),
    "Vercel adapter manifest contains an explicit Server Island marker",
  );
}

async function main() {
  const candidates = [
    join(ROOT, ".vercel", "output", "static"),
    join(ROOT, "dist", "client"),
    join(ROOT, "dist"),
  ];
  const staticRoots = [];
  for (const candidate of candidates) {
    if ((await isDirectory(candidate)) && (await hasRequiredPages(candidate))) {
      if (!staticRoots.includes(candidate)) staticRoots.push(candidate);
    }
  }
  check(staticRoots.length > 0, "no static output root contains all Home and CV page artifacts");

  if (staticRoots.length > 0) {
    const primaryRoot = staticRoots.find((path) => path.endsWith(join(".vercel", "output", "static"))) ?? staticRoots[0];
    for (const [route, page] of Object.entries(HOME_PAGES)) {
      await verifyPage(primaryRoot, route, page, { home: true });
    }
    for (const [route, page] of Object.entries(CV_PAGES)) {
      await verifyPage(primaryRoot, route, page);
    }
    for (const staticRoot of staticRoots) await verifySitemapAndRobots(staticRoot);
    await verifyStaticRouteBoundary(staticRoots);
  }

  await verifySourceRenderingBoundary();
  await verifyAdapterBoundary(staticRoots);

  if (failures.length > 0) {
    console.error("Services V1 SEO verification failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log("Services V1 SEO verification passed.");
  console.log(`- static page roots: ${staticRoots.map((path) => relative(ROOT, path)).join(", ")}`);
  console.log("- verified Home/CV metadata, canonical, hreflang, JSON-LD, sitemap, and robots");
  console.log("- verified /en redirect and static /es/ without page server fallback");
  console.log("- verified Vercel adapter boundary: static filesystem pages plus internal Actions runtime");
}

main().catch((error) => {
  console.error(`Services V1 SEO verification could not run: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
