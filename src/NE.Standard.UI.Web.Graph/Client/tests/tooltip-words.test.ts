// A name — a node's, a resource's, a pin's or its type's — reads as written in the page's tooltip, which reads its words as inline
// markup: the words composed of such a name are escaped, while a node's or a craft's own tooltip stays the application's markup.

import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Icons, Tooltips, Urls } from "ne-standard-ui";
import type { NodeViewOptions } from "../src/nodes/node-view.ts";
import { FakeElement, FakeEvent, installFakeDom, real } from "./fake-dom.ts";

installFakeDom({ CSS: { escape: (text: string) => text }, getComputedStyle: () => ({ getPropertyValue: () => "" }) });

const { renderCard } = await import("../src/graph/card-view.ts");
const { renderCraft } = await import("../src/production/craft-view.ts");
const { PlanPanel } = await import("../src/production/plan-panel.ts");
const { renderNode } = await import("../src/nodes/node-view.ts");

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const markup = resolve(repository, "src/Platforms/Web/NE.Standard.UI.Web/Client/src/rendering/inline-markup.ts");
const { escapeInlineMarkup, inlineMarkupToPlainText } = await import(pathToFileURL(markup).href) as {
    readonly escapeInlineMarkup: (text: string) => string;
    readonly inlineMarkupToPlainText: (text: string) => string;
};

// A name a viewer could type, which read as markup would lose its stars and turn into a link.
const Named = "*Ore* [x](https://example.test)";

/** The page's tooltip as the plugin surface hands it over, keeping the words it was last shown. */
function recordingTooltips(): { readonly tooltips: Tooltips; readonly shown: () => string } {
    let shown = "";
    const tooltips = real<Tooltips>({
        show: (_target: Element, words: string) => {
            shown = words;
        },
        hide: () => {},
        escape: escapeInlineMarkup
    });

    return { tooltips, shown: () => shown };
}

function hover(element: HTMLElement): void {
    real<FakeElement>(element).dispatchEvent(new FakeEvent("pointerenter"));
}

function node(title: string, tooltip: string | null) {
    return { id: "ore", title, subtitle: null, icon: null, image: null, shape: "icon" as const, color: null, badge: null, tooltip, links: [] };
}

function resource(id: string, title: string) {
    return { kind: "resource" as const, id, title, icon: null, color: null, tooltip: null, image: null, category: null, unit: null, cost: null };
}

function craft(tooltip: string | null) {
    return { kind: "craft" as const, id: "smelt", title: null, icon: null, color: null, tooltip, ingredients: [{ resource: "ore", amount: 1 }], products: [{ resource: "ingot", amount: 2 }], time: 2 };
}

function cardOptions(tooltips: Tooltips) {
    return { icons: real<Icons>({ apply: () => {} }), tooltips, urls: real<Urls>({ isImageSource: () => false }), shape: "icon" as const, connectable: false, conflict: null };
}

function craftOptions(tooltips: Tooltips) {
    const resources = new Map([["ore", resource("ore", Named)], ["ingot", resource("ingot", "Ingot")]]);

    return { tooltips, word: "Recipe", connectable: false, conflict: null, resource: (id: string) => resources.get(id), number: (value: number) => String(value) };
}

test("a circle's title the viewer gave reads as written in its tooltip", () => {
    const { tooltips, shown } = recordingTooltips();

    hover(renderCard({ id: "ore", x: 0, y: 0 }, node(Named, null), cardOptions(tooltips)));

    assert.equal(inlineMarkupToPlainText(shown()), Named);
});

test("a node's own tooltip stays the application's markup", () => {
    const { tooltips, shown } = recordingTooltips();

    hover(renderCard({ id: "ore", x: 0, y: 0 }, node(Named, "**Mined** ore"), cardOptions(tooltips)));

    assert.equal(shown(), "**Mined** ore");
});

test("a craft's words read a resource's name as written", () => {
    const { tooltips, shown } = recordingTooltips();

    hover(renderCraft({ id: "smelt", x: 0, y: 0 }, craft(null), craftOptions(tooltips)));

    assert.equal(inlineMarkupToPlainText(shown()), `×1 ${Named} → ×2 Ingot`);
});

test("a craft's own tooltip stays the application's markup", () => {
    const { tooltips, shown } = recordingTooltips();

    hover(renderCraft({ id: "smelt", x: 0, y: 0 }, craft("**Smelts** ore"), craftOptions(tooltips)));

    assert.equal(shown(), "**Smelts** ore");
});

/** The words a reroute's way in says on the pointer, its pin named `__init__` — an underline, read as markup — over a value of `type`. */
function pinWords(type: string, typeTitles: ReadonlyMap<string, string>): string {
    const { tooltips, shown } = recordingTooltips();
    const templates: Readonly<Record<string, string>> = { "ui.graph.pin-type": "{name} ({type})" };
    const options = real<NodeViewOptions>({
        words: { text: (key: string) => key, format: (key: string, values: Readonly<Record<string, string>>) => (templates[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? "") },
        names: { contextMenuUse: "data-ui-context-menu" },
        tooltips,
        typeTitles,
        pinColor: () => "red",
        outputType: () => type,
        isConnected: () => false,
        feedTitle: () => null
    });
    const pin = { name: "value", title: "__init__", type, editor: "None" as const, description: "**Kept** as written" };
    const root = renderNode({ id: "reroute", x: 0, y: 0, type: "reroute", values: {} }, { key: "reroute", title: "Reroute", compact: true, inputs: [pin], outputs: [{ ...pin, name: "out" }] }, options);

    hover(real(real<FakeElement>(root).querySelectorAll("[data-ui-graph-pin]").find(mark => mark.getAttribute("data-ui-graph-pin-dir") === "in")));

    return shown();
}

test("a pin's name and its type's read as written in the pin's tooltip, the pin's own line as the application's markup", () => {
    const enumWords = pinWords("enum:__Kind__", new Map());
    const classWords = pinWords("shape", new Map([["shape", "Shape *of* x"]]));

    assert.equal(inlineMarkupToPlainText(enumWords), "__init__ (__Kind__)\nKept as written");
    assert.ok(enumWords.endsWith("\n**Kept** as written"));
    assert.equal(inlineMarkupToPlainText(classWords), "__init__ (Shape *of* x)\nKept as written");
});

test("a plan's row names its item as written in the tooltip its attribute carries", () => {
    const { tooltips } = recordingTooltips();
    const targets = FakeElement.of("", { "data-ui-graph-plan-targets": "" });
    const root = FakeElement.of("ui-graph").append(FakeElement.of("", { "data-ui-graph-plan": "" }).append(targets));
    const services = {
        root,
        settings: { readOnly: false },
        context: {
            names: { tooltip: "data-ui-tooltip" },
            tooltips,
            icons: { apply: () => {} },
            numbers: { readCulture: () => null, format: (value: number) => String(value) },
            store: { read: () => null, write: () => {} },
            strings: { text: (key: string) => key, format: (key: string) => key },
            properties: { set: () => true }
        }
    };
    const host = {
        request: () => ({ targets: [{ resource: "ore", amount: 5 }], period: "Once", objective: "LeastRaw" }),
        reading: () => null,
        failure: () => null,
        resource: (id: string) => (id === "ore" ? resource("ore", Named) : undefined),
        craft: () => undefined,
        change: () => {},
        target: () => {},
        pick: () => {},
        show: () => {}
    };

    new PlanPanel(real(services), real(host)).draw("one");

    assert.equal(inlineMarkupToPlainText(targets.querySelector("[data-ui-graph-plan-item]")!.getAttribute("data-ui-tooltip")!), Named);
});
