// The path an edge takes in the canvas's three shapes, a backward edge's arc and an arrow's head — pure, so tests pin them. Paths
// are worked out left-to-right; a vertical edge swaps x and y in and out, so one set of rules draws both axes.

import type { WheelPixels } from "ne-standard-ui";
import type { Point } from "./canvas-model.ts";
import { LeastRun } from "./lanes.ts";

export type EdgeShape = "bezier" | "straight" | "orthogonal";

/** Which way an edge leaves its start and enters its end: sideways, or up and down. */
export type EdgeAxis = "horizontal" | "vertical";

export type Rect = { x: number; y: number; width: number; height: number };

/** One step of a path: a move, a line or a curve, with its points. */
type Command = { readonly op: "M" | "L" | "C"; readonly points: readonly Point[] };

export type EdgeDrawing = {
    /** The SVG path of the edge: what the pointer answers and a label is placed along, never painted. */
    readonly path: string;
    /**
     * The same edge as the straight pieces it is painted with (`edgePieces`), or null where every step runs along an axis — a
     * stepped edge — which the rasteriser draws crisp as a path, and whose corners pieces would only overlap at.
     */
    readonly pieces: readonly EdgePiece[] | null;
    /** The SVG path of the arrow's head at the end, when one was asked for. */
    readonly arrow: string | null;
};

/** One straight piece of a painted edge, and how far along the edge it starts — where a dashed edge's pattern picks up. */
type EdgePiece = {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    readonly along: number;
};

/** About how long a piece of a curved edge is, in canvas units: short enough that the pieces read as the curve. */
const CurvePiece = 4;

export type EdgeDrawingOptions = {
    readonly axis?: EdgeAxis;
    /** An edge running against the layers: drawn as an arc beside the two ends rather than a curve through the nodes between them. */
    readonly back?: boolean;
    /** A backward edge from a node to itself, its ends on the node's two sides: the arc rises clear over the node rather than beside the ends. */
    readonly loop?: boolean;
    readonly arrow?: boolean;
    /** The edge runs towards the axis's start (layers running right-to-left or bottom-to-top), so it's drawn as the mirror of one running towards the end. */
    readonly reversed?: boolean;
    /** Where each leg of a stepped edge turns, along the axis; a leg with none turns half way. */
    readonly turns?: readonly (number | undefined)[];
};

/** How close to either end a stepped leg may turn: the arrow's head and a little more. */
const TurnRoom = 12;

/** The furthest a backward arc's handles lean inward from its ends. */
const ArcLean = 64;
/** How far a node's edge to itself rises over its ends, and how far its handles reach out past the node's sides. */
const LoopLift = 56;
const LoopReach = 16;

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
        ? options.loop === true ? loopCommands(stops[0], stops[1]) : arcCommands(stops[0], stops[1])
        : shape === "straight"
            ? straightCommands(stops)
            : shape === "orthogonal"
                ? orthogonalCommands(stops, (options.turns ?? []).map(at => (at === undefined ? undefined : at * sign)))
                : bezierCommands(stops);

    const turned = commands.map(command => ({ op: command.op, points: command.points.map(back) }));

    return { path: format(turned), pieces: alongAxes(turned) ? null : edgePieces(turned), arrow: options.arrow === true ? arrowHead(turned) : null };
}

/** Whether every step of the path runs straight across or straight down, with no curve and no slant. */
function alongAxes(commands: readonly Command[]): boolean {
    let at: Point | null = null;

    for (const command of commands) {
        const to = command.points[command.points.length - 1];

        if (command.op === "C" || (command.op === "L" && at !== null && at.x !== to.x && at.y !== to.y))
            return false;

        at = to;
    }

    return true;
}

function format(commands: readonly Command[]): string {
    return commands.map(command => `${command.op}${command.points.map(point => `${round(point.x)},${round(point.y)}`).join(" ")}`).join(" ");
}

/**
 * The path as the straight pieces it is painted with: Chrome's GPU rasteriser draws a slanted or curved path as a staircase (four
 * samples a pixel) but a lone line smoothly, as the charts' lines rely on (docs/DECISIONS.md). A curve is cut at even parameter
 * steps, one per `CurvePiece` of its handles' length.
 */
function edgePieces(commands: readonly Command[]): EdgePiece[] {
    const pieces: EdgePiece[] = [];
    let at: Point | null = null;

    for (const command of commands) {
        if (command.op === "M") {
            at = command.points[0];
            continue;
        }

        const stops = command.op === "C" && at !== null ? curveStops(at, command.points) : [command.points[command.points.length - 1]];

        for (const stop of stops) {
            if (at !== null)
                addPiece(pieces, at, stop);

            at = stop;
        }
    }

    return pieces;
}

/** The places a cubic from `start` through its two handles to its end is cut at: even steps of its parameter, the end last. */
function curveStops(start: Point, [first, second, end]: readonly Point[]): Point[] {
    const reach = Math.hypot(first.x - start.x, first.y - start.y) + Math.hypot(second.x - first.x, second.y - first.y) + Math.hypot(end.x - second.x, end.y - second.y);
    const count = Math.max(1, Math.ceil(reach / CurvePiece));
    const stops: Point[] = [];

    for (let step = 1; step <= count; step++) {
        const t = step / count;
        const rest = 1 - t;
        const a = rest * rest * rest;
        const b = 3 * rest * rest * t;
        const c = 3 * rest * t * t;
        const d = t * t * t;

        stops.push({ x: a * start.x + b * first.x + c * second.x + d * end.x, y: a * start.y + b * first.y + c * second.y + d * end.y });
    }

    return stops;
}

/** A piece from one place to the next, carrying how far along the edge it starts; none where the two are one place. */
function addPiece(pieces: EdgePiece[], from: Point, to: Point): void {
    if (from.x === to.x && from.y === to.y)
        return;

    const last = pieces.length === 0 ? null : pieces[pieces.length - 1];
    const along = last === null ? 0 : last.along + Math.hypot(last.x2 - last.x1, last.y2 - last.y1);

    pieces.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, along });
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

/**
 * A backward edge's arc: a flat oval hugging the nodes, rising slightly more the further it spans, with handles leaning inward —
 * nearly half the span over a short gap, so it sets out low and stays under what its nodes wear on their tops (a production node's
 * chip, wider than the node), and no further than `ArcLean` over a long one, so it clears the nodes it passes over.
 */
function arcCommands(start: Point, end: Point): Command[] {
    const span = end.x - start.x;
    const lift = Math.min(96, 20 + Math.abs(span) * 0.1);
    const side = Math.min(start.y, end.y) - lift;
    const lean = Math.sign(span) * Math.min(Math.abs(span) * 0.45, ArcLean);

    return [
        { op: "M", points: [start] },
        { op: "C", points: [{ x: start.x + lean, y: side }, { x: end.x - lean, y: side }, end] }
    ];
}

/**
 * A node's edge to itself: from the side it leaves by, up over the node, and down into the side it enters by, handles reaching
 * outward so the loop stands clear of the node's top — and of what the node wears there, a production node's chip.
 */
function loopCommands(start: Point, end: Point): Command[] {
    const side = Math.min(start.y, end.y) - LoopLift;
    const reach = Math.sign(start.x - end.x) * LoopReach;

    return [
        { op: "M", points: [start] },
        { op: "C", points: [{ x: start.x + reach, y: side }, { x: end.x - reach, y: side }, end] }
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

/** How much of each side of the viewport a fit keeps clear, in the viewport's pixels. */
type Insets = { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };

export type View = { zoom: number; panX: number; panY: number };

const NoInsets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
/** The room a fit leaves around the sheet on every side. */
const FitPadding = 48;
/** A narrow canvas's room around the sheet, a share of its width: 48 px on each side would take a phone's canvas a quarter of its width. */
const FitPaddingShare = 1 / 12;

/**
 * The zoom and pan that put `content` in the middle of a viewport of `width` by `height`, with room around it — `padding` on every
 * side, or more where `clear` asks for it.
 */
export function fitView(content: Rect, width: number, height: number, minZoom: number, maxZoom: number, padding = FitPadding, clear: Insets = NoInsets): View {
    if (content.width <= 0 || content.height <= 0 || width <= 0 || height <= 0)
        return { zoom: 1, panX: 0, panY: 0 };

    const top = Math.max(padding, clear.top);
    const left = Math.max(padding, clear.left);
    const roomWidth = width - left - Math.max(padding, clear.right);
    const roomHeight = height - top - Math.max(padding, clear.bottom);
    const zoom = Math.min(maxZoom, Math.max(minZoom, Math.min(roomWidth / content.width, roomHeight / content.height)));

    return {
        zoom,
        panX: left + roomWidth / 2 - (content.x + content.width / 2) * zoom,
        panY: top + roomHeight / 2 - (content.y + content.height / 2) * zoom
    };
}

/**
 * A fit that keeps the sheet clear of the chrome along the viewport's top (boxes in its pixels): a box as wide as half the view is a
 * band the sheet goes under; a corner's box is kept clear either beside it or under it, whichever leaves the larger zoom.
 */
export function fitClearOf(content: Rect, width: number, height: number, minZoom: number, maxZoom: number, chrome: readonly Rect[], gap = 8): View {
    let band = 0;
    let under = 0;
    let left = 0;
    let right = 0;

    for (const box of chrome) {
        // Over an open side panel's column, which the width already leaves out.
        if (box.width <= 0 || box.height <= 0 || box.x >= width)
            continue;

        const bottom = box.y + box.height + gap;

        under = Math.max(under, bottom);

        if (box.width >= width / 2)
            band = Math.max(band, bottom);
        else if (box.x + box.width / 2 < width / 2)
            left = Math.max(left, box.x + box.width + gap);
        else
            right = Math.max(right, width - box.x + gap);
    }

    const padding = Math.min(FitPadding, width * FitPaddingShare);
    const beside = fitView(content, width, height, minZoom, maxZoom, padding, { top: band, right, bottom: 0, left });
    const below = fitView(content, width, height, minZoom, maxZoom, padding, { top: under, right: 0, bottom: 0, left: 0 });

    return below.zoom > beside.zoom ? below : beside;
}

/** Whether any of `rects` (the sheet's coordinates) stands in a viewport of `width` by `height` at `view`. */
export function showsAny(rects: readonly Rect[], view: View, width: number, height: number): boolean {
    const seen = { x: -view.panX / view.zoom, y: -view.panY / view.zoom, width: width / view.zoom, height: height / view.zoom };

    return rects.some(rect => intersects(rect, seen));
}

/**
 * Two fingers' view: the zoom as the start's times how far apart they are now against then, held to the wheel's limits, and the pan
 * that keeps the point of the sheet under their first midpoint under their midpoint now — a pinch zooms around it and pans with it.
 */
export function pinchView(start: View, startMid: Point, startDistance: number, mid: Point, distance: number, minZoom: number, maxZoom: number): View {
    const zoom = startDistance <= 0 ? start.zoom : Math.min(maxZoom, Math.max(minZoom, start.zoom * (distance / startDistance)));
    const sceneX = (startMid.x - start.panX) / start.zoom;
    const sceneY = (startMid.y - start.panY) / start.zoom;

    return { zoom, panX: mid.x - sceneX * zoom, panY: mid.y - sceneY * zoom };
}

/** How far one wheel page goes, in pixels, for a wheel that counts in pages; the framework reads the rest (`context.wheel`). */
export const WheelPagePixels = 400;
/** A turn is held to three notches, however far a flick throws it. */
const WheelMostNotches = 3;

/**
 * How much one wheel turn zooms: a tenth per notch (the framework's, in pixels), continuous in distance so a trackpad's small steps
 * and a mouse's notch zoom alike; a mostly sideways turn (a swipe, Shift and the wheel) zooms nothing.
 */
export function wheelZoom(turn: WheelPixels, notch: number): number {
    const most = notch * WheelMostNotches;

    if (!Number.isFinite(turn.y) || Math.abs(turn.y) < 0.5 || Math.abs(turn.x) > Math.abs(turn.y))
        return 1;

    return Math.exp((-Math.max(-most, Math.min(most, turn.y)) * Math.log(1.1)) / notch);
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
