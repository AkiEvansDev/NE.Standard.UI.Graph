// Read back from the compiled stylesheet: Run on the node canvas's run panel speaks in the theme's primary ink, which reads on the
// panel in both themes, and on a phone the map is a smaller box at the zoom bar's end, the corner it stands in counting it so; a
// chosen node wears a ring and a glow off its own edge, and a node's corners, its head's and its ring's are the canvas's own.

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

test("a chosen node wears a primary ring and glow off its edge, the ring saying chosen alone; a state is its edge, which chosen keeps", () => {
    const rule = (selector: string): string => {
        const at = css.indexOf(`\n${selector} {`);

        return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
    };

    // Chosen recolours nothing of the node's own: its edge stays the state's, or the plain border. It only stands over the rest.
    assert.match(rule(".ui-graph__node[data-ui-graph-selected]"), /^\n\.ui-graph__node\[data-ui-graph-selected\] \{\s*z-index: 1;\s*$/);
    assert.match(rule(".ui-graph__node[data-ui-graph-conflict]"), /border-color: var\(--ui-color-warning\);/);
    assert.match(rule(".ui-graph__node"), /--ui-action-bar-gap: 10px;/);

    // A plan target is its accent edge alone; in conflict, the warning's edge.
    const target = rule(".ui-graph__node[data-ui-graph-target]");

    assert.match(target, /border-color: var\(--ui-color-accent-ink\);/);
    assert.match(rule(".ui-graph__node[data-ui-graph-conflict][data-ui-graph-target]"), /border-color: var\(--ui-color-warning\);/);

    // The only glow is the chosen ring's: no state draws a shadow of its own.
    const glows = [...css.matchAll(/([^{}]+)\{[^}]*box-shadow: 0 0 10px[^}]*\}/g)].map(match => match[1].trim());

    assert.deepEqual(glows, [".ui-graph__node[data-ui-graph-selected]::after"]);
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

test("the corner menu is a folding panel over the leading corner, as the plan is over the trailing one, folded on a phone", () => {
    const rule = (selector: string): string => {
        const at = css.indexOf(`\n${selector} {`);

        return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
    };
    const panel = rule(".ui-graph .ui-graph__menu-panel");
    const plan = rule(".ui-graph .ui-graph__plan");

    // One panel's look for both, from the same mixin: placed at its own side, on the surface, framed as a card.
    assert.match(panel, /position: absolute;\s*left: 0\.5rem;\s*z-index: 3;\s*flex-direction: column;\s*width: var\(--ui-graph-menu-width\);/);
    assert.match(plan, /position: absolute;\s*right: 0\.5rem;\s*z-index: 3;\s*flex-direction: column;\s*width: var\(--ui-graph-plan-width\);/);

    for (const shared of [/border: var\(--ui-border-width\) solid var\(--ui-color-border\);/, /border-radius: var\(--ui-radius-card\);/, /background: var\(--ui-color-surface\);/]) {
        assert.match(panel, shared);
        assert.match(plan, shared);
    }

    // Open it ends above the canvas's foot; folded a long name stops at the open panel's width.
    assert.match(panel, /top: 0\.5rem;/);
    assert.match(panel, /max-width: min\(var\(--ui-graph-menu-width\), calc\(100% - 2 \* 0\.5rem\)\);/);
    assert.match(panel, /max-height: calc\(100% - 2 \* 0\.5rem - var\(--ui-graph-foot-height\)\);/);
    assert.match(css, /\.ui-graph\[data-ui-graph-run-progress\] \.ui-graph__menu-panel \{\s*top: calc\(var\(--ui-graph-run-height\) \+ 0\.5rem\);/);
    // Folded, the body goes and the switch stays, as the plan's.
    assert.match(css, /\.ui-graph \.ui-graph__menu-panel\[data-ui-collapsed\]:not\(\[data-ui-folding\]\) > \.ui-graph__menu-panel-body \{\s*display: none;/);

    // On a phone both start folded, which side-panel.ts reads.
    const phone = [...css.matchAll(/@media \(max-width: 767\.98px\) \{([^@]*?)\n\}/g)].map(match => match[1]).join("");

    assert.match(phone, /\.ui-graph \.ui-graph__menu-panel \{\s*--ui-graph-side-folded: 1;/);
    assert.match(phone, /\.ui-graph \.ui-graph__plan \{\s*--ui-graph-side-folded: 1;/);

    // The word for the menu stands only beside an empty name.
    assert.match(css, /\.ui-graph__menu-panel-name:empty,\s*\.ui-graph__menu-panel-name:not\(:empty\) \+ \.ui-graph__menu-panel-word \{\s*display: none;/);
    // Nothing of the popup menu button it was.
    assert.doesNotMatch(css, /\.ui-graph__menu-panel[^{]*\.ui-split-button/);
});

test("a chosen node's ring is 1px, 2px off its edge whatever the edge's width, under its pins and contents", () => {
    const rule = (selector: string): string => {
        const at = css.indexOf(`\n${selector} {`);

        return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
    };
    // Every rule of the node's own, wherever a stylesheet of the package writes one.
    const node = [...css.matchAll(/\n\.ui-graph__node \{([^}]*)\}/g)].map(match => match[1]).join("");
    const ring = rule(".ui-graph__node[data-ui-graph-selected]::after");

    // The node's border is never widened: that would narrow its contents and move its pins.
    assert.match(node, /border: var\(--ui-graph-node-border\) solid var\(--ui-color-border\);/);
    assert.match(node, /--ui-graph-node-chosen-gap: 2px;/);
    assert.match(node, /isolation: isolate;/);
    assert.match(ring, /inset: calc\(-1 \* \(var\(--ui-graph-node-border\) \+ var\(--ui-graph-node-chosen-gap\) \+ 1px\)\);/);
    assert.match(ring, /z-index: -1;/);
    assert.match(ring, /border: 1px solid var\(--ui-mark-selected-fill\);/);
    assert.match(ring, /border-radius: min\(var\(--ui-graph-node-radius-tl\) \* 1000, var\(--ui-graph-node-radius-tl\) \+ var\(--ui-graph-node-chosen-gap\) \+ 1px\) /);
    assert.match(ring, /box-shadow: 0 0 10px 0 color-mix\(in srgb, var\(--ui-mark-selected-fill\) 55%, transparent\);/);
    assert.match(ring, /pointer-events: none;/);
    // Raised within the node layer's own stack, never over the marquee or a caption's field beside it.
    assert.match(rule(".ui-graph__nodes"), /isolation: isolate;/);
    // A circle's own edge is wider, and the ring stands off it.
    assert.match(rule(".ui-graph__bubble"), /--ui-graph-node-border: 2px;\s*--ui-graph-node-radius: 50%;/);
    assert.match(css.slice(css.indexOf("@media (forced-colors: active)")), /\.ui-graph__node\[data-ui-graph-selected\]::after \{\s*display: none;/);
});

test("a pulled wire is the node canvas's on every canvas: the line's 2px in its pin's colour, dashed, never lit", () => {
    // Dashed alone, over the line's own stroke: 2px in the pin's colour.
    assert.match(/\n\s*\.ui-graph__edge-line--pending \{([^}]*)\}/.exec(css)?.[1] ?? "", /^\s*stroke-dasharray: 6 4;\s*$/);
    assert.match(/\n\.ui-graph__edge-line \{([^}]*)\}/.exec(css)?.[1] ?? "", /stroke: var\(--ui-graph-pin-color\);\s*stroke-width: 2;/);
    // No kind's own pulled wire: neither thicker, lit nor lifted toward white.
    assert.equal([...css.matchAll(/([^{}]*\.ui-graph__edge-line--pending[^{}]*)\{/g)].length, 2);
    assert.doesNotMatch(css, /data-ui-graph-kind[^{]*\.ui-graph__edge-line--pending/);
    // A pull starts on a chosen node, whose focus dims every other line: the wire in hand stays whole.
    assert.match(/\n\.ui-graph--edge-focus \.ui-graph__edge-line--pending \{([^}]*)\}/.exec(css)?.[1] ?? "", /^\s*opacity: 1;\s*$/);
});

test("the parameters stand beside the canvas in a column of their own; nothing of them stands over the sheet", () => {
    const rule = (selector: string): string => {
        const at = css.indexOf(`\n${selector} {`);

        return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
    };
    const column = rule(".ui-graph-parameters");

    // A card in the page's flow, scrolling its rows; not a panel over the sheet.
    assert.match(column, /flex-direction: column;/);
    assert.match(column, /overflow: hidden auto;/);
    assert.doesNotMatch(column, /position|z-index/);
    assert.doesNotMatch(css, /ui-graph__parameters[\s,{]|ui-graph__parameters-(toggle|icon|chevron|body)|ui-graph__lead|--ui-graph-lead-top|data-ui-graph-parameters\]/);
    // The corner menu stands alone in its corner, under the run line where there is one; the plan over the trailing side.
    assert.match(rule(".ui-graph .ui-graph__menu-panel"), /position: absolute;\s*left: 0\.5rem;/);
    assert.match(css, /\.ui-graph\[data-ui-graph-run-progress\] \.ui-graph__menu-panel \{\s*top: calc\(var\(--ui-graph-run-height\) \+ 0\.5rem\);/);
    assert.match(rule(".ui-graph .ui-graph__plan"), /position: absolute;\s*right: 0\.5rem;/);
});

test("a node's corners are the canvas's NodeCornerRadius a corner each, and its head, chosen ring and folded run line follow them", () => {
    const rule = (selector: string): string => {
        const at = css.indexOf(`\n${selector} {`);

        return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
    };
    const corners = ["tl", "tr", "br", "bl"];
    // Every rule of the node's own, wherever a stylesheet of the package writes one.
    const node = [...css.matchAll(/\n\.ui-graph__node \{([^}]*)\}/g)].map(match => match[1]).join("");

    // The renderer's variable over the shape's own corner, which is the theme's card radius unless a shape says otherwise.
    assert.match(node, /--ui-graph-node-radius: var\(--ui-radius-card\);/);

    const declares = (text: string, declaration: string): void => assert.ok(text.includes(declaration), `No "${declaration}" in: ${text}`);

    for (const corner of corners)
        declares(node, `--ui-graph-node-radius-${corner}: var(--ui-graph-node-corner-${corner}, var(--ui-graph-node-radius));`);

    declares(node, `border-radius: ${corners.map(corner => `var(--ui-graph-node-radius-${corner})`).join(" ")};`);

    // The ring grows each corner by its gap and line, a square one staying square; the head's are the node's less its edge, never
    // below square, so no rounded inner corner stands out of a square node.
    const inner = (corner: string): string => `max(0px, var(--ui-graph-node-radius-${corner}) - var(--ui-graph-node-border))`;
    const grown = (corner: string): string => `min(var(--ui-graph-node-radius-${corner}) * 1000, var(--ui-graph-node-radius-${corner}) + var(--ui-graph-node-chosen-gap) + 1px)`;

    declares(rule(".ui-graph__node[data-ui-graph-selected]::after"), `border-radius: ${corners.map(grown).join(" ")};`);
    declares(rule(".ui-graph__node-head"), `border-radius: ${inner("tl")} ${inner("tr")} 0 0;`);
    declares(rule(".ui-graph__node[data-ui-graph-collapsed] > .ui-graph__node-head"), `border-radius: ${corners.map(inner).join(" ")};`);
    assert.match(rule(".ui-graph__node[data-ui-graph-collapsed] .ui-graph__node-progress"), /left: var\(--ui-graph-node-radius-bl\);\s*right: var\(--ui-graph-node-radius-br\);/);

    // A reroute's smaller corner is its shape's, so the canvas's radius and the ring reach it too; it rounds no border of its own.
    const reroute = rule(".ui-graph__node--compact");

    assert.match(reroute, /--ui-graph-node-radius: var\(--ui-radius-button\);/);
    assert.doesNotMatch(reroute, /border-radius/);

    // Nothing of a node's own reads the theme's card radius past the shape's variable.
    const nodeRules = [...css.matchAll(/([^{}]*\.ui-graph__node[^{}]*)\{([^}]*)\}/g)];

    assert.deepEqual(nodeRules.filter(match => match[2].includes("--ui-radius-card")).map(match => match[1].trim()), [".ui-graph__node"]);
});

test("a group's frame takes the node canvas's corners a corner each, else the card's, and its halo and band round nothing of their own", () => {
    const rules = (selector: string): string => [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(match => match[1].trim() === selector).map(match => match[2]).join("");
    const corners = ["tl", "tr", "br", "bl"].map(corner => `var(--ui-graph-node-corner-${corner}, var(--ui-radius-card))`).join(" ");

    assert.ok(rules(".ui-graph__group").includes(`border-radius: ${corners};`), rules(".ui-graph__group"));
    // A spread shadow follows the frame's corners, a square one staying square; the band inside paints no ground to round.
    assert.match(rules(".ui-graph__group[data-ui-graph-selected]"), /box-shadow: 0 0 0 2px /);
    assert.doesNotMatch(rules(".ui-graph__group[data-ui-graph-selected]") + rules(".ui-graph__group-band"), /border-radius|background/);
});

test("a node's and a group's frame's resize corner are one rule of the canvas's, kept in forced colours", () => {
    const rules = (selector: string): string => [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(match => match[1].trim() === selector).map(match => match[2]).join("");

    assert.match(rules(".ui-graph__resize"), /position: absolute;\s*right: -0\.25rem;\s*bottom: -0\.25rem;\s*width: 1\.125rem;\s*height: 1\.125rem;\s*cursor: nwse-resize;/);
    assert.doesNotMatch(css, /node-resize|group-resize/);

    const forced = css.slice(css.indexOf("@media (forced-colors: active)"));

    assert.match(forced, /\.ui-graph__resize \{[^}]*--ui-graph-resize-ink: CanvasText/);
    assert.match(forced, /\.ui-graph__resize::after \{[^}]*forced-color-adjust: none/);
    // Held, it keeps the pointer's ink: the viewport's capture takes the hover off it.
    assert.match(rules(".ui-graph__resize[data-ui-graph-resizing]"), /--ui-graph-resize-ink: color-mix\(/);
});

test("one value per meaning: out of play, the glass over the canvas, the chosen halo and a node's own tint are each one", () => {
    const bodies = (selector: string): string => [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(match => match[1].trim() === selector).map(match => match[2]).join("");
    const share = (selector: string, pattern: RegExp): string => pattern.exec(bodies(selector))?.[1] ?? assert.fail(`${selector} has no ${pattern}`);
    const one = (values: string[]): void => assert.equal(new Set(values).size, 1, values.join(" | "));

    // A node or a pin a pulled link cannot land on, a node off for a run, a node a failure skipped: one step back.
    one([
        '.ui-graph__node[data-ui-graph-state="skipped"]',
        ".ui-graph__node[data-ui-graph-off]",
        '.ui-graph--connecting .ui-graph__node[data-ui-graph-drop="no"]',
        '.ui-graph--connecting .ui-graph__pin[data-ui-graph-drop="no"]'
    ].map(selector => share(selector, /opacity: ([^;]+);/)));

    one([".ui-graph__minimap", ".ui-graph__editor[data-ui-graph-uploading]::after", ".ui-graph__run"].map(selector => share(selector, /background: ([^;]+);/)));
    one(['.ui-graph__group[data-ui-graph-selected]', '.ui-graph--connecting .ui-graph__node[data-ui-graph-drop="yes"]'].map(selector => share(selector, /box-shadow: ([^;]+);/)));
    one([".ui-graph__node-head", ".ui-graph__node--compact", ".ui-graph__bubble-face"].map(selector => share(selector, /background: ([^;]+);/)));

    // The marquee is a faint brand tint, not the chosen wash (a grey block on the dark theme); a swatch's ring the core colour input's edge; the caption's chip a focused field's edge.
    assert.match(bodies(".ui-graph__marquee"), /background: color-mix\(in srgb, var\(--ui-mark-selected-fill\) 10%, transparent\);/);
    assert.match(bodies(".ui-graph .ui-menu-item[data-ui-graph-swatch]::before"), /border: var\(--ui-border-width\) solid var\(--ui-color-border\);/);
    assert.match(bodies(".ui-graph__caption-edit"), /border-color: var\(--ui-mark-field\);\s*box-shadow: inset 0 0 0 var\(--ui-input-focus-ring, 1px\) var\(--ui-mark-field\);/);
});
