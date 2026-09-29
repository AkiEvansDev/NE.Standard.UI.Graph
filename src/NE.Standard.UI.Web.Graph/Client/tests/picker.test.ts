// The picker over a stand-in DOM: the rail's tree keys, the Tab that goes round the modal, a press that keeps the typing in the
// search, and where the keyboard lands once the dialog closes.

import assert from "node:assert/strict";
import test from "node:test";
import type { Icons, RovingFocus, RovingRequest } from "ne-standard-ui";
import { FakeDialog, FakeElement, FakeEvent, FakeInput, FakeKeyboardEvent, fakeDocument, installFakeDom, real } from "./fake-dom.ts";
import { Picker } from "../src/canvas/picker.ts";
import type { PickerEntry } from "../src/canvas/picker.ts";

installFakeDom();

const Kinds: readonly PickerEntry[] = [
    { key: "sum", title: "Sum", category: "Maths" },
    { key: "round", title: "Round", category: "Maths/Rounding" },
    { key: "join", title: "Join", category: "Text" }
];

/** Up and Down by one, stopping at the ends where the list does not wrap; Home and End; an unknown current enters at the near end. */
const roving: RovingFocus = {
    target(request: RovingRequest): HTMLElement | null {
        const { key, items, current } = request;
        const at = current === null ? -1 : items.indexOf(current);
        const loop = request.loop ?? true;

        if (key === "Home")
            return items[0] ?? null;

        if (key === "End")
            return items.at(-1) ?? null;

        if (key === "ArrowDown")
            return at < 0 ? items[0] ?? null : items[at + 1] ?? (loop ? items[0] ?? null : null);

        if (key === "ArrowUp")
            return at < 0 ? items.at(-1) ?? null : items[at - 1] ?? (loop ? items.at(-1) ?? null : null);

        return null;
    },
    applyTabIndex(items: readonly HTMLElement[], active: HTMLElement | null): void {
        for (const item of items)
            item.tabIndex = item === active ? 0 : -1;
    }
};

const icons: Icons = { apply: () => undefined };

type Scene = {
    readonly picker: Picker<PickerEntry>;
    readonly viewport: FakeElement;
    readonly opener: FakeElement;
    readonly dialog: FakeDialog;
    readonly search: FakeInput;
    readonly rail: FakeElement;
    readonly list: FakeElement;
    readonly chosen: PickerEntry[];
};

function scene(): Scene {
    const viewport = FakeElement.of("ui-graph__viewport", { tabindex: "0" });
    const opener = FakeElement.of("ui-menu-item", {}, "button");
    const dialog = new FakeDialog();
    const search = new FakeInput();
    const rail = FakeElement.of("ui-graph__picker-rail", { "data-ui-graph-picker-rail": "", role: "tree" });
    const list = FakeElement.of("ui-graph__picker-list", { "data-ui-graph-picker-list": "", role: "listbox" });
    const chosen: PickerEntry[] = [];
    let ids = 0;

    dialog.setAttribute("data-ui-graph-picker", "");
    dialog.append(
        FakeElement.of("ui-graph__picker-search", { "data-ui-graph-picker-search": "" }).append(search),
        FakeElement.of("ui-graph__picker-main").append(rail, list, FakeElement.of("", { "data-ui-graph-picker-empty": "" }))
    );

    fakeDocument.body.children.length = 0;
    fakeDocument.body.append(FakeElement.of("ui-graph").append(viewport, opener, dialog));

    const ensureId = (element: Element, prefix: string): string => {
        if (element.id.length === 0)
            element.id = `${prefix}-${++ids}`;

        return element.id;
    };
    const picker = Picker.create(real(fakeDocument.body.children[0]), () => Kinds, { text: key => key }, { ensureId }, icons, roving, entry => chosen.push(entry));

    assert.ok(picker !== null);

    return { picker, viewport, opener, dialog, search, rail, list, chosen };
}

function opened(): Scene {
    const page = scene();

    page.opener.focus();
    page.picker.open();

    return page;
}

function key(name: string, target: FakeElement | null = fakeDocument.activeElement, shift = false): FakeKeyboardEvent {
    const event = new FakeKeyboardEvent(name, target, shift);

    target?.dispatchEvent(event);

    return event;
}

function press(target: FakeElement): FakeEvent {
    const event = new FakeEvent("mousedown");

    target.dispatchEvent(event);

    return event;
}

function click(target: FakeElement, detail: number): void {
    target.dispatchEvent(Object.assign(new FakeEvent("click"), { detail }));
}

function category(page: Scene, path: string): FakeElement | undefined {
    return page.rail.children.find(entry => entry.getAttribute("data-ui-graph-category") === path);
}

function entries(page: Scene): string[] {
    return page.list.children.map(entry => entry.getAttribute("data-ui-graph-kind") ?? "");
}

test("the picker opens on its search, the rail one Tab stop on every category", () => {
    const page = opened();

    assert.equal(fakeDocument.activeElement, page.search);
    assert.deepEqual(page.rail.children.map(entry => entry.getAttribute("data-ui-graph-category")), ["/", "Maths", "Text"]);
    assert.deepEqual(page.rail.children.map(entry => entry.tabIndex), [0, -1, -1]);
    assert.deepEqual(entries(page), ["sum", "round", "join"]);
});

test("Up and Down walk the rail, moving its one Tab stop without choosing", () => {
    const page = opened();

    category(page, "/")!.focus();
    key("ArrowDown");

    assert.equal(fakeDocument.activeElement, category(page, "Maths"));
    assert.deepEqual(page.rail.children.map(entry => entry.tabIndex), [-1, 0, -1]);
    assert.deepEqual(entries(page), ["sum", "round", "join"]);

    key("End");
    assert.equal(fakeDocument.activeElement, category(page, "Text"));
});

test("Right unfolds a category and then steps into it; Left steps out and then folds it", () => {
    const page = opened();
    const maths = category(page, "Maths")!;

    maths.focus();
    key("ArrowRight");

    assert.equal(maths.getAttribute("aria-expanded"), "true");
    assert.equal(fakeDocument.activeElement, maths, "the unfolded category keeps its element and the keyboard");
    assert.ok(category(page, "Maths/Rounding") !== undefined);

    key("ArrowRight");
    assert.equal(fakeDocument.activeElement, category(page, "Maths/Rounding"));
    assert.equal(category(page, "Maths/Rounding")!.getAttribute("aria-level"), "2");

    key("ArrowLeft");
    assert.equal(fakeDocument.activeElement, maths);

    key("ArrowLeft");
    assert.equal(maths.getAttribute("aria-expanded"), "false");
    assert.equal(category(page, "Maths/Rounding"), undefined);
});

test("Enter on a category chooses it and keeps the keyboard there; a pointer's press hands the keyboard to the search", () => {
    const page = opened();
    const text = category(page, "Text")!;

    text.focus();
    click(text, 0);

    assert.deepEqual(entries(page), ["join"]);
    assert.equal(text.getAttribute("aria-selected"), "true");
    assert.equal(fakeDocument.activeElement, text);

    click(category(page, "Maths")!, 1);

    assert.deepEqual(entries(page), ["sum", "round"]);
    assert.equal(fakeDocument.activeElement, page.search);
});

test("Tab past the last stop comes round to the search, and Shift+Tab past the search to the rail", () => {
    const page = opened();
    const stop = category(page, "/")!;

    stop.focus();
    const forward = key("Tab");

    assert.equal(forward.defaultPrevented, true);
    assert.equal(fakeDocument.activeElement, page.search);

    const back = key("Tab", page.search, true);

    assert.equal(back.defaultPrevented, true);
    assert.equal(fakeDocument.activeElement, stop);

    // Between the two ends the browser's own Tab moves on.
    page.search.focus();
    assert.equal(key("Tab").defaultPrevented, false);
});

test("a press on the list, an entry or the rail's empty room keeps the typing in the search", () => {
    const page = opened();

    assert.equal(press(page.list).defaultPrevented, true);
    assert.equal(fakeDocument.activeElement, page.search);

    assert.equal(press(page.list.children[1].children[0]).defaultPrevented, true);
    assert.equal(fakeDocument.activeElement, page.search);

    category(page, "Text")!.focus();
    assert.equal(press(page.rail).defaultPrevented, true);
    assert.equal(fakeDocument.activeElement, page.search, "a press on the rail's gap takes the keyboard back from a category");
});

test("a press on a category, the search or the backdrop is left to the browser", () => {
    const page = opened();

    assert.equal(press(category(page, "Maths")!).defaultPrevented, false);
    assert.equal(press(page.search).defaultPrevented, false);
    assert.equal(press(page.dialog).defaultPrevented, false);
});

test("an entry's click takes it, and the keyboard goes back to what opened the picker", () => {
    const page = opened();

    click(page.list.children[2], 1);

    assert.deepEqual(page.chosen.map(entry => entry.key), ["join"]);
    assert.equal(page.dialog.open, false);
    assert.equal(fakeDocument.activeElement, page.opener);
});

test("Enter in the search takes the current entry, the arrows moving it", () => {
    const page = opened();

    key("ArrowDown");
    key("Enter");

    assert.deepEqual(page.chosen.map(entry => entry.key), ["round"]);
    assert.equal(fakeDocument.activeElement, page.opener);
});

test("Escape closes the picker, and where what opened it is gone the canvas takes the keyboard", () => {
    const page = opened();

    page.opener.remove();
    key("Escape");

    assert.equal(page.dialog.open, false);
    assert.equal(fakeDocument.activeElement, page.viewport);
});
