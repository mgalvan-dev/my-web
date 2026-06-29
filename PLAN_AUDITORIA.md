# Plan de Implementación — Auditoría mgalvan.dev

> **Para ejecución asistida:** los pasos usan checkboxes (`- [ ]`) para tracking. Cada tarea es autocontenida y termina en un commit. Se puede ejecutar tarea por tarea con `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Goal:** Resolver todos los hallazgos de la auditoría (rendimiento, accesibilidad, seguridad, deployment, código muerto y contenido) sin cambiar el diseño visual ni la funcionalidad existente.

**Architecture:** Sitio estático Astro 6 con componentes `.astro` + CSS Modules co-ubicados, i18n por diccionarios JSON (es/en) y dos páginas que comparten el `Layout`. Los cambios son ediciones quirúrgicas de markup/CSS/config; no se introduce lógica de runtime nueva.

**Tech Stack:** Astro · CSS Modules · TypeScript (strict) · pnpm · Docker/nginx · Vercel Analytics/Speed Insights.

---

## Convenciones de verificación

Este proyecto **no tiene suite de tests** (es un sitio estático). La verificación de cada tarea es:

1. **Build:** `pnpm build` → debe terminar sin errores ni warnings nuevos.
2. **Grep/inspección:** comando concreto que confirma que el cambio quedó aplicado.
3. **Visual (cuando aplica):** `pnpm dev` y revisión manual / Lighthouse en `http://localhost:4321`.

Antes de empezar, fijar una **línea base** verde:

- [x] **Paso 0.1 — Build base:** `pnpm install && pnpm build` → Esperado: build OK.
- [x] **Paso 0.2 — Rama de trabajo:** `git checkout -b chore/auditoria-fixes`

---

## Índice de fases

- **Fase 1 — Alto impacto:** LCP del hero, fuente bold, Dockerfile.
- **Fase 2 — Importantes:** estilos globales (reduced-motion, focus, theme-color, JSON-LD), `transition: all`, enlaces externos (`rel` + guardas), nginx.
- **Fase 3 — Limpieza:** código muerto (logos, assets, `nav`, CSS muerto).
- **Fase 4 — Pulido menor:** colores inválidos, `100dvh`, constantes centralizadas, semántica de headings, README, contenido es.json.
- **Fase 5 — Dependencias (deliberado):** Astro 7 + vuln esbuild.

---

# FASE 1 — Alto impacto

## Tarea 1: Corregir la imagen LCP del hero

**Files:**
- Modify: `src/components/hero/hero.astro:18-26`

- [x] **Paso 1.1 — Reemplazar el `<img>` del perfil**

Buscar:

```astro
            <img
                src="/profile.webp"
                alt="Marco Galván"
                title="Marco Galván foto"
                class={styles.profile_photo}
                width="200"
                height="200"
                loading="lazy"
            />
```

Reemplazar por (quita `loading="lazy"`, añade carga prioritaria y elimina el `title` redundante/en español):

```astro
            <img
                src="/profile.webp"
                alt="Marco Galván"
                class={styles.profile_photo}
                width="200"
                height="200"
                loading="eager"
                fetchpriority="high"
            />
```

- [x] **Paso 1.2 — Verificar**

Run: `grep -n "loading=\|fetchpriority" src/components/hero/hero.astro`
Esperado: `loading="eager"` y `fetchpriority="high"`, sin `lazy`.
Run: `pnpm build` → OK.

- [x] **Paso 1.3 — Commit**

```bash
git add src/components/hero/hero.astro
git commit -m "perf: prioritize hero LCP image, drop lazy loading"
```

---

## Tarea 2: Cargar los pesos reales de la fuente (eliminar faux bold)

**Files:**
- Modify: `src/layouts/Layout.astro:2`

El proyecto usa `font-weight: bold` (700) y `600` pero solo importa el peso 400. Los pesos `400/600/700` ya están instalados en `node_modules/@fontsource/geist-sans/`.

- [x] **Paso 2.1 — Importar pesos 600 y 700**

Buscar:

```astro
import "@fontsource/geist-sans";
```

Reemplazar por:

```astro
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
```

> Alternativa (opcional, fuera de este plan): migrar a la fuente variable `@fontsource-variable/geist-sans` para un único archivo con todos los pesos. Requiere `pnpm add @fontsource-variable/geist-sans` y `import "@fontsource-variable/geist-sans";`.

- [x] **Paso 2.2 — Verificar**

Run: `pnpm build` → OK.
Visual: `pnpm dev`, abrir el sitio, confirmar en DevTools → Network que se cargan `geist-sans-latin-600` y `-700`, y que los títulos ya no usan negrita sintética (Rendering → no “synthesized bold”).

- [x] **Paso 2.3 — Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "fix: load Geist 600/700 weights to avoid synthetic bold"
```

---

## Tarea 3: Dockerfile reproducible con pnpm

**Files:**
- Modify: `Dockerfile`

- [x] **Paso 3.1 — Reescribir el Dockerfile**

Reemplazar el contenido completo por:

```dockerfile
FROM node:22.15.1-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

Notas: imágenes pinneadas (reproducibilidad), `--frozen-lockfile` respeta `pnpm-lock.yaml`, y copiar primero los manifests cachea la capa de instalación.

- [x] **Paso 3.2 — Verificar (si Docker está disponible)**

Run: `docker build -t mgalvan-web .`
Esperado: build OK, sin “lockfile out of date”.
Si no hay Docker: revisar visualmente que no quede ningún `npm install`.

- [x] **Paso 3.3 — Commit**

```bash
git add Dockerfile
git commit -m "build: use pnpm with frozen lockfile and pinned base images"
```

> ⚠️ **Decisión de deployment:** el repo tiene paquetes `@vercel/*` (sugiere hosting en Vercel) **y** Docker/nginx. Si el deploy real es Vercel, el `Dockerfile` y `nginx.conf` están sin uso y conviene eliminarlos (o moverlos a `deploy/`). Si es self-hosted, completar la Tarea 9. Confirmar el destino antes de decidir.

---

# FASE 2 — Importantes

## Tarea 4: Estilos y `<head>` globales del Layout

**Files:**
- Modify: `src/layouts/Layout.astro` (head, posición del JSON-LD y bloque `<style is:global>`)

- [x] **Paso 4.1 — Añadir `theme-color`**

Después de la línea `<meta name="robots" content="index, follow" />` (`:32`), añadir:

```astro
        <meta name="theme-color" content="#0a0a0a" />
```

(El valor debe aproximar el fondo oscuro de la página.)

- [x] **Paso 4.2 — Mover el JSON-LD dentro de `<head>`**

Quitar el bloque que está **fuera** de `<body>` (actualmente entre `</body>` y `</html>`, `:92-113`):

```astro
    </body><script
        type="application/ld+json"
        set:html={JSON.stringify({
            ...
        })}
    />
```

Dejar el cierre limpio:

```astro
    </body>
</html>
```

Y pegar el `<script type="application/ld+json">` dentro del `<head>`, justo antes de `</head>` (después de `<SpeedInsights />`, `:88`):

```astro
        <SpeedInsights />

        <script
            type="application/ld+json"
            set:html={JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Person",
                name: "Marco Galván",
                url: "https://mgalvan.dev/",
                jobTitle:
                    lang === "en"
                        ? "React Native & Full Stack Developer"
                        : "Desarrollador React Native & Full Stack",
                worksFor: {
                    "@type": "Organization",
                    name: "Freelance",
                },
                sameAs: [
                    "https://www.linkedin.com/in/mgalvan26/",
                    "https://github.com/mgalvan-dev",
                    "https://x.com/MarcoGal4",
                ],
            })}
        />
    </head>
```

- [x] **Paso 4.3 — Añadir `scroll-padding-top` (offset del header sticky)**

En el bloque `<style is:global>`, en la regla `html, body` (`:141-145`), reemplazar:

```css
    html,
    body {
        min-height: 100dvh;
        scroll-behavior: smooth;
    }
```

por:

```css
    html {
        scroll-padding-top: 80px;
    }

    html,
    body {
        min-height: 100dvh;
        scroll-behavior: smooth;
    }
```

- [x] **Paso 4.4 — Añadir `:focus-visible` global y `prefers-reduced-motion`**

Al final del bloque `<style is:global>` (antes de `</style>`), añadir:

```css
    :focus-visible {
        outline: 2px solid #fafafa;
        outline-offset: 2px;
        border-radius: 4px;
    }

    @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
        }

        html {
            scroll-behavior: auto;
        }
    }
```

- [x] **Paso 4.5 — Verificar**

Run: `pnpm build` → OK.
Run: `grep -n "theme-color\|scroll-padding-top\|prefers-reduced-motion\|focus-visible" src/layouts/Layout.astro` → 4 coincidencias.
Visual: inspeccionar el HTML generado en `dist/index.html` y confirmar que el `application/ld+json` está dentro de `<head>`.

- [x] **Paso 4.6 — Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "a11y: add reduced-motion, focus-visible, theme-color; move JSON-LD into head"
```

---

## Tarea 5: Reemplazar `transition: all` (10 ocurrencias)

**Files:**
- Modify: `src/components/hero/hero.module.css:92`
- Modify: `src/components/contact-cta/contact-cta.module.css:46`
- Modify: `src/components/navbar/navbar.module.css:17,37`
- Modify: `src/components/header/header.module.css:26`
- Modify: `src/components/experience-card/experience-card.module.css:6`
- Modify: `src/components/project-card/project-card.module.css:8`
- Modify: `src/components/product-card/product-card.module.css:8`

(Las 2 ocurrencias de `logos.module.css` se resuelven al borrar ese archivo en la Tarea 10.)

- [x] **Paso 5.1 — Botones (hero y contact-cta)**

En `hero.module.css` y en `contact-cta.module.css`, dentro de `.primary_button, .secondary_button`, reemplazar:

```css
    transition: all 0.3s ease-in-out;
```

por:

```css
    transition: background-color 0.3s ease-in-out, border-color 0.3s ease-in-out,
        transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
```

- [x] **Paso 5.2 — Cards (experience / project / product)**

En `experience-card.module.css`, `project-card.module.css` y `product-card.module.css`, dentro de `.main_container`, reemplazar:

```css
    transition: all 200ms ease-in-out;
```

por:

```css
    transition: background-color 200ms ease-in-out, border-color 200ms ease-in-out;
```

- [x] **Paso 5.3 — Navbar**

En `navbar.module.css`, regla `.links` (`:17`):

```css
  transition: filter 0.2s ease-in-out;
```

Regla `.lang_button` (`:37`):

```css
  transition: color 0.1s;
```

- [x] **Paso 5.4 — Header**

En `header.module.css`, regla `.name_link` (`:26`):

```css
  transition: color 100ms ease-in-out;
```

- [x] **Paso 5.5 — Verificar**

Run: `grep -rn "transition: all" src/components` → solo debe quedar `logos.module.css` (se borra en Tarea 10). Tras la Tarea 10: 0 coincidencias.
Run: `pnpm build` → OK.

- [x] **Paso 5.6 — Commit**

```bash
git add src/components
git commit -m "perf: replace transition: all with explicit properties"
```

---

## Tarea 6: Enlaces externos — `rel` y guardas de `url`

**Files:**
- Modify: `src/components/hero/hero.astro:38-46`
- Modify: `src/components/contact-cta/contact-cta.astro:22-28`
- Modify: `src/components/experience-card/experience-card.astro:13`
- Modify: `src/components/project-card/project-card.astro:12-20`
- Modify: `src/components/product-card/product-card.astro:12-26`

- [x] **Paso 6.1 — Hero: `rel` completo en el botón de CV**

Buscar:

```astro
                    <a
                        class={styles.primary_button}
                        href={resumeUrl}
                        target="_blank"
                        rel="noopener">{dictionary.ctaResume}</a
                    >
```

Reemplazar `rel="noopener"` por `rel="noopener noreferrer"`.

- [x] **Paso 6.2 — Contact-cta: `rel` completo en LinkedIn**

En `contact-cta.astro`, cambiar `rel="noopener"` por `rel="noopener noreferrer"` en el `secondary_button`.

- [x] **Paso 6.3 — Experience card: añadir `rel`**

Buscar:

```astro
    <a href={dictionary.url} target="_blank" class={styles.content_container}>
```

Reemplazar por:

```astro
    <a
        href={dictionary.url}
        target="_blank"
        rel="noopener noreferrer"
        class={styles.content_container}
    >
```

- [x] **Paso 6.4 — Project card: `rel` + guarda de `url` opcional**

`ProjectItem.url` es opcional. Reemplazar el cuerpo de `project-card.astro` (de `<article>` a `</article>`) por:

```astro
<article class={styles.main_container}>
    {dictionary.url ? (
        <a
            href={dictionary.url}
            target="_blank"
            rel="noopener noreferrer"
            class={styles.content_container}
        >
            <div class={styles.info_container}>
                <div class={styles.title_container}>
                    <h3 class={styles.title}>{dictionary.title}</h3>
                </div>
                <p class={styles.description}>{dictionary.description}</p>
            </div>
        </a>
    ) : (
        <div class={styles.content_container}>
            <div class={styles.info_container}>
                <div class={styles.title_container}>
                    <h3 class={styles.title}>{dictionary.title}</h3>
                </div>
                <p class={styles.description}>{dictionary.description}</p>
            </div>
        </div>
    )}
</article>
```

(Esto también aplica el cambio `<p>`→`<h3>` de la Tarea 16 para esta card.)

- [x] **Paso 6.5 — Product card: `rel` + guarda de `url` opcional**

`ProductItem.url` es opcional. Reemplazar el cuerpo de `product-card.astro` por:

```astro
<article class={styles.main_container}>
    {dictionary.url ? (
        <a
            href={dictionary.url}
            target="_blank"
            rel="noopener noreferrer"
            class={styles.content_container}
        >
            <div class={styles.info_container}>
                <div class={styles.title_container}>
                    <span class={styles.badge}>{dictionary.category}</span>
                    <h3 class={styles.title}>{dictionary.title}</h3>
                </div>
                <p class={styles.description}>{dictionary.description}</p>
            </div>
            <div class={styles.tags}>
                {dictionary.tags.map((tag) => (
                    <span class={styles.tag}>{tag}</span>
                ))}
            </div>
        </a>
    ) : (
        <div class={styles.content_container}>
            <div class={styles.info_container}>
                <div class={styles.title_container}>
                    <span class={styles.badge}>{dictionary.category}</span>
                    <h3 class={styles.title}>{dictionary.title}</h3>
                </div>
                <p class={styles.description}>{dictionary.description}</p>
            </div>
            <div class={styles.tags}>
                {dictionary.tags.map((tag) => (
                    <span class={styles.tag}>{tag}</span>
                ))}
            </div>
        </div>
    )}
</article>
```

- [x] **Paso 6.6 — Verificar**

Run: `grep -rn "target=\"_blank\"" src | grep -v "noopener noreferrer"` → solo debe quedar el `navbar.astro` (se trata en la Tarea 7).
Run: `pnpm build` → OK.

- [x] **Paso 6.7 — Commit**

```bash
git add src/components
git commit -m "security: add rel=noopener noreferrer and guard optional card urls"
```

---

## Tarea 7: Navbar — accesibilidad y seguridad

**Files:**
- Modify: `src/components/navbar/navbar.astro`

- [x] **Paso 7.1 — Reescribir el contenido del `<nav>`**

Reemplazar el bloque `<nav> ... </nav>` por (alt descriptivos, `rel` en sociales, `aria-label`/`hreflang` en el selector de idioma):

```astro
<nav class={styles.main_container} aria-label="Social and language">
  <div class={styles.links_container}>
    <a
      href="https://x.com/MarcoGal4"
      target="_blank"
      rel="noopener noreferrer"
      class={styles.links}
    >
      <img
        src="/logos/x_dark.svg"
        alt="X (Twitter)"
        width={16}
        height={16}
        class={styles.image}
      />
    </a>
    <a
      href="https://www.linkedin.com/in/mgalvan26/"
      target="_blank"
      rel="noopener noreferrer"
      class={styles.links}
    >
      <img
        src="/logos/linkedin.svg"
        alt="LinkedIn"
        width={16}
        height={16}
        class={styles.image}
      />
    </a>
    <a
      href="https://github.com/mgalvan-dev"
      target="_blank"
      rel="noopener noreferrer"
      class={styles.links}
    >
      <img
        src="/logos/github-dark.svg"
        alt="GitHub"
        width={16}
        height={16}
        class={styles.image}
      />
    </a>
    <a
      href={lang === "en" ? "/es" : "/"}
      hreflang={lang === "en" ? "es" : "en"}
      aria-label={lang === "en" ? "Cambiar a español" : "Switch to English"}
      class={styles.lang_button}
    >
      {lang === "en" ? "ES" : "EN"}
    </a>
  </div>
</nav>
```

- [x] **Paso 7.2 — Verificar**

Run: `grep -rn "target=\"_blank\"" src | grep -v "noopener noreferrer"` → 0 coincidencias.
Run: `pnpm build` → OK.

- [x] **Paso 7.3 — Commit**

```bash
git add src/components/navbar/navbar.astro
git commit -m "a11y: descriptive social alts, language switcher aria-label/hreflang, rel"
```

---

## Tarea 8: Skip link al contenido principal

**Files:**
- Modify: `src/pages/index.astro:20-33`
- Modify: `src/pages/es/index.astro:20-33`
- Modify: `src/layouts/Layout.astro` (estilo del skip link)

- [x] **Paso 8.1 — Añadir `id="main"` al `<main>` y un skip link en ambas páginas**

En `index.astro` y `es/index.astro`, justo después de `<Layout ...>` y antes de `<Header ... />`, añadir el skip link; y añadir `id="main"` al `<main>`:

```astro
<Layout lang={lang} title={title} description={description}>
    <a href="#main" class="skip-link">Skip to content</a>
    <Header lang={lang} />
    <main id="main" class={styles.main}>
```

(En `es/index.astro` el texto puede ser `Saltar al contenido`.)

- [x] **Paso 8.2 — Estilo del skip link (global)**

En `Layout.astro`, dentro de `<style is:global>`, añadir:

```css
    .skip-link {
        position: absolute;
        left: 8px;
        top: -48px;
        z-index: 100;
        padding: 8px 16px;
        background-color: #fafafa;
        color: #111;
        border-radius: 8px;
        text-decoration: none;
        transition: top 0.15s ease-in-out;
    }

    .skip-link:focus {
        top: 8px;
    }
```

- [x] **Paso 8.3 — Verificar**

Run: `pnpm build` → OK.
Visual: `pnpm dev`, pulsar `Tab` al cargar → debe aparecer el “Skip to content”; al activarlo, el foco salta al `<main>`.

- [x] **Paso 8.4 — Commit**

```bash
git add src/pages/index.astro src/pages/es/index.astro src/layouts/Layout.astro
git commit -m "a11y: add skip-to-content link"
```

---

## Tarea 9: Hardening de nginx (solo si el deploy es self-hosted)

**Files:**
- Modify: `nginx.conf`

> Omitir si se confirma deploy en Vercel (ver nota de la Tarea 3).

- [x] **Paso 9.1 — Reescribir `nginx.conf`**

```nginx
server {
  listen 80 default_server;
  root /usr/share/nginx/html;
  index index.html;

  gzip on;
  gzip_comp_level 6;
  gzip_min_length 256;
  gzip_types text/plain text/css application/json application/javascript
             text/xml application/xml application/xml+rss text/javascript
             image/svg+xml application/manifest+json;

  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

  location / {
    try_files $uri $uri/ $uri/index.html index.html;
  }

  location /_astro/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location ~* \.(?:css|js|woff2?|svg|png|webp|ico|pdf)$ {
    expires 30d;
    add_header Cache-Control "public";
  }
}
```

> CSP: se puede añadir `Content-Security-Policy` pero requiere permitir el JSON-LD inline y los scripts de Vercel Analytics/Speed Insights. Dejar para una iteración dedicada con pruebas, para no romper analytics.

- [x] **Paso 9.2 — Verificar**

Run: `docker build -t mgalvan-web . && docker run --rm -p 8080:80 mgalvan-web` (si hay Docker), luego `curl -I http://localhost:8080` → deben aparecer los headers `X-Content-Type-Options`, etc.

- [x] **Paso 9.3 — Commit**

```bash
git add nginx.conf
git commit -m "security: add nginx security headers, gzip and asset caching"
```

---

# FASE 3 — Limpieza de código muerto

## Tarea 10: Eliminar el carrusel de logos y assets sin uso

**Files:**
- Delete: `src/components/logos/logos.astro`, `src/components/logos/logos.module.css`
- Delete: `src/helpers/logos.ts` (y el directorio `src/helpers/` queda vacío)
- Delete: `src/models/logos.model.ts`
- Delete: `src/assets/astro.svg`, `src/assets/background.svg`
- Delete: ~25 SVGs sin uso en `public/logos/` (conservar solo `x_dark.svg`, `linkedin.svg`, `github-dark.svg`)

- [x] **Paso 10.1 — Confirmar que no se usan**

Run: `grep -rn "logos/logos\|helpers/logos\|logos.model\|assets/" src` → 0 coincidencias.

- [x] **Paso 10.2 — Borrar componentes/helper/modelo/assets**

```bash
git rm src/components/logos/logos.astro src/components/logos/logos.module.css \
       src/helpers/logos.ts src/models/logos.model.ts \
       src/assets/astro.svg src/assets/background.svg
```

- [x] **Paso 10.3 — Borrar los SVGs sin uso de `public/logos/`**

```bash
cd public/logos
git rm $(ls *.svg | grep -vE '^(x_dark|linkedin|github-dark)\.svg$')
cd ../..
```

Run: `ls public/logos` → Esperado: solo `github-dark.svg  linkedin.svg  x_dark.svg`.

- [x] **Paso 10.4 — Verificar**

Run: `pnpm build` → OK (sin imports rotos).

- [x] **Paso 10.5 — Commit**

```bash
git add -A
git commit -m "chore: remove unused logos slider, helper, model and assets"
```

---

## Tarea 11: Eliminar `dictionary.nav` (no se usa)

**Files:**
- Modify: `src/models/dictionary.model.ts:32-35`
- Modify: `src/dictionaries/en.json:11-14`
- Modify: `src/dictionaries/es.json:11-14`

- [x] **Paso 11.1 — Quitar `nav` del modelo**

En `dictionary.model.ts`, borrar:

```ts
  nav: {
    about: string;
    experience: string;
  };
```

- [x] **Paso 11.2 — Quitar `nav` de ambos diccionarios**

En `en.json` borrar:

```json
  "nav": {
    "about": "About me",
    "experience": "Experience"
  },
```

En `es.json` borrar:

```json
  "nav": {
    "about": "Sobre mi",
    "experience": "Experiencia"
  },
```

- [x] **Paso 11.3 — Verificar**

Run: `grep -rn "\"nav\"\|nav:" src` → 0 coincidencias.
Run: `node -e "JSON.parse(require('fs').readFileSync('src/dictionaries/en.json'));JSON.parse(require('fs').readFileSync('src/dictionaries/es.json'));console.log('JSON OK')"` → `JSON OK`.
Run: `pnpm build` → OK.

- [x] **Paso 11.4 — Commit**

```bash
git add src/models/dictionary.model.ts src/dictionaries/en.json src/dictionaries/es.json
git commit -m "chore: remove unused nav dictionary entry"
```

---

## Tarea 12: Eliminar CSS muerto y hover redundante

**Files:**
- Modify: `src/components/project-card/project-card.module.css`
- Modify: `src/components/experience-card/experience-card.module.css:9-12`
- Modify: `src/components/product-card/product-card.module.css:11-14`

- [x] **Paso 12.1 — Borrar `.working_period` y `.stack` en project-card**

`project-card.astro` no renderiza esas clases (copiadas de experience-card). Borrar la regla `.working_period`:

```css
.working_period {
    font-size: 1rem;
}
```

la regla `.stack`:

```css
.stack {
    font-size: 1rem;
    font-weight: bold;
}
```

y sus entradas dentro del `@media (width < 768px)`:

```css
    .working_period {
        font-size: 0.75rem;
    }
```
```css
    .stack {
        font-size: 0.75rem;
    }
```

- [x] **Paso 12.2 — Quitar `background-color` redundante en `:hover` de las cards**

En `experience-card.module.css`, `project-card.module.css` y `product-card.module.css`, la regla `:hover` repite el mismo color base. Reemplazar:

```css
.main_container:hover {
    background-color: #111;
    border-color: #333;
}
```

por:

```css
.main_container:hover {
    border-color: #333;
}
```

- [x] **Paso 12.3 — Verificar**

Run: `grep -rn "working_period\|\.stack" src/components/project-card` → 0 coincidencias.
Run: `pnpm build` → OK.

- [x] **Paso 12.4 — Commit**

```bash
git add src/components
git commit -m "chore: remove dead CSS classes and redundant hover rules"
```

---

# FASE 4 — Pulido menor

## Tarea 13: Corregir color inválido `rgba(256, …)`

**Files:**
- Modify: `src/components/header/header.module.css:8`
- Modify: `src/components/footer/footer.module.css:7`

- [x] **Paso 13.1 — Reemplazar 256 por 255 (ambos archivos)**

Buscar en cada archivo:

```css
  border-bottom: 1px solid rgba(256, 256, 256, 0.2);
```
(footer usa `border-top`). Reemplazar `rgba(256, 256, 256, 0.2)` por:

```css
rgba(255, 255, 255, 0.2)
```

- [x] **Paso 13.2 — Verificar**

Run: `grep -rn "256" src/components` → 0 coincidencias.
Run: `pnpm build` → OK.

- [x] **Paso 13.3 — Commit**

```bash
git add src/components/header/header.module.css src/components/footer/footer.module.css
git commit -m "fix: invalid rgba(256) -> rgba(255) in header and footer borders"
```

---

## Tarea 14: `100vh` → `100dvh` en el hero

**Files:**
- Modify: `src/components/hero/hero.module.css:2`

- [x] **Paso 14.1 — Cambiar la unidad**

En `.main_container`, reemplazar:

```css
    height: 100vh;
```

por:

```css
    min-height: 100dvh;
```

(`min-height` + `dvh` evita el corte de contenido y los saltos por la barra del navegador móvil.)

- [x] **Paso 14.2 — Verificar**

Run: `grep -n "dvh\|vh" src/components/hero/hero.module.css` → `100dvh`.
Run: `pnpm build` → OK. Visual: revisar el hero en viewport móvil (DevTools).

- [x] **Paso 14.3 — Commit**

```bash
git add src/components/hero/hero.module.css
git commit -m "fix: use 100dvh for hero height on mobile"
```

---

## Tarea 15: Centralizar constantes (email + URLs)

**Files:**
- Create: `src/consts.ts`
- Modify: `src/components/hero/hero.astro`, `src/components/contact-cta/contact-cta.astro`, `src/components/navbar/navbar.astro`, `src/layouts/Layout.astro`

- [x] **Paso 15.1 — Crear `src/consts.ts`**

```ts
export const SITE_URL = "https://mgalvan.dev";

export const CONTACT_EMAIL = "mailto:elmacro11@gmail.com";

export const SOCIAL_LINKS = {
  linkedin: "https://www.linkedin.com/in/mgalvan26/",
  github: "https://github.com/mgalvan-dev",
  x: "https://x.com/MarcoGal4",
} as const;
```

- [x] **Paso 15.2 — Usarlo en `hero.astro`**

En el frontmatter, reemplazar:

```astro
const contactEmail = "mailto:elmacro11@gmail.com";
```

por:

```astro
import { CONTACT_EMAIL } from "../../consts";
const contactEmail = CONTACT_EMAIL;
```

- [x] **Paso 15.3 — Usarlo en `contact-cta.astro`**

Reemplazar:

```astro
const linkedinUrl = "https://www.linkedin.com/in/mgalvan26/";
const contactEmail = "mailto:elmacro11@gmail.com";
```

por:

```astro
import { CONTACT_EMAIL, SOCIAL_LINKS } from "../../consts";
const linkedinUrl = SOCIAL_LINKS.linkedin;
const contactEmail = CONTACT_EMAIL;
```

- [x] **Paso 15.4 — Usarlo en `navbar.astro`**

Importar `import { SOCIAL_LINKS } from "../../consts";` en el frontmatter y sustituir los `href` literales por `SOCIAL_LINKS.x`, `SOCIAL_LINKS.linkedin`, `SOCIAL_LINKS.github`.

- [x] **Paso 15.5 — Usarlo en `Layout.astro` (JSON-LD)**

Importar `import { SITE_URL, SOCIAL_LINKS } from "../consts";` y en el JSON-LD usar `url: \`${SITE_URL}/\`` y `sameAs: [SOCIAL_LINKS.linkedin, SOCIAL_LINKS.github, SOCIAL_LINKS.x]`. (Opcional: reemplazar también los literales `https://mgalvan.dev` del `canonicalURL` y `ogImage` por `SITE_URL`.)

- [x] **Paso 15.6 — Verificar**

Run: `pnpm build` → OK.
Run: `grep -rn "elmacro11" src --include=*.astro` → 0 coincidencias (solo en `consts.ts`).

- [x] **Paso 15.7 — Commit**

```bash
git add src/consts.ts src/components src/layouts/Layout.astro
git commit -m "refactor: centralize contact email and social links in consts.ts"
```

---

## Tarea 16: Títulos de cards `<p>` → `<h3>` (experience-card)

**Files:**
- Modify: `src/components/experience-card/experience-card.astro:16`

> Las cards `project-card` y `product-card` ya se actualizaron a `<h3>` en la Tarea 6.

- [x] **Paso 16.1 — Cambiar el tag del título**

En `experience-card.astro`, reemplazar:

```astro
                <p class={styles.title}>{dictionary.title}</p>
```

por:

```astro
                <h3 class={styles.title}>{dictionary.title}</h3>
```

(La clase `.title` no cambia; el reset global ya neutraliza márgenes de headings.)

- [x] **Paso 16.2 — Verificar**

Run: `pnpm build` → OK. Visual: confirmar que el tamaño/peso del título no cambió.

- [x] **Paso 16.3 — Commit**

```bash
git add src/components/experience-card/experience-card.astro
git commit -m "a11y: use h3 for experience card titles (heading hierarchy)"
```

---

## Tarea 17: Actualizar el README

**Files:**
- Modify: `README.md`

- [x] **Paso 17.1 — Corregir comandos, estructura y stack**

Cambios concretos:
- Comandos: `npm install/run dev/run build/run preview` → `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm preview`.
- Estructura: la página es `src/pages/index.astro` (en) y `src/pages/es/index.astro` (es); **no** existe `pages/en/index.astro`.
- Quitar `logos/` del árbol de componentes (eliminado) y de la lista; añadir los componentes reales: `about, contact-cta, experience, experience-card, featured, footer, header, hero, navbar, product-card, project-card, projects`.
- `sitemap.xml` se **genera** en `dist/` por la integración `@astrojs/sitemap`; no está en `public/`.

- [x] **Paso 17.2 — Verificar**

Run: `grep -n "npm \|en/index.astro\|logos/" README.md` → 0 coincidencias.

- [x] **Paso 17.3 — Commit**

```bash
git add README.md
git commit -m "docs: update README (pnpm, real structure, component list)"
```

---

## Tarea 18: Limpiar contenido de `es.json`

**Files:**
- Modify: `src/dictionaries/es.json`

- [x] **Paso 18.1 — Quitar espacios sobrantes**

- Línea ~42: `"...para nuestros clientes. "` → quitar el espacio final.
- Línea ~53: `" Estoy trabajando en UR POV..."` → quitar el espacio inicial.

- [x] **Paso 18.2 — Unificar tildes en títulos**

- `"Iunigo Web"` → `"Iúnigo Web"`.
- `"San Cristobal Seguros"` → `"San Cristóbal Seguros"`.

- [x] **Paso 18.3 — Verificar**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/dictionaries/es.json'));console.log('JSON OK')"` → `JSON OK`.
Run: `pnpm build` → OK.

- [x] **Paso 18.4 — Commit**

```bash
git add src/dictionaries/es.json
git commit -m "content: fix stray whitespace and accents in es.json"
```

---

# FASE 5 — Dependencias (deliberado)

## Tarea 19: Actualizar Astro 6 → 7 y la vuln de esbuild

> Cambio de **major**: hacerlo en su propio PR, leyendo la guía de migración. No mezclar con las fases anteriores.

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`

- [ ] **Paso 19.1 — Revisar la guía de migración**

Leer: https://docs.astro.build/en/guides/upgrade-to/v7/ y anotar breaking changes que afecten al proyecto (config, integraciones, sitemap).

- [ ] **Paso 19.2 — Actualizar**

```bash
pnpm dlx @astrojs/upgrade
```

(o `pnpm up astro@latest @astrojs/sitemap@latest`). Quitar de `pnpm-workspace.yaml` la entrada obsoleta `minimumReleaseAgeExclude: - astro@6.4.8` si ya no aplica.

- [ ] **Paso 19.3 — Resolver la vuln de esbuild**

Run: `pnpm audit` → tras el upgrade, esbuild debería quedar ≥0.28.1. Si persiste: `pnpm up esbuild` o `pnpm audit --fix`.

- [ ] **Paso 19.4 — Verificar**

Run: `pnpm build && pnpm preview` → revisar el sitio completo (ambos idiomas, meta, sitemap en `dist/sitemap-index.xml`).
Run: `pnpm audit` → 0 vulnerabilidades (o solo aceptadas).

- [ ] **Paso 19.5 — Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml
git commit -m "build: upgrade Astro to v7 and patch esbuild advisory"
```

---

# Cierre

- [ ] **Build final:** `pnpm build` → OK.
- [ ] **Lighthouse** (DevTools, modo incógnito) en `pnpm preview`: confirmar mejoras en Performance (LCP) y Accessibility.
- [ ] **Revisión de diff completa:** `git diff main...chore/auditoria-fixes`.
- [ ] **Integrar:** abrir PR o merge a `main` según preferencia.

## Mapa hallazgo → tarea (cobertura)

| Hallazgo auditoría | Tarea |
|---|---|
| Imagen LCP con `loading="lazy"` | 1 |
| Faux bold (pesos de fuente) | 2 |
| Dockerfile ignora pnpm-lock | 3 |
| Falta `prefers-reduced-motion` | 4 |
| Falta `:focus-visible` / `theme-color` | 4 |
| JSON-LD fuera de `<body>` | 4 |
| `scroll-margin/padding` header sticky | 4 |
| `transition: all` ×10 | 5 |
| `rel` en `target=_blank` | 6, 7 |
| `url` opcional sin guarda | 6 |
| alt de iconos sociales / lang switcher | 7 |
| Skip link ausente | 8 |
| nginx sin headers/gzip/caché | 9 |
| Carrusel logos + helper + model + SVGs muertos | 10 |
| `src/assets/*.svg` muertos | 10 |
| `dictionary.nav` sin uso | 11 |
| CSS muerto `.stack`/`.working_period` + hover no-op | 12 |
| `rgba(256, …)` inválido | 13 |
| `100vh` vs `100dvh` | 14 |
| Email/URLs hardcodeados y duplicados | 15 |
| Títulos de cards como `<p>` | 6, 16 |
| README desactualizado | 17 |
| Espacios/tildes en es.json | 18 |
| Astro 6→7 + vuln esbuild | 19 |
