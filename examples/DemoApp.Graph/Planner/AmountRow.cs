namespace DemoApp.Graph.Planner;

/// <summary>A row of a recipe or of a build as a page edits it: a resource picked from the catalogue, and an amount.</summary>
public sealed partial class AmountRow(string id) : RecursiveObservable, IBindableItem
{
    [RecursiveMember(false)]
    public string Id { get; } = id;

    [RecursiveMember]
    public partial string? Resource { get; set; }

    [RecursiveMember]
    public partial decimal? Amount { get; set; }

    public static AmountRow From(AmountRecord record)
        => new(record.Id) { Resource = record.ResourceId, Amount = (decimal)record.Amount };

    public AmountRecord ToRecord()
        => new(Id, Resource, (double)(Amount ?? 0));
}
