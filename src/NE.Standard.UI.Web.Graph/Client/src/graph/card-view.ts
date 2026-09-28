// Draws one graph node as a card (icon/picture, title, subtitle, badge) or a circle (picture/icon, its title under it and as its tooltip).
// The title carries the class a rename field lays over; the root carries the attribute every canvas finds an item by.

import type { Icons, Tooltips } from "ne-standard-ui";
import { ItemTitleSelector, NodeAttribute } from "../canvas/canvas-dom.ts";
import type { CanvasItem } from "../canvas/canvas-model.ts";
import type { DraftConflict } from "./draft.ts";
import { EntryAttribute, HandleAttribute } from "./link-drag.ts";
import type { GraphNode, GraphNodeShape } from "./model.ts";

export type CardViewOptions = {
    readonly icons: Icons;
    readonly tooltips: Tooltips;
    /** The graph's shape, for a node that names none of its own. */
    readonly shape: GraphNodeShape;
    /** Whether the node wears the handle a link is pulled out of. */
    readonly connectable: boolean;
    /** How the server moved this node under the viewer's draft, if it did. */
    readonly conflict: DraftConflict | null;
};

const TitleClass = ItemTitleSelector.slice(1);

export function renderCard(placement: CanvasItem, node: GraphNode, options: CardViewOptions): HTMLElement {
    const root = document.createElement("div");
    const round = (node.shape ?? options.shape) === "icon";
    const title = node.title ?? node.id;

    root.className = round ? "ui-graph__node ui-graph__bubble" : "ui-graph__node ui-graph__card";
    root.setAttribute(NodeAttribute, node.id);
    root.style.setProperty("--ui-graph-node-x", String(placement.x));
    root.style.setProperty("--ui-graph-node-y", String(placement.y));

    if (node.color !== null && node.color.length > 0)
        root.style.setProperty("--ui-graph-node-color", node.color);

    if (options.conflict !== null)
        root.setAttribute("data-ui-graph-conflict", options.conflict);

    if (placement.pinned === true)
        root.setAttribute("data-ui-graph-pinned", "");

    const face = renderFace(node, round ? "ui-graph__bubble-face" : "ui-graph__card-icon", options);

    if (face !== null)
        root.append(face);

    if (round)
        root.append(renderTitle(title, "ui-graph__bubble-title"));
    else
        root.append(renderText(node, title));

    if (node.badge !== null)
        root.append(renderBadge(node.badge, round ? "ui-graph__bubble-badge" : "ui-graph__card-badge"));

    if (options.connectable) {
        const handle = document.createElement("span");
        const entry = document.createElement("span");

        handle.className = "ui-graph__handle";
        handle.setAttribute(HandleAttribute, "");
        entry.className = "ui-graph__entry";
        entry.setAttribute(EntryAttribute, "");
        root.append(entry, handle);
    }

    // A circle's title, small under it, is also what the pointer reads when the node names no words of its own.
    const words = node.tooltip ?? (round ? title : null);

    if (words !== null) {
        root.addEventListener("pointerenter", () => options.tooltips.show(root, words));
        root.addEventListener("pointerleave", () => options.tooltips.hide());
    }

    return root;
}

/** The node's picture when it has one, else its icon; a circle with neither still draws its face, in the node's colour. */
function renderFace(node: GraphNode, className: string, options: CardViewOptions): HTMLElement | null {
    const round = className === "ui-graph__bubble-face";

    if (node.image === null && node.icon === null && !round)
        return null;

    const face = document.createElement("span");

    face.className = className;
    face.setAttribute("aria-hidden", "true");

    if (node.image !== null) {
        const picture = document.createElement("img");

        picture.src = node.image;
        picture.alt = "";
        picture.draggable = false;
        face.setAttribute("data-ui-graph-picture", "");
        face.append(picture);
    }
    else if (node.icon !== null) {
        const glyph = document.createElement("span");

        options.icons.apply(glyph, node.icon);
        face.append(glyph);
    }

    return face;
}

function renderText(node: GraphNode, title: string): HTMLElement {
    const text = document.createElement("div");

    text.className = "ui-graph__card-text";
    text.append(renderTitle(title, null));

    if (node.subtitle !== null) {
        const subtitle = document.createElement("span");

        subtitle.className = "ui-graph__card-subtitle";
        subtitle.textContent = node.subtitle;
        text.append(subtitle);
    }

    return text;
}

function renderTitle(title: string, className: string | null): HTMLElement {
    const element = document.createElement("span");

    element.className = className === null ? TitleClass : `${TitleClass} ${className}`;
    element.textContent = title;

    return element;
}

/** The framework's own badge, drawn in its classes, as the log's count is. */
function renderBadge(value: string, className: string): HTMLElement {
    const badge = document.createElement("span");
    const text = document.createElement("span");

    badge.className = `ui-badge ui-badge-style--surface ${className}`;
    badge.setAttribute("data-ui-badge-text", "");
    text.className = "ui-badge__text";
    text.textContent = value;
    badge.append(text);

    return badge;
}
