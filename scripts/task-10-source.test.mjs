import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const readSource = (relativePath) =>
    readFile(join(root, relativePath), "utf8");

test("navigation summary and links expose 44px touch targets", async () => {
    const source = await readSource("src/components/navbar/navbar.module.css");

    assert.match(
        source,
        /\.menu_toggle\s*\{[\s\S]*?min-height:\s*44px[\s\S]*?\}/,
        "the native details summary needs a 44px touch target",
    );
    assert.match(
        source,
        /\.link,\s*\n\.language_link,\s*\n\.cta_link\s*\{[\s\S]*?min-height:\s*44px[\s\S]*?\}/,
        "navigation links need 44px touch targets",
    );
    assert.match(
        source,
        /\.link,\s*\n\.language_link,\s*\n\.cta_link\s*\{[\s\S]*?min-width:\s*44px[\s\S]*?\}/,
        "navigation links need 44px-wide touch targets",
    );
});

test("header and footer interactive brands and links keep 44px targets", async () => {
    const header = await readSource("src/components/header/header.module.css");
    const footer = await readSource("src/components/footer/footer.module.css");

    assert.match(
        header,
        /\.brand\s*\{[\s\S]*?min-height:\s*44px[\s\S]*?\}/,
        "the header brand should remain an easy-to-tap home link",
    );
    assert.match(
        footer,
        /\.navigation a,\s*\n\.links a\s*\{[\s\S]*?display:\s*inline-flex[\s\S]*?min-height:\s*44px[\s\S]*?\}/,
        "footer links need an explicit 44px interactive area",
    );
    assert.match(
        footer,
        /\.brand\s*\{[\s\S]*?min-height:\s*44px[\s\S]*?\}/,
        "the footer brand should remain an easy-to-tap home link",
    );
});

test("Services V1 module grids retain narrow one-column fallbacks", async () => {
    const files = [
        "src/components/capabilities/capabilities.module.css",
        "src/components/featured/featured.module.css",
        "src/components/marfen-case/marfen-case.module.css",
        "src/components/professional-case/professional-case.module.css",
        "src/components/contact-cta/contact-cta.module.css",
    ];

    for (const file of files) {
        const source = await readSource(file);
        assert.match(
            source,
            /@media\s*\(width\s*<=\s*(?:700|800)px\)[\s\S]*?grid-template-columns:\s*1fr/,
            `${file} should collapse its main grid at a narrow breakpoint`,
        );
    }
});
