// Read back from the compiled stylesheet: Run on the node canvas's run panel speaks in the theme's primary ink, which reads on the
// panel in both themes, and on a phone the map is a smaller box at the zoom bar's end, the corner it stands in counting it so.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import less from "less";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../src/styles/ui-graph.less");
const css = (await less.render(readFileSync(source, "utf8"), { filename: source })).css;

test("Run speaks in the theme's primary ink, not the brand's fill", () => {
    const run = /\.ui-graph__run-panel > \[data-ui-graph-run-once\]:not\(\[aria-disabled='true'\]\) \{([^}]*)\}/.exec(css)?.[1] ?? "";

    assert.match(run, /color: var\(--ui-color-primary-ink\);/);
});

test("on a phone the map is a smaller box, and the corner counts it at that height", () => {
    const phone = /@media \(max-width: 639\.98px\) \{([\s\S]*?)\n\}/.exec(css.slice(css.indexOf(".ui-graph__minimap {")))?.[1] ?? "";

    assert.match(phone, /\.ui-graph__minimap \{\s*width: 6rem;\s*height: 4rem;/);
    assert.match(phone, /--ui-graph-corner-height: calc\([^;]*4rem[^;]*\);/);
});
