// The path an edge takes between two ends, in the canvas's three edge shapes, plus a backward edge's arc and an arrow's head —
// pure, so shapes are pinned by tests. Every path is worked out left-to-right; a vertical edge swaps x and y in and back out, so
// one set of rules draws both axes.

import type { Point } from "./canvas-model.ts";
import { LeastRun } from "./lanes.ts";

export type EdgeShape = "bezier" | "straight" | "orthogonal";

/** Which way an edge leaves its start and enters its end: sideways, or up and down. */
export type EdgeAxis = "horizontal" | "vertical";

export type Rect = { x: number; y: number; width: number; height: number };

/** One step of a path: a move, a line or a curve, with its points. */
type Command = { readonly op: "M" | "L" | "C"; readonly points: readonly Point[] };

export type EdgeDrawing = {
    /** The SVG path of the edge. */
    readonly path: string;
    /** The SVG path of the arrow's head at the end, when one was asked for. */
    readonly arrow: string | null;
};

export type EdgeDrawingOptions = {
    readonly axis?: EdgeAxis;
    /** An edge running against the layers: drawn as an arc beside the two ends rather than a curve through the nodes between them. */
    readonly back?: boolean;
    readonly arrow?: boolean;
    /** The edge runs towards the axis's start (layers running right-to-left or bottom-to-top), so it's drawn as the mirror of one running towards the end. */
    readonly reversed?: boolean;
    /** Where each leg of a stepped edge turns, along the axis; a leg with none turns half way. */
    readonly turns?: readonly (number | undefined)[];
};

/** How close to either end a stepped leg may turn: the arrow's head and a little more. */
const TurnRoom = 12;

/** How long an arrow's head is along the edge, and how wide at its base. */
const ArrowLength = 9;
const ArrowWidth = 7;

/** The SVG path of an edge leaving `from` rightwards and entering `to` leftwards, through the reroute points between them. */
export function edgePath(shape: EdgeShape, from: Point, to: Point, points: readonly Point[] = []): string {
    return drawEdge(shape, from, to, points).path;
}

/** An edge along its axis, through its reroute points, with its arrow's head when one is asked for. */
export function drawEdge(shape: EdgeShape, from: Point, to: Point, points: readonly Point[] = [], options: EdgeDrawingOptions = {}): EdgeDrawing {
    // Every shape is computed for a rightward edge; a downward edge is turned and a start-facing edge mirrored, on the way in and
    // back out — unmirrored, a stepped leftward edge would jog around both ends as if every leg ran backward.
    const vertical = options.axis === "vertical";
    const sign = options.reversed === true ? -1 : 1;
    const turn = (point: Point): Point => (vertical ? { x: point.y * sign, y: point.x } : { x: point.x * sign, y: point.y });
    const back = (point: Point): Point => (vertical ? { x: point.y, y: point.x * sign } : { x: point.x * sign, y: point.y });
    const stops = [from, ...points, to].map(turn);

    // A backward edge with no points of the viewer's own arcs beside the ends; one the viewer bent follows the points instead.
    const commands = options.back === true && points.length === 0
        ? arcCommands(stops[0], stops[1])
        : shape === "straight"
            ? straightCommands(stops)
            : shape === "orthogonal"
                ? orthogonalCommands(stops, (options.turns ?? []).map(at => (at === undefined ? undefined : at * sign)))
                : bezierCommands(stops);

    const turned = commands.map(command => ({ op: command.op, points: command.points.map(back) }));

    return { path: format(turned), arrow: options.arrow === true ? arrowHead(turned) : null };
}

function format(commands: readonly Command[]): string {
    return commands.map(command => `${command.op}${command.points.map(point => `${round(point.x)},${round(point.y)}`).join(" ")}`).join(" ");
}

function straightCommands(stops: readonly Point[]): Command[] {
    return stops.map((stop, index) => ({ op: index === 0 ? "M" : "L", points: [stop] }));
}

/** A curve leaving each stop sideways; handle reach follows the gap so a short edge doesn't loop, and a backward stop gets a wider reach to draw the loop back. */
function bezierCommands(stops: readonly Point[]): Command[] {
    const commands: Command[] = [{ op: "M", points: [stops[0]] }];

    for (let index = 1; index < stops.length; index++) {
        const start = stops[index - 1];
        const end = stops[index];
        const reach = handleReach(start, end);

        commands.push({ op: "C", points: [{ x: start.x + reach, y: start.y }, { x: end.x - reach, y: end.y }, end] });
    }

    return commands;
}

function handleReach(start: Point, end: Point): number {
    const gap = end.x - start.x;

    return gap >= 0 ? Math.min(Math.max(gap * 0.5, 24), 160) : Math.min(Math.max(-gap * 0.6 + 40, 60), 220);
}

/** Horizontal/vertical runs; each leg turns where told (a layered sheet's lane) or half way, and a backward leg turns outside both pins. */
function orthogonalCommands(stops: readonly Point[], turns: readonly (number | undefined)[]): Command[] {
    const commands: Command[] = [{ op: "M", points: [stops[0]] }];
    const line = (x: number, y: number): void => {
        commands.push({ op: "L", points: [{ x: round(x), y: round(y) }] });
    };

    for (let index = 1; index < stops.length; index++) {
        const start = stops[index - 1];
        const end = stops[index];

        if (end.x - start.x >= LeastRun) {
            const middle = Math.min(end.x - TurnRoom, Math.max(start.x + TurnRoom, turns[index - 1] ?? (start.x + end.x) / 2));

            line(middle, start.y);
            line(middle, end.y);
            line(end.x, end.y);
        }
        else {
            const out = start.x + 24;
            const back = end.x - 24;
            const middle = (start.y + end.y) / 2;

            line(out, start.y);
            line(out, middle);
            line(back, middle);
            line(back, end.y);
            line(end.x, end.y);
        }
    }

    return commands;
}

/** A backward edge's arc: a flat oval hugging the nodes, rising slightly more the further it spans, with handles leaning inward so it slants rather than looping straight up. */
function arcCommands(start: Point, end: Point): Command[] {
    const span = end.x - start.x;
    const lift = Math.min(96, 20 + Math.abs(span) * 0.1);
    const side = Math.min(start.y, end.y) - lift;
    const lean = span * 0.2;

    return [
        { op: "M", points: [start] },
        { op: "C", points: [{ x: start.x + lean, y: side }, { x: end.x - lean, y: side }, end] }
    ];
}

/** A closed triangle at the path's end, pointing the way the last step arrives. */
function arrowHead(commands: readonly Command[]): string | null {
    const last = commands[commands.length - 1];
    const end = last.points[last.points.length - 1];
    const before = last.points.length > 1
        ? last.points[last.points.length - 2]
        : commands.length > 1 ? commands[commands.length - 2].points[commands[commands.length - 2].points.length - 1] : null;

    if (before === null)
        return null;

    const dx = end.x - before.x;
    const dy = end.y - before.y;
    const length = Math.hypot(dx, dy);

    if (length === 0)
        return null;

    const ux = dx / length;
    const uy = dy / length;
    const baseX = end.x - ux * ArrowLength;
    const baseY = end.y - uy * ArrowLength;
    const half = ArrowWidth / 2;

    return `M${round(end.x)},${round(end.y)} L${round(baseX - uy * half)},${round(baseY + ux * half)} L${round(baseX + uy * half)},${round(baseY - ux * half)} Z`;
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

/** The smallest rectangle holding every one of the given ones, or null when there are none. */
export function bounds(rects: readonly Rect[]): Rect | null {
    if (rects.length === 0)
        return null;

    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;

    for (const rect of rects) {
        left = Math.min(left, rect.x);
        top = Math.min(top, rect.y);
        right = Math.max(right, rect.x + rect.width);
        bottom = Math.max(bottom, rect.y + rect.height);
    }

    return { x: left, y: top, width: right - left, height: bottom - top };
}

export function intersects(left: Rect, right: Rect): boolean {
    return left.x < right.x + right.width && left.x + left.width > right.x && left.y < right.y + right.height && left.y + left.height > right.y;
}

export function contains(outer: Rect, inner: Rect): boolean {
    return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
}

/** The zoom and pan that put `content` in the middle of a viewport of `width` by `height`, with room around it. */
export function fitView(content: Rect, width: number, height: number, minZoom: number, maxZoom: number, padding = 48): { zoom: number; panX: number; panY: number } {
    if (content.width <= 0 || content.height <= 0 || width <= 0 || height <= 0)
        return { zoom: 1, panX: 0, panY: 0 };

    const zoom = Math.min(maxZoom, Math.max(minZoom, Math.min((width - padding * 2) / content.width, (height - padding * 2) / content.height)));

    return {
        zoom,
        panX: width / 2 - (content.x + content.width / 2) * zoom,
        panY: height / 2 - (content.y + content.height / 2) * zoom
    };
}

/** How far one wheel line and one wheel page go, in pixels, for a wheel that counts in those rather than in pixels. */
const WheelLine = 33;
const WheelPage = 400;
/** The pixels of a mouse's one notch, which zoom by a tenth; a turn is held to three notches, however far a flick throws it. */
const WheelNotch = 100;
const WheelMost = 300;

/**
 * How much one wheel event zooms: continuously by how far it turned, so a trackpad's many small steps and a mouse's one notch come
 * to the same zoom for the same distance; a turn that is mostly sideways — a swipe across, Shift and the wheel — zooms nothing.
 */
export function wheelZoom(deltaX: number, deltaY: number, deltaMode: number): number {
    const scale = deltaMode === 1 ? WheelLine : deltaMode === 2 ? WheelPage : 1;
    const pixels = deltaY * scale;

    if (!Number.isFinite(pixels) || Math.abs(pixels) < 0.5 || Math.abs(deltaX) > Math.abs(deltaY))
        return 1;

    return Math.exp((-Math.max(-WheelMost, Math.min(WheelMost, pixels)) * Math.log(1.1)) / WheelNotch);
}

/** A value rounded to the grid's step, or left alone when the canvas does not snap. */
export function snap(value: number, step: number, snapping: boolean): number {
    return snapping && step > 0 ? Math.round(value / step) * step : value;
}

/** How far a point lies from a segment: what a reroute point dropped on an edge is placed by. */
export function distanceToSegment(point: Point, start: Point, end: Point): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = dx * dx + dy * dy;

    if (length === 0)
        return Math.hypot(point.x - start.x, point.y - start.y);

    const along = Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length));

    return Math.hypot(point.x - (start.x + along * dx), point.y - (start.y + along * dy));
}

/** Where a drawn path is half way along its length: an edge's label stands there, and a field opened on the edge. */
export function pathMiddle(path: SVGPathElement): Point {
    const point = path.getPointAtLength(path.getTotalLength() / 2);

    return { x: point.x, y: point.y };
}
