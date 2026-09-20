// The canvas's local undo stack. Stores whole documents rather than an operation log: documents are small, and an edit often
// touches several parts at once, which an op log would have to stay correct through.

const DefaultDepth = 100;

export class DocumentHistory<TDocument> {
    private readonly read: (value: unknown) => TDocument;
    private readonly depth: number;
    private readonly past: string[] = [];
    private readonly future: string[] = [];
    private present: string;
    private saved: string;

    public constructor(document: TDocument, read: (value: unknown) => TDocument, depth: number = DefaultDepth) {
        this.read = read;
        this.depth = depth;
        this.present = JSON.stringify(document);
        // What was loaded is what is saved: the canvas is clean until the viewer edits it.
        this.saved = this.present;
    }

    public get canUndo(): boolean {
        return this.past.length > 0;
    }

    public get canRedo(): boolean {
        return this.future.length > 0;
    }

    /** Whether anything has been recorded since the last `markSaved`. */
    public get dirty(): boolean {
        return this.present !== this.saved;
    }

    /** Records a document as the present one; an edit that changed nothing is not a step to undo. */
    public record(document: TDocument): void {
        const next = JSON.stringify(document);

        if (next === this.present)
            return;

        this.past.push(this.present);

        if (this.past.length > this.depth)
            this.past.shift();

        this.future.length = 0;
        this.present = next;
    }

    /** Replaces the whole history — a document the server pushed is a new beginning, not a step. */
    public reset(document: TDocument, saved: boolean): void {
        this.past.length = 0;
        this.future.length = 0;
        this.present = JSON.stringify(document);

        if (saved)
            this.saved = this.present;
    }

    /** The document now on the server: the present one, or the one a save sent if the viewer has edited since it went. */
    public markSaved(saved: string = this.present): void {
        this.saved = saved;
    }

    public undo(): TDocument | null {
        const previous = this.past.pop();

        if (previous === undefined)
            return null;

        this.future.push(this.present);
        this.present = previous;

        return this.read(JSON.parse(previous));
    }

    public redo(): TDocument | null {
        const next = this.future.pop();

        if (next === undefined)
            return null;

        this.past.push(this.present);
        this.present = next;

        return this.read(JSON.parse(next));
    }
}
