// The sheet's parameters in a column beside the canvas (`NodesParametersComponent`), over a stand-in DOM: the rows go into the column
// aimed at the canvas by its id, wherever it stands on the page and however often it is drawn again; a canvas no column is aimed at
// writes nothing and offers no parameter.

import assert from "node:assert/strict";
import test from "node:test";
import { FakeElement, FakeEvent, fakeDocument, installFakeDom, real } from "./fake-dom.ts";
import { NodesParameters } from "../src/nodes/nodes-parameters.ts";
import type { CanvasServices } from "../src/canvas/canvas-kind.ts";
import type { GraphDocument, NodeType } from "../src/nodes/model.ts";

installFakeDom({ CSS: { escape: (value: string) => value } });

const fieldsType: NodeType = {
    key: "Fields",
    title: "Fields",
    inputs: [{ name: "Amount", title: "Amount", type: "number", editor: "Number", defaultValue: 1 }],
    outputs: [{ name: "Result", title: "Result", type: "number", editor: "None" }]
};

type Stage = {
    readonly parameters: NodesParameters;
    readonly canvas: FakeElement;
    readonly document: GraphDocument;
    readonly values: Map<FakeElement, Record<string, unknown>>;
    readonly edits: { count: number };
    settings: { readOnly: boolean };
};

/** A node canvas of id 7 with two nodes, the second's amount set out as a parameter; the page holds what `page` puts on it. */
function stage(...page: FakeElement[]): Stage {
    const canvas = FakeElement.of("ui-graph", { "data-ui-id": "7" });
    const document: GraphDocument = {
        nodes: [
            { id: "a", type: "Fields", x: 0, y: 0, title: null, color: null, pinned: false, values: { Amount: 5 } },
            { id: "b", type: "Fields", x: 200, y: 0, title: "Rate", color: null, pinned: false, values: { Amount: 7 } }
        ],
        edges: [],
        groups: [],
        key: null,
        parameters: [{ node: "b", pin: "Amount" }]
    };
    const values = new Map<FakeElement, Record<string, unknown>>();
    const edits = { count: 0 };
    const settings = { readOnly: false };

    fakeDocument.body.children.length = 0;
    fakeDocument.body.append(canvas, ...page);
    fakeDocument.activeElement = null;

    const services = {
        root: canvas,
        settings,
        documentState: {
            document,
            edited: () => {
                edits.count++;
            }
        },
        context: {
            root: fakeDocument.body,
            names: { componentId: "data-ui-id", tooltip: "data-ui-tooltip" },
            strings: { write: () => undefined },
            focus: { first: () => null },
            properties: {
                set: (element: FakeElement, name: string, value: unknown) => {
                    values.set(element, { ...values.get(element), [name]: value });
                }
            }
        }
    };
    const parameters = new NodesParameters(real<CanvasServices<GraphDocument>>(services), {
        types: new Map([[fieldsType.key, fieldsType]]),
        setValue: () => undefined,
        readValue: () => null,
        show: () => undefined,
        cloneEditor: () => real(new FakeElement())
    });

    return { parameters, canvas, document, values, edits, settings };
}

/** A column as `NodesParametersComponentRenderer` draws one, aimed at the canvas of the given id. */
function column(target: string): FakeElement {
    return FakeElement.of("ui-graph-parameters", { "data-ui-graph-parameters-for": target }, "section").append(
        FakeElement.of("ui-graph__parameters-list", { "data-ui-graph-parameters-list": "" }),
        FakeElement.of("ui-graph__parameters-empty", {}, "p")
    );
}

function rows(panel: FakeElement): FakeElement[] {
    return panel.querySelector("[data-ui-graph-parameters-list]")!.children;
}

test("the rows go into the column aimed at the canvas, not into one aimed at another", () => {
    const mine = column("7");
    const other = column("8");
    const page = stage(other, mine);

    page.parameters.draw();

    assert.equal(page.parameters.shown, true);
    assert.equal(rows(mine).length, 1);
    assert.equal(rows(mine)[0].querySelector(".ui-graph__parameter-node")!.textContent, "Rate");
    assert.equal(rows(other).length, 0);
    assert.equal(page.parameters.allows("a", "Amount"), true);
});

test("a canvas no column is aimed at writes nothing and offers no parameter", () => {
    const other = column("8");
    const page = stage(other);

    page.parameters.draw();

    assert.equal(page.parameters.shown, false);
    assert.equal(rows(other).length, 0);
    assert.equal(page.parameters.allows("a", "Amount"), false);
});

test("a column drawn again takes the rows anew, and its remove takes the parameter back once", () => {
    const first = column("7");
    const page = stage(first);

    page.parameters.draw();
    first.remove();

    const again = column("7");

    fakeDocument.body.append(again);
    page.parameters.draw();
    assert.equal(rows(again).length, 1);

    const remove = rows(again)[0].querySelector("[data-ui-graph-parameter-remove]")!;

    remove.focus();
    remove.dispatchEvent(new FakeEvent("click"));

    assert.deepEqual(page.document.parameters, []);
    assert.equal(page.edits.count, 1);
    assert.equal(rows(again).length, 0);
    // No row left to take the keyboard: the column, a holder of the keyboard, takes it rather than the page.
    assert.equal(fakeDocument.activeElement, again);
});

test("a column drawn before its canvas is found by the canvas's first draw; a canvas drawn again lets the old one's presses go", () => {
    const panel = column("7");
    const page = stage(panel);

    page.parameters.draw();
    page.canvas.remove();

    // The canvas drawn in its place under the same id hears the column; the one that left answers nothing.
    const next = stage(panel);

    next.parameters.draw();
    rows(panel)[0].querySelector("[data-ui-graph-parameter-remove]")!.dispatchEvent(new FakeEvent("click"));

    assert.deepEqual(page.document.parameters, [{ node: "b", pin: "Amount" }]);
    assert.deepEqual(next.document.parameters, []);
});

test("on a read-only sheet a parameter's field is read-only and its remove is off", () => {
    const panel = column("7");
    const page = stage(panel);

    page.settings.readOnly = true;
    page.parameters.draw();

    const [field, remove] = [rows(panel)[0].children[1], rows(panel)[0].children[2]];

    assert.equal(page.values.get(field)?.IsReadOnly, true);
    assert.equal(page.values.get(remove)?.Enabled, false);
});
