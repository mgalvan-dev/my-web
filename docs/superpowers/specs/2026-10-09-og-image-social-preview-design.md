# Social Preview Image Design

## Goal

Make link previews for mgalvan.dev display a reliable 1200 × 630 image on X and Open Graph consumers, while keeping the existing dark visual identity and localized page metadata.

## Current State

The shared Home layout already emits absolute `og:image` and `twitter:image` URLs, `summary_large_image`, image alt text, and 1200 × 630 Open Graph dimensions. The English `/` and Spanish `/es/` routes already have localized title, description, canonical, locale, and alt metadata. The current public image is an SVG served successfully as `image/svg+xml`; its visible text is “Marco Galván” and “FULL STACK DEVELOPER”.

## Design

Keep the existing dark gradient and centered typographic composition. Update the image copy to “Marco Galván”, “Software Developer”, and “Software · Web · Automation”. Export one 1200 × 630 PNG as the public social image and use the same absolute URL for Open Graph and Twitter metadata across both Home locales. Retain localized titles, descriptions, locale tags, canonical URLs, and alt text in the English and Spanish dictionaries.

Use the same PNG in the CV layout so every route stops pointing at an SVG for social previews. Add the Open Graph width and height tags to the CV layout for parity. Keep the SVG as an editable source and do not add image-processing dependencies; use the existing Playwright installation to render the PNG.

## Verification

Update the repository SEO verifier to expect the PNG and check the shared Home metadata, localized fields, absolute image URLs, and dimensions in generated HTML. Run the project test suite, Astro build, and SEO verifier. Start a local preview and confirm the PNG responds with HTTP 200 and `image/png`. Confirm the exported PNG is exactly 1200 × 630. Do not push to the remote; after all checks pass, merge the feature branch into local `main`.

## Scope

This change is limited to the social image asset, metadata in the Home and CV layouts, SEO verification, and the asset reference in the README. It does not redesign the website or add runtime dependencies.
