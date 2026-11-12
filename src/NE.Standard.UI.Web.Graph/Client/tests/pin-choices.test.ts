// Runtime choice lists for `[GraphInput(ChoicesKey = "...")]`: parsed from `data-ui-graph-pin-choices`, falling back to static `choices`
// when a key is absent, and pushed in place onto editor templates, drawn canvas nodes (single and list rows), and parameter columns.

import assert from "node:assert/strict";
import test from "node:test";
import { FakeElement, fakeDocument, installFakeDom, real } from "./fake-dom.ts";
import { NodesKind } from "../src/nodes/nodes-kind.ts";
import { readPinValue } from "../src/nodes/node-view.ts";
import { readPinChoices, resolvePinOptions } from "../src/nodes/model.ts";
import type { CanvasServices } from "../src/canvas/canvas-kind.ts";
import type { GraphDocument, NodeType, Pin } from "../src/nodes/model.ts";

installFakeDom({ CSS: { escape: (value: string) => value } });

test("resolvePinOptions uses runtime PinChoices when present, falls back to static choices when absent, and ignores plain pins", () => {
    const dynamicOnly: Pin = { name: "Model", title: "Model", type: "text", editor: "Choice", choicesKey: "models" };
    const withFallback: Pin = {
        name: "Voice",
        title: "Voice",
        type: "text",
        editor: "Choice",
        choicesKey: "voices",
        choices: [{ value: "alloy", caption: { text: "Alloy" } }]
    };
    const plain: Pin = { name: "Note", title: "Note", type: "text", editor: "Text" };

    assert.equal(resolvePinOptions(plain, {}), null);
    assert.deepEqual(resolvePinOptions(dynamicOnly, null), []);
    assert.deepEqual(resolvePinOptions(withFallback, null), [{ id: "alloy", title: { text: "Alloy" }, isContent: true }]);

    const parsed = readPinChoices(JSON.stringify({
        models: [{ value: "gpt-4o", caption: { text: "GPT-4o" } }],
        voices: []
    }));

    assert.deepEqual(resolvePinOptions(dynamicOnly, parsed), [{ id: "gpt-4o", title: { text: "GPT-4o" }, isContent: true }]);
    // Explicit empty array overrides static fallback choices.
    assert.deepEqual(resolvePinOptions(withFallback, parsed), []);
});

test("NodesKind syncs PinChoices on initial construction and live changes across templates, canvas nodes, list rows, and parameters", () => {
    const promptType: NodeType = {
        key: "prompt",
        title: "Prompt",
        inputs: [
            { name: "Model", title: "Model", type: "text", editor: "Choice", choicesKey: "models", choices: [{ value: "fallback", caption: { text: "Fallback" } }] },
            { name: "Tags", title: "Tags", type: "array:text", editor: "List", choicesKey: "tags" }
        ],
        outputs: []
    };

    const modelTemplateField = FakeElement.of("ui-select", { "data-ui-id": "20" });
    const tagsTemplateField = FakeElement.of("ui-select", { "data-ui-id": "22" });
    const removeTemplateField = FakeElement.of("ui-button", { "data-ui-id": "24" }, "button");
    const addTemplateField = FakeElement.of("ui-button", { "data-ui-id": "26" }, "button");

    const makeTemplate = (region: string, child: FakeElement): FakeElement =>
        Object.assign(FakeElement.of("", { "data-ui-graph-editor": region }, "template"), { content: FakeElement.of("").append(child) });

    const canvas = FakeElement.of("ui-graph", {
        "data-ui-id": "10",
        "data-ui-graph-catalog": JSON.stringify([promptType]),
        "data-ui-graph-pin-choices": JSON.stringify({
            models: [{ value: "claude", caption: { text: "Claude" } }],
            tags: [{ value: "fast", caption: { text: "Fast" } }]
        })
    }).append(
        makeTemplate("graph-editor:prompt:Model", modelTemplateField),
        makeTemplate("graph-editor:prompt:Tags", tagsTemplateField),
        makeTemplate("graph-list-remove", removeTemplateField),
        makeTemplate("graph-list-add", addTemplateField),
        FakeElement.of("ui-graph__picker", { "data-ui-graph-picker": "" }).append(
            FakeElement.of("ui-graph__picker-list", { "data-ui-graph-picker-list": "" }),
            FakeElement.of("ui-graph__picker-empty", { "data-ui-graph-picker-empty": "" })
        ),
        FakeElement.of("ui-graph__run", { "data-ui-graph-run": "" }),
        FakeElement.of("ui-graph__log", { "data-ui-graph-log": "" }).append(
            FakeElement.of("ui-graph__log-entries", { "data-ui-graph-log-entries": "" }),
            FakeElement.of("ui-graph__log-count", { "data-ui-graph-log-count": "" }),
            FakeElement.of("ui-graph__log-toggle", { "data-ui-graph-log-toggle": "" }, "button")
        )
    );

    const parametersColumn = FakeElement.of("ui-graph-parameters", { "data-ui-graph-parameters-for": "10" }, "section").append(
        FakeElement.of("ui-graph__parameters-list", { "data-ui-graph-parameters-list": "" }),
        FakeElement.of("ui-graph__parameters-empty", {}, "p")
    );

    fakeDocument.body.replaceChildren(canvas, parametersColumn);

    const document: GraphDocument = {
        nodes: [{ id: "n1", type: "prompt", x: 0, y: 0, title: null, color: null, pinned: false, values: { Model: "claude", Tags: ["fast", "fast"] } }],
        edges: [],
        groups: [],
        key: null,
        parameters: [{ node: "n1", pin: "Model" }]
    };

    const nodeElements = new Map<string, HTMLElement>();
    const propertyWrites = new Map<FakeElement, Record<string, unknown>>();

    const services = {
        root: canvas,
        settings: { readOnly: false, snapping: false, gridSize: 20, edgeShape: "orthogonal" },
        documentState: {
            document,
            edited: () => undefined,
            committed: () => undefined,
            settle: () => undefined,
            requestSave: () => undefined
        },
        nodeElements,
        view: { fitSheet: () => undefined },
        context: {
            root: fakeDocument.body,
            names: {
                componentId: "data-ui-id",
                tooltip: "data-ui-tooltip",
                contextMenuUse: "data-ui-context-menu",
                menuOpeningEvent: "ui:menu-opening",
                pictureSelectionClass: "ui-image-input__selection",
                pictureTextClass: "ui-image-input__text",
                textInputActionClass: "ui-text-input__action"
            },
            strings: {
                text: (key: string) => key,
                format: (key: string) => key,
                write: () => undefined
            },
            states: {
                isInert: () => false,
                setDisabled: () => undefined
            },
            icons: { apply: () => undefined },
            tooltips: { escape: (text: string) => text, show: () => undefined, hide: () => undefined },
            temporal: { parse: () => null, toDate: () => new Date(0) },
            urls: { isImageSource: () => false },
            colors: { count: () => 8, color: () => "#006E64" },
            focus: { first: () => null },
            store: { read: () => null, write: () => undefined },
            values: { read: () => null, isRefused: () => false },
            properties: {
                set: (element: FakeElement, name: string, value: unknown) => {
                    propertyWrites.set(element, { ...propertyWrites.get(element), [name]: value });
                    return true;
                }
            }
        }
    };

    const kind = new NodesKind(real<CanvasServices<GraphDocument>>(services));

    // Constructor already synced SSR PinChoices onto both <template> elements before any node was drawn.
    assert.deepEqual(propertyWrites.get(modelTemplateField)?.Items, [{ id: "claude", title: { text: "Claude" }, isContent: true }]);
    assert.deepEqual(propertyWrites.get(tagsTemplateField)?.Items, [{ id: "fast", title: { text: "Fast" }, isContent: true }]);

    // Draw the node and parameter column.
    const renderedNode = kind.renderItem(document.nodes[0]);
    nodeElements.set("n1", renderedNode);
    kind.itemsDrawn(new Set(["n1"]));

    const fakeNode = renderedNode as unknown as FakeElement;
    const nodeModelField = fakeNode.querySelector('[data-ui-graph-value="Model"]')!.firstElementChild!;
    const listRowFields = fakeNode.querySelectorAll(".ui-graph__list-row").map(row => row.firstElementChild!);
    const parameterField = parametersColumn.querySelector(".ui-graph__parameter-field")!;

    assert.equal(listRowFields.length, 2);
    assert.equal(propertyWrites.get(nodeModelField)?.Value, "claude");
    assert.equal(propertyWrites.get(parameterField)?.Value, "claude");

    // Push updated PinChoices via SignalR attribute update: template, live node field, both list row fields, and parameter field update in place while preserving values.
    canvas.setAttribute("data-ui-graph-pin-choices", JSON.stringify({
        models: [
            { value: "claude", caption: { text: "Claude 4" } },
            { value: "gemini", caption: { text: "Gemini" } }
        ],
        tags: [
            { value: "fast", caption: { text: "Fast" } },
            { value: "deep", caption: { text: "Deep" } }
        ]
    }));
    kind.pinChoicesChanged();

    const expectedModels = [
        { id: "claude", title: { text: "Claude 4" }, isContent: true },
        { id: "gemini", title: { text: "Gemini" }, isContent: true }
    ];
    const expectedTags = [
        { id: "fast", title: { text: "Fast" }, isContent: true },
        { id: "deep", title: { text: "Deep" }, isContent: true }
    ];

    assert.deepEqual(propertyWrites.get(modelTemplateField)?.Items, expectedModels);
    assert.deepEqual(propertyWrites.get(nodeModelField)?.Items, expectedModels);
    assert.equal(propertyWrites.get(nodeModelField)?.Value, "claude");
    assert.deepEqual(propertyWrites.get(parameterField)?.Items, expectedModels);
    assert.equal(propertyWrites.get(parameterField)?.Value, "claude");

    for (const rowField of listRowFields)
        assert.deepEqual(propertyWrites.get(rowField)?.Items, expectedTags);

    // Removing `models` from PinChoices falls back to static `choices` ("fallback") while keeping document values untouched.
    canvas.removeAttribute("data-ui-graph-pin-choices");
    kind.pinChoicesChanged();

    assert.deepEqual(propertyWrites.get(nodeModelField)?.Items, [{ id: "fallback", title: { text: "Fallback" }, isContent: true }]);
    assert.equal(document.nodes[0].values.Model, "claude");

    // Disposing and reviving the canvas re-installs the parameter panel click listener.
    kind.dispose();
    assert.equal(parametersColumn.listenerCount("click"), 0);

    kind.revive();
    assert.equal(parametersColumn.listenerCount("click"), 1);

    parametersColumn.querySelector("[data-ui-graph-parameter-remove]")!.click();
    assert.equal(document.parameters.length, 0);

    kind.dispose();
});

test("readPinValue preserves empty string on empty-default Choice pins, returns null on nullable ones, and parses numeric Choice pins as numbers", () => {
    const emptyStringChoice: Pin = { name: "Model", title: "Model", type: "text", editor: "Choice", defaultValue: "" };
    const nullableChoice: Pin = { name: "Thinking", title: "Thinking", type: "enum:ThinkingLevel", editor: "Choice", defaultValue: null };
    const nonEmptyChoice: Pin = { name: "Mode", title: "Mode", type: "text", editor: "Choice", defaultValue: "Balanced" };
    const numericChoice: Pin = { name: "Port", title: "Port", type: "number", editor: "Choice", defaultValue: 443 };

    assert.equal(readPinValue(emptyStringChoice, ""), "");
    assert.equal(readPinValue(emptyStringChoice, "claude"), "claude");
    assert.equal(readPinValue(nullableChoice, ""), null);
    assert.equal(readPinValue(nullableChoice, "Deep"), "Deep");
    assert.equal(readPinValue(nonEmptyChoice, ""), null);
    assert.equal(readPinValue(numericChoice, "8443"), 8443);
    assert.equal(readPinValue(numericChoice, ""), null);
});

test("clicking state reset on a List state pin redraws list rows from a cloned default without writing Value onto the canvas root", () => {
    const defaultTags = ["seed"];
    const listStateType: NodeType = {
        key: "stateful",
        title: "Stateful",
        inputs: [{ name: "Tags", title: "Tags", type: "array:text", editor: "List", state: true, defaultValue: defaultTags }],
        outputs: []
    };
    const makeTemplate = (region: string, child: FakeElement): FakeElement =>
        Object.assign(FakeElement.of("", { "data-ui-graph-editor": region }, "template"), { content: FakeElement.of("").append(child) });

    const canvas = FakeElement.of("ui-graph", { "data-ui-graph-catalog": JSON.stringify([listStateType]) }).append(
        makeTemplate("graph-editor:stateful:Tags", FakeElement.of("ui-text-input", { "data-ui-id": "30" })),
        makeTemplate("graph-list-remove", FakeElement.of("ui-button", { "data-ui-id": "32" }, "button")),
        makeTemplate("graph-list-add", FakeElement.of("ui-button", { "data-ui-id": "34" }, "button")),
        makeTemplate("graph-state-reset", FakeElement.of("ui-graph__state-reset", { "data-ui-id": "36" }, "button"))
    );
    fakeDocument.body.replaceChildren(canvas);

    const document: GraphDocument = {
        nodes: [{ id: "n1", type: "stateful", x: 0, y: 0, values: { Tags: ["alpha", "beta"] } }],
        edges: [],
        groups: [],
        key: null,
        parameters: []
    };
    const propertyTargets: FakeElement[] = [];
    const kind = new NodesKind(real<CanvasServices<GraphDocument>>({
        root: canvas,
        settings: { readOnly: false, snapping: false, gridSize: 20, edgeShape: "orthogonal" },
        documentState: { document, edited: () => undefined, committed: () => undefined, settle: () => undefined, requestSave: () => undefined },
        nodeElements: new Map(),
        view: { fitSheet: () => undefined },
        context: {
            root: fakeDocument.body,
            names: {
                componentId: "data-ui-id",
                tooltip: "data-ui-tooltip",
                contextMenuUse: "data-ui-context-menu",
                menuOpeningEvent: "ui:menu-opening",
                pictureSelectionClass: "ui-image-input__selection",
                pictureTextClass: "ui-image-input__text",
                textInputActionClass: "ui-text-input__action"
            },
            strings: { text: (key: string) => key, format: (key: string) => key, write: () => undefined },
            states: { isInert: () => false, setDisabled: () => undefined },
            icons: { apply: () => undefined },
            tooltips: { escape: (text: string) => text, show: () => undefined, hide: () => undefined },
            temporal: { parse: () => null, toDate: () => new Date(0) },
            urls: { isImageSource: () => false },
            colors: { count: () => 8, color: () => "#006E64" },
            focus: { first: () => null },
            store: { read: () => null, write: () => undefined },
            values: { read: () => null, isRefused: () => false },
            properties: {
                set: (element: FakeElement) => {
                    propertyTargets.push(element);
                    return true;
                }
            }
        }
    }));

    const fakeNode = kind.renderItem(document.nodes[0]) as unknown as FakeElement;

    assert.equal(fakeNode.querySelectorAll(".ui-graph__list-row").length, 2);

    propertyTargets.length = 0;
    fakeNode.querySelector(".ui-graph__state-reset")!.click();

    assert.equal(fakeNode.querySelectorAll(".ui-graph__list-row").length, 1);
    assert.deepEqual(document.nodes[0].values.Tags, ["seed"]);
    assert.notEqual(document.nodes[0].values.Tags, defaultTags);
    assert.equal(propertyTargets.includes(canvas), false);

    kind.dispose();
});

test("readPinChoices defines __proto__ and constructor keys as own properties without mutating prototype", () => {
    const raw = '{"__proto__":[{"value":"safe","caption":"Safe"}],"constructor":[{"value":"ctor","caption":"Ctor"}]}';
    const parsed = readPinChoices(raw);

    assert.notEqual(parsed, null);
    assert.equal(Object.getPrototypeOf(parsed), Object.prototype);
    assert.equal(({} as Record<string, unknown>).safe, undefined);
    assert.equal(Object.hasOwn(parsed!, "__proto__"), true);
    assert.equal(Object.hasOwn(parsed!, "constructor"), true);
    assert.deepEqual(parsed!["__proto__"], [{ value: "safe", caption: "Safe" }]);
    assert.deepEqual(parsed!["constructor"], [{ value: "ctor", caption: "Ctor" }]);
});

test("NodesKind caches pin offsets across node moves and invalidates on nodeResized", () => {
    const wireType: NodeType = {
        key: "box",
        title: "Box",
        inputs: [{ name: "In", title: "In", type: "number", editor: "Number" }],
        outputs: [{ name: "Out", title: "Out", type: "number", editor: "None" }]
    };
    const canvas = FakeElement.of("ui-graph", { "data-ui-graph-catalog": JSON.stringify([wireType]) });
    fakeDocument.body.replaceChildren(canvas);

    const document: GraphDocument = {
        nodes: [
            { id: "n1", type: "box", x: 20, y: 40, values: {} },
            { id: "n2", type: "box", x: 220, y: 80, values: {} }
        ],
        edges: [{ id: "e1", fromNode: "n1", fromPin: "Out", toNode: "n2", toPin: "In", points: [] }],
        groups: [],
        key: null,
        parameters: []
    };
    const nodeElements = new Map<string, HTMLElement>();
    let centerCalls = 0;

    const kind = new NodesKind(real<CanvasServices<GraphDocument>>({
        root: canvas,
        settings: { readOnly: false, snapping: false, gridSize: 20, edgeShape: "bezier" },
        documentState: { document, edited: () => undefined, committed: () => undefined, settle: () => undefined, requestSave: () => undefined },
        nodeElements,
        view: { fitSheet: () => undefined },
        centerOf: (pin: Element) => {
            centerCalls++;
            const nodeId = (pin as unknown as FakeElement).closest("[data-ui-graph-node]")!.getAttribute("data-ui-graph-node")!;
            const node = document.nodes.find(candidate => candidate.id === nodeId)!;
            const isOut = pin.getAttribute("data-ui-graph-pin-dir") === "out";
            return { x: node.x + (isOut ? 140 : 0), y: node.y + 32 };
        },
        context: {
            root: fakeDocument.body,
            names: {
                componentId: "data-ui-id",
                tooltip: "data-ui-tooltip",
                contextMenuUse: "data-ui-context-menu",
                menuOpeningEvent: "ui:menu-opening",
                pictureSelectionClass: "ui-image-input__selection",
                pictureTextClass: "ui-image-input__text",
                textInputActionClass: "ui-text-input__action"
            },
            strings: { text: (key: string) => key, format: (key: string) => key, write: () => undefined },
            states: { isInert: () => false, setDisabled: () => undefined },
            icons: { apply: () => undefined },
            tooltips: { escape: (text: string) => text, show: () => undefined, hide: () => undefined },
            temporal: { parse: () => null, toDate: () => new Date(0) },
            urls: { isImageSource: () => false },
            colors: { count: () => 8, color: () => "#006E64" },
            focus: { first: () => null },
            store: { read: () => null, write: () => undefined },
            values: { read: () => null, isRefused: () => false },
            properties: { set: () => true }
        }
    }));

    for (const node of document.nodes) {
        const el = kind.renderItem(node);
        (el as unknown as FakeElement).rect = { left: node.x, top: node.y, width: 140, height: 64 };
        nodeElements.set(node.id, el);
    }

    kind.itemsDrawn(new Set(["n1", "n2"]));
    kind.edges();
    const firstEnds = kind.edgeEnds(document.edges[0])!;
    assert.equal(centerCalls, 2);
    assert.deepEqual(firstEnds.from, { x: 160, y: 72 });
    assert.deepEqual(firstEnds.to, { x: 220, y: 112 });

    // Moving n1 by (+40, +20) updates edgeEnds from cached offsets with zero centerOf / getBoundingClientRect calls.
    document.nodes[0].x = 60;
    document.nodes[0].y = 60;
    kind.edges();
    const movedEnds = kind.edgeEnds(document.edges[0])!;
    assert.equal(centerCalls, 2);
    assert.deepEqual(movedEnds.from, { x: 200, y: 92 });

    // Resizing n1 invalidates only n1's cached pin offsets.
    kind.nodeResized("n1");
    kind.edges();
    void kind.edgeEnds(document.edges[0]);
    assert.equal(centerCalls, 3);

    kind.dispose();
});
