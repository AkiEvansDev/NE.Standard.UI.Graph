// The run panel in the canvas's top corner: Run and Run all save the sheet under a run's reason, which the save command hands to
// `UINodeRuns`; Stop raises `run-stop` during a run. The server marks a run's start and end (`SetRunningEffect`), so a Run all's many
// runs read as one.

import type { CanvasServices } from "../canvas/canvas-kind.ts";
import type { GraphDocument } from "./model.ts";

// `UIGraphArguments.RunReason` and `RunAllReason` on the server.
const RunReason = "graph.run";
const RunAllReason = "graph.run-all";
// `GraphEvents.RunStop` on the server.
export const StopEventName = "run-stop";
// On the root from the press until the run ends, for an application's own style; the panel's buttons hold meanwhile.
const RunningClass = "ui-graph--running";

export class NodesRunPanel {
    private readonly services: CanvasServices<GraphDocument>;
    private readonly once: HTMLButtonElement | null;
    private readonly all: HTMLButtonElement | null;
    private readonly stop: HTMLButtonElement | null;
    // A Run pressed and no word yet from the server; the save's answer lets it go if no run began.
    private asked = false;
    private running = false;
    private readonly cleanups: (() => void)[] = [];

    public constructor(services: CanvasServices<GraphDocument>) {
        this.services = services;
        this.once = services.root.querySelector<HTMLButtonElement>("[data-ui-graph-run-once]");
        this.all = services.root.querySelector<HTMLButtonElement>("[data-ui-graph-run-all]");
        this.stop = services.root.querySelector<HTMLButtonElement>("[data-ui-graph-run-stop]");

        this.listen();
        this.draw();
    }

    public listen(): void {
        if (this.cleanups.length > 0)
            return;

        const onOnce = (): void => this.start(RunReason);
        const onAll = (): void => this.start(RunAllReason);
        const onStop = (): void => this.stopRun();

        this.once?.addEventListener("click", onOnce);
        this.all?.addEventListener("click", onAll);
        this.stop?.addEventListener("click", onStop);
        this.cleanups.push(
            () => this.once?.removeEventListener("click", onOnce),
            () => this.all?.removeEventListener("click", onAll),
            () => this.stop?.removeEventListener("click", onStop)
        );
    }

    public dispose(): void {
        for (const cleanup of this.cleanups)
            cleanup();

        this.cleanups.length = 0;
    }

    /** The server's word that a run has begun or ended. */
    public setRunning(running: boolean): void {
        this.running = running;
        this.asked = false;
        this.draw();
    }

    /**
     * A save answered: the panel's own, which the server began no run for — a save command that does not hand it on, a run already
     * under way — frees the panel again. Another save's answer says nothing of the run asked for.
     */
    public saveCompleted(reason: string): void {
        if (!this.asked || (reason !== RunReason && reason !== RunAllReason))
            return;

        this.asked = false;
        this.draw();
    }

    private start(reason: string): void {
        // The buttons refuse the press while held (the framework's disabled mark); this holds for a caller that clicks them anyway.
        if (this.asked || this.running || this.services.context.states.isInert(this.services.root))
            return;

        this.asked = true;
        this.draw();
        this.services.documentState.requestSave(reason);
    }

    private stopRun(): void {
        if (!this.running || this.services.context.states.isInert(this.services.root))
            return;

        this.services.root.dispatchEvent(new CustomEvent(StopEventName, { bubbles: true }));
    }

    /** Each button held or free the framework's way — marked, never `disabled` — so the one the keyboard pressed keeps the focus. */
    private draw(): void {
        const busy = this.asked || this.running;

        const states = this.services.context.states;

        if (this.once !== null)
            states.setDisabled(this.once, busy);

        if (this.all !== null)
            states.setDisabled(this.all, busy);

        if (this.stop !== null)
            states.setDisabled(this.stop, !this.running);

        this.services.root.classList.toggle(RunningClass, busy);
    }
}
