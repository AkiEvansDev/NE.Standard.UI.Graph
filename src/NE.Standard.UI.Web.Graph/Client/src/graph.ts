import "./styles/ui-graph.less";
import type { CanvasDocument } from "./canvas/canvas-model.ts";
import type { CanvasKindDefinition } from "./canvas/canvas-kind.ts";
import { DocumentAttribute } from "./canvas/canvas-dom.ts";
import { DocumentValueKind, GraphEngine, SaveEffectKind, findCanvas } from "./canvas/canvas.ts";
import { readJson } from "./canvas/canvas-model.ts";
import { frameworkApi } from "./framework-api.ts";
import { GraphKind, GraphKindDefinition } from "./graph/graph-kind.ts";
import { NodesKindDefinition } from "./nodes/nodes-kind.ts";
import { ProductionKind, ProductionKindDefinition } from "./production/production-kind.ts";
import { registerNodes } from "./nodes/nodes.ts";

const api = frameworkApi();

// Every kind of canvas the package draws, by the name its renderer writes on the root.
const kinds = [NodesKindDefinition, GraphKindDefinition, ProductionKindDefinition] as readonly CanvasKindDefinition<CanvasDocument>[];

// The engine is what the effects below reach into; it starts after every built-in one and before the page's first changes.
let engine: GraphEngine | null = null;

api.registerEngine(context => {
    engine = new GraphEngine(context, kinds);
});

// Ctrl+S, the menu's Save, or a command's save request, raised on the value element after its `change`; the command waits for
// the document first and, bound `OnSubmit`, submits the canvas's form — the canvas counts itself saved once it answers.
api.registerEvent<CustomEvent<{ reason: string }>>("save", {
    settlesValue: true,
    submitsForm: true,
    dynamicParameters: context => [context.domEvent.detail?.reason ?? ""],
    completed: context => engine?.saveCompleted(context.component, context.success)
});

// An entry an application put into one of the canvas's menus: which entry, the kind of thing the menu was opened on, and its id.
api.registerEvent<CustomEvent<{ keys: readonly string[] }>>("menu-entry", {
    dynamicParameters: context => [...(context.domEvent.detail?.keys ?? [])]
});

// A canvas's one writable value: the document, as JSON on the hidden element the renderer wrote.
api.registerValueReader({
    kind: DocumentValueKind,
    read: element => readJson(element.getAttribute(DocumentAttribute))
});

// A document the server pushed: the attribute is written so a reload's reader agrees with what's drawn; the engine's value-change handler redraws it.
api.registerDomOperation({
    kind: DocumentValueKind,
    handler: context => context.target.setAttribute(DocumentAttribute, JSON.stringify(context.value ?? null))
});

api.registerConverter("graph-edge-shape", value => String(value ?? "Orthogonal").toLowerCase());
api.registerConverter("graph-rem", value => (typeof value === "number" && value > 0 ? `${value}rem` : ""));
api.registerConverter("graph-direction", value => {
    const named = String(value ?? "");

    return named === "TopToBottom" ? "down" : named === "RightToLeft" ? "left" : named === "BottomToTop" ? "up" : "right";
});
api.registerConverter("graph-node-shape", value => (String(value ?? "") === "Icon" ? "icon" : "card"));
api.registerConverter("graph-production-mode", value => (String(value ?? "") === "Plan" ? "plan" : "constructor"));

// A command asking for the sheet the viewer has: the canvas commits it and its save event follows, carrying the reason given here.
api.registerEffect({
    kind: SaveEffectKind,
    handler: context => {
        const effect = context.effect as { target?: { id?: unknown; dynamicParameters?: readonly unknown[] }; reason?: unknown };
        const component = findCanvas(context, effect);

        if (component !== null)
            engine?.requestSave(component, typeof effect.reason === "string" ? effect.reason : "");
    }
});

registerNodes(api, () => engine);

// A graph's nodes: its bound collection reaches the canvas as values, the initial reset and insert among them.
api.registerCollectionSink({ kind: "graph", handler: change => engine?.kindOf(change.component, GraphKind)?.applyChange(change) });

// A production graph's catalogue: resources and crafts in one bound collection, reaching the canvas the same way.
api.registerCollectionSink({ kind: "production", handler: change => engine?.kindOf(change.component, ProductionKind)?.applyChange(change) });
