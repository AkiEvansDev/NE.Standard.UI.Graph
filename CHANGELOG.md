# Changelog

One section per release of this slice, headed `## X.Y.Z` and named by the tag — `graph/vX.Y.Z`. The release
workflow cuts the matching section out to become the body of the GitHub release, and a tag with no section
fails the release before anything is published.

## 1.4.0

- **Two fingers pinch the canvas.** On a touch screen they zoom the sheet around their midpoint and pan it with the midpoint's
  move, within the wheel's zoom range; what a first finger began (a pan, a node's drag, a wire) is let go as the second lands,
  and the finger left after the pinch pans on. One finger is unchanged.
- **The node bar's Escape has somewhere to go.** After a node's "…" menu closed by Escape, the next Escape did nothing: the
  framework had handed the keyboard back to the canvas's root, made focusable for that one return, and the bar's Escape tried to
  give it back there. The root now passes it on to the sheet (the viewport), so Escape from "…" puts the keyboard on the sheet and
  the bar goes.
- **A kept fit opens fitted at any size.** The view kept in the browser carries the size its fit was made for; opened at another
  (a phone after a visit on a desktop) the sheet is fitted again, where it stood cut at the right.
- **A fit on a narrow canvas** leaves a twelfth of the width around the sheet rather than 48 px a side, and **on a phone the map
  is a smaller box** (6 × 4 rem) at the zoom bar's end, where as wide as the bar it covered half the canvas.
- **Run on the node canvas's run panel is drawn in the theme's primary ink** (`--ui-color-primary-ink`), 4.3:1 on the dark
  panel where the brand's fill stood at 2.86:1.
- **The demos:** the node sheets zoom out to a tenth (`SetZoomRange(0.1, 2.5)`, as the dependency graph does), so the
  calculator's and the pictures' sheets fit a phone whole; the planner's build buttons stand under the tab strip on a phone,
  where a third of the width stacked them beside it.
- **A draft the browser sent with holes in it reads whole:** `UIGraphDraft`'s `Nodes` and `Removed`, `UIProductionDraft`'s
  `Resources`, `Crafts` and `Removed` and a craft draft's `Ingredients` and `Products` leave out an entry sent as nothing, as
  `UINodeDocument`'s lists do.
- **A node menu's entries go in ahead of Delete, found by its command,** so a menu an application emptied or reordered takes a
  kind's entry or `AddNodeMenuEntries` (at its end where it holds no Delete) rather than throwing.
- **The demos:** the recipe's ingredient picker is the framework's new search — the chosen resource, icon and all, on the closed
  field, the search field at the top of its list — and drops `SetSelectionDisplayMode`, which the framework no longer has.
- **A finger's tap leaves no hover look behind:** an edge's thickened line, a node's resize corner, a link handle's and a pin's
  growth are drawn only where the pointer can hover. A node's link handle still comes up under a tap, since it is what a finger
  pulls a link from.
- **A canvas waiting for a size lets go of its watch when it leaves the page,** laid out or not, through the framework's
  `observeSize`; the read-only mark is read by the plugin surface's name for it.
- **A parameter row's field is the framework's first focusable** (`focus.first`).
- **Built on the framework's 1.4.0:** its copy of the plugin contract carries `focus.first(container)` and the new tokens and mixins (`@ui-tinted-fill`, `@ui-part-radius`, the `@ui-z-*` ladder, `.ui-picture-glass()`, `.ui-user-select()`).

## 1.4.0-rc.4

- **An action bar above every node.** `SetNodeActionBar()` (`NodeActionBar`, on or off) gives every node of any canvas the
  framework's new action bar: the node menu's entries marked `InActionBar` stand as icons in a bar above the node, centred on it,
  the rest behind its "…" — which opens under it as a menu button's list and holds the rest alone (the colour, an application's
  own entries; a right-click or a long press opens the whole menu) unless `SetNodeActionBarRepeatInMore(true)` asks for the
  whole menu there too — a press is the entry's own, and chooses the node as a right press does. The bar shows over the node
  the reader pressed or tapped (or whose part holds the keyboard; the canvas has no keyboard cursor over its nodes), never on
  hover, and stays while that node is chosen — the node redrawn as the document changes keeps it — until a press elsewhere
  (the background, another node), Escape, or a drag of the node, after which it shows again over the node where it was dropped.
  *Pin*, *Rename* and *Delete* are marked; an application marks its own (`InActionBar = true` on a `MenuItem` given to
  `AddNodeMenuEntries`). The bar floats 10 px above the node's edge (8 px clear of a chosen node's ring), at its size on screen
  whatever the zoom, centred from its first showing, follows a pan and a
  zoom, stands under the node where the canvas leaves no room above it, and hides while the node is out of the canvas's sight.
  A read-only or disabled canvas shows none, nor does one in the middle of a drag; a key in the bar is the bar's,
  never the sheet's Delete, Escape from the "…" menu gives the keyboard back to "…" with the bar standing, and a node deleted from its bar leaves the keyboard on the sheet, so Ctrl+Z undoes it at once. A pin
  keeps its context menu alone. On a touch screen a long press on a node opens its menu with the bar's icons atop it — on iOS
  Safari too, where the framework now times the long press itself (#69). **New:**
  `IGraphCanvasComponent.NodeActionBar` (`bool?`, off by default), `SetNodeActionBar()`,
  `IGraphCanvasComponent.NodeActionBarRepeatInMore` (`bool?`, off by default), and the root's
  `GraphCanvasRendererBase.NodeActionBarAttribute` and `NodeActionBarRepeatInMoreAttribute`. **Breaking:** an
  `IGraphCanvasComponent` implemented by hand adds `NodeActionBar` and `NodeActionBarRepeatInMore`.
- **A node's menu has Delete.** The node, and whatever else is chosen with it, as the Delete key takes them (`UIGraphCommands.Delete`,
  word `ui.graph.delete`), in the danger colour, under a rule after the node's own entries — a kind's own (the node canvas's
  *Reset*) stands above that rule, and so does an application's (`AddNodeMenuEntries`, behind a rule of its own): Delete stays
  last. **New:** `UIGraphCommands.Delete`, `UIGraphWords.Delete`.
- **Node colours are brighter, in both themes.** A node's head, a reroute's box and a round node's face are washed in 28 % of
  its colour (16–18 % before), and on a dark palette the colour itself is drawn lifted toward white (`--ui-graph-node-ink`,
  `light-dark()`), so a card's strip and icon, a circle's ring and a craft's edge no longer sink into the dark surface. The
  theme's series colours are unchanged.
- **The node canvas's run line is drawn before the first run** — an empty strip along the canvas's top where it stood hidden,
  leaving a band of bare grid above the menu and the run panel that read as a gap.
- **The node picker stands on the framework dialog's ground.** It wears `.ui-dialog-look()` — the raised ground, its ink, the
  elevation and no edge — where it painted the plain surface with an edge, a step below every other dialog on a dark palette.
- **The map's view is washed as a chosen entry is:** `--ui-wash-selected`, the brand's tint on a light palette and neutral on a
  dark one, inside the brand's edge, where it was the brand's tint in both.
- **A card's words wait while its action bar stands.** The hover words a card shows (its tooltip, a round node's name) stood across
  the bar's icons once the card was pressed and the pointer rested on it; the framework's tooltip now leaves a host its bar stands
  over alone.
- **A cycle is laid out where its layers run shortest, and its backward edge is a short arc between the two nodes.** The layered
  layout breaks cycles within each strongly connected tangle alone, so an edge on no cycle always runs forward (the greedy order
  over the whole sheet turned some of those back, dashed); a tangle of up to 24 nodes is then reordered, up to 128 tries, to
  where its layers run shortest. A plant and its seed now stand seed, plant, product in one row — the plant first had put its
  seed in a layer of its own and sent its product's edge across the cycle. A backward edge leaves its source's side facing the
  earlier layers and enters its target's side facing the later ones, both high up, so its arc spans the gap between them beside
  the forward edge rather than over the nodes' tops, where a production node's chip hid its ends and arrow; a node's edge to
  itself leaves by one side and comes back by the other, rising clear over the node, its chip and its label. A sheet of many small
  cycles lays out faster too: 3 000 two-node cycles took 2.2 s and take 45 ms.
- **Built on the framework's 1.4.0-rc.4.** Its copy of the plugin contract carries `names.actionBar`, `names.actionBarKey`,
  `names.actionBarRest` and the `actionBar` flag of `ui-context-menu-opening`, raised before a bar shows a menu's entries, and its stylesheet's `.ui-popup-scroll()` caps a list at
  the dynamic viewport's height (`100dvh`), `@ui-popup-radius` and `@ui-list-entry-radius` round a popup and its entries, and
  `.ui-dialog-look()` is the framework dialog's panel.
- **The demos:** the planner's and the node canvas's option rows stand in even columns (`WrapPanelComponent.ItemMinWidth`), their selects carry their caption inside, and the page header is compact on a phone.
  A recipe's ingredient is picked by a search over the resources (`SearchComponent` under `ReplaceWithSelectedItem`, the
  resource's icon in its options and on the closed field) in place of a select to scroll; the resource itself is still not on offer.

## 1.4.0-rc.3

- **Built on the framework's 1.4.0-rc.3.** Nothing of this package's own changed. Its copy of the plugin
  stylesheet carries the framework's field actions: `.ui-field-actions()` compacts a split button and a flyout's button as
  it does a plain one (`.ui-field-action-button()`), and the eight file-kind glyphs' variables (`@ui-glyph-draft`,
  `@ui-glyph-picture-as-pdf`, …).

## 1.4.0-rc.2

- **Built on the framework's 1.4.0-rc.2.** Nothing of this package's own changed. Its copy of the plugin contract carries the
  framework's new `Moment` type: `strings.format` takes a moment among its values and writes it in the reader's time zone.

## 1.4.0-rc.1

- **A node fails wherever its code throws, not only in `Execute`.** A setter an input was fed through, an output's getter
  (`[GraphOutput] public int Ratio => A / B;`), `HasMore` and a display pin's getter used to throw past the runner: the node stood
  drawn running, the run's line never reached its end and the save command failed. Each now fails the node and its branch, as a
  throw in `Execute` does, and a failed node hands nothing on.
- **A display is sent `NaN` or an infinity as its text.** Alone, the number broke the connection it was sent over; inside a record
  or a dictionary, the writer's `ArgumentException` escaped the runner and failed the whole run. Both go as their text, as the
  documentation said of any value JSON cannot carry. So does a node's state on its way back to the canvas (`SetNodeValueEffect`,
  and the sheet `UINodeRuns` keeps), a list's items each; the next run reads the text as the number again.
- **A state collection changed in place is kept.** A list a node adds to was compared with itself and never reported, so a run of
  all went round on the same item until its limit; its items are compared now. Each run's node works on its own copy of a
  collection the document holds, so the document a run started from is not changed under it.
- **A document from the browser is read as the browser's.** A node with no id or no kind (which threw), one whose id an earlier
  node took (which neither ran nor reported, the run's line stopping one short), an edge naming no node or pin, and an entry sent
  as nothing are left out, as a node of an unknown kind is. `UIGraphDraft.ApplyTo` passes over a node sent as nothing or with no
  key, and a link sent as nothing, with no key or to no node, where it threw half way through changing the application's nodes.
- **The server's plan no longer throws on a plan longer than a `TimeSpan` holds** (about 29 000 years); it is solved, as the
  canvas solves it, its time the longest one there is and its workers at most `int.MaxValue`. The canvas's plan answers the same,
  where it counted on past both, and the corpus both ports are held to has such a plan.
- **The file kinds' check is given the path the kind will open**, every link along it followed — a symbolic link or a junction —
  so a link inside an allowed folder no longer leads past a check that compared names. `UINodeFiles.RealPath` names a folder the
  same way for the check to compare against. **Breaking** for a check comparing against a folder that stands under a link (the
  system's temporary folder on macOS): name it by `RealPath`, or compare with the new `UINodeFiles.IsInside(path, folder)`, which
  names both that way, compares names as the system does (ignoring case on Windows and macOS only) and takes `D:\Work2` for no
  part of `D:\Work`. The documentation's checks, which compared with `StartsWith`, and the node demo's use it.
- **A file kind reads at most 64 MB of one file** (`UINodeFiles.MaxReadBytes`, `DefaultMaxReadBytes`), whatever the file says of
  its length; a larger one, or a device that reads without end, fails the node rather than filling the server's memory.
- **The memory picture store keeps 256 MB of pictures unless told otherwise** (`UINodeImageMemoryStore.DefaultMaxBytes`),
  letting go of the pictures used longest ago; it kept every upload and every picture a run made until the process ended.
  **Breaking** in behaviour for an application that registered `AddGraphImages()` counting on a picture never being let go:
  `MaxBytes = null` keeps them all, as before.
- **A display draws a picture by type, never by what a text looks like.** Any text starting with `/` or `http(s)://` was drawn
  as an `<img>`, so a file's path from *Files in folder*, or any address a sheet held, was fetched with the viewer's cookies. A text
  is now a picture only when the display pin is a picture's (`[GraphInput(Display = true, Image = true)]`) or the output feeding
  it is one (`[GraphOutput(Image = true)]`, followed through `TypeOf` — a *Delay*, a reroute); any other text is text. A picture
  inside a record or a list is the new `UINodePicture` (address, and a width and height to draw it at), which travels marked
  (`{ "$picture": … }`). Even a typed picture is drawn only from an address the framework fetches a picture from — this site, the
  web, an inline picture, judged as the browser reads the address (`urls.isImageSource`), so `//host/…`, `/\host/…` and
  `/<tab>/host/…` stay text — or a local `blob:`; the package keeps no rule of its own, and needs the framework's 1.4.0-rc.1 or
  later, whose plugin surface carries `urls`. **Breaking** for a record that carried a picture as a text field with
  `width`/`height` beside it — it is drawn as its fields now; give it a `UINodePicture` — and for a display fed a text of a
  picture through a pin no type names as one.
- **The layered layout takes a sheet of any size.** The least and most of a layer, of an alignment and of a selection were
  spread into `Math.min`/`Math.max`, which throws past about a hundred thousand arguments — a long edge across a large sheet puts
  a virtual node in every layer it crosses.
- **The node demo's folders are each page's own.** Every visitor could write into the shared `in` (a *Save image* pointed at it,
  with *Replace* on, overwrote the demo's pictures for everyone until the next restart) and read another page's `out/<id>`, and
  the check ignored case on Linux too. `in` is read-only now, and a page's file kinds reach only its own folder under `out`.
- **The canvas's words ship in Russian and Simplified Chinese.** `GraphStrings.Translations` carries `ru` and `zh-Hans` for every
  `ui.graph.*` key, and an application turns them on with the framework's `application.AddFrameworkWords("ru", "zh-Hans")`, ranked
  below its own words. The Russian is new; the Chinese is the demos' (the node canvas's and the planner's held the same table).
  Both demos keep only their own `nodes.*` and `planner.*` words, and the planner's notifications are `UIPhrase`s now, so an open
  one follows a language switch.
- **The production graph's Plan panel starts folded on a phone.** Below `md` it stood open over the canvas it plans; the
  stylesheet now says the window is too narrow (`--ui-graph-side-folded`), and the panel starts folded there, its switch opening
  it. A viewer's own fold or opening is kept as before, and wins.
- **A fitted view follows the canvas's size.** A sheet fitted on a phone and then widened stood where the narrow fit had put it —
  the planner's builds, widened from 390 to 1366 px, mostly past the left edge. A view that is a fit the viewer has not panned,
  zoomed or centred since is fitted again whenever the canvas takes another size; one the viewer moved stays where they left it.
  The kept view says whether it is a fit, so a fit kept from an earlier visit opens where it was, as a kept view does, and
  follows the canvas from there.

## 1.3.0

- **Needs the framework's plugin contract 2.** The package reads what a component's state is, the wheel and the framework's
  names through the framework (`context.states`, `context.wheel`), and draws the picker with the framework dialog's own entrance
  and the list entries' own hover; against an older framework it refuses to start, saying so.
- **The canvas's words switch in place with the page.** Its chrome words are marked (the picker's title, categories and
  empty line, the canvas's, menu's and map's names, the bar's and the run panel's buttons, the side panels' switches, the log's
  strip, its empty line and its clear, the unsaved and saving words, the plan's captions and table heads); what the canvas draws
  itself — a node's marks, a group's word, the parameters and the plan panel — is drawn again when the page's words change. The
  plan's totals and a craft's "at once" are filled through `strings.format` rather than a hand-spliced slot.
- **A read-only canvas takes no step back or forward.** Ctrl+Z and Ctrl+Y changed the sheet, marked it unsaved and held its value
  against the server's; the document's history now refuses both while read-only, for any caller, and keeps them for when the canvas
  may be edited again.
- **A read-only canvas no longer promises what it refuses.** A pin grows, fills and shows the crosshair only where a press pulls a
  wire — an output, or an input a wire feeds — on a sheet that may be edited, so an input nothing feeds no longer promises one
  either. A node's head, a reroute node, a frame's band and a layered graph's card, circle and craft lose the move cursor while the
  canvas is read-only, and so does a pinned item or frame on any canvas; a press there still chooses, so the hand says that. A
  reroute point on a wire, which a read-only press pans past, shows the sheet's own hand. One rule in `canvas.less` holds it all.
- **The menus follow a read-only switch while they stand open**, the corner menu's Arrange and Save among them, both ways;
  *Add node* on the node canvas is refused by the kind as well as by its entry. A disabled entry is disabled the way the
  framework's `Enabled` disables a component — its mark and `aria-disabled`, what is inside it inert — so it keeps its place for
  the pointer and a screen reader.
- **A disabled or loading canvas answers nothing but its tooltip**, now that the framework leaves such a component's root live:
  every listener on the canvas's root asks the framework first, and the picker, if it stood open, closes — as it does when the
  canvas turns read-only.
- **A node's fold and pin marks answer Enter and Space** as they answer a press, and keep the focus; neither raises the node's
  click any more.
- **The plan panel keeps the keyboard where it was.** An amount typed and taken with Enter or Tab rebuilt every target's row,
  dropping the focus to the page; the rows are drawn again only when which targets there are changes, and an amount is written
  into its field in place.
- **The picker has one current entry.** The pointer moving over an entry makes it the current one, as a list of choices does, and
  an entry has no wash of its own under the pointer, so an entry a resting pointer stands on no longer stays lit beside the one
  the arrows moved to; the chosen category keeps its ground under the pointer, and a press shows through on both. The picker
  enters and leaves as the framework's dialogs do — the panel rising, the veil fading in, both fading out — and a category's
  chevron turns as it folds, the rail kept in place rather than drawn anew. Escape in its search closes it (the framework's
  field keys took the first one to leave the field, dropping the focus while the dialog stayed); a right press in it opens no
  canvas menu under the veil; Home and End move the search's caret, only the arrows walking the list; an entry is no Tab stop,
  the arrows naming it from the search; and a press on a category gives the focus back to the search, and a press on an entry or
  on the list's or the rail's empty room leaves it there, so typing goes on. The categories are a
  tree (`role="tree"`, each a `treeitem` with its level) and one Tab stop: Up and Down, Home and End walk them, Right unfolds or
  steps in, Left folds or steps out, Enter or Space chooses and leaves the keyboard there; the arrows' category washes as a menu's
  keyboard entry does (`.ui-entry-keyboard()`, dashed in forced colours) rather than wearing the page's ring. Tab goes round the panel (search,
  categories) and never out of the modal. Opened from the sheet's menu (*Add node*, by the pointer or the keyboard), the picker
  keeps the focus in its search, and closing it — Escape, a choice — hands the keyboard to the sheet where what opened it is gone.
- **Forced colours**: a chosen node and frame, the picker's chosen category and current entry, a pin's fill, what a pulled wire
  or link would land on, a running and a failed node, the run line's tracks, a node's progress, a log line's level and a node's
  resize corner are drawn in system colours; each was a shadow, a wash, a gradient or a colour forced colours paint over.
- **The canvas's read-only mark is the family's**: `ui-readonly` on the root, written by `RenderIsReadOnlyMark`, which the
  engine and `states.isReadOnly` read as every read-only control's. **Breaking** for a stylesheet keyed on
  `[data-ui-graph-read-only]` and for code reading `GraphCanvasRendererBase.ReadOnlyAttribute`, which is gone.
- **Nothing is `disabled` natively any more.** Run, Run all and Stop, and a node's fold and pin marks on a read-only sheet, are
  disabled the framework's way — its mark and `aria-disabled`, the press refused — so the button the keyboard pressed keeps the
  focus and a read-only node's marks stay readable. A wired input's field is read-only as the family draws one, still readable,
  rather than `inert`. An edit that reaches a read-only sheet some other way — a wire dropped as the canvas turned read-only, a
  value the server sent unsaved — is put back, and a wire being pulled is let go when the canvas turns read-only.
- **Keys pressed in a panel are the panel's.** Backspace on a parameter's select, or Delete after pressing a parameter's or a log
  line's node name, deleted the chosen nodes; the sheet's keys act now from the sheet and from the canvas's own buttons — the
  zoom bar, the run panel, the corner's and the side panels' switches, the log's strip — so Delete or Ctrl+Z after pressing Fit
  still reach the sheet, but never from what a panel holds: a field, a parameter's or a log line's name, a corner menu's entry.
  Pressing a name brings its node into view without taking the keyboard from the name. Ctrl+S still saves from anywhere in the
  canvas. A side panel's body holds the keyboard for its fields, as a dialog's surface does (the framework's
  `data-ui-focus-holder` mark; the body is a `document` inside the viewport's application region, so a screen reader reads the
  panel's fields and names in browse mode, and unnamed, the aside around it carrying the panel's word once): Enter or Escape in a parameter's or a plan's field hands the keyboard to the panel,
  so the next Backspace deletes nothing.
- **The keyboard keeps its place.** After Run, after a corner-menu command (the menu's switch takes the focus as the menu
  folds), after a parameter's or a plan target's cross (the next row's cross, else the panel's switch), after Enter or Escape in
  a node's field (the sheet takes it back — the framework's field keys hand the keyboard to the canvas around the field) or a
  panel's (the panel takes it), across a redraw of the parameters' rows (the same part of the same row), and when the log line it
  stood on goes (the oldest past the log's limit, every line as a run begins): the next line's name, else the log's switch. A
  switch of the page's language while a node's field is typed into draws the nodes again once the field is let go, not under
  the caret.
- **The canvas's own words speak the page's language; the catalogue stays as written.** A pin's tooltip names its type in the
  page's words (`ui.graph.type-*` in `ui.graph.pin-type`'s `{name} ({type})`), an enum or a class of the application's own by
  its name read as words (`UINodePin.TypeTitle`, new); the picker's search is the word `ui.graph.search-kinds` (it was English
  text); the zoom and the run's share are the page's number in `ui.graph.percent`; a plan's workers are the page's number; a new
  group has no name of its own, so its band says the page's word for a group in whatever language the page is in. A node
  catalogue's text — a kind's title, category and description, a pin's caption, unit, choices and description — is the
  application's content, like a name the viewer gives a node: shown as written in every language, never looked up and never
  reported as a missing word, key prefixes or not; the node fields' captions, units and choices are marked content, so an
  English caption that equals a key is not translated either. A display writes a boolean as ✓ or ✕ at any depth — a list or a
  record inside a table's cell or a record's field is written entry by entry, where it was JSON, joined as the page's language
  joins a list (`Intl.ListFormat`) and a record's field in the word `ui.graph.display-field` (`{key}: {value}`) — and a date
  as the framework writes one, where a list or a record wrote `true` and the wire's text; what was cut from a long list or text
  is the word `ui.graph.more` (`… {count} more`, a plural form per language) rather than English the server wrote.
  **Breaking** for a reader of `SetNodeDisplayEffect.Value`: the cut marker is a `UIPhrase` of `UIGraphWords.More`, and a text
  cut short is two entries — its first characters, then that phrase.
- **One tooltip.** The bar's and the run panel's buttons, the side panels' switches, the log's clear, a node's fold and pin marks,
  a parameter's name and a plan's names carry the framework's tooltip (`data-ui-tooltip`) rather than the browser's `title`, so
  they switch language and look like every other; a pin's, a card's, a circle's and a craft's words wait as a hover does.
- **A folded node's and a reroute's pins open their own pin's menu**, as a pin's row does.
- **The keyboard's marks are the framework's**: the log's buttons, a log line's node, a parameter's name and the side panels'
  switches take the framework's ring, and their colour under the keyboard's focus alone, never after a press; the opt-in
  viewport ring (`ShowFocusRing`) is the keyboard's alone too.
- **Motion.** The dimming around the item under the pointer fades back out as it faded in; the log opens at the pace the corner
  standing on it rises, and, open, the parameters panel ends above the corner; a wire answers the pointer on a wider reach and
  thickens under it; the sheet shows the closed hand while it is panned; a reachable pin's halo eases in with its growth.
- **A plan table's row is pressed anywhere**, and says so anywhere with the hand, not over its name alone; its name is a button,
  so the keyboard reaches a row too, and pressing it keeps the keyboard there, as a log line's name does.
- **The runner's own messages are words.** "'{pin}' is required." (`UIGraphWords.RunRequired`, the input's title a plain
  argument, shown as written), "Stopped." (`RunStopped`), the cycle's failure (`RunCycle`) and a folder's "{index} of {total}: {name}."
  (`FileProgress`) are written in the page's language, and a log line written as a word is written again when the language
  switches; a built-in kind's exception message ("Division by zero.") and a kind's own line stay content, as the catalogue does.
  The run line joins a node's name and what it said with the word `ui.graph.run-line` (`{node} · {message}`), and a picture's
  upload share is the page's number in `ui.graph.percent`. **Breaking**: `UINodeRunner.OnLog` and `OnStatus` hand a `UIPhrase`
  (`OnStatus`'s nullable), `AddNodeLogEffect.Message` and `SetNodeStatusEffect.Message` are `UIPhrase`s, and
  `UINodeFailure.Error` and `UINodeRunResult.Error` are `UIPhrase`s — a node's own text is `UIPhrase.Text`. A node logs a word by
  `UINodeRunContext.Log(UIPhrase)` / `LogAsync(UIPhrase)` and reports its progress in one by `ReportAsync(UIPhrase?, double?)`; a
  blank text line is not written. A kind's own text — a line, a progress message, an exception's message — is shown as written on
  the log and the run line, never looked up as a key. **Breaking** at compile time for `ReportAsync(null, progress)`, which both
  overloads take: name the type, `ReportAsync((string?)null, progress)`.
- **A display's table keeps its cut-short marker out of its columns.** A list of more than 200 records drew two more columns,
  `key` and `args`, with the raw phrase in its last row; the table is drawn from the records and the page's `… {count} more` is
  its last row across every column.
- **A wired input's field wears the family's read-only look alone**, no longer dimmed as though disabled: it is readable and
  reached by the keyboard.
- **`GraphCanvasRendererBase.RenderBarButton` takes the whole attribute** the engine finds the button by
  (`"data-ui-graph-run-once"`), not a part it composed one from, so the names test holds it. **Breaking** for a kind's renderer
  calling it.
- **The built-in menu entries are titled by `UIGraphWords` keys**, their English in `GraphStrings`, as the pin menu's already
  were, so an application translates them as it translates the framework's words. **Breaking** for an application that
  translated them by their English text, or read the default `ColorChoices`' titles: those are keys now (`UIGraphWords.Blue` …).
- **`GraphCanvasRendererBase.RenderSidePanel`** draws the trailing side panel once for the parameters and the plan, open or
  folded as its `folded` says, and the engine keeps the viewer's departure from that fold the same way for either; the plan
  body's unread `data-ui-graph-plan-body` is gone.
- **The sheet's parameters, `NodesComponent.ShowParameters`.** *Add to parameters* in an input's menu sets the input out in a
  panel under the run panel, in the same field its node draws and bound to the same value: an edit in either shows in the other.
  The set is part of the document, `UINodeDocument.Parameters` (`UINodeParameter` names a node and an input pin), saved and
  undone with the sheet. Only an input with a field of its own that no wire feeds can be one: wiring it takes it out in the same
  step, and `UINodeCatalog.ParametersOf` / `CanBeParameter` are the rule on the server. `WithParameters` refuses a wired input and
  one of a node the document lacks — the document has no catalogue to ask the rest of. An input its node hides for now
  (`VisibleWhen`) leaves the panel, and the catalogue passes it over, until it shows again; the parameter stays in the document. A
  parameter's name brings its node into view, and its cross takes it back. The panel arrives folded, its gear alone, the run
  panel's size, until the viewer opens it; the fold is remembered for the canvas. **Breaking** for code that builds `UINodeDocument` by its positional constructor past the key: a fifth parameter,
  `parameters`, follows it.
- **A pin's own menu** (`UIGraphMenus.Pin`): a right press anywhere on a pin's row opens it over the node's. It carries the
  parameter entries and *Reset*, which lets the pin's wires go and, on an input, puts the kind's default value back — one step to
  undo, unavailable while there is nothing to reset.
- **The canvas's built-in menu entries wear the framework's own glyphs** (`UIGlyphs`, the `ne-` face) — they shipped bare, and
  an application needed an icon pack and a `SetCommandIcon` per entry to dress them. `SetCommandIcon` now replaces a glyph.
- **The corner menu's folded switch fills its block**, so the wash under the pointer reaches the frame rather than stopping a
  padding short of it; the block keeps its size.
- **The plan panel and the parameters panel share one side panel** (`canvas.less`'s `.ui-graph-side-panel()` and its switch,
  chevron and body), as the production graph's plan drew it.
- **A curved or slanted edge is drawn smooth at 100% scale.** Chrome's GPU rasteriser antialiases a stroked SVG path at four
  samples a pixel, so a curve read as a staircase. An edge is now its path, unpainted — what the pointer answers and a label is
  placed along — and its line painted under a group `.ui-graph__edge-line`: straight `<line>` pieces about four canvas units
  long where it curves or slants, and the path itself where every step runs along an axis (a stepped edge, which draws crisp).
  A dashed edge's pattern runs on across the pieces. An edge whose shape, colour and dashes stand keeps its painted pieces from
  one draw to the next, so a drag rebuilds only the edges that moved. **Breaking** for a stylesheet that painted
  `.ui-graph__edge`: it is transparent now, and the stroke is on `.ui-graph__edge-line`.
- **A node canvas the viewer has no kept view of opens fitted**, as the layered sheet opens and as Arrange leaves a sheet; a
  returning viewer's kept view stands.
- **Fit keeps the sheet clear of the canvas's chrome along its top.** The corner menu's switch, a folded side panel (the
  parameters, the plan) and the node canvas's run line and run panel stood over the first nodes of a fitted sheet; Fit — the
  zoom bar's, the menu's and a first draw's — now keeps clear of them, beside a corner's box or under it, whichever leaves the
  larger zoom. An open side panel keeps taking its column as before.
- **The run line shows once a run has begun.** It stood along the canvas's top from the first draw, empty, over the sheet; now it
  is hidden until the first run and keeps the last run's end after it. Its room stays clear before, so the corner menu, the run
  panel and the parameters panel do not move when Run shows it.
- **A long name in the plan's tables ends in an ellipsis.** The name's button was as wide as its words and ran past its cell,
  which clipped it mid-letter; it is held to the cell now, so its words ellipsise and the tooltip reads the whole.
- **The demos' toolbars wrap.** The graph page's settings and its Module/Built on/Add/Remove row, and the node demo's settings,
  are `UILayout.Row`s, each list kept beside its caption, so a narrow page takes the switches and buttons under rather than
  cutting them off. The planner's *Add* beside Search has a column as wide as its words, and the builds' *New build*, *Import* and
  *Export* are small ghosts held by the top with the tab strip, so their middles are the captions'.
- **A side panel opens and folds without a jerk.** Folded to its switch it is a box, and only its width slid: its height snapped
  to the open column on the first frame, and its body dropped its scrollbar while it slid and took it back at the end, every
  line re-wrapping at once. The framework's fold now slides both sizes and holds the body at its open box.
- **The node demo's sheets stand where Arrange puts them**, and the Common page is a small sheet of the common kinds: a text and
  a number joined and shown, a counter walked by Run all, and a note.
- **The planner demo speaks a second language.** `DemoApp.Graph` has a language switcher in its header and its words on keys
  of its own prefix (`planner.`, `KeyPrefixes`) in English and zh-Hans: the pages' names and prose, every control, dialog and
  empty state, a resource's glyph names (its colours are the canvas's own colour words), the status lines and notifications,
  and a file's refusal. Its zh-Hans table is whole — the framework's, the code field's and every canvas word it registers —
  held by `DemoWordsCoverageTests`. The planner's resources, recipes and builds and the graph page's modules are content,
  shown as written.
- **The demos at a phone's width and in the planner's forms.** The graph's and the node canvas's pages give the canvas's row the
  canvas's own floor and grow past the screen where their rows and the floor do not fit, so a short or narrow screen scrolls,
  every toolbar row at its own height, rather than squeezing the toolbar or laying the map, the zoom bar and the form under the
  canvas over one another; the planner's resources stand their list, form and graph one above the other below a wide screen,
  and a resource's *Icon* and *Colour* selects take their half of the row rather than a floor wider than it.
- **The graph page fits on a phone.** Its canvas zooms out to a tenth (`SetZoomRange(0.1, 2.5)`), so a fit at 390 px shows every
  module rather than stopping at the default quarter with the first and last cut at the canvas's edges.
- **The canvas is a ground of its own.** A canvas in a component given a theme `Background` keeps the page's inks on its sheet,
  its panels and its bar, rather than letting the framework's parts in it read the filled card's on-colour over the canvas's own
  background.
- **A kept view that shows none of the sheet is let go.** A node canvas and a layered sheet open at the viewer's kept pan and
  zoom only while it shows some of the sheet (`CanvasView.showsAnyItem`); a view kept from before the sheet's nodes moved, or
  kept under the same name by another sheet, opened on an empty stretch of canvas — the nodes somewhere above — and now opens
  the sheet whole, as a first visit does. The node demo's three sheets each have a canvas of their own name, so each keeps its
  own view.
- **The planner's form follows the list's choice.** A resource chosen by the arrows opens as a pressed one does: the page
  follows the list's bound `SelectedKey` (`OnNotify`, as the builds' strip does) rather than an item click, which is the
  pointer's alone.

## 1.2.0

- **Built on the framework's 1.2.0.** Nothing of this package's own changed; it moves with the framework.

## 1.1.0

- **Built on the framework's 1.1.0.** Nothing of this package's own changed; it moves with the framework, which now
  releases every package on the next minor version whenever it changes.

## 1.0.1

- **The first stable release.** No `--prerelease` is needed any more. Until 2.0.0 the public surface may still move
  between versions; every such change is marked **Breaking:** in this file.
- **The planner's builds have the tabs view's own menu**: *Rename*, *Pin* or *Unpin*, and *Delete* — the strip's remove entry
  in its destructive form, in the danger colour, going through the same confirmation as a build's cross. A pinned build stands at the head of the strip, and both
  the pin and the strip's order are kept in `planner.db` (a `pinned` column added in place to an existing file, the order as
  the builds' positions) and travel in the builds file, where a file without the field reads as unpinned.
- **The reroute is out of the picker and has an entry of its own**: the node canvas's menu on the empty sheet offers *Add
  reroute* after *Add node*, putting one down unwired where it was opened, as a wire's menu puts one on the wire. `RerouteNode`
  is `Hidden`, so a document holding reroutes reads, runs and draws as before.
- **A run writes the state it leaves onto the sheet in the runtime's own turn** (`UINodeRuns.SavedAsync` takes
  `Context.Runtime.InvokeAsync`), so a save the viewer makes while a run of all goes on is not overwritten by the sheet read before
  it; the demos' commands write what they read after a wait the same way.
- **Arrange leaves a pinned item where it stands** on the layered and the production graph, as it does on the node canvas.
- **An item added after one was deleted no longer takes the deleted one's key** and vanishes on the save — a layered graph's
  node, a production graph's resource or recipe.
- **Undo keeps what a run wrote into a node's state**, rather than taking the sheet back to a count the server has moved past;
  and an undo or a redo is saved as it is made where `AutoSave` is on.
- **A layered sheet that places a new item beside the ones the viewer moved keeps where it laid the others**, and their long
  edges keep their routes.
- **Deleting a resource on the production graph takes its amounts out of the recipes that named it**, and a recipe left taking
  nothing goes too, rather than staying undrawn and making its product from nothing. A draft or a plan request with empty
  targets or amounts is read around them rather than failing.
- **A row of the plan panel shows its item on a read-only graph too.**
- **On a read-only node canvas a node's fold and pin buttons are drawn disabled**; a second paste pastes what was copied, not
  the first paste as it was edited since; Escape leaves the picker's button no longer marked open; a press on the map lands its
  point beside an open plan panel rather than under it.
- **The planner's import refuses ids that could take a recipe's key or break a picture's address**, and the layered demo's
  *Remove added module* removes the module its form added, whatever the canvas did meanwhile.
- **The calculator's and the pictures' kinds wear the core's own glyphs**, so neither package depends on the Material icon set
  and a host registers nothing for them.
- **A folded node keeps its head's own height** on the grid, so its title keeps the line it stands on, and it wears its head's
  ground; it landed with both corners on the grid, which stretched the head.
- **Arrange on the node canvas runs on the layered layout** the layered graph uses — cycles cut, long wires through a place of
  their own in each column, the order that crosses least, each node lined up with what it is wired to — and lines up a wire's two
  pins rather than the two nodes' middles, so a wire between nodes of different heights comes out straight. On the grid, each run of
  nodes joined by straight wires moves as one, so the grid does not bend them again; a selection is arranged where it stood rather
  than at the sheet's corner. `layered()` takes an edge's own offsets at either end and a gap per layer, and without them lays out
  as before.
- **A multi-line text on a node is sized by the node's corner.** It fills the height the node is dragged to, which is kept and lands
  on the grid; the field's own resize handle is gone — it grew the node past the grid and was lost at the next redraw.
- **A collection out of a set is a list of combo boxes**: an enum array, or an array with `Choices`/`ChoicesFrom`, edits as rows
  each choosing one value, the add button giving another. The enum array's rows were text fields, and an array with `Choices` was a
  single combo box for a value that is a list.
- **The common kinds gain logic, lists, more text and dates.** *Logic*: `ChooseNode` (one of two values by a yes or no),
  `AndNode`, `OrNode`, `NotNode` and `EqualsNode` (any two values — numbers as numbers, texts ignoring case if asked, dates as
  dates, lists item by item). *Lists*: `ItemAtNode` (-1 the last, *Found* when out of range), `ListCountNode`, `ForEachNode`
  (one item a run, *Taken* kept with its reset, *Start over*, *Wrapped* and *Advance* as a counter's, played by Run all),
  `SortNode`, `ReverseNode` and `DistinctNode`. *Text*: `TrimNode`, `SliceNode` (clamps, never fails), `ToNumberNode` (the
  invariant culture, with *Valid*) and `MatchNode` (a regular expression with a one-second timeout; a pattern that cannot be read
  fails the node). *Dates*: `AddToDateNode`, `DateDifferenceNode` and `DatePartsNode`, over a day or a date and time alike. Each wears a glyph of the core face drawn for it,
  and *Join* and *Split* trade their plus and columns for the merge and split of two ways.
- **An `object[]` property is the universal array pin** (`array`), which every typed array connects to, rather than an array
  of `any`, which none did.
- **Load image and Save image are `ImageNodes.FileKinds`**, apart from `ImageNodes.Kinds`, which holds the kinds that work a
  picture in the store: the two reach the disk, and a catalogue takes them on purpose, as it takes `UINodeKinds.Files`. **Load
  image refuses a file that is not a picture**, read by its first bytes (PNG, JPEG, GIF, WebP, BMP) rather than by its name.
- **`UINodeImageLimits` bounds what the picture kinds take of the server**: a picture is decoded to at most 50 million pixels
  (`MaxPixels`) and the process decodes two at once (`MaxConcurrentDecodes`), a run past it waiting its turn — each holds several
  full-size bitmaps until it is encoded. A resize decodes a large photograph at the codec's smaller scale where the format allows,
  so the cap bounds what is decoded rather than what the file claims. An application registers its own as a service;
  unregistered, the kinds use the defaults.
- **The memory image store keeps a picture under the hash of what it is.** The same file loaded again, or a node run again on it,
  is one picture at one address, so the nodes below it are handed on from the run cache rather than run and write nothing new.
  `AddGraphImages(maxBytes)` caps it, letting go of the pictures used longest ago; `UINodeImageMemoryStore.Count` says how many it
  keeps.
- **A node that fails forgets its own last run and those of every node above it**, so the next run makes them afresh rather than
  handing the same thing on — a picture a capped store let go is made again after the one run that found it gone.
- **A plan the solver cannot settle says so**: `UIProductionPlanStatus.Unsettled` and the panel's *No plan could be settled for
  these targets* (`ui.graph.plan-unsettled`), where it said *infeasible* — a cost that falls without bound, or a table that
  would not settle, is not a cycle that takes more than it gives. **A source's cost below zero, or not a number, counts as
  one**, on both sides: a source that paid to be taken made the least cost fall without end.
- **A display pin is sent a readable share of its value**: a text past 10 000 characters or a list past 200 entries is cut short
  with what was left out said at its end, a record past 256 KB of JSON — or one that cannot travel as JSON at all, which broke the
  connection it was sent over — is sent as its text. A whole file's text crossed the connection and stood in the page on every
  run.
- **Files in folder takes the file after the one it took last**, in name order, kept in the sheet (`Last`, hidden beside
  *Taken*), so a file added or removed between runs takes none twice and skips none.
- **The wheel zooms a canvas by how far it turned**, so a trackpad's many small steps and a mouse's one notch come to the same zoom
  for the same distance, a flick held to three notches; a turn that is mostly sideways zooms nothing.
- **A drag goes on over a document the server sends mid-drag** rather than over the objects it replaced. A pan or a zoom restyles
  only the grid, not every node of the sheet, and the view is kept in the browser once it rests rather than on every frame; a
  drag's frames build the layered list once a move rather than once a node, count two lanes' crossings once a pair, and tell a
  production sheet's change by its edit count rather than by its document written out as text.
- **The log's buttons and the plan panel's toggle wear the keyboard's focus ring**; a colour alone read as the pointer passing.
- **A canvas is named by its caption** for a screen reader, the viewport that takes the keyboard rather than the box around it.
- **The packages' stylesheets and scripts are served under `/_ne/css/` and `/_ne/js/`** with the framework's own paths (see the
  core's changelog).
- **The nodes demo's page removes its own folder when it goes**, and ends a run under way, so the temporary folder keeps no
  page's leftovers.
- **An edge running level between two cards keeps the middle of both their sides**, the card's other edges fanning out either side
  of it: set apart evenly, a card's three edges and its neighbour's two met at different points, and every straight edge stepped.
- **A panel over a canvas opens none of its menus** — the plan panel, the corner menu, the zoom bar and map, the run panel and the
  log: a right press there is not one on the sheet.
- **The plan's recipes wear what they make** — the product's picture or glyph — as the rows of resources above them do.
- **Counter shows its *Next* and the ranges their *Taken***, each with its reset; `Hidden` on a state is for a kind that keeps
  one out of sight, with the node menu's Reset.
- **A circle lines up by the circle, not by the room its name takes under it.** The layout aligned the middle of each node's
  whole room, so every long edge between circles ran a name's half-height below them and stepped at both ends. A node may say
  where its edges meet it (`LayeredNode.anchor`, and `nodeBox` on the sheet's host); the layout lines those up.
- **An edge's words are HTML over the lines**, a chip each, rather than SVG text: Chrome lays SVG text out for the scale of every
  transform above it and does not lay it out again when the zoom changes, so a label stood at its old place until the edges were
  drawn again.
- **The layered layout sets a node in line with one of what it is joined to**, not half way between two, and a long edge runs
  flat: the straightening is Brandes–Köpf's — the four alignments made, the narrowest of them taken — in place of the median
  method, so a chain reads as one row and a merge lands on one of its inputs' rows.
- **A plan with nothing solved draws an empty sheet** rather than the whole catalogue, which read as a plan; the panel names the
  first target.
- **The plan's picker and panel show a resource's picture** where it has one, the picker at a list row's size.
- **A row of the plan panel naming a recipe drawn on its edges shows it**: its edges are chosen and the resource they run into is
  brought to the middle; the camera used to stay where it was.
- **An entry of the node picker takes one press after a search is typed.** The field's change on losing the focus drew the list
  again under the press, and the entry pressed was gone before its click.
- **The text kinds**: *Join* (values joined by a separator, or set into a template such as `{0} - {1}`), *Split*, *Replace*,
  *Length*, *Contains* and *Change case*, under `Text` in the picker beside *To text*.
- **Range XY and Range XYZ** (`RangeXYNode`, `RangeXYZNode`): every point of a grid or a box, one a run, X fastest — the nested
  counters in one node, ending a run of all after the last point or starting over.
- **A state can be kept out of sight**: `[GraphInput(State = true, Hidden = true)]` draws nothing for the value, and a node whose
  kind keeps a state carries **Reset** in its menu (`UIGraphCommands.ResetState`), which puts every state value back to its
  default as one edit.
- **The documentation is a site of its own**, [akievansdev.github.io/NE.Standard.UI.Graph](https://akievansdev.github.io/NE.Standard.UI.Graph/):
  the node canvas, the ready-made kinds, the canvas, the layered graph, the production graph, and a reference page per
  component read off the code. The README is a short overview that links to it.
- **The common node kinds** (`UINodeKinds.Common`): a number, a text, a date, a yes or no and an image filled in on the node, *To
  text*, *Display*, *Note* and *Delay* (holds the run for the seconds asked, reporting its progress, and passes its value on), in
  the framework's own `ne-` glyphs; *Note* is passed over by a run.
- **`NE.Standard.UI.Graph.Image`, a package of picture kinds worked on the server with SkiaSharp**: *Image size*, *Resize*
  (stretch, contain or cover), *Crop*, *Rotate*, *Flip*, *Greyscale*, *Blur* and *Convert* (PNG, JPEG, WebP), each under
  `Image` in the picker and writing a new picture. They read and keep pictures through the application's `IUINodeImageStore`;
  `services.AddGraphImages()` registers `UINodeImageMemoryStore`, which keeps them in memory and serves them as the content
  provider; `ImageNodes.Kinds` for a catalogue. A picture going out as JPEG is laid on white, JPEG having no transparency.
- **A node can keep a value between runs**: `[GraphInput(State = true)]` is a value the node itself changes as it runs — a
  counter's next value, a place in a list. The runner reports what a run changed (`OnState`, `UINodeRunResult.State`,
  `ApplyState`, `UINodeDocument.WithValue`), a controller sends it back as a committed `SetNodeValueEffect`
  (`Committed = true`: no step to undo, the canvas no dirtier for it), and the node offers a button that puts it back to its
  default — or, for a state kept out of sight, its menu's Reset.
- **Run all**: `UINodeRunner.RunAllAsync(document, maxRuns)` runs a sheet again and again, each run from the state the last
  left, until a sequence node (`IGraphNodeSequence`) has nothing left; a failure in another branch does not stop it. The common
  kinds gain *Counter*, which counts one step further a run and starts over or ends a run of all at its end.
- **The file kinds** (`UINodeKinds.Files`, not among the common ones): *Files in folder* (a folder's files matching a filter,
  one a run), *Read text* and *Write text*; `NE.Standard.UI.Graph.Image` gains *Load image* and *Save image*. A node names a file
  by its path on the server, absolute or relative to `UINodeFiles.BasePath`; what may be read or written is the application's
  own check, `UINodeFiles.Allow(fullPath, access)`, registered with `services.AddGraphFiles(new UINodeFiles { ... })` — with
  none registered, the file kinds reach nothing, and `new UINodeFiles()` alone lets them touch whatever the process may. The
  nodes demo runs a folder of pictures into thumbnails from its canvas's run panel, its check keeping the kinds inside the demo's
  own folder.
- **A run panel and the whole of a run, from the package**: `SetShowRunPanel(true)` puts Run, Run all and Stop in the canvas's
  top corner, as the zoom bar stands in the bottom one. Run and Run all save the sheet under `UIGraphArguments.RunReason` and
  `RunAllReason`; the application's save command (a background one) hands the save to `UINodeRuns.SavedAsync`, which runs the
  sheet, pushes every status, display, log line, progress and state to the canvas and keeps what the runs left on the sheet, and
  `OnStop` → `UINodeRuns.Stop()` ends a run under way. `SetRunningEffect` tells the panel when a run begins and ends. It takes
  the controller's `Context.SendEffectsAsync`, `Context.Runtime.InvokeAsync` and `Context.Services`, so the package needs nothing
  of the Shell; one run goes at a
  time.
- **A node run on the inputs it last ran on is handed on, not run again** (`UINodeRunCache`, `UINodeRunner.Cache`; `UINodeRuns`
  keeps one per canvas): one entry a node, its last run, drawn as *Cached* (`UINodeState.Cached`). A node with state and one
  marked `[GraphNode(AlwaysRuns = true)]` — *Delay*, *Date*, the file kinds — always runs. A chain of picture kinds re-run on the
  same picture writes no new pictures.
- **Stop leaves nothing half done**: the state a run changed is written only when the run is through, so a folder's place moves
  on only for a file whose whole run happened; the node cut short stands idle again and the log says *Stopped*. A node's own
  cancellation (a timeout of its own) fails its branch rather than the run.
- **What a pin takes**: a required number with no wire and no field is missing, as a required text is; an edge into a state, an
  output or a field with no pin feeds nothing.
- **Counter** reaches an end its step lands on however the sum rounds (0.1 three times reaches 0.3), on the same axis a range walks:
  a counter whose step leads away from its end, whose ends are not numbers or that would count past a million values fails
  rather than hand out a value it cannot reach. **Random** mixes its seed (SplitMix64), so neighbouring seeds draw no pattern and
  the numbers are the same on every runtime. **Date** left empty is the day of the run. **Blur**'s radius is how far it reaches
  (a third of it is the Gaussian's sigma).
- **The canvas counts a run's save as landed once the run begins**: the command answers only when the run ends, and the canvas
  showed *Saving…* and held back every save the viewer made for the whole of a Run all. Saves are numbered, so a late answer is
  matched to its own save; a Run queued behind a save is not replaced by an automatic one, and the panel is freed only by its own
  save's answer or the run's end. A stopped run's line says so in the warning colour, and the node cut short stands idle.
- **The node canvas's own fixes**: a press on a wired input let go where it began keeps the wire, its reroutes and its id rather
  than laying a new one; a pointer the browser takes away mid-drag puts a pulled wire back and records what moved; a field shows
  its kind's default only on an input with no wire; an emptied text stays empty rather than showing a default the run does not
  take; a pin shown beside another reads that one's default; a state a run writes updates its own field rather than every node;
  a click that moved nothing no longer saves; a Ctrl band adds to what was chosen; a chosen node that failed wears the failure's
  ring; a node handed on from its last run is edged dotted (*Cached*).
- **The production graph writes its numbers in the page's culture** through the framework's formatting, one precision for a chip
  and a table alike, and reads a typed one by the culture's decimal mark. **Fit never zooms past 100%**, an edge's label moves
  along its edge off a node it would cover, and a target's badge stands on its ring.
- **The planner keeps a build's plan whole** — its period, what it makes least of and what it brings in, beside its targets —
  in its store and in its builds file; a build opened again counted a minute and made least of what is brought in whatever was
  chosen. A target the store would not keep as sent goes back to the canvas as kept. Every add-on demo's sidebar runs the page's
  height with a search, as the framework demo's does.
- **Pictures stand the way their file says** (a phone's photograph taken on its side), in every kind and in *Image size*; a
  picture that would decode to more than `UINodeImageLimits.MaxPixels` is refused before a pixel is allocated.
- **The calculator's choices are enums** — `UICalculatorOperation`, `UIDivisionByZero`, `UIComparison`, `UIMinMax`; *Not equal*,
  *At most* and *At least* are saved as `NotEqual`, `AtMost`, `AtLeast`. *Round* rounds a half away from zero — 2.5 to 3, as a
  calculator does.
- **Counter** takes *Advance* and gives *Wrapped*: one counter's Wrapped into another's Advance is a loop inside a loop, every
  value of the inner one for each value of the outer. **Random** (`RandomNode`) draws a number between two ends, whole or not,
  from a seed the sheet keeps, the seed after a run the same, drawn anew, one more or one less (`UIRandomMode`).
- **A stepped wire turns half way along its own run, and only wires whose uprights would meet are set apart**, in lanes around
  where they would have turned. Wires were bundled by the stretch of the sheet they crossed alone, however far apart they stood,
  so moving one node shifted the turns of wires nowhere near it; now only its own wires move.
- **Arrange widens the gap after a column for the wires leaving it**, a lane apiece and a margin either side, rather than
  squeezing their uprights into one another in a fixed 80 pixels.
- **A field shows its kind's default when the sheet holds no value for it** — a node an application wrote, a field emptied —
  which is what a run takes for it: a counter's step reads 1, not blank. A date defaults to today rather than the calendar's
  first day.
- **A picture's pin is a picture's without an editor**: `[GraphInput(Image = true)]` makes the pin an image pin on a `PinOnly`
  input too, and `[GraphOutput(Image = true)]` makes an output's; the common `ImageNode`'s output is one.
- **The picker's categories fold**: one with others under it stands folded behind a chevron until it is chosen or the chevron is
  pressed, a second press on the chosen one folds it again, and what the viewer unfolded stays so while the page lives.
- **Every node catalogue carries a reroute** (`RerouteNode`, `[GraphNode(Compact = true)]`): a small box a wire is led through, which
  hands on what reaches it to every input wired to it and wears the name and colour of the output feeding it. A wire's right
  button offers *Add reroute* and *Delete*: the edge menu is every canvas's now (`EdgeMenu`, `AddEdgeMenuEntries`), not only
  a layered one's.
- **`GraphComponent` is `LayeredGraphComponent`**, its renderer `LayeredGraphComponentRenderer` and its type key
  `graph.canvas.layered`: *graph* is the package's word for all three canvases, and this one is the graph laid out in layers,
  on `LayeredGraphComponentBase` beside the production graph. Breaking; the package is still pre-release.
- **`NE.Standard.UI.Graph.Calculator`, a package of node kinds**: an operation, rounding, a sum, a clamp, the least or
  most of several, a comparison and a result, each under `Calculator/` in the picker, with `CalculatorNodes.Kinds` for a
  catalogue; the number they work on is the common one (`graph.number`). The node canvas's demo is a demo of its own,
  `DemoApp.Nodes`, on the common kinds and the two packages' alone; `DemoApp.Graph` keeps the planner and the layered graph.
- **The picker's categories nest by their paths**: `Maths/Rounding` stands under `Maths`, and a category chosen shows what
  stands under it too. Choosing *Uncategorized* showed every kind, its key being the one *All* had.
- **A wire let go on the empty sheet opens the picker there**, and the kind chosen takes the wire into its first input that
  accepts its type, or stands unwired where it was dropped if none does.
- **The picker's search stands at the end of its head**, a field of its own width with air between it and the title.
- **A card on a layered graph sets the edges of one side apart along it**, in the order their other ends lie, so no two leave or
  enter at one point and each keeps a lane of its own; stepped edges are bundled into one lane only where they share a point,
  as a circle's do.
- **`AutoSave` saves every edit as it is made**, through the same save Ctrl+S raises, with `UIGraphArguments.AutoSaveReason`
  as its reason — for a page whose document is the application's at once, such as a plan whose targets are a build's goals.
- **A save leaves the canvas clean when a layout placed something after the last edit.** A layered sheet puts a node it had not
  placed into the document as it draws, which the history had not recorded, so the document sent never matched the step it
  was saved as and the canvas stood *unsaved* after the save answered; the history now takes those places into that step.
- **A layered canvas drawn where it has no size — a dialog not open yet, a tab not shown — is laid out once it is shown.** It
  was laid out then and there, with every node measured at nothing, so the nodes stood on one another and the view was fitted
  to a box of no size.
- **The plan panel ends above the zoom bar** rather than pushing the bar aside, so the bar keeps its corner however long the
  plan runs.
- **A layered sheet forgets where it laid a node that leaves.** A node taken out of the bound collection and put back later
  was dropped on the place the last layout had given it, where another node could stand by then; now a place the layout
  chose goes with the node, and one the viewer chose stays in the document.
- **The package checks the plugin contract it was built for.** The framework's client says which contract it implements
  (`GlobalApi.contractVersion`), and the package refuses to register against another one, with an error naming both
  numbers, instead of working in part.
- **Each package brings its namespaces as global usings.** Installing the package is enough to write against it; a
  project that would rather write its own `using` lines sets `NEStandardUIImplicitUsings` to `false`.
- **The demo is a planner built from nothing**: resources with pictures and recipes, and builds, over SQLite; goals
  planned on the server and on the canvas; import and export as files. The layered graph keeps its page.
- The package descriptions name all three components, not the node editor alone.
- **The mirror's demo builds against the framework's packages.** It reached this slice's own namespaces only through
  the monorepo's usings, and this slice's sources wrote `using` lines the framework's packages now bring, which is
  IDE0005; `Directory.Build.targets` travels to the mirror and a package's sources keep their own lines.
- The README's licence link names the mirror, so it resolves on nuget.org too.
- **The packages carry their symbols and sources inside their assemblies**, so a debugger steps into them.


## 1.0.0-rc.3

The first version: `NE.Standard.UI.Graph` (the components and their document models) and `NE.Standard.UI.Web.Graph` (the
canvas engine, the layered layout, the production solver and the stylesheet). Three components on one canvas core — a
canvas of typed nodes that runs, a layered graph of the application's own nodes, and a production graph that plans. The
number lines up with the framework's, which goes out as a release candidate with everything that plugs into it.

### The node canvas

- `NodesComponent`: a canvas of typed nodes whose value is the whole document — pan and zoom, a grid that snaps,
  selection by click, Ctrl+click and a Ctrl+drag band, nodes dragged together, groups that carry what they hold,
  edges in three shapes with reroute points, copy and paste, and an undo history that runs until the save.
- **The node kinds are the application's own classes.** `[GraphNode]` on the class and `[GraphInput]`/`[GraphOutput]`
  on its properties are the whole catalogue: the attributes decide whether a value carries a pin, an editor or both
  (`PinOnly`, `NoPin`), what the editor accepts (`Min`, `Max`, `Step`, `MaxLength`, `MaxLines`), how much room it
  takes (`Height` on a pin, `MinWidth` on the node) and what the picker says about the kind (`Description`).
- Editors by type, out of the box: text, number, boolean, date, time, date and time, a combo box for an enum or for a
  text with `Choices`/`ChoicesFrom`, a picture shown from the address it holds (`Image = true`), a list of simple
  values for an array pin, and a pin that shows rather than takes (`Display = true`), drawn from whatever shape the run
  put in it. A developer's own class is a pin type like any other and connects to its own kind or to `object`.
- **A picture is uploaded, not pasted.** A picture pin sends the chosen file through the framework's own upload and
  raises `image-upload` naming the node, the pin, the selection and the file; the application keeps the picture wherever
  it likes and answers with `SetNodeValueEffect`, which writes that one pin rather than pushing the document back.
- A node is dragged wider and taller by its corner, and its size travels in the document; a caption and its value stand
  on one line, and a pin with no editor is a name and a dot at the top of the node beside the outputs. The picker is a
  modal dialog with a search, the categories the attributes declare and each kind's own line.
- **A network runs.** A node kind that implements `IGraphNode` (or `IGraphNodeAsync`) is executed by `UINodeRunner`:
  the saved document becomes instances of the developer's classes, they are walked in the order their connections put
  them, each one's inputs filled from the outputs feeding them, and every node's state reported as it goes.
- Nothing reaches the server until a save: Ctrl+S or the menu's Save commits the document and raises `save`, as the
  code field does. A node's status — a state, a progress bar and a message — arrives the other way, addressed to one
  node through `SetNodeStatusEffect` and never as a patch of the document.
- The canvas's menu is the framework's own, set in the component's constructor with Add node, Delete, Group, Arrange,
  Fit and Save on it; an application appends its own entries with `AddMenuEntries` and dresses the built-in ones with
  `SetCommandIcon`, since a glyph name belongs to the icon pack the application registered.
- **The sheet belongs to the viewer until they save it.** Bound `OnSubmit` with a `FormId`, the canvas holds its document
  from the first edit — a value the server pushes meanwhile is not put on — and a save submits the form. A save marks the
  canvas *unsaved* until the command it raised has answered, and undoing back to the saved sheet lets it go again. An
  application that means to put a sheet on sets the bound value and returns `DiscardFormEffect`; a sheet of any size
  travels, the framework staging one over 8 KB beside the hub.
- **A run is watched as it runs.** The runner's `OnStatus` and `OnDisplay` are awaited, and a controller pushes each effect as
  it arrives (`UIContext.SendEffectsAsync`), so a node lights up when it starts rather than when the run answers. A node that
  waits says how far along it is with `context.ReportAsync`.
- An edge follows its pin: every drawn node's box is watched, since a message appearing above a pin moves it. `Order` on a pin
  is counted from one among its own side's pins rather than against every property of the class. The picker's search field
  names the entry the arrows stand on (`aria-activedescendant`).
- **A node may fail, and a failure belongs to its branch.** `[GraphInput(Required = true)]` stops a node the value never
  reached before it runs, and a node that throws stops the same way: it goes red, everything fed by it is `Skipped`, and
  every chain that does not pass through it runs to the end. `UINodeRunResult` carries `Failures` and `Skipped` beside the
  outputs it did produce.
- **A command may ask for the sheet the viewer is looking at.** `SaveDocumentEffect` asks the canvas to commit, under a
  reason the `save` event then carries as its key (`UIGraphArguments.Reason`) — which is how the demo's Run works off what
  is on screen rather than off the sheet last committed.
- A progress line is a kind's own choice (`[GraphNode(ShowProgress = true)]`): edge to edge under the head, the theme's
  primary, square at both ends, and gone the moment the node stops running. It lies over the body's top padding, so the rows do
  not move when a run begins, and a running node's frame is the theme's primary too. A tall row's pin (a display, a picture)
  stands as far under the node's top as a plain row's, so a wire between two nodes on one grid line runs straight.
- **Every graph document carries a `Key`** (`UIGraphDocument`, `UIProductionDocument`, `UINodeDocument`, `WithKey`): what the
  application calls it, sent back by the canvas as it was given, so a save names the document it was made on. The planner keys
  each build's plan by its id, and an edit made just before a tab switch is saved into the build it was made on rather than the
  one opened after it.
- A document the server sends in the middle of a drag no longer strands it: a group's drag finds its group by id as a node's
  drag does, and goes on over the new document, whose drop saves the move; a wire being pulled is let go, since it holds the
  old sheet's parts.
- A picture pin may be one large surface (`[GraphInput(Image = true, Large = true)]`) — the shape of the framework's own
  picture field, with no address beside it.
- The canvas's menu has a button of its own in the leading top corner (`ShowMenuButton`), opening the menu the right button
  opens, application entries and all. The picker's entries wear a button's corners and the kind's `Icon`.
- A required value wears the framework's own mark beside its caption.
- The grid takes hold when a drag ends rather than under the hand; the resize corner's reach hangs past the node's edge and
  its mark is half the size; a refused pin's caption and editor go back with the pin while a connection is pulled; a chosen
  node wears `--ui-color-primary` rather than the focus ring; and the pin at a node's head works — it was answered on the
  click that a captured pointer never delivers, and is answered on the press now.
- **One pin may take several connections.** `[GraphInput(Multiple = true)]` on a collection property gathers every edge that
  reaches it, in the document's own order, and types the pin by its element — one edge carries one element. The pin is drawn
  as a square rather than a dot, and its editor goes inert as soon as anything feeds it.
- **A pin may be shown only when it matters.** `VisibleWhen` names another input and `VisibleValues` the values of it that
  show this one; what is hidden is still saved and still fed, so a rule turned off throws nothing away.
- `Description` on a pin is the line it says under the pointer, through the framework's own tooltip; `Unit` is written after
  the value inside the field's box; `Format` is how a number the canvas writes itself — a display pin's answer — is written,
  in the page's own culture.
- `[GraphNode(Resizable = false)]` takes the corner away from a kind whose size says nothing, and `Hidden = true` keeps a kind
  out of the picker while every sheet that already holds it is still read, drawn and run.
- **A node folds to its head** at the chevron there: the body goes and its pins gather on the head's two edges, where the
  edges that reach them converge. `collapsed` travels in the document, so a folded sheet opens folded.
- **A map of the whole sheet**, `SetShowMinimap(true)`: every node in its own colour, the part now in view marked over them,
  and a press anywhere on it taking the view there. Off by default — a map of four nodes is a box in the way. It stands over the
  zoom bar, in one corner stack with it.
- **A log at the canvas's foot**, folded to a strip along the bottom edge whose count takes the colour of its worst line: every failure — a node itself
  only turns red — and whatever a node writes (`context.LogAsync` while it waits, `context.Log` straight through). A line names its
  node, and a press on the name chooses the node and brings it into view. A run that begins clears it.
- **A run line along the canvas's top** (`ShowRunProgress`, on by default): the whole run above, the running node's own steps
  below, its name at the start and the share done at the end. It keeps the last run's end, in the danger colour with the first
  failure named when a node failed. A finished node keeps its plain frame; only a running and a failed one are coloured.
- `CanvasHeight` is the canvas's least height: given a height of its own — a fill in a page's row — the canvas grows to it.
- A picture pin drawn large and a display showing a picture alone fit the height the node is dragged to.
- The unsaved word stands at the end of the log's strip, and the zoom bar is as wide as the map over it. The runner reports it through `OnRunProgress`, and
  the two new effects are `AddNodeLogEffect` and `SetRunProgressEffect`.
- **Menus by what is pressed**: the corner button's menu carries every command and the application's (`AddMenuEntries`);
  the right button's on the empty surface edits the sheet (`AddContextMenuEntries`); on a node or a group's band it pins,
  renames in place — emptied, the kind's name again — and paints one of `SetColorChoices` (the theme's series by default).
  An entry acting on nothing chosen is disabled. A group can be pinned (`UIGraphGroup.Pinned`).
- A pin's tooltip names its type — `number[]` for an array, an enum by its own name, `number, several` for a pin taking several.
- `examples/DemoApp.Graph` (port 5600) is a calculator built out of nodes, with the picture nodes beside it — and a `Pause`
  node, the one kind slow enough to watch report.

### The layered graphs

- `LayeredGraphComponent`: the application's own nodes and the links between them, laid out in layers — a layer is a column
  (or a row, `SetDirection`), the chains run straight, a circle wears its name under it (`SetNodeShape`), and a node
  the document does not place is placed by the layout. The viewer moves, groups and reroutes as on the node canvas,
  and — where the graph lets its structure be edited (`SetEditStructure`) — adds, renames, recolours, links and
  removes nodes; what they changed travels as `UIGraphDocument.Draft`, which the application applies to its nodes
  with `UIGraphDraft.ApplyTo` and puts the layout back without (`WithoutDraft`). A node the server changed under an
  unsaved change of the viewer's is marked as a conflict until the save answers.
- `ProductionGraphComponent`: resources and the crafts between them on the same sheet — a craft that gives one
  resource nothing else makes is drawn on its edges, every other one as a junction its ingredients enter and its
  products leave, each edge labelled with its amount; `UIProductionDraft` and `UIProductionDocument` are the
  production graph's own draft and document.
- The item under the pointer brings out the whole line it stands on, up and down, and the rest of the sheet steps back;
  `HighlightOnHover` turns it, on for the layered graphs and off for `NodesComponent`.
- A production graph plans (`SetMode(UIProductionMode.Plan)`): the viewer names amounts to reach, the canvas solves the runs in
  the browser and draws the plan with its totals, and a panel beside the sheet says what is brought in, made, taken and left
  over — counted once or over a minute or an hour, making least what is brought in, the time or the cost. What was asked travels
  in the document (`UIProductionDocument.Plan`), and `UIProductionPlanner.Solve` is the same solver on the server.
- Edges are stepped unless told otherwise (`EdgeShape`), and stepped edges turn in lanes: the edges crossing one gap do not
  share one upright, a fork keeps one lane and the lanes stand in the order that crosses least — on the layered graphs and the
  node canvas alike. A stepped edge on a sheet whose layers run right to left or bottom to top is drawn as it should be.
- A sheet of circles keeps the gap between its layers clear of the chips and names the circles wear, so what an edge says there is
  never under one; and nodes arriving on a sheet the layout alone made lay it out again, rather than leave its long edges running
  over them.
- A plan made once runs every craft a whole number of times, what the rounding leaves over shown as surplus; a made resource may be
  marked Brought in, which takes what makes it out of the plan (`UIProductionPlanRequest.Bought`); and a plan that changes which
  nodes it draws is laid out and fitted again.
- A link dropped on a resource that one recipe, drawn as its edges, already makes asks which was meant: another ingredient of that
  recipe, or a recipe of its own.
- A conflict is the viewer's to answer: an item the application changed under an unsaved change carries Take the server's and Keep
  mine in its menu.
- An application puts entries of its own under the canvas's in every menu — `AddNodeMenuEntries`, `AddGroupMenuEntries` beside
  the corner's, the surface's and the edge's — and `OnMenuEntry` hears them all through one event naming the entry and what the
  menu was opened on; the canvas's own entries never reach that command. The corner menu is the sheet's commands alone: Add
  node and Add resource are the right button's.
- The grid holds unless told otherwise (`SetSnapToGrid(false)`), and takes sizes as well as places: a node dragged by its corner,
  folded, or simply as large as its contents lands with both corners on the grid, and a layered graph is taken by the middles of
  its nodes so its lines stay straight. A folded node is its head alone — no taller, and no wider than its words.
- The layered layout stands a source beside what it feeds, bends a long edge once, and does not push a sheet apart where a
  long edge passes over a chain it is joined to; Fit keeps a node's name and chip in view.
- `examples/DemoApp.Graph` has a dependencies page and a real game's two production chains — a battery and a drink sharing
  their water and their sandleaf powder — and their plan.
