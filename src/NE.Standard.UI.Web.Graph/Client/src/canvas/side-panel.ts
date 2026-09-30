// A panel over the sheet's trailing side (`GraphCanvasRendererBase.RenderSidePanel`), slid by the framework's collapsible. This keeps
// its fold under the canvas's name: the panel is no component of its own for the framework's engine to keep it by.

import type { ClientStore } from "ne-standard-ui";
import { CoreNames } from "./canvas-dom.ts";

// The framework's own fold: its engine slides the panel and writes the attribute, as it does for the corner menu.
const ToggleSelector = `[${CoreNames.collapseToggle}]`;
const CollapsedAttribute = CoreNames.collapsed;
const Folded = "folded";
const Open = "open";
// Set by the stylesheet where the window is too narrow for the panel to start open beside the sheet.
const StartsFoldedProperty = "--ui-graph-side-folded";

export class SidePanelFold {
    private readonly store: ClientStore;
    private readonly root: HTMLElement;
    private readonly panel: HTMLElement | null;
    private readonly slot: string;
    // The fold the server drew the panel with (`RenderSidePanel`'s `folded`), or the stylesheet's on a narrow window; only the
    // viewer's departure from it is stored.
    private readonly foldedByDefault: boolean;

    /** Folds or opens the panel as the viewer left it; `slot` names it among the canvas's stored state. */
    public constructor(store: ClientStore, root: HTMLElement, panel: HTMLElement | null, slot: string) {
        this.store = store;
        this.root = root;
        this.panel = panel;
        this.slot = slot;
        this.foldedByDefault = panel !== null && (panel.hasAttribute(CollapsedAttribute) || startsFolded(panel));

        const stored = store.read(root, slot);
        const folded = stored === Folded || (stored !== Open && this.foldedByDefault);

        if (panel !== null && folded !== panel.hasAttribute(CollapsedAttribute)) {
            panel.toggleAttribute(CollapsedAttribute, folded);
            panel.querySelector(ToggleSelector)?.setAttribute("aria-expanded", folded ? "false" : "true");
        }
    }

    /** A click on the panel's switch is remembered; false for any other. The framework's engine folded it already, on the way down. */
    public press(target: Element): boolean {
        if (this.panel === null || !this.panel.contains(target) || target.closest(ToggleSelector) === null)
            return false;

        const folded = this.panel.hasAttribute(CollapsedAttribute);

        this.store.write(this.root, this.slot, folded === this.foldedByDefault ? null : folded ? Folded : Open);
        return true;
    }
}

/** Whether the stylesheet starts the panel folded — the plan on a phone, whose sheet it would cover. */
function startsFolded(panel: HTMLElement): boolean {
    return getComputedStyle(panel).getPropertyValue(StartsFoldedProperty).trim() === "1";
}
