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
        UINode cCompare = new("c-compare", CompareNode.NodeKey, 960, 448);

        // 3. Logic (series-4 Rose)
        UINode lAnd = new("l-and", AndNode.NodeKey, 1888, 64);
        UINode lOr = new("l-or", OrNode.NodeKey, 2176, 64);
        UINode lNot = new("l-not", NotNode.NodeKey, 2464, 64);
        UINode lEquals = new("l-equals", EqualsNode.NodeKey, 1888, 224);
        UINode lChoose = new("l-choose", ChooseNode.NodeKey, 2176, 224);

        // 4. Text (series-3 Mint)
        UINode tJoin = new("t-join", JoinNode.NodeKey, 32, 768, values: Values(("Template", "{0}")));
        UINode tTrim = new("t-trim", TrimNode.NodeKey, 320, 768);
        UINode tCase = new("t-case", ChangeCaseNode.NodeKey, 608, 768);
        UINode tSplit = new("t-split", SplitNode.NodeKey, 32, 960);
        UINode tReplace = new("t-replace", ReplaceNode.NodeKey, 320, 960);
        UINode tSlice = new("t-slice", SliceNode.NodeKey, 608, 960);
        UINode tLength = new("t-length", TextLengthNode.NodeKey, 32, 1184);
        UINode tContains = new("t-contains", ContainsNode.NodeKey, 320, 1184);
        UINode tMatch = new("t-match", MatchNode.NodeKey, 608, 1184);
        UINode tToNumber = new("t-to-number", ToNumberNode.NodeKey, 32, 1440, values: Values(("Text", "42")));
        UINode tToText = new("t-to-text", ToTextNode.NodeKey, 320, 1440);

        // 5. Lists (series-5 Purple)
        UINode liSort = new("li-sort", SortNode.NodeKey, 960, 768);
        UINode liReverse = new("li-reverse", ReverseNode.NodeKey, 1248, 768);
        UINode liDistinct = new("li-distinct", DistinctNode.NodeKey, 1536, 768);
        UINode liItemAt = new("li-item-at", ItemAtNode.NodeKey, 960, 928);
        UINode liCount = new("li-count", ListCountNode.NodeKey, 1248, 928);
        UINode liForEach = new("li-for-each", ForEachNode.NodeKey, 1536, 928);

        // 6. Dates (series-7 Lavender)
        UINode dAdd = new("d-add", AddToDateNode.NodeKey, 1888, 768);
        UINode dParts = new("d-parts", DatePartsNode.NodeKey, 2176, 768);
        UINode dDiff = new("d-diff", DateDifferenceNode.NodeKey, 2464, 768);

        // 7. Files (series-2 Bronze)
        UINode fFolder = new("f-folder", FilesInFolderNode.NodeKey, 1888, 1152, values: Values(("Folder", DemoFolders.In), ("Filter", "*.png")));
        UINode fRead = new("f-read", ReadTextNode.NodeKey, 2176, 1152);
        UINode fWrite = new("f-write", WriteTextNode.NodeKey, 2464, 1152);

        // 8. Image (series-1 Blue)
        UINode iLoad = new("i-load", LoadImageNode.NodeKey, 32, 1728);
        UINode iGrey = new("i-grey", GrayscaleImageNode.NodeKey, 320, 1728);
        UINode iSave = new("i-save", SaveImageNode.NodeKey, 608, 1728, values: Values(("Folder", outFolder), ("Overwrite", true)));
        UINode iConvert = new("i-convert", ConvertImageNode.NodeKey, 896, 1728);
        UINode iResize = new("i-resize", ResizeImageNode.NodeKey, 32, 1920);
        UINode iSize = new("i-size", ImageSizeNode.NodeKey, 320, 1920);
        UINode iCrop = new("i-crop", CropImageNode.NodeKey, 608, 1920);
        UINode iRotate = new("i-rotate", RotateImageNode.NodeKey, 896, 1920);
        UINode iFlip = new("i-flip", FlipImageNode.NodeKey, 32, 2144);
        UINode iBlur = new("i-blur", BlurImageNode.NodeKey, 320, 2144);

        // 9. Utilities (series-8 Violet)
        UINode uCounter = new("u-counter", CounterNode.NodeKey, 1248, 1728, values: Values(("From", 1), ("To", 5)));
        UINode uReroute = new("u-reroute", RerouteNode.NodeKey, 1568, 1767);
        UINode uDelay = new("u-delay", DelayNode.NodeKey, 1728, 1728, values: Values(("Seconds", 0.5)));
        UINode uDisplay = new("u-display", DisplayNode.NodeKey, 2048, 1728);
        UINode uNote = new("u-note", NoteNode.NodeKey, 2432, 1728, values: Values(("Text", "Every node kind and group colour in one sheet.")));
        UINode uRangeXY = new("u-range-xy", RangeXYNode.NodeKey, 1248, 2048);
        UINode uRangeXYZ = new("u-range-xyz", RangeXYZNode.NodeKey, 1536, 2048);

        return new UINodeDocument(
            [
                vNumber, vText, vDate, vYesNo, vImage, vRandom,
                cOp, cRound, cResult, cSum, cClamp, cMinMax, cCompare,
                lAnd, lOr, lNot, lEquals, lChoose,
                tJoin, tTrim, tCase, tSplit, tReplace, tSlice, tLength, tContains, tMatch, tToNumber, tToText,
                liSort, liReverse, liDistinct, liItemAt, liCount, liForEach,
                dAdd, dParts, dDiff,
                fFolder, fRead, fWrite,
                iLoad, iGrey, iSave, iConvert, iResize, iSize, iCrop, iRotate, iFlip, iBlur,
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
                new UIGraphGroup("g-calculator", 928, 0, 864, 640, CalculatorNodes.Category, CalculatorNodes.NumberColor),
                new UIGraphGroup("g-logic", 1856, 0, 864, 384, UINodeKinds.LogicCategory, UINodeKinds.LogicColor),
                new UIGraphGroup("g-text", 0, 704, 864, 896, UINodeKinds.TextCategory, UINodeKinds.TextColor),
                new UIGraphGroup("g-lists", 928, 704, 864, 480, UINodeKinds.ListsCategory, UINodeKinds.ListColor),
                new UIGraphGroup("g-dates", 1856, 704, 864, 320, UINodeKinds.DatesCategory, UINodeKinds.DateColor),
                new UIGraphGroup("g-files", 1856, 1088, 864, 352, UINodeKinds.FilesCategory, FilesInFolderNode.FileColor),
                new UIGraphGroup("g-image", 0, 1664, 1152, 640, ImageNodes.Category, ImageNodes.Color),
                new UIGraphGroup("g-utilities", 1216, 1664, 1504, 864, UINodeKinds.UtilitiesCategory, UINodeKinds.UtilityColor)
            ]);
    }
}
