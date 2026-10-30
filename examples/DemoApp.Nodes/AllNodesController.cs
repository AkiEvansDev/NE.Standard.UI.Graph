namespace DemoApp.Nodes;

/// <summary>
/// Every node kind the packages offer, laid out in groups by category so each kind's colour, pin type, wire and group frame can be
/// read side by side on one sheet.
/// </summary>
internal sealed partial class AllNodesController() : NodesSheetController(CanvasId, Kinds, StartingSheet, new UIPhrase("nodes.status.all"))
{
    public const string CanvasId = "all-sheet";

    /// <summary>Every node kind: common, file, calculator and image.</summary>
    public static UINodeCatalog Kinds { get; } = UINodeCatalog.FromTypes([.. UINodeKinds.Common, .. UINodeKinds.Files, .. CalculatorNodes.Kinds, .. ImageNodes.Kinds, .. ImageNodes.FileKinds]);

    private static UINodeDocument StartingSheet(string outFolder)
    {
        // 1. Values (default group colour, nodes wear their value type's series colour)
        UINode vNumber = new("v-number", NumberNode.NodeKey, 32, 64, values: Values(("Value", 42)));
        UINode vText = new("v-text", TextNode.NodeKey, 320, 64, values: Values(("Value", "NE.Standard")));
        UINode vDate = new("v-date", DateNode.NodeKey, 608, 64);
        UINode vYesNo = new("v-yes-no", YesNoNode.NodeKey, 32, 320, values: Values(("Value", true)));
        UINode vImage = new("v-image", ImageNode.NodeKey, 320, 320);
        UINode vRandom = new("v-random", RandomNode.NodeKey, 608, 320);

        // 2. Calculator (series-6 Teal)
        UINode cOp = new("c-op", OperationNode.NodeKey, 960, 64, values: Values(("Operation", "Multiply"), ("Left", 6), ("Right", 7)));
        UINode cRound = new("c-round", RoundNode.NodeKey, 1248, 64, values: Values(("Digits", 2)));
        UINode cResult = new("c-result", ResultNode.NodeKey, 1536, 64, values: Values(("Label", "Answer")));
        UINode cSum = new("c-sum", SumNode.NodeKey, 960, 256);
        UINode cClamp = new("c-clamp", ClampNode.NodeKey, 1248, 256);
        UINode cMinMax = new("c-min-max", MinMaxNode.NodeKey, 1536, 256);
        UINode cCompare = new("c-compare", CompareNode.NodeKey, 960, 416);

        // 3. Logic (series-4 Rose)
        UINode lAnd = new("l-and", AndNode.NodeKey, 1888, 64);
        UINode lOr = new("l-or", OrNode.NodeKey, 2176, 64);
        UINode lNot = new("l-not", NotNode.NodeKey, 2464, 64);
        UINode lEquals = new("l-equals", EqualsNode.NodeKey, 1888, 224);
        UINode lChoose = new("l-choose", ChooseNode.NodeKey, 2176, 224);

        // 4. Text (series-3 Mint)
        UINode tJoin = new("t-join", JoinNode.NodeKey, 32, 736, values: Values(("Template", "{0}")));
        UINode tTrim = new("t-trim", TrimNode.NodeKey, 320, 736);
        UINode tCase = new("t-case", ChangeCaseNode.NodeKey, 608, 736);
        UINode tSplit = new("t-split", SplitNode.NodeKey, 32, 928);
        UINode tReplace = new("t-replace", ReplaceNode.NodeKey, 320, 928);
        UINode tSlice = new("t-slice", SliceNode.NodeKey, 608, 928);
        UINode tLength = new("t-length", TextLengthNode.NodeKey, 32, 1152);
        UINode tContains = new("t-contains", ContainsNode.NodeKey, 320, 1152);
        UINode tMatch = new("t-match", MatchNode.NodeKey, 608, 1152);
        UINode tToNumber = new("t-to-number", ToNumberNode.NodeKey, 32, 1376, values: Values(("Text", "42")));
        UINode tToText = new("t-to-text", ToTextNode.NodeKey, 320, 1376);

        // 5. Lists (series-5 Purple)
        UINode liSort = new("li-sort", SortNode.NodeKey, 960, 736);
        UINode liReverse = new("li-reverse", ReverseNode.NodeKey, 1248, 736);
        UINode liDistinct = new("li-distinct", DistinctNode.NodeKey, 1536, 736);
        UINode liItemAt = new("li-item-at", ItemAtNode.NodeKey, 960, 896);
        UINode liCount = new("li-count", ListCountNode.NodeKey, 1248, 896);
        UINode liForEach = new("li-for-each", ForEachNode.NodeKey, 1536, 896);

        // 6. Dates (series-7 Lavender)
        UINode dAdd = new("d-add", AddToDateNode.NodeKey, 1888, 736);
        UINode dDiff = new("d-diff", DateDifferenceNode.NodeKey, 2176, 736);
        UINode dParts = new("d-parts", DatePartsNode.NodeKey, 2464, 736);

        // 7. Files (series-2 Bronze)
        UINode fFolder = new("f-folder", FilesInFolderNode.NodeKey, 1888, 1088, values: Values(("Folder", DemoFolders.In), ("Filter", "*.png")));
        UINode fRead = new("f-read", ReadTextNode.NodeKey, 2176, 1088);
        UINode fWrite = new("f-write", WriteTextNode.NodeKey, 2464, 1088);

        // 8. Image (series-1 Blue)
        UINode iLoad = new("i-load", LoadImageNode.NodeKey, 32, 1664);
        UINode iSize = new("i-size", ImageSizeNode.NodeKey, 320, 1664);
        UINode iGrey = new("i-grey", GrayscaleImageNode.NodeKey, 608, 1664);
        UINode iSave = new("i-save", SaveImageNode.NodeKey, 896, 1664, values: Values(("Folder", outFolder), ("Overwrite", true)));
        UINode iResize = new("i-resize", ResizeImageNode.NodeKey, 32, 1856);
        UINode iCrop = new("i-crop", CropImageNode.NodeKey, 320, 1856);
        UINode iRotate = new("i-rotate", RotateImageNode.NodeKey, 608, 1856);
        UINode iFlip = new("i-flip", FlipImageNode.NodeKey, 896, 1856);
        UINode iBlur = new("i-blur", BlurImageNode.NodeKey, 32, 2080);
        UINode iConvert = new("i-convert", ConvertImageNode.NodeKey, 320, 2080);

        // 9. Utilities (series-8 Violet)
        UINode uCounter = new("u-counter", CounterNode.NodeKey, 1248, 1664, values: Values(("From", 1), ("To", 5)));
        UINode uReroute = new("u-reroute", RerouteNode.NodeKey, 1568, 1696);
        UINode uDelay = new("u-delay", DelayNode.NodeKey, 1728, 1664, values: Values(("Seconds", 0.5)));
        UINode uDisplay = new("u-display", DisplayNode.NodeKey, 2048, 1664);
        UINode uNote = new("u-note", NoteNode.NodeKey, 2432, 1664, values: Values(("Text", "Every node kind and group colour in one sheet.")));
        UINode uRangeXY = new("u-range-xy", RangeXYNode.NodeKey, 1248, 1952);
        UINode uRangeXYZ = new("u-range-xyz", RangeXYZNode.NodeKey, 1536, 1952);

        return new UINodeDocument(
            [
                vNumber, vText, vDate, vYesNo, vImage, vRandom,
                cOp, cRound, cResult, cSum, cClamp, cMinMax, cCompare,
                lAnd, lOr, lNot, lEquals, lChoose,
                tJoin, tTrim, tCase, tSplit, tReplace, tSlice, tLength, tContains, tMatch, tToNumber, tToText,
                liSort, liReverse, liDistinct, liItemAt, liCount, liForEach,
                dAdd, dDiff, dParts,
                fFolder, fRead, fWrite,
                iLoad, iSize, iGrey, iSave, iResize, iCrop, iRotate, iFlip, iBlur, iConvert,
                uCounter, uReroute, uDelay, uDisplay, uNote, uRangeXY, uRangeXYZ
            ],
            [
                new UINodeEdge("e-calc-1", cOp.Id, nameof(OperationNode.Result), cRound.Id, nameof(RoundNode.Value)),
                new UINodeEdge("e-calc-2", cRound.Id, nameof(RoundNode.Result), cResult.Id, nameof(ResultNode.Value)),
                new UINodeEdge("e-logic-1", lAnd.Id, nameof(AndNode.Result), lOr.Id, nameof(OrNode.Values)),
                new UINodeEdge("e-logic-2", lOr.Id, nameof(OrNode.Result), lNot.Id, nameof(NotNode.Value)),
                new UINodeEdge("e-logic-3", lEquals.Id, nameof(EqualsNode.Result), lChoose.Id, nameof(ChooseNode.When)),
                new UINodeEdge("e-text-1", tJoin.Id, nameof(JoinNode.Text), tTrim.Id, nameof(TrimNode.Text)),
                new UINodeEdge("e-text-2", tTrim.Id, nameof(TrimNode.Result), tCase.Id, nameof(ChangeCaseNode.Text)),
                new UINodeEdge("e-list-1", liSort.Id, nameof(SortNode.Result), liReverse.Id, nameof(ReverseNode.List)),
                new UINodeEdge("e-list-2", liReverse.Id, nameof(ReverseNode.Result), liDistinct.Id, nameof(DistinctNode.List)),
                new UINodeEdge("e-date-1", dAdd.Id, nameof(AddToDateNode.Result), dParts.Id, nameof(DatePartsNode.Date)),
                new UINodeEdge("e-img-1", iLoad.Id, nameof(LoadImageNode.Result), iSize.Id, nameof(ImageSizeNode.Image)),
                new UINodeEdge("e-img-2", iLoad.Id, nameof(LoadImageNode.Result), iGrey.Id, nameof(GrayscaleImageNode.Image)),
                new UINodeEdge("e-img-3", iGrey.Id, nameof(GrayscaleImageNode.Result), iSave.Id, nameof(SaveImageNode.Image)),
                new UINodeEdge("e-util-1", uCounter.Id, nameof(CounterNode.Value), uReroute.Id, nameof(RerouteNode.Value)),
                new UINodeEdge("e-util-2", uReroute.Id, nameof(RerouteNode.Result), uDelay.Id, nameof(DelayNode.Value)),
                new UINodeEdge("e-util-3", uDelay.Id, nameof(DelayNode.Result), uDisplay.Id, nameof(DisplayNode.Value))
            ],
            [
                new UIGraphGroup("g-values", 0, 0, 864, 608, UINodeKinds.ValuesCategory),
                new UIGraphGroup("g-calculator", 928, 0, 864, 608, CalculatorNodes.Category, CalculatorNodes.NumberColor),
                new UIGraphGroup("g-logic", 1856, 0, 864, 384, UINodeKinds.LogicCategory, UINodeKinds.LogicColor),
                new UIGraphGroup("g-text", 0, 672, 864, 864, UINodeKinds.TextCategory, UINodeKinds.TextColor),
                new UIGraphGroup("g-lists", 928, 672, 864, 448, UINodeKinds.ListsCategory, UINodeKinds.ListColor),
                new UIGraphGroup("g-dates", 1856, 672, 864, 288, UINodeKinds.DatesCategory, UINodeKinds.DateColor),
                new UIGraphGroup("g-files", 1856, 1024, 864, 320, UINodeKinds.FilesCategory, FilesInFolderNode.FileColor),
                new UIGraphGroup("g-image", 0, 1600, 1152, 640, ImageNodes.Category, ImageNodes.Color),
                new UIGraphGroup("g-utilities", 1216, 1600, 1504, 800, UINodeKinds.UtilitiesCategory, UINodeKinds.UtilityColor)
            ]);
    }
}
