// The canvas's chrome menus: the corner button's own, and the node's and group's context menus the framework opens — what a right
// press landed on, each entry's state, and the commands its key runs.

import type { PluginEngineContext } from "ne-standard-ui";
import type { Rect } from "./geometry.ts";
import { bounds } from "./geometry.ts";
import type { CanvasDocument, CanvasGroup, CanvasItem, Point } from "./canvas-model.ts";
import { newId, readJson } from "./canvas-model.ts";
import type { CanvasDocumentState } from "./canvas-document.ts";
import type { CanvasKind, MenuTarget } from "./canvas-kind.ts";
import type { CanvasSelection } from "./canvas-selection.ts";
import type { CanvasSettings } from "./canvas-settings.ts";
import type { CanvasView } from "./canvas-view.ts";
import { EdgeAttribute, GroupAttribute, ItemTitleSelector, NodeAttribute } from "./canvas-dom.ts";

const ColorsAttribute = "data-ui-graph-colors";
// The framework's context menus, by the names the renderer gave the canvas's regions (UIGraphMenus): a part names the one it opens.
export const MenuAttribute = "data-ui-context-menu";
export const MenuUseAttribute = "data-ui-context-menu-use";
export const NodeMenuName = "graph-node-menu";
export const GroupMenuName = "graph-group-menu";
export const EdgeMenuName = "graph-edge-menu";
/** On the box the corner menu stands in, in the canvas's leading corner: the menu's name. */
export const MenuPanelAttribute = "data-ui-graph-menu-panel";
/** Either kind of menu a command's entry stands in: a context menu the framework opens, or the corner menu's panel. */
const AnyMenuSelector = `[${MenuAttribute}], [${MenuPanelAttribute}]`;
const CollapsedAttribute = "data-ui-collapsed";
const CollapseToggleAttribute = "data-ui-collapse-toggle";
const MenuEntryClass = "ui-menu-item";
const CheckedClass = "ui-menu-item--checked";
const SwatchAttribute = "data-ui-graph-swatch";
const ColorCommandPrefix = "graph:color:";
const DefaultColorCommand = "graph:color:default";
const CommandPrefix = "graph:";

/** What the menus reach on the coordinator: the kind, the item boxes and sizes a command needs, and the delete it shares with Delete. */
export type MenusHost = {
    readonly nodeElements: ReadonlyMap<string, HTMLElement>;
    kind(): CanvasKind;
    nodeRect(id: string): Rect | null;
    /** Where the grid puts an item standing at a point, by the kind's own anchor. */
    snapPlace(id: string, point: Point): Point;
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
    }

    /** The corner menu's switch under a press, if the press is on it: the menu's entries are brought up to date as it slides open. */
    public panelToggleOf(target: Element): HTMLElement | null {
        return target.closest(`[${MenuPanelAttribute}]`) === null ? null : target.closest<HTMLElement>(`[${CollapseToggleAttribute}]`);
    }

    /** Folds the corner menu back after one of its commands runs, via the framework's own switch, so the fold animates as usual. */
    public foldPanel(): void {
        const menu = this.root.querySelector<HTMLElement>(`[${MenuPanelAttribute}] > .ui-menu`);

        if (menu !== null && !menu.hasAttribute(CollapsedAttribute))
            menu.querySelector<HTMLElement>(`:scope > [${CollapseToggleAttribute}]`)?.click();
    }

    /** Records what a right press landed on before its menu shows, and selects it alone if not already chosen — a menu acts on the selection. */
    public prepareMenus(target: EventTarget | null): void {
        // A press inside a menu is the menu's, and says nothing about what a menu was opened on.
        if (!(target instanceof Element) || target.closest(AnyMenuSelector) !== null)
            return;

        const node = target.closest<HTMLElement>(`[${NodeAttribute}]`)?.getAttribute(NodeAttribute) ?? null;
        const group = node === null && target.closest(".ui-graph__group-band") !== null
            ? target.closest<HTMLElement>(`[${GroupAttribute}]`)?.getAttribute(GroupAttribute) ?? null
            : null;
        const edge = node === null && group === null && this.host.kind().hasEdgeMenu()
            ? target.closest(`[${EdgeAttribute}]`)?.getAttribute(EdgeAttribute) ?? null
            : null;

        this.menuTarget = node !== null ? { kind: "node", id: node } : group !== null ? { kind: "group", id: group } : edge !== null ? { kind: "edge", id: edge } : null;

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

    /** Updates every menu entry to the canvas's state: disabled with nothing chosen or on a read-only canvas; a node/group menu shows its pin and colour. */
    public syncMenus(): void {
        const editable = !this.settings.readOnly;
        const chosenNode = this.host.kind().items().some(node => this.selection.has(node.id));

        this.host.kind().syncMenus(editable, this.menuTarget);
        this.enableEntries("graph:arrange", editable);
        this.enableEntries("graph:save", editable);
        this.enableEntries("graph:group-selection", editable && chosenNode);
        this.enableEntries("graph:delete-selection", editable && (this.selection.size > 0 || this.selection.edgeSize > 0));

        for (const name of [NodeMenuName, GroupMenuName]) {
            const menu = this.root.querySelector<HTMLElement>(`[${MenuAttribute}="${name}"]`);
            const item = this.menuItem(name);

            if (menu === null)
                continue;

            for (const entry of menuEntries(menu, "graph:pin")) {
                setChecked(entry, item?.pinned === true);
                setEnabled(entry, editable);
            }

            // A node's name and colour are the kind's to allow; a group's are always the canvas's own.
            const named = editable && (name === GroupMenuName || this.host.kind().canEditItems());

            for (const entry of menuEntries(menu, "graph:rename"))
                setEnabled(entry, named);

            this.syncColors(menu, item?.color ?? null, named);
        }
    }

    private enableEntries(key: string, enabled: boolean): void {
        enableMenuEntries(this.root, key, enabled);
    }

    /** The colour choices: each led by its swatch, the one the item wears checked, and its name at the colour entry's end. */
    private syncColors(menu: HTMLElement, color: string | null, editable: boolean): void {
        let chosen = "";

        for (const entry of menu.querySelectorAll<HTMLElement>(`[data-ui-key^="${ColorCommandPrefix}"]`)) {
            const button = ownEntry(entry);
            const key = entry.getAttribute("data-ui-key") ?? "";
            const paint = key === DefaultColorCommand ? null : this.colors[Number(key.slice(ColorCommandPrefix.length))] ?? null;
            const checked = paint === null ? color === null || color.length === 0 : paint === color;

            if (button === null)
                continue;

            button.setAttribute(SwatchAttribute, "");
            button.style.setProperty("--ui-graph-swatch", paint ?? "transparent");
            setChecked(button, checked);

            if (checked)
                chosen = button.textContent?.trim() ?? "";
        }

        for (const entry of menuEntries(menu, "graph:color")) {
            setEnabled(entry, editable);

            const value = entry.querySelector<HTMLElement>(".ui-menu-item__value");

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
            done: () => this.view.viewportElement.focus({ preventScroll: true })
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
            title: this.context.strings.text("ui.graph.group"),
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

        // A kind's arrange answer may already be grid-snapped (a layered sheet remembers node placement), so it must be honored as given.
        const placed = this.host.kind().arrange(sizes, this.selection.size > 1 ? new Set(this.selection.nodeIds) : undefined);

        for (const node of this.host.kind().items()) {
            const place = placed.get(node.id);

            if (place !== undefined) {
                const snapped = this.settings.snapping ? this.host.snapPlace(node.id, place) : place;

                node.x = snapped.x;
                node.y = snapped.y;
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
export function openNamedMenu(root: HTMLElement, name: string, clientX: number, clientY: number): void {
    const part = document.createElement("span");

    part.setAttribute(MenuUseAttribute, name);
    part.hidden = true;
    (root.querySelector(".ui-graph__viewport") ?? root).append(part);
    part.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX, clientY }));
    part.remove();
}

/** Every entry of one command in a canvas's menus, enabled or disabled — what a kind's own entries are synced by. */
export function enableMenuEntries(root: ParentNode, key: string, enabled: boolean): void {
    for (const entry of menuEntries(root, key))
        setEnabled(entry, enabled);
}

/** Every entry of one command in a canvas's menus, checked or not: a kind's own entry that says a state rather than does a thing. */
export function checkMenuEntries(root: ParentNode, key: string, checked: boolean): void {
    for (const entry of menuEntries(root, key))
        setChecked(entry, checked);
}

/** Every entry of one command in a canvas's menus, shown or taken out of them: an entry that belongs to a state the item is rarely in. */
export function showMenuEntries(root: ParentNode, key: string, shown: boolean): void {
    for (const entry of menuEntries(root, key)) {
        const wrapper = entry.closest<HTMLElement>("[data-ui-key]") ?? entry;

        wrapper.style.display = shown ? "" : "none";
    }
}

/** The entries of one command under a root: a menu writes the key on the entry's wrapper, and on a group's block of choices too. */
function menuEntries(root: ParentNode, key: string): HTMLElement[] {
    const entries: HTMLElement[] = [];

    for (const keyed of root.querySelectorAll<HTMLElement>(`:is(${AnyMenuSelector}) [data-ui-key="${CSS.escape(key)}"]`)) {
        const entry = ownEntry(keyed);

        if (entry !== null)
            entries.push(entry);
    }

    return entries;
}

/** The entry a keyed wrapper stands for — its own child, never one of the choices a block of them nests. */
function ownEntry(keyed: HTMLElement): HTMLElement | null {
    return keyed.classList.contains(MenuEntryClass) ? keyed : keyed.querySelector<HTMLElement>(`:scope > .${MenuEntryClass}`);
}

/** An entry disabled as the framework disables a component — an entry is a link as often as a button, and a link has no `disabled`. */
function setEnabled(entry: HTMLElement, enabled: boolean): void {
    entry.classList.toggle("ui-disabled", !enabled);
    entry.toggleAttribute("inert", !enabled);
    entry.setAttribute("aria-disabled", String(!enabled));
}

/** A check entry's state as the framework's own patch writes it: the class paints the mark, aria-checked says it. */
function setChecked(entry: HTMLElement, checked: boolean): void {
    entry.classList.toggle(CheckedClass, checked);
    entry.setAttribute("aria-checked", String(checked));
}

export { CommandPrefix };
