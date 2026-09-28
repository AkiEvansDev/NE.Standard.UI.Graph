// The canvas's own attributes, read straight off the root — server-written only; every concern reads the same values rather
// than caching its own copy.

import type { EdgeShape } from "./geometry.ts";

export const EdgeShapeAttribute = "data-ui-graph-edge-shape";
export const SnapAttribute = "data-ui-graph-snap";
/** Whether the item under the pointer brings out what it is joined to; read at every move, so nothing is redrawn when it changes. */
const HighlightAttribute = "data-ui-graph-highlight";
/** Whether every edit is saved as it is made; read at each edit. */
const AutoSaveAttribute = "data-ui-graph-auto-save";
export const ReadOnlyAttribute = "data-ui-graph-read-only";
/** Which way a layered kind runs its layers; the core only redraws when it changes. */
export const DirectionAttribute = "data-ui-graph-direction";
/** How a kind draws an item that names no shape of its own; the core only redraws when it changes. */
export const NodeShapeAttribute = "data-ui-graph-node-shape";
/** Whether a kind lets an item's own state be edited beside its place; the core only redraws when it changes. */
export const EditStructureAttribute = "data-ui-graph-edit-structure";
/** Which of its uses a kind with more than one is put to — a production graph's constructor or its plan. */
export const ModeAttribute = "data-ui-graph-mode";
const MinZoomAttribute = "data-ui-graph-min-zoom";
const MaxZoomAttribute = "data-ui-graph-max-zoom";

export class CanvasSettings {
    private readonly root: HTMLElement;

    public constructor(root: HTMLElement) {
        this.root = root;
    }

    public get readOnly(): boolean {
        return this.root.hasAttribute(ReadOnlyAttribute);
    }

    public get edgeShape(): EdgeShape {
        const named = this.root.getAttribute(EdgeShapeAttribute);

        return named === "straight" || named === "bezier" ? named : "orthogonal";
    }

    public get snapping(): boolean {
        return this.root.hasAttribute(SnapAttribute);
    }

    public get highlightOnHover(): boolean {
        return this.root.hasAttribute(HighlightAttribute);
    }

    public get autoSave(): boolean {
        return this.root.hasAttribute(AutoSaveAttribute);
    }

    public get gridSize(): number {
        return Number(getComputedStyle(this.root).getPropertyValue("--ui-graph-grid-size")) || 20;
    }

    public get minZoom(): number {
        return Number(this.root.getAttribute(MinZoomAttribute)) || 0.25;
    }

    public get maxZoom(): number {
        return Number(this.root.getAttribute(MaxZoomAttribute)) || 2.5;
    }
}
