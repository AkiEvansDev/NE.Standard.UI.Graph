# NE.Standard.UI.Graph

Three canvases for the [NE.Standard](https://github.com/AkiEvansDev/NE.Standard) UI framework, over one canvas core — pan and
zoom, the grid, selection, groups, reroute points, undo, the menus and the save. Two packages, on the framework's own pattern — the
**component**, which is platform-independent, and its **web rendering**, which carries the canvas engine and its stylesheet embedded
in its assembly — and two of ready-made node kinds, a calculator's and pictures'.

| Component | The viewer... | Its items come from |
|---|---|---|
| `NodesComponent` | **builds** a network of typed nodes — values, pins, connections — which the package then runs | your own C# classes, read by their attributes |
| `LayeredGraphComponent` | **reads or edits** a graph of nodes and links laid out in layers, its cycles drawn as backward edges | a bound live collection of `UIGraphNode`, each carrying its links |
| `ProductionGraphComponent` | **reads, edits or plans** resources and the recipes between them: how many runs of what reach the amounts asked for | a bound live collection of `UIResource` and `UICraft` |

Each is an input whose value is its document, edited in the browser and committed whole by an explicit save. On the node canvas
the node kinds are **your own C# classes**: you mark ordinary types with attributes, and the canvas builds the catalogue, the
picker, the pins, the editors and the wiring from them — and a saved sheet deserializes straight back into instances of those
types, so the network you run is typed, not JSON.

**The documentation is its own site: [akievansdev.github.io/NE.Standard.UI.Graph](https://akievansdev.github.io/NE.Standard.UI.Graph/)** — the node canvas, the
ready-made kinds, the canvas every component shares, the layered graph, the production graph, and a reference page per component.

## Install

```
dotnet add package NE.Standard.UI.Graph
dotnet add package NE.Standard.UI.Web.Graph
```

A calculator's kinds come ready made in a third, [`NE.Standard.UI.Graph.Calculator`](https://akievansdev.github.io/NE.Standard.UI.Graph/node-kinds.html#a-calculators-kinds-ready-made),
and picture kinds worked with SkiaSharp in a fourth, [`NE.Standard.UI.Graph.Image`](https://akievansdev.github.io/NE.Standard.UI.Graph/node-kinds.html#picture-kinds-ready-made).

Each package brings its namespaces as global usings, so the code below needs no `using` line for them; a project that
sets `NEStandardUIImplicitUsings` to `false` writes its own.

Register the web rendering beside the framework's renderers:

```csharp
services.AddStandardRenderers();
services.AddGraph();
```

The canvases' own words (`ui.graph.*`) ship in Russian and Simplified Chinese as well as English (`GraphStrings.Translations`),
turned on with `application.AddFrameworkWords("ru", "zh-Hans")` and outranked by any word of the application's own.

## A node kind

```csharp
[GraphNode(Category = "Maths", Title = "Operation", Color = "#8b5cf6")]
public sealed class OperationNode : IGraphNode
{
    [GraphInput(Title = "Left")]
    public double Left { get; set; }

    [GraphInput(Title = "Right")]
    public double Right { get; set; }

    [GraphInput(NoPin = true, Choices = ["Add", "Subtract", "Multiply", "Divide"])]
    public string Operation { get; set; } = "Add";

    [GraphOutput]
    public double Result { get; set; }

    public void Execute(UINodeRunContext context)
        => Result = Operation switch
        {
            "Subtract" => Left - Right,
            "Multiply" => Left * Right,
            "Divide" => Left / Right,
            _ => Left + Right
        };
}
```

## Documentation

| Page | What it covers |
|---|---|
| [The node canvas](https://akievansdev.github.io/NE.Standard.UI.Graph/node-canvas.html) | Node kinds as your own classes: the attributes, running a sheet, pictures, whose document it is |
| [Ready-made kinds](https://akievansdev.github.io/NE.Standard.UI.Graph/node-kinds.html) | The common kinds, the reroute every catalogue carries, the calculator and picture packages |
| [The canvas](https://akievansdev.github.io/NE.Standard.UI.Graph/canvas.html) | What every canvas shares, and what the viewer can do on it |
| [Layered graph](https://akievansdev.github.io/NE.Standard.UI.Graph/layered-graph.html) | A graph of the application's nodes and links, laid out in layers |
| [Production graph](https://akievansdev.github.io/NE.Standard.UI.Graph/production-graph.html) | Resources and recipes, and a plan over the catalogue |
| [Components](https://akievansdev.github.io/NE.Standard.UI.Graph/components/index.html) | Every property, event and method, read off the code |

## Licence

The framework's: the [Prosperity Public License 3.0.0](https://github.com/AkiEvansDev/NE.Standard.UI.Graph/blob/main/LICENSE.md). Free for noncommercial use, with a thirty-day
trial for commercial use.

## Contributing

This repository is a **read-only mirror**. Development happens in a private repository alongside the
framework — that is how the canvas stays in step with the renderer it plugs into — and everything here is
generated from it, so pull requests are switched off.

Issues are open and welcome.
