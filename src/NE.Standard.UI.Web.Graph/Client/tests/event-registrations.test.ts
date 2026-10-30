// The canvas's save and its menus' entries are their own (`ownTarget`): raised on the canvas's value element or on the entry, they run the command of
// the component they stand in and of none around it, as the framework's pipeline judges by the component the target stands in.

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import type { EventRegistration } from "ne-standard-ui";

// The stylesheet is the bundler's to load; the module's registrations are what is read here.
registerHooks({
    load: (url, context, next) => url.endsWith(".less") ? { format: "module", source: "", shortCircuit: true } : next(url, context)
});

const registered = new Map<string, EventRegistration>();

// The framework's global, as its module leaves it before a package's runs: only the registrations are kept.
Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
        NEStandardUI: {
            contractVersion: 4,
            registerEvent: (name: string, registration: EventRegistration = {}) => registered.set(name, registration),
            registerConverter: () => undefined,
            registerDomOperation: () => undefined,
            registerEffect: () => undefined,
            registerValueReader: () => undefined,
            registerCollectionSink: () => undefined,
            registerStrings: () => undefined,
            registerEngine: () => undefined
        }
    }
});

await import("../src/graph.ts");

test("a canvas's save and its menu entries are the canvas's own", () => {
    for (const name of ["graph-save", "menu-entry"])
        assert.equal(registered.get(name)?.ownTarget, true, `${name} hands itself to a component around the canvas`);
});

test("a menu entry's pick carries the entry's own keys, then the id of what its menu was opened on", () => {
    const keys = registered.get("menu-entry")?.dynamicParameters?.({
        domEvent: new CustomEvent("menu-entry", { detail: { target: "n1" } }),
        component: null as unknown as Element,
        componentId: 15,
        dynamicParameters: ["share", "share-mail"]
    });

    assert.deepEqual(keys, ["share", "share-mail", "n1"]);
});
