# Changelog — Graph

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.Graph`) and is removed from this file after the release is cut.

## 2.13.1

- **Card typography and description spacing**: `.ui-graph__card` now sets `line-height: var(--ui-text-caption-line-height)` instead of inheriting `body`'s `20 px` line height onto `caption`-sized text, and `.ui-graph__card-description` applies `.ui-text-description-line()` so title-to-description spacing and card height (`48 px`) match `TextComponent` and center cleanly against `28 px` circular avatars.
- **Uniform grid-aligned layered columns and card drag snapping**: `layered()` (`LayeredOptions.lineStep`) now quantizes inter-block spacing along the order axis to the active grid step so sibling cards in a column keep uniform gaps without periodic grid-rounding collapses, and `CanvasKind.snapOffset` (`LayeredSheet.snapOffset`) replaces `snapsByCenter` so dragged and added cards snap their leading edge onto the layer's grid line regardless of card width while circles and craft pills snap by their middles on both axes.
- Built on the framework's 2.13.1 release.
