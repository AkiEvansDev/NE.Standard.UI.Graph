// What the node canvas registers beyond the canvas's own: events and effects for a run and an upload, each addressed by the
// canvas and the node they're about.

import type { EffectContext, GlobalApi } from "ne-standard-ui";
import type { GraphEngine } from "../canvas/canvas.ts";
import { findCanvas } from "../canvas/canvas.ts";
import { NodesKind } from "./nodes-kind.ts";
import { StopEventName } from "./nodes-run-panel.ts";
import { UploadEventName } from "./nodes-upload.ts";

/** The effect kind a node's status travels under. */
const StatusEffectKind = "graph.set-node-status";

/** The effect kind a display pin's value travels under. */
const DisplayEffectKind = "graph.set-node-display";

/** The effect kind a pin's saved value travels under — the answer to an upload. */
const ValueEffectKind = "graph.set-node-value";

/** The effect kind a line of a run's log travels under. */
const LogEffectKind = "graph.add-node-log";

/** The effect kind a run's progress travels under. */
const RunProgressEffectKind = "graph.set-run-progress";

/** The effect kind a run's beginning and end travel under. */
const RunningEffectKind = "graph.set-running";

type NodeEffect = {
    target?: { id?: unknown; dynamicParameters?: readonly unknown[] };
    level?: unknown;
    completed?: unknown;
    total?: unknown;
    running?: unknown;
    nodeId?: string;
    pinName?: string;
    value?: unknown;
    committed?: unknown;
    state?: string;
    progress?: unknown;
    message?: unknown;
};

export function registerNodes(api: GlobalApi, engine: () => GraphEngine | null): void {
    // A click on a node: the command's key is the node's id, which the canvas names rather than the `data-ui-key` chain.
    api.registerEvent<CustomEvent<{ nodeId: string }>>("node-click", {
        dynamicParameters: context => [context.domEvent.detail?.nodeId ?? ""]
    });

    // A file chosen on a picture pin, once it has reached the server: four keys, the node, the pin, the selection and the file.
    api.registerEvent<CustomEvent<{ keys: readonly string[] }>>(UploadEventName, {
        dynamicParameters: context => [...(context.domEvent.detail?.keys ?? [])]
    });

    // The node canvas an effect is addressed to, by the canvas it names; none when that canvas is not a node canvas.
    const nodesOf = (context: EffectContext, effect: NodeEffect): NodesKind | null => {
        const component = findCanvas(context, effect);

        return component === null ? null : engine()?.kindOf(component, NodesKind) ?? null;
    };

    const withNodes = (context: EffectContext, apply: (kind: NodesKind, nodeId: string, effect: NodeEffect) => void): void => {
        const effect = context.effect as NodeEffect;
        const kind = nodesOf(context, effect);

        if (kind !== null && effect.nodeId !== undefined)
            apply(kind, effect.nodeId, effect);
    };

    // One node's status, addressed by the canvas and the node's id: state, progress and a message, never a patch of the document.
    api.registerEffect({
        kind: StatusEffectKind,
        handler: context => withNodes(context, (kind, nodeId, effect) => kind.setStatus(nodeId, effect.state ?? "Idle", typeof effect.progress === "number" ? effect.progress : null, effect.message ?? null))
    });

    // What a display pin shows, and what a picture pin was finally stored as: both addressed the same way the status is.
    api.registerEffect({
        kind: DisplayEffectKind,
        handler: context => withNodes(context, (kind, nodeId, effect) => kind.setDisplay(nodeId, effect.pinName ?? "", effect.value))
    });

    api.registerEffect({
        kind: ValueEffectKind,
        handler: context => withNodes(context, (kind, nodeId, effect) => kind.setPinValue(nodeId, effect.pinName ?? "", effect.value, effect.committed === true))
    });

    // A line of a run's log, addressed by the canvas and the node it came from; a click on it takes the view to that node.
    api.registerEffect({
        kind: LogEffectKind,
        handler: context => withNodes(context, (kind, nodeId, effect) => kind.addLog(nodeId, String(effect.level ?? "Info"), effect.message ?? null))
    });

    // How far a run has come: none through begins it (and clears the log), all through ends it.
    api.registerEffect({
        kind: RunProgressEffectKind,
        handler: context => {
            const effect = context.effect as NodeEffect;

            nodesOf(context, effect)?.setRunProgress(Number(effect.completed) || 0, Number(effect.total) || 0);
        }
    });

    // A run of the sheet has begun or ended: the run panel holds its Run buttons and offers Stop in between.
    api.registerEffect({
        kind: RunningEffectKind,
        handler: context => {
            const effect = context.effect as NodeEffect;

            nodesOf(context, effect)?.setRunning(effect.running === true);
        }
    });

    // The run panel's Stop, while a run is on.
    api.registerEvent<CustomEvent>(StopEventName, {});
}
