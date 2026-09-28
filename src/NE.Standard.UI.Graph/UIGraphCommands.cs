using System;
using System.Globalization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The menu entries the canvas answers itself. An entry whose key starts with <see cref="Prefix"/> never reaches the server:
/// the canvas's engine catches the click and does the work in the browser.
/// </summary>
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
/// The keys of the words the canvas's own controls carry, translated as the framework's are; the web package lists their English.
/// </summary>
public static class UIGraphWords
{
    /// <summary>A list row's or a plan target's remove button.</summary>
    public const string Remove = "ui.graph.remove";

    /// <summary>A list pin's add-a-row button.</summary>
    public const string AddValue = "ui.graph.add-value";

    /// <summary>A state value's reset button.</summary>
    public const string ResetState = "ui.graph.reset-state";

    /// <summary>A picture field's choose-a-file button.</summary>
    public const string ChooseFile = "ui.graph.choose-file";

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
    /// Raised after the document commits, from Ctrl+S, the menu's Save, an edit saved as it is made
    /// (<see cref="IGraphCanvasComponent.AutoSave"/>), the run panel's Run and Run all, or a <see cref="SaveDocumentEffect"/>. Its
    /// key is the save's reason (<see cref="UIGraphArguments.Reason"/>) — empty for the viewer's own.
    /// </summary>
    public const string Save = "save";

    /// <summary>A click on a node, with the node's id as the command's key.</summary>
    public const string NodeClick = "node-click";

    /// <summary>
    /// A click on an application's own menu entry, naming the entry, the target kind (<see cref="UIGraphMenuTargets"/>) and its id
    /// via <see cref="UIGraphArguments"/>. The canvas's own entries never raise it.
    /// </summary>
    public const string MenuEntry = "menu-entry";

    /// <summary>
    /// A file chosen on a picture pin is uploaded, naming the node, pin, selection and file name via <see cref="UIGraphArguments"/>.
    /// The pin shows nothing until the application replies with the stored address.
    /// </summary>
    public const string ImageUpload = "image-upload";

    /// <summary>The run panel's Stop, while a run is on: the command ends it (<see cref="UINodeRuns.Stop"/>).</summary>
    public const string RunStop = "run-stop";
}
