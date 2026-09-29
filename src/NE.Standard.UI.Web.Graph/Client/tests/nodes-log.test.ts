// The node canvas's log over a stand-in DOM: a line leaving it never drops the keyboard that stood on it, and a node's own text is
// shown as written, never looked up as a key.

import assert from "node:assert/strict";
import test from "node:test";
import { FakeElement, fakeDocument, installFakeDom, real } from "./fake-dom.ts";
import { NodesLog } from "../src/nodes/nodes-log.ts";
import type { CanvasServices } from "../src/canvas/canvas-kind.ts";
import type { GraphDocument, NodeType } from "../src/nodes/model.ts";

installFakeDom();

type Scene = { readonly log: NodesLog; readonly toggle: FakeElement; readonly lines: FakeElement };

function scene(): Scene {
    const toggle = FakeElement.of("ui-graph__log-toggle", { "data-ui-graph-log-toggle": "" }, "button");
    const lines = FakeElement.of("ui-graph__log-entries", { "data-ui-graph-log-entries": "" }, "ul");
    const root = FakeElement.of("ui-graph").append(
        FakeElement.of("ui-graph__log", { "data-ui-graph-log": "" }).append(FakeElement.of("ui-graph__log-head").append(toggle), lines)
    );

    fakeDocument.body.children.length = 0;
    fakeDocument.body.append(root);

    const context = {
        temporal: { format: () => "12:00:00", readCulture: () => ({}) },
        strings: {
            write: (element: FakeElement, _attribute: string | null, key: string) => {
                element.textContent = `[${key}]`;
            },
            format: (key: string) => `[${key}]`,
            resolveText: () => assert.fail("a node's own text is never looked up")
        }
    };
    const services = {
        root,
        context,
        nodeElements: new Map<string, HTMLElement>(),
        documentState: { document: { nodes: [{ id: "n1", type: "graph.text", title: "Reader" }] } }
    };
    const log = new NodesLog(real<CanvasServices<GraphDocument>>(services), new Map<string, NodeType>());

    return { log, toggle, lines };
}

function nodeButton(line: FakeElement | undefined): FakeElement {
    const button = line?.querySelector("[data-ui-graph-log-node]") ?? null;

    assert.ok(button !== null);

    return button;
}

test("a node's own text is shown as written and a word in the page's language", () => {
    const page = scene();

    page.log.addLog("n1", "Info", { text: "Picture" });
    page.log.addLog("n1", "Warning", { key: "ui.graph.run-stopped" });

    assert.equal(page.lines.children[0].querySelector(".ui-graph__log-message")!.textContent, "Picture");
    assert.equal(page.lines.children[1].querySelector(".ui-graph__log-message")!.textContent, "[ui.graph.run-stopped]");
    assert.equal(nodeButton(page.lines.children[0]).textContent, "Reader");
});

test("clearing the log hands the keyboard on a line to the log's switch", () => {
    const page = scene();

    page.log.addLog("n1", "Info", { text: "one" });
    page.log.addLog("n1", "Info", { text: "two" });
    nodeButton(page.lines.children[1]).focus();

    page.log.clearLog();

    assert.equal(page.lines.children.length, 0);
    assert.equal(fakeDocument.activeElement, page.toggle);
});

test("the oldest line leaving a full log hands its keyboard to the line after it", () => {
    const page = scene();

    page.log.addLog("n1", "Info", { text: "first" });
    page.log.addLog("n1", "Info", { text: "second" });
    nodeButton(page.lines.children[0]).focus();

    const second = page.lines.children[1];

    for (let index = 0; index < 499; index++)
        page.log.addLog("n1", "Info", { text: "more" });

    assert.equal(page.lines.children.length, 500);
    assert.equal(page.lines.children[0], second);
    assert.equal(fakeDocument.activeElement, nodeButton(second));
});

test("a line leaving with no keyboard on it moves the keyboard nowhere", () => {
    const page = scene();
    const outside = FakeElement.of("", {}, "button");

    fakeDocument.body.append(outside);
    page.log.addLog("n1", "Info", { text: "one" });
    outside.focus();

    page.log.clearLog();

    assert.equal(fakeDocument.activeElement, outside);
});
