// The view against the canvas's size: a fit the reader has not moved is fitted again when the canvas takes another size — a window
// widened from a phone's to a desktop's, or a kept fit opened at a size it was not made for — while a view they panned, zoomed or
// centred stays where they left it.

import assert from "node:assert/strict";
import test from "node:test";
import type { ClientStore, PluginEngineContext } from "ne-standard-ui";
import { FakeElement, real } from "./fake-dom.ts";
import type { CanvasViewHost } from "../src/canvas/canvas-view.ts";
import { CanvasView } from "../src/canvas/canvas-view.ts";
import type { CanvasSettings } from "../src/canvas/canvas-settings.ts";

const Sheet = { x: 0, y: 0, width: 1200, height: 300 };

type Stage = {
    view: CanvasView;
    viewport: FakeElement;
    resize(width: number, height: number): void;
    stored(): string | null;
    watching(): boolean;
};

/** A canvas of one wide node in a viewport of the given size, its size watch and its store in the test's hands. */
function stage(width: number, height: number, kept: string | null = null): Stage {
    const viewport = FakeElement.of("ui-graph__viewport").append(FakeElement.of("ui-graph__scene"));
    const root = FakeElement.of("ui-graph").append(viewport);
    let stored = kept;
    let resized: (() => void) | null = null;

    viewport.rect = { left: 0, top: 0, width, height };

    const store = real<ClientStore>({
        readJson: (): unknown => (stored === null ? null : (JSON.parse(stored) as unknown)),
        write: (_root: unknown, _slot: string, value: string | null) => {
            stored = value;
        }
    });
    const context = real<PluginEngineContext>({
        store,
        names: { collapsed: "data-ui-collapsed" },
        observeSize: (_element: unknown, handler: () => void) => {
            resized = handler;

            return () => {
                resized = null;
            };
        }
    });
    const host: CanvasViewHost = {
        items: () => [{ id: "a", x: Sheet.x, y: Sheet.y }],
        groups: () => [],
        itemColor: () => "",
        nodeRect: () => Sheet,
        nodeExtent: () => Sheet
    };
    const view = new CanvasView(real(root), real<CanvasSettings>({ minZoom: 0.1, maxZoom: 2.5 }), context, host);

    return {
        view,
        viewport,
        resize(nextWidth: number, nextHeight: number): void {
            viewport.rect = { left: 0, top: 0, width: nextWidth, height: nextHeight };
            resized?.();
        },
        stored: () => stored,
        watching: () => resized !== null
    };
}

/** Whether the kept view says it is a fit. */
function keptFitted(stored: string | null): boolean | undefined {
    return stored === null ? undefined : (JSON.parse(stored) as { fitted?: boolean }).fitted;
}

function place(view: CanvasView): { zoom: number; panX: number; panY: number } {
    return { zoom: view.zoom, panX: view.panX, panY: view.panY };
}

/** Where a fresh fit at that size puts the sheet. */
function fittedAt(width: number, height: number): { zoom: number; panX: number; panY: number } {
    const fresh = stage(width, height);

    fresh.view.fit();
    fresh.view.dispose();

    return place(fresh.view);
}

test("a fit the reader has not moved is fitted again when the canvas takes another size", () => {
    const canvas = stage(390, 600);

    canvas.view.fit();
    assert.deepEqual(place(canvas.view), fittedAt(390, 600));

    canvas.resize(1366, 600);
    assert.deepEqual(place(canvas.view), fittedAt(1366, 600));
    assert.equal(canvas.view.showsAnyItem(), true);

    canvas.view.dispose();
});

test("a view the reader panned, zoomed or centred stays as they left it when the canvas takes another size", () => {
    const moves: [string, (view: CanvasView) => void][] = [
        ["pan", view => view.dragPan({ x: view.panX, y: view.panY }, 40, 0)],
        ["zoom", view => view.zoomBy(1.2, 100, 100)],
        ["centre", view => view.centerOnRect({ x: 1100, y: 0, width: 100, height: 100 }, 0, 0)]
    ];

    for (const [name, move] of moves) {
        const canvas = stage(390, 600);

        canvas.view.fit();
        move(canvas.view);

        const left = place(canvas.view);

        canvas.resize(1366, 600);
        assert.deepEqual(place(canvas.view), left, name);

        canvas.view.dispose();
    }
});

test("a pan that has not moved yet leaves the fit fitted", () => {
    const canvas = stage(390, 600);

    canvas.view.fit();
    canvas.view.dragPan({ x: canvas.view.panX, y: canvas.view.panY }, 0, 0);
    canvas.resize(1366, 600);
    assert.deepEqual(place(canvas.view), fittedAt(1366, 600));

    canvas.view.dispose();
});

test("a kept fit opens where it was kept and follows the canvas from there; a kept view the reader moved stays", () => {
    const keptFit = stage(1366, 600, JSON.stringify({ zoom: 0.5, panX: 10, panY: 20, fitted: true }));

    keptFit.view.restoreView();
    keptFit.resize(1366, 600);
    assert.deepEqual(place(keptFit.view), { zoom: 0.5, panX: 10, panY: 20 });

    keptFit.resize(390, 600);
    assert.deepEqual(place(keptFit.view), fittedAt(390, 600));
    keptFit.view.dispose();

    const keptMove = stage(1366, 600, JSON.stringify({ zoom: 0.5, panX: 10, panY: 20 }));

    keptMove.view.restoreView();
    keptMove.resize(390, 600);
    assert.deepEqual(place(keptMove.view), { zoom: 0.5, panX: 10, panY: 20 });
    keptMove.view.dispose();
});

test("a kept fit on a canvas drawn hidden stands at the size it is first shown at", () => {
    const canvas = stage(0, 0, JSON.stringify({ zoom: 0.5, panX: 10, panY: 20, fitted: true }));

    canvas.view.restoreView();
    canvas.resize(1366, 600);
    assert.deepEqual(place(canvas.view), { zoom: 0.5, panX: 10, panY: 20 });

    canvas.resize(390, 600);
    assert.deepEqual(place(canvas.view), fittedAt(390, 600));

    canvas.view.dispose();
});

test("a kept fit opened at another size than it was made for is fitted again; at its own it stands where it was kept", () => {
    const phone = stage(390, 600, JSON.stringify({ zoom: 0.5, panX: 10, panY: 20, fitted: true, width: 1366, height: 600 }));

    phone.view.restoreView();
    phone.resize(390, 600);
    assert.deepEqual(place(phone.view), fittedAt(390, 600));
    phone.view.dispose();

    const same = stage(1366, 600, JSON.stringify({ zoom: 0.5, panX: 10, panY: 20, fitted: true, width: 1366, height: 600 }));

    same.view.restoreView();
    same.resize(1366, 600);
    assert.deepEqual(place(same.view), { zoom: 0.5, panX: 10, panY: 20 });
    same.view.dispose();
});

test("the view keeps whether it is a fit and the size it was made for, and lets go of the size watch with the canvas", async () => {
    const canvas = stage(390, 600);

    canvas.view.fit();
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(keptFitted(canvas.stored()), true);
    const kept = JSON.parse(canvas.stored() ?? "{}") as { width?: number; height?: number };

    assert.deepEqual([kept.width, kept.height], [390, 600]);

    canvas.view.zoomBy(1.2, 100, 100);
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(keptFitted(canvas.stored()), false);

    assert.equal(canvas.watching(), true);
    canvas.view.dispose();
    assert.equal(canvas.watching(), false);
});

test("a canvas whose root came back on the page watches its size again and refits its fit to it", () => {
    const canvas = stage(390, 600);

    canvas.view.fit();
    canvas.view.dispose();
    canvas.view.watchSize();
    assert.equal(canvas.watching(), true);

    canvas.resize(1366, 600);
    assert.deepEqual(place(canvas.view), fittedAt(1366, 600));

    canvas.view.dispose();
    assert.equal(canvas.watching(), false);
});

test("the grid draws its minor and major lines on whole pixels and drops the minor ones once zoomed out past the floor", () => {
    const minor = FakeElement.of("ui-graph__grid-minor", {}, "path");
    const major = FakeElement.of("ui-graph__grid-major", {}, "path");
    const grid = FakeElement.of("ui-graph__grid").append(FakeElement.of("ui-graph__grid-lines", {}, "svg").append(minor, major));
    const viewport = FakeElement.of("ui-graph__viewport").append(grid, FakeElement.of("ui-graph__scene"));
    const root = FakeElement.of("ui-graph").append(viewport);

    viewport.rect = { left: 0, top: 0, width: 160, height: 96 };

    const store = real<ClientStore>({ readJson: () => null, write: () => {} });
    const context = real<PluginEngineContext>({ store, observeSize: () => () => {} });
    const host: CanvasViewHost = { items: () => [], groups: () => [], itemColor: () => "", nodeRect: () => null, nodeExtent: () => null };
    const view = new CanvasView(real(root), real<CanvasSettings>({ gridSize: 32, minZoom: 0.1, maxZoom: 2.5 }), context, host);

    view.applyView();
    assert.equal(grid.getAttribute("data-ui-graph-grid-drawn"), "");
    // At zoom 1 in 160x96: columns 0 and 4 (x = 0.5 and 128.5) and row 0 (y = 0.5) are major; columns 1..3, 5 and rows 1..3 are minor.
    assert.equal(major.getAttribute("d"), "M0.5 0V96M128.5 0V96M0 0.5H160");
    assert.equal(minor.getAttribute("d"), "M32.5 0V96M64.5 0V96M96.5 0V96M160.5 0V96M0 32.5H160M0 64.5H160M0 96.5H160");

    // Past the minor floor (0.16), only major lines are drawn.
    view.zoomBy(0.14, 0, 0);
    assert.equal(minor.getAttribute("d"), "");
    assert.match(major.getAttribute("d") ?? "", /^M0\.5 0V96/);

    view.dispose();
});
