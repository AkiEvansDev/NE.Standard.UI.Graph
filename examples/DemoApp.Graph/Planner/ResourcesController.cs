using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using NE.Standard.UI.Primitives.Recursive;

namespace DemoApp.Graph.Planner;

/// <summary>
/// The catalogue the planner starts from empty: resources added one by one, each set up with the recipe that makes it, and what it is
/// made from drawn beside the form. Every change is written as it is made.
/// </summary>
internal sealed partial class ResourcesController : UIControllerBase
{
    public const string DeleteDialogKey = "planner-delete-resource";
    public const string ImportDialogKey = "planner-import-resources";

    /// <summary>How a file's catalogue is taken in: merged by id into this one, or in its place.</summary>
    public const string MergeImport = "merge";
    public const string ReplaceImport = "replace";

    private const int MaxAmount = 999;
    private const double MaxSeconds = 3600;

    private IReadOnlyList<ResourceRecord> _resources = [];

    // The resource the form holds: a chosen key that differs from it is the viewer's pick in the list.
    private string? _openId;

    private PlannerStore Store => Context.Services.GetRequiredService<PlannerStore>();

    private PlannerPictures Pictures => Context.Services.GetRequiredService<PlannerPictures>();

    [RecursiveMember(false)]
    public RecursiveCollection<TextItem> Resources { get; } = [];

    [RecursiveMember]
    public partial string? SelectedKey { get; set; }

    [RecursiveMember]
    public partial string? Name { get; set; }

    [RecursiveMember]
    public partial string? Icon { get; set; }

    [RecursiveMember]
    public partial string? Color { get; set; }

    /// <summary>The address of the picture the resource wears over its glyph, which the picture field shows.</summary>
    [RecursiveMember]
    public partial string? Picture { get; set; }

    /// <summary>The picture field's upload, which the command reads the file back by.</summary>
    [RecursiveMember]
    public partial string? PictureSelection { get; set; }

    [RecursiveMember]
    public partial UIVisibility PictureVisibility { get; set; } = UIVisibility.Collapsed;

    [RecursiveMember]
    public partial decimal? Output { get; set; }

    [RecursiveMember]
    public partial decimal? Seconds { get; set; }

    [RecursiveMember(false)]
    public RecursiveCollection<AmountRow> Ingredients { get; } = [];

    /// <summary>What an ingredient can be: every resource but the one being made.</summary>
    [RecursiveMember(false)]
    public RecursiveCollection<OptionItem> IngredientOptions { get; } = [];

    /// <summary>The resource open and everything it is made from, as the production graph reads it.</summary>
    [RecursiveMember(false)]
    public RecursiveCollection<UIProductionEntry> Preview { get; } = [];

    [RecursiveMember]
    public partial UIPhrase? RecipeNote { get; set; }

    [RecursiveMember]
    public partial UIVisibility EmptyVisibility { get; set; } = UIVisibility.Visible;

    [RecursiveMember]
    public partial UIVisibility EditorVisibility { get; set; } = UIVisibility.Collapsed;

    [RecursiveMember]
    public partial UIPhrase? DeleteQuestion { get; set; }

    /// <summary>The picker's upload, which the import reads the file back by.</summary>
    [RecursiveMember]
    public partial string? ImportSelection { get; set; }

    [RecursiveMember]
    public partial string? ImportMode { get; set; } = MergeImport;

    protected override Task OnInitializeAsync(CancellationToken cancellationToken)
    {
        Reload();
        OpenFirst();

        return Task.CompletedTask;
    }

    /// <summary>The first resource open, or the empty pane when there is none.</summary>
    private void OpenFirst()
    {
        if (_resources.Count > 0)
        {
            Open(_resources[0].Id);
            return;
        }

        _openId = null;
        SelectedKey = null;
        EmptyVisibility = UIVisibility.Visible;
        EditorVisibility = UIVisibility.Collapsed;
        Preview.Clear();
    }

    private void Open(string id)
    {
        if (Find(id) is not ResourceRecord resource)
            return;

        _openId = resource.Id;
        SelectedKey = resource.Id;
        Name = resource.Name;
        Icon = resource.Icon;
        Color = resource.Color;
        ShowPicture(resource);
        Output = resource.Output;
        Seconds = (decimal)resource.Seconds;

        Ingredients.Clear();

        foreach (AmountRecord ingredient in resource.Ingredients)
            Ingredients.Add(AmountRow.From(ingredient));

        EmptyVisibility = UIVisibility.Collapsed;
        EditorVisibility = UIVisibility.Visible;

        FillOptions();
        Redraw();
    }

    private void ShowPicture(ResourceRecord resource)
    {
        Picture = Pictures.AddressOf(resource);
        PictureVisibility = Picture is null ? UIVisibility.Collapsed : UIVisibility.Visible;
    }

    /// <summary>
    /// The resource chosen in the list opens in the form, whether a press or the arrows chose it: the choice reaches the controller as
    /// the list's bound key, where an item click would be the pointer's alone.
    /// </summary>
    protected override void OnNotify(RecursiveChange change)
    {
        base.OnNotify(change);

        ArgumentNullException.ThrowIfNull(change);

        RecursivePath path = change.Path;

        if (path.Count == 1 && path[0].Kind == PathSegmentKind.Property && path[0].Property == nameof(SelectedKey) && SelectedKey is { } id && id != _openId)
            Open(id);
    }

    /// <summary>A new resource, named so it can be found, and open to be set up.</summary>
    [UICommand]
    public void Add()
    {
        var id = Store.CreateResource(NewName(), PlannerCatalogue.DefaultIcon);

        Reload();
        Open(id);
    }

    private string NewName()
    {
        var name = "New resource";

        for (var n = 2; Exists(name); n++)
            name = string.Create(CultureInfo.InvariantCulture, $"New resource {n}");

        return name;
    }

    private bool Exists(string name)
    {
        foreach (ResourceRecord resource in _resources)
        {
            if (string.Equals(resource.Name, name, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    /// <summary>The name, the look, the output or the time changed: written at once, a blank name or an amount out of range put back.</summary>
    [UICommand]
    public void SaveResource()
    {
        if (Selected() is not ResourceRecord resource)
            return;

        var name = string.IsNullOrWhiteSpace(Name) ? resource.Name : Name.Trim();
        var icon = string.IsNullOrEmpty(Icon) ? PlannerCatalogue.DefaultIcon : Icon;
        var output = (int)Math.Clamp(Output ?? resource.Output, 1, MaxAmount);
        var seconds = Math.Clamp(Seconds is { } typed && typed > 0 ? (double)typed : resource.Seconds, 0.1, MaxSeconds);

        Store.UpdateResource(resource.Id, name, icon, Color, output, seconds);

        Name = name;
        Icon = icon;
        Output = output;
        Seconds = (decimal)seconds;

        Reload();
        FillOptions();
        Redraw();
    }

    /// <summary>A picture chosen in the field: read, checked to be one, and worn over the glyph from now on.</summary>
    [UICommand]
    public async Task<UICommandResult> TakePictureAsync(CancellationToken cancellationToken)
    {
        if (SelectedKey is not { } id)
            return UICommandResult.Ok();

        (var content, var error) = await PlannerFiles.ReadUploadAsync(Context, PictureSelection, cancellationToken).ConfigureAwait(false);
        UICommandResult answer = UICommandResult.Ok();

        // In the runtime's turn: past its first wait the command runs beside the tab, whose values write these members too.
        _ = await Context.Runtime.InvokeAsync(() => answer = TakePicture(id, content, error), cancellationToken).ConfigureAwait(false);

        return answer;
    }

    private UICommandResult TakePicture(string id, byte[]? content, string? error)
    {
        PictureSelection = null;

        if (content is not null && content.Length > PlannerPictures.MaxBytes)
            (content, error) = (null, "planner.picture.too-large");

        var type = content is null ? null : PlannerPictures.Sniff(content);

        if (content is null || type is null)
        {
            if (Selected() is ResourceRecord unchanged)
                ShowPicture(unchanged);

            return Refuse(error ?? "planner.picture.not-picture");
        }

        Store.SetPicture(id, new PictureRecord(content, type));
        Reload();
        Redraw();

        if (Selected() is ResourceRecord resource)
            ShowPicture(resource);

        return UICommandResult.Ok();
    }

    /// <summary>The picture taken off: the resource wears its glyph again.</summary>
    [UICommand]
    public void RemovePicture()
    {
        if (SelectedKey is not { } id)
            return;

        Store.SetPicture(id, null);
        Reload();
        Redraw();

        if (Selected() is ResourceRecord resource)
            ShowPicture(resource);
    }

    [UICommand]
    public void AddIngredient()
    {
        Ingredients.Add(new AmountRow(PlannerDatabase.NewId()) { Amount = 1 });
        SaveIngredients();
    }

    [UICommand]
    public void RemoveIngredient(string id)
    {
        for (var i = 0; i < Ingredients.Count; i++)
        {
            if (Ingredients[i].Id == id)
            {
                Ingredients.RemoveAt(i);
                break;
            }
        }

        SaveIngredients();
    }

    /// <summary>A row's resource or amount changed, or a row came or went: the recipe is written whole.</summary>
    [UICommand]
    public void SaveIngredients()
    {
        if (SelectedKey is not { } id)
            return;

        List<AmountRecord> rows = new(Ingredients.Count);

        foreach (AmountRow row in Ingredients)
        {
            row.Amount = Math.Clamp(row.Amount ?? 1, 1, MaxAmount);
            rows.Add(row.ToRecord());
        }

        Store.SetIngredients(id, rows);

        Reload();
        Redraw();
    }

    /// <summary>Asks before a resource goes, naming what it takes with it.</summary>
    [UICommand]
    public UICommandResult AskDelete()
    {
        if (Selected() is not ResourceRecord resource)
            return UICommandResult.Ok();

        var recipes = 0;

        foreach (ResourceRecord other in _resources)
        {
            foreach (AmountRecord ingredient in other.Ingredients)
            {
                if (other.Id != resource.Id && ingredient.ResourceId == resource.Id)
                {
                    recipes++;
                    break;
                }
            }
        }

        var goals = 0;

        foreach (BuildRecord build in Store.ListBuilds())
        {
            foreach (AmountRecord goal in build.Goals)
            {
                if (goal.ResourceId == resource.Id)
                    goals++;
            }
        }

        // The resource's name is content, an argument as written.
        DeleteQuestion = (recipes, goals) switch
        {
            (0, 0) => UIPhrase.Of("planner.resource.delete.unused", ("name", resource.Name)),
            (_, 0) => UIPhrase.Of("planner.resource.delete.recipes", ("count", recipes), ("name", resource.Name)),
            (0, _) => UIPhrase.Of("planner.resource.delete.goals", ("count", goals), ("name", resource.Name)),
            _ => UIPhrase.Of("planner.resource.delete.both", ("recipes", UIPhrase.Of("planner.count.recipes", ("count", recipes))), ("goals", UIPhrase.Of("planner.count.goals", ("count", goals))), ("name", resource.Name))
        };

        return UICommandResult.Ok([new OpenDialogEffect(DeleteDialogKey)]);
    }

    [UICommand]
    public UICommandResult Delete()
    {
        if (SelectedKey is not { } id)
            return UICommandResult.Ok([new CloseDialogEffect(DeleteDialogKey)]);

        Store.DeleteResource(id);
        Reload();
        OpenFirst();

        return UICommandResult.Ok([new CloseDialogEffect(DeleteDialogKey)]);
    }

    [UICommand]
    public static UICommandResult CloseDialog()
        => UICommandResult.Ok([new CloseDialogEffect(DeleteDialogKey), new CloseDialogEffect(ImportDialogKey)]);

    /// <summary>The catalogue written to a file the browser saves: every resource with its recipe and its picture.</summary>
    [UICommand]
    public async Task ExportAsync(CancellationToken cancellationToken)
    {
        var content = PlannerFiles.WriteResources(Store.ListResources(), Store.ReadPictures());

        _ = await Context.Downloads.DownloadAsync(Context.Handle, PlannerFiles.ResourcesFileName, PlannerFiles.ResourcesContentType, content, cancellationToken).ConfigureAwait(false);
    }

    [UICommand]
    public UICommandResult OpenImport()
    {
        ImportSelection = null;
        ImportMode = MergeImport;

        return UICommandResult.Ok([new OpenDialogEffect(ImportDialogKey)]);
    }

    /// <summary>The picked file read, checked and taken in; a file that is not a catalogue is refused and the dialog stays open.</summary>
    [UICommand]
    public async Task<UICommandResult> ImportAsync(CancellationToken cancellationToken)
    {
        (var content, var uploadError) = await PlannerFiles.ReadUploadAsync(Context, ImportSelection, cancellationToken).ConfigureAwait(false);
        UICommandResult answer = UICommandResult.Ok();

        // In the runtime's turn: past its first wait the command runs beside the tab, whose values write these members too.
        _ = await Context.Runtime.InvokeAsync(() => answer = TakeImport(content, uploadError), cancellationToken).ConfigureAwait(false);

        return answer;
    }

    private UICommandResult TakeImport(byte[]? content, string? uploadError)
    {
        if (content is null)
            return Refuse(uploadError);

        (IReadOnlyList<ResourceRecord>? resources, IReadOnlyDictionary<string, PictureRecord> pictures, var fileError) = PlannerFiles.ReadResources(content);

        if (resources is null)
            return Refuse(fileError);

        var replace = ImportMode == ReplaceImport;
        var open = SelectedKey;

        Store.ImportResources(resources, pictures, replace);
        Reload();

        if (open is not null && Find(open) is not null)
            Open(open);
        else
            OpenFirst();

        // A toast is written once, in the language the page shows as it opens.
        UIPhrase taken = UIPhrase.Of(replace ? "planner.resources.imported.replace" : "planner.resources.imported.merge", ("count", resources.Count));

        return UICommandResult.Ok([new CloseDialogEffect(ImportDialogKey), new ShowNotificationEffect(taken, UIColorStyle.Success)]);
    }

    /// <summary>A notification of why nothing was taken, the reason one of the demo's keys.</summary>
    private static UICommandResult Refuse(string? reason)
        => UICommandResult.Ok([new ShowNotificationEffect(new UIPhrase(reason ?? "planner.file.nothing-read"), UIColorStyle.Danger)]);

    /// <summary>The catalogue read again, and the list rewritten in place: a row keeps its key, so the selection and the scroll stay.</summary>
    private void Reload()
    {
        _resources = Store.ListResources();

        for (var i = Resources.Count - 1; i >= 0; i--)
        {
            if (Find(Resources[i].Id) is null)
                Resources.RemoveAt(i);
        }

        for (var i = 0; i < _resources.Count; i++)
        {
            ResourceRecord resource = _resources[i];
            var at = IndexOf(Resources, resource.Id);
            TextItem row = at >= 0 ? Resources[at] : new TextItem { Id = resource.Id };

            row.Title = resource.Name;
            row.Icon = Pictures.LookOf(resource);
            row.Description = Describe(resource);

            if (at < 0)
                Resources.Insert(i, row);
            else if (at != i)
                Resources.Move(at, i);
        }
    }

    private static int IndexOf(RecursiveCollection<TextItem> items, string id)
    {
        for (var i = 0; i < items.Count; i++)
        {
            if (items[i].Id == id)
                return i;
        }

        return -1;
    }

    /// <summary>What the list says under a name: brought in (a key of the demo's words), or the names a run takes, as written.</summary>
    private string Describe(ResourceRecord resource)
    {
        List<string> names = [];

        foreach (AmountRecord ingredient in resource.Ingredients)
        {
            if (ingredient.ResourceId is { } id && Find(id) is ResourceRecord taken && !names.Contains(taken.Name))
                names.Add(taken.Name);
        }

        return names.Count == 0 ? "planner.resource.brought-in" : string.Join(", ", names);
    }

    /// <summary>Every resource but the one open, by name: a recipe cannot take what it makes.</summary>
    private void FillOptions()
    {
        // Kept in step rather than filled anew: every ingredient's search redraws its list on each change to it, and a fresh fill on
        // each open was seventy removals and seventy inserts for the one resource that left the list and the one that came back.
        List<ResourceRecord> wanted = new(_resources.Count);

        foreach (ResourceRecord resource in _resources)
        {
            if (resource.Id != SelectedKey)
                wanted.Add(resource);
        }

        for (var i = IngredientOptions.Count - 1; i >= 0; i--)
        {
            if (!wanted.Exists(resource => resource.Id == IngredientOptions[i].Id))
                IngredientOptions.RemoveAt(i);
        }

        for (var i = 0; i < wanted.Count; i++)
        {
            ResourceRecord resource = wanted[i];
            var look = Pictures.LookOf(resource);
            var found = -1;

            for (var at = i; at < IngredientOptions.Count; at++)
            {
                if (IngredientOptions[at].Id == resource.Id)
                {
                    found = at;
                    break;
                }
            }

            if (found < 0)
            {
                IngredientOptions.Insert(i, new OptionItem { Id = resource.Id, Title = resource.Name, Icon = look });
                continue;
            }

            OptionItem option = IngredientOptions[found];

            // A rename moves a resource in the catalogue's order: the option moves with it.
            if (found != i)
            {
                IngredientOptions.RemoveAt(found);
                IngredientOptions.Insert(i, option);
            }

            if (option.Title != resource.Name)
                option.Title = resource.Name;

            if (option.Icon != look)
                option.Icon = look;
        }
    }

    /// <summary>The preview and the line over it, from what is stored now.</summary>
    private void Redraw()
    {
        if (Selected() is not ResourceRecord resource)
        {
            Preview.Clear();
            return;
        }

        IReadOnlyList<ResourceRecord> madeFrom = PlannerCatalogue.MadeFrom(_resources, resource.Id);
        PlannerCatalogue.Sync(Preview, PlannerCatalogue.Entries(madeFrom, Pictures));

        var seconds = resource.Seconds.ToString("0.##", CultureInfo.InvariantCulture);

        RecipeNote = madeFrom.Count == 1
            ? UIPhrase.Of("planner.recipe.note.brought-in", ("name", resource.Name))
            : UIPhrase.Of("planner.recipe.note.made", ("output", resource.Output), ("name", resource.Name), ("seconds", seconds), ("count", madeFrom.Count - 1));
    }

    private ResourceRecord? Selected()
        => SelectedKey is { } id ? Find(id) : null;

    private ResourceRecord? Find(string id)
    {
        foreach (ResourceRecord resource in _resources)
        {
            if (resource.Id == id)
                return resource;
        }

        return null;
    }
}
