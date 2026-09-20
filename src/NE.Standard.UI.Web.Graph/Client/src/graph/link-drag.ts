// A layered canvas's two structural gestures: a link pulled from a node's handle and dropped on its target, and text edited in a
// chip on the sheet.

import { markAimed } from "../canvas/aim.ts";
import type { CanvasServices, KindDrag } from "../canvas/canvas-kind.ts";
import { NodeAttribute } from "../canvas/canvas-dom.ts";
import type { CanvasDocument, Point } from "../canvas/canvas-model.ts";

/** On a node's handle: pressed, it pulls a link out of the node. */
export const HandleAttribute = "data-ui-graph-handle";
/** On a node's entry point: where a link pulled to the node lands, shown while one is being pulled. */
export const EntryAttribute = "data-ui-graph-entry";
/** On the node a link is being pulled out of, while it is. */
const SourceAttribute = "data-ui-graph-link-source";
/** On a node while a pulled link is over the sheet: `yes` for the one it would land on, `no` for one that would refuse it. */
const DropAttribute = "data-ui-graph-drop";
const ConnectingClass = "ui-graph--connecting";

export type LinkRules = {
    /** Whether a link from the one node may land on the other. */
    canLink(from: string, to: string): boolean;
    /** The link dropped on a node that takes it, and where on the page the pointer let go of it. */
    link(from: string, to: string, at: { readonly clientX: number; readonly clientY: number }): void;
};

/** A press on a node's handle: a link pulled out of it, and dropped on the node it goes to. */
export function beginLinkDrag(services: CanvasServices<CanvasDocument>, handle: HTMLElement, rules: LinkRules): KindDrag | null {
    const source = handle.closest<HTMLElement>(`[${NodeAttribute}]`);
    const from = source?.getAttribute(NodeAttribute) ?? null;

    if (source === null || from === null)
        return null;

    const root = services.root;
    let target: HTMLElement | null = null;

    root.classList.add(ConnectingClass);
    source.setAttribute(SourceAttribute, "");

    for (const node of services.nodeLayer.querySelectorAll<HTMLElement>(`[${NodeAttribute}]`)) {
        const id = node.getAttribute(NodeAttribute)!;

        if (id !== from && !rules.canLink(from, id))
            node.setAttribute(DropAttribute, "no");
    }

    // Re-found by id at every step: a redraw during the drag replaces the elements, and the ones the press landed on would measure as nothing.
    const sourceNow = (): HTMLElement | null => services.nodeLayer.querySelector<HTMLElement>(`[${NodeAttribute}="${CSS.escape(from)}"]`);
    const handleNow = (): HTMLElement => sourceNow()?.querySelector<HTMLElement>(`[${HandleAttribute}]`) ?? handle;

    return {
        kind: "kind",
        // The line ends at the pointer until it is over a node that would take it, and then at that node's entry point.
        move: (scene, event) => {
            target = aim(services, from, event, rules);

            const entry = target?.querySelector(`[${EntryAttribute}]`) ?? null;

            services.drawPending(services.centerOf(handleNow()), entry === null ? scene : services.centerOf(entry), "var(--ui-color-primary)");
        },
        finish: event => {
            const to = target?.getAttribute(NodeAttribute) ?? null;

            if (to !== null)
                rules.link(from, to, event);
        },
        end: () => {
            root.classList.remove(ConnectingClass);
            source.removeAttribute(SourceAttribute);
            sourceNow()?.removeAttribute(SourceAttribute);

            for (const marked of services.nodeLayer.querySelectorAll<HTMLElement>(`[${DropAttribute}]`))
                marked.removeAttribute(DropAttribute);
        }
    };
}

/** The node under the pointer that a link would land on, marked; the node the link leaves is never its own target here. */
function aim(services: CanvasServices<CanvasDocument>, from: string, event: PointerEvent, rules: LinkRules): HTMLElement | null {
    const under = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(`[${NodeAttribute}]`) ?? null;
    const id = under?.getAttribute(NodeAttribute) ?? null;
    const target = under !== null && id !== null && id !== from && services.nodeLayer.contains(under) && rules.canLink(from, id) ? under : null;

    markAimed(services.nodeLayer, target, (element, on) => {
        if (on)
            element.setAttribute(DropAttribute, "yes");
        else
            element.removeAttribute(DropAttribute);
    });

    return target;
}

/** The middle of a drawn edge, in canvas units: where its caption stands, or would. */
export function edgeMiddle(services: CanvasServices<CanvasDocument>, id: string): Point | null {
    const path = services.root.querySelector<SVGPathElement>(`.ui-graph__edge[data-ui-graph-edge="${CSS.escape(id)}"]`);

    return path === null ? null : path.getPointAtLength(path.getTotalLength() / 2);
}

/** Opens the framework's rename field in a chip centred on a point, over the chip's title text; commit gets what was typed untrimmed, and the chip is removed when done. */
export function openChipField(services: CanvasServices<CanvasDocument>, at: Point, value: string, commit: (value: string) => void): void {
    if (services.settings.readOnly)
        return;

    const box = document.createElement("div");
    const title = document.createElement("span");

    box.className = "ui-graph__caption-edit";
    title.className = "ui-graph__caption-edit-text";
    box.style.left = `${at.x}px`;
    box.style.top = `${at.y}px`;
    title.textContent = value;
    box.append(title);
    // Beside the layers, not in one: a redraw empties a layer, and the field has to outlive the commit's own redraw.
    services.scene.append(box);

    services.context.renames.open({
        container: box,
        title,
        className: "ui-graph__caption-field",
        value,
        allowEmpty: true,
        commit,
        done: () => {
            box.remove();
            services.view.viewportElement.focus({ preventScroll: true });
        }
    });
}
