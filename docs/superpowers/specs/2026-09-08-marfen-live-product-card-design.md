# Marfen Live Product Card Design

## Goal

Actualizar la card destacada de Marfen en el Home bilingüe de `mgalvan.dev` para reflejar que es un producto propio live, en producción y utilizado en una operación comercial real, manteniendo la identidad visual y el alcance actual del portfolio.

## Contexto actual

- El Home en inglés (`/`) y el Home en español (`/es/`) consumen `src/dictionaries/en.json` y `src/dictionaries/es.json`.
- La sección `selectedWork` contiene tres items y la primera card es el producto propio que actualmente se presenta como `POS for retailers` / `POS para comercios`.
- `ProductCard` ya soporta una URL opcional: cuando existe, la card completa es un enlace externo con `target="_blank"` y `rel="noopener noreferrer"`.
- El modelo actual solo permite el estado `in-validation`, y el copy de Marfen todavía menciona que el producto está siendo preparado para validación y que no es un SaaS consolidado.
- El README todavía documenta que el proyecto POS no tiene una URL pública.

## Alcance

### Incluido

- Home en inglés (`/`).
- Home en español (`/es/`).
- La primera card de `selectedWork`, que seguirá siendo el producto propio destacado.
- Los contratos TypeScript, el componente y los estilos mínimos necesarios para el CTA opcional.
- Los tests de contenido y estructura relacionados con `selectedWork` y `ProductCard`.
- La nota del README que quedó desactualizada respecto de la URL pública de Marfen.

### Excluido

- Rutas, datos o PDFs del CV.
- Experiencia laboral formal.
- Las cards de Amparo Seguros y Helmcode Cloud Products.
- Navegación, layout general, colores, tipografías, spacing, analytics y metadata global del sitio.
- Métricas, cantidad de clientes, revenue, claims de consolidación SaaS o cualquier otro dato no proporcionado.

## Decisión de diseño

Se conserva el comportamiento actual de link externo completo para las cards enlazadas. El modelo `SelectedWorkItem` incorporará un campo opcional `linkLabel?: string`; `ProductCard` mostrará ese texto al final del contenido únicamente para una card enlazada que lo defina. Esto permite que Marfen tenga un CTA textual descriptivo sin introducir enlaces anidados ni cambiar el patrón de las cards estáticas o de futuras cards enlazadas.

El estado se reemplaza de forma explícita:

- Tipo: `ProjectStatus = "live"`.
- Inglés: `Own product · Live`.
- Español: `Producto propio · En producción`.

La URL pública oficial será `https://marfen.com.ar`. No se usará `app.marfen.com.ar` como CTA del portfolio.

## Contenido final

### Inglés

```json
{
  "name": "Marfen",
  "category": "Product design & development",
  "context": "own-product",
  "status": "live",
  "title": "A live management system for kiosks, convenience stores and small retailers.",
  "description": "Marfen is a management system for kiosks, convenience stores and small retailers. I designed and built it from scratch to centralize sales, inventory, cash management, purchases, suppliers, store credit and profitability. It is currently live and being used in a real retail operation while I continue iterating from direct user feedback.",
  "role": "Product strategy, product discovery, product design, architecture, full-stack development, and ongoing product evolution.",
  "url": "https://marfen.com.ar",
  "linkLabel": "Visit Marfen",
  "tags": []
}
```

### Español

```json
{
  "name": "Marfen",
  "category": "Diseño y desarrollo de producto",
  "context": "own-product",
  "status": "live",
  "title": "Un sistema de gestión en producción para kioscos, despensas y pequeños comercios.",
  "description": "Marfen es un sistema de gestión para kioscos, despensas y pequeños comercios. Lo diseñé y construí desde cero para centralizar ventas, stock, caja, compras, proveedores, fiados y rentabilidad. Actualmente está en producción y se utiliza en una operación comercial real, mientras sigo iterándolo a partir del feedback directo de usuarios.",
  "role": "Estrategia y descubrimiento de producto, diseño de producto, arquitectura, desarrollo full-stack y evolución continua del producto.",
  "url": "https://marfen.com.ar",
  "linkLabel": "Ver Marfen",
  "tags": []
}
```

El wording puede conservar las diferencias naturales de cada idioma, pero debe mantener estos hechos: Marfen es un sistema de gestión para pequeños comercios; fue diseñado y construido desde cero; está en producción; se usa en una operación comercial real; continúa evolucionando con feedback directo; y el trabajo cubrió ownership de producto, arquitectura y desarrollo full-stack.

## Renderizado y accesibilidad

- La card de Marfen seguirá renderizándose como un único `<a>` que envuelve su contenido completo.
- El enlace conservará `target="_blank"` y `rel="noopener noreferrer"`.
- El CTA visible será texto descriptivo (`Visit Marfen` / `Ver Marfen`) dentro del mismo enlace, sin crear un enlace anidado.
- `linkLabel` será opcional para no imponer un CTA a las otras cards.
- Se reutilizarán los tokens de color, tipografía, spacing y bordes existentes. El estilo nuevo será mínimo y limitado al CTA textual.
- No se agregará una imagen, badge, sección ni cambio de layout.

## Verificación

Los contratos deberán comprobar:

1. Ambos diccionarios conservan la misma estructura y tres items.
2. La primera card se llama `Marfen`, mantiene `context: "own-product"`, usa `status: "live"` y apunta exactamente a `https://marfen.com.ar`.
3. Los labels localizados son `Live` y `En producción`.
4. Los CTAs localizados son `Visit Marfen` y `Ver Marfen`.
5. El copy de la card contiene los hechos de producto live y no contiene las frases experimentales antiguas ni dominios antiguos de Marfen.
6. Las demás cards no cambian de contexto, estado, URL ni contenido.
7. `SelectedWorkItem` admite `linkLabel?: string` y `ProductCard` lo renderiza para el enlace externo.
8. Se mantienen el fallback estático de las cards sin URL y el contrato de seguridad del enlace externo.

Se ejecutarán los checks disponibles del proyecto: `pnpm test`, `pnpm check`, `pnpm build` y, si el entorno permite levantar el preview/navegador, una revisión visual rápida de `/` y `/es/` en desktop y mobile.
