// A picture pin's file: chosen here, sent through the framework's own upload, and shown only once the server answers with what
// it was finally stored as.

import type { PluginEngineContext } from "ne-standard-ui";
import { percentText } from "../canvas/canvas-dom.ts";
import type { CanvasServices } from "../canvas/canvas-kind.ts";
import type { CanvasSettings } from "../canvas/canvas-settings.ts";
import type { GraphDocument } from "./model.ts";
import { UploadAttribute, ValueAttribute } from "./node-view.ts";

/** The event a finished upload is raised as; its keys name the node, the pin, the selection and the file. */
export const UploadEventName = "image-upload";

/** What a picture pin takes: the chooser's filter, and the judge of a file picked past it under "All files". */
const PictureAccept = "image/*";

export class NodesImageUpload {
    private readonly root: HTMLElement;
    private readonly context: PluginEngineContext;
    private readonly settings: CanvasSettings;
    private readonly nodeElements: ReadonlyMap<string, HTMLElement>;

    public constructor(services: CanvasServices<GraphDocument>) {
        this.root = services.root;
        this.context = services.context;
        this.settings = services.settings;
        this.nodeElements = services.nodeElements;
    }

    /** A file for a picture pin: chosen here, sent through the framework's own upload, and shown only once the server answers. */
    public pickImage(nodeId: string, pinName: string): void {
        if (this.settings.readOnly)
            return;

        const input = document.createElement("input");

        input.type = "file";
        input.accept = PictureAccept;
        input.addEventListener("change", () => {
            const file = input.files?.[0];

            // A file of another type is not sent, as the framework's picture field takes none.
            if (file !== undefined && this.context.uploads.accepts(PictureAccept, file))
                void this.uploadImage(nodeId, pinName, file);
        });

        input.click();
    }

    private async uploadImage(nodeId: string, pinName: string, file: File): Promise<void> {
        // Looked up at every mark, since a redraw while the file is uploading replaces the node's elements; a mark on the old one would go unseen.
        this.markUpload(nodeId, pinName, 0);

        try {
            const selection = await this.context.uploads.uploadAsync([file], percent => this.markUpload(nodeId, pinName, percent));

            this.announce(nodeId, pinName, selection.selectionId, file.name);
        }
        catch {
            // The mark stays until the node is drawn again, so a failure is not silent while nothing else has changed.
            this.editorOf(nodeId, pinName)?.setAttribute(UploadAttribute, this.context.strings.text("ui.graph.upload-failed"));
        }
    }

    /** Hands the server a file that has landed for a picture pin — sent here, or by the framework's picture field on the node. */
    public announce(nodeId: string, pinName: string, selectionId: string, fileName: string): void {
        // Four keys, in the order UIGraphArguments reads them: the node, the pin, the selection and the file's name.
        this.root.dispatchEvent(new CustomEvent(UploadEventName, {
            bubbles: true,
            detail: { keys: [nodeId, pinName, selectionId, fileName] }
        }));
    }

    /** The share of the file sent, on the pin's editor, in the page's word for a percent (`ui.graph.percent`). */
    private markUpload(nodeId: string, pinName: string, percent: number): void {
        const editor = this.editorOf(nodeId, pinName);

        editor?.setAttribute(UploadAttribute, percentText(this.context, editor, percent));
    }

    private editorOf(nodeId: string, pinName: string): HTMLElement | null {
        return this.nodeElements.get(nodeId)?.querySelector<HTMLElement>(`[${ValueAttribute}="${CSS.escape(pinName)}"]`) ?? null;
    }
}
