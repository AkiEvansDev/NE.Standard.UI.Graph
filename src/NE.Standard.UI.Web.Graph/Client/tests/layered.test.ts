import assert from "node:assert/strict";
import test from "node:test";
import { backEdgesOf, layered } from "../src/graph/layered.ts";
import type { LayeredEdge, LayeredNode } from "../src/graph/layered.ts";

function nodes(...ids: string[]): LayeredNode[] {
    return ids.map(id => ({ id, width: 100, height: 40 }));
}

function edges(...pairs: string[]): LayeredEdge[] {
    return pairs.map(pair => {
        const [from, to] = pair.split(">");

        return { id: pair, from, to };
    });
}

function overlaps(result: ReturnType<typeof layered>, all: readonly LayeredNode[]): boolean {
    for (const left of all) {
        for (const right of all) {
            if (left === right)
                continue;

            const a = result.positions.get(left.id)!;
            const b = result.positions.get(right.id)!;

            if (a.x < b.x + right.width && b.x < a.x + left.width && a.y < b.y + right.height && b.y < a.y + left.height)
                return true;
        }
    }

    return false;
}

test("a chain stands one layer per node, left to right", () => {
    const result = layered(nodes("a", "b", "c"), edges("a>b", "b>c"), { direction: "right", layerGap: 50 });

    assert.deepEqual([...result.layers.values()], [0, 1, 2]);
    assert.equal(result.positions.get("a")!.x, 0);
    assert.equal(result.positions.get("b")!.x, 150);
    assert.equal(result.positions.get("c")!.x, 300);
    assert.equal(result.backEdges.size, 0);
});

test("a node stands past the furthest of what feeds it", () => {
    const result = layered(nodes("a", "b", "c"), edges("a>b", "b>c", "a>c"), { direction: "right" });

    assert.equal(result.layers.get("c"), 2);
});

test("a cycle is broken at exactly one edge, and the rest run forward", () => {
    const result = layered(nodes("a", "b", "c"), edges("a>b", "b>c", "c>a"), { direction: "right" });

    assert.equal(result.backEdges.size, 1);

    for (const edge of edges("a>b", "b>c", "c>a")) {
        const forward = result.layers.get(edge.from)! < result.layers.get(edge.to)!;

        assert.equal(forward, !result.backEdges.has(edge.id), edge.id);
    }
});

test("10 X need Y and Z, a Y needs X and G — the edge X takes back is the backward one", () => {
    const result = layered(nodes("G", "Z", "Y", "X"), edges("Y>X", "Z>X", "X>Y", "G>Y"), { direction: "right" });

    assert.equal(result.backEdges.size, 1);
    assert.ok(result.layers.get("G")! < result.layers.get("Y")!);
    assert.ok(result.layers.get("Y")! < result.layers.get("X")!);
    assert.ok(result.backEdges.has("X>Y"));
});

test("an edge from a node to itself is a backward edge and moves nothing", () => {
    const result = layered(nodes("a"), edges("a>a"), { direction: "right" });

    assert.ok(result.backEdges.has("a>a"));
    assert.equal(result.layers.get("a"), 0);
});

test("the back edges a sheet asks for on every change are the ones the whole layout finds", () => {
    const all = nodes("a", "b", "c", "d", "e");
    const links = edges("a>b", "b>c", "c>a", "c>d", "d>d", "e>d", "d>b", "x>a");

    assert.deepEqual([...backEdgesOf(all.map(node => node.id), links)].sort(), [...layered(all, links, { direction: "right" }).backEdges].sort());
});

test("a sheet of many nodes and edges finds its back edges without laying itself out", () => {
    const ids = Array.from({ length: 2000 }, (_, index) => `n${index}`);
    const links = ids.flatMap((id, index) => [{ id: `${id}>next`, from: id, to: ids[(index + 1) % ids.length] }, { id: `${id}>skip`, from: id, to: ids[(index * 7 + 3) % ids.length] }]);
    const started = performance.now();
    const back = backEdgesOf(ids, links);

    assert.ok(back.size > 0);
    assert.ok(performance.now() - started < 2000, "finding the back edges of 2000 nodes took more than two seconds");
});

test("nodes of one layer never overlap, and neither do nodes of a graph that fans out and back in", () => {
    const all = nodes("root", "a", "b", "c", "d", "sink");
    const result = layered(all, edges("root>a", "root>b", "root>c", "root>d", "a>sink", "b>sink", "c>sink", "d>sink"), { direction: "right" });

    assert.equal(overlaps(result, all), false);
});

test("the order within a layer follows what feeds it, so two parallel chains do not cross", () => {
    // Given in an order that crosses: the second layer lists q before p.
    const result = layered(nodes("a", "b", "q", "p"), edges("a>p", "b>q"), { direction: "right" });

    assert.ok(result.positions.get("a")!.y < result.positions.get("b")!.y);
    assert.ok(result.positions.get("p")!.y < result.positions.get("q")!.y);
});

test("a long edge takes room in the layers it crosses, and the graph still lays out whole", () => {
    const all = nodes("a", "b", "c", "d");
    const result = layered(all, edges("a>b", "b>c", "c>d", "a>d"), { direction: "right" });

    assert.equal(result.layers.get("d"), 3);
    assert.equal(overlaps(result, all), false);
});

test("a long forward edge is routed through the middle of every layer it crosses; a short or backward one is not", () => {
    const result = layered(nodes("a", "b", "c", "d"), edges("a>b", "b>c", "c>d", "a>d", "d>a"), { direction: "right", layerGap: 50 });
    const long = [...result.routes.keys()].filter(id => !result.backEdges.has(id));

    assert.ok(long.length >= 1);

    for (const id of long) {
        const points = result.routes.get(id)!;

        // One point per layer crossed, each in the middle of its layer's band along x.
        assert.ok(points.every((point, index) => index === 0 || point.x > points[index - 1].x));
        assert.ok(points.every(point => (point.x - 50) % 150 === 0));
    }

    assert.equal(result.routes.has("a>b"), false);

    for (const id of result.backEdges)
        assert.equal(result.routes.has(id), false);
});

test("top to bottom turns the axes: layers go down the page", () => {
    const result = layered(nodes("a", "b"), edges("a>b"), { direction: "down", layerGap: 30 });

    assert.equal(result.positions.get("a")!.y, 0);
    assert.equal(result.positions.get("b")!.y, 70);
    assert.equal(result.positions.get("a")!.x, result.positions.get("b")!.x);
});

test("the same graph lays out the same way every time, and an unknown end is ignored", () => {
    const all = nodes("m", "n", "o", "p");
    const links = edges("m>n", "n>o", "o>m", "p>n", "p>missing");
    const first = layered(all, links, { direction: "right" });
    const second = layered(all, links, { direction: "right" });

    assert.deepEqual([...first.positions], [...second.positions]);
    assert.deepEqual([...first.backEdges], [...second.backEdges]);
});

test("the layout starts at the origin it is given", () => {
    const result = layered(nodes("a", "b"), edges("a>b"), { direction: "right", originX: 40, originY: 60 });

    assert.equal(result.positions.get("a")!.x, 40);
    assert.equal(Math.min(...[...result.positions.values()].map(point => point.y)), 60);
});

test("a layer's nodes stand against its leading edge, whatever each of them is wide", () => {
    const all: LayeredNode[] = [
        { id: "root", width: 100, height: 40 },
        { id: "wide", width: 220, height: 40 },
        { id: "narrow", width: 90, height: 40 }
    ];

    const result = layered(all, edges("root>wide", "root>narrow"), { direction: "right", layerGap: 50 });

    assert.equal(result.positions.get("wide")!.x, 150);
    assert.equal(result.positions.get("narrow")!.x, 150);
});

test("a chain comes out as one straight line, and what hangs off it steps aside", () => {
    const result = layered(nodes("a", "b", "c", "d", "leaf"), edges("a>b", "b>c", "c>d", "a>leaf"), { direction: "right" });
    const line = ["b", "c", "d"].map(id => result.positions.get(id)!.y);

    assert.deepEqual(line, [line[0], line[0], line[0]]);
    assert.notEqual(result.positions.get("leaf")!.y, line[0]);
});

test("a long edge runs flat through the layers it crosses, and the chain beside it stays straight", () => {
    const result = layered(nodes("a", "b", "c", "d"), edges("a>b", "b>c", "c>d", "a>d"), { direction: "right" });
    const route = result.routes.get("a>d")!;

    // The virtual nodes the long edge passes through outrank the real ones beside them, so its points share one line.
    assert.equal(route.length, 2);
    assert.equal(route[0].y, route[1].y);
    assert.equal(result.positions.get("b")!.y, result.positions.get("c")!.y);
});

test("a long edge bends once: its stops stand level with one of its ends, never half way between them", () => {
    const result = layered(nodes("a", "b", "c", "d", "e"), edges("a>b", "b>c", "c>d", "a>d", "e>b"), { direction: "right" });
    const route = result.routes.get("a>d")!;
    const ends = [result.positions.get("a")!.y + 20, result.positions.get("d")!.y + 20];

    assert.deepEqual(route.map(point => point.y), [route[0].y, route[0].y]);
    assert.ok(ends.some(end => Math.abs(end - route[0].y) < 0.5), `${route[0].y} is level with neither ${ends.join(" nor ")}`);
});

test("a source stands beside what it feeds, not at the far end of the sheet", () => {
    // `water` goes into the last step alone: left in the first layer its edge would run the whole way across.
    const result = layered(nodes("ore", "ingot", "plate", "water", "part"), edges("ore>ingot", "ingot>plate", "plate>part", "water>part"), { direction: "right" });

    assert.equal(result.layers.get("water"), result.layers.get("part")! - 1);
    assert.equal(result.routes.has("water>part"), false);
    // A node fed by more than it feeds stays where the longest path put it: pulling it would lengthen more edges than it shortened.
    assert.equal(result.layers.get("ore"), 0);
});

test("the room between layers follows how deep the nodes are when the caller names none", () => {
    const small = layered([{ id: "a", width: 56, height: 56 }, { id: "b", width: 56, height: 56 }], edges("a>b"), { direction: "right" });
    const big = layered([{ id: "a", width: 300, height: 40 }, { id: "b", width: 300, height: 40 }], edges("a>b"), { direction: "right" });

    // 48 at the least for a circle, 96 at the most for a card: the gap reads the same beside either.
    assert.equal(small.positions.get("b")!.x, 56 + 48);
    assert.equal(big.positions.get("b")!.x, 300 + 96);
});

test("the two backward directions are the same layout turned end for end", () => {
    const right = layered(nodes("a", "b", "c"), edges("a>b", "b>c"), { direction: "right", layerGap: 50 });
    const left = layered(nodes("a", "b", "c"), edges("a>b", "b>c"), { direction: "left", layerGap: 50 });

    // The first layer stands at the far end, and every node keeps the place it had across the layers.
    assert.equal(left.positions.get("a")!.x, 300);
    assert.equal(left.positions.get("b")!.x, 150);
    assert.equal(left.positions.get("c")!.x, 0);
    assert.equal(left.positions.get("a")!.y, right.positions.get("a")!.y);

    const up = layered(nodes("a", "b"), edges("a>b"), { direction: "up", layerGap: 30 });

    assert.equal(up.positions.get("a")!.y, 70);
    assert.equal(up.positions.get("b")!.y, 0);
});

// The battery and the drink of the package's demo, as the production graph draws them: two chains that share the water, which a
// long edge carries from the first layer to the last but one.
const chains: Record<string, string[]> = {
  "originium-powder": ["originium-ore"], "dense-originium-powder": ["originium-powder", "sandleaf-powder"],
  "sandleaf": ["sandleaf-seed"], "sandleaf-seed": ["sandleaf"], "sandleaf-powder": ["sandleaf"],
  "buckflower": ["buckflower-seed"], "buckflower-seed": ["buckflower"], "carbon": ["buckflower"], "carbon-powder": ["carbon"],
  "dense-carbon-powder": ["carbon-powder", "sandleaf-powder"], "stabilized-carbon": ["dense-carbon-powder"],
  "xiranite": ["stabilized-carbon", "clean-water"], "battery": ["xiranite", "dense-originium-powder"],
  "ferrium": ["ferrium-ore"], "ferrium-part": ["ferrium"], "ferrium-bottle": ["ferrium"],
  "jincao": ["jincao-seed", "clean-water"], "jincao-seed": ["jincao"], "jincao-powder": ["jincao"],
  "jincao-solution": ["jincao-powder", "clean-water"], "bottle-jincao": ["ferrium-bottle", "jincao-solution"], "drink": ["ferrium-part", "bottle-jincao"]
};
const chainOrder = ["originium-ore", "ferrium-ore", "clean-water", "originium-powder", "dense-originium-powder", "sandleaf-seed", "sandleaf", "sandleaf-powder", "buckflower-seed", "buckflower", "carbon", "carbon-powder", "dense-carbon-powder", "stabilized-carbon", "xiranite", "battery", "ferrium", "ferrium-part", "ferrium-bottle", "jincao-seed", "jincao", "jincao-powder", "jincao-solution", "bottle-jincao", "drink"];

test("a long edge joined to something below the node it stands over does not push the sheet apart", () => {
    const all = chainOrder.map(id => ({ id, width: 96, height: 90 }));
    const links = Object.entries(chains).flatMap(([to, from]) => from.map(source => ({ id: `${source}>${to}`, from: source, to })));
    const result = layered(all, links, { direction: "right", nodeGap: 32, layerGap: 84 });
    const tops = [...result.positions.values()].map(point => point.y);

    // Five nodes and the stops of three long edges are the most one layer holds: the sheet is no taller than that layer needs.
    assert.ok(Math.max(...tops) - Math.min(...tops) < 800, `the sheet came out ${Math.max(...tops) - Math.min(...tops)} tall`);
    assert.equal(overlaps(result, all), false);
    // The chains still run straight inside it.
    assert.equal(result.positions.get("jincao")!.y, result.positions.get("jincao-powder")!.y);
    assert.equal(result.positions.get("ferrium-ore")!.y, result.positions.get("ferrium")!.y);
});

test("a node fed by two stands in line with one of them, not half way between", () => {
    const result = layered(nodes("a", "b", "c"), edges("a>c", "b>c"), { direction: "right" });
    const c = result.positions.get("c")!.y;

    assert.ok([result.positions.get("a")!.y, result.positions.get("b")!.y].includes(c), `${c} is in line with neither`);
});

// A hand layout of the planner's HC Valley Battery: every node in line with one of what feeds it, and the long edges running flat,
// so the chains read as rows.
const battery = ["Ferrium Ore", "Ferrium", "Ferrium Powder", "Dense Ferrium Powder", "Steel", "Steel Part", "HC Valley Battery", "Sandleaf Powder", "Dense Originium Powder", "Originium Ore", "Originium Powder", "Sandleaf", "Sandleaf Seed"];
const batteryLinks = [
    "Ferrium Ore>Ferrium", "Ferrium>Ferrium Powder", "Ferrium Powder>Dense Ferrium Powder", "Dense Ferrium Powder>Steel", "Steel>Steel Part",
    "Steel Part>HC Valley Battery", "Sandleaf Powder>Dense Ferrium Powder", "Sandleaf Powder>Dense Originium Powder", "Originium Powder>Dense Originium Powder",
    "Dense Originium Powder>HC Valley Battery", "Originium Ore>Originium Powder", "Sandleaf>Sandleaf Powder", "Sandleaf>Sandleaf Seed", "Sandleaf Seed>Sandleaf"
];

test("the planner's battery lays out in rows: each merge in line with one input, each long edge flat", () => {
    const all = battery.map(id => ({ id, width: 96, height: 90 }));
    const result = layered(all, edges(...batteryLinks), { direction: "right", nodeGap: 32, layerGap: 84 });
    const y = (id: string): number => result.positions.get(id)!.y;

    assert.ok([y("Ferrium Powder"), y("Sandleaf Powder")].includes(y("Dense Ferrium Powder")));
    assert.ok([y("Steel Part"), y("Dense Originium Powder")].includes(y("HC Valley Battery")));

    for (const [id, from] of [["Sandleaf Powder>Dense Ferrium Powder", "Sandleaf Powder"], ["Dense Originium Powder>HC Valley Battery", "Dense Originium Powder"]]) {
        const route = result.routes.get(id)!;

        assert.ok(route.every(point => point.y === y(from) + 45), `${id} runs ${route.map(point => point.y).join(", ")}`);
    }

    // The long edge into Dense Ferrium Powder runs straight into it, as the hand layout has it.
    assert.equal(y("Dense Ferrium Powder"), y("Sandleaf Powder"));
    assert.equal(y("HC Valley Battery"), y("Dense Originium Powder"));
    assert.equal(overlaps(result, all), false);
    assert.deepEqual([...result.positions], [...layered(all, edges(...batteryLinks), { direction: "right", nodeGap: 32, layerGap: 84 }).positions]);
});

test("a circle with its name under it lines up by the circle: a long edge runs at the circle's middle, not the room's", () => {
    // The production graph's circle, 56 across, with the 34 its name takes under it.
    const all = battery.map(id => ({ id, width: 96, height: 90, anchor: { x: 48, y: 28 } }));
    const result = layered(all, edges(...batteryLinks), { direction: "right", nodeGap: 32, layerGap: 84 });
    const line = (id: string): number => result.positions.get(id)!.y + 28;

    for (const [id, from, to] of [["Sandleaf Powder>Dense Ferrium Powder", "Sandleaf Powder", "Dense Ferrium Powder"], ["Dense Originium Powder>HC Valley Battery", "Dense Originium Powder", "HC Valley Battery"]]) {
        const route = result.routes.get(id)!;

        assert.ok(route.every(point => point.y === line(from)), `${id} runs ${route.map(point => point.y).join(", ")} against ${line(from)}`);
        assert.equal(line(to), line(from));
    }

    assert.equal(overlaps(result, all), false);
});

test("an edge that names where it meets its ends lines those points up, not the nodes' middles", () => {
    const all: LayeredNode[] = [{ id: "a", width: 100, height: 40 }, { id: "b", width: 100, height: 120 }, { id: "c", width: 100, height: 60 }];
    const links: LayeredEdge[] = [{ id: "a>b", from: "a", to: "b", fromOffset: 30, toOffset: 90 }, { id: "b>c", from: "b", to: "c", fromOffset: 20, toOffset: 45 }];
    const result = layered(all, links, { direction: "right" });
    const y = (id: string): number => result.positions.get(id)!.y;

    assert.equal(y("a") + 30, y("b") + 90);
    assert.equal(y("b") + 20, y("c") + 45);
    assert.equal(Math.min(y("a"), y("b"), y("c")), 0);
});

test("a long edge that names its ends runs flat through the layers it crosses, level with one of them", () => {
    const all = nodes("a", "b", "c", "d", "e");
    const links: LayeredEdge[] = [...edges("a>b", "b>c", "c>d", "e>b"), { id: "a>d", from: "a", to: "d", fromOffset: 8, toOffset: 34 }];
    const result = layered(all, links, { direction: "right" });
    const route = result.routes.get("a>d")!;
    const ends = [result.positions.get("a")!.y + 8, result.positions.get("d")!.y + 34];

    assert.equal(route.length, 2);
    assert.equal(route[0].y, route[1].y);
    assert.ok(ends.some(end => Math.abs(end - route[0].y) < 0.5), `${route[0].y} is level with neither ${ends.join(" nor ")}`);
    assert.equal(overlaps(result, all), false);
});

test("nodes whose edges meet them off their middles still never overlap", () => {
    const all: LayeredNode[] = ["root", "a", "b", "c", "d", "sink"].map((id, index) => ({ id, width: 100, height: 30 + index * 17 }));
    const links: LayeredEdge[] = edges("root>a", "root>b", "root>c", "root>d", "a>sink", "b>sink", "c>sink", "d>sink").map((edge, index) => ({ ...edge, fromOffset: 5 + index * 3, toOffset: 25 - index * 2 }));

    for (const direction of ["right", "down", "left", "up"] as const)
        assert.equal(overlaps(layered(all, links, { direction }), all), false, direction);
});

test("a layer the caller names a gap for takes that room after it; the rest take the one gap", () => {
    const result = layered(nodes("a", "b", "c"), edges("a>b", "b>c"), { direction: "right", layerGap: 50, layerGaps: layers => new Map([[layers.get("a")!, 120]]) });

    assert.equal(result.positions.get("b")!.x, 220);
    assert.equal(result.positions.get("c")!.x, 370);

    const left = layered(nodes("a", "b", "c"), edges("a>b", "b>c"), { direction: "left", layerGap: 50, layerGaps: () => new Map([[0, 120]]) });

    assert.equal(left.positions.get("a")!.x, 370);
    assert.equal(left.positions.get("c")!.x, 0);
});
