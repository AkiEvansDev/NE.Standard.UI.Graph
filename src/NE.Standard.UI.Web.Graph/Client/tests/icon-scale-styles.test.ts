// The package's icon sizes read back from its compiled stylesheet: each a step of the framework's icon scale, `1em` of the words
// beside it, or another whole pixel — never a fraction of its text, where the icon fonts round their ascent and stand the glyph
// off its middle (1.25em of a 14px body stood an icon at 17.5px).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import less from "less";

const here = dirname(fileURLToPath(import.meta.url));
const sources = ["../src/styles/ui-graph.less"];
const css = (await Promise.all(sources.map(async source => {
    const path = resolve(here, source);

    return (await less.render(readFileSync(path, "utf8"), { filename: path })).css;
}))).join("\n");
const Rem = 16;

test("no icon is sized as a fraction of its text: an em is a whole one, a rem or a pixel a whole pixel", () => {
    let checked = 0;

    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = match[1].trim();
        const body = match[2];
        const size = /(?:^|;)\s*font-size: ([^;]+);/.exec(body)?.[1];

        if (size === undefined || !(/icon|glyph|chevron/.test(selector) || body.includes('font-family: "NE Glyphs"')))
            continue;

        checked++;

        for (const [, amount, unit] of size.matchAll(/(\d*\.?\d+)(em|rem|px)\b/g)) {
            if (unit === "em")
                assert.equal(Number(amount), 1, `${selector}: font-size ${size}`);
            else
                assert.ok(Number.isInteger(Number(amount) * (unit === "rem" ? Rem : 1)), `${selector}: font-size ${size}`);
        }
    }

    assert.ok(checked > 0, "no icon rule found");
});
