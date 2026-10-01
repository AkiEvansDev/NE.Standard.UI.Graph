using System;
using System.Collections.Generic;

namespace DemoApp.Nodes;

/// <summary>
/// The demo's words: its pages' names, their settings and the lines a run leaves, on keys of the demo's own prefix, in English and in
/// a second language; the framework's, the code field's and the graph's own words are the tables they ship.
/// </summary>
/// <remarks>
/// A node catalogue's text — kind titles, categories, descriptions, pins — is the application's content, like a node's own name and
/// the sheet's values: it stays as written in every language, so nothing here names a kind.
/// </remarks>
internal static class NodesDemoWords
{
    /// <summary>What every key of the demo starts with; every other string is content (<c>KeyPrefixes</c>).</summary>
    public const string KeyPrefix = "nodes.";

    private static readonly Dictionary<string, string> English = new(StringComparer.Ordinal)
    {
        ["nodes.nav.kinds"] = "Kinds",
        ["nodes.page.common"] = "Common",
        ["nodes.page.common.description"] = "The kinds every catalogue carries, on the node canvas: double-click the background to add a node, drag from a pin to wire one, press a node for its frequent entries in a bar above it, the corner button or the right button for the menu, Ctrl+S to save, Ctrl+Z to undo; the panel in the top corner runs the sheet, once or until a counter runs out.",
        ["nodes.page.calculator"] = "Calculator",
        ["nodes.page.calculator.description"] = "The calculator package's kinds, NE.Standard.UI.Graph.Calculator: operations, rounding, sums, comparisons and a result to read, worked out on the server by the same classes the canvas drew.",
        ["nodes.page.image"] = "Image",
        ["nodes.page.image.description"] = "The picture package's kinds, NE.Standard.UI.Graph.Image, with the file kinds: a picture chosen on the sheet and worked on the server, and a folder's pictures made thumbnails one a run.",
        ["nodes.code"] = "Code",
        ["nodes.copy"] = "Copy",
        ["nodes.edges"] = "Edges",
        ["nodes.edges.curved"] = "Curved",
        ["nodes.edges.straight"] = "Straight",
        ["nodes.edges.stepped"] = "Stepped",
        ["nodes.snap"] = "Snap to grid",
        ["nodes.read-only"] = "Read only",
        ["nodes.reset"] = "Reset",
        ["nodes.run-sheet"] = "Run the sheet",
        ["nodes.show-position"] = "[test] Show node position",
        ["nodes.status.common"] = "Run works the sheet out once; Run all walks the counter to its end. The counter's Next starts over by its reset.",
        ["nodes.status.calculator"] = "Drag from a pin to wire two nodes, double-click the background to add one, Ctrl+S to save, Run to work it out.",
        ["nodes.status.image"] = "Choose a picture on the Image node and press Run; Run all goes through the folder's pictures one a run, and Stop ends it part way.",
        ["nodes.status.saved"] = "Saved at {time}: nodes {nodes}, connections {edges}.",
        ["nodes.status.stopped"] = "Stopped in run {run}. The counters and the folder stand where the runs before it left them.",
        ["nodes.status.runs"] = "{runs} runs. {line}",
        ["nodes.status.ran.one"] = "Ran {count} node.",
        ["nodes.status.ran.other"] = "Ran {count} nodes.",
        ["nodes.status.failed"] = "{node}: {error} Ran {ran} of {total} nodes.",
        ["nodes.status.failed-skipped"] = "{node}: {error} {skipped} below it were skipped. Ran {ran} of {total} nodes.",
        ["nodes.status.position"] = "{node} at {x}, {y}.",
        ["nodes.status.no-picture"] = "That upload carried no single picture.",
        ["nodes.status.kept"] = "Kept {file} ({size} KB). Press Run.",
        ["nodes.status.reset"] = "The sheet is back to the one the page opened with.",
        ["nodes.answer.none"] = "Add a Result node to see an answer."
    };

    // The demo's second language, whole for its own words, so the missing-word report names only a real gap (DemoWordsCoverageTests).
    private static readonly Dictionary<string, string> Chinese = new(StringComparer.Ordinal)
    {
        ["nodes.nav.kinds"] = "节点类型",
        ["nodes.page.common"] = "常用",
        ["nodes.page.common.description"] = "每个目录都带有的节点类型，放在节点画布上：双击背景添加节点，从引脚拖出连线，单击节点在其上方的操作栏中使用常用命令，用角落的按钮或右键打开菜单，Ctrl+S 保存，Ctrl+Z 撤销；顶角的面板运行整张画布，运行一次，或一直运行到计数器用完。",
        ["nodes.page.calculator"] = "计算器",
        ["nodes.page.calculator.description"] = "计算器包的节点类型 NE.Standard.UI.Graph.Calculator：运算、舍入、求和、比较和可读的结果，由画布所画的同一批类在服务器上算出。",
        ["nodes.page.image"] = "图片",
        ["nodes.page.image.description"] = "图片包的节点类型 NE.Standard.UI.Graph.Image，以及文件类节点：在画布上选一张图片，由服务器处理；再把一个文件夹里的图片每次运行一张地做成缩略图。",
        ["nodes.code"] = "代码",
        ["nodes.copy"] = "复制",
        ["nodes.edges"] = "连线",
        ["nodes.edges.curved"] = "曲线",
        ["nodes.edges.straight"] = "直线",
        ["nodes.edges.stepped"] = "折线",
        ["nodes.snap"] = "对齐网格",
        ["nodes.read-only"] = "只读",
        ["nodes.reset"] = "重置",
        ["nodes.run-sheet"] = "运行画布",
        ["nodes.show-position"] = "[测试] 显示节点位置",
        ["nodes.status.common"] = "“运行”把画布算一遍；“全部运行”让计数器一直走到尽头。计数器的 Next 可以用它的重置重新开始。",
        ["nodes.status.calculator"] = "从引脚拖出连线连接两个节点，双击背景添加节点，Ctrl+S 保存，“运行”算出结果。",
        ["nodes.status.image"] = "在 Image 节点上选一张图片，然后按“运行”；“全部运行”每次运行处理文件夹里的一张图片，“停止”可以中途结束。",
        ["nodes.status.saved"] = "已于 {time} 保存：节点 {nodes} 个，连线 {edges} 条。",
        ["nodes.status.stopped"] = "在第 {run} 次运行中停止。计数器和文件夹停在之前各次运行留下的位置。",
        ["nodes.status.runs"] = "共 {runs} 次运行。{line}",
        ["nodes.status.ran.other"] = "运行了 {count} 个节点。",
        ["nodes.status.failed"] = "{node}：{error} 运行了 {ran} 个节点，共 {total} 个。",
        ["nodes.status.failed-skipped"] = "{node}：{error} 其下 {skipped} 个节点被跳过。运行了 {ran} 个节点，共 {total} 个。",
        ["nodes.status.position"] = "{node} 位于 {x}, {y}。",
        ["nodes.status.no-picture"] = "这次上传没有带来单独一张图片。",
        ["nodes.status.kept"] = "已保存 {file}（{size} KB）。请按“运行”。",
        ["nodes.status.reset"] = "画布已恢复为页面打开时的样子。",
        ["nodes.answer.none"] = "添加一个 Result 节点来查看结果。"
    };

    public static IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> Build()
        => new Dictionary<string, IReadOnlyDictionary<string, string>>(StringComparer.Ordinal) { ["en"] = English, ["zh-Hans"] = Chinese };
}
