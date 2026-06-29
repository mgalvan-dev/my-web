# Marco Galván — Full Stack Developer

Personal website built with Astro. Source at [mgalvan.dev](https://mgalvan.dev).

## Project structure

```text
/
├── public/
│   ├── favicon.ico
│   ├── profile.webp
│   ├── robots.txt
│   ├── og-image.png
│   ├── Marco-Galvan-CV-EN.pdf
│   ├── Marco-Galvan-CV-ES.pdf
│   └── logos/          (x_dark, linkedin, github-dark)
├── src/
│   ├── consts.ts
│   ├── components/
│   │   ├── about/
│   │   ├── contact-cta/
│   │   ├── experience/
│   │   ├── experience-card/
│   │   ├── featured/
│   │   ├── footer/
│   │   ├── header/
│   │   ├── hero/
│   │   ├── navbar/
│   │   ├── product-card/
│   │   ├── project-card/
│   │   └── projects/
│   ├── dictionaries/
│   │   ├── en.json
│   │   └── es.json
│   ├── layouts/
│   │   └── Layout.astro
│   ├── models/
│   │   └── dictionary.model.ts
│   └── pages/
│       ├── index.astro       (EN)
│       └── es/index.astro    (ES)
└── package.json
```

## Tech stack

- **Astro** — static site framework
- **TypeScript** — strict mode
- **CSS Modules** — scoped component styles
- **JSON** — i18n dictionaries (en / es)

## Commands

| Command        | Action                                          |
| :------------- | :---------------------------------------------- |
| `pnpm install` | Install dependencies                            |
| `pnpm dev`     | Start dev server at `localhost:4321`            |
| `pnpm build`   | Build for production into `./dist/`             |
| `pnpm preview` | Preview the production build locally            |

## License

Personal use — all rights reserved.
