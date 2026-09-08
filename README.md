# Marco Galván — Product Builder

Personal website for Marco Galván, a Product Builder who designs and builds digital products, automations, and integrations for real business problems.

The site is a static bilingual Astro project deployed to Vercel.

## Routes

| Route | Content |
| :--- | :--- |
| `/` | English commercial Home |
| `/es/` | Spanish commercial Home |
| `/cv/en/` | English CV |
| `/cv/es/` | Spanish CV |
| `/en` | Redirect to `/` for compatibility |

The Home is organized around capabilities, process, selected work, an experience summary, and a commercial contact CTA. Journal content is intentionally not rendered until real entries exist.

## Architecture

```text
/
├── public/
│   ├── favicon.ico and favicon-*.png
│   ├── profile.jpg
│   ├── og-image.svg
│   ├── robots.txt
│   ├── Marco-Galvan-CV-EN.pdf
│   ├── Marco-Galvan-CV-ES.pdf
│   └── logos/
├── scripts/
│   ├── home-source.test.mjs
│   ├── cv-source.test.mjs
│   ├── cv-localization.test.mjs
│   └── export-cv.mjs
├── src/
│   ├── consts.ts
│   ├── components/
│   │   ├── analytics/
│   │   ├── capabilities/
│   │   ├── contact-cta/
│   │   ├── cv/
│   │   ├── experience-summary/
│   │   ├── featured/
│   │   ├── footer/
│   │   ├── header/
│   │   ├── hero/
│   │   ├── navbar/
│   │   ├── process/
│   │   └── product-card/
│   ├── data/cv/              # CV-only source data
│   ├── dictionaries/          # Home content: en.json and es.json
│   ├── layouts/               # Home and CV layouts
│   ├── models/                # Home dictionary contracts
│   └── pages/
│       ├── index.astro
│       ├── es/index.astro
│       ├── cv/en.astro
│       └── cv/es.astro
└── package.json
```

Home dictionaries have explicit `navigation`, `hero`, `capabilities`, `process`, `selectedWork`, `experienceSummary`, `contact`, and `footer` sections. CV content remains isolated under `src/data/cv/`.

## Stack and infrastructure

- Astro with static output.
- TypeScript and CSS Modules.
- English and Spanish Home and CV routes.
- `@astrojs/sitemap` and `public/robots.txt` for SEO discovery.
- `@vercel/analytics` and `@vercel/speed-insights` in the shared Home layout.
- A small delegated Analytics listener tracks the approved home interactions without framework hydration.
- Vercel deployment uses the static build; `vercel.json` contains PDF cache headers.

The shared Home layout provides canonical URLs, reciprocal hreflang links, Open Graph/Twitter metadata, and `Person`/`ProfilePage` JSON-LD. The Open Graph image is the existing `public/og-image.svg`; there is no reference to a missing PNG or Apple Touch Icon.

## Commands

| Command | Action |
| :--- | :--- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start the Astro development server |
| `pnpm check` | Run `astro check` |
| `pnpm test` | Run all Node source tests, including Home and CV contracts |
| `pnpm build` | Generate the static site and sitemap in `dist/` |
| `pnpm preview` | Preview the generated static build locally |
| `pnpm export:cv` | Generate printable CV PDF variants with the existing exporter |

Do not commit generated output from `dist/`. No runtime server is required in production.

## Assets

Use the assets that exist in `public/`: `profile.jpg`, `og-image.svg`, favicons, social logos, and the two linked CV PDFs. Marfen is the featured own product and links to its public landing page at https://marfen.com.ar. The site does not publish metrics, customer counts, revenue, or screenshots for the product.

## License

Personal use — all rights reserved.
