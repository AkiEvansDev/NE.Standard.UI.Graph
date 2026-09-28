// The viewport: pan, zoom, fit, and the corner minimap. Every coordinate a pointer gesture needs — canvas point, viewport point —
// is read off here.

import type { ClientStore } from "ne-standard-ui";
import type { Rect } from "./geometry.ts";
import { bounds, fitView } from "./geometry.ts";
import type { CanvasGroup, CanvasItem, Point } from "./canvas-model.ts";
import type { CanvasSettings } from "./canvas-settings.ts";
import { FoldedControlAttribute, MinimapAttribute } from "./canvas-dom.ts";

/** What the view reaches on the coordinator: the items and groups on the sheet, and the boxes it measures them by. */
export type CanvasViewHost = {
    items(): readonly CanvasItem[];
    groups(): readonly CanvasGroup[];
    itemColor(item: CanvasItem): string;
    nodeRect(id: string): Rect | null;
    /** A node with what it wears outside its own box — a name under a circle, a chip over it — which Fit has to keep in view too. */
    nodeExtent(id: string): Rect | null;
};

/** On a panel of the kind's that takes a column of the viewport's trailing side while it is open — a folding control of the framework's. */
const SideAttribute = "data-ui-graph-side";
const GridSelector = ".ui-graph__grid";
/** How long the view rests before it is kept: a pan or a zoom writes it once it stops, not on every frame of it. */
const KeepDelay = 250;

/** How the sheet's own coordinates land in the map's box: one scale, and the drawing centred in what is left over. */
type MinimapPlacement = { readonly scale: number; readonly offsetX: number; readonly offsetY: number };

export class CanvasView {
    private readonly root: HTMLElement;
    private readonly settings: CanvasSettings;
    private readonly store: ClientStore;
    private readonly host: CanvasViewHost;

    private readonly viewport: HTMLElement;
    private readonly scene: HTMLElement;
    private readonly grid: HTMLElement | null;
    private readonly zoomLabel: HTMLElement | null;
    private readonly minimap: HTMLElement | null;
    private readonly minimapNodes: HTMLElement | null;
    private readonly minimapView: HTMLElement | null;
    // Cached from the last minimap draw; a pan only writes the scene's transform and must not re-measure the sheet, or every pan
    // frame would force a layout.
    private minimapContent: Rect | null = null;
    private minimapPlace: MinimapPlacement | null = null;

    private zoomValue = 1;
    private panXValue = 0;
    private panYValue = 0;
    private keepTimer: ReturnType<typeof setTimeout> | undefined;

    public constructor(root: HTMLElement, settings: CanvasSettings, store: ClientStore, host: CanvasViewHost) {
        this.root = root;
        this.settings = settings;
        this.store = store;
        this.host = host;
        this.viewport = root.querySelector<HTMLElement>(".ui-graph__viewport")!;
        this.scene = root.querySelector<HTMLElement>(".ui-graph__scene")!;
        this.grid = root.querySelector<HTMLElement>(GridSelector);
        this.zoomLabel = root.querySelector<HTMLElement>("[data-ui-graph-zoom]");
        this.minimap = root.querySelector<HTMLElement>("[data-ui-graph-map]");
        this.minimapNodes = root.querySelector<HTMLElement>("[data-ui-graph-map-nodes]");
        this.minimapView = root.querySelector<HTMLElement>("[data-ui-graph-map-view]");
    }

    public get zoom(): number {
        return this.zoomValue;
    }

    public get panX(): number {
        return this.panXValue;
    }

    public get panY(): number {
        return this.panYValue;
    }

    public get viewportElement(): HTMLElement {
        return this.viewport;
    }

    public restoreView(): void {
        const stored = this.store.readJson<{ zoom: number; panX: number; panY: number }>(this.root, "view");

        if (stored === null)
            return;

        this.zoomValue = Math.min(this.settings.maxZoom, Math.max(this.settings.minZoom, Number(stored.zoom) || 1));
        this.panXValue = Number(stored.panX) || 0;
        this.panYValue = Number(stored.panY) || 0;
    }

    public applyView(): void {
        this.scene.style.transform = `translate(${this.panXValue}px, ${this.panYValue}px) scale(${this.zoomValue})`;

        // On the grid, the one element that reads them: set on the root, they would restyle every node of the sheet each frame.
        this.grid?.style.setProperty("--ui-graph-zoom", String(this.zoomValue));
        this.grid?.style.setProperty("--ui-graph-pan-x", `${this.panXValue}px`);
        this.grid?.style.setProperty("--ui-graph-pan-y", `${this.panYValue}px`);

        if (this.zoomLabel !== null)
            this.zoomLabel.textContent = `${Math.round(this.zoomValue * 100)}%`;

        this.placeMinimapView();

        clearTimeout(this.keepTimer);
        this.keepTimer = setTimeout(() => this.keepView(), KeepDelay);
    }

    /** The view into the browser's store, and the grid's place for the boot script to paint before the engine starts. */
    private keepView(): void {
        this.keepTimer = undefined;
        this.store.write(this.root, "view", JSON.stringify({ zoom: this.zoomValue, panX: this.panXValue, panY: this.panYValue }), {
            selector: GridSelector,
            styles: {
                "--ui-graph-zoom": String(this.zoomValue),
                "--ui-graph-pan-x": `${this.panXValue}px`,
                "--ui-graph-pan-y": `${this.panYValue}px`
            }
        });
    }

    public fit(): void {
        const content = this.contentBounds(true);

        if (content === null)
            return;

        // Never past its own size: a sheet of three nodes blown up to fill the view reads as a mistake, not as the whole of it.
        const view = fitView(content, this.viewport.clientWidth - this.sideWidth(), this.viewport.clientHeight, this.settings.minZoom, Math.min(1, this.settings.maxZoom));

        this.zoomValue = view.zoom;
        this.panXValue = view.panX;
        this.panYValue = view.panY;
        this.applyView();
    }

    /** How much of the viewport's trailing side an open side panel (e.g. a production graph's plan) covers; Fit and centering keep to what's left. */
    private sideWidth(): number {
        const side = this.viewport.querySelector<HTMLElement>(`[${SideAttribute}]:not([${FoldedControlAttribute}])`);

        return side === null || side.offsetWidth === 0 ? 0 : this.viewport.clientWidth - side.offsetLeft;
    }

    public zoomBy(factor: number, atX: number, atY: number): void {
        const next = Math.min(this.settings.maxZoom, Math.max(this.settings.minZoom, this.zoomValue * factor));

        if (next === this.zoomValue)
            return;

        // The point under the pointer stays under it: the pan takes up what the scale moved.
        const scene = this.toScene(atX, atY);

        this.zoomValue = next;
        this.panXValue = atX - scene.x * next;
        this.panYValue = atY - scene.y * next;
        this.applyView();
    }

    /** A point in the viewport's own pixels as a point on the canvas. */
    public toScene(x: number, y: number): Point {
        return { x: (x - this.panXValue) / this.zoomValue, y: (y - this.panYValue) / this.zoomValue };
    }

    public toViewport(event: PointerEvent | MouseEvent): Point {
        const rect = this.viewport.getBoundingClientRect();

        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    /** A pan drag: the base pan it started from, plus how far the viewport point has moved since. */
    public dragPan(base: Point, dx: number, dy: number): void {
        this.panXValue = base.x + dx;
        this.panYValue = base.y + dy;
        this.applyView();
    }

    /** A line's node, or a menu's, chosen and brought to the middle of what the run line and the log leave of the view. */
    public centerOnRect(rect: Rect, topOffset: number, bottomOffset: number): void {
        this.panXValue = (this.viewport.clientWidth - this.sideWidth()) / 2 - (rect.x + rect.width / 2) * this.zoomValue;
        this.panYValue = topOffset + (this.viewport.clientHeight - topOffset - bottomOffset) / 2 - (rect.y + rect.height / 2) * this.zoomValue;
        this.applyView();
        this.viewport.focus({ preventScroll: true });
    }

    /** Everything the sheet holds, as one rectangle: what Fit fits — with what the nodes wear outside their boxes — and what the map is drawn against. */
    private contentBounds(worn = false): Rect | null {
        const rects: Rect[] = [];

        for (const node of this.host.items()) {
            const rect = worn ? this.host.nodeExtent(node.id) : this.host.nodeRect(node.id);

            if (rect !== null)
                rects.push(rect);
        }

        for (const group of this.host.groups())
            rects.push({ x: group.x, y: group.y, width: group.width, height: group.height });

        return bounds(rects);
    }

    /** Draws the minimap: a box per node against the sheet's bounds, and the in-view region marked over them, in the map's own pixels so a wide sheet isn't squared off. */
    public drawMinimap(): void {
        if (this.minimap === null || this.minimapNodes === null)
            return;

        // A canvas showing no map measures nothing for one: this runs on every frame a node is dragged.
        if (!this.root.hasAttribute(MinimapAttribute)) {
            this.minimapContent = null;
            this.minimapPlace = null;
            return;
        }

        this.minimapContent = this.contentBounds();
        this.minimapNodes.replaceChildren();
        // Shown before it is measured: a box the canvas is still hiding measures as nothing, and the map would hide itself for ever.
        this.minimap.hidden = this.minimapContent === null;

        if (this.minimapContent === null) {
            this.minimapPlace = null;
            return;
        }

        const map = this.minimapPlacement(this.minimapContent);

        this.minimapPlace = map;

        // Nowhere to draw it: a canvas on a tab nobody is looking at has no box of its own to scale against.
        if (!(map.scale > 0)) {
            this.minimap.hidden = true;
            return;
        }

        for (const node of this.host.items()) {
            const rect = this.host.nodeRect(node.id);

            if (rect === null)
                continue;

            const box = document.createElement("i");
            const color = this.host.itemColor(node);

            box.className = "ui-graph__minimap-node";
            box.style.left = `${map.offsetX + (rect.x - this.minimapContent.x) * map.scale}px`;
            box.style.top = `${map.offsetY + (rect.y - this.minimapContent.y) * map.scale}px`;
            box.style.width = `${Math.max(2, rect.width * map.scale)}px`;
            box.style.height = `${Math.max(2, rect.height * map.scale)}px`;

            // The sheet's own colours, so the map reads as the sheet rather than as a field of identical marks.
            if (color.length > 0)
                box.style.background = color;

            this.minimapNodes.append(box);
        }

        this.placeMinimapView();
    }

    /** Where the content sits inside the map: one scale for both axes, and the drawing centred in what is left. */
    private minimapPlacement(content: Rect): MinimapPlacement {
        const width = this.minimap?.clientWidth ?? 0;
        const height = this.minimap?.clientHeight ?? 0;
        const scale = Math.min(width / Math.max(1, content.width), height / Math.max(1, content.height));

        return { scale, offsetX: (width - content.width * scale) / 2, offsetY: (height - content.height * scale) / 2 };
    }

    /** The part of the sheet now on screen, over the map. Follows every pan and zoom, which is all a pan has to redraw. */
    private placeMinimapView(): void {
        const map = this.minimapPlace;

        if (this.minimapView === null || this.minimapContent === null || map === null)
            return;

        const view: Rect = {
            x: -this.panXValue / this.zoomValue,
            y: -this.panYValue / this.zoomValue,
            width: this.viewport.clientWidth / this.zoomValue,
            height: this.viewport.clientHeight / this.zoomValue
        };

        this.minimapView.style.left = `${map.offsetX + (view.x - this.minimapContent.x) * map.scale}px`;
        this.minimapView.style.top = `${map.offsetY + (view.y - this.minimapContent.y) * map.scale}px`;
        this.minimapView.style.width = `${view.width * map.scale}px`;
        this.minimapView.style.height = `${view.height * map.scale}px`;
    }

    /** The canvas point under a press on the map, which the view is then centred on. */
    public minimapPan(event: PointerEvent): void {
        const map = this.minimapPlace;

        if (this.minimap === null || this.minimapContent === null || map === null)
            return;

        const box = this.minimap.getBoundingClientRect();
        const x = this.minimapContent.x + (event.clientX - box.left - map.offsetX) / map.scale;
        const y = this.minimapContent.y + (event.clientY - box.top - map.offsetY) / map.scale;

        // In the middle of what an open side panel leaves in view, as Fit and centring keep to.
        this.panXValue = (this.viewport.clientWidth - this.sideWidth()) / 2 - x * this.zoomValue;
        this.panYValue = this.viewport.clientHeight / 2 - y * this.zoomValue;
        this.applyView();
    }
}
