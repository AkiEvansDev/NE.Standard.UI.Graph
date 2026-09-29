// A small stand-in for the DOM, for the tests of the canvas's parts that read the focus, containment, a few attributes and classes,
// and events bubbling up a tree: enough selectors for the canvas's own (classes, attributes, `*`, `:not()`, `:is()`, `:disabled`,
// `:scope`, the child and descendant combinators), and nothing laid out but what a test says. The core client's `tests/fake-dom.ts`
// with what a picker and a log need besides (siblings, `insertBefore`, `hidden`, a native Tab stop, a dialog); a copy, since the
// package builds without the core's sources.

type Listener = (domEvent: FakeEvent) => void;

/** An event as the engines read it: its key and target, whether it was taken, and a way to take it. */
export class FakeEvent {
    public readonly type: string;
    public readonly key: string;
    public target: FakeElement | null = null;
    public defaultPrevented = false;
    public readonly isComposing = false;
    public shiftKey = false;
    public readonly altKey = false;
    public readonly ctrlKey = false;
    public readonly metaKey = false;
    /** A click's count of presses: 0 for one a key made (Enter or Space on a button). */
    public detail = 0;

    public constructor(type: string, key = "") {
        this.type = type;
        this.key = key;
    }

    public preventDefault(): void {
        this.defaultPrevented = true;
    }
}

export class FakeKeyboardEvent extends FakeEvent {
    public constructor(key: string, target: FakeElement | null = null, shiftKey = false) {
        super("keydown", key);
        this.target = target;
        this.shiftKey = shiftKey;
    }
}

/** The tags a browser gives a Tab stop of their own, with no `tabindex` written. */
const NativeStops = new Set(["input", "button", "select", "textarea"]);

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
    public id = "";
    /** The box it is laid out in, where a test places it. */
    public rect = { left: 0, top: 0, width: 0, height: 0 };
    public readonly style: Record<string, unknown> = {
        setProperty(name: string, value: string): void {
            this[name] = value;
        },
        removeProperty(name: string): void {
            delete this[name];
        }
    };
    public readonly dataset: Record<string, string> = {};
    public readonly clientLeft = 0;
    public readonly clientTop = 0;
    private readonly listeners = new Map<string, Listener[]>();
    private text = "";

    public constructor(tagName = "div") {
        this.tagName = tagName;
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

    public append(...children: FakeElement[]): this {
        for (const child of children) {
            child.detach();
            child.parent = this;
            this.children.push(child);
        }

        return this;
    }

    /** Puts the child before `next`, or last where `next` is null; one already in a tree moves. */
    public insertBefore(child: FakeElement, next: FakeElement | null): FakeElement {
        if (next === null)
            return this.appendChild(child);

        child.detach();
        child.parent = this;
        this.children.splice(this.children.indexOf(next), 0, child);

        return child;
    }

    public get firstElementChild(): FakeElement | null {
        return this.children[0] ?? null;
    }

    public get lastElementChild(): FakeElement | null {
        return this.children.at(-1) ?? null;
    }

    public get nextElementSibling(): FakeElement | null {
        const siblings = this.parent?.children ?? [];

        return siblings[siblings.indexOf(this) + 1] ?? null;
    }

    public appendChild(child: FakeElement): FakeElement {
        this.append(child);

        return child;
    }

    public get parentElement(): FakeElement | null {
        return this.parent;
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

    public get classList(): { contains(name: string): boolean; toggle(name: string, force?: boolean): boolean; add(name: string): void; remove(name: string): void } {
        const classes = this.classes;

        return {
            contains: name => classes.has(name),
            add: name => void classes.add(name),
            remove: name => void classes.delete(name),
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

    public setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }

    public removeAttribute(name: string): void {
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

    public get tabIndex(): number {
        return Number(this.attributes.get("tabindex") ?? (NativeStops.has(this.tagName) ? "0" : "-1"));
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

    public scrollIntoView(): void {
    }

    public get offsetWidth(): number {
        return this.rect.width;
    }

    public get clientWidth(): number {
        return this.rect.width;
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

        this.detach();

        // A browser drops the focus of a removed element to the body, and says nothing of it.
        if (fakeDocument.activeElement !== null && this.contains(fakeDocument.activeElement))
            fakeDocument.activeElement = fakeDocument.body;
    }

    public getClientRects(): unknown[] {
        if (!this.laidOut || this.hidden)
            return [];

        return this.parent === null ? [{}] : this.parent.getClientRects();
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
        for (const listener of this.listeners.get(domEvent.type) ?? [])
            listener(domEvent);

        this.parent?.bubble(domEvent);
    }

    private top(): FakeElement {
        return this.parent === null ? this : this.parent.top();
    }

    private detach(): void {
        if (this.parent === null)
            return;

        this.parent.children.splice(this.parent.children.indexOf(this), 1);
        this.parent = null;
    }

    private descendants(): FakeElement[] {
        return this.children.flatMap(child => [child, ...child.descendants()]);
    }
}

export class FakeInput extends FakeElement {
    public type: string;
    public value = "";

    public constructor(type = "text") {
        super("input");
        this.type = type;
    }
}

/** A native `<dialog>`: shown modal and closed, the focus it held going back to what had it before, then its `close` event. */
export class FakeDialog extends FakeElement {
    public open = false;
    private opener: FakeElement | null = null;

    public constructor() {
        super("dialog");
    }

    public showModal(): void {
        this.opener = fakeDocument.activeElement;
        this.open = true;
    }

    public close(): void {
        if (!this.open)
            return;

        this.open = false;

        if (fakeDocument.activeElement !== null && this.contains(fakeDocument.activeElement)) {
            if (this.opener !== null && this.opener.isConnected)
                this.opener.focus();
            else
                fakeDocument.activeElement.blur();
        }

        this.dispatchEvent(new FakeEvent("close"));
    }
}

export const fakeDocument = {
    activeElement: null as FakeElement | null,
    body: new FakeElement("body"),
    documentElement: new FakeElement("html"),
    createElement: (tagName: string): FakeElement => tagName === "input" ? new FakeInput() : new FakeElement(tagName),
    addEventListener: (type: string, listener: Listener): void => fakeDocument.documentElement.addEventListener(type, listener),
    removeEventListener: (type: string, listener: Listener): void => fakeDocument.documentElement.removeEventListener(type, listener),
    querySelectorAll: (selector: string): FakeElement[] => fakeDocument.body.querySelectorAll(selector)
};

fakeDocument.activeElement = fakeDocument.body;

/** Puts the stand-in in place of the browser's globals; before the module under test loads, since it reads them as it runs. */
export function installFakeDom(extra: Readonly<Record<string, unknown>> = {}): void {
    Object.assign(globalThis, {
        document: fakeDocument,
        Element: FakeElement,
        Node: FakeElement,
        HTMLElement: FakeElement,
        HTMLInputElement: FakeInput,
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

const Token = /^(?:([a-z]+|\*)|\.([\w-]+)|\[([\w-]+)(?:=['"]?([^'"\]]*)['"]?)?\]|:not\(((?:[^()]|\([^()]*\))*)\)|:is\(((?:[^()]|\([^()]*\))*)\)|:(disabled|scope))/;

function matchesCompound(element: FakeElement, compound: string, scope: FakeElement | null): boolean {
    let rest = compound.trim();

    while (rest.length > 0) {
        const token = Token.exec(rest);

        if (token === null)
            throw new Error(`The stand-in does not read "${compound}".`);

        const [whole, tag, className, attribute, value, negated, alternatives, pseudo] = token;

        if (tag !== undefined && tag !== "*" && element.tagName !== tag)
            return false;

        if (className !== undefined && !element.classes.has(className))
            return false;

        if (attribute !== undefined && (!element.attributes.has(attribute) || (value !== undefined && element.attributes.get(attribute) !== value)))
            return false;

        if (negated !== undefined && matchesSelector(element, negated, scope))
            return false;

        if (alternatives !== undefined && !matchesSelector(element, alternatives, scope))
            return false;

        if (pseudo === "disabled" && !element.disabled)
            return false;

        if (pseudo === "scope" && element !== scope)
            return false;

        rest = rest.slice(whole.length);
    }

    return true;
}
