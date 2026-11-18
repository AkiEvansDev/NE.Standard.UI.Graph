// Runtime choice lists for `[GraphInput(ChoicesKey = "...")]`, canonical `<template>` editor parameterization, and runtime-bound
// `BindCatalog` (`data-ui-graph-catalog`) transitions including unresolved plugin nodes.

import assert from "node:assert/strict";
import test from "node:test";
import { FakeElement, fakeDocument, installFakeDom, real } from "./fake-dom.ts";
import { NodesKind } from "../src/nodes/nodes-kind.ts";
import { cloneConfiguredEditor, readPinValue } from "../src/nodes/node-view.ts";
import { canResetPin, duplicate, readPinChoices, resetPin, resolvePinOptions, slice } from "../src/nodes/model.ts";
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

test("NodesKind syncs PinChoices on initial draw and live changes across canonical-template clones, list rows, and parameters", () => {
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
        makeTemplate("graph-editor:choice", modelTemplateField),
        makeTemplate("graph-editor:list-choice", tagsTemplateField),
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

    // Canonical <template> prototypes stay untouched so multiple pins of one editor shape never bleed options into each other.
    assert.equal(propertyWrites.get(modelTemplateField), undefined);
    assert.equal(propertyWrites.get(tagsTemplateField), undefined);

    // Draw the node and parameter column.
    const renderedNode = kind.renderItem(document.nodes[0]);
    nodeElements.set("n1", renderedNode);
    kind.itemsDrawn(new Set(["n1"]));

    const fakeNode = renderedNode as unknown as FakeElement;
    const nodeModelField = fakeNode.querySelector('[data-ui-graph-value="Model"]')!.firstElementChild!;
    const listRowFields = fakeNode.querySelectorAll(".ui-graph__list-row").map(row => row.firstElementChild!);
    const parameterField = parametersColumn.querySelector(".ui-graph__parameter-field")!;

    assert.equal(listRowFields.length, 2);
    assert.deepEqual(propertyWrites.get(nodeModelField)?.Items, [{ id: "claude", title: { text: "Claude" }, isContent: true }]);
    assert.equal(propertyWrites.get(nodeModelField)?.Value, "claude");
    assert.deepEqual(propertyWrites.get(parameterField)?.Items, [{ id: "claude", title: { text: "Claude" }, isContent: true }]);
    assert.equal(propertyWrites.get(parameterField)?.Value, "claude");

    for (const rowField of listRowFields)
        assert.deepEqual(propertyWrites.get(rowField)?.Items, [{ id: "fast", title: { text: "Fast" }, isContent: true }]);

    // Push updated PinChoices via SignalR attribute update: live node field, both list row fields, and parameter field update in place while preserving values.
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

    assert.equal(propertyWrites.get(modelTemplateField), undefined);
    assert.deepEqual(propertyWrites.get(nodeModelField)?.Items, expectedModels);
    assert.equal(propertyWrites.get(nodeModelField)?.Value, "claude");
    assert.deepEqual(propertyWrites.get(parameterField)?.Items, expectedModels);
    assert.equal(propertyWrites.get(parameterField)?.Value, "claude");

    for (const rowField of listRowFields)
        assert.deepEqual(propertyWrites.get(rowField)?.Items, expectedTags);

    // Clicking `+` on a `ChoicesKey` list pin clones the new row with the live PinChoices rather than the initial snapshot.
    fakeNode.querySelector("[data-ui-graph-list-add]")!.click();
    const afterAddRowFields = fakeNode.querySelectorAll(".ui-graph__list-row").map(row => row.firstElementChild!);
    assert.equal(afterAddRowFields.length, 3);
    for (const rowField of afterAddRowFields)
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
        makeTemplate("graph-editor:list-text", FakeElement.of("ui-text-input", { "data-ui-id": "30" })),
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

test("cloneConfiguredEditor applies Title or AccessibleName, Placeholder, SuffixText, MaxLength, Rows, numeric bounds, and ShowClearButton", () => {
    const writes = (pin: Pin, choices: Readonly<Record<string, readonly { value: string; caption: string }[]>> | null = null): { region: string | null; props: Record<string, unknown> } => {
        let clonedRegion: string | null = null;
        const props: Record<string, unknown> = {};
        const element = cloneConfiguredEditor(
            pin,
            region => {
                clonedRegion = region;
                return real<HTMLElement>(FakeElement.of("ui-field"));
            },
            (_component, name, value) => {
                props[name] = value;
            },
            choices
        );

        assert.notEqual(element, null);
        return { region: clonedRegion, props };
    };

    const textPin = writes({ name: "Host", title: "Host", type: "text", editor: "Text", placeholder: "localhost", unit: "ms", maxLength: 64 });
    assert.equal(textPin.region, "graph-editor:text");
    assert.deepEqual(textPin.props, { Title: "Host", Placeholder: "localhost", SuffixText: "ms", MaxLength: 64 });

    const areaPin = writes({ name: "Prompt", title: "System Prompt", type: "text", editor: "Text", maxLines: 4, maxLength: 500 });
    assert.equal(areaPin.region, "graph-editor:textarea");
    assert.deepEqual(areaPin.props, { AccessibleName: "System Prompt", Placeholder: "—", MaxLength: 500, Rows: 4 });

    const unsignedIntPin = writes({ name: "Count", title: "Count", type: "number", editor: "Number", wholeNumber: true, unsigned: true, max: 100, step: 2, unit: "px" });
    assert.equal(unsignedIntPin.region, "graph-editor:number");
    assert.deepEqual(unsignedIntPin.props, { Title: "Count", Placeholder: "—", SuffixText: "px", Min: 0, Max: 100, Step: 2, AllowDecimals: false, AllowNegative: false });

    const optionalChoice = writes({
        name: "Preset",
        title: "Preset",
        type: "text",
        editor: "Choice",
        defaultValue: null,
        choices: [{ value: "fast", caption: "Fast" }]
    });
    assert.equal(optionalChoice.region, "graph-editor:choice");
    assert.deepEqual(optionalChoice.props, {
        Title: "Preset",
        Placeholder: null,
        Items: [{ id: "fast", title: "Fast", isContent: true }],
        ShowClearButton: true
    });
});

test("NodesKind preserves unresolved plugin nodes, synthesizes wire pins, and upgrades or degrades in place on runtime catalogChanged", () => {
    const sourceType: NodeType = {
        key: "source",
        title: "Source",
        inputs: [],
        outputs: [{ name: "Out", title: "Out", type: "text", editor: "None" }]
    };
    const sinkType: NodeType = {
        key: "sink",
        title: "Sink",
        inputs: [{ name: "In", title: "In", type: "text", editor: "None" }],
        outputs: []
    };
    const pluginType: NodeType = {
        key: "plugin.echo",
        title: "Plugin Echo",
        inputs: [
            { name: "Feed", title: "Feed", type: "text", editor: "None" },
            { name: "Prompt", title: "Prompt", type: "text", editor: "Text", defaultValue: "seed" }
        ],
        outputs: [{ name: "Reply", title: "Reply", type: "text", editor: "None" }]
    };

    const makeTemplate = (region: string, child: FakeElement): FakeElement =>
        Object.assign(FakeElement.of("", { "data-ui-graph-editor": region }, "template"), { content: FakeElement.of("").append(child) });

    const canvas = FakeElement.of("ui-graph", {
        "data-ui-id": "40",
        "data-ui-graph-catalog": JSON.stringify([sourceType, sinkType])
    }).append(
        makeTemplate("graph-editor:text", FakeElement.of("ui-text-input", { "data-ui-id": "42" })),
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

    const parametersColumn = FakeElement.of("ui-graph-parameters", { "data-ui-graph-parameters-for": "40" }, "section").append(
        FakeElement.of("ui-graph__parameters-list", { "data-ui-graph-parameters-list": "" }),
        FakeElement.of("ui-graph__parameters-empty", {}, "p")
    );

    fakeDocument.body.replaceChildren(canvas, parametersColumn);

    const document: GraphDocument = {
        nodes: [
            { id: "n1", type: "source", x: 0, y: 0, values: {} },
            { id: "n2", type: "plugin.echo", x: 180, y: 0, values: { Prompt: "kept-secret", Extra: 42 } },
            { id: "n3", type: "sink", x: 360, y: 0, values: {} }
        ],
        edges: [
            { id: "e1", fromNode: "n1", fromPin: "Out", toNode: "n2", toPin: "Feed", points: [] },
            { id: "e2", fromNode: "n2", fromPin: "Reply", toNode: "n3", toPin: "In", points: [] }
        ],
        groups: [],
        key: null,
        parameters: [{ node: "n2", pin: "Prompt" }]
    };

    const nodeElements = new Map<string, HTMLElement>();
    const propertyWrites = new Map<FakeElement, Record<string, unknown>>();
    const kindHolder: { current: NodesKind | null } = { current: null };

    const redrawFakeNodes = (): void => {
        const active = kindHolder.current!;
        nodeElements.clear();

        for (const node of document.nodes)
            nodeElements.set(node.id, active.renderItem(node));

        active.itemsDrawn(new Set(document.nodes.map(node => node.id)));
    };

    const kind = new NodesKind(real<CanvasServices<GraphDocument>>({
        root: canvas,
        settings: { readOnly: false, snapping: false, gridSize: 20, edgeShape: "orthogonal" },
        documentState: { document, edited: () => undefined, committed: () => undefined, settle: () => undefined, requestSave: () => undefined },
        nodeElements,
        view: { fitSheet: () => undefined },
        draw: redrawFakeNodes,
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
                write: (element: Element, attribute: string | null, key: string, args?: Readonly<Record<string, unknown>> | null) => {
                    const rendered = args === undefined || args === null ? key : `${key}|${JSON.stringify(args)}`;

                    if (attribute === null)
                        real<FakeElement>(element).textContent = rendered;
                    else
                        element.setAttribute(attribute, rendered);
                }
            },
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
                set: (element: FakeElement, name: string, value: unknown) => {
                    propertyWrites.set(element, { ...propertyWrites.get(element), [name]: value });
                    return true;
                }
            }
        }
    }));
    kindHolder.current = kind;
    redrawFakeNodes();

    // 1. While `plugin.echo` is absent, n2 renders `[data-ui-graph-missing]`, localized badge, and synthesized `any` pins from connected edges.
    const missingNode = nodeElements.get("n2") as unknown as FakeElement;
    assert.equal(missingNode.getAttribute("data-ui-graph-missing"), "");
    assert.equal(missingNode.querySelector(".ui-graph__node-unknown")!.textContent, 'ui.graph.missing-kind|{"type":"plugin.echo"}');
    assert.deepEqual(
        missingNode.querySelectorAll("[data-ui-graph-pin]").map(pin => `${pin.getAttribute("data-ui-graph-pin-dir")}:${pin.getAttribute("data-ui-graph-pin")}:${pin.getAttribute("data-ui-graph-pin-type")}`),
        ["in:Feed:any", "out:Reply:any"]
    );
    assert.equal(parametersColumn.querySelectorAll(".ui-graph__parameter-field").length, 0);

    // Folded unresolved nodes also synthesize connected input/output ports on the head.
    document.nodes[1].collapsed = true;
    const foldedMissing = kind.renderItem(document.nodes[1]) as unknown as FakeElement;
    assert.deepEqual(
        foldedMissing.querySelectorAll("[data-ui-graph-pin]").map(pin => `${pin.getAttribute("data-ui-graph-pin-dir")}:${pin.getAttribute("data-ui-graph-pin")}`),
        ["in:Feed", "out:Reply"]
    );
    document.nodes[1].collapsed = false;

    // Slice + duplicate (copy/paste) preserves hidden `values` verbatim.
    const pasted = duplicate(slice(document, new Set(["n2"])), 20, 20);
    assert.deepEqual(pasted.nodes[0].values, { Prompt: "kept-secret", Extra: 42 });

    // `canResetPin` / `resetPin` on an unresolved node only disconnects connected edges and never wipes `node.values`.
    const knownTypes = new Map<string, NodeType>([["source", sourceType], ["sink", sinkType]]);
    assert.equal(canResetPin(document, knownTypes, "n2", "Prompt", "in"), false);
    assert.equal(canResetPin(document, knownTypes, "n2", "Feed", "in"), true);

    // 2. Push `plugin.echo` via `BindCatalog` (`data-ui-graph-catalog` + `catalogChanged()`): n2 upgrades in place with its preserved values and parameter row.
    canvas.setAttribute("data-ui-graph-catalog", JSON.stringify([sourceType, sinkType, pluginType]));
    kind.catalogChanged();

    const upgradedNode = nodeElements.get("n2") as unknown as FakeElement;
    assert.equal(upgradedNode.getAttribute("data-ui-graph-missing"), null);
    assert.equal(upgradedNode.querySelector(".ui-graph__node-unknown"), null);
    const promptField = upgradedNode.querySelector('[data-ui-graph-value="Prompt"]')!.firstElementChild!;
    assert.equal(propertyWrites.get(promptField)?.Title, "Prompt");
    assert.equal(propertyWrites.get(promptField)?.Value, "kept-secret");

    const upgradedParamField = parametersColumn.querySelector(".ui-graph__parameter-field")!;
    assert.equal(propertyWrites.get(upgradedParamField)?.Value, "kept-secret");

    // 3. Remove `plugin.echo` from `data-ui-graph-catalog` again: n2 degrades back to `[data-ui-graph-missing]` while keeping `values` intact, and Reset Pin disconnects e1 cleanly.
    canvas.setAttribute("data-ui-graph-catalog", JSON.stringify([sourceType, sinkType]));
    kind.catalogChanged();

    const degradedNode = nodeElements.get("n2") as unknown as FakeElement;
    assert.equal(degradedNode.getAttribute("data-ui-graph-missing"), "");
    assert.deepEqual(document.nodes[1].values, { Prompt: "kept-secret", Extra: 42 });

    resetPin(document, knownTypes, "n2", "Feed", "in");
    assert.equal(document.edges.length, 1);
    assert.equal(document.edges[0].id, "e2");
    assert.deepEqual(document.nodes[1].values, { Prompt: "kept-secret", Extra: 42 });

    kind.dispose();
});

test("NodesKind.catalogChanged syncs menus immediately and defers redrawing while an inline editor inside the scene holds focus", async () => {
    const pluginType: NodeType = {
        key: "plugin.echo",
        title: "Plugin Echo",
        inputs: [{ name: "Prompt", title: "Prompt", type: "text", editor: "Text", defaultValue: "seed" }],
        outputs: []
    };
    const makeTemplate = (region: string, child: FakeElement): FakeElement =>
        Object.assign(FakeElement.of("", { "data-ui-graph-editor": region }, "template"), { content: FakeElement.of("").append(child) });

    const scene = FakeElement.of("ui-graph__scene");
    const canvas = FakeElement.of("ui-graph", {
        "data-ui-id": "60",
        "data-ui-graph-catalog": JSON.stringify([pluginType])
    }).append(
        scene,
        makeTemplate("graph-editor:text", FakeElement.of("ui-text-input", { "data-ui-id": "62" }, "input")),
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
    fakeDocument.body.replaceChildren(canvas);

    const document: GraphDocument = {
        nodes: [{ id: "n1", type: "plugin.echo", x: 0, y: 0, values: { Prompt: "hello" } }],
        edges: [],
        groups: [],
        key: null,
        parameters: []
    };
    const nodeElements = new Map<string, HTMLElement>();
    let drawCalls = 0;
    let syncMenuCalls = 0;
    const kindHolder: { current: NodesKind | null } = { current: null };

    const redraw = (): void => {
        drawCalls++;
        const active = kindHolder.current!;
        const rendered = active.renderItem(document.nodes[0]);
        nodeElements.set("n1", rendered);
        scene.replaceChildren(rendered as unknown as FakeElement);
        active.itemsDrawn(new Set(["n1"]));
    };

    const kind = new NodesKind(real<CanvasServices<GraphDocument>>({
        root: canvas,
        scene: real<HTMLElement>(scene),
        settings: { readOnly: false, snapping: false, gridSize: 20, edgeShape: "orthogonal" },
        documentState: { document, edited: () => undefined, committed: () => undefined, settle: () => undefined, requestSave: () => undefined },
        nodeElements,
        view: { fitSheet: () => undefined },
        draw: redraw,
        syncMenus: () => { syncMenuCalls++; },
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
    kindHolder.current = kind;
    redraw();
    assert.equal(drawCalls, 1);

    const focusedEditor = scene.querySelector(".ui-text-input")!;
    focusedEditor.focus();
    assert.equal(fakeDocument.activeElement, focusedEditor);

    canvas.setAttribute("data-ui-graph-catalog", JSON.stringify([{ ...pluginType, title: "Plugin Echo v2" }]));
    kind.catalogChanged();

    // Menus sync immediately, while node redraw waits until the focused inline editor blurs.
    assert.equal(syncMenuCalls, 1);
    assert.equal(drawCalls, 1);

    focusedEditor.blur();
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    assert.equal(drawCalls, 2);
    assert.equal(syncMenuCalls, 2);

    kind.dispose();
});
