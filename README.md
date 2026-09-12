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

The bilingual Home keeps the approved Services V1 order:

`Hero → Problem → Services → Selected work (Marfen first) → anonymized professional case → Process → About → Fit → Contact`

Header/navigation and footer remain shared framing. The Home navigation keeps the `#services`, `#work`, `#about`, and `#contact` anchors; CV routes remain available but are not part of the Home conversion journey. `/es/` is preserved as the Spanish route; there are no individual service or Marfen routes in P0. Journal content is intentionally not rendered until real entries exist.

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
│   ├── services-v1-source.test.mjs
│   ├── contact-action-source.test.mjs
│   ├── verify-services-v1-seo-output.mjs
│   ├── cv-source.test.mjs
│   ├── cv-localization.test.mjs
│   └── export-cv.mjs
├── src/
│   ├── consts.ts
│   ├── actions/index.ts       # contact Astro Action
│   ├── components/
│   │   ├── analytics/
│   │   ├── capabilities/
│   │   ├── contact-cta/
│   │   ├── cv/
│   │   ├── experience-summary/
│   │   ├── featured/
│   │   ├── fit/
│   │   ├── footer/
│   │   ├── header/
│   │   ├── hero/
│   │   ├── marfen-case/
│   │   ├── navbar/
│   │   ├── problem/
│   │   ├── process/
│   │   ├── professional-case/
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

Home dictionaries have explicit `navigation`, `hero`, `problem`, `capabilities`, `marfenCase`, `professionalCase`, `process`, `selectedWork`, `experienceSummary`, `fit`, `contact`, and `footer` sections. CV content remains isolated under `src/data/cv/`.

## Stack and infrastructure

- Astro 7 with static output.
- TypeScript and CSS Modules.
- English and Spanish Home and CV routes.
- `@astrojs/sitemap` and `public/robots.txt` for SEO discovery.
- `@vercel/analytics` and `@vercel/speed-insights` in the shared Home layout.
- A small delegated Analytics listener tracks the approved home interactions without framework hydration.
- `@astrojs/vercel` is present only to expose Astro's server-backed Action boundary while `output: "static"` remains enabled. Vercel receives static HTML for `/`, `/es/`, `/cv/en/`, and `/cv/es/`; the adapter emits one internal `_render.func` for Actions and framework fallback handling.
- Vercel deployment uses the static build; `vercel.json` contains PDF cache headers.

The shared Home layout provides canonical URLs, reciprocal hreflang links, Open Graph/Twitter metadata, and `Person`/`ProfilePage` JSON-LD. The Open Graph image is the existing `public/og-image.svg`; there is no reference to a missing PNG or Apple Touch Icon.

## Contact runtime

`ContactCta.astro` contains the prerendered HTML form. Its small client script builds `FormData` and calls `actions.contact(formData)`; it does not bind a form action, create `/api/contact`, or navigate to a thank-you page. `src/actions/index.ts` validates the strict form with Astro's Zod API and sends through the official `resend` SDK.

The Action reads these private server variables only:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

`CONTACT_EMAIL_ADDRESS` remains the existing recipient configuration. No sender value is committed or invented. Configure both Resend variables in the Vercel environment using a sender from a verified domain before release. The current P0 protection is a hidden honeypot plus strict payload size limits; Vercel rate limiting is a follow-up unless an existing trivial rule is enabled.

The WhatsApp destination is the approved `5493855205726`, centralized in `WHATSAPP_PHONE_NUMBER` and used by `getWhatsAppUrl`. Before release, confirm the destination and prefilled message in the deployed environment.

Analytics keeps the approved conversion taxonomy: `services_cta_clicked`, `case_clicked`, `marfen_clicked`, `contact_cta_clicked`, `whatsapp_clicked`, `form_started`, and `form_submitted`. Form analytics contains no lead fields or other PII.

## Commands

| Command | Action |
| :--- | :--- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start the Astro development server |
| `pnpm check` | Run `astro check` |
| `pnpm test` | Run all Node source tests, including Home and CV contracts |
| `pnpm build` | Generate the static site and sitemap in `dist/` |
| `pnpm verify:seo` | Validate generated metadata, canonical, hreflang, JSON-LD, sitemap, robots, and the Vercel static/Action boundary |
| `git diff --check` | Check tracked changes for whitespace errors |
| `pnpm dev --host 127.0.0.1 --port 4321` | Run interactive bilingual/browser QA locally |
| `python3 -m http.server 4322 --directory .vercel/output/static` | Serve the built Vercel static artifact for HTML-only QA |
| `pnpm astro dev stop` | Stop the Astro dev server after QA |
| `pnpm export:cv` | Generate printable CV PDF variants with the existing exporter |

Run the release validation set as:

```sh
pnpm test
pnpm check
pnpm build
pnpm verify:seo
git diff --check
```

Do not commit generated output from `dist/` or `.vercel/`, and do not commit a local `.env`. Static pages need no page-level runtime server in production; only the adapter's internal Action boundary handles contact submissions.

Before publishing, configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, confirm the existing recipient, confirm `5493855205726`, and perform one production-like Action smoke test with synthetic data. A real Resend submission is intentionally not part of local QA without those private variables.

## Assets

Use the assets that exist in `public/`: `profile.jpg`, `og-image.svg`, favicons, social logos, and the two linked CV PDFs. Marfen is the featured own product and links to its public landing page at https://marfen.com.ar. The site does not publish metrics, customer counts, revenue, or screenshots for the product.

## License

Personal use — all rights reserved.
