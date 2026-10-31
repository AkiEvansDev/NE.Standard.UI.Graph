// Runtime choice lists for `[GraphInput(ChoicesKey = "...")]`: parsed from `data-ui-graph-pin-choices`, falling back to static `choices`
// when a key is absent, and pushed in place onto editor templates, drawn canvas nodes (single and list rows), and parameter columns.

import assert from "node:assert/strict";
import test from "node:test";
import { FakeElement, fakeDocument, installFakeDom, real } from "./fake-dom.ts";
import { NodesKind } from "../src/nodes/nodes-kind.ts";
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

    kind.dispose();
});
