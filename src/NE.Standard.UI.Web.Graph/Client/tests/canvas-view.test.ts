// The view against the canvas's size: a fit the reader has not moved is fitted again when the canvas takes another size — a window
// widened from a phone's to a desktop's, or a kept fit opened at a size it was not made for — while a view they panned, zoomed or
// centred stays where they left it.

import assert from "node:assert/strict";
import test from "node:test";
import type { ClientStore, PluginEngineContext } from "ne-standard-ui";
import { FakeElement, real } from "./fake-dom.ts";
import type { CanvasViewHost } from "../src/canvas/canvas-view.ts";
import { CameraTransitionMs, CanvasView } from "../src/canvas/canvas-view.ts";
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
    const handlers = new Set<() => void>();

    root.rect = { left: 0, top: 0, width, height };
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
            handlers.add(handler);

            return () => {
                handlers.delete(handler);
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
            root.rect = { left: 0, top: 0, width: nextWidth, height: nextHeight };
            viewport.rect = { left: 0, top: 0, width: nextWidth, height: nextHeight };

            for (const handler of [...handlers])
                handler();
        },
        stored: () => stored,
        watching: () => handlers.size > 0
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
    const context = real<PluginEngineContext>({ store, names: { collapsed: "data-ui-collapsed" }, observeSize: () => () => {} });
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

test("a hidden canvas disposed before it is shown still fits its sheet once revived and sized", () => {
    const canvas = stage(0, 0);

    canvas.view.fitSheet();
    canvas.view.dispose();
    canvas.view.watchSize();
    canvas.resize(1366, 600);

    assert.deepEqual(place(canvas.view), fittedAt(1366, 600));
    canvas.view.dispose();
});

test("dragPan translates an overscanned SVG grid layer on whole pixels without rebuilding path geometry until overscan runs out (#309)", () => {
    const minor = FakeElement.of("ui-graph__grid-minor", {}, "path");
    const major = FakeElement.of("ui-graph__grid-major", {}, "path");
    const lines = FakeElement.of("ui-graph__grid-lines", {}, "svg").append(minor, major);
    const grid = FakeElement.of("ui-graph__grid").append(lines);
    const viewport = FakeElement.of("ui-graph__viewport").append(grid, FakeElement.of("ui-graph__scene"));
    const root = FakeElement.of("ui-graph").append(viewport);

    viewport.rect = { left: 0, top: 0, width: 160, height: 96 };

    const store = real<ClientStore>({ readJson: () => null, write: () => {} });
    const context = real<PluginEngineContext>({ store, names: { collapsed: "data-ui-collapsed" }, observeSize: () => () => {} });
    const host: CanvasViewHost = { items: () => [], groups: () => [], itemColor: () => "", nodeRect: () => null, nodeExtent: () => null };
    const view = new CanvasView(real(root), real<CanvasSettings>({ gridSize: 32, minZoom: 0.1, maxZoom: 2.5 }), context, host);

    view.applyView();

    let dWrites = 0;
    const baseSetAttribute = major.setAttribute.bind(major);
    major.setAttribute = (name: string, value: string): void => {
        if (name === "d")
            dWrites++;

        baseSetAttribute(name, value);
    };

    // First pan frame anchors the overscanned grid once (`dWrites === 1`), and subsequent moves within 256px only translate `<svg>` in 2D.
    view.dragPan({ x: 0, y: 0 }, 24, -12);
    assert.equal(dWrites, 1);
    assert.equal(lines.style.transform, "translate(0px, 0px)");

    view.dragPan({ x: 0, y: 0 }, 64, -40);
    assert.equal(dWrites, 1);
    assert.equal(lines.style.transform, "translate(40px, -28px)");

    // Crossing the 256px overscan margin re-anchors the SVG paths once and resets the layer translation to 0.
    view.dragPan({ x: 0, y: 0 }, 320, -40);
    assert.equal(dWrites, 2);
    assert.equal(lines.style.transform, "translate(0px, 0px)");

    // Ending the gesture settles the SVG grid back to exact viewport bounds with no leftover transform.
    view.dragPan({ x: 0, y: 0 }, 340, -50);
    assert.equal(lines.style.transform, "translate(20px, -10px)");
    view.endGesture();
    assert.equal(dWrites, 3);
    assert.equal(lines.style.transform, "");

    // Zooming also resets any active overscan translation back to exact viewport bounds.
    view.dragPan({ x: 0, y: 0 }, 360, -60);
    assert.equal(dWrites, 4);
    view.zoomBy(1.2, 80, 48);
    assert.equal(lines.style.transform, "");

    view.dispose();
});

test("camera transitions interpolate over 160 ms on Fit, zoom buttons and go-to-node, compose consecutive zooms, honour reduced motion, and cancel on gestures", () => {
    const globals = globalThis as {
        requestAnimationFrame?: (callback: FrameRequestCallback) => number;
        cancelAnimationFrame?: (handle: number) => void;
        matchMedia?: (query: string) => { matches: boolean };
    };
    const previousRaf = globals.requestAnimationFrame;
    const previousCancel = globals.cancelAnimationFrame;
    const previousMatchMedia = globals.matchMedia;

    let nextHandle = 0;
    let reducedMotion = false;
    const frames = new Map<number, FrameRequestCallback>();

    const stepFrame = (timestamp: number): void => {
        const pending = [...frames.entries()];
        frames.clear();

        for (const [, callback] of pending)
            callback(timestamp);
    };

    const expectedFit = fittedAt(1366, 600);

    globals.requestAnimationFrame = callback => {
        const handle = ++nextHandle;
        frames.set(handle, callback);
        return handle;
    };
    globals.cancelAnimationFrame = handle => {
        frames.delete(handle);
    };
    globals.matchMedia = query => ({ matches: reducedMotion && query === "(prefers-reduced-motion: reduce)" });

    try {
        assert.equal(CameraTransitionMs, 160);

        const canvas = stage(1366, 600);

        // Initial `fitSheet()` snaps synchronously with no queued rAF transition.
        canvas.view.fitSheet();
        assert.equal(frames.size, 0);
        assert.deepEqual(place(canvas.view), expectedFit);

        // Animated zoom `+` (`zoomBy(..., true)`) interpolates across frames and composes rapid `+` clicks against the in-flight target.
        const startZoom = canvas.view.zoom;
        canvas.view.zoomBy(1.2, 683, 300, true);
        assert.equal(frames.size, 1);
        assert.equal(canvas.view.zoom, startZoom);

        stepFrame(1000);
        stepFrame(1040);
        assert.ok(canvas.view.zoom > startZoom && canvas.view.zoom < startZoom * 1.2);

        // Second `+` mid-flight composes onto `startZoom * 1.2` -> `startZoom * 1.44`.
        canvas.view.zoomBy(1.2, 683, 300, true);
        stepFrame(2000);
        stepFrame(2000 + CameraTransitionMs);
        assert.ok(Math.abs(canvas.view.zoom - startZoom * 1.44) < 1e-9);
        assert.equal(frames.size, 0);

        // `centerOnRect` (go-to-node) eases out over 160 ms.
        const beforePanX = canvas.view.panX;
        canvas.view.centerOnRect({ x: 800, y: 100, width: 100, height: 80 }, 0, 0);
        assert.equal(frames.size, 1);
        stepFrame(3000);
        stepFrame(3080);
        assert.notEqual(canvas.view.panX, beforePanX);
        stepFrame(3000 + CameraTransitionMs);
        assert.equal(frames.size, 0);

        // Pointer gesture, pan, wheel zoom, pinch, and dispose each cancel an active transition immediately.
        canvas.view.fit();
        stepFrame(4000);
        stepFrame(4040);
        const midZoom = canvas.view.zoom;
        canvas.view.beginGesture();
        assert.equal(frames.size, 0);
        assert.equal(canvas.view.zoom, midZoom);

        canvas.view.fit();
        assert.equal(frames.size, 1);
        canvas.view.zoomBy(0.9, 200, 200, false);
        assert.equal(frames.size, 0);

        canvas.view.fit();
        assert.equal(frames.size, 1);
        canvas.view.pinchTo({ zoom: 0.8, panX: 12, panY: 16 });
        assert.equal(frames.size, 0);
        assert.deepEqual(place(canvas.view), { zoom: 0.8, panX: 12, panY: 16 });

        // `prefers-reduced-motion: reduce` snaps `fit()`, `zoomBy(..., true)` and `centerOnRect()` synchronously.
        reducedMotion = true;
        canvas.view.fit();
        assert.equal(frames.size, 0);
        assert.deepEqual(place(canvas.view), expectedFit);

        canvas.view.dispose();
    }
    finally {
        globals.requestAnimationFrame = previousRaf;
        globals.cancelAnimationFrame = previousCancel;
        globals.matchMedia = previousMatchMedia;
    }
});

test("pinchTo transforms an overscanned SVG grid in 2D without rebuilding paths per frame and defers keepView timer churn until endGesture", async () => {
    const minor = FakeElement.of("ui-graph__grid-minor", {}, "path");
    const major = FakeElement.of("ui-graph__grid-major", {}, "path");
    const lines = FakeElement.of("ui-graph__grid-lines", {}, "svg").append(minor, major);
    const grid = FakeElement.of("ui-graph__grid").append(lines);
    const viewport = FakeElement.of("ui-graph__viewport").append(grid, FakeElement.of("ui-graph__scene"));
    const root = FakeElement.of("ui-graph").append(viewport);

    viewport.rect = { left: 0, top: 0, width: 320, height: 240 };

    let writes = 0;
    const store = real<ClientStore>({
        readJson: () => null,
        write: () => {
            writes++;
        }
    });
    const context = real<PluginEngineContext>({ store, names: { collapsed: "data-ui-collapsed" }, observeSize: () => () => {} });
    const host: CanvasViewHost = { items: () => [], groups: () => [], itemColor: () => "", nodeRect: () => null, nodeExtent: () => null };
    const view = new CanvasView(real(root), real<CanvasSettings>({ gridSize: 32, minZoom: 0.1, maxZoom: 2.5 }), context, host);

    view.applyView();

    let dWrites = 0;
    const baseSetAttribute = major.setAttribute.bind(major);
    major.setAttribute = (name: string, value: string): void => {
        if (name === "d")
            dWrites++;

        baseSetAttribute(name, value);
    };

    view.beginGesture();
    view.pinchTo({ zoom: 1.2, panX: -16, panY: -10 });
    assert.equal(dWrites, 1);
    assert.equal(lines.style.transformOrigin, "0 0");
    assert.match(String(lines.style.transform), /^translate\(.+\) scale\(1\)$/);

    view.pinchTo({ zoom: 1.5, panX: -28, panY: -18 });
    assert.equal(dWrites, 1);
    assert.match(String(lines.style.transform), /^translate\(.+\) scale\(1\.25\)$/);

    view.endGesture();
    assert.equal(dWrites, 2);
    assert.equal(lines.style.transform, "");
    assert.equal(lines.style.transformOrigin, "");

    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(writes, 1);

    view.dispose();
});
