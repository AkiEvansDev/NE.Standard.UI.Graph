// The framework's client, as `window.NEStandardUI` holds it; the shapes are the contract in plugin/ne-standard-ui.d.ts, a copy of the
// framework's own that its build keeps in step.

import type { GlobalApi } from "ne-standard-ui";

/** The framework's global API, which its module installs before any package module runs. */
export function frameworkApi(): GlobalApi {
    const api = (window as { NEStandardUI?: Partial<GlobalApi> }).NEStandardUI;

    if (api === undefined || typeof api.registerEngine !== "function")
        throw new Error("NE.Standard.UI.Web.Graph needs the framework's client (ui.js) on the page before it.");

    return api as GlobalApi;
}
