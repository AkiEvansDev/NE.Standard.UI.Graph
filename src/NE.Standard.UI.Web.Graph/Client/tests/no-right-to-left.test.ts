// Right-to-left layout is out of the framework's scope: no engine of the add-on reads a page's direction to mirror a gesture, a key or a
// box. Matched by right-to-left words alone, since a sort's or a search's own `direction` is no page direction.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../src");

function sources(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name);

        return entry.isDirectory() ? sources(path) : entry.name.endsWith(".ts") ? [path] : [];
    });
}

const files = sources(sourceRoot).map(path => ({ name: relative(sourceRoot, path).replaceAll("\\", "/"), text: readFileSync(path, "utf8") }));

test("no client source reads a right-to-left direction", () => {
    assert.notEqual(files.length, 0);

    for (const file of files) {
        assert.doesNotMatch(file.text, /["']rtl["']|:dir\(/, `${file.name} names "rtl"`);
        assert.doesNotMatch(file.text, /getComputedStyle\([^)]*\)\.direction|\.style\.direction|\.dir\s*[!=]==/, `${file.name} branches on the page's direction`);
        assert.doesNotMatch(file.text, /rightToLeft|isRightToLeft/, `${file.name} keeps a right-to-left flag`);
    }
});
