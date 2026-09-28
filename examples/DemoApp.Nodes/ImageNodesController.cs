namespace DemoApp.Nodes;

/// <summary>
/// The picture package's page: a picture chosen on the sheet, measured, resampled and turned grey, and under it what Run all is
/// for — a folder's pictures, one a run, made thumbnails and written out.
/// </summary>
internal sealed partial class ImageNodesController() : NodesSheetController(Kinds, StartingSheet, "Choose a picture on the Image node and press Run; Run all goes through the folder's pictures one a run, and Stop ends it part way.")
{
    /// <summary>The common kinds, the file kinds and the picture package's: what the picker offers here.</summary>
    public static UINodeCatalog Kinds { get; } = UINodeCatalog.FromTypes([.. UINodeKinds.Common, .. UINodeKinds.Files, .. ImageNodes.Kinds, .. ImageNodes.FileKinds]);

    /// <summary>
    /// Choose a picture on the Image node and run: its own height comes back off the file, the picture is resampled to a number's
    /// width within it and turned grey, the Delay holds the run long enough to watch it report, and the display shows the new picture.
    /// Under it, Run all over the folder, written into the page's own folder.
    /// </summary>
    private static UINodeDocument StartingSheet(string outFolder)
    {
        UINode picture = new("p-load", ImageNode.NodeKey, 40, 40);
        UINode size = new("p-size", ImageSizeNode.NodeKey, 360, 40);
        UINode width = new("p-width", NumberNode.NodeKey, 360, 200, values: Values(("Value", 320)));
        // Contain keeps the proportions, so the width alone decides the size: the picture's own height is only the most it may take.
        UINode resize = new("p-resize", ResizeImageNode.NodeKey, 640, 40, values: Values(("Mode", nameof(ImageResizeMode.Contain))));
        UINode grey = new("p-grey", GrayscaleImageNode.NodeKey, 900, 40);
        UINode delay = new("p-delay", DelayNode.NodeKey, 1160, 40, values: Values(("Seconds", 1.5)));
        UINode display = new("p-display", DisplayNode.NodeKey, 1420, 40);

        UINode files = new("b-files", FilesInFolderNode.NodeKey, 40, 420, values: Values(("Folder", DemoFolders.In), ("Filter", "*.png")));
        UINode load = new("b-load", LoadImageNode.NodeKey, 360, 420);
        UINode thumbnail = new("b-resize", ResizeImageNode.NodeKey, 640, 420, values: Values(("Width", 160), ("Height", 160), ("Mode", nameof(ImageResizeMode.Cover))));
        UINode save = new("b-save", SaveImageNode.NodeKey, 900, 640, values: Values(("Folder", outFolder), ("Overwrite", true)));
        // A second a picture, so a Run all can be watched going through the folder, and stopped part way.
        UINode pace = new("b-delay", DelayNode.NodeKey, 1160, 420, values: Values(("Seconds", 1)));
        UINode shown = new("b-display", DisplayNode.NodeKey, 1420, 420);

        return new UINodeDocument(
            [picture, size, width, resize, grey, delay, display, files, load, thumbnail, save, pace, shown],
            [
                new UINodeEdge("e-1", picture.Id, nameof(ImageNode.Image), size.Id, nameof(ImageSizeNode.Image)),
                new UINodeEdge("e-2", picture.Id, nameof(ImageNode.Image), resize.Id, nameof(ResizeImageNode.Image)),
                new UINodeEdge("e-3", width.Id, nameof(NumberNode.Result), resize.Id, nameof(ResizeImageNode.Width)),
                new UINodeEdge("e-4", size.Id, nameof(ImageSizeNode.Height), resize.Id, nameof(ResizeImageNode.Height)),
                new UINodeEdge("e-5", resize.Id, nameof(ResizeImageNode.Result), grey.Id, nameof(GrayscaleImageNode.Image)),
                new UINodeEdge("e-6", grey.Id, nameof(GrayscaleImageNode.Result), delay.Id, nameof(DelayNode.Value)),
                new UINodeEdge("e-7", delay.Id, nameof(DelayNode.Result), display.Id, nameof(DisplayNode.Value)),

                // Run all: every picture of the folder, one a run, made a thumbnail and written out under its own name.
                new UINodeEdge("e-8", files.Id, nameof(FilesInFolderNode.Path), load.Id, nameof(LoadImageNode.Path)),
                new UINodeEdge("e-9", load.Id, nameof(LoadImageNode.Result), thumbnail.Id, nameof(ResizeImageNode.Image)),
                new UINodeEdge("e-10", thumbnail.Id, nameof(ResizeImageNode.Result), save.Id, nameof(SaveImageNode.Image)),
                new UINodeEdge("e-11", files.Id, nameof(FilesInFolderNode.Name), save.Id, nameof(SaveImageNode.Name)),
                new UINodeEdge("e-12", thumbnail.Id, nameof(ResizeImageNode.Result), pace.Id, nameof(DelayNode.Value)),
                new UINodeEdge("e-13", pace.Id, nameof(DelayNode.Result), shown.Id, nameof(DisplayNode.Value))
            ]);
    }
}
