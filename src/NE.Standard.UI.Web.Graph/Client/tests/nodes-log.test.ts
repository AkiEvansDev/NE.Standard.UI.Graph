// The node canvas's log over a stand-in DOM: a line leaving it never drops the keyboard that stood on it, and a node's own text is
// shown as written, never looked up as a key.

import assert from "node:assert/strict";
import test from "node:test";
import { FakeElement, fakeDocument, installFakeDom, real } from "./fake-dom.ts";
import { NodesLog } from "../src/nodes/nodes-log.ts";
import type { CanvasServices } from "../src/canvas/canvas-kind.ts";
import type { GraphDocument, NodeType } from "../src/nodes/model.ts";

installFakeDom();

type Scene = { readonly log: NodesLog; readonly toggle: FakeElement; readonly lines: FakeElement; readonly nodes: Map<string, FakeElement> };

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
    const nodes = new Map<string, FakeElement>();
    const services = {
        root,
        context,
        nodeElements: nodes,
        documentState: { document: { nodes: [{ id: "n1", type: "graph.text", title: "Reader" }] } }
    };
    const log = new NodesLog(real<CanvasServices<GraphDocument>>(services), new Map<string, NodeType>());

    return { log, toggle, lines, nodes };
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

test("a node turned off loses what the last run left on it at its next redraw, while another keeps its", () => {
    const page = scene();

    page.nodes.set("n1", FakeElement.of("ui-graph__node"));
    page.nodes.set("n2", FakeElement.of("ui-graph__node"));
    page.log.setStatus("n1", "Done", null, null);
    page.log.setStatus("n2", "Done", null, null);
    page.log.forgetNode("n1");

    // Drawn afresh, as the edit that turned it off draws the sheet.
    page.nodes.set("n1", FakeElement.of("ui-graph__node"));
    page.nodes.set("n2", FakeElement.of("ui-graph__node"));
    page.log.reapplyToRedrawnNodes(new Set(["n1", "n2"]));

    assert.equal(page.nodes.get("n1")!.getAttribute("data-ui-graph-state"), null);
    assert.equal(page.nodes.get("n2")!.getAttribute("data-ui-graph-state"), "done");
});

test("a run refused whole says why on the run line, failed, and the next run clears it", () => {
    // The run line as the renderer writes it along the canvas's top.
    const label = FakeElement.of("ui-graph__run-label", { "data-ui-graph-run-label": "" }, "span");
    const run = FakeElement.of("ui-graph__run", { "data-ui-graph-run": "", role: "progressbar" }).append(
        FakeElement.of("ui-graph__run-track ui-graph__run-track--run"),
        FakeElement.of("ui-graph__run-track ui-graph__run-track--step"),
        label,
        FakeElement.of("ui-graph__run-share", { "data-ui-graph-run-share": "" }, "span")
    );
    const root = FakeElement.of("ui-graph").append(run);
    const context = {
        temporal: { format: () => "12:00:00", readCulture: () => ({}) },
        numbers: { format: (value: number) => String(value), readCulture: () => ({}) },
        strings: { format: (key: string, args: Readonly<Record<string, unknown>>) => `[${key}:${String(args.max ?? args.value ?? "")}]` }
    };
    const services = { root, context, nodeElements: new Map<string, FakeElement>(), documentState: { document: { nodes: [] } } };
    const log = new NodesLog(real<CanvasServices<GraphDocument>>(services), new Map<string, NodeType>());

    log.setRunProgress(0, 0, { key: "ui.graph.run-too-many-nodes", args: { max: 2000 } });

    assert.equal(label.textContent, "[ui.graph.run-too-many-nodes:2000]");
    assert.equal(run.getAttribute("data-ui-graph-run-state"), "failed");

    log.setRunProgress(0, 3);

    assert.equal(label.textContent, "");
    assert.equal(run.getAttribute("data-ui-graph-run-state"), "running");
});

test("the log's clear button is disabled while the log is empty and enabled while lines stand in it", () => {
    const clear = FakeElement.of("ui-graph__log-clear ui-button", { "data-ui-graph-log-clear": "" }, "button");
    const lines = FakeElement.of("ui-graph__log-entries", { "data-ui-graph-log-entries": "" }, "ol");
    const root = FakeElement.of("ui-graph").append(
        FakeElement.of("ui-graph__log", { "data-ui-graph-log": "" }).append(lines, FakeElement.of("ui-graph__log-head").append(clear))
    );
    const context = {
        temporal: { format: () => "12:00:00", readCulture: () => ({}) },
        strings: { write: () => undefined, format: (key: string) => key },
        states: {
            setDisabled: (element: FakeElement, disabled: boolean) => {
                element.classList.toggle("ui-disabled", disabled);
            }
        }
    };
    const services = {
        root,
        context,
        nodeElements: new Map<string, FakeElement>(),
        documentState: { document: { nodes: [{ id: "n1", type: "graph.text", title: "Reader" }] } }
    };
    const log = new NodesLog(real<CanvasServices<GraphDocument>>(services), new Map<string, NodeType>());

    assert.equal(clear.classList.contains("ui-disabled"), true);

    log.addLog("n1", "Info", { text: "Ready" });
    assert.equal(clear.classList.contains("ui-disabled"), false);

    log.clearLog();
    assert.equal(clear.classList.contains("ui-disabled"), true);
});
