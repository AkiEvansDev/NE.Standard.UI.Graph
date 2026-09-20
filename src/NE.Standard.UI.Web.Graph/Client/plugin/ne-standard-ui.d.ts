// The framework's client as a package sees it: `window.NEStandardUI` and what its registrations hand a package back. This file is
// the contract. It lives with the framework's client (Client/plugin/), a package keeps a byte-for-byte copy beside its own client
// and includes it in its tsconfig, and PluginApiSyncTests refuses a copy that differs. On the framework's side,
// src/runtime/plugin-api-check.ts holds the runtime's real types to these shapes, so the declaration cannot promise what the
// runtime does not do. Only what a package is meant to reach is declared; the rest of the runtime is not a contract.

declare module "ne-standard-ui" {
    /** One DOM operation of a bound property, as the compiled metadata carries it; a package's own kind arrives by its name. */
    export type DomOperation = {
        readonly kind: string | number;
        readonly target?: string | null;
        readonly name?: string | null;
        readonly converter?: string | null;
        readonly condition?: string | number | null;
        readonly value?: string | null;
        readonly optional?: boolean | null;
    };

    export type DomOperationContext = {
        readonly operation: DomOperation;
        /** The element the operation lands on. */
        readonly target: Element;
        readonly value: unknown;
        readonly convertedValue: unknown;
        /** True for a value the reader produced on this page; false for one the server pushed. */
        readonly local: boolean;
    };

    /** A DOM operation by kind — the name a renderer wrote through `WebDomOperation.Custom`, or a built-in kind to override. */
    export type DomOperationRegistration = {
        readonly kind: string;
        readonly handler: (context: DomOperationContext) => void;
    };

    export type ValueConverterContext = {
        readonly name: string;
        readonly value: unknown;
    };

    /** A converter by name, as a renderer names it in a `WebDomOperation`'s converter. */
    export type ValueConverterRegistration = {
        readonly name: string;
        canConvert?(context: ValueConverterContext): boolean;
        convert(context: ValueConverterContext): unknown;
    };

    /** How a written value is read off an element carrying `data-ui-value-kind` of this kind. */
    export type ValueReaderRegistration = {
        readonly kind: string;
        readonly read: (element: Element) => unknown;
    };

    /** One item of a collection change: its key, where it sits in the source order, and the value the server sent. */
    export type CollectionChangeItem = {
        readonly key: string | null;
        /** On a replace: the key the item had before, when it changed. */
        readonly oldKey: string | null;
        readonly index: number | null;
        readonly item: unknown;
    };

    export type CollectionChangeMove = {
        readonly key: string | null;
        readonly oldIndex: number | null;
        readonly newIndex: number | null;
    };

    /** A change to a bound collection, as a sink receives it — the initial reset and insert included. */
    export type CollectionChange = {
        readonly action: "Insert" | "Remove" | "Move" | "Replace" | "Reset" | "Unknown";
        /** The component the collection is bound on. */
        readonly component: Element;
        readonly componentId: number;
        readonly dynamicParameters: readonly unknown[];
        readonly items: readonly CollectionChangeItem[];
        readonly moves: readonly CollectionChangeMove[];
    };

    /**
     * A sink by the kind a renderer wrote in `data-ui-collection-sink` on a component's root: that component's bound collection
     * reaches the handler as values, and no items host draws it as rows.
     */
    export type CollectionSinkRegistration = {
        readonly kind: string;
        readonly handler: (change: CollectionChange) => void;
    };

    export type ClientEffect = {
        readonly kind: string;
        readonly [key: string]: unknown;
    };

    export type EffectContext = {
        readonly effect: ClientEffect;
        readonly dom: DomRegistry;
    };

    /** A `ClientEffect` kind — one a command or an interaction may run. */
    export type EffectRegistration = {
        readonly kind: string;
        readonly handler: (context: EffectContext) => void;
    };

    export type EventDispatchContext<TEvent extends Event = Event> = {
        readonly domEvent: TEvent;
        readonly component: Element;
        readonly componentId: number;
        readonly dynamicParameters: readonly unknown[];
    };

    export type EventAttachContext = {
        readonly root: ParentNode;
        /** Hands a DOM event to the pipeline as if a listener of the event's name had caught it. */
        readonly dispatch: (domEvent: Event) => void;
    };

    /** What became of the command an event raised, told to the registration that asked to hear it. */
    export type EventCompletionContext<TEvent extends Event = Event> = EventDispatchContext<TEvent> & {
        /** Whether a command ran on the server at all: false when the event carried none, or was refused before it was sent. */
        readonly dispatched: boolean;
        /** Whether the command answered successfully; true when none ran. */
        readonly success: boolean;
        readonly error?: string | null;
    };

    /** An event by the name a component's metadata declares: the native event it is, and/or a custom way of attaching it. */
    export type EventRegistration<TEvent extends Event = Event> = {
        readonly domEventName?: string;
        readonly options?: AddEventListenerOptions;
        readonly preventDefault?: boolean | ((context: EventDispatchContext<TEvent>) => boolean);
        readonly stopPropagation?: boolean | ((context: EventDispatchContext<TEvent>) => boolean);
        /** The command waits for the component's value to reach the server first, as an `.OnChange` command does. */
        readonly settlesValue?: boolean;
        /** Before the command, the form of the event's field is submitted, as a button's `OnSubmit` does: its held values are sent. */
        readonly submitsForm?: boolean;
        /** The keys the command carries, named by the engine in place of the `data-ui-key` chain above the target; null keeps the chain. */
        dynamicParameters?(context: EventDispatchContext<TEvent>): readonly unknown[] | null;
        /**
         * Told what became of the command this event raised, for a package that sends a value and has to know it landed. Told
         * whatever happens — a command that was never sent, one that failed, and a connection that dropped under it.
         */
        completed?(context: EventCompletionContext<TEvent>): void;
        attach?(context: EventAttachContext): void;
    };

    /** The rendered components by id, as the page holds them. */
    export type DomRegistry = {
        /**
         * The element's own id, or one out of the page's single run of generated ids — what an `aria-` attribute a package
         * writes points at, and the one counter, so a package's id cannot collide with the framework's own.
         */
        ensureId(element: Element, prefix: string): string;
        findComponent(componentId: number, dynamicParameters: readonly unknown[]): Element | null;
        findAllComponents(componentId: number, dynamicParameters: readonly unknown[]): Element[];
        findComponentParts(componentId: number, dynamicParameters: readonly unknown[], selector: string): HTMLElement[];
    };

    export type PropertyValueChange = {
        readonly propertyName: string;
        readonly dynamicParameters: readonly unknown[];
        readonly value: unknown;
        /** True for a value the reader produced on this page; false for one the server pushed. */
        readonly local: boolean;
        /** The component roots the patch landed on; empty when the component only exists inside an item template. */
        readonly components: readonly Element[];
    };

    /** What applies a property's value to the page, and says so after. */
    export type PropertyPatchEngine = {
        addValueChangeHandler(handler: (change: PropertyValueChange) => void): () => void;
    };

    /** The page's words, resolved for its language on the server — a package's `IUIStringsSource` among them. */
    export type ClientStrings = {
        text(key: string): string;
        /** The word with its `{name}` placeholders filled. */
        format(key: string, values: Readonly<Record<string, string | number>>): string;
    };

    export type SubtreeObserverInit = {
        readonly childList?: boolean;
        readonly characterData?: boolean;
        readonly attributeFilter?: readonly string[];
    };

    /** The one observer shape: which components under `root` a batch of mutations touched, whole components at a time. */
    export type ObserveComponents = (
        root: ParentNode,
        selector: string,
        init: SubtreeObserverInit,
        handler: (components: Iterable<HTMLElement>) => void
    ) => MutationObserver | null;

    /** Calls back whenever an element's box changes, through whatever the page has for it; returns what stops it. The first size is the caller's to read. */
    export type ObserveSize = (element: Element, handler: (element: Element) => void) => () => void;

    /** The page's dialogs by key — a view's declared ones and the ones a component registered with `AddDialog`. */
    export type Dialogs = {
        /** Shows the dialog; false when no dialog of that key is on the page. */
        open(key: string): boolean;
        close(key: string): boolean;
    };

    /** Attributes and styles the boot script writes on a component before the first paint. */
    export type ClientBootPatch = {
        readonly selector?: string;
        readonly attributes?: Readonly<Record<string, string | null>>;
        readonly styles?: Readonly<Record<string, string>>;
    };

    /** The small preferences a component keeps in the browser, under the author's own name for it (`data-ui-name`) and a slot of the engine's choosing. */
    export type ClientStore = {
        /** The stored string, or null when there is nothing stored, no name to store it under, or no storage. */
        read(component: Element, slot: string): string | null;
        /** Stores a value, or removes it when null; `boot` given sets the slot's boot patch, null clears it, omitted leaves it. */
        write(component: Element, slot: string, value: string | null, boot?: ClientBootPatch | null): void;
        readJson<TValue>(component: Element, slot: string): TValue | null;
        writeJson(component: Element, slot: string, value: unknown): void;
    };

    /** What `WebNumberCulturePack` carries — .NET's `NumberFormatInfo`, the parts a formatted number reads — as `data-ui-number-culture` holds it. */
    export type NumberCulturePack = {
        readonly decimalSeparator: string;
        readonly groupSeparator: string;
        readonly groupSizes: readonly number[];
        readonly negativeSign: string;
        readonly negativePattern: number;
        readonly decimalDigits: number;
        readonly currencySymbol: string;
        readonly currencyDecimalSeparator: string;
        readonly currencyGroupSeparator: string;
        readonly currencyGroupSizes: readonly number[];
        readonly currencyDecimalDigits: number;
        readonly currencyPositivePattern: number;
        readonly currencyNegativePattern: number;
        readonly percentSymbol: string;
        readonly percentDecimalSeparator: string;
        readonly percentGroupSeparator: string;
        readonly percentGroupSizes: readonly number[];
        readonly percentDecimalDigits: number;
        readonly percentPositivePattern: number;
        readonly percentNegativePattern: number;
    };

    /** Numbers as the server formats them: the pack off the nearest element carrying one, and a value by a standard format (`N`, `F`, `C`, `P`, `D`, with an optional precision). */
    export type NumberFormatting = {
        readCulture(element: Element): NumberCulturePack;
        /** A format outside the subset throws; no format is the value as it is, in the culture's separator and sign. */
        format(value: number, format: string | null | undefined, culture: NumberCulturePack): string;
    };

    /** What `WebTemporalCulturePack` carries — the month and day names, the AM and PM words — as `data-ui-temporal-culture` holds it. */
    export type TemporalCulturePack = {
        readonly monthNames: readonly string[];
        /** Languages that decline month names use these when a day number precedes the month. */
        readonly monthGenitiveNames: readonly string[];
        readonly abbreviatedMonthNames: readonly string[];
        readonly dayNames: readonly string[];
        readonly abbreviatedDayNames: readonly string[];
        readonly amDesignator: string;
        readonly pmDesignator: string;
    };

    /** A moment as the wire writes it, field by field: the wall clock, with no zone, since the server writes a value by its own clock. */
    export type WrittenMoment = {
        readonly year: number;
        /** One-based, as written. */
        readonly month: number;
        readonly day: number;
        readonly hour: number;
        readonly minute: number;
        readonly second: number;
        readonly millisecond: number;
    };

    /**
     * Dates as the server formats them: the pack off the nearest element carrying one, a value by the shared token subset (`yyyy`,
     * `MM`, `dd`, `HH`, `mm`, …), and the wire's own text read back — never `new Date(text)`, which turns a bare text by the reader's zone.
     */
    export type TemporalFormatting = {
        readCulture(element: Element): TemporalCulturePack;
        /** No format is the invariant round-trip form; a token outside the subset is written as it is. */
        format(value: Date, format: string | null | undefined, culture: TemporalCulturePack): string;
        /**
         * The wall clock a text is written with — `yyyy-MM-dd`, with `T` or a space and a clock after it, a zone tolerated and
         * ignored — or null for text that names no moment, a field out of its range included.
         */
        parse(text: string): WrittenMoment | null;
        /** The moment as a local date whose own fields read the written clock, which `format` writes back as the same text. */
        toDate(moment: WrittenMoment): Date;
    };

    /**
     * Icons as a package draws them on elements it builds itself: `apply` writes an icon value on an element the way a renderer
     * writes it — the `ui-icon` box, a glyph's class (a pack's name or the framework's own `ne-` marks) or the picture behind it,
     * and the mark that says a glyph is there. A package composes no icon class of its own.
     */
    export type Icons = {
        apply(element: Element, value: unknown): void;
    };

    /** Badges a package counts on itself — a filter count, a log count — on a badge a renderer drew. */
    export type Badges = {
        /** Writes the count as the badge's text, and the fit the renderer would have written: round while it is up to two characters. */
        writeCount(badge: Element, count: number): void;
    };

    /**
     * A value read as the framework reads it: off the kind an element names in `data-ui-value-kind`, off what the element is, or —
     * given a component's root — off the element the component keeps its value on (`data-ui-value-holder`), which for a composed
     * control is not the first field in its markup. A package hosting the framework's fields — a grid's filters, a cell's editor —
     * reads them here rather than by their input shapes.
     */
    export type ValueReading = {
        read(element: Element): unknown;
        /**
         * Holds an element's value as the reader's until it is sent — by its `change`, or by its form's submit — so a value the
         * server pushes meanwhile is neither written into it nor told to a value-change handler; a package's own editor calls it
         * once it has unsaved work.
         */
        hold(element: Element): void;
        /** Lets a held value go, and puts the server's latest value back into the element: the unsaved work is gone. */
        release(element: Element): void;
    };

    /**
     * A core component's property set from a package's client the way a push sets it — the component's own operations, its engine
     * hearing the change — where the package's renderer exposed it (`RenderRegion(context, html, region, exposed)`). The element is
     * the component's root or inside it; false, with a warning, for a property nobody exposed.
     */
    export type PropertyWriting = {
        set(element: Element, propertyName: string, value: unknown): boolean;
    };

    /**
     * The windowed items hosts as a package reaches them. A host carrying `data-ui-window-paged` is read by a pager, never by its
     * scroll: `requestOffsetAsync` replaces its window with the one starting at `offset`, `data-ui-window-size` rows of it.
     */
    export type ItemWindows = {
        requestOffsetAsync(host: Element, offset: number): Promise<void>;
    };

    /**
     * The page's one tooltip as a package reaches it: a component that draws its own picture has no element per thing it can
     * speak about, so it says the words itself and names what they stand against. Shown at once, with no hover's wait, and
     * closed by `hide` or by the reader pointing somewhere else.
     */
    export type Tooltips = {
        show(target: Element, words: string): void;
        hide(): void;
    };

    export type InlineRenameOptions = {
        /** The positioned element the field is appended to; the title must be inside it. */
        readonly container: HTMLElement;
        /** The title the field covers, hidden while the field is open. */
        readonly title: HTMLElement;
        readonly className: string;
        /** The text the field starts with; a commit that leaves it unchanged is not a change. */
        readonly value: string;
        readonly commit: (value: string) => void;
        /** Whether an emptied field commits as an empty name, for a title that falls back to one of its own; unset, it is refused. */
        readonly allowEmpty?: boolean;
        /** Runs after the field closes, committed or not — where the focus goes back to. */
        readonly done?: () => void;
    };

    /**
     * The framework's rename field as a package reaches it — the one a tab's caption and a tree node's title open: laid over the
     * title in the title's own type, even under a scale, committed by Enter or by leaving it and dropped by Escape. A package's
     * stylesheet dresses its class with `.ui-inline-rename-field()`. False when one is already open in the container.
     */
    export type InlineRenames = {
        open(options: InlineRenameOptions): boolean;
    };

    /** Preferred side for a popup, not a demand — a side with no room flips to its opposite. */
    export type PopupPlacement =
        | "top-start" | "top" | "top-end"
        | "bottom-start" | "bottom" | "bottom-end"
        | "left-start" | "left" | "left-end"
        | "right-start" | "right" | "right-end";

    export type PopupDismissReason = "outside" | "escape" | "blur";

    export type PopupOptions = {
        readonly placement: PopupPlacement;
        /** Distance between anchor and popup along the main axis, in pixels. */
        readonly gap: number;
        /** Makes the popup at least as wide as the anchor before measuring, wider when its content asks, for dropdown-shaped popups. */
        readonly minAnchorWidth?: boolean;
        /** Aligns the popup along the cross axis to this element instead of the anchor. */
        readonly crossAnchor?: Element;
        /** The popup draws an arrow at the anchor, so it may be shifted along the cross axis to let the arrow reach a small anchor's centre. */
        readonly arrow?: boolean;
        /** Told when the framework itself closes the popup — an outside press or Escape; a caller's own `close()` does not raise it. */
        readonly onDismiss: (reason: PopupDismissReason) => void;
    };

    /** What opening a popup hands back. */
    export type PopupHandle = {
        /** Re-measures the popup against its anchor — for content that changed size in a way a `ResizeObserver` would not catch. */
        reposition(): void;
        /** Closes the popup; does not run `onDismiss`, since the caller already knows why. */
        close(): void;
    };

    /**
     * A non-modal floating panel for a package, placed and dismissed the framework's own way — outside press by `composedPath()`,
     * Escape to the newest popup among every popup open on the page, whoever opened it. The popup is the package's element, already
     * on the page (it is `position: fixed`, so any parent will do) and dressed with `.ui-popup-surface()`; opening places it, and
     * closing leaves it where it stands. Not for a modal chooser; that is a native `<dialog>`, which a package draws itself.
     */
    export type Popups = {
        open(anchor: Element, popup: HTMLElement, options: PopupOptions): PopupHandle;
    };

    export type RovingAxis = "vertical" | "horizontal" | "both";

    export type RovingRequest = {
        /** The key pressed, as `KeyboardEvent.key` names it. */
        readonly key: string;
        readonly items: readonly HTMLElement[];
        readonly current: HTMLElement | null;
        readonly axis: RovingAxis;
        /** Wrap past the ends. Default true. */
        readonly loop?: boolean;
    };

    /**
     * Arrowing among a package's own entries the way the framework's menus and lists arrow: the arrows of the axis step, Home and
     * End go to the edges, an entry that is hidden or disabled is skipped, and an unknown current enters at the near end. `target`
     * answers the entry the key moves to, or null for a key that is not a move, leaving what to do with it to the caller.
     */
    export type RovingFocus = {
        target(request: RovingRequest): HTMLElement | null;
        /** Leaves exactly one entry in the tab order. */
        applyTabIndex(items: readonly HTMLElement[], active: HTMLElement | null): void;
    };

    /**
     * A table's columns as a package reaches them. A column is hidden by the viewer's word or, without one, by the tier the author
     * named; `setColumnHidden` writes the viewer's word (null takes it back), kept in the browser beside the widths. The table's
     * root carries `data-ui-table-hidden` — the hidden indices — while any column is hidden, which a chooser may watch.
     */
    export type TableColumns = {
        isColumnHidden(table: Element, key: string): boolean;
        setColumnHidden(table: Element, key: string, hidden: boolean | null): void;
        /** Every column's key in the order they stand in now, the viewer's own where the viewer has moved one. */
        columnOrder(table: Element): string[];
    };

    /**
     * The rows of an items host as a package reaches them — a row the server painted and a row the client built alike. `renderVariant`
     * draws one of the component's variant templates against that row's own item, bindings and all, for a part a row does not carry
     * until it is wanted: a grid's cell editor, drawn when the cell opens rather than once per row.
     */
    export type ItemRows = {
        /** The item the row stands for, or undefined when the element is not a row. */
        itemOf(row: Element): unknown;
        /**
         * The items a virtualized host holds whole, in the order its rules left them and without the ones they hid — the model the
         * rows in the page are drawn from, for a reading over all of them (a total) that the rows in the page cannot give. Null for
         * a host that keeps every row in the page, whose rows are the reading, and for a windowed one, whose source answers.
         */
        itemsOf(host: Element): readonly unknown[] | null;
        /**
         * The value at a dotted property path of an item, read as every binding reads one — by the CLR name a template carries, its
         * camel-cased wire form, or any case at all; undefined where a step is missing. A package reads its rows' values here rather
         * than by a key rule of its own.
         */
        readPath(item: unknown, path: string): unknown;
        renderVariant(row: Element, componentId: number, variantKey: string): Element | null;
    };

    /**
     * The one way a file leaves the browser, as a package reaches it: the framework's own multipart POST, answering with the
     * selection id a controller reads the file back by (`IUIUploadService.GetSelectionAsync`). Post to the endpoint yourself and
     * the path and the answer's shape become a second copy of a framework contract, which will drift from the first.
     */
    export type FileUploads = {
        uploadAsync(files: Iterable<File>, onProgress?: (percent: number) => void): Promise<{ readonly selectionId: string }>;
    };

    /**
     * The chosen rows of an items host as a package reaches them. The host owns the list — `SelectedKey`/`SelectedKeys` and the
     * binding behind them — and these only ask it to change: what a package adds is the gesture, a grid's checkbox column being the
     * first. `data-ui-no-row-select` on the host keeps the plain row click from choosing, for a host whose rows are chosen that way.
     */
    export type ItemSelection = {
        isSelected(row: Element): boolean;
        /** Adds the row to the chosen ones or takes it out, leaving the rest alone. */
        toggle(row: Element): void;
        /** Takes or clears every row named, in one write; the rows not named keep whatever they were. */
        setSelected(root: Element, rows: Iterable<Element>, selected: boolean): void;
    };

    /** What a package's engine starts from: the page's root and the services a built-in engine gets. */
    export type PluginEngineContext = {
        readonly root: ParentNode;
        readonly dom: DomRegistry;
        readonly propertyPatchEngine: PropertyPatchEngine;
        readonly strings: ClientStrings;
        readonly observeComponents: ObserveComponents;
        readonly observeSize: ObserveSize;
        readonly dialogs: Dialogs;
        readonly store: ClientStore;
        readonly numbers: NumberFormatting;
        readonly temporal: TemporalFormatting;
        readonly icons: Icons;
        readonly badges: Badges;
        readonly values: ValueReading;
        readonly properties: PropertyWriting;
        readonly windows: ItemWindows;
        readonly tooltips: Tooltips;
        readonly renames: InlineRenames;
        readonly tables: TableColumns;
        readonly rows: ItemRows;
        readonly uploads: FileUploads;
        readonly selection: ItemSelection;
        readonly popups: Popups;
        readonly roving: RovingFocus;
    };

    export type PluginEngine = (context: PluginEngineContext) => unknown;

    /**
     * What `window.NEStandardUI` holds; read it off the window with this type, since the framework's own declaration of the
     * property carries more than the contract. Every method works before the runtime exists — a registration made then waits for
     * it — so a package module may load before or after the framework's.
     */
    export type GlobalApi = {
        registerEvent<TEvent extends Event = Event>(name: string, registration?: EventRegistration<TEvent>): void;
        registerConverter(name: string, converter: ValueConverterRegistration | ((value: unknown) => unknown)): void;
        registerDomOperation(registration: DomOperationRegistration): void;
        registerEffect(registration: EffectRegistration): void;
        registerValueReader(registration: ValueReaderRegistration): void;
        registerCollectionSink(registration: CollectionSinkRegistration): void;
        /** Words the client writes itself, by key — an override of a built-in one; a package's own come from the server. */
        registerStrings(words: Readonly<Record<string, string>>): void;
        /** Starts a package's engine after every built-in one. */
        registerEngine(start: PluginEngine): void;
    };
}
