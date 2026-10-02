// Two fingers on the sheet pinch it: they zoom around their midpoint and pan with its move, the zoom held to the wheel's limits.
// One finger stays the canvas's own press — a pan, a node's drag, a wire. Points are in the viewport's own pixels.

import type { Point } from "./canvas-model.ts";
import type { View } from "./geometry.ts";
import { pinchView } from "./geometry.ts";

type Pinch = {
    readonly fingers: readonly [number, number];
    readonly view: View;
    readonly mid: Point;
    readonly distance: number;
};

export class CanvasPinch {
    // Every finger down on the viewport and where it stands now.
    private readonly touches = new Map<number, Point>();
    private pinch: Pinch | null = null;

    public get pinching(): boolean {
        return this.pinch !== null;
    }

    /** A finger down; true when it is the second, and the two begin a pinch from the view as it stands. */
    public down(finger: number, at: Point, view: View): boolean {
        this.touches.set(finger, at);

        if (this.pinch !== null || this.touches.size !== 2)
            return false;

        const [first, second] = [...this.touches.keys()] as [number, number];
        const [a, b] = [this.touches.get(first)!, this.touches.get(second)!];

        this.pinch = { fingers: [first, second], view: { zoom: view.zoom, panX: view.panX, panY: view.panY }, mid: midpoint(a, b), distance: Math.hypot(b.x - a.x, b.y - a.y) };

        return true;
    }

    /** A finger moved; the view the pinch makes of it, or null where no pinch is under way or the finger is not one of its two. */
    public move(finger: number, at: Point, minZoom: number, maxZoom: number): View | null {
        if (!this.touches.has(finger))
            return null;

        this.touches.set(finger, at);

        const pinch = this.pinch;

        if (pinch === null || !pinch.fingers.includes(finger))
            return null;

        const a = this.touches.get(pinch.fingers[0])!;
        const b = this.touches.get(pinch.fingers[1])!;

        return pinchView(pinch.view, pinch.mid, pinch.distance, midpoint(a, b), Math.hypot(b.x - a.x, b.y - a.y), minZoom, maxZoom);
    }

    /**
     * A finger lifted or taken by the browser: whether it ended a pinch, and the finger left down and where it stands, for the canvas
     * to pan on from there.
     */
    public up(finger: number): { readonly ended: boolean; readonly left: Point | null } {
        this.touches.delete(finger);

        const pinch = this.pinch;

        if (pinch === null || !pinch.fingers.includes(finger))
            return { ended: false, left: null };

        this.pinch = null;

        const other = pinch.fingers[0] === finger ? pinch.fingers[1] : pinch.fingers[0];

        return { ended: true, left: this.touches.get(other) ?? null };
    }
}

function midpoint(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
