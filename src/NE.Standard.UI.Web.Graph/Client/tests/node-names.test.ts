// What a node says to a screen reader and what it takes from its fields: a head mark is named once with the node's own name and
// carries its state apart from its words, a list row's cross is named by its row, and a value a field's own rules refuse stays the
// field's rather than reaching the document.

import assert from "node:assert/strict";
import test from "node:test";
import type { Icons, Tooltips, Urls } from "ne-standard-ui";
import type { NodeViewOptions } from "../src/nodes/node-view.ts";
import { FakeElement, FakeEvent, installFakeDom, real } from "./fake-dom.ts";

installFakeDom({ CSS: { escape: (text: string) => text }, getComputedStyle: () => ({ getPropertyValue: () => "" }) });

const { renderNode } = await import("../src/nodes/node-view.ts");

type Changed = { readonly pin: string; readonly value: unknown };

/** A node view's surroundings, the words written as `key|args` so a test reads which word and with what. */
function options(refused: ReadonlySet<string>, changed: Changed[]): NodeViewOptions {
    const write = (element: Element, attribute: string | null, key: string, args?: Readonly<Record<string, unknown>> | null): void => {
        const words = args === undefined || args === null ? key : `${key}|${JSON.stringify(args)}`;

        if (attribute === null)
            real<FakeElement>(element).textContent = words;
        else
            element.setAttribute(attribute, words);
    };

    return real<NodeViewOptions>({
        words: { text: (key: string) => key, format: (key: string) => key, write },
        names: { tooltip: "data-ui-tooltip", contextMenuUse: "data-ui-context-menu" },
        states: { setDisabled: () => {} },
        typeTitles: new Map(),
        icons: real<Icons>({ apply: () => {} }),
        readOnly: false,
        pinColor: () => "red",
        outputType: () => "text",
        isConnected: () => false,
        feedTitle: () => null,
        onValueChanged: (_nodeId: string, pin: string, value: unknown) => changed.push({ pin, value }),
        tooltips: real<Tooltips>({ show: () => {}, hide: () => {}, escape: (text: string) => text }),
        urls: real<Urls>({ isImageSource: () => false }),
        cloneEditor: (region: string) => FakeElement.of("ui-field", { "data-region": region }),
        setProperty: (component: Element, name: string, value: unknown) => {
            if (name === "Value")
                component.setAttribute("data-value", JSON.stringify(value ?? null));
            else if (name === "Enabled")
                component.setAttribute("data-enabled", String(value));
            else if (name === "IsReadOnly")
                component.setAttribute("data-readonly", String(value));
        },
        readValue: (component: Element) => JSON.parse(component.getAttribute("data-value") ?? "null") as unknown,
        isRefused: (component: Element) => refused.has(component.getAttribute("data-region") ?? "")
    });
}

const kind = {
    key: "sum",
    title: "Sum",
    inputs: [
        { name: "Name", title: "Name", type: "text", editor: "Text" as const },
        { name: "Count", title: "Count", type: "number", editor: "Number" as const },
        { name: "Parts", title: "Parts", type: "array:text", editor: "List" as const }
    ],
    outputs: [{ name: "Result", title: "Result", type: "number", editor: "None" as const }]
};

function render(refused: ReadonlySet<string> = new Set(), changed: Changed[] = [], collapsed = false, pinned = false): FakeElement {
    return real<FakeElement>(renderNode({ id: "n1", x: 0, y: 0, type: "sum", title: "Totals", collapsed, pinned, values: { Parts: ["a", "b"] } }, kind, options(refused, changed)));
}

function change(root: FakeElement, region: string, value: unknown): void {
    const field = root.querySelectorAll("[data-region]").find(candidate => candidate.getAttribute("data-region") === region);

    assert.ok(field !== undefined, `no field of ${region}`);
    field.setAttribute("data-value", JSON.stringify(value));
    field.dispatchEvent(new FakeEvent("change"));
}

test("a node's fold is named once with the node's name and carries its state on aria-expanded", () => {
    const open = render().querySelector("[data-ui-graph-fold]")!;
    const folded = render(new Set(), [], true).querySelector("[data-ui-graph-fold]")!;

    assert.equal(open.getAttribute("aria-label"), "ui.graph.node-contents|{\"node\":\"Totals\"}");
    assert.equal(folded.getAttribute("aria-label"), open.getAttribute("aria-label"));
    assert.equal(open.getAttribute("aria-expanded"), "true");
    assert.equal(folded.getAttribute("aria-expanded"), "false");
    // The tooltip still says what a press does.
    assert.equal(open.getAttribute("data-ui-tooltip"), "ui.graph.collapse");
    assert.equal(folded.getAttribute("data-ui-tooltip"), "ui.graph.expand");
});

test("a node's pin is named once with the node's name and carries its state on aria-pressed", () => {
    const loose = render().querySelector("[data-ui-graph-pin-toggle]")!;
    const pinned = render(new Set(), [], false, true).querySelector("[data-ui-graph-pin-toggle]")!;

    assert.equal(loose.getAttribute("aria-label"), "ui.graph.pin-node|{\"node\":\"Totals\"}");
    assert.equal(pinned.getAttribute("aria-label"), loose.getAttribute("aria-label"));
    assert.equal(loose.getAttribute("aria-pressed"), "false");
    assert.equal(pinned.getAttribute("aria-pressed"), "true");
});

test("a list row's cross is named by its row", () => {
    const crosses = render().querySelectorAll("[data-region]").filter(element => element.getAttribute("data-region") === "graph-list-remove");

    assert.deepEqual(crosses.map(cross => cross.getAttribute("aria-label")), [
        "ui.graph.remove-row|{\"index\":1,\"pin\":\"Parts\"}",
        "ui.graph.remove-row|{\"index\":2,\"pin\":\"Parts\"}"
    ]);
});

test("a value its field refuses stays the field's, and one it takes reaches the document", () => {
    const changed: Changed[] = [];
    const root = render(new Set(["graph-editor:sum:Count"]), changed);

    change(root, "graph-editor:sum:Count", 2.5);
    change(root, "graph-editor:sum:Name", "Kept");

    assert.deepEqual(changed, [{ pin: "Name", value: "Kept" }]);
});

test("a wired input's field is disabled, while an unwired one on a read-only sheet is read-only", () => {
    const base = options(new Set(), []);
    const root = real<FakeElement>(
        renderNode(
            { id: "n1", x: 0, y: 0, type: "sum", title: "Totals", values: {} },
            kind,
            { ...base, readOnly: true, isConnected: (_nodeId, pin, direction) => direction === "in" && pin === "Name" }
        )
    );
    const name = root.querySelectorAll("[data-region]").find(candidate => candidate.getAttribute("data-region") === "graph-editor:sum:Name")!;
    const count = root.querySelectorAll("[data-region]").find(candidate => candidate.getAttribute("data-region") === "graph-editor:sum:Count")!;

    assert.equal(name.getAttribute("data-enabled"), "false");
    assert.equal(name.getAttribute("data-readonly"), null);
    assert.equal(count.getAttribute("data-enabled"), null);
    assert.equal(count.getAttribute("data-readonly"), "true");
});
