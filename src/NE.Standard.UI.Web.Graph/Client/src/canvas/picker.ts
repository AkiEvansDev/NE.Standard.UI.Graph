// A catalogue as a dialog — search, a tree of categories by path, a description line per entry — through which the node canvas
// offers its kinds and the production graph its resources. The tree is one Tab stop walked by the arrows; one entry is current,
// the keyboard's and the pointer's alike.

import type { Focus, Icons, RovingFocus, ShortcutWords } from "ne-standard-ui";

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
// The row standing for the rail on a phone: the chosen category, which unfolds the rail's tree above the list.
const RailToggleSelector = "[data-ui-graph-picker-rail-toggle]";
const ListSelector = "[data-ui-graph-picker-list]";
const EmptySelector = "[data-ui-graph-picker-empty]";
const KindAttribute = "data-ui-graph-kind";
const CategoryAttribute = "data-ui-graph-category";
// On a category's chevron: a press on it folds or unfolds the category without choosing it.
const FoldAttribute = "data-ui-graph-category-fold";
const PathSeparator = "/";
const DepthProperty = "--ui-graph-picker-depth";
// The canvas's own keyboard holder, which takes the keyboard back when what opened the picker is gone (a context menu's entry).
const HomeSelector = ".ui-graph__viewport";
// What takes the focus of a press inside the panel: the search, its own clear, the categories, the list and its entries.
const FocusableSelector = "input, button, [tabindex]";
const EntryClass = "ui-graph__picker-entry";
const CurrentClass = "ui-graph__picker-entry--current";
// On the current entry when the pointer made it so: only the arrows' and the list's own wear the keyboard's frame.
const PointedClass = "ui-graph__picker-entry--pointed";
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
    private readonly railToggle: HTMLElement | null;
    private readonly list: HTMLElement;
    private readonly empty: HTMLElement;
    private readonly home: HTMLElement | null;
    // Asked for on every opening: a catalogue may be live.
    private readonly entries: () => readonly TEntry[];
    private readonly words: PickerWords;
    private readonly icons: Icons;
    private readonly ids: PickerIds;
    private readonly roving: RovingFocus;
    private readonly focus: Focus;
    private readonly shortcuts: ShortcutWords;
    private readonly choose: (entry: TEntry) => void;

    private category = AllCategories;
    // The category the rail's one Tab stop stands on: the arrows move it without choosing.
    private railStop = AllCategories;
    // The search the list was last drawn for.
    private drawnTerms = "";
    // The categories unfolded, by path; every other one with categories under it is folded.
    private readonly unfolded = new Set<string>();
    // Where the pointer last moved over the list: a list scrolled under a resting pointer moves the current entry no more than the
    // pointer did.
    private pointerX = Number.NaN;
    private pointerY = Number.NaN;
    // Whether the last press began on the backdrop, which alone lets its click close the picker.
    private pressedBackdrop = false;

    private constructor(panel: HTMLDialogElement, search: HTMLInputElement, rail: HTMLElement, list: HTMLElement, empty: HTMLElement, home: HTMLElement | null, entries: () => readonly TEntry[], words: PickerWords, icons: Icons, ids: PickerIds, roving: RovingFocus, focus: Focus, shortcuts: ShortcutWords, choose: (entry: TEntry) => void) {
        this.panel = panel;
        this.search = search;
        this.rail = rail;
        this.railToggle = panel.querySelector<HTMLElement>(RailToggleSelector);
        this.list = list;
        this.empty = empty;
        this.home = home;
        this.entries = entries;
        this.words = words;
        this.icons = icons;
        this.ids = ids;
        this.roving = roving;
        this.focus = focus;
        this.shortcuts = shortcuts;
        this.choose = choose;

        this.search.addEventListener("input", () => this.draw(true));
        // The field's clear button is the core's, and it says so with a change rather than an input. A change also comes as the field
        // loses the focus (a Tab, a category's press), which is no new search: the list drawn for it stands.
        this.search.addEventListener("change", () => {
            if (this.search.value !== this.drawnTerms)
                this.draw(false);
        });
        this.search.addEventListener("keydown", event => this.key(event));
        // Escape closes the picker from anywhere in it — the search too, whose Escape the framework's field keys would otherwise take
        // to leave the field, dropping the focus while the dialog stays.
        this.panel.addEventListener("keydown", event => this.escape(event));
        this.panel.addEventListener("keydown", event => this.tab(event));
        this.panel.addEventListener("mousedown", event => this.press(event));
        this.rail.addEventListener("click", event => this.rails(event));
        this.railToggle?.addEventListener("click", () => this.showRail(this.railToggle?.getAttribute("aria-expanded") !== "true"));
        this.rail.addEventListener("keydown", event => this.railKey(event));
        this.list.addEventListener("click", event => this.click(event));
        this.list.addEventListener("pointermove", event => this.point(event));
        // A press on the dialog itself is one on its backdrop, the panel's own content standing over the rest of it. Only a click whose
        // press began there closes the picker: one pressed inside and let go outside lands on the dialog too, as their common ancestor.
        this.panel.addEventListener("pointerdown", event => {
            this.pressedBackdrop = event.target === this.panel;
        });
        this.panel.addEventListener("click", event => {
            if (event.target === this.panel && this.pressedBackdrop)
                this.close();
        });
        // However the dialog closed — Escape closes it natively, past close() — the field no longer controls an open list.
        this.panel.addEventListener("close", () => {
            this.search.setAttribute("aria-expanded", "false");
            this.returnKeyboard();
        });
    }

    public static create<TEntry extends PickerEntry>(root: HTMLElement, entries: () => readonly TEntry[], words: PickerWords, ids: PickerIds, icons: Icons, roving: RovingFocus, focus: Focus, shortcuts: ShortcutWords, choose: (entry: TEntry) => void): Picker<TEntry> | null {
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
        // A scrolling box is a Tab stop of its own in Chrome; the list's entries are reached through the search.
        list.tabIndex = -1;
        panel.querySelector(RailToggleSelector)?.setAttribute("aria-controls", ids.ensureId(rail, "ui-graph-picker-rail"));

        return new Picker(panel, search, rail, list, empty, root.querySelector<HTMLElement>(HomeSelector), entries, words, icons, ids, roving, focus, shortcuts, choose);
    }

    public get isOpen(): boolean {
        return this.panel.open;
    }

    public open(): void {
        this.search.value = "";
        this.category = AllCategories;
        this.railStop = AllCategories;
        this.showRail(false);
        this.drawRail();
        this.draw(false);

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

    /** On a phone, unfolds or folds the rail's tree above the list under the row naming the chosen category; beside the list it stands always. */
    private showRail(shown: boolean): void {
        this.railToggle?.setAttribute("aria-expanded", String(shown));
    }

    public contains(target: EventTarget | null): boolean {
        return target instanceof Node && this.panel.contains(target);
    }

    private escape(event: KeyboardEvent): void {
        if (event.key !== "Escape" || event.defaultPrevented || this.shortcuts.isEscapeClaimed(event) || !this.isOpen)
            return;

        event.preventDefault();
        this.close();
    }

    /** The dialog closed: the native return lands on what opened it; where that is gone, or never held the keyboard, the canvas takes it. */
    private returnKeyboard(): void {
        const active = document.activeElement;

        if (this.home !== null && (active === null || active === document.body || this.panel.contains(active)))
            this.home.focus({ preventScroll: true });
    }

    /** Tab walks the panel round and round, as the core's dialogs wrap: a modal's Tab past its last stop would leave for the browser's chrome. */
    private tab(event: KeyboardEvent): void {
        if (event.key === "Tab" && !event.defaultPrevented && this.shortcuts.isPlainKey(event, { shift: true }))
            this.focus.trapTab(this.panel, event);
    }

    /**
     * A press where nothing of the panel's takes the focus — an entry, the list's or the rail's empty room — leaves the keyboard in
     * the search, so typing goes on; an entry is still taken by its click.
     */
    private press(event: MouseEvent): void {
        const target = event.target instanceof Element ? event.target : null;

        // The dialog itself is its backdrop, whose click closes the picker.
        if (target === null || target === this.panel)
            return;

        const own = target.closest(FocusableSelector);

        if (own !== null && own !== this.panel && this.panel.contains(own) && !this.list.contains(own))
            return;

        event.preventDefault();

        if (document.activeElement !== this.search)
            this.search.focus({ preventScroll: true });
    }

    /** The categories as a tree under an entry for all of them, in the catalogue's order; a folded category's children are left out. */
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

        const lines: RailLine[] = [{ category: AllCategories, caption: this.words.text("ui.graph.all-kinds"), depth: 0, folds: false }];

        this.listRail(roots, 0, lines);
        const chosen = nodes.get(this.category);

        this.showChosen(chosen === undefined ? lines[0].caption : chosen.path.length === 0 ? this.words.text("ui.graph.uncategorized") : chosen.name);

        const drawn = new Map<string, HTMLElement>();

        for (const entry of this.rail.querySelectorAll<HTMLElement>(`[${CategoryAttribute}]`))
            drawn.set(entry.getAttribute(CategoryAttribute) ?? "", entry);

        // What folded away goes first, so what stays is never moved past it: a moved element loses the turn its chevron is making.
        const wanted = new Set(lines.map(line => line.category));

        for (const [category, entry] of drawn) {
            if (!wanted.has(category))
                entry.remove();
        }

        let next = this.rail.firstElementChild;

        // An entry already drawn is kept, so its chevron turns rather than jumps.
        for (const line of lines) {
            let entry = drawn.get(line.category);

            // A category that came to have others under it, or lost them, is drawn anew: its chevron comes and goes with them.
            if (entry !== undefined && entry.hasAttribute("aria-expanded") !== line.folds) {
                if (entry === next)
                    next = entry.nextElementSibling;

                entry.remove();
                entry = undefined;
            }

            entry ??= this.railEntry(line);
            this.showRailEntry(entry, line);

            if (entry === next)
                next = entry.nextElementSibling;
            else
                this.rail.insertBefore(entry, next);
        }

        const stops = this.railEntries();

        this.roving.applyTabIndex(stops, stops.find(entry => entry.getAttribute(CategoryAttribute) === this.railStop) ?? stops.find(entry => entry.getAttribute(CategoryAttribute) === this.category) ?? stops[0] ?? null);
    }

    private railEntries(): HTMLElement[] {
        return [...this.rail.querySelectorAll<HTMLElement>(`[${CategoryAttribute}]`)];
    }

    private listRail(level: readonly RailNode[], depth: number, lines: RailLine[]): void {
        for (const node of level) {
            const folds = node.children.length > 0;

            lines.push({ category: node.path, caption: node.path.length === 0 ? this.words.text("ui.graph.uncategorized") : node.name, depth, folds });

            if (folds && this.unfolded.has(node.path))
                this.listRail(node.children, depth + 1, lines);
        }
    }

    /** The chosen category's name on the row that stands for the rail on a phone. */
    private showChosen(caption: string): void {
        const text = this.railToggle?.firstElementChild ?? null;

        if (text !== null && text.textContent !== caption)
            text.textContent = caption;
    }

    private railEntry(line: RailLine): HTMLElement {
        const entry = document.createElement("button");
        const mark = document.createElement("span");
        const text = document.createElement("span");

        entry.type = "button";
        entry.className = "ui-graph__picker-category";
        entry.setAttribute("role", "treeitem");
        entry.setAttribute(CategoryAttribute, line.category);

        // Every category keeps the chevron's room, so the names of those with nothing under them line up with the rest.
        mark.className = "ui-graph__picker-fold";
        mark.setAttribute("aria-hidden", "true");

        if (line.folds) {
            mark.setAttribute(FoldAttribute, "");
            this.icons.apply(mark, "ne-chevron-right");
        }

        entry.append(mark, text);

        return entry;
    }

    /** What a category's entry says as the rail stands now: its name and depth, whether it is chosen, whether it is unfolded. */
    private showRailEntry(entry: HTMLElement, line: RailLine): void {
        const text = entry.lastElementChild;

        entry.setAttribute("aria-selected", String(line.category === this.category));
        entry.setAttribute("aria-level", String(line.depth + 1));
        entry.style.setProperty(DepthProperty, String(line.depth));

        if (line.folds)
            entry.setAttribute("aria-expanded", String(this.unfolded.has(line.category)));

        if (text !== null && text.textContent !== line.caption)
            text.textContent = line.caption;
    }

    /**
     * A chevron folds or unfolds its category; a name chooses and unfolds it, or folds it when chosen and open. A pointer press gives
     * the search the focus back; Enter or Space keeps it on the category.
     */
    private rails(event: MouseEvent): void {
        const target = event.target instanceof Element ? event.target : null;
        const entry = target === null ? null : target.closest<HTMLElement>(`[${CategoryAttribute}]`);

        if (target === null || entry === null)
            return;

        const category = entry.getAttribute(CategoryAttribute) ?? AllCategories;

        if (target.closest(`[${FoldAttribute}]`) !== null) {
            this.toggle(category);
            this.drawRail();
        }
        else {
            if (entry.hasAttribute("aria-expanded"))
                this.toggle(category, category === this.category ? undefined : true);

            this.category = category;
            this.railStop = category;
            this.showRail(false);
            this.drawRail();
            this.draw(event.detail === 0);
        }

        if (event.detail > 0)
            this.search.focus({ preventScroll: true });
    }

    /**
     * The rail's keys, as a tree's: Up and Down (Home, End) walk the categories, Right unfolds or steps into the first one under,
     * Left folds or steps out to the one above.
     */
    private railKey(event: KeyboardEvent): void {
        const current = event.target instanceof Element ? event.target.closest<HTMLElement>(`[${CategoryAttribute}]`) : null;

        if (current === null || event.defaultPrevented || !this.shortcuts.isPlainKey(event))
            return;

        const category = current.getAttribute(CategoryAttribute) ?? AllCategories;
        const entries = this.railEntries();
        const at = entries.indexOf(current);
        const depth = (entry: HTMLElement | undefined): number => Number(entry?.getAttribute("aria-level") ?? 0);
        let next: HTMLElement | null | undefined = null;

        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            const open = current.getAttribute("aria-expanded");

            if ((event.key === "ArrowRight" && open === "false") || (event.key === "ArrowLeft" && open === "true")) {
                event.preventDefault();
                this.toggle(category);
                this.drawRail();
                return;
            }

            next = event.key === "ArrowRight"
                ? (open === "true" ? entries[at + 1] : null)
                : entries.slice(0, at).reverse().find(entry => depth(entry) < depth(current));
        }
        else {
            next = this.roving.target({ key: event.key, items: entries, current, axis: "vertical", loop: false });
        }

        if (next === null || next === undefined)
            return;

        event.preventDefault();
        this.railStop = next.getAttribute(CategoryAttribute) ?? AllCategories;
        this.roving.applyTabIndex(entries, next);
        next.focus({ preventScroll: true });
    }

    private toggle(category: string, unfold?: boolean): void {
        if (unfold ?? !this.unfolded.has(category))
            this.unfolded.add(category);
        else
            this.unfolded.delete(category);
    }

    /**
     * Lists the entries the search and the category leave, the first one current. It wears the keyboard's frame only where the keyboard
     * drew the list (typing, a key on the rail): the keyboard's place is drawn only for the keyboard, not on opening by a press or a tap.
     */
    private draw(byKeyboard: boolean): void {
        this.drawnTerms = this.search.value;

        const terms = this.search.value.trim().toLowerCase();
        const matching = this.entries().filter(type => this.chosen(type) && (terms.length === 0 || matches(type, terms)));

        this.list.replaceChildren();
        this.empty.hidden = matching.length > 0;

        for (const type of matching) {
            const entry = document.createElement("button");

            entry.type = "button";
            entry.className = EntryClass;
            // No Tab stop: the focus stays in the search, and the arrows name the entry through aria-activedescendant.
            entry.tabIndex = -1;
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

        this.setCurrent(this.list.querySelector<HTMLElement>(`.${EntryClass}`), !byKeyboard);
    }

    /** The entry the arrows and Enter stand on: the class draws it, and the search field names it for whoever is listening. */
    private setCurrent(entry: HTMLElement | null, pointed = false): void {
        for (const candidate of this.list.querySelectorAll<HTMLElement>(`.${EntryClass}`)) {
            const current = candidate === entry;

            candidate.classList.toggle(CurrentClass, current);
            candidate.classList.toggle(PointedClass, current && pointed);
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
        if (this.shortcuts.isComposing(event))
            return;

        if (event.key === "Enter") {
            event.preventDefault();
            this.take(this.list.querySelector<HTMLElement>(`.${CurrentClass}`));
            return;
        }

        // Only the arrows walk the list: Home and End stay the search text's, moving its caret.
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown")
            return;

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

    /** The pointer moving over an entry makes it the current one, as a list of choices does, so only one entry is ever lit. */
    private point(event: PointerEvent): void {
        if (event.clientX === this.pointerX && event.clientY === this.pointerY)
            return;

        this.pointerX = event.clientX;
        this.pointerY = event.clientY;

        const entry = event.target instanceof Element ? event.target.closest<HTMLElement>(`.${EntryClass}`) : null;

        if (entry !== null && !entry.classList.contains(CurrentClass))
            this.setCurrent(entry, true);
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

/** One entry of the rail as drawn: the category, what it is called, how deep it stands, and whether others stand under it. */
type RailLine = { readonly category: string; readonly caption: string; readonly depth: number; readonly folds: boolean };

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
