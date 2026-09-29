import assert from "node:assert/strict";
import test from "node:test";
import { canConnect, canResetPin, createNode, dropParameter, duplicate, edgesInto, isParameterAllowed, isPinVisible, readDocument, resetPin, resolveOutputType, slice } from "../src/nodes/model.ts";
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
        groups: [],
        key: null,
        parameters: []
    };

    assert.equal(resolveOutputType(document, types, "b", "Output"), "number");
});

test("an output that follows an unconnected input falls back to that input's own type", () => {
    const document: GraphDocument = {
        nodes: [{ id: "b", type: "Pass", x: 0, y: 0, values: {} }],
        edges: [],
        groups: [],
        key: null,
        parameters: []
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
        groups: [],
        key: null,
        parameters: []
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
        groups: [],
        key: null,
        parameters: []
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
    const operation: Pin = { name: "Operation", title: "Operation", type: "text", editor: "Choice" };
    const named: Pin = { name: "ByZero", title: "By zero", type: "text", editor: "Choice", visibleWhen: "Operation", visibleValues: ["Divide"] };
    const any: Pin = { name: "Note", title: "Note", type: "text", editor: "Text", visibleWhen: "Operation" };
    const always: Pin = { name: "Left", title: "Left", type: "number", editor: "Number" };
    const type: NodeType = { key: "Op", title: "Op", inputs: [operation, named, any, always], outputs: [] };
    const visible = (pin: Pin, values: Record<string, unknown>): boolean => isPinVisible(pin, { values }, type);

    assert.equal(visible(named, { Operation: "Divide" }), true);
    assert.equal(visible(named, { Operation: "Add" }), false);
    assert.equal(visible(named, {}), false);

    // With no values named, any value at all but an empty one shows it.
    assert.equal(visible(any, { Operation: "Add" }), true);
    assert.equal(visible(any, { Operation: "" }), false);
    assert.equal(visible(any, { Operation: false }), false);
    assert.equal(visible(any, { Operation: 0 }), true);

    assert.equal(visible(always, {}), true);
});

test("a pin shown beside another reads that one's default where the node holds no value, as its field shows", () => {
    const shape: Pin = { name: "Shape", title: "Shape", type: "text", editor: "Choice", defaultValue: "Circle" };
    const radius: Pin = { name: "Radius", title: "Radius", type: "number", editor: "Number", visibleWhen: "Shape", visibleValues: ["Circle"] };
    const type: NodeType = { key: "Shape", title: "Shape", inputs: [shape, radius], outputs: [] };

    assert.equal(isPinVisible(radius, { values: {} }, type), true);
    assert.equal(isPinVisible(radius, { values: { Shape: "Square" } }, type), false);
});

test("every edge feeding one pin is answered in the document's own order", () => {
    const document: GraphDocument = {
        nodes: [],
        edges: [
            { id: "e1", fromNode: "a", fromPin: "Result", toNode: "sum", toPin: "Values", points: [] },
            { id: "e2", fromNode: "b", fromPin: "Result", toNode: "sum", toPin: "Other", points: [] },
            { id: "e3", fromNode: "c", fromPin: "Result", toNode: "sum", toPin: "Values", points: [] }
        ],
        groups: [],
        key: null,
        parameters: []
    };

    assert.deepEqual(edgesInto(document, "sum", "Values").map(edge => edge.id), ["e1", "e3"]);
});

// Every kind of input a parameter is judged by: a field, the kinds with no field of their own, and a hidden state.
const fieldsType: NodeType = {
    key: "Fields",
    title: "Fields",
    inputs: [
        { name: "Amount", title: "Amount", type: "number", editor: "Number", defaultValue: 1 },
        { name: "Picture", title: "Picture", type: "image", editor: "Image" },
        { name: "Values", title: "Values", type: "array:number", editor: "List", defaultValue: [] },
        { name: "Anything", title: "Anything", type: "any", editor: "None" },
        { name: "Shown", title: "Shown", type: "any", editor: "Display" },
        { name: "Kept", title: "Kept", type: "number", editor: "Number", defaultValue: 0, state: true, hidden: true }
    ],
    outputs: [{ name: "Result", title: "Result", type: "number", editor: "None" }]
};

const fieldTypes = new Map<string, NodeType>([[fieldsType.key, fieldsType]]);

/** Two nodes of one kind, the second's result wired into the first's amount. */
function fieldsSheet(): GraphDocument {
    return {
        nodes: [
            { id: "a", type: "Fields", x: 0, y: 0, title: null, color: null, pinned: false, values: { Amount: 5 } },
            { id: "b", type: "Fields", x: 200, y: 0, title: null, color: null, pinned: false, values: { Amount: 7, Values: [1, 2] } }
        ],
        edges: [{ id: "e", fromNode: "b", fromPin: "Result", toNode: "a", toPin: "Amount", points: [] }],
        groups: [],
        key: null,
        parameters: [{ node: "b", pin: "Amount" }]
    };
}

test("only an unwired input with a field of its own may be a parameter", () => {
    const document = fieldsSheet();

    assert.equal(isParameterAllowed(document, fieldTypes, "b", "Amount"), true);
    assert.equal(isParameterAllowed(document, fieldTypes, "a", "Amount"), false);

    for (const pin of ["Picture", "Values", "Anything", "Shown", "Kept", "Result", "Missing"])
        assert.equal(isParameterAllowed(document, fieldTypes, "b", pin), false, pin);

    assert.equal(isParameterAllowed(document, fieldTypes, "gone", "Amount"), false);
});

test("an input its node hides for now may not be a parameter, and may again once it shows", () => {
    const divideType: NodeType = {
        key: "Divide",
        title: "Divide",
        inputs: [
            { name: "Operation", title: "Operation", type: "enum:Operation", editor: "Choice", defaultValue: "Add" },
            { name: "ByZero", title: "By zero", type: "enum:ByZero", editor: "Choice", defaultValue: "Fail", visibleWhen: "Operation", visibleValues: ["Divide"] }
        ],
        outputs: []
    };
    const divideTypes = new Map<string, NodeType>([[divideType.key, divideType]]);
    const document: GraphDocument = {
        nodes: [{ id: "d", type: "Divide", x: 0, y: 0, title: null, color: null, pinned: false, values: {} }],
        edges: [],
        groups: [],
        key: null,
        parameters: [{ node: "d", pin: "ByZero" }]
    };

    assert.equal(isParameterAllowed(document, divideTypes, "d", "ByZero"), false);

    document.nodes[0].values["Operation"] = "Divide";

    assert.equal(isParameterAllowed(document, divideTypes, "d", "ByZero"), true);
    assert.equal(document.parameters.length, 1);
});

test("a parameter dropped is gone from the sheet's list, and dropping one that is not there changes nothing", () => {
    const document = fieldsSheet();

    assert.equal(dropParameter(document, "a", "Amount"), false);
    assert.equal(document.parameters.length, 1);
    assert.equal(dropParameter(document, "b", "Amount"), true);
    assert.deepEqual(document.parameters, []);
});

test("an input's reset lets its wire go and puts the kind's default back", () => {
    const document = fieldsSheet();

    assert.equal(canResetPin(document, fieldTypes, "a", "Amount", "in"), true);
    resetPin(document, fieldTypes, "a", "Amount", "in");

    assert.deepEqual(document.edges, []);
    assert.equal(document.nodes[0].values["Amount"], 1);
    assert.equal(canResetPin(document, fieldTypes, "a", "Amount", "in"), false);
});

test("an output's reset only lets its wires go, and the value of the node it fed stays", () => {
    const document = fieldsSheet();

    assert.equal(canResetPin(document, fieldTypes, "b", "Result", "out"), true);
    resetPin(document, fieldTypes, "b", "Result", "out");

    assert.deepEqual(document.edges, []);
    assert.equal(document.nodes[1].values["Amount"], 7);
    assert.equal(document.nodes[0].values["Amount"], 5);
    assert.equal(canResetPin(document, fieldTypes, "b", "Result", "out"), false);
});

test("a pin with nothing to reset offers none: a default value, an absent one, a display or a pin-only input with no wire", () => {
    const document = fieldsSheet();

    document.edges = [];
    document.nodes[0].values["Amount"] = 1;

    assert.equal(canResetPin(document, fieldTypes, "a", "Amount", "in"), false);
    assert.equal(canResetPin(document, fieldTypes, "a", "Picture", "in"), false);
    assert.equal(canResetPin(document, fieldTypes, "a", "Shown", "in"), false);
    assert.equal(canResetPin(document, fieldTypes, "a", "Anything", "in"), false);
    assert.equal(canResetPin(document, fieldTypes, "b", "Values", "in"), true);

    resetPin(document, fieldTypes, "b", "Values", "in");

    assert.deepEqual(document.nodes[1].values["Values"], []);
});
