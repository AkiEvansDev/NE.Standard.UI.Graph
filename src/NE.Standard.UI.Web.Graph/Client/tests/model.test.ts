import assert from "node:assert/strict";
import test from "node:test";
import { canConnect, createNode, duplicate, edgesInto, isPinVisible, readDocument, resolveOutputType, slice } from "../src/nodes/model.ts";
import type { GraphDocument, NodeType, Pin } from "../src/nodes/model.ts";

const numberType: NodeType = {
    key: "Number",
    title: "Number",
    inputs: [{ name: "Value", title: "Value", type: "number", editor: "Number", defaultValue: 1 }],
    outputs: [{ name: "Result", title: "Result", type: "number", editor: "None" }]
};

const passThrough: NodeType = {
    key: "Pass",
    title: "Pass",
    inputs: [{ name: "Input", title: "Input", type: "any", editor: "None" }],
    outputs: [{ name: "Output", title: "Output", type: "any", editor: "None", typeOf: "Input" }]
};

const types = new Map<string, NodeType>([[numberType.key, numberType], [passThrough.key, passThrough]]);

test("connects pins of one type, and anything to the universal one", () => {
    assert.equal(canConnect("number", "number"), true);
    assert.equal(canConnect("number", "text"), false);
    assert.equal(canConnect("number", "any"), true);
    assert.equal(canConnect("any", "MyModel"), true);
    assert.equal(canConnect("MyModel", "MyModel"), true);
    assert.equal(canConnect("MyModel", "OtherModel"), false);
});

test("connects a picture to a text and back, since a picture is an address", () => {
    assert.equal(canConnect("image", "text"), true);
    assert.equal(canConnect("text", "image"), true);
    assert.equal(canConnect("image", "number"), false);
});

test("connects an array to the universal array either way, but not two different element types", () => {
    assert.equal(canConnect("array:number", "array"), true);
    assert.equal(canConnect("array", "array:text"), true);
    assert.equal(canConnect("array:number", "array:text"), false);
    assert.equal(canConnect("array:number", "array:number"), true);
});

test("a new node starts on the kind's own defaults", () => {
    const node = createNode(numberType, 40, 20);

    assert.equal(node.type, "Number");
    assert.equal(node.x, 40);
    assert.equal(node.values["Value"], 1);
});

test("an output that follows an input takes the type connected to it", () => {
    const document: GraphDocument = {
        nodes: [
            { id: "a", type: "Number", x: 0, y: 0, values: {} },
            { id: "b", type: "Pass", x: 0, y: 0, values: {} }
        ],
        edges: [{ id: "e", fromNode: "a", fromPin: "Result", toNode: "b", toPin: "Input", points: [] }],
        groups: []
    };

    assert.equal(resolveOutputType(document, types, "b", "Output"), "number");
});

test("an output that follows an unconnected input falls back to that input's own type", () => {
    const document: GraphDocument = {
        nodes: [{ id: "b", type: "Pass", x: 0, y: 0, values: {} }],
        edges: [],
        groups: []
    };

    assert.equal(resolveOutputType(document, types, "b", "Output"), "any");
});

test("a chain of followed types that loops answers the universal type rather than hanging", () => {
    const document: GraphDocument = {
        nodes: [
            { id: "a", type: "Pass", x: 0, y: 0, values: {} },
            { id: "b", type: "Pass", x: 0, y: 0, values: {} }
        ],
        edges: [
            { id: "e1", fromNode: "a", fromPin: "Output", toNode: "b", toPin: "Input", points: [] },
            { id: "e2", fromNode: "b", fromPin: "Output", toNode: "a", toPin: "Input", points: [] }
        ],
        groups: []
    };

    assert.equal(resolveOutputType(document, types, "a", "Output"), "any");
});

test("a slice carries only the edges that run between two of its own nodes", () => {
    const document: GraphDocument = {
        nodes: [
            { id: "a", type: "Number", x: 0, y: 0, values: {} },
            { id: "b", type: "Pass", x: 0, y: 0, values: {} },
            { id: "c", type: "Pass", x: 0, y: 0, values: {} }
        ],
        edges: [
            { id: "e1", fromNode: "a", fromPin: "Result", toNode: "b", toPin: "Input", points: [] },
            { id: "e2", fromNode: "b", fromPin: "Output", toNode: "c", toPin: "Input", points: [] }
        ],
        groups: []
    };

    const cut = slice(document, new Set(["a", "b"]));

    assert.deepEqual(cut.nodes.map(node => node.id), ["a", "b"]);
    assert.deepEqual(cut.edges.map(edge => edge.id), ["e1"]);
});

test("a pasted copy is renamed throughout and moved by the offset", () => {
    const cut = {
        nodes: [{ id: "a", type: "Number", x: 10, y: 10, values: {} }, { id: "b", type: "Pass", x: 30, y: 10, values: {} }],
        edges: [{ id: "e1", fromNode: "a", fromPin: "Result", toNode: "b", toPin: "Input", points: [{ x: 20, y: 12 }] }]
    };

    const copy = duplicate(cut, 40, 40);

    assert.equal(copy.nodes[0].x, 50);
    assert.notEqual(copy.nodes[0].id, "a");
    assert.equal(copy.edges[0].fromNode, copy.nodes[0].id);
    assert.equal(copy.edges[0].toNode, copy.nodes[1].id);
    assert.deepEqual(copy.edges[0].points, [{ x: 60, y: 52 }]);
});

test("a document off the wire is read with every part present", () => {
    const read = readDocument({ nodes: [{ id: "a", type: "Number" }] });

    assert.equal(read.nodes.length, 1);
    assert.equal(read.nodes[0].x, 0);
    assert.deepEqual(read.nodes[0].values, {});
    assert.equal(read.nodes[0].width, null);
    assert.equal(read.nodes[0].height, null);
    assert.deepEqual(read.edges, []);
    assert.deepEqual(read.groups, []);
});

test("a size the viewer dragged is read, and a nonsense one is no size at all", () => {
    const read = readDocument({
        nodes: [
            { id: "a", type: "Number", width: 240, height: 180 },
            { id: "b", type: "Number", width: 0, height: -4 }
        ]
    });

    assert.equal(read.nodes[0].width, 240);
    assert.equal(read.nodes[0].height, 180);
    assert.equal(read.nodes[1].width, null);
    assert.equal(read.nodes[1].height, null);
});

test("a pin shown beside another appears only for the values the rule names", () => {
    const named: Pin = { name: "ByZero", title: "By zero", type: "text", editor: "Choice", visibleWhen: "Operation", visibleValues: ["Divide"] };
    const any: Pin = { name: "Note", title: "Note", type: "text", editor: "Text", visibleWhen: "Operation" };
    const always: Pin = { name: "Left", title: "Left", type: "number", editor: "Number" };

    assert.equal(isPinVisible(named, { Operation: "Divide" }), true);
    assert.equal(isPinVisible(named, { Operation: "Add" }), false);
    assert.equal(isPinVisible(named, {}), false);

    // With no values named, any value at all but an empty one shows it.
    assert.equal(isPinVisible(any, { Operation: "Add" }), true);
    assert.equal(isPinVisible(any, { Operation: "" }), false);
    assert.equal(isPinVisible(any, { Operation: false }), false);
    assert.equal(isPinVisible(any, { Operation: 0 }), true);

    assert.equal(isPinVisible(always, {}), true);
});

test("every edge feeding one pin is answered in the document's own order", () => {
    const document: GraphDocument = {
        nodes: [],
        edges: [
            { id: "e1", fromNode: "a", fromPin: "Result", toNode: "sum", toPin: "Values", points: [] },
            { id: "e2", fromNode: "b", fromPin: "Result", toNode: "sum", toPin: "Other", points: [] },
            { id: "e3", fromNode: "c", fromPin: "Result", toNode: "sum", toPin: "Values", points: [] }
        ],
        groups: []
    };

    assert.deepEqual(edgesInto(document, "sum", "Values").map(edge => edge.id), ["e1", "e3"]);
});
