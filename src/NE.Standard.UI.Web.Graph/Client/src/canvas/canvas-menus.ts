// The canvas's chrome menus: the corner button's own, and the node's and group's context menus the framework opens — what a right
// press landed on, each entry's state, and the commands its key runs.

import type { ComponentStates, DomNames, PluginEngineContext } from "ne-standard-ui";
import type { Rect } from "./geometry.ts";
import { bounds } from "./geometry.ts";
import type { CanvasDocument, CanvasGroup, CanvasItem } from "./canvas-model.ts";
import { newId, readJson } from "./canvas-model.ts";
import type { CanvasDocumentState } from "./canvas-document.ts";
import type { CanvasKind, MenuTarget } from "./canvas-kind.ts";
import type { CanvasSelection } from "./canvas-selection.ts";
import type { CanvasSettings } from "./canvas-settings.ts";
import type { CanvasView } from "./canvas-view.ts";
import { CoreNames, EdgeAttribute, FoldedControlAttribute, GroupAttribute, ItemTitleSelector, MenuPanelAttribute, NodeAttribute } from "./canvas-dom.ts";

const ColorsAttribute = "data-ui-graph-colors";
// The framework's context menus, by the names the renderer gave the canvas's regions (UIGraphMenus): a part names the one it opens.
export const NodeMenuName = "graph-node-menu";
export const GroupMenuName = "graph-group-menu";
export const EdgeMenuName = "graph-edge-menu";
const SwatchAttribute = "data-ui-graph-swatch";
const ColorCommandPrefix = "graph:color:";
const DefaultColorCommand = "graph:color:default";
const CommandPrefix = "graph:";

/** Where a canvas's menus stand — under its root — and the framework's names they are marked with. */
export type MenuScope = {
    readonly root: ParentNode;
    readonly context: { readonly names: DomNames; readonly states: ComponentStates };
};

/** What the menus reach on the coordinator: the kind, the item boxes and sizes a command needs, and the delete it shares with Delete. */
export type MenusHost = {
    readonly nodeElements: ReadonlyMap<string, HTMLElement>;
    kind(): CanvasKind;
    nodeRect(id: string): Rect | null;
    drawEdges(): void;
    deleteSelection(): void;
};

export class CanvasMenus {
    private readonly root: HTMLElement;
    private readonly context: PluginEngineContext;
    private readonly documentState: CanvasDocumentState<CanvasDocument>;
    private readonly selection: CanvasSelection;
    private readonly view: CanvasView;
    private readonly settings: CanvasSettings;
    private readonly host: MenusHost;
    private readonly groupLayer: HTMLElement;
    // The CSS colours of the menus' colour choices, in their order: an entry's key names its index.
    private readonly colors: string[];
    private readonly scope: MenuScope;

    // What a right press last landed on, which a node's or a group's menu then acts on; null for the empty surface.
    private menuTarget: MenuTarget | null = null;

    public constructor(
        root: HTMLElement,
        context: PluginEngineContext,
        documentState: CanvasDocumentState<CanvasDocument>,
        selection: CanvasSelection,
        view: CanvasView,
        settings: CanvasSettings,
        host: MenusHost,
        groupLayer: HTMLElement
    ) {
        this.root = root;
        this.context = context;
        this.documentState = documentState;
        this.selection = selection;
        this.view = view;
        this.settings = settings;
        this.host = host;
        this.groupLayer = groupLayer;
        this.colors = readColors(root.getAttribute(ColorsAttribute));
        this.scope = { root, context };
    }

    /** The corner menu's switch under a press, if the press is on it: the menu's entries are brought up to date as it slides open. */
    public panelToggleOf(target: Element): HTMLElement | null {
        return target.closest(`[${MenuPanelAttribute}]`) === null ? null : target.closest<HTMLElement>(`[${CoreNames.collapseToggle}]`);
    }

    /**
     * Folds the corner menu after one of its commands runs, through the framework's switch so the fold animates; the switch takes the
     * focus from the entry folding out of sight.
     */
    public foldPanel(): void {
        const menu = this.root.querySelector<HTMLElement>(`[${MenuPanelAttribute}] > .${CoreNames.menuClass}`);
        const toggle = menu?.querySelector<HTMLElement>(`:scope > [${CoreNames.collapseToggle}]`) ?? null;

        if (menu === null || toggle === null || menu.hasAttribute(FoldedControlAttribute))
            return;

        toggle.click();
        toggle.focus({ preventScroll: true });
    }

    /** Records what a right press landed on before its menu shows, and selects it alone if not already chosen — a menu acts on the selection. */
    public prepareMenus(target: EventTarget | null): void {
        // A press inside a menu is the menu's, and says nothing about what a menu was opened on.
        if (!(target instanceof Element) || target.closest(anyMenuSelector(this.scope)) !== null)
            return;

        this.menuTarget = this.targetOf(target);

        const node = this.menuTarget?.kind === "node" ? this.menuTarget.id : null;
        const group = this.menuTarget?.kind === "group" ? this.menuTarget.id : null;
        const edge = this.menuTarget?.kind === "edge" ? this.menuTarget.id : null;

        // An edge pressed is chosen alone, as a click chooses it, so what its menu does is done to that edge.
        if (edge !== null) {
            if (!this.selection.hasEdge(edge)) {
                this.selection.clearSets();
                this.selection.markSelection();
                this.selection.toggleEdge(edge, false);
                this.host.drawEdges();
            }

            this.syncMenus();
            return;
        }

        const id = node ?? group;

        if (id !== null && !this.selection.has(id)) {
            this.selection.chooseForMenu(id);
            this.host.drawEdges();
        }

        this.syncMenus();
    }

    /**
     * Records what an action bar is about to show its menu's entries for and brings them up to date for it — its pin checked, what it
     * may do enabled — choosing nothing: the bar shows over a node the pointer merely passes. Its icon's press asks again as a right
     * press does, choosing the node then.
     */
    public prepareBar(target: Element): void {
        this.menuTarget = this.targetOf(target);
        this.syncMenus();
    }

    /** What a press on `target` opens a menu for: a node, a group's band, an edge where the kind has an edge menu, or the sheet. */
    private targetOf(target: Element): MenuTarget | null {
        const node = target.closest<HTMLElement>(`[${NodeAttribute}]`)?.getAttribute(NodeAttribute) ?? null;
        const group = node === null && target.closest(".ui-graph__group-band") !== null
            ? target.closest<HTMLElement>(`[${GroupAttribute}]`)?.getAttribute(GroupAttribute) ?? null
            : null;
        const edge = node === null && group === null && this.host.kind().hasEdgeMenu()
            ? target.closest(`[${EdgeAttribute}]`)?.getAttribute(EdgeAttribute) ?? null
            : null;

        return node !== null ? { kind: "node", id: node } : group !== null ? { kind: "group", id: group } : edge !== null ? { kind: "edge", id: edge } : null;
    }

    /** Updates every menu entry to the canvas's state: disabled with nothing chosen or on a read-only canvas; a node/group menu shows its pin and colour. */
    public syncMenus(): void {
        const editable = !this.settings.readOnly;
        const chosenNode = this.host.kind().items().some(node => this.selection.has(node.id));

        this.host.kind().syncMenus(editable, this.menuTarget);
        this.enableEntries("graph:arrange", editable);
        this.enableEntries("graph:save", editable);
        this.enableEntries("graph:group-selection", editable && chosenNode);
        // A group is the canvas's own to remove; a node and an edge are the kind's to allow, as their name and colour are.
        const removable = this.host.kind().canEditItems();
        const chosenGroup = this.documentState.document.groups.some(group => this.selection.has(group.id));

        this.enableEntries("graph:delete-selection", editable && (chosenGroup || (removable && this.selection.any)));
        // A node's own delete takes the node it was opened on, chosen or not.
        this.enableEntries("graph:delete", editable && removable);

        for (const name of [NodeMenuName, GroupMenuName]) {
            const menu = this.root.querySelector<HTMLElement>(`[${this.context.names.contextMenu}="${name}"]`);
            const item = this.menuItem(name);

            if (menu === null)
                continue;

            for (const entry of menuEntries({ root: menu, context: this.context }, "graph:pin")) {
                setChecked(entry, item?.pinned === true, this.context.names);
                this.context.states.setDisabled(entry, !editable);
            }

            // A node's name and colour are the kind's to allow; a group's are always the canvas's own.
            const named = editable && (name === GroupMenuName || this.host.kind().canEditItems());

            for (const entry of menuEntries({ root: menu, context: this.context }, "graph:rename"))
                this.context.states.setDisabled(entry, !named);

            this.syncColors(menu, item?.color ?? null, named);
        }
    }

    private enableEntries(key: string, enabled: boolean): void {
        enableMenuEntries(this.scope, key, enabled);
    }

    /** The colour choices: each led by its swatch, the one the item wears checked, and its name at the colour entry's end. */
    private syncColors(menu: HTMLElement, color: string | null, editable: boolean): void {
        const keyAttribute = this.context.names.key;
        let chosen = "";

        for (const entry of menu.querySelectorAll<HTMLElement>(`[${keyAttribute}^="${ColorCommandPrefix}"]`)) {
            const button = ownEntry(entry, this.context.names);
            const key = entry.getAttribute(keyAttribute) ?? "";
            const paint = key === DefaultColorCommand ? null : this.colors[Number(key.slice(ColorCommandPrefix.length))] ?? null;
            const checked = paint === null ? color === null || color.length === 0 : paint === color;

            if (button === null)
                continue;

            button.setAttribute(SwatchAttribute, "");
            button.style.setProperty("--ui-graph-swatch", paint ?? "transparent");
            setChecked(button, checked, this.context.names);

            if (checked)
                chosen = button.textContent?.trim() ?? "";
        }

        for (const entry of menuEntries({ root: menu, context: this.context }, "graph:color")) {
            this.context.states.setDisabled(entry, !editable);

            const value = entry.querySelector<HTMLElement>(`.${CoreNames.menuItemValueClass}`);

            if (value !== null)
                value.textContent = chosen;
        }
    }

    /** The node or the group a menu of that name was opened on, while it still stands on the sheet. */
    private menuItem(menuName: string): CanvasItem | CanvasGroup | undefined {
        const target = this.menuTarget;

        if (target === null || (menuName === NodeMenuName) !== (target.kind === "node"))
            return undefined;

        return target.kind === "node"
            ? this.host.kind().items().find(node => node.id === target.id)
            : this.documentState.document.groups.find(group => group.id === target.id);
    }

    /** Every chosen item of the kind the menu was opened on — the item itself first, so the first one's state is the one toggled. */
    private menuItems(menuName: string): (CanvasItem | CanvasGroup)[] {
        const item = this.menuItem(menuName);

        if (item === undefined)
            return [];

        const kind: readonly (CanvasItem | CanvasGroup)[] = menuName === NodeMenuName ? this.host.kind().items() : this.documentState.document.groups;

        return [item, ...kind.filter(candidate => candidate !== item && this.selection.has(candidate.id))];
    }

    /** Raises an application entry's command with which entry ran and what its menu was opened on — an item, group, edge, or the sheet as a whole. */
    public raiseEntry(key: string, menuName: string): void {
        const target = this.menuTarget;
        const kind = menuName === NodeMenuName ? "node" : menuName === GroupMenuName ? "group" : menuName === EdgeMenuName ? "edge" : "canvas";
        const id = target !== null && target.kind === kind ? target.id : "";

        this.root.dispatchEvent(new CustomEvent("menu-entry", { bubbles: true, detail: { keys: [key, kind, id] } }));
    }

    public run(key: string, menuName: string): void {
        if (key.startsWith(ColorCommandPrefix)) {
            this.paintItems(menuName, key);
            return;
        }

        switch (key) {
            case "graph:delete-selection":
            case "graph:delete":
                this.host.deleteSelection();
                break;
            case "graph:group-selection":
                this.groupSelection();
                break;
            case "graph:arrange":
                this.arrangeNodes();
                break;
            case "graph:fit":
                this.view.fit();
                break;
            case "graph:save":
                this.documentState.save();
                break;
            case "graph:pin":
                this.pinItems(menuName);
                break;
            case "graph:rename":
                this.renameItem(menuName);
                break;
            default:
                this.host.kind().runCommand(key, this.menuTarget);
                break;
        }
    }

    /** Pins what the menu was opened on, or lets it go, and every chosen item of its kind with it; the check turns in place. */
    private pinItems(menuName: string): void {
        const items = this.menuItems(menuName);

        if (items.length === 0 || this.settings.readOnly)
            return;

        const pinned = items[0].pinned !== true;

        for (const item of items)
            item.pinned = pinned;

        this.documentState.edited();
        this.syncMenus();
    }

    /** One of the fixed colours, or none — the kind's own, or the canvas's — for what the menu was opened on and its kind's chosen. */
    private paintItems(menuName: string, key: string): void {
        const items = this.menuItems(menuName);
        const color = key === DefaultColorCommand ? null : this.colors[Number(key.slice(ColorCommandPrefix.length))];

        if (items.length === 0 || this.settings.readOnly || color === undefined)
            return;

        for (const item of items) {
            if (menuName !== NodeMenuName || !this.host.kind().paintItem(item.id, color))
                item.color = color;
        }

        this.documentState.edited();
        this.syncMenus();
    }

    /** Opens the rename field over the menu's target; an emptied name reverts to the kind's own default, undoing it the way it was given. */
    private renameItem(menuName: string): void {
        const item = this.menuItem(menuName);

        if (item !== undefined)
            this.openRename(item, menuName === NodeMenuName);
    }

    /** The rename field over an item's title, opened by a kind rather than by its menu — a node just added, named at once. */
    public renameNode(id: string): void {
        const item = this.host.kind().items().find(candidate => candidate.id === id);

        if (item !== undefined)
            this.openRename(item, true);
    }

    private openRename(item: CanvasItem | CanvasGroup, isNode: boolean): void {
        if (this.settings.readOnly)
            return;

        const node = isNode ? item as CanvasItem : null;
        const container = node !== null
            ? this.host.nodeElements.get(node.id) ?? null
            : this.groupLayer.querySelector<HTMLElement>(`[${GroupAttribute}="${CSS.escape(item.id)}"] > .ui-graph__group-band`);
        const title = container?.querySelector<HTMLElement>(node !== null ? ItemTitleSelector : ".ui-graph__group-title") ?? null;

        if (container === null || title === null)
            return;

        this.context.renames.open({
            container,
            title,
            className: "ui-graph__rename",
            value: title.textContent ?? "",
            allowEmpty: true,
            commit: value => {
                const title = value.length === 0 ? null : value;

                if (node === null || !this.host.kind().renameItem(node.id, title))
                    item.title = title;

                this.documentState.edited();
            },
            refocus: () => this.view.viewportElement.focus({ preventScroll: true })
        });
    }

    private groupSelection(): void {
        if (this.settings.readOnly || this.selection.size === 0)
            return;

        const rects: Rect[] = [];

        for (const id of this.selection.nodeIds) {
            const rect = this.host.nodeRect(id);

            if (rect !== null)
                rects.push(rect);
        }

        const frame = bounds(rects);

        if (frame === null)
            return;

        const padding = 24;

        this.documentState.document.groups.push({
            id: newId("g"),
            x: frame.x - padding,
            y: frame.y - padding - 24,
            width: frame.width + padding * 2,
            height: frame.height + padding * 2 + 24,
            // No name of its own: the band says the page's word for a group, in whatever language the page is in when it is read.
            title: null,
            color: null
        });

        this.documentState.edited();
    }

    private arrangeNodes(): void {
        if (this.settings.readOnly)
            return;

        const sizes = new Map<string, { width: number; height: number }>();

        for (const [id, element] of this.host.nodeElements)
            sizes.set(id, { width: element.offsetWidth, height: element.offsetHeight });

        // Taken as given: each kind grids its own answer (a layered sheet by the nodes' middles, a node canvas without bending the wires
        // it laid level), and snapping every corner here would undo either.
        const placed = this.host.kind().arrange(sizes, this.selection.size > 1 ? new Set(this.selection.nodeIds) : undefined);

        for (const node of this.host.kind().items()) {
            const place = placed.get(node.id);

            // Here rather than in each kind: a pinned item stays put whichever layout answered, the layered one lays out every item.
            if (place !== undefined && node.pinned !== true) {
                node.x = place.x;
                node.y = place.y;
            }
        }

        this.documentState.edited();
        this.view.fit();
    }
}

function readColors(value: string | null): string[] {
    const read = readJson(value);

    return Array.isArray(read) ? read.map(color => String(color)) : [];
}

/** Opens one of the canvas's named menus at a page point, via a throwaway element the framework's menu engine positions and dismisses as any other. */
export function openNamedMenu(scope: MenuScope, name: string, clientX: number, clientY: number): void {
    const part = document.createElement("span");

    part.setAttribute(scope.context.names.contextMenuUse, name);
    part.hidden = true;
    (scope.root.querySelector(".ui-graph__viewport") ?? scope.root).append(part);
    part.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX, clientY }));
    part.remove();
}

/** Enables or disables one command's entries in a canvas's menus by the framework's mark: an entry is a menu item, not a component `properties.set` reaches. */
export function enableMenuEntries(scope: MenuScope, key: string, enabled: boolean): void {
    for (const entry of menuEntries(scope, key))
        scope.context.states.setDisabled(entry, !enabled);
}

/** Every entry of one command in a canvas's menus, checked or not: a kind's own entry that says a state rather than does a thing. */
export function checkMenuEntries(scope: MenuScope, key: string, checked: boolean): void {
    for (const entry of menuEntries(scope, key))
        setChecked(entry, checked, scope.context.names);
}

/** Every entry of one command in a canvas's menus, shown or taken out of them: an entry that belongs to a state the item is rarely in. */
export function showMenuEntries(scope: MenuScope, key: string, shown: boolean): void {
    for (const entry of menuEntries(scope, key)) {
        const wrapper = entry.closest<HTMLElement>(`[${scope.context.names.key}]`) ?? entry;

        wrapper.style.display = shown ? "" : "none";
    }
}

/** Either kind of menu a command's entry stands in: a context menu the framework opens, or the corner menu's panel. */
function anyMenuSelector(scope: MenuScope): string {
    return `[${scope.context.names.contextMenu}], [${MenuPanelAttribute}]`;
}

/** The entries of one command under a root: a menu writes the key on the entry's wrapper, and on a group's block of choices too. */
function menuEntries(scope: MenuScope, key: string): HTMLElement[] {
    const entries: HTMLElement[] = [];

    for (const keyed of scope.root.querySelectorAll<HTMLElement>(`:is(${anyMenuSelector(scope)}) [${scope.context.names.key}="${CSS.escape(key)}"]`)) {
        const entry = ownEntry(keyed, scope.context.names);

        if (entry !== null)
            entries.push(entry);
    }

    return entries;
}

/** The entry a keyed wrapper stands for: its own child, never one of the choices a block of them nests. */
function ownEntry(keyed: HTMLElement, names: DomNames): HTMLElement | null {
    return keyed.classList.contains(names.menuItemClass) ? keyed : keyed.querySelector<HTMLElement>(`:scope > .${names.menuItemClass}`);
}

/** A check entry's state as the framework's own patch writes it: the class paints the mark, aria-checked says it. */
function setChecked(entry: HTMLElement, checked: boolean, names: DomNames): void {
    entry.classList.toggle(names.menuItemCheckedClass, checked);
    entry.setAttribute("aria-checked", String(checked));
}

export { CommandPrefix };
