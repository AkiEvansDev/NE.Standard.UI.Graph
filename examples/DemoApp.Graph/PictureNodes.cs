using System;
using Microsoft.Extensions.DependencyInjection;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Icons.Material;

namespace DemoApp.Graph;

/// <summary>
/// A picture with the size it is to be shown at: a class of the application's own, and so a pin type of its own, which connects
/// only to another of its kind or to a universal pin.
/// </summary>
internal sealed class PictureBox
{
    /// <summary>Gets or sets where the picture is served from.</summary>
    public string? Address { get; set; }

    /// <summary>Gets or sets how wide it is shown, in pixels.</summary>
    public int Width { get; set; }

    /// <summary>Gets or sets how tall it is shown, in pixels.</summary>
    public int Height { get; set; }
}

/// <summary>
/// The picture's own pixel size, read off the file the store holds. Both ends of the chain a picture goes through start here:
/// nothing is known about a picture until the bytes are on the server.
/// </summary>
[GraphNode(
    Category = "Media",
    Title = "Picture size",
    Description = "The width and height of the picture that reaches it.",
    Icon = MaterialIcons.Straighten,
    Color = DemoNodeColors.Picture)]
internal sealed class PictureSizeNode : IGraphNode
{
    [GraphInput(Title = "Picture", PinOnly = true, Required = true)]
    public string? Picture { get; set; }

    [GraphOutput(Title = "Width")]
    public int Width { get; set; }

    [GraphOutput(Title = "Height")]
    public int Height { get; set; }

    public void Execute(UINodeRunContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        PictureStore? store = context.Services?.GetService<PictureStore>();

        if (store is null || string.IsNullOrWhiteSpace(Picture))
        {
            Width = 0;
            Height = 0;

            return;
        }

        (Width, Height) = store.SizeOf(Picture);

        // A node that runs straight through writes too; its lines go to the log when it is done.
        if (Width == 0 || Height == 0)
            context.Log("The file carries no size this node can read: PNG, GIF and JPEG headers only.", UINodeLogLevel.Warning);
        else
            context.Log($"The picture is {Width} × {Height} px.");
    }
}

/// <summary>
/// A picture at the size the numbers reaching it ask for.
/// </summary>
/// <remarks>
/// It scales what is shown; it does not write a new file. Resampling the bytes would take an imaging library, and the point of
/// the chain is the wiring — a picture in, its size out, arithmetic on the numbers, and the picture back at the new size.
/// </remarks>
[GraphNode(
    Category = "Media",
    Title = "Resize",
    Description = "Shows the picture at the width and height that reach it.",
    Icon = MaterialIcons.AspectRatio,
    Color = DemoNodeColors.Picture)]
internal sealed class ResizePictureNode : IGraphNode
{
    [GraphInput(Title = "Picture", PinOnly = true, Required = true)]
    public string? Picture { get; set; }

    [GraphInput(Title = "Width", Min = 1, Max = 4096, Unit = "px")]
    public int Width { get; set; } = 320;

    [GraphInput(Title = "Height", Min = 1, Max = 4096, Unit = "px")]
    public int Height { get; set; } = 240;

    [GraphOutput(Title = "Result")]
    public PictureBox? Result { get; set; }

    public void Execute(UINodeRunContext context)
        => Result = new PictureBox { Address = Picture, Width = Math.Max(1, Width), Height = Math.Max(1, Height) };
}

/// <summary>
/// Shows whatever reaches it, whatever that turns out to be: a number, a line of text, a picture, a list or a table of records.
/// Its one pin takes anything, and the panel is drawn from the shape of the value the run put there.
/// </summary>
[GraphNode(
    Category = "Output",
    Title = "Display",
    Description = "Shows whatever reaches it, drawn by the shape it has.",
    Icon = MaterialIcons.Visibility,
    Color = DemoNodeColors.Any,
    MinWidth = 16)]
internal sealed class DisplayNode
{
    [GraphInput(Title = "Value", Display = true, Height = 9, Format = "N0", Description = "Whatever the run last fed it.")]
    public object? Value { get; set; }
}
