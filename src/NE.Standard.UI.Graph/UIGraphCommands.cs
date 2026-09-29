using System;
using System.Globalization;

namespace NE.Standard.UI.Graph;

/// <summary>The menu entries the canvas answers itself.</summary>
/// <remarks>
/// An entry whose key starts with <see cref="Prefix"/> never reaches the server: the canvas's engine catches the click and does the
/// work in the browser.
/// </remarks>
public static class UIGraphCommands
{
    /// <summary>What a built-in entry's key starts with.</summary>
    public const string Prefix = "graph:";

    /// <summary>Opens the picker where the pointer was; on a graph, adds a node there and names it.</summary>
    public const string AddNode = Prefix + "add-node";

    /// <summary>Removes the chosen nodes, groups and edges.</summary>
    public const string DeleteSelection = Prefix + "delete-selection";

    /// <summary>Puts a frame around the chosen nodes.</summary>
    public const string GroupSelection = Prefix + "group-selection";

    /// <summary>Lays the document out from its inputs to its outputs.</summary>
    public const string Arrange = Prefix + "arrange";

    /// <summary>Pans and zooms so that everything is in view.</summary>
    public const string Fit = Prefix + "fit";

    /// <summary>Commits the document, as Ctrl+S does.</summary>
    public const string Save = Prefix + "save";

    /// <summary>Pins the node or the group the menu was opened on, or lets it go — the entry is checked while it is pinned.</summary>
    public const string Pin = Prefix + "pin";

    /// <summary>Opens a field over the title of the node or the group the menu was opened on; left empty, the name is its kind's again.</summary>
    public const string Rename = Prefix + "rename";

    /// <summary>Opens a field over the caption of the edge the menu was opened on.</summary>
    public const string Caption = Prefix + "caption";

    /// <summary>Opens a field over the amount of the ingredient or the product the edge the menu was opened on draws.</summary>
    public const string Amount = Prefix + "amount";

    /// <summary>Opens a field over what one run of the recipe the edge the menu was opened on draws gives.</summary>
    public const string Output = Prefix + "output";

    /// <summary>Opens a field over how long one run of the craft the menu was opened on lasts.</summary>
    public const string CraftTime = Prefix + "craft-time";

    /// <summary>Opens a field over how much of the resource the menu was opened on a plan has to reach; left empty, it is a target no more.</summary>
    public const string Target = Prefix + "target";

    /// <summary>
    /// On an item the application changed or dropped under the viewer's own unsaved change: lets the viewer's change go, so the
    /// item is the application's again.
    /// </summary>
    public const string TakeServer = Prefix + "take-server";

    /// <summary>
    /// On the same item: keeps the viewer's change over the application's, knowingly — the conflict is answered, and the save
    /// writes the viewer's state.
    /// </summary>
    public const string KeepMine = Prefix + "keep-mine";

    /// <summary>
    /// On a made resource under a plan: brings it in rather than crafting it, counted with the sources. Checked while active.
    /// </summary>
    public const string Bought = Prefix + "bought";

    /// <summary>A link dropped on a resource one recipe already makes: the resource it was pulled from joins that recipe's ingredients.</summary>
    public const string LinkIngredient = Prefix + "link-ingredient";

    /// <summary>The same link as a recipe of its own: a second way to make the resource.</summary>
    public const string LinkRecipe = Prefix + "link-recipe";

    /// <summary>Takes out the edge the menu was opened on.</summary>
    public const string DeleteEdge = Prefix + "delete-edge";

    /// <summary>Puts a reroute where the menu was opened: on an edge, the edge running through it; on the empty sheet, unwired.</summary>
    public const string AddReroute = Prefix + "add-reroute";

    /// <summary>Puts every state value of the node the menu was opened on back to its default — a counter to its start.</summary>
    public const string ResetState = Prefix + "reset-state";

    /// <summary>Sets the input the pin's menu was opened on out as a parameter of the sheet (<c>NodesComponent.ShowParameters</c>).</summary>
    public const string AddParameter = Prefix + "add-parameter";

    /// <summary>Takes the input the pin's menu was opened on back out of the sheet's parameters.</summary>
    public const string RemoveParameter = Prefix + "remove-parameter";

    /// <summary>Lets go every wire of the pin the menu was opened on and, on an input, puts its value back to the kind's default.</summary>
    public const string ResetPin = Prefix + "reset-pin";

    /// <summary>The entry whose choices are the colours a node or a group may wear.</summary>
    public const string Color = Prefix + "color";

    /// <summary>The choice that takes a node's or a group's own colour away, leaving its kind's or the canvas's.</summary>
    public const string DefaultColor = Color + ":default";

    /// <summary>The key of the colour choice at <paramref name="index"/> in <c>SetColorChoices</c>' order.</summary>
    public static string ColorChoice(int index)
        => Color + ":" + index.ToString(CultureInfo.InvariantCulture);

    /// <summary>
    /// Whether a menu entry's key is one of the canvas's own.
    /// </summary>
    public static bool IsBuiltIn(string? key)
        => key is not null && key.StartsWith(Prefix, StringComparison.Ordinal);
}

/// <summary>
/// The canvas's menus beside the empty-surface one; each is a component region, opened by that same name.
/// </summary>
public static class UIGraphMenus
{
    /// <summary>The menu under the button in the canvas's corner — Arrange, Fit and Save, and the application's own.</summary>
    public const string Main = "graph-menu";

    /// <summary>The menu the right button opens on a node.</summary>
    public const string Node = "graph-node-menu";

    /// <summary>The menu the right button opens on a group's band.</summary>
    public const string Group = "graph-group-menu";

    /// <summary>The menu the right button opens on a pin's row of a node canvas, over the node's own.</summary>
    public const string Pin = "graph-pin-menu";

    /// <summary>The menu the right button opens on an edge, where a canvas has one.</summary>
    public const string Edge = "graph-edge-menu";

    /// <summary>
    /// The menu a production graph opens when a link is dropped on a resource one recipe already makes: that recipe's ingredient,
    /// or a recipe of its own.
    /// </summary>
    public const string Link = "graph-link-menu";
}

/// <summary>
/// What a menu was opened on, as <see cref="GraphEvents.MenuEntry"/> names it.
/// </summary>
public static class UIGraphMenuTargets
{
    /// <summary>The corner menu, or the menu of the empty surface: the sheet as a whole, with no id.</summary>
    public const string Canvas = "canvas";

    /// <summary>An item: a node, a resource, a craft.</summary>
    public const string Node = "node";

    /// <summary>A group's band.</summary>
    public const string Group = "group";

    /// <summary>An edge, where the canvas has an edge menu.</summary>
    public const string Edge = "edge";
}

/// <summary>
/// The names of the canvas's regions that are not menus. A node's editors are the framework's own components, drawn from templates
/// the canvas carries under these names.
/// </summary>
public static class UIGraphRegions
{
    /// <summary>The search field over the node picker's catalogue.</summary>
    public const string PickerSearch = "graph-picker-search";

    /// <summary>What every pin editor's name starts with.</summary>
    public const string EditorPrefix = "graph-editor:";

    /// <summary>The button that takes a row out of a list pin.</summary>
    public const string ListRemove = "graph-list-remove";

    /// <summary>The button that adds a row to a list pin.</summary>
    public const string ListAdd = "graph-list-add";

    /// <summary>The button that puts a state value back to its default (<see cref="GraphInputAttribute.State"/>).</summary>
    public const string StateReset = "graph-state-reset";

    /// <summary>What a plan's amounts are counted over, in the production graph's plan panel.</summary>
    public const string PlanPeriod = "graph-plan-period";

    /// <summary>What a plan makes least, in the plan panel.</summary>
    public const string PlanObjective = "graph-plan-objective";

    /// <summary>The field one target's amount is drawn with, in the plan panel.</summary>
    public const string PlanAmount = "graph-plan-amount";

    /// <summary>The button that takes a target out of the plan.</summary>
    public const string PlanRemove = "graph-plan-remove";

    /// <summary>The button that opens the picker of resources to plan for.</summary>
    public const string PlanAdd = "graph-plan-add";

    /// <summary>
    /// The template a pin's editor is drawn from, keyed by node kind and pin name — a list pin's row field, or a picture's field
    /// with its choose-file button.
    /// </summary>
    public static string Editor(string typeKey, string pinName)
        => EditorPrefix + typeKey + ":" + pinName;
}

/// <summary>
/// The keys of the words the canvas's own controls and menu entries carry, translated as the framework's are; the web package lists
/// their English.
/// </summary>
public static class UIGraphWords
{
    /// <summary>The menus' entry that lays the sheet out.</summary>
    public const string Arrange = "ui.graph.arrange";

    /// <summary>The menus' entry and the zoom bar's button that bring everything into view.</summary>
    public const string Fit = "ui.graph.fit";

    /// <summary>The corner menu's entry that commits the sheet.</summary>
    public const string Save = "ui.graph.save";

    /// <summary>The sheet's menu entry that frames the chosen items.</summary>
    public const string GroupSelection = "ui.graph.group-selection";

    /// <summary>The sheet's menu entry that takes out what is chosen.</summary>
    public const string DeleteSelection = "ui.graph.delete-selection";

    /// <summary>An edge's menu entry that takes it out.</summary>
    public const string DeleteEdge = "ui.graph.delete-edge";

    /// <summary>An item's or a frame's menu entry that pins it, checked while it is.</summary>
    public const string Pinned = "ui.graph.pinned";

    /// <summary>An item's or a frame's menu entry that names it.</summary>
    public const string Rename = "ui.graph.rename";

    /// <summary>An item's or a frame's menu entry whose choices are the colours it may wear.</summary>
    public const string Color = "ui.graph.color";

    /// <summary>The colour choice that takes an item's own colour away.</summary>
    public const string DefaultColor = "ui.graph.default-color";

    /// <summary>The sheet's menu entry that adds a node, and the node picker's title.</summary>
    public const string AddNode = "ui.graph.add-node";

    /// <summary>The node picker's search field.</summary>
    public const string SearchKinds = "ui.graph.search-kinds";

    /// <summary>The node canvas's entry that puts a reroute on an edge or the sheet.</summary>
    public const string AddReroute = "ui.graph.add-reroute";

    /// <summary>A node's menu entry that puts its state back to where it starts.</summary>
    public const string ResetNodeState = "ui.graph.reset-node-state";

    /// <summary>A layered graph's edge entry that opens a field over its caption.</summary>
    public const string Caption = "ui.graph.caption";

    /// <summary>The entry that lets the viewer's change of an item go for the application's.</summary>
    public const string TakeServer = "ui.graph.take-server";

    /// <summary>The entry that keeps the viewer's change of an item over the application's.</summary>
    public const string KeepMine = "ui.graph.keep-mine";

    /// <summary>A production graph's sheet entry that adds a resource.</summary>
    public const string AddResource = "ui.graph.add-resource";

    /// <summary>A production graph's entry that opens a field over how long a run lasts.</summary>
    public const string CraftTime = "ui.graph.craft-time";

    /// <summary>A plan's entry that brings a resource in rather than making it, checked while it does.</summary>
    public const string Bought = "ui.graph.bought";

    /// <summary>A recipe edge's entry that opens a field over the amount it takes.</summary>
    public const string Takes = "ui.graph.takes";

    /// <summary>A recipe edge's entry that opens a field over what one run gives.</summary>
    public const string Gives = "ui.graph.gives";

    /// <summary>The dropped link's answer that joins the recipe that already makes the resource.</summary>
    public const string LinkIngredient = "ui.graph.link-ingredient";

    /// <summary>The dropped link's answer that makes a recipe of its own.</summary>
    public const string LinkRecipe = "ui.graph.link-recipe";

    /// <summary>The first of the default colour choices, the theme's first series.</summary>
    public const string Blue = "ui.graph.color-blue";

    /// <summary>The theme's second series, as a colour choice.</summary>
    public const string Amber = "ui.graph.color-amber";

    /// <summary>The theme's third series, as a colour choice.</summary>
    public const string Green = "ui.graph.color-green";

    /// <summary>The theme's fourth series, as a colour choice.</summary>
    public const string Rose = "ui.graph.color-rose";

    /// <summary>The theme's fifth series, as a colour choice.</summary>
    public const string Purple = "ui.graph.color-purple";

    /// <summary>The theme's sixth series, as a colour choice.</summary>
    public const string Cyan = "ui.graph.color-cyan";

    /// <summary>The theme's seventh series, as a colour choice.</summary>
    public const string Bronze = "ui.graph.color-bronze";

    /// <summary>The theme's eighth series, as a colour choice.</summary>
    public const string Fern = "ui.graph.color-fern";

    /// <summary>A list row's or a plan target's remove button.</summary>
    public const string Remove = "ui.graph.remove";

    /// <summary>A list pin's add-a-row button.</summary>
    public const string AddValue = "ui.graph.add-value";

    /// <summary>A state value's reset button.</summary>
    public const string ResetState = "ui.graph.reset-state";

    /// <summary>A picture field's choose-a-file button.</summary>
    public const string ChooseFile = "ui.graph.choose-file";

    /// <summary>A pin's menu entry that sets its input out as a parameter of the sheet.</summary>
    public const string AddParameter = "ui.graph.add-parameter";

    /// <summary>A pin's menu entry that takes its input back out of the sheet's parameters.</summary>
    public const string RemoveParameter = "ui.graph.remove-parameter";

    /// <summary>A pin's menu entry that lets its wires go and puts its value back.</summary>
    public const string ResetPin = "ui.graph.reset-pin";

    /// <summary>The plan panel's add-a-target button.</summary>
    public const string AddTarget = "ui.graph.add-target";

    /// <summary>The plan panel's resource search.</summary>
    public const string SearchResources = "ui.graph.search-resources";

    /// <summary>The word a target of the plan is named by.</summary>
    public const string Target = "ui.graph.target";

    /// <summary>The plan's period select.</summary>
    public const string Period = "ui.graph.plan-period";

    /// <summary>The period for one batch.</summary>
    public const string PeriodOnce = "ui.graph.plan-once";

    /// <summary>The period of a minute.</summary>
    public const string PeriodMinute = "ui.graph.plan-minute";

    /// <summary>The period of an hour.</summary>
    public const string PeriodHour = "ui.graph.plan-hour";

    /// <summary>The plan's objective select.</summary>
    public const string Objective = "ui.graph.plan-objective";

    /// <summary>The objective of the least raw resources.</summary>
    public const string LeastRaw = "ui.graph.plan-least-raw";

    /// <summary>The objective of the least time.</summary>
    public const string LeastTime = "ui.graph.plan-least-time";

    /// <summary>The objective of the least cost.</summary>
    public const string LeastCost = "ui.graph.plan-least-cost";

    /// <summary>What a display pin's value was cut short by, with its <c>count</c>: "… 1234 more".</summary>
    public const string More = "ui.graph.more";

    /// <summary>The run's failure of a node an input it needs was not given, with the input's <c>pin</c> title.</summary>
    public const string RunRequired = "ui.graph.run-required";

    /// <summary>The run's line on the node a Stop cut short.</summary>
    public const string RunStopped = "ui.graph.run-stopped";

    /// <summary>The run's failure of a node that waits for itself.</summary>
    public const string RunCycle = "ui.graph.run-cycle";

    /// <summary>A folder's line on the file a run takes: its <c>index</c> of the <c>total</c>, and the file's <c>name</c>.</summary>
    public const string FileProgress = "ui.graph.file-progress";
}

/// <summary>
/// One colour an item or a group may be given from its menu: the name the entry says, and the CSS colour it paints.
/// </summary>
public sealed record UIGraphColorChoice(string Title, string Color);

/// <summary>
/// The events a canvas of the package raises beyond an input's own.
/// </summary>
public static class GraphEvents
{
    /// <summary>
    /// Raised after the document commits; its key is the save's reason (<see cref="UIGraphArguments.Reason"/>), empty for the
    /// viewer's own.
    /// </summary>
    public const string Save = "save";

    /// <summary>A click on a node, with the node's id as the command's key.</summary>
    public const string NodeClick = "node-click";

    /// <summary>
    /// A click on an application's own menu entry, naming the entry, the target kind (<see cref="UIGraphMenuTargets"/>) and its id
    /// via <see cref="UIGraphArguments"/>.
    /// </summary>
    /// <remarks>The canvas's own entries never raise it.</remarks>
    public const string MenuEntry = "menu-entry";

    /// <summary>
    /// A file chosen on a picture pin is uploaded, naming the node, pin, selection and file name via
    /// <see cref="UIGraphArguments"/>.
    /// </summary>
    /// <remarks>The pin shows nothing until the application replies with the stored address.</remarks>
    public const string ImageUpload = "image-upload";

    /// <summary>The run panel's Stop, while a run is on: the command ends it (<see cref="UINodeRuns.Stop"/>).</summary>
    public const string RunStop = "run-stop";
}
