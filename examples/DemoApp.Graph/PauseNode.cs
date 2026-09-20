using System;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Icons.Material;

namespace DemoApp.Graph;

/// <summary>
/// Holds the run for a while and says how far along it is, then passes on whatever reached it. The one node here that takes long
/// enough to watch, which is what the status channel is for: its reports reach the canvas while it waits, not when the run answers.
/// </summary>
[GraphNode(
    Category = "Flow",
    Title = "Pause",
    Description = "Waits, reporting as it goes, and passes its value on.",
    Icon = MaterialIcons.HourglassEmpty,
    Color = DemoNodeColors.Any,
    ShowProgress = true)]
internal sealed class PauseNode : IGraphNodeAsync
{
    private const int Steps = 10;

    [GraphInput(Title = "Value", PinOnly = true)]
    public object? Value { get; set; }

    [GraphInput(Title = "Seconds", Min = 0.1, Max = 30, Step = 0.5)]
    public double Seconds { get; set; } = 1.5;

    [GraphOutput(Title = "Result", TypeOf = nameof(Value))]
    public object? Result { get; set; }

    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        TimeSpan step = TimeSpan.FromSeconds(Math.Clamp(Seconds, 0.1, 30) / Steps);

        // A node that waits writes as it goes: the line is in the log while the node is still counting.
        await context.LogAsync($"Holding the run for {Math.Clamp(Seconds, 0.1, 30):0.#} s.").ConfigureAwait(false);

        for (var taken = 1; taken <= Steps; taken++)
        {
            await Task.Delay(step, cancellationToken).ConfigureAwait(false);
            await context.ReportAsync("Waiting", taken / (double)Steps).ConfigureAwait(false);
        }

        Result = Value;
    }
}
