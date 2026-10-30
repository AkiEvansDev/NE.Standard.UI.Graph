import "./styles/ui-graph.less";
import type { CanvasDocument } from "./canvas/canvas-model.ts";
import type { CanvasKindDefinition } from "./canvas/canvas-kind.ts";
import { DocumentAttribute } from "./canvas/canvas-dom.ts";
import { DocumentValueKind, GraphEngine, SaveEffectKind, findCanvas } from "./canvas/canvas.ts";
import { readJson } from "./canvas/canvas-model.ts";
import { frameworkApi } from "./framework-api.ts";
import { LayeredKind, LayeredKindDefinition } from "./graph/layered-kind.ts";
import { NodesKindDefinition } from "./nodes/nodes-kind.ts";
import { ProductionKind, ProductionKindDefinition } from "./production/production-kind.ts";
import { registerNodes } from "./nodes/nodes.ts";

const api = frameworkApi();

// Every kind of canvas the package draws, by the name its renderer writes on the root.
const kinds = [NodesKindDefinition, LayeredKindDefinition, ProductionKindDefinition] as readonly CanvasKindDefinition<CanvasDocument>[];

// One engine per runtime root, reached by climbing from the canvas element an event, sink or effect names.
const engines = new Map<ParentNode, GraphEngine>();

function engineFor(element: Node): GraphEngine | null {
    for (let current: Node | null = element; current !== null; current = current.parentNode) {
        const found = engines.get(current as ParentNode);

        if (found !== undefined)
            return found;
    }

    return null;
}

api.registerEngine(context => {
    const engine = new GraphEngine(context, kinds);

    engines.set(context.root, engine);

    return {
        dispose(): void {
            if (engines.get(context.root) === engine)
                engines.delete(context.root);

            engine.dispose();
        }
    };
});

// Ctrl+S, the menu's Save, or a command's save request, raised on the value element after its `change`; the command waits for
// the document first and, bound `OnSubmit`, submits the canvas's form — the canvas counts itself saved once it answers.
// Written out, as every registration is, for the server's tests to read: `SaveEventName`, which the document dispatches.
api.registerEvent<CustomEvent<{ reason: string; id?: number }>>("graph-save", {
    settlesValue: true,
    ownTarget: true,
    submitsForm: true,
    dynamicParameters: context => [context.domEvent.detail?.reason ?? ""],
    completed: context => engineFor(context.component)?.saveCompleted(context.component, context.success, context.domEvent.detail?.id, context.domEvent.detail?.reason ?? "")
});

// An entry an application put into one of the canvas's menus, raised on the entry as its menu's own event: the entry's keys, which
// the server checks against the menu, then the id of what the menu was opened on (`CanvasMenus.raiseEntry`).
api.registerEvent<CustomEvent<{ target?: string }>>("menu-entry", {
    ownTarget: true,
    dynamicParameters: context => [...context.dynamicParameters, context.domEvent.detail?.target ?? ""]
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
// A node canvas's NodeCornerRadius, a corner each: CSS cannot take one corner out of a four-value radius.
api.registerConverter("graph-corner-top-left", value => cornerCss(value, "topLeft"));
api.registerConverter("graph-corner-top-right", value => cornerCss(value, "topRight"));
api.registerConverter("graph-corner-bottom-right", value => cornerCss(value, "bottomRight"));
api.registerConverter("graph-corner-bottom-left", value => cornerCss(value, "bottomLeft"));

// A command asking for the sheet the viewer has: the canvas commits it and its save event follows, carrying the reason given here.
api.registerEffect({
    kind: SaveEffectKind,
    handler: context => {
        const effect = context.effect as { target?: { id?: unknown; dynamicParameters?: readonly unknown[] }; reason?: unknown };
        const component = findCanvas(context, effect);

        if (component !== null)
            engineFor(component)?.requestSave(component, typeof effect.reason === "string" ? effect.reason : "");
    }
});

registerNodes(api, engineFor);

// A graph's nodes: its bound collection reaches the canvas as values, the initial reset and insert among them.
api.registerCollectionSink({ kind: "layered", handler: change => engineFor(change.component)?.kindOf(change.component, LayeredKind)?.applyChange(change) });

// A production graph's catalogue: resources and crafts in one bound collection, reaching the canvas the same way.
api.registerCollectionSink({ kind: "production", handler: change => engineFor(change.component)?.kindOf(change.component, ProductionKind)?.applyChange(change) });

// One corner of a corner radius as the wire carries it, in px; unset clears the variable, and the stylesheet's radius stands.
function cornerCss(value: unknown, corner: "topLeft" | "topRight" | "bottomRight" | "bottomLeft"): string {
    if (value === null || typeof value !== "object")
        return "";

    const length = (value as Partial<Record<typeof corner, unknown>>)[corner];

    return `${typeof length === "number" ? length : 0}px`;
}
