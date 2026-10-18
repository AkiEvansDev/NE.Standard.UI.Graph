// A small stand-in for the DOM, for the tests of engines that read the focus, containment, a few attributes and classes, and
// events bubbling up a tree: enough selectors for the framework's own lists (classes, attributes, roles, `*`, `[name^=value]`,
// `:not()`, `:is()`, `:disabled`, `:scope`, `:active`, `:focus-visible`, `:modal`, `:popover-open`, the child and descendant
// combinators), and nothing laid out but what a test says. The window — its timers and capturing listeners — is installed on request
// (`fakeWindowGlobals`).
// One file for every client: a package's `tests/fake-dom.ts` is a byte-for-byte copy of this one (PluginApiSyncTests), since a mirror
// type-checks its tests without the core's sources beside it. Grow this file and copy it over, never a copy.

type Listener = (domEvent: FakeEvent) => void;

/** An event as the engines read it: its key and target, whether it was taken, and a way to take it. */
export class FakeEvent {
    public readonly type: string;
    public readonly key: string;
    public target: FakeElement | null = null;
    public defaultPrevented = false;
    public readonly isComposing: boolean = false;
    /** Raised by the browser rather than by a script; a test says so where it plays the browser. */
    public isTrusted = false;
    public shiftKey = false;
    public altKey = false;
    public ctrlKey = false;
    public metaKey = false;

    public constructor(type: string, key = "") {
        this.type = type;
        this.key = key;
    }

    /** Set by `stopImmediatePropagation`: no listener after the current one hears the event, here or above. */
    public stopped = false;

    /** Set by `stopPropagation`: the listeners here still hear it, none above. */
    public stoppedHere = false;

    public preventDefault(): void {
        this.defaultPrevented = true;
    }

    public stopImmediatePropagation(): void {
        this.stopped = true;
    }

    public stopPropagation(): void {
        this.stoppedHere = true;
    }
}

export class FakeKeyboardEvent extends FakeEvent {
    public constructor(key: string, target: FakeElement | null = null, shiftKey = false) {
        super("keydown", key);
        this.target = target;
        this.shiftKey = shiftKey;
    }
}

/** The elements the browser puts in the tab order with no `tabindex` of their own. */
const NativeStops = new Set(["button", "input", "select", "textarea"]);

export class FakeElement {
    public readonly tagName: string;
    public parent: FakeElement | null = null;
    public readonly children: FakeElement[] = [];
    public readonly attributes = new Map<string, string>();
    public readonly classes = new Set<string>();
    public laidOut = true;
    /** The `hidden` property: the element and all under it are laid out no more. */
    public hidden = false;
    /** Laid out but `visibility: hidden` (a fade not yet begun): it keeps its box and refuses the focus. */
    public visible = true;
    public disabled = false;
    /** A `<dialog>` shown by `showModal()`, which `:modal` matches. */
    public modal = false;
    /** A popover shown by `showPopover()`, which `:popover-open` matches. */
    public popoverOpen = false;
    public id = "";
    /** The box it is laid out in, where a test places it. */
    public rect = { left: 0, top: 0, width: 0, height: 0 };
    public readonly style: Record<string, unknown> = {
        setProperty(name: string, value: string): void {
            this[name] = value;
        },
        removeProperty(name: string): void {
            delete this[name];
        },
        getPropertyValue(name: string): string {
            return typeof this[name] === "string" ? this[name] : "";
        }
    };
    public readonly dataset: Record<string, string> = {};
    public readonly clientLeft = 0;
    public readonly clientTop = 0;
    /** Where a scroll box stands; a test lays the boxes out as they stand after it, since nothing here moves them. */
    public scrollTop = 0;
    public scrollLeft = 0;
    private readonly listeners = new Map<string, Listener[]>();
    private text = "";

    public constructor(tagName = "div") {
        this.tagName = tagName;
    }

    /** Its tag in lower case, as the browser names an HTML element's. */
    public get localName(): string {
        return this.tagName.toLowerCase();
    }

    /** An element with classes and attributes, for a line per part of a test's tree. */
    public static of(classes: string, attributes: Readonly<Record<string, string>> = {}, tagName = "div"): FakeElement {
        const element = new FakeElement(tagName);

        for (const name of classes.split(" ").filter(name => name.length > 0))
            element.classes.add(name);

        for (const [name, value] of Object.entries(attributes))
            element.attributes.set(name, value);

        return element;
    }

    /** A copy of its tag, classes, attributes, data and words, and with `deep` its children's as well; no listeners, as the browser's. */
    public cloneNode(deep = false): FakeElement {
        const copy = FakeElement.of(this.className, Object.fromEntries(this.attributes), this.tagName);

        Object.assign(copy.dataset, this.dataset);
        copy.text = this.text;

        if (deep)
            copy.append(...this.children.map(child => child.cloneNode(true)));

        return copy;
    }

    /** Puts the children last, each taken from wherever it stood; a string as a text node, as the browser does. */
    public append(...children: (FakeElement | string)[]): this {
        for (const given of children) {
            const child = typeof given === "string" ? fakeDocument.createTextNode(given) : given;

            child.detach();
            child.parent = this;
            this.children.push(child);
        }

        return this;
    }

    /** Puts the elements right after this one, in their order. */
    public after(...elements: FakeElement[]): void {
        const next = this.nextElementSibling;

        for (const element of elements)
            this.parent?.insertBefore(element, next);
    }

    public appendChild(child: FakeElement): FakeElement {
        this.append(child);

        return child;
    }

    public get parentElement(): FakeElement | null {
        return this.parent;
    }

    public get firstElementChild(): FakeElement | null {
        return this.children[0] ?? null;
    }

    public get lastElementChild(): FakeElement | null {
        return this.children[this.children.length - 1] ?? null;
    }

    public get previousElementSibling(): FakeElement | null {
        return this.parent?.children[this.parent.children.indexOf(this) - 1] ?? null;
    }

    public get nextElementSibling(): FakeElement | null {
        return this.parent?.children[this.parent.children.indexOf(this) + 1] ?? null;
    }

    /** Moves the child in front of `reference`, taking it from wherever it stood; at the end with none. */
    public insertBefore(child: FakeElement, reference: FakeElement | null): FakeElement {
        child.remove();
        child.parent = this;
        this.children.splice(reference === null ? this.children.length : this.children.indexOf(reference), 0, child);

        return child;
    }

    /** Puts the children first, in their order. */
    public prepend(...children: FakeElement[]): void {
        for (const [index, child] of children.entries())
            this.insertBefore(child, this.children[index] ?? null);
    }

    public get isConnected(): boolean {
        const top = this.top();

        return top === fakeDocument.body || top === fakeDocument.documentElement;
    }

    public get className(): string {
        return [...this.classes].join(" ");
    }

    public set className(value: string) {
        this.classes.clear();

        for (const name of value.split(" ").filter(name => name.length > 0))
            this.classes.add(name);
    }

    public get classList(): Iterable<string> & { contains(name: string): boolean; toggle(name: string, force?: boolean): boolean; add(...names: string[]): void; remove(...names: string[]): void } {
        const classes = this.classes;

        return {
            // Walked as a token list is: an icon value clears the glyph before it through `Array.from`.
            [Symbol.iterator]: () => [...classes][Symbol.iterator](),
            contains: name => classes.has(name),
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            toggle: (name, force) => {
                const on = force ?? !classes.has(name);

                if (on)
                    classes.add(name);
                else
                    classes.delete(name);

                return on;
            }
        };
    }

    public contains(other: unknown): boolean {
        for (let current = other instanceof FakeElement ? other : null; current !== null; current = current.parent) {
            if (current === this)
                return true;
        }

        return false;
    }

    public hasAttribute(name: string): boolean {
        return this.attributes.has(name);
    }

    public getAttribute(name: string): string | null {
        return this.attributes.get(name) ?? null;
    }

    /** Its attributes' names, `class` among them while it has a class, as the browser lists them. */
    public getAttributeNames(): string[] {
        return this.classes.size === 0 ? [...this.attributes.keys()] : ["class", ...this.attributes.keys()];
    }

    public setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }

    public removeAttribute(name: string): void {
        if (name === "class")
            this.classes.clear();

        this.attributes.delete(name);
    }

    public toggleAttribute(name: string, force?: boolean): boolean {
        const on = force ?? !this.attributes.has(name);

        if (on)
            this.attributes.set(name, "");
        else
            this.attributes.delete(name);

        return on;
    }

    /** The browser's: a control is in the tab order by itself, anything else only by its own `tabindex`. */
    public get tabIndex(): number {
        const own = this.attributes.get("tabindex");

        if (own !== undefined)
            return Number(own);

        return NativeStops.has(this.tagName.toLowerCase()) || (this.tagName.toLowerCase() === "a" && this.attributes.has("href")) ? 0 : -1;
    }

    public set tabIndex(value: number) {
        this.attributes.set("tabindex", String(value));
    }

    /** Takes the focus as the browser gives it: not while the element is not laid out or not visible. */
    public focus(): void {
        const previous = fakeDocument.activeElement;

        if (previous === this || !this.laidOut || !this.visible)
            return;

        fakeDocument.activeElement = this;
        previous?.dispatchEvent(Object.assign(new FakeEvent("focusout"), { relatedTarget: this }));
        previous?.dispatchEvent(new FakeEvent("blur"));
        this.dispatchEvent(new FakeEvent("focusin"));
    }

    public blur(): void {
        if (fakeDocument.activeElement !== this)
            return;

        fakeDocument.activeElement = fakeDocument.body;
        this.dispatchEvent(Object.assign(new FakeEvent("focusout"), { relatedTarget: null }));
        this.dispatchEvent(new FakeEvent("blur"));
    }

    public showPopover(): void {
        this.popoverOpen = true;
    }

    public hidePopover(): void {
        this.popoverOpen = false;
    }

    public scrollIntoView(): void {
    }

    /** A press run from script, as `HTMLElement.click()` runs it: a click on the element, laid out or not, counting no presses as a key's. */
    public click(): void {
        this.dispatchEvent(Object.assign(new FakeEvent("click"), { detail: 0 }));
    }

    /** Where its box stands without a transform: a drawer still sliding in has its `rect` off the edge and this at it. */
    public offset: { left: number; top: number } | null = null;

    public get offsetLeft(): number {
        return this.offset?.left ?? this.rect.left;
    }

    public get offsetTop(): number {
        return this.offset?.top ?? this.rect.top;
    }

    public get offsetWidth(): number {
        return this.rect.width;
    }

    public get offsetHeight(): number {
        return this.rect.height;
    }

    public get clientWidth(): number {
        return this.rect.width;
    }

    public get clientHeight(): number {
        return this.rect.height;
    }

    /** Its own words and its children's, in order; set, the words replace the children. */
    public get textContent(): string {
        return this.text + this.children.map(child => child.textContent).join("");
    }

    public set textContent(value: string) {
        this.text = value;

        for (const child of this.children)
            child.parent = null;

        this.children.length = 0;
    }

    public replaceChildren(...children: FakeElement[]): void {
        this.textContent = "";
        this.append(...children);
    }

    public getBoundingClientRect(): DOMRect {
        const { left, top, width, height } = this.rect;

        return { left, top, width, height, x: left, y: top, right: left + width, bottom: top + height } as DOMRect;
    }

    public remove(): void {
        if (this.parent === null)
            return;

        const active = fakeDocument.activeElement;

        // Chromium: a field that held the focus, edited since it took it, says `change` as it goes, while still on the page.
        if (active instanceof FakeInput && this.contains(active) && active.value !== active.valueAtFocus)
            fakeWindow.dispatch(active, Object.assign(new FakeEvent("change"), { isTrusted: true }));

        this.detach();

        // A browser drops the focus of a removed element to the body, and says nothing of it.
        if (fakeDocument.activeElement !== null && this.contains(fakeDocument.activeElement))
            fakeDocument.activeElement = fakeDocument.body;
    }

    /**
     * A box where it is laid out: none where it is not, or where it or anything above it is `hidden`. `laidOut` is its own alone, as
     * `display: contents` is: a wrapping list's row is drawn by its tile.
     */
    public getClientRects(): unknown[] {
        return this.laidOut && !this.isHidden() ? [{}] : [];
    }

    private isHidden(): boolean {
        return this.hidden || (this.parent?.isHidden() ?? false);
    }

    /** Whether it is drawn: it and everything above it laid out and visible. */
    public checkVisibility(): boolean {
        return this.laidOut && this.visible && (this.parent?.checkVisibility() ?? true);
    }

    public static readonly DOCUMENT_POSITION_PRECEDING = 2;
    public static readonly DOCUMENT_POSITION_FOLLOWING = 4;
    public static readonly DOCUMENT_POSITION_CONTAINS = 8;
    public static readonly DOCUMENT_POSITION_CONTAINED_BY = 16;

    /** Where another element of the same tree stands against this one, in document order, as the DOM's own bits say. */
    public compareDocumentPosition(other: FakeElement): number {
        if (other === this)
            return 0;

        if (this.contains(other))
            return FakeElement.DOCUMENT_POSITION_FOLLOWING | FakeElement.DOCUMENT_POSITION_CONTAINED_BY;

        if (other.contains(this))
            return FakeElement.DOCUMENT_POSITION_PRECEDING | FakeElement.DOCUMENT_POSITION_CONTAINS;

        const order = [this.top(), ...this.top().descendants()];

        return order.indexOf(other) > order.indexOf(this) ? FakeElement.DOCUMENT_POSITION_FOLLOWING : FakeElement.DOCUMENT_POSITION_PRECEDING;
    }

    public get isContentEditable(): boolean {
        return this.attributes.get("contenteditable") === "true";
    }

    public matches(selector: string): boolean {
        return matchesSelector(this, selector, null);
    }

    public closest(selector: string): FakeElement | null {
        return this.matches(selector) ? this : this.parent?.closest(selector) ?? null;
    }

    public querySelectorAll(selector: string): FakeElement[] {
        return this.descendants().filter(element => matchesSelector(element, selector, this));
    }

    public querySelector(selector: string): FakeElement | null {
        return this.querySelectorAll(selector)[0] ?? null;
    }

    public addEventListener(type: string, listener: Listener): void {
        this.listeners.set(type, [...this.listeners.get(type) ?? [], listener]);
    }

    public removeEventListener(type: string, listener: Listener): void {
        this.listeners.set(type, (this.listeners.get(type) ?? []).filter(other => other !== listener));
    }

    /** Runs the listeners on the element and every element above it, the target set where the event has none. */
    public dispatchEvent(domEvent: FakeEvent | Event): boolean {
        if (domEvent instanceof FakeEvent && domEvent.target === null)
            domEvent.target = this;

        this.bubble(domEvent as FakeEvent);

        return !(domEvent instanceof FakeEvent && domEvent.defaultPrevented);
    }

    private bubble(domEvent: FakeEvent): void {
        for (const listener of this.listeners.get(domEvent.type) ?? []) {
            if (domEvent.stopped)
                return;

            listener(domEvent);
        }

        if (!domEvent.stopped && !domEvent.stoppedHere)
            this.parent?.bubble(domEvent);
    }

    private top(): FakeElement {
        return this.parent === null ? this : this.parent.top();
    }

    /** Out of its parent's children; a test that emptied the children by hand has left only the parent to forget. */
    private detach(): void {
        if (this.parent === null)
            return;

        const index = this.parent.children.indexOf(this);

        if (index >= 0)
            this.parent.children.splice(index, 1);

        this.parent = null;
    }

    private descendants(): FakeElement[] {
        return this.children.flatMap(child => [child, ...child.descendants()]);
    }
}

export class FakeInput extends FakeElement {
    public type: string;
    public name = "";
    public value = "";
    public checked = false;
    public readOnly = false;
    /** Where the caret was last put, as `[start, end]`; null until something puts it. */
    public selection: [number, number] | null = null;
    /** The end the selection was made from, as the browser keeps it. */
    public selectionDirection: "forward" | "backward" | "none" = "none";
    /** What it held as it took the focus. */
    public valueAtFocus = "";
    /** Whether its text was selected whole, as `select()` does. */
    public selected = false;

    public constructor(type = "text") {
        super("input");
        this.type = type;
    }

    public override focus(): void {
        this.valueAtFocus = this.value;
        super.focus();
    }

    public select(): void {
        this.selected = true;
    }

    /** The browser's: null on a type that keeps no selection a page can read (an email, a number field). */
    public get selectionStart(): number | null {
        return SelectionInputTypes.has(this.type) ? this.selection?.[0] ?? this.value.length : null;
    }

    public get selectionEnd(): number | null {
        return SelectionInputTypes.has(this.type) ? this.selection?.[1] ?? this.value.length : null;
    }

    /** Throws on a type that keeps no selection, as the browser does. */
    public setSelectionRange(start: number, end: number, direction: "forward" | "backward" | "none" = "none"): void {
        if (!SelectionInputTypes.has(this.type))
            throw new DOMException(`The input element's type ('${this.type}') does not support selection.`, "InvalidStateError");

        this.selection = [start, end];
        this.selectionDirection = direction;
    }
}

/** The input types whose text a page can select and put the caret in. */
const SelectionInputTypes: ReadonlySet<string> = new Set(["text", "search", "url", "tel", "password"]);

export class FakeTextArea extends FakeElement {
    public value = "";
    public readOnly = false;
    public selection: [number, number] | null = null;

    public constructor() {
        super("textarea");
    }

    public setSelectionRange(start: number, end: number): void {
        this.selection = [start, end];
    }
}

class FakeSelect extends FakeElement {
    public value = "";

    public constructor() {
        super("select");
    }
}

class FakeDetails extends FakeElement {
    public open = false;

    public constructor() {
        super("details");
    }
}

export class FakeLabel extends FakeElement {
    public control: FakeElement | null = null;

    public constructor() {
        super("label");
    }
}

/**
 * A native `<dialog>`: shown modal and closed, the focus it held going back to what had it before, then its `close` event.
 * @public a package's tests use it
 */
export class FakeDialog extends FakeElement {
    public open = false;
    private opener: FakeElement | null = null;

    public constructor() {
        super("dialog");
    }

    public showModal(): void {
        this.opener = fakeDocument.activeElement;
        this.open = true;
        this.modal = true;
    }

    public close(): void {
        if (!this.open)
            return;

        this.open = false;
        this.modal = false;

        if (fakeDocument.activeElement !== null && this.contains(fakeDocument.activeElement)) {
            if (this.opener !== null && this.opener.isConnected)
                this.opener.focus();
            else
                fakeDocument.activeElement.blur();
        }

        this.dispatchEvent(new FakeEvent("close"));
    }
}

/** The page's document as a type: the stand-in below is never one, so a root asked `instanceof Document` is an element. */
class FakeDocumentType {
    public readonly nodeType = 9;
}

export const fakeDocument = {
    activeElement: null as FakeElement | null,
    /** Whether the window holds the focus: false while the reader is in another window. */
    focused: true,
    hasFocus: (): boolean => fakeDocument.focused,
    body: new FakeElement("body"),
    documentElement: new FakeElement("html"),
    createElement: (tagName: string): FakeElement => tagName === "input" ? new FakeInput() : new FakeElement(tagName),
    /** A fragment and a text node as elements of their own: what inline markup builds before it replaces an element's content. */
    createDocumentFragment: (): FakeElement => new FakeElement("#fragment"),
    createTextNode: (text: string): FakeElement => {
        const node = new FakeElement("#text");

        node.textContent = text;

        return node;
    },
    addEventListener: (type: string, listener: Listener): void => fakeDocument.documentElement.addEventListener(type, listener),
    removeEventListener: (type: string, listener: Listener): void => fakeDocument.documentElement.removeEventListener(type, listener),
    querySelectorAll: (selector: string): FakeElement[] => fakeDocument.body.querySelectorAll(selector),
    querySelector: (selector: string): FakeElement | null => fakeDocument.body.querySelector(selector),
    /** The reader's text selection, as much of it as an engine reads: whether it holds any text, and taking it away. */
    selection: {
        isCollapsed: true,
        removeAllRanges(): void {
            this.isCollapsed = true;
        }
    },
    getSelection: (): { isCollapsed: boolean; removeAllRanges(): void } => fakeDocument.selection
};

fakeDocument.activeElement = fakeDocument.body;

/**
 * The window as the engines reach it: timers the test runs by hand, and listeners that hear an event before any element does.
 * @public a package's tests use it
 */
export const fakeWindow = {
    timers: [] as (() => void)[],
    listeners: new Map<string, Listener[]>(),
    setTimeout: (callback: () => void): number => fakeWindow.timers.push(callback),
    addEventListener: (type: string, listener: Listener): void => {
        fakeWindow.listeners.set(type, [...fakeWindow.listeners.get(type) ?? [], listener]);
    },
    /** Runs every timer set so far, and those they set. */
    runTimers: (): void => {
        for (let callback = fakeWindow.timers.shift(); callback !== undefined; callback = fakeWindow.timers.shift())
            callback();
    },
    /** Raises an event as the browser does: the window's capturing listeners first, then the target and every element above it. */
    dispatch: (target: FakeElement, domEvent: FakeEvent): void => {
        domEvent.target = target;

        for (const listener of fakeWindow.listeners.get(domEvent.type) ?? [])
            listener(domEvent);

        if (!domEvent.stopped && !domEvent.stoppedHere)
            target.dispatchEvent(domEvent);
    }
};

/**
 * The window's globals, for `installFakeDom` where the module under test reaches the window: its timers, its listeners, a style's visibility.
 * @public a package's tests use it
 */
export const fakeWindowGlobals: Readonly<Record<string, unknown>> = {
    window: fakeWindow,
    FocusEvent: FakeEvent,
    getComputedStyle: (element: FakeElement): { visibility: string } => ({ visibility: element.visible ? "visible" : "hidden" })
};

/** Puts the stand-in in place of the browser's globals; before the module under test loads, since it reads them as it runs. */
export function installFakeDom(extra: Readonly<Record<string, unknown>> = {}): void {
    Object.assign(globalThis, {
        document: fakeDocument,
        Element: FakeElement,
        Node: FakeElement,
        HTMLElement: FakeElement,
        HTMLInputElement: FakeInput,
        HTMLTextAreaElement: FakeTextArea,
        HTMLSelectElement: FakeSelect,
        HTMLDetailsElement: FakeDetails,
        Document: FakeDocumentType,
        HTMLLabelElement: FakeLabel,
        KeyboardEvent: FakeKeyboardEvent,
        ...extra
    });
}

/** The stand-in — an element, an event, a service's few members — as the type the module under test takes. */
export function real<T = HTMLElement>(element: unknown): T {
    return element as T;
}

function splitList(selector: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;

    for (let index = 0; index < selector.length; index++) {
        const character = selector[index];

        if (character === "(" || character === "[")
            depth++;
        else if (character === ")" || character === "]")
            depth--;
        else if (character === "," && depth === 0) {
            parts.push(selector.slice(start, index).trim());
            start = index + 1;
        }
    }

    parts.push(selector.slice(start).trim());

    return parts;
}

function matchesSelector(element: FakeElement, selector: string, scope: FakeElement | null): boolean {
    return splitList(selector).some(complex => {
        const { compounds, combinators } = parseComplex(complex);

        return matchesComplex(element, compounds, combinators, compounds.length - 1, scope);
    });
}

/** A complex selector as its compounds and the combinators between them, `>` or a space. */
function parseComplex(selector: string): { compounds: string[]; combinators: string[] } {
    const compounds: string[] = [];
    const combinators: string[] = [];
    let current = "";
    let pending: string | null = null;
    let depth = 0;

    for (const character of selector.trim()) {
        if (depth === 0 && (character === ">" || /\s/.test(character))) {
            if (current.length > 0) {
                compounds.push(current);
                current = "";
                pending = " ";
            }

            if (character === ">")
                pending = ">";

            continue;
        }

        if (character === "(" || character === "[")
            depth++;
        else if (character === ")" || character === "]")
            depth--;

        if (current.length === 0 && pending !== null) {
            combinators.push(pending);
            pending = null;
        }

        current += character;
    }

    if (current.length > 0)
        compounds.push(current);

    return { compounds, combinators };
}

function matchesComplex(element: FakeElement, compounds: readonly string[], combinators: readonly string[], index: number, scope: FakeElement | null): boolean {
    if (!matchesCompound(element, compounds[index], scope))
        return false;

    if (index === 0)
        return true;

    if (combinators[index - 1] === ">")
        return element.parent !== null && matchesComplex(element.parent, compounds, combinators, index - 1, scope);

    for (let ancestor = element.parent; ancestor !== null; ancestor = ancestor.parent) {
        if (matchesComplex(ancestor, compounds, combinators, index - 1, scope))
            return true;
    }

    return false;
}

const Token = /^(?:([a-z]+)|\.([\w-]+)|\[([\w-]+)(?:(\^?)=(?:"((?:[^"\\]|\\.)*)"|['"]?([^'"\]]*)['"]?))?\]|:not\(((?:[^()]|\([^()]*\))*)\)|:is\(((?:[^()]|\([^()]*\))*)\)|:(disabled|scope|active|focus-visible|modal|popover-open))/;

function matchesCompound(element: FakeElement, compound: string, scope: FakeElement | null): boolean {
    let rest = compound.trim();

    while (rest.length > 0) {
        // The universal selector: any element, as a scroll effect walks every one under its target.
        if (rest.startsWith("*")) {
            rest = rest.slice(1);
            continue;
        }

        const token = Token.exec(rest);

        if (token === null)
            throw new Error(`The stand-in does not read "${compound}".`);

        const [whole, tag, className, attribute, prefix, quoted, plain, negated, alternatives, pseudo] = token;
        // A double-quoted value as CSS escapes it (`cssAttributeValue`): a backslash takes the character after it as itself.
        const value = quoted === undefined ? plain : quoted.replace(/\\(.)/g, "$1");

        if (tag !== undefined && element.tagName !== tag)
            return false;

        if (className !== undefined && !element.classes.has(className))
            return false;

        // `[name^=value]` matches a value that starts with it, `[name=value]` the value alone.
        const actual = attribute === undefined ? undefined : element.attributes.get(attribute);

        if (attribute !== undefined && (actual === undefined || (value !== undefined && (prefix === "^" ? !actual.startsWith(value) : actual !== value))))
            return false;

        if (negated !== undefined && matchesSelector(element, negated, scope))
            return false;

        if (alternatives !== undefined && !matchesSelector(element, alternatives, scope))
            return false;

        if (pseudo === "disabled" && !element.disabled)
            return false;

        if (pseudo === "scope" && element !== scope)
            return false;

        if (pseudo === "modal" && !element.modal)
            return false;

        if (pseudo === "popover-open" && !element.popoverOpen)
            return false;

        // Nothing is ever pressed here, and the focus a test gives is the keyboard's.
        if (pseudo === "active" || (pseudo === "focus-visible" && element !== fakeDocument.activeElement))
            return false;

        rest = rest.slice(whole.length);
    }

    return true;
}
