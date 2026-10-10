// Read back from the compiled stylesheet: Run on the node canvas's run panel speaks in the theme's primary ink, which reads on the
// panel in both themes, and on a phone the map is a smaller box at the zoom bar's end, the corner it stands in counting it so; a
// chosen node wears its own edge and a glow.

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

test("a chosen node wears its own edge and a primary glow, the glow saying chosen alone; a state is its edge, never a ring off it", () => {
    const rule = (selector: string): string => {
        const at = css.indexOf(`\n${selector} {`);

        return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
    };
    const chosen = rule(".ui-graph__node[data-ui-graph-selected]");

    assert.match(chosen, /border-color: var\(--ui-color-primary\);/);
    assert.match(chosen, /box-shadow: 0 0 12px 1px color-mix\(in srgb, var\(--ui-color-primary\) 55%, transparent\);/);
    assert.match(rule(".ui-graph__node[data-ui-graph-conflict]"), /border-color: var\(--ui-color-warning\);/);
    assert.match(rule(".ui-graph__node"), /--ui-action-bar-gap: 10px;/);

    // A plan target is its accent edge alone; in conflict, the warning's edge. Chosen, either keeps its edge under the glow.
    const target = rule(".ui-graph__node[data-ui-graph-target]");

    assert.match(target, /border-color: var\(--ui-color-accent-ink\);/);
    assert.match(rule(".ui-graph__node[data-ui-graph-conflict][data-ui-graph-target]"), /border-color: var\(--ui-color-warning\);/);

    // The only glow is the chosen one's: no state draws a shadow of its own, nor recolours the chosen one.
    const glows = [...css.matchAll(/([^{}]+)\{[^}]*box-shadow: 0 0 12px[^}]*\}/g)].map(match => match[1].trim());

    assert.deepEqual(glows, [".ui-graph__node[data-ui-graph-selected]"]);
    assert.doesNotMatch(css, /\[data-ui-graph-(state|conflict|target)[^{]*\{[^}]*box-shadow/);

    const screen = css.slice(0, css.indexOf("@media (forced-colors: active)"));

    assert.doesNotMatch(screen, /\.ui-graph__node\[data-ui-graph-(selected|conflict|target)\][^{]*\{[^}]*outline/);
});

test("in forced colours a chosen node is a plain outline on its edge, a plan target a double one", () => {
    const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
    const chosen = /\.ui-graph__node\[data-ui-graph-selected\],\s*\.ui-graph__group\[data-ui-graph-selected\] \{([^}]*)\}/.exec(forced)?.[1] ?? "";

    assert.match(chosen, /outline: 2px solid Highlight;\s*outline-offset: 0;/);
    assert.match(forced, /\.ui-graph__node\[data-ui-graph-target\] \{\s*outline: 3px double CanvasText;\s*outline-offset: 0;/);
});

test("the corner menu's switch is one square folded and open, first in its head, its name the core bar's gap past it", () => {
    const rule = (selector: string): string => {
        const at = css.indexOf(`${selector} {`);

        return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
    };
    const toggle = rule(".ui-graph__menu-panel > .ui-menu > .ui-collapsible__bar > .ui-collapsible__toggle");
    const folded = rule(".ui-graph__menu-panel > .ui-menu[data-ui-collapsed]:not([data-ui-folding]) > .ui-collapsible__bar > .ui-collapsible__toggle");

    assert.match(toggle, /order: -1;/);
    assert.match(toggle, /width: calc\(1\.75rem \+ 2 \* 0\.25rem\);\s*height: calc\(1\.75rem \+ 2 \* 0\.25rem\);/);
    assert.match(toggle, /margin-block: -0\.25rem;\s*margin-inline-start: -0\.25rem;/);
    assert.match(folded, /margin: 0;/);
    assert.match(rule(".ui-graph__menu-panel > .ui-menu[data-ui-collapsed]:not([data-ui-folding])"), /padding: 0;/);
    // The head keeps the core bar's own gap and row: no reversed row, no gap of the package's.
    assert.doesNotMatch(css, /\.ui-graph__menu-panel > \.ui-menu > \.ui-collapsible__bar \{[^}]*(flex-direction|gap)/);
});
