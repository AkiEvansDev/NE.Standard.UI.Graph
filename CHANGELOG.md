# Changelog — Graph

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.Graph`) and is removed from this file after the release is cut.

## 2.13.0

- **Picture pin file size limits (`MaxImageSize` and `GraphInputAttribute.MaxFileSize`)**: `NodesComponent<T>` adds `MaxImageSize` (`SetMaxImageSize` / `BindMaxImageSize`) and `[GraphInput]` / `UINodePin` add per-pin `MaxFileSize` overrides, stamping `data-ui-file-max-size` onto compact and large image pin editors and validating chosen files through `uploads.takeWithinSizeLimit` before upload.
- **Smooth `160 ms` viewport camera transitions**: `Fit`, toolbar zoom `+`/`−` buttons (composing consecutive presses), and `go-to-node` now interpolate pan and zoom over a `160 ms` cubic ease-out transition, snapping immediately under `prefers-reduced-motion: reduce` and cancelling cleanly on manual pan, wheel, pinch, or minimap gestures.
- **Canvas save settlement, touch pinch guards, and missing-node pins**: settles `CanvasDocument.save()` via `values.whenSettled(...)` on `TwoWay`-bound canvases without `.OnSave(...)` wired, guards touch pinch tracking against toolbar/editor/panel/minimap touches and 3rd-finger drag fallthrough, and keeps synthesized `[data-ui-graph-missing]` input and output pins strictly read-only.
- Built on the framework's 2.13.0 release.
