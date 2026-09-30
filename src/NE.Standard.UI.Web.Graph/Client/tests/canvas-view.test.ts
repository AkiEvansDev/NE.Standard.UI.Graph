// The view against the canvas's size: a fit the reader has not moved is fitted again when the canvas takes another size — a window
// widened from a phone's to a desktop's — while a view they panned, zoomed or centred stays where they left it.

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

test("the view keeps whether it is a fit, and lets go of the size watch with the canvas", async () => {
    const canvas = stage(390, 600);

    canvas.view.fit();
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(keptFitted(canvas.stored()), true);

    canvas.view.zoomBy(1.2, 100, 100);
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(keptFitted(canvas.stored()), false);

    assert.equal(canvas.watching(), true);
    canvas.view.dispose();
    assert.equal(canvas.watching(), false);
});
