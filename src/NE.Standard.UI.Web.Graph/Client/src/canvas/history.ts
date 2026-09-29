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

    /** Records a document as the present one and answers whether it was a step; an edit that changed nothing is not one. */
    public record(document: TDocument): boolean {
        const next = JSON.stringify(document);

        if (next === this.present)
            return false;

        this.past.push(this.present);

        if (this.past.length > this.depth)
            this.past.shift();

        this.future.length = 0;
        this.present = next;

        return true;
    }

    /**
     * Takes what the canvas changed on its own since the last step — a layout placing what it had not placed yet — into that step
     * rather than a step of its own, so a save of it leaves the canvas clean.
     */
    public absorb(document: string): void {
        this.present = document;
    }

    /**
     * Writes a change the server already holds — a node's state as a run left it — into every step behind and ahead and into what
     * is saved, so neither undo nor redo takes the canvas back to a value the server has moved on from.
     */
    public commit(change: (document: TDocument) => void): void {
        for (let index = 0; index < this.past.length; index++)
            this.past[index] = rewrite(this.past[index], change);

        for (let index = 0; index < this.future.length; index++)
            this.future[index] = rewrite(this.future[index], change);

        this.saved = rewrite(this.saved, change);
    }

    /** The present step, read afresh, when a document strayed from it — what a refused edit puts back; null when it did not stray. */
    public revert(document: TDocument): TDocument | null {
        return JSON.stringify(document) === this.present ? null : this.read(JSON.parse(this.present));
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

/**
 * One stored document with a change made to it, as the text it was kept as: read back as plain JSON rather than through the kind's
 * reader, which would rewrite a document the change left alone into text of another shape.
 */
export function rewrite<TDocument>(snapshot: string, change: (document: TDocument) => void): string {
    const document = JSON.parse(snapshot) as TDocument;

    change(document);

    return JSON.stringify(document);
}
