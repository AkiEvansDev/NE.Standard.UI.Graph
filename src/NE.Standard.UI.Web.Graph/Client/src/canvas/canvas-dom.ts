// The names the renderer and the canvas meet on, and the framework's that the plugin surface's `names` lacks, spelled once here
// (GraphClientNamesSyncTests holds both sides).

import type { PluginEngineContext, Tooltips } from "ne-standard-ui";

export const RootSelector = ".ui-graph";
/** On the root: which kind of canvas the renderer wrote, and so which kind the engine draws it with. */
export const KindAttribute = "data-ui-graph-kind";
export const DocumentAttribute = "data-ui-graph-document";
export const GroupAttribute = "data-ui-graph-group";
export const SelectedAttribute = "data-ui-graph-selected";
export const EdgeAttribute = "data-ui-graph-edge";
export const ReroutAttribute = "data-ui-graph-reroute";
/** On an item's root element: the item's id. */
export const NodeAttribute = "data-ui-graph-node";
/** On the corner an item is dragged larger by. */
export const ResizeAttribute = "data-ui-graph-resize";
/** On an item's own pin mark, which pins it or lets it go on the press. */
export const PinToggleAttribute = "data-ui-graph-pin-toggle";
/** On an item's own fold mark. */
export const FoldAttribute = "data-ui-graph-fold";
/** On a folded item's root element. */
export const CollapsedAttribute = "data-ui-graph-collapsed";
/** On the root: whether the corner map is drawn. */
export const MinimapAttribute = "data-ui-graph-minimap";
/** What a rename field is laid over: an item's title, which a kind draws under this class. */
export const ItemTitleSelector = ".ui-graph__node-title";
/** On a template a part of the canvas is cloned from — a node's editor, a plan's amount: the region's name. */
const EditorTemplateAttribute = "data-ui-graph-editor";
/** On the root while a connection is pulled across the sheet — a wire from a pin, a link from a node's handle. */
export const ConnectingClass = "ui-graph--connecting";
/** On a part while a connection is pulled: `yes` for one it would land on, `no` for one that would refuse it. */
export const DropAttribute = "data-ui-graph-drop";
/** On the box the corner menu stands in, in the canvas's leading corner: the menu's name. */
export const MenuPanelAttribute = "data-ui-graph-menu-panel";
/** On a panel of the kind's that takes a column of the viewport's trailing side while it is open — a folding control of the framework's. */
export const SideAttribute = "data-ui-graph-side";

/** The framework's names the canvas reads that the plugin surface's `names` does not carry. */
export const CoreNames = {
    menuOpeningEvent: "ui-context-menu-opening",
    collapsed: "data-ui-collapsed",
    collapseToggle: "data-ui-collapse-toggle",
    menuClass: "ui-menu",
    menuItemValueClass: "ui-menu-item__value",
    pictureSelectionClass: "ui-image-input__selection",
    pictureTextClass: "ui-image-input__text",
    textInputActionClass: "ui-text-input__action",
    badgeClass: "ui-badge",
    badgeTextClass: "ui-badge__text",
    badgeText: "data-ui-badge-text",
    badgeDangerClass: "ui-badge-style--danger",
    badgeWarningClass: "ui-badge-style--warning",
    badgeSurfaceClass: "ui-badge-style--surface"
} as const;

/** On a folding control of the framework's — the corner menu, a side panel — while it stands folded; not an item's own fold. */
export const FoldedControlAttribute = CoreNames.collapsed;

/**
 * What stands over the sheet's top edge — the corner menu, a folded side panel, a node canvas's run line and run panel — and a fit
 * keeps the sheet clear of; an open side panel takes its column instead.
 */
export const TopChromeSelector = `[${MenuPanelAttribute}], [${SideAttribute}][${FoldedControlAttribute}], [data-ui-graph-run], .ui-graph__run-panel`;

/** The canvas's own buttons over the sheet — the zoom bar, the run panel, the corner's and side panels' switches, the log's strip. */
export const ChromeButtonSelector = `.ui-graph__bar-button, [${MenuPanelAttribute}] > * > [${CoreNames.collapseToggle}], [${SideAttribute}] > [${CoreNames.collapseToggle}], .ui-graph__log-head > button`;

/** What a double click on the sheet asks for: a reroute point on an edge, a node's rename, or the kind's own on the bare sheet. */
export type DoubleClickAim = { readonly to: "reroute" | "rename"; readonly id: string } | { readonly to: "sheet" } | null;

/** A node drawn as a circle, and the face inside its ring: its name hangs under it and takes no pointer, so the circle stands for it. */
const CircleSelector = ".ui-graph__bubble";
const CircleFaceSelector = ".ui-graph__bubble-face";

/**
 * Where a double click lands: an edge takes a reroute point, a node's name (a circle's circle) its rename, the bare sheet the kind's
 * own (the picker). The rest of a node, a group, and whatever stands over the sheet (`isPanel`: two quick presses on a zoom button)
 * take nothing.
 */
export function doubleClickAim(target: Element, isPanel: (target: Element) => boolean): DoubleClickAim {
    const edge = target.closest(`[${EdgeAttribute}]`);

    if (edge !== null)
        return { to: "reroute", id: edge.getAttribute(EdgeAttribute)! };

    if (isPanel(target))
        return null;

    const node = target.closest(`[${NodeAttribute}]`);

    if (node !== null)
        return isNamePart(target, node) ? { to: "rename", id: node.getAttribute(NodeAttribute)! } : null;

    return target.closest(`[${GroupAttribute}], .ui-graph__corner`) === null ? { to: "sheet" } : null;
}

function isNamePart(target: Element, node: Element): boolean {
    if (target.closest(ItemTitleSelector) !== null)
        return true;

    return node.matches(CircleSelector) && (target === node || target.closest(CircleFaceSelector) !== null);
}

/** A fresh copy of the framework component the renderer wrote as a template of the region (`RenderTemplate`); null when it wrote none. */
export function cloneTemplate(root: ParentNode, region: string): HTMLElement | null {
    const template = root.querySelector<HTMLTemplateElement>(`template[${EditorTemplateAttribute}="${CSS.escape(region)}"]`);
    const copy = template?.content.firstElementChild?.cloneNode(true);

    return copy instanceof HTMLElement ? copy : null;
}

/** A share of a hundred as the page writes one: the number in the page's culture, in its word for a percent (`ui.graph.percent`). */
export function percentText(context: Pick<PluginEngineContext, "strings" | "numbers">, element: Element, share: number): string {
    return context.strings.format("ui.graph.percent", { value: context.numbers.format(share, null, context.numbers.readCulture(element)) });
}

/** Words that follow a pointer passing over a part of the sheet — a pin, a card, a craft: the page's tooltip, after a hover's wait. */
export function hoverTooltip(element: HTMLElement, words: string, tooltips: Tooltips): void {
    element.addEventListener("pointerenter", () => tooltips.show(element, words, { delay: true }));
    element.addEventListener("pointerleave", () => tooltips.hide());
}

/**
 * The keyboard the framework hands back to the canvas's root — made focusable for that one return, as a node's menu closes — goes
 * on to the sheet, which holds it on a canvas: the root gives up its tab stop as it loses the focus, so it is no place for the
 * node bar's Escape to bring the keyboard back to.
 */
export function passRootFocusToSheet(root: HTMLElement, viewport: HTMLElement): void {
    root.addEventListener("focusin", event => {
        if (event.target === root)
            viewport.focus({ preventScroll: true });
    });
}
