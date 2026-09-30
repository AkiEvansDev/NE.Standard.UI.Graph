// The plugin contract: `window.NEStandardUI` and what its registrations hand a package back. A package keeps a byte-for-byte copy
// in its tsconfig (PluginApiSyncTests refuses one that differs), and src/runtime/plugin-api-check.ts holds the runtime to these
// shapes, so this cannot promise what the runtime does not do. Only what a package is meant to reach is declared.

declare module "ne-standard-ui" {
    /** The contract's version, moved by a breaking change: a package checks `GlobalApi.contractVersion` first, so a stale copy fails loudly. */
    export type ContractVersion = 2;

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

    /** A sink for the kind a root's `data-ui-collection-sink` names: its bound collection reaches the handler as values, not rows. */
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
        /** Told what became of the command this event raised, whatever happened — never sent, failed, or cut by a dropped connection. */
        completed?(context: EventCompletionContext<TEvent>): void;
        attach?(context: EventAttachContext): void;
    };

    /** The rendered components by id, as the page holds them. */
    export type DomRegistry = {
        /** The element's id, or one from the page's single run of ids, so a package's `aria-` target never collides with the framework's. */
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

    /** The page's words in its language — a package's `IUIStringsSource` among them — which a language switch replaces in place. */
    export type ClientStrings = {
        text(key: string): string;
        /** The word with its `{name}` placeholders filled: a numeric `count` picks the plural, a `{ text }` resolves as `resolveText`. */
        format(key: string, values: Readonly<Record<string, string | number | { readonly text: string }>>): string;
        /** An author's text as shown: looked up as a plain value (under key prefixes only a prefixed one), else itself; `WebWords.WriteText`. */
        resolveText(text: string): string;
        /** Writes a word on an attribute, or the text where `attribute` is null, marked with its key so a language switch rewrites it. */
        write(element: Element, attribute: string | null, key: string, args?: Readonly<Record<string, unknown>> | null): void;
        /** Hears every change of the words after the framework rewrote its own, for words `write` did not mark; answers the stop. */
        onChange(handler: () => void): () => void;
    };

    export type SubtreeObserverInit = {
        readonly childList?: boolean;
        readonly characterData?: boolean;
        readonly attributeFilter?: readonly string[];
        /** Which records the engine answers at all; the rest are skipped before their components are looked for. Default: every one. */
        readonly relevant?: (mutation: MutationRecord) => boolean;
    };

    /** The one observer shape: which components under `root` a batch of mutations touched, whole components at a time. */
    export type ObserveComponents = (
        root: ParentNode,
        selector: string,
        init: SubtreeObserverInit,
        handler: (components: Iterable<HTMLElement>) => void
    ) => MutationObserver | null;

    /** Calls back whenever an element's box changes; returns what stops it. The first size is the caller's to read. */
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

    /** Numbers as the server formats them: the nearest culture pack, and a value by a standard format (`N`, `F`, `C`, `P`, `D`). */
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

    /** A moment as the wire writes it: the wall clock with no zone, since the server writes a value by its own clock. */
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

    /** Dates as the server formats them, and wire text read back — never by `new Date(text)`, which shifts it by the reader's zone. */
    export type TemporalFormatting = {
        readCulture(element: Element): TemporalCulturePack;
        /** No format is the invariant round-trip form; a token outside the subset is written as it is. */
        format(value: Date, format: string | null | undefined, culture: TemporalCulturePack): string;
        /** The wall clock of a `yyyy-MM-dd[T| ]clock` text, a zone ignored; null for text naming no moment, a field out of range included. */
        parse(text: string): WrittenMoment | null;
        /** The moment as a local date whose own fields read the written clock, which `format` writes back as the same text. */
        toDate(moment: WrittenMoment): Date;
    };

    /** Icons on a package's own elements, written as a renderer writes them; a package composes no icon class of its own. */
    export type Icons = {
        /** The `ui-icon` box, the glyph's class or the picture's (its form and its `--ui-icon-url`), and the icon mark; a value naming nothing writes no mark, and clears one. */
        apply(element: Element, value: unknown): void;
    };

    /** Badges a package counts on itself — a filter count, a log count — on a badge a renderer drew. */
    export type Badges = {
        /** Writes the count and the renderer's fit: round while it is up to two characters. */
        writeCount(badge: Element, count: number): void;
    };

    /** Addresses judged by the framework's own rule, each read as the browser's URL parser reads it; a package keeps no copy of it. */
    export type Urls = {
        /** Whether a picture may be fetched from an address: a path of this site, http(s) or an image data URL — never `//host`, `/\host` or `/<tab>/host`, which the browser reads as another site. */
        isImageSource(address: string): boolean;
        /** The address as the browser reads it: the controls and spaces at either end stripped, and every tab and line break inside. */
        asBrowserReads(address: string): string;
    };

    /** Values as the framework reads and writes them: a root reads off its `data-ui-value-holder`, not a composed control's first field. */
    export type ValueReading = {
        /** The value as its binding would send it: a number field answers its invariant text ("1234.5"), never what it shows in its culture. */
        read(element: Element): unknown;
        /** Holds an editor's unsaved value until its `change` or form submit sends it: a push meanwhile neither lands nor is told. */
        hold(element: Element): void;
        /** Lets a held value go, and puts the server's latest value back into the element: the unsaved work is gone. */
        release(element: Element): void;
        /** Writes a value into a bound element as its binding writes a push, a `rows.renderVariant` part included; false where none writes. */
        write(element: Element, value: unknown): boolean;
    };

    /** Sets a core component's property the package's renderer exposed (`RenderRegion`) as a push does; false, warned, for one not exposed. */
    export type PropertyWriting = {
        set(element: Element, propertyName: string, value: unknown): boolean;
    };

    /** Windowed hosts: a `data-ui-window-paged` one follows a pager, not its scroll, and loads the window starting at `offset`. */
    export type ItemWindows = {
        requestOffsetAsync(host: Element, offset: number): Promise<void>;
    };

    export type TooltipShowOptions = {
        /** Waits as a hover does, for words following a passing pointer (a crosshair); unset, at once. A shown target's words change in place. */
        readonly delay?: boolean;
    };

    /** The page's one tooltip, for a picture with no element per thing: words against a target, closed by `hide` or pointing elsewhere. */
    export type Tooltips = {
        show(target: Element, words: string, options?: TooltipShowOptions): void;
        hide(): void;
    };

    export type InlineRenameOptions = {
        /** The positioned element the field is appended to; the title must be inside it. */
        readonly container: HTMLElement;
        /** The title the field covers, hidden while the field is open. */
        readonly title: HTMLElement;
        /** Dressed by the package's stylesheet with `.ui-inline-rename-field()`. */
        readonly className: string;
        /** The text the field starts with; a commit that leaves it unchanged is not a change. */
        readonly value: string;
        readonly commit: (value: string) => void;
        /** Whether an emptied field commits as an empty name, for a title that falls back to one of its own; unset, it is refused. */
        readonly allowEmpty?: boolean;
        /** Runs after the field closes, committed or not. */
        readonly done?: () => void;
        /** Gives the focus back after Enter or Escape only: after a commit by leaving, it would take the focus from what was clicked. */
        readonly refocus?: () => void;
    };

    /** The framework's rename field over a title: committed by Enter or leaving, dropped by Escape; false when one is open in the container. */
    export type InlineRenames = {
        open(options: InlineRenameOptions): boolean;
    };

    /** Preferred side for a popup, not a demand — a side with no room flips to its opposite. */
    export type PopupPlacement =
        | "top-start" | "top" | "top-end"
        | "bottom-start" | "bottom" | "bottom-end"
        | "left-start" | "left" | "left-end"
        | "right-start" | "right" | "right-end";

    /** Why the framework closed a popup; `focus`: the keyboard left popup and owner; `owner`: it turned disabled, loading, read-only or left. */
    export type PopupDismissReason = "outside" | "escape" | "blur" | "focus" | "owner";

    export type PopupOptions = {
        readonly placement: PopupPlacement;
        /** Distance between anchor and popup along the main axis, in pixels. */
        readonly gap: number;
        /** Makes the popup at least as wide as the anchor before measuring, wider when its content asks, for dropdown-shaped popups. */
        readonly minAnchorWidth?: boolean;
        /** Aligns the popup along the cross axis to this element instead of the anchor. */
        readonly crossAnchor?: Element;
        /** The popup draws an arrow, so it may shift along the cross axis for the arrow to reach a small anchor's centre. */
        readonly arrow?: boolean;
        /** The component whose state decides whether the popup stays; unset, the anchor — or the popup itself for a non-HTML anchor. */
        readonly owner?: HTMLElement;
        /** Told when the framework itself closes the popup, and why; a caller's own `close()` does not raise it. */
        readonly onDismiss: (reason: PopupDismissReason) => void;
    };

    /** What opening a popup hands back. */
    export type PopupHandle = {
        /** Re-measures the popup against its anchor — for content that changed size in a way a `ResizeObserver` would not catch. */
        reposition(): void;
        /** Closes the popup; does not run `onDismiss`, since the caller already knows why. */
        close(): void;
    };

    /** A package's non-modal panel, closed as the framework's popups are (the anchor counts as inside); a modal chooser is a `<dialog>`. */
    export type Popups = {
        /**
         * Places the package's element (on the page, `position: fixed`, dressed with `.ui-popup-surface()`); closing leaves it in place.
         * One per owner: a second replaces the first without its `onDismiss`. An owner that cannot keep it gets `onDismiss("owner")`.
         */
        open(anchor: Element, popup: HTMLElement, options: PopupOptions): PopupHandle;
        /**
         * Where the focus goes back as a package's surface closes or goes: the opener, the nearest focusable around it, else its
         * component's root, made focusable for that one return — never the body; null where nothing of the opener is left.
         */
        focusReturn(opener: HTMLElement | null): HTMLElement | null;
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

    /** Arrowing among a package's entries as the framework's lists do: the axis's arrows, Home and End; hidden or disabled ones skipped. */
    export type RovingFocus = {
        /** The entry the key moves to (an unknown current enters at the near end); null for a key that is no move. */
        target(request: RovingRequest): HTMLElement | null;
        /** Leaves exactly one entry in the tab order. */
        applyTabIndex(items: readonly HTMLElement[], active: HTMLElement | null): void;
    };

    /** A table's columns: hidden by the viewer's word, else the author's tier; the root carries `data-ui-table-hidden` while any is. */
    export type TableColumns = {
        isColumnHidden(table: Element, key: string): boolean;
        /** Writes the viewer's word, kept in the browser beside the widths; null takes it back. */
        setColumnHidden(table: Element, key: string, hidden: boolean | null): void;
        /** Every column's key in the order they stand in now, the viewer's own where the viewer has moved one. */
        columnOrder(table: Element): string[];
    };

    /** An items host's rows, whether the server painted them or the client built them. */
    export type ItemRows = {
        /** The item the row stands for, or undefined when the element is not a row. */
        itemOf(row: Element): unknown;
        /** A virtualized host's items as its rules order and filter them, for a total; null where the page's rows or a window's source answer. */
        itemsOf(host: Element): readonly unknown[] | null;
        /** An item's value at a dotted path, read as a binding reads it (CLR name, camel case, any case); undefined at a missing step. */
        readPath(item: unknown, path: string): unknown;
        /** Draws a variant template against the row's item, for a part drawn only when wanted (a cell editor); `values.write` sets it. */
        renderVariant(row: Element, componentId: number, variantKey: string): Element | null;
        /** Whether the row keyboard answers a key here: the host or its rows, not its chrome; a row's own control is the caller's call. */
        isKeyTarget(target: Element): boolean;
    };

    /** The one way a file leaves the browser, answering the id `IUIUploadService.GetSelectionAsync` reads; a POST of your own would drift. */
    export type FileUploads = {
        uploadAsync(files: Iterable<File>, onProgress?: (percent: number) => void): Promise<{ readonly selectionId: string }>;
    };

    /** Asks an items host, which owns the list, to change its chosen rows; `data-ui-no-row-select` keeps a plain row click from choosing. */
    export type ItemSelection = {
        isSelected(row: Element): boolean;
        /** Adds the row to the chosen ones or takes it out, leaving the rest alone. */
        toggle(row: Element): void;
        /** Takes or clears every row named in one write, the rest left alone; a row a filter hides is not taken. */
        setSelected(root: Element, rows: Iterable<Element>, selected: boolean): void;
        /** The same by key, for rows a virtualized host has not drawn: every key named is taken or cleared in one write. */
        setSelectedKeys(root: Element, keys: Iterable<string>, selected: boolean): void;
    };

    /** The predicate every refusal reads: a disabled or loading root stays focusable while its inside is inert, so a root's engine asks here. */
    export type ComponentStates = {
        /** Itself natively or `aria-` disabled, or inside a disabled, loading or inert component. */
        isInert(element: Element): boolean;
        /** Under a read-only input, by the nearest root's mark so a nested component answers for itself; focusable, changing nothing. */
        isReadOnly(element: Element): boolean;
        /**
         * Turns a package's control off: the disabled mark and `aria-disabled`, never native `disabled`, which drops the focus.
         * A row's checkbox is marked on its input, or the whole row would read as disabled.
         */
        setDisabled(element: Element, disabled: boolean): void;
    };

    /** A field's severity as the framework's validation weighs it: an error refuses the value, a warning and a note only speak. */
    export type ValidationSeverity = "error" | "warning" | "info";

    /** A mark's words: a key filled from `args`, or an author's `{ text }` read as `strings.resolveText` reads it. */
    export type ValidationWords = { readonly key: string; readonly args?: Readonly<Record<string, unknown>> | null } | { readonly text: string };

    /** A package's field marked through the framework's validation engine, weighed with its other messages; it gates no submit. */
    export type FieldValidation = {
        /** Marks a field's root, rendered or drawn in the framework's classes; a null severity takes the package's mark off. */
        mark(field: Element, severity: ValidationSeverity | null, words?: ValidationWords | null): void;
    };

    /** How far a wheel event turned on each axis, in pixels, signed as its deltas are. */
    export type WheelPixels = {
        readonly x: number;
        readonly y: number;
    };

    /** The wheel in pixels: a mouse notch is `notch`, a line a third of it; a package scales pixels itself and counts no events. */
    export type WheelReading = {
        readonly notch: 100;
        /** The event's turn in pixels; a page counts `pagePixels`, a line unless the caller says. */
        pixels(event: Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode">, pagePixels?: number): WheelPixels;
    };

    /** Names the framework writes and a package reads, spelled once so a rename reaches the package. */
    export type DomNames = {
        /** A component's root. */
        readonly componentId: "data-ui-id";
        /** An item's row, carrying its key. */
        readonly key: "data-ui-key";
        /** A chosen row. */
        readonly selected: "data-ui-selected";
        /** The chosen key, on a host that chooses one (an items host's root, a tab strip's). */
        readonly selectedKey: "data-ui-selected-key";
        /** The chosen keys as JSON, on a host that chooses many (an items host's rows, drawn or not). */
        readonly selectedKeys: "data-ui-selected-keys";
        /** On an item's row: the item refuses to be chosen (`CanSelect = false`). */
        readonly unselectable: "data-ui-unselectable";
        /** The row the keyboard is on in a host with rows. */
        readonly rowFocus: "data-ui-row-focus";
        /** The element an items host draws its rows into. */
        readonly itemsHost: "data-ui-items-host";
        /** The one element a composed control keeps its value on. */
        readonly valueHolder: "data-ui-value-holder";
        /** The binding a value is written through, on the element carrying the value. */
        readonly bindValue: "data-ui-bind-value";
        /** A part of a row whose double click is its own, not the row's open. */
        readonly noRowOpen: "data-ui-no-row-open";
        /** A part of a row a press in never drags the row by (a grid's open detail), where the host's rows drag. */
        readonly noRowDrag: "data-ui-no-row-drag";
        /** An element no event crosses outward: a component above it never takes an event raised inside it. */
        readonly eventBoundary: "data-ui-event-boundary";
        /** A focusable layer a package draws (a canvas, a panel over it) that takes the keyboard back from a field in it on Enter or Escape. */
        readonly focusHolder: "data-ui-focus-holder";
        /** A component's tooltip words, and where they show. */
        readonly tooltip: "data-ui-tooltip";
        readonly tooltipPlacement: "data-ui-tooltip-placement";
        /** A context menu's host, and a part naming which of its owner's menus a right press there opens. */
        readonly contextMenu: "data-ui-context-menu";
        readonly contextMenuUse: "data-ui-context-menu-use";
        /** A component's root while disabled, loading, or read-only. */
        readonly disabledClass: "ui-disabled";
        readonly loadingClass: "ui-loading";
        readonly readOnlyClass: "ui-readonly";
        /** A row a filter keeps out of view. */
        readonly hiddenClass: "ui-hidden";
        /** A button's root, drawn by the framework or by a package in its classes. */
        readonly buttonClass: "ui-button";
        /** The root of a select, a multi-select or a search. */
        readonly selectClass: "ui-select";
        /** A text input's root. */
        readonly textInputClass: "ui-text-input";
        /** On a field whose value was refused (a validation error). */
        readonly invalidClass: "ui-invalid";
        /** A rendered line's number in its source (a Markdown block), which a scroll group follows. */
        readonly sourceLine: "data-ui-source-line";
        /** What a popup a field opened is to a screen reader: a key landing in one is the popup's. */
        readonly popupSelector: "[role='listbox'], [role='menu'], [role='dialog']";
        /** The control that opens a select's, a multi-select's or a search's list: a button in the first two, the field's row in a search. */
        readonly listTriggerSelector: ".ui-select__trigger";
        /** A table's row, its scrolling box, its header row and a column's resizer. */
        readonly tableRowClass: "ui-table__row";
        readonly tableScrollClass: "ui-table__scroll";
        readonly tableHeaderClass: "ui-table__header";
        readonly tableResizerClass: "ui-table__resizer";
        /** On a table's root: the indices of the columns hidden now. */
        readonly tableHidden: "data-ui-table-hidden";
        /** On an items host: how it holds its rows (all of them, virtualized, windowed). */
        readonly hostMode: "data-ui-host-mode";
        /** A windowed host's window: where it starts, the source's total, its size, whether more follow, and the totals as JSON. */
        readonly windowOffset: "data-ui-window-offset";
        readonly windowTotal: "data-ui-window-total";
        readonly windowSize: "data-ui-window-size";
        readonly windowMoreAfter: "data-ui-window-more-after";
        readonly windowAggregates: "data-ui-window-aggregates";
        /** A host's query, as JSON, on the element carrying it, and that element's value kind. */
        readonly itemsQuery: "data-ui-items-query";
        readonly valueKind: "data-ui-value-kind";
        readonly itemsQueryKind: "items-query";
        /** A menu's entry, what kind it is (`check`, `header`, …), and a check entry turned on. */
        readonly menuItemClass: "ui-menu-item";
        readonly menuItemKind: "data-ui-menu-item-kind";
        readonly menuItemCheckedClass: "ui-menu-item--checked";
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
        readonly urls: Urls;
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
        readonly states: ComponentStates;
        readonly validation: FieldValidation;
        readonly wheel: WheelReading;
        readonly names: DomNames;
    };

    export type PluginEngine = (context: PluginEngineContext) => unknown;

    /**
     * What `window.NEStandardUI` holds, read with this type (the framework's own declaration carries more); a registration made
     * before the runtime exists waits for it, so a package may load first.
     */
    export type GlobalApi = {
        /** The version of this contract the framework's client implements. */
        readonly contractVersion: ContractVersion;
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
