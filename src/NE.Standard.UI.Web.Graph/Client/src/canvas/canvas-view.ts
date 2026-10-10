// The viewport: pan, zoom, fit, and the corner minimap. Every coordinate a pointer gesture needs — canvas point, viewport point —
// is read off here.

import type { ClientStore, PluginEngineContext } from "ne-standard-ui";
import type { Rect, View } from "./geometry.ts";
import { bounds, fitClearOf, showsAny } from "./geometry.ts";
import type { CanvasGroup, CanvasItem, Point } from "./canvas-model.ts";
import type { CanvasSettings } from "./canvas-settings.ts";
import { FoldedControlAttribute, MinimapAttribute, percentText, SideAttribute, TopChromeSelector } from "./canvas-dom.ts";

/** What the view reaches on the coordinator: the items and groups on the sheet, and the boxes it measures them by. */
export type CanvasViewHost = {
    items(): readonly CanvasItem[];
    groups(): readonly CanvasGroup[];
    itemColor(item: CanvasItem): string;
    nodeRect(id: string): Rect | null;
    /** A node with what it wears outside its own box — a name under a circle, a chip over it — which Fit has to keep in view too. */
    nodeExtent(id: string): Rect | null;
};

const GridSelector = ".ui-graph__grid";
/** How long the view rests before it is kept: a pan or a zoom writes it once it stops, not on every frame of it. */
const KeepDelay = 250;

/** How the sheet's own coordinates land in the map's box: one scale, and the drawing centred in what is left over. */
type MinimapPlacement = { readonly scale: number; readonly offsetX: number; readonly offsetY: number };

export class CanvasView {
    private readonly root: HTMLElement;
    private readonly settings: CanvasSettings;
    private readonly context: PluginEngineContext;
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
    // The share the zoom's label last said: a pan writes nothing, and a language switch forgets it so the label is written again.
    private zoomShare = Number.NaN;
    private panXValue = 0;
    private panYValue = 0;
    private keepTimer: ReturnType<typeof setTimeout> | undefined;
    // A fit the reader has not panned, zoomed or centred since: fitted again for every new size of the canvas, where a view they
    // moved stays as they left it. The size is the one it was fitted for; a fitted view kept from a visit before stands where it
    // opens at the size it was kept at, and is fitted again at any other (a phone's canvas, after a visit on a desktop).
    private fitted = false;
    private fittedWidth = 0;
    private fittedHeight = 0;
    private readonly stopSizeWatch: () => void;
    // Whether the viewer had a view of this canvas kept before it was first drawn, read before a draw writes one: the sheet's
    // first fit leaves it standing.
    private readonly viewKept: boolean;
    private opened = false;
    // Watches a canvas asked to fit while it has no size yet, to fit it once it has one.
    private stopOpenWatch: (() => void) | null = null;

    public constructor(root: HTMLElement, settings: CanvasSettings, context: PluginEngineContext, host: CanvasViewHost) {
        this.root = root;
        this.settings = settings;
        this.context = context;
        this.store = context.store;
        this.host = host;
        this.viewport = root.querySelector<HTMLElement>(".ui-graph__viewport")!;
        this.scene = root.querySelector<HTMLElement>(".ui-graph__scene")!;
        this.grid = root.querySelector<HTMLElement>(GridSelector);
        this.zoomLabel = root.querySelector<HTMLElement>("[data-ui-graph-zoom]");
        this.minimap = root.querySelector<HTMLElement>("[data-ui-graph-map]");
        this.minimapNodes = root.querySelector<HTMLElement>("[data-ui-graph-map-nodes]");
        this.minimapView = root.querySelector<HTMLElement>("[data-ui-graph-map-view]");
        this.stopSizeWatch = context.observeSize(this.viewport, () => this.viewportResized());
        this.viewKept = context.store.readJson(root, "view") !== null;
    }

    /** The canvas took another size: a fit the reader left alone is made again for it; a canvas with no size (hidden) waits. */
    private viewportResized(): void {
        const width = this.viewport.clientWidth;
        const height = this.viewport.clientHeight;

        if (!this.fitted || width === 0 || height === 0 || (width === this.fittedWidth && height === this.fittedHeight))
            return;

        // A kept fit meets its first size: it stands there, as a returning viewer's kept view opens.
        if (this.fittedWidth === 0) {
            this.fittedWidth = width;
            this.fittedHeight = height;
            return;
        }

        this.fit();
    }

    /** Lets go of the watches on the canvas's size; the canvas is leaving the page. */
    public dispose(): void {
        this.stopSizeWatch();
        this.stopOpenWatch?.();
        this.stopOpenWatch = null;
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
        const stored = this.store.readJson<{ zoom: number; panX: number; panY: number; fitted?: boolean; width?: number; height?: number }>(this.root, "view");

        if (stored === null)
            return;

        this.zoomValue = Math.min(this.settings.maxZoom, Math.max(this.settings.minZoom, Number(stored.zoom) || 1));
        this.panXValue = Number(stored.panX) || 0;
        this.panYValue = Number(stored.panY) || 0;
        this.fitted = stored.fitted === true;
        // The size a kept fit was made for; one kept before the size was, or a canvas still hidden (no size), takes the one it is
        // first shown at.
        this.fittedWidth = this.fitted ? Number(stored.width) || this.viewport.clientWidth : 0;
        this.fittedHeight = this.fitted ? Number(stored.height) || this.viewport.clientHeight : 0;
    }

    public applyView(): void {
        this.scene.style.transform = `translate(${this.panXValue}px, ${this.panYValue}px) scale(${this.zoomValue})`;

        // On the grid, the one element that reads them: set on the root, they would restyle every node of the sheet each frame.
        this.grid?.style.setProperty("--ui-graph-zoom", String(this.zoomValue));
        this.grid?.style.setProperty("--ui-graph-pan-x", `${this.panXValue}px`);
        this.grid?.style.setProperty("--ui-graph-pan-y", `${this.panYValue}px`);

        this.drawZoom();
        this.placeMinimapView();
        // The sheet moved under what floats over it — a node's action bar, a tooltip — with no scroll of its own: told as one, which
        // the page's anchored popups follow and close by as they do a scrolling box's.
        this.viewport.dispatchEvent(new Event("scroll"));

        clearTimeout(this.keepTimer);
        this.keepTimer = setTimeout(() => this.keepView(), KeepDelay);
    }

    /** The zoom's label, written only when the share it says moved. */
    private drawZoom(): void {
        const share = Math.round(this.zoomValue * 100);

        if (this.zoomLabel === null || share === this.zoomShare)
            return;

        this.zoomShare = share;
        this.zoomLabel.textContent = percentText(this.context, this.zoomLabel, share);
    }

    /** The page's words changed: the zoom's label is written again in them. */
    public wordsChanged(): void {
        this.zoomShare = Number.NaN;
        this.drawZoom();
    }

    /** The view into the browser's store, and the grid's place for the boot script to paint before the engine starts. */
    private keepView(): void {
        this.keepTimer = undefined;
        this.store.write(this.root, "view", JSON.stringify({ zoom: this.zoomValue, panX: this.panXValue, panY: this.panYValue, fitted: this.fitted, width: this.fittedWidth, height: this.fittedHeight }), {
            selector: GridSelector,
            styles: {
                "--ui-graph-zoom": String(this.zoomValue),
                "--ui-graph-pan-x": `${this.panXValue}px`,
                "--ui-graph-pan-y": `${this.panYValue}px`
            }
        });
    }

    /**
     * Whether the present view shows any of the sheet's nodes. A view kept from before the sheet changed under it — its nodes placed
     * anew, or another sheet under the same name — can show none of them, and is let go for a fit.
     */
    public showsAnyItem(): boolean {
        const rects = this.host.items().flatMap(item => this.host.nodeRect(item.id) ?? []);

        const visible = this.visibleRect();

        return showsAny(rects, { zoom: this.zoomValue, panX: this.panXValue, panY: this.panYValue }, visible.width, visible.height);
    }

    /**
     * Shows the sheet whole (Fit), at once where the canvas is shown and else as soon as it is — except the first time a returning
     * viewer opens it: the view they kept stands while it shows some of the sheet. Every later call fits.
     */
    public fitSheet(): void {
        if (this.root.offsetWidth > 0) {
            this.fitUnlessKept();
            return;
        }

        this.stopOpenWatch ??= this.context.observeSize(this.root, () => {
            if (this.root.offsetWidth === 0)
                return;

            this.stopOpenWatch?.();
            this.stopOpenWatch = null;
            this.fitUnlessKept();
        });
    }

    private fitUnlessKept(): void {
        if (this.opened || !this.viewKept || !this.showsAnyItem())
            this.fit();

        this.opened = true;
    }

    public fit(): void {
        const content = this.contentBounds(true);

        if (content === null)
            return;

        const visible = this.visibleRect();
        // Never past its own size: a sheet of three nodes blown up to fill the view reads as a mistake, not as the whole of it.
        const view = fitClearOf(content, visible.width, visible.height, this.settings.minZoom, Math.min(1, this.settings.maxZoom), this.topChrome());

        this.zoomValue = view.zoom;
        this.panXValue = view.panX;
        this.panYValue = view.panY;
        this.fitted = true;
        this.fittedWidth = this.viewport.clientWidth;
        this.fittedHeight = this.viewport.clientHeight;
        this.applyView();
    }

    /** The boxes of the chrome over the sheet's top edge, in the viewport's own pixels; a hidden part measures as nothing and is passed over. */
    private topChrome(): Rect[] {
        const origin = this.viewport.getBoundingClientRect();
        const left = origin.left + this.viewport.clientLeft;
        const top = origin.top + this.viewport.clientTop;

        return Array.from(this.viewport.querySelectorAll<HTMLElement>(TopChromeSelector), part => {
            const box = part.getBoundingClientRect();

            return { x: box.left - left, y: box.top - top, width: box.width, height: box.height };
        });
    }

    /**
     * What of the viewport the sheet is seen through, in its own pixels: all of it but the trailing side an open side panel (a
     * production graph's plan) covers. Fit, centring, the zoom buttons and the minimap's frame all keep to it.
     */
    public visibleRect(): Rect {
        const side = this.viewport.querySelector<HTMLElement>(`[${SideAttribute}]:not([${FoldedControlAttribute}])`);
        const covered = side === null || side.offsetWidth === 0 ? 0 : this.viewport.clientWidth - side.offsetLeft;

        return { x: 0, y: 0, width: this.viewport.clientWidth - covered, height: this.viewport.clientHeight };
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
        this.fitted = false;
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

    /** A view a pinch made, its zoom already held to the limits. */
    public pinchTo(view: View): void {
        if (view.zoom === this.zoomValue && view.panX === this.panXValue && view.panY === this.panYValue)
            return;

        this.zoomValue = view.zoom;
        this.panXValue = view.panX;
        this.panYValue = view.panY;
        this.fitted = false;
        this.applyView();
    }

    /** A pan drag: the base pan it started from, plus how far the viewport point has moved since. */
    public dragPan(base: Point, dx: number, dy: number): void {
        // A press that has not moved yet leaves a fit fitted.
        if (base.x + dx === this.panXValue && base.y + dy === this.panYValue)
            return;

        this.panXValue = base.x + dx;
        this.panYValue = base.y + dy;
        this.fitted = false;
        this.applyView();
    }

    /**
     * A line's node, or a menu's, brought to the middle of what the run line and the log leave of the view; the focus stays where
     * the press left it — a panel's name keeps its keys off the sheet.
     */
    public centerOnRect(rect: Rect, topOffset: number, bottomOffset: number): void {
        this.panXValue = this.visibleRect().width / 2 - (rect.x + rect.width / 2) * this.zoomValue;
        this.panYValue = topOffset + (this.viewport.clientHeight - topOffset - bottomOffset) / 2 - (rect.y + rect.height / 2) * this.zoomValue;
        this.fitted = false;
        this.applyView();
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

    /**
     * Where the content sits inside the map: one scale for both axes, and the drawing centred in what its padding leaves, so no box
     * touches the map's edge or its rounded corners. Offsets count from the map's padding box, where its layers stand.
     */
    private minimapPlacement(content: Rect): MinimapPlacement {
        const minimap = this.minimap;

        if (minimap === null)
            return { scale: 0, offsetX: 0, offsetY: 0 };

        const style = getComputedStyle(minimap);
        const left = Number.parseFloat(style.paddingLeft) || 0;
        const top = Number.parseFloat(style.paddingTop) || 0;
        const width = minimap.clientWidth - left - (Number.parseFloat(style.paddingRight) || 0);
        const height = minimap.clientHeight - top - (Number.parseFloat(style.paddingBottom) || 0);
        const scale = Math.min(width / Math.max(1, content.width), height / Math.max(1, content.height));

        return { scale, offsetX: left + (width - content.width * scale) / 2, offsetY: top + (height - content.height * scale) / 2 };
    }

    /** The part of the sheet now on screen, over the map. Follows every pan and zoom, which is all a pan has to redraw. */
    private placeMinimapView(): void {
        const map = this.minimapPlace;

        if (this.minimapView === null || this.minimapContent === null || map === null)
            return;

        const view: Rect = {
            x: -this.panXValue / this.zoomValue,
            y: -this.panYValue / this.zoomValue,
            width: this.visibleRect().width / this.zoomValue,
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

        // The placement counts from the padding box, inside the map's border.
        const box = this.minimap.getBoundingClientRect();
        const x = this.minimapContent.x + (event.clientX - box.left - this.minimap.clientLeft - map.offsetX) / map.scale;
        const y = this.minimapContent.y + (event.clientY - box.top - this.minimap.clientTop - map.offsetY) / map.scale;

        const visible = this.visibleRect();

        // In the middle of what an open side panel leaves in view, as Fit and centring keep to.
        this.panXValue = visible.width / 2 - x * this.zoomValue;
        this.panYValue = visible.height / 2 - y * this.zoomValue;
        this.fitted = false;
        this.applyView();
    }
}
