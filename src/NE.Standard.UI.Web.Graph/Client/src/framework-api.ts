// The framework's client, as `window.NEStandardUI` holds it; the shapes are the contract in plugin/ne-standard-ui.d.ts, a copy of the
// framework's own that its build keeps in step.

import type { ContractVersion, GlobalApi } from "ne-standard-ui";

// The contract this package was compiled against; typed by the copy of the declaration, so a copy that moves on fails the build here.
const contractVersion: ContractVersion = 2;

/** The framework's global API, which its module installs before any package module runs; refused when it speaks another contract. */
export function frameworkApi(): GlobalApi {
    const api = (window as { NEStandardUI?: Partial<GlobalApi> }).NEStandardUI;

    if (api === undefined || typeof api.registerEngine !== "function")
        throw new Error("NE.Standard.UI.Web.Graph needs the framework's client (ui.js) on the page before it.");

    // Thrown before anything is registered: a package against the wrong contract would work in part and fail in ways that show nowhere.
    if (api.contractVersion !== contractVersion)
        throw new Error(`NE.Standard.UI.Web.Graph was built for plugin contract ${contractVersion}, but the framework's client on the page implements ${String(api.contractVersion ?? "an older one")}; install the package version that matches the framework.`);

    return api as GlobalApi;
}
