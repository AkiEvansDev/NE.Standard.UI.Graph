// A catalogue as a dialog: search, categories, and a description line per entry. The node canvas offers its kinds through it,
// the production graph its resources; what is chosen is handed back to whoever opened it. A category nests by its path —
// `Maths/Rounding` stands under `Maths` — and choosing one shows what stands in it and under it. A category with others under it
// is folded until it is chosen or its chevron is pressed, and stays as the viewer left it while the page lives.

import type { Icons, RovingFocus } from "ne-standard-ui";

/** What the picker shows of an entry, and the key it is handed back by. */
export type PickerEntry = {
    readonly key: string;
    readonly title: string;
    /** Where the entry stands, nested by `/`: `Maths/Rounding` is a category of its own under `Maths`. */
    readonly category?: string | null;
    /** The one line the picker shows under the title. */
    readonly description?: string | null;
    readonly icon?: string | null;
};

const PickerSelector = "[data-ui-graph-picker]";
// The core's text field in the picker's head, carried as a region: the input is the field's own.
const SearchSelector = "[data-ui-graph-picker-search] input";
const RailSelector = "[data-ui-graph-picker-rail]";
const ListSelector = "[data-ui-graph-picker-list]";
const EmptySelector = "[data-ui-graph-picker-empty]";
const KindAttribute = "data-ui-graph-kind";
const CategoryAttribute = "data-ui-graph-category";
// On a category's chevron: a press on it folds or unfolds the category without choosing it.
const FoldAttribute = "data-ui-graph-category-fold";
const PathSeparator = "/";
const DepthProperty = "--ui-graph-picker-depth";
const EntryClass = "ui-graph__picker-entry";
const CurrentClass = "ui-graph__picker-entry--current";
// No clean path is a lone separator, so this cannot collide with a category — the uncategorized one is the empty path.
const AllCategories = "/";

export type PickerWords = {
    text(key: string): string;
};

/** The page's own way of naming an element, so an id this picker writes cannot collide with one the framework wrote. */
export type PickerIds = {
    ensureId(element: Element, prefix: string): string;
};

export class Picker<TEntry extends PickerEntry> {
    private readonly panel: HTMLDialogElement;
    private readonly search: HTMLInputElement;
    private readonly rail: HTMLElement;
    private readonly list: HTMLElement;
    private readonly empty: HTMLElement;
    // Asked for on every opening: a catalogue may be live.
    private readonly entries: () => readonly TEntry[];
    private readonly words: PickerWords;
    private readonly icons: Icons;
    private readonly ids: PickerIds;
    private readonly roving: RovingFocus;
    private readonly choose: (entry: TEntry) => void;

    private category = AllCategories;
    // The search the list was last drawn for.
    private drawnTerms = "";
    // The categories unfolded, by path; every other one with categories under it is folded.
    private readonly unfolded = new Set<string>();

    private constructor(panel: HTMLDialogElement, search: HTMLInputElement, rail: HTMLElement, list: HTMLElement, empty: HTMLElement, entries: () => readonly TEntry[], words: PickerWords, icons: Icons, ids: PickerIds, roving: RovingFocus, choose: (entry: TEntry) => void) {
        this.panel = panel;
        this.search = search;
        this.rail = rail;
        this.list = list;
        this.empty = empty;
        this.entries = entries;
        this.words = words;
        this.icons = icons;
        this.ids = ids;
        this.roving = roving;
        this.choose = choose;

        this.search.addEventListener("input", () => this.draw());
        // The field's clear button is the core's, and it says so with a change rather than an input. A change also comes as the field
        // loses focus to the press on an entry: drawn again then, the entry would be gone before its click.
        this.search.addEventListener("change", () => {
            if (this.search.value !== this.drawnTerms)
                this.draw();
        });
        this.search.addEventListener("keydown", event => this.key(event));
        this.rail.addEventListener("click", event => this.rails(event));
        this.list.addEventListener("click", event => this.click(event));
        // A click on the dialog itself is a click on its backdrop: the panel's own content stops it before it gets here.
        this.panel.addEventListener("click", event => {
            if (event.target === this.panel)
                this.close();
        });
        // However the dialog closed — Escape closes it natively, past close() — the field no longer controls an open list.
        this.panel.addEventListener("close", () => this.search.setAttribute("aria-expanded", "false"));
    }

    public static create<TEntry extends PickerEntry>(root: HTMLElement, entries: () => readonly TEntry[], words: PickerWords, ids: PickerIds, icons: Icons, roving: RovingFocus, choose: (entry: TEntry) => void): Picker<TEntry> | null {
        const panel = root.querySelector<HTMLDialogElement>(PickerSelector);
        const search = panel?.querySelector<HTMLInputElement>(SearchSelector) ?? null;
        const rail = panel?.querySelector<HTMLElement>(RailSelector) ?? null;
        const list = panel?.querySelector<HTMLElement>(ListSelector) ?? null;
        const empty = panel?.querySelector<HTMLElement>(EmptySelector) ?? null;

        if (panel === null || search === null || rail === null || list === null || empty === null)
            return null;

        // Focus stays in the search field while arrows walk the list, so the field announces the entry under them for a screen reader.
        search.setAttribute("role", "combobox");
        search.setAttribute("aria-controls", ids.ensureId(list, "ui-graph-picker-list"));
        search.setAttribute("aria-autocomplete", "list");
        search.setAttribute("aria-expanded", "false");

        return new Picker(panel, search, rail, list, empty, entries, words, icons, ids, roving, choose);
    }

    public get isOpen(): boolean {
        return this.panel.open;
    }

    public open(): void {
        this.search.value = "";
        this.category = AllCategories;
        this.drawRail();
        this.draw();

        if (!this.panel.open)
            this.panel.showModal();

        this.search.setAttribute("aria-expanded", "true");
        this.search.focus({ preventScroll: true });
    }

    public close(): void {
        this.search.setAttribute("aria-expanded", "false");

        if (this.panel.open)
            this.panel.close();
    }

    public contains(target: EventTarget | null): boolean {
        return target instanceof Node && this.panel.contains(target);
    }

    /**
     * The categories the entries declare as a tree, in the catalogue's own order — a category first named by an entry deep under it
     * still stands where that entry put it — under an entry for all of them; what stands under a folded category is left out.
     */
    private drawRail(): void {
        const roots: RailNode[] = [];
        const nodes = new Map<string, RailNode>();

        for (const type of this.entries()) {
            const path = categoryOf(type);
            const segments = path.length === 0 ? [""] : path.split(PathSeparator);
            let level = roots;

            for (let depth = 0; depth < segments.length; depth++) {
                const at = segments.slice(0, depth + 1).join(PathSeparator);
                let node = nodes.get(at);

                if (node === undefined) {
                    node = { path: at, name: segments[depth], children: [] };
                    nodes.set(at, node);
                    level.push(node);
                }

                level = node.children;
            }
        }

        this.rail.replaceChildren(this.railEntry(AllCategories, this.words.text("ui.graph.all-kinds"), 0, false));
        this.appendRail(roots, 0);
    }

    private appendRail(level: readonly RailNode[], depth: number): void {
        for (const node of level) {
            const folds = node.children.length > 0;

            this.rail.append(this.railEntry(node.path, node.path.length === 0 ? this.words.text("ui.graph.uncategorized") : node.name, depth, folds));

            if (folds && this.unfolded.has(node.path))
                this.appendRail(node.children, depth + 1);
        }
    }

    private railEntry(category: string, caption: string, depth: number, folds: boolean): HTMLElement {
        const entry = document.createElement("button");
        const mark = document.createElement("span");
        const text = document.createElement("span");

        entry.type = "button";
        entry.className = "ui-graph__picker-category";
        entry.setAttribute("role", "tab");
        entry.setAttribute(CategoryAttribute, category);
        entry.setAttribute("aria-selected", String(category === this.category));
        entry.style.setProperty(DepthProperty, String(depth));

        // Every category keeps the chevron's room, so the names of those with nothing under them line up with the rest.
        mark.className = "ui-graph__picker-fold";
        mark.setAttribute("aria-hidden", "true");

        if (folds) {
            mark.setAttribute(FoldAttribute, "");
            this.icons.apply(mark, "ne-chevron-right");
            entry.setAttribute("aria-expanded", String(this.unfolded.has(category)));
        }

        text.textContent = caption;
        entry.append(mark, text);

        return entry;
    }

    /** A press on a chevron folds or unfolds its category; one on a name chooses it and unfolds it, or folds it if it was chosen and open. */
    private rails(event: MouseEvent): void {
        const target = event.target instanceof Element ? event.target : null;
        const entry = target === null ? null : target.closest<HTMLElement>(`[${CategoryAttribute}]`);

        if (target === null || entry === null)
            return;

        const category = entry.getAttribute(CategoryAttribute) ?? AllCategories;

        if (target.closest(`[${FoldAttribute}]`) !== null) {
            this.toggle(category);
            this.drawRail();
            return;
        }

        if (entry.hasAttribute("aria-expanded"))
            this.toggle(category, category === this.category ? undefined : true);

        this.category = category;
        this.drawRail();
        this.draw();
    }

    private toggle(category: string, unfold?: boolean): void {
        if (unfold ?? !this.unfolded.has(category))
            this.unfolded.add(category);
        else
            this.unfolded.delete(category);
    }

    private draw(): void {
        this.drawnTerms = this.search.value;

        const terms = this.search.value.trim().toLowerCase();
        const matching = this.entries().filter(type => this.chosen(type) && (terms.length === 0 || matches(type, terms)));

        this.list.replaceChildren();
        this.empty.hidden = matching.length > 0;

        for (const type of matching) {
            const entry = document.createElement("button");

            entry.type = "button";
            entry.className = EntryClass;
            // One id out of the page's own run: an entry's key is the application's text, and not every text is an id.
            entry.id = this.ids.ensureId(entry, `${this.list.id}-entry`);
            entry.setAttribute("role", "option");
            entry.setAttribute(KindAttribute, type.key);

            // The entry's own icon, as a renderer would write one — a pack's glyph, one of the framework's marks, or a picture.
            const icon = type.icon ?? "";

            if (icon.length > 0) {
                const box = document.createElement("span");

                box.className = "ui-graph__picker-entry-icon";
                box.setAttribute("aria-hidden", "true");
                this.icons.apply(box, icon);
                entry.append(box);
            }

            const text = document.createElement("span");
            const title = document.createElement("span");

            text.className = "ui-graph__picker-entry-text";
            title.className = "ui-graph__picker-entry-title";
            title.textContent = type.title;
            text.append(title);

            const description = type.description ?? "";

            if (description.length > 0) {
                const line = document.createElement("span");

                line.className = "ui-graph__picker-entry-line";
                line.textContent = description;
                text.append(line);
            }

            entry.append(text);
            this.list.append(entry);
        }

        this.setCurrent(this.list.querySelector<HTMLElement>(`.${EntryClass}`));
    }

    /** The entry the arrows and Enter stand on: the class draws it, and the search field names it for whoever is listening. */
    private setCurrent(entry: HTMLElement | null): void {
        for (const candidate of this.list.querySelectorAll<HTMLElement>(`.${EntryClass}`)) {
            const current = candidate === entry;

            candidate.classList.toggle(CurrentClass, current);
            candidate.setAttribute("aria-selected", String(current));
        }

        if (entry === null)
            this.search.removeAttribute("aria-activedescendant");
        else
            this.search.setAttribute("aria-activedescendant", entry.id);
    }

    /** In the category chosen or in one under it; an entry of no category is in the uncategorized one alone. */
    private chosen(type: TEntry): boolean {
        if (this.category === AllCategories)
            return true;

        const path = categoryOf(type);

        return path === this.category || path.startsWith(this.category + PathSeparator);
    }

    private key(event: KeyboardEvent): void {
        // An Enter that confirms a composed character is the IME's, not a choice of entry.
        if (event.isComposing)
            return;

        if (event.key === "Enter") {
            event.preventDefault();
            this.take(this.list.querySelector<HTMLElement>(`.${CurrentClass}`));
            return;
        }

        const entries = [...this.list.querySelectorAll<HTMLElement>(`.${EntryClass}`)];
        const next = this.roving.target({
            key: event.key,
            items: entries,
            current: entries.find(entry => entry.classList.contains(CurrentClass)) ?? null,
            axis: "vertical"
        });

        if (next === null)
            return;

        event.preventDefault();
        this.setCurrent(next);
        next.scrollIntoView({ block: "nearest" });
    }

    private click(event: MouseEvent): void {
        this.take(event.target instanceof Element ? event.target.closest<HTMLElement>(`.${EntryClass}`) : null);
    }

    private take(entry: HTMLElement | null): void {
        const key = entry?.getAttribute(KindAttribute);
        const type = key === null || key === undefined ? undefined : this.entries().find(candidate => candidate.key === key);

        if (type === undefined)
            return;

        this.close();
        this.choose(type);
    }
}

/** One category of the rail's tree: its whole path, the last step of it that the rail shows, and the categories under it. */
type RailNode = { readonly path: string; readonly name: string; readonly children: RailNode[] };

/** An entry's category as a clean path: each step trimmed, empty steps dropped, so `Maths / ` is `Maths`. */
function categoryOf(type: PickerEntry): string {
    return (type.category ?? "").split(PathSeparator).map(step => step.trim()).filter(step => step.length > 0).join(PathSeparator);
}

function matches(type: PickerEntry, terms: string): boolean {
    return type.title.toLowerCase().includes(terms)
        || (type.description ?? "").toLowerCase().includes(terms)
        || (type.category ?? "").toLowerCase().includes(terms)
        || type.key.toLowerCase().includes(terms);
}
