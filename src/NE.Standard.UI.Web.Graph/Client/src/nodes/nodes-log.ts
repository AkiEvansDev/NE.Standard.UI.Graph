// What the server's effects paint but the document never carries: node state/progress, a display pin's value, the log, and the
// run line. One channel, since the run line reads both the log's failures and the running node.

import type { PluginEngineContext } from "ne-standard-ui";
import { CoreNames, percentText } from "../canvas/canvas-dom.ts";
import type { CanvasServices } from "../canvas/canvas-kind.ts";
import { focusAfterRemoval } from "../canvas/side-panel.ts";
import { showDisplayValue } from "./display.ts";
import { findPin, showsPicture } from "./model.ts";
import type { GraphDocument, NodeType } from "./model.ts";
import { DisplayAttribute, displayOptions, NodeStateAttribute, ValueAttribute } from "./node-view.ts";

/** On a log line's node name: the node the line came from, which a press takes the view to. */
export const LogNodeAttribute = "data-ui-graph-log-node";
const LogOpenAttribute = "data-ui-graph-log-open";
const RunStateAttribute = "data-ui-graph-run-state";
// Enough to read back through a long run, few enough that a node writing in a loop cannot swell the page.
const LogLimit = 500;
// `GraphStrings.RunLine` on the server: a node's name and what it said, on the run line.
const RunLineKey = "ui.graph.run-line";

/**
 * What a run says, as the server's `UIPhrase` travels: a word with its arguments (`{ key, args }`), a node's own text (`{ text }`),
 * or nothing.
 */
type Said = unknown;

type NodeStatus = { readonly state: string; readonly progress: number | null; readonly message: Said };

type LogEntry = { readonly nodeId: string; readonly level: string; readonly message: Said; readonly at: Date };

export class NodesLog {
    private readonly root: HTMLElement;
    private readonly context: PluginEngineContext;
    private readonly services: CanvasServices<GraphDocument>;
    private readonly types: ReadonlyMap<string, NodeType>;

    private readonly runLine: HTMLElement | null;
    private readonly runLabel: HTMLElement | null;
    private readonly runShare: HTMLElement | null;
    private readonly logPanel: HTMLElement | null;
    private readonly logEntries: HTMLElement | null;
    private readonly logToggle: HTMLElement | null;
    private readonly logCount: HTMLElement | null;

    // The log is the canvas's own and nothing of it is saved: it lives as long as the page, and a run that begins clears it.
    private readonly log: LogEntry[] = [];
    // The run as reported: progress, whether any node failed, and the one node running now (its own steps draw the line's lower
    // half); runs are sequential, and the line keeps the last run's end until the next begins.
    private runStarted = false;
    private runCompleted = 0;
    private runTotal = 0;
    private runFailed = false;
    private runStopped = false;
    private runningNode: string | null = null;

    private readonly statuses = new Map<string, NodeStatus>();
    private readonly displays = new Map<string, Map<string, unknown>>();

    public constructor(services: CanvasServices<GraphDocument>, types: ReadonlyMap<string, NodeType>) {
        const root = services.root;

        this.root = root;
        this.context = services.context;
        this.services = services;
        this.types = types;
        this.runLine = root.querySelector<HTMLElement>("[data-ui-graph-run]");
        this.runLabel = root.querySelector<HTMLElement>("[data-ui-graph-run-label]");
        this.runShare = root.querySelector<HTMLElement>("[data-ui-graph-run-share]");
        this.logPanel = root.querySelector<HTMLElement>("[data-ui-graph-log]");
        this.logEntries = root.querySelector<HTMLElement>("[data-ui-graph-log-entries]");
        this.logToggle = root.querySelector<HTMLElement>("[data-ui-graph-log-toggle]");
        this.logCount = root.querySelector<HTMLElement>("[data-ui-graph-log-count]");
    }

    // --- statuses and node redraws ------------------------------------------------------------------------------------------

    /** Every status and display the nodes on the sheet still carry, applied once they are redrawn afresh; a gone node loses its. */
    public reapplyToRedrawnNodes(drawn: ReadonlySet<string>): void {
        for (const [id, status] of this.statuses) {
            if (drawn.has(id))
                this.applyStatus(id, status);
            else
                this.statuses.delete(id);
        }

        for (const [id, pins] of this.displays) {
            if (!drawn.has(id)) {
                this.displays.delete(id);
                continue;
            }

            for (const [pinName, value] of pins)
                this.applyDisplay(id, pinName, value);
        }
    }

    /** A node's state, progress and message; idle with nothing to say clears the line, and a redraw writes it again. */
    public setStatus(nodeId: string, state: string, progress: number | null, message: Said): void {
        const status: NodeStatus = { state: state.toLowerCase(), progress, message };

        if (status.state === "idle" && progress === null && this.said(message).length === 0)
            this.statuses.delete(nodeId);
        else
            this.statuses.set(nodeId, status);

        if (status.state === "running")
            this.runningNode = nodeId;
        else if (this.runningNode === nodeId)
            this.runningNode = null;

        if (status.state === "error")
            this.runFailed = true;

        this.applyStatus(nodeId, status);
        this.drawRun();
    }

    private applyStatus(nodeId: string, status: NodeStatus): void {
        const node = this.services.nodeElements.get(nodeId);

        if (node === undefined)
            return;

        // Only a kind that asked for one carries it, so there is often none at all.
        const bar = node.querySelector<HTMLElement>(".ui-graph__node-progress");

        // The node's frame alone says its state; any message goes to the run line or the log, since a line inside the node would shove its pins around.
        node.setAttribute(NodeStateAttribute, status.state);

        if (bar === null)
            return;

        // The line belongs to the running: when the node is done, failed or skipped it goes, rather than standing full.
        bar.hidden = status.state !== "running" || status.progress === null;

        if (status.progress !== null)
            bar.style.setProperty("--ui-graph-progress", String(Math.min(1, Math.max(0, status.progress))));
    }

    /** What one display pin shows; nothing of it is saved, so the document is not touched, and a redraw shows it again. */
    public setDisplay(nodeId: string, pinName: string, value: unknown): void {
        let pins = this.displays.get(nodeId);

        if (pins === undefined) {
            pins = new Map<string, unknown>();
            this.displays.set(nodeId, pins);
        }

        pins.set(pinName, value);
        this.applyDisplay(nodeId, pinName, value);
    }

    private applyDisplay(nodeId: string, pinName: string, value: unknown): void {
        const box = this.services.nodeElements.get(nodeId)?.querySelector<HTMLElement>(`[${DisplayAttribute}][${ValueAttribute}="${CSS.escape(pinName)}"]`) ?? null;

        if (box === null)
            return;

        const sheet = this.services.documentState.document;
        const node = sheet.nodes.find(candidate => candidate.id === nodeId);
        const pin = findPin(node === undefined ? undefined : this.types.get(node.type), pinName, false);
        const options = displayOptions(pin, {
            words: this.context.strings,
            number: (number, format) => this.formatNumber(number, format),
            date: (date, format) => this.formatDate(date, format),
            temporal: this.context.temporal,
            urls: this.context.urls
        });

        // A picture by the pin's type, read off the sheet as it stands: the wire says nothing of what a text is.
        showDisplayValue(box, value, { ...options, picture: pin !== undefined && showsPicture(sheet, this.types, nodeId, pin) });
    }

    /** A number as the page writes one: the pin's own format against the culture the page carries. */
    public formatNumber(value: number, format: string | null | undefined): string {
        return this.context.numbers.format(value, format ?? null, this.context.numbers.readCulture(this.root));
    }

    /** A moment as the page writes one, against the culture the page carries. */
    public formatDate(value: Date, format: string | null): string {
        return this.context.temporal.format(value, format, this.context.temporal.readCulture(this.root));
    }

    // --- the log -------------------------------------------------------------------------------------------------------------

    /** One line from one node, at the log's foot; the oldest goes once there are more than the log keeps. */
    public addLog(nodeId: string, level: string, message: Said): void {
        const entry: LogEntry = { nodeId, level: level.toLowerCase(), message, at: new Date() };

        this.log.push(entry);

        if (this.log.length > LogLimit) {
            const oldest = this.logEntries?.firstElementChild ?? null;

            this.log.shift();
            this.removeLines(oldest === null ? [] : [oldest], oldest?.nextElementSibling ?? null);
        }

        if (this.logEntries !== null) {
            // Kept at the foot only when the reader was already there: someone scrolled up to read an earlier line keeps their place.
            const atFoot = this.logEntries.scrollHeight - this.logEntries.scrollTop - this.logEntries.clientHeight < 8;

            this.logEntries.append(this.renderLogEntry(entry));

            if (atFoot)
                this.logEntries.scrollTop = this.logEntries.scrollHeight;
        }

        this.drawLogCount();

        // A failure the line has not heard of as a node's state still turns it: the log's own error is the run's.
        if (entry.level === "error") {
            this.runFailed = true;
            this.drawRun();
        }
    }

    /** A line: when, which node — a button that takes the view there — and what it says, coloured by how much it matters. */
    private renderLogEntry(entry: LogEntry): HTMLElement {
        const line = document.createElement("li");
        const time = document.createElement("time");
        const node = document.createElement("button");
        const message = document.createElement("span");

        line.className = "ui-graph__log-entry";
        line.setAttribute("data-ui-graph-log-level", entry.level);

        time.className = "ui-graph__log-time";
        time.dateTime = entry.at.toISOString();
        time.textContent = this.context.temporal.format(entry.at, "HH:mm:ss", this.context.temporal.readCulture(this.root));

        node.type = "button";
        node.className = "ui-graph__log-node";
        node.setAttribute(LogNodeAttribute, entry.nodeId);
        node.textContent = this.nodeName(entry.nodeId);

        message.className = "ui-graph__log-message";

        // A word is written marked, so a language switch writes the line again; a node's own text stays as it was said.
        const said = entry.message as { readonly key?: unknown; readonly args?: Readonly<Record<string, unknown>> } | null;

        if (typeof said?.key === "string")
            this.context.strings.write(message, null, said.key, said.args ?? null);
        else
            message.textContent = this.said(entry.message);

        line.append(time, node, message);

        return line;
    }

    /** What a run said, in the page's words: a word filled from its arguments, or a node's own text as written — content, never a key. */
    private said(message: Said): string {
        if (typeof message === "string")
            return message;

        const phrase = message as { readonly key?: unknown; readonly args?: Readonly<Record<string, string | number | { readonly text: string }>>; readonly text?: unknown } | null;

        if (typeof phrase?.key === "string")
            return this.context.strings.format(phrase.key, phrase.args ?? {});

        return typeof phrase?.text === "string" ? phrase.text : "";
    }

    /** What the viewer calls a node: its own title, else its kind's, else — for a node since deleted — its id. */
    private nodeName(nodeId: string): string {
        const node = this.services.documentState.document.nodes.find(candidate => candidate.id === nodeId);

        return node?.title ?? (node === undefined ? undefined : this.types.get(node.type)?.title) ?? nodeId;
    }

    /** The count on the log's head, in the colour of the worst line under it, so a failure reads even with the log folded. */
    private drawLogCount(): void {
        if (this.logCount === null)
            return;

        const errors = this.log.filter(entry => entry.level === "error").length;
        const warnings = this.log.filter(entry => entry.level === "warning").length;

        this.logCount.hidden = this.log.length === 0;
        this.context.badges.writeCount(this.logCount, this.log.length);
        this.logCount.classList.toggle(CoreNames.badgeDangerClass, errors > 0);
        this.logCount.classList.toggle(CoreNames.badgeWarningClass, errors === 0 && warnings > 0);
        this.logCount.classList.toggle(CoreNames.badgeSurfaceClass, errors === 0 && warnings === 0);
    }

    /** The page's words changed: the run line's share is written again in them. */
    public wordsChanged(): void {
        this.drawRun();
    }

    public clearLog(): void {
        this.log.length = 0;
        this.removeLines([...this.logEntries?.children ?? []], null);
        this.drawLogCount();
    }

    /** Lines leaving the log: a keyboard standing on one of them goes to the line after them, else to the log's switch. */
    private removeLines(lines: readonly Element[], next: Element | null): void {
        const held = lines.some(line => line.contains(document.activeElement));

        for (const line of lines)
            line.remove();

        if (held)
            focusAfterRemoval(next?.querySelector<HTMLElement>(`[${LogNodeAttribute}]`) ?? null, this.logToggle, this.context.focus);
    }

    /** Opens or folds the log; a viewer's own choice is kept in the browser beside the view, so the log opens as they left it. */
    public setLogOpen(open: boolean, remember = false): void {
        this.root.toggleAttribute(LogOpenAttribute, open);
        this.logToggle?.setAttribute("aria-expanded", String(open));

        if (remember)
            this.context.store.write(this.root, "log", open ? "open" : null);
    }

    public isLogOpen(): boolean {
        return this.root.hasAttribute(LogOpenAttribute);
    }

    /** A line's node, chosen and brought to the middle of the view at the zoom the viewer already has. */
    public goToNode(nodeId: string): void {
        const rect = this.services.nodeRect(nodeId);

        if (rect === null)
            return;

        this.services.selection.chooseForMenu(nodeId);
        this.services.drawEdges();

        // Centers within the visible area only: the log covers the foot and the run line the top, so centering on the whole box
        // would land the node half under the log it was chosen from.
        const top = this.runLine?.offsetHeight ?? 0;
        const bottom = this.logPanel?.offsetHeight ?? 0;

        this.services.view.centerOnRect(rect, top, bottom);
    }

    // --- the run line ----------------------------------------------------------------------------------------------------------

    /** How far the run has come. None through begins a run — and clears the log and the failure the last one left. */
    public setRunProgress(completed: number, total: number): void {
        if (completed <= 0) {
            this.clearLog();
            this.runStarted = true;
            this.runFailed = false;
            this.runStopped = false;
            this.runningNode = null;
        }

        this.runCompleted = Math.max(0, completed);
        this.runTotal = Math.max(0, total);

        if (this.runCompleted >= this.runTotal)
            this.runningNode = null;

        this.drawRun();
    }

    /** The server's word that a run has begun or ended; one that ended short of its last node was stopped, and the line says so. */
    public setRunning(running: boolean): void {
        if (running || !this.runStarted || this.runCompleted >= this.runTotal)
            return;

        this.runStopped = true;
        this.runningNode = null;
        this.drawRun();
    }

    /** Draws the run line: upper half the whole run's progress, lower half the running node's own steps, its name and last message at the start, the share at the end; a failure shows in its colour. */
    public drawRun(): void {
        if (this.runLine === null)
            return;

        const status = this.runningNode === null ? undefined : this.statuses.get(this.runningNode);
        const step = status?.state === "running" ? Math.min(1, Math.max(0, status.progress ?? 0)) : 0;
        const whole = this.runTotal === 0 ? (this.runStarted ? 1 : 0) : Math.min(1, (this.runCompleted + step) / this.runTotal);
        const share = Math.round(whole * 100);
        const done = this.runStarted && this.runCompleted >= this.runTotal;

        this.runLine.style.setProperty("--ui-graph-run", String(whole));
        this.runLine.style.setProperty("--ui-graph-run-step", String(step));
        this.runLine.setAttribute("aria-valuenow", String(share));
        this.runLine.setAttribute(RunStateAttribute, !this.runStarted ? "idle" : this.runFailed ? "failed" : this.runStopped ? "stopped" : done ? "done" : "running");

        if (this.runLabel !== null)
            this.runLabel.textContent = this.runLabelText(status);

        if (this.runShare !== null)
            this.runShare.textContent = this.runStarted ? percentText(this.context, this.runShare, share) : "";
    }

    /** The running node and what it last said; between nodes and after the run, the first failure, since that is what stopped it. */
    private runLabelText(status: NodeStatus | undefined): string {
        if (this.runningNode !== null) {
            const said = this.said(status?.message);

            return said.length > 0 ? this.joined(this.runningNode, said) : this.nodeName(this.runningNode);
        }

        // Stopped, the line the stop left in the log — the node it cut short — rather than a failure from before it.
        const said = this.runStopped && !this.runFailed
            ? [...this.log].reverse().find(entry => entry.level === "warning")
            : this.log.find(entry => entry.level === "error");

        return said === undefined ? "" : this.joined(said.nodeId, this.said(said.message));
    }

    /** A node's name and what it said, joined the way the page's language joins them (`ui.graph.run-line`). */
    private joined(nodeId: string, said: string): string {
        return this.context.strings.format(RunLineKey, { node: this.nodeName(nodeId), message: said });
    }
}
