// The document on the canvas, its undo history, and the moment it travels to the server; every edit — the viewer's own or one
// the server pushed — goes through here, so undo and the dirty mark cover all of them alike.

import type { ValueReading } from "ne-standard-ui";
import { DocumentHistory } from "./history.ts";
import type { CanvasDocument } from "./canvas-model.ts";
import { readJson } from "./canvas-model.ts";
import { DocumentAttribute } from "./canvas-dom.ts";
import type { CanvasSettings } from "./canvas-settings.ts";

/** What the document state calls back into the coordinator for: a redraw, and clearing the viewer's current choice. */
export type DocumentStateCallbacks = {
    readonly clearSelectionSets: () => void;
    readonly redraw: () => void;
    readonly redrawEdges: () => void;
};

/** The document, its history, and the save that carries it to the server; every other concern edits through this one. */
export class CanvasDocumentState<TDocument extends CanvasDocument> {
    private readonly root: HTMLElement;
    private readonly valueElement: HTMLElement;
    private readonly settings: CanvasSettings;
    private readonly callbacks: DocumentStateCallbacks;
    private readonly values: ValueReading;

    private documentValue: TDocument;
    /** Counts every change of the document, edit and replacement alike: a reader compares it rather than the document's text. */
    public version = 0;
    private readonly history: DocumentHistory<TDocument>;
    // The document a save put on the wire, held until the command answers: the canvas is clean only when the server has it.
    private sent: string | null = null;
    // A save asked for while one was on its way, by its reason: it goes when the first has answered, rather than being dropped.
    private queuedSave: string | null = null;

    public constructor(root: HTMLElement, valueElement: HTMLElement, settings: CanvasSettings, read: (value: unknown) => TDocument, callbacks: DocumentStateCallbacks, values: ValueReading) {
        this.root = root;
        this.valueElement = valueElement;
        this.settings = settings;
        this.callbacks = callbacks;
        this.values = values;
        this.documentValue = read(readJson(this.valueElement.getAttribute(DocumentAttribute)));
        this.history = new DocumentHistory(this.documentValue, read);
    }

    public get document(): TDocument {
        return this.documentValue;
    }

    /** Replaces the document with one from the server and restarts undo history; the framework never delivers one while dirty. */
    public load(document: TDocument): void {
        // The server echoes the saved document straight back; resetting history for it would end the history at every save.
        if (JSON.stringify(document) === JSON.stringify(this.documentValue)) {
            this.history.markSaved();
            this.markClean();

            return;
        }

        this.documentValue = document;
        this.version++;
        this.history.reset(document, true);
        this.callbacks.clearSelectionSets();
        this.markClean();
        this.callbacks.redraw();
    }

    /** Records the document as a step, then redraws; every edit goes through here so undo covers all of them. */
    public edited(redrawNodes = true): void {
        this.history.record(this.documentValue);
        this.version++;
        this.showDirty();

        if (redrawNodes)
            this.callbacks.redraw();
        else
            this.callbacks.redrawEdges();
    }

    /** The one moment the value travels: the document goes onto the value element and `change` carries it to the server. */
    public save(reason = ""): void {
        if (this.settings.readOnly)
            return;

        // Only one save is in flight at a time; a second is queued rather than sent, so its answer doesn't clear the first's
        // bookkeeping before the first has answered.
        if (this.sent !== null) {
            this.queuedSave = reason;
            return;
        }

        const sent = JSON.stringify(this.documentValue);

        this.valueElement.setAttribute(DocumentAttribute, sent);
        this.valueElement.dispatchEvent(new Event("change", { bubbles: true }));

        // Still dirty, and marked as being sent: what was saved is what the server took, which it has not said yet.
        this.sent = sent;
        this.root.classList.add("ui-graph--saving");
        this.raiseSave(reason);
    }

    /** The event a command waits on; its one key says what the save was for, so a handler can tell Ctrl+S from a run. */
    private raiseSave(reason: string): void {
        this.valueElement.dispatchEvent(new CustomEvent("save", { bubbles: true, detail: { reason } }));
    }

    /** Saves at the server's request, for a command that needs the sheet as shown rather than the last committed one (`SaveDocumentEffect`). */
    public requestSave(reason: string): void {
        // Read-only: nothing on the canvas can differ from what the server holds, so the event goes with no value behind it.
        if (this.settings.readOnly)
            this.raiseSave(reason);
        else
            this.save(reason);
    }

    /** The save command has answered: what it took is clean, and anything edited since it went is not. */
    public saveCompleted(success: boolean): void {
        const sent = this.sent;

        this.sent = null;
        this.root.classList.remove("ui-graph--saving");

        if (success && sent !== null) {
            this.history.markSaved(sent);
            this.showDirty();
        }

        const queued = this.queuedSave;

        if (queued !== null) {
            this.queuedSave = null;
            this.save(queued);
        }
    }

    /** Marks the canvas dirty and holds/releases the value against a framework push accordingly; held while a save is in flight. */
    private showDirty(): void {
        const dirty = this.history.dirty;
        const wasDirty = this.root.classList.contains("ui-graph--dirty");

        this.root.classList.toggle("ui-graph--dirty", dirty);

        if (dirty)
            this.values.hold(this.valueElement);
        else if (wasDirty && this.sent === null)
            this.values.release(this.valueElement);
    }

    private markClean(): void {
        this.sent = null;
        this.root.classList.remove("ui-graph--dirty", "ui-graph--saving");
    }

    public undo(): TDocument | null {
        return this.history.undo();
    }

    public redo(): TDocument | null {
        return this.history.redo();
    }

    /** What undo or redo landed on becomes the present document; neither touches the viewer's choice. */
    public replay(document: TDocument): void {
        this.documentValue = document;
        this.version++;
        this.showDirty();
        this.callbacks.redraw();
    }
}
