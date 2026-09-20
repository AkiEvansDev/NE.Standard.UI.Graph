//#region src/canvas/canvas-dom.ts
var e = ".ui-graph", t = "data-ui-graph-document", n = "data-ui-graph-group", r = "data-ui-graph-selected", i = "data-ui-graph-edge", a = "data-ui-graph-reroute", o = "data-ui-graph-node", s = "data-ui-graph-pin-toggle", c = "data-ui-graph-fold", l = ".ui-graph__node-title", u = class {
	read;
	depth;
	past = [];
	future = [];
	present;
	saved;
	constructor(e, t, n = 100) {
		this.read = t, this.depth = n, this.present = JSON.stringify(e), this.saved = this.present;
	}
	get canUndo() {
		return this.past.length > 0;
	}
	get canRedo() {
		return this.future.length > 0;
	}
	get dirty() {
		return this.present !== this.saved;
	}
	record(e) {
		let t = JSON.stringify(e);
		t !== this.present && (this.past.push(this.present), this.past.length > this.depth && this.past.shift(), this.future.length = 0, this.present = t);
	}
	reset(e, t) {
		this.past.length = 0, this.future.length = 0, this.present = JSON.stringify(e), t && (this.saved = this.present);
	}
	markSaved(e = this.present) {
		this.saved = e;
	}
	undo() {
		let e = this.past.pop();
		return e === void 0 ? null : (this.future.push(this.present), this.present = e, this.read(JSON.parse(e)));
	}
	redo() {
		let e = this.future.pop();
		return e === void 0 ? null : (this.past.push(this.present), this.present = e, this.read(JSON.parse(e)));
	}
};
//#endregion
//#region src/canvas/canvas-model.ts
function d(e) {
	if (e === null || e.length === 0) return null;
	try {
		return JSON.parse(e);
	} catch {
		return null;
	}
}
function f(e) {
	let t = Number(e);
	return Number.isFinite(t) && t > 0 ? t : null;
}
function p(e) {
	return (e ?? []).map((e) => ({
		x: Number(e.x) || 0,
		y: Number(e.y) || 0
	}));
}
function m(e) {
	return {
		id: String(e.id),
		x: Number(e.x) || 0,
		y: Number(e.y) || 0,
		width: Number(e.width) || 0,
		height: Number(e.height) || 0,
		title: e.title ?? null,
		color: e.color ?? null,
		pinned: e.pinned === !0
	};
}
function h(e) {
	return `${e}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
//#endregion
//#region src/canvas/canvas-document.ts
var g = class {
	root;
	valueElement;
	settings;
	callbacks;
	values;
	documentValue;
	version = 0;
	history;
	sent = null;
	queuedSave = null;
	constructor(e, n, r, i, a, o) {
		this.root = e, this.valueElement = n, this.settings = r, this.callbacks = a, this.values = o, this.documentValue = i(d(this.valueElement.getAttribute(t))), this.history = new u(this.documentValue, i);
	}
	get document() {
		return this.documentValue;
	}
	load(e) {
		if (JSON.stringify(e) === JSON.stringify(this.documentValue)) {
			this.history.markSaved(), this.markClean();
			return;
		}
		this.documentValue = e, this.version++, this.history.reset(e, !0), this.callbacks.clearSelectionSets(), this.markClean(), this.callbacks.redraw();
	}
	edited(e = !0) {
		this.history.record(this.documentValue), this.version++, this.showDirty(), e ? this.callbacks.redraw() : this.callbacks.redrawEdges();
	}
	save(e = "") {
		if (this.settings.readOnly) return;
		if (this.sent !== null) {
			this.queuedSave = e;
			return;
		}
		let n = JSON.stringify(this.documentValue);
		this.valueElement.setAttribute(t, n), this.valueElement.dispatchEvent(new Event("change", { bubbles: !0 })), this.sent = n, this.root.classList.add("ui-graph--saving"), this.raiseSave(e);
	}
	raiseSave(e) {
		this.valueElement.dispatchEvent(new CustomEvent("save", {
			bubbles: !0,
			detail: { reason: e }
		}));
	}
	requestSave(e) {
		this.settings.readOnly ? this.raiseSave(e) : this.save(e);
	}
	saveCompleted(e) {
		let t = this.sent;
		this.sent = null, this.root.classList.remove("ui-graph--saving"), e && t !== null && (this.history.markSaved(t), this.showDirty());
		let n = this.queuedSave;
		n !== null && (this.queuedSave = null, this.save(n));
	}
	showDirty() {
		let e = this.history.dirty, t = this.root.classList.contains("ui-graph--dirty");
		this.root.classList.toggle("ui-graph--dirty", e), e ? this.values.hold(this.valueElement) : t && this.sent === null && this.values.release(this.valueElement);
	}
	markClean() {
		this.sent = null, this.root.classList.remove("ui-graph--dirty", "ui-graph--saving");
	}
	undo() {
		return this.history.undo();
	}
	redo() {
		return this.history.redo();
	}
	replay(e) {
		this.documentValue = e, this.version++, this.showDirty(), this.callbacks.redraw();
	}
}, _ = 12, v = 9, ee = 7;
function te(e, t, n, r = []) {
	return ne(e, t, n, r).path;
}
function ne(e, t, n, r = [], i = {}) {
	let a = i.axis === "vertical", o = i.reversed === !0 ? -1 : 1, s = (e) => a ? {
		x: e.y * o,
		y: e.x
	} : {
		x: e.x * o,
		y: e.y
	}, c = (e) => a ? {
		x: e.y,
		y: e.x * o
	} : {
		x: e.x * o,
		y: e.y
	}, l = [
		t,
		...r,
		n
	].map(s), u = (i.back === !0 && r.length === 0 ? oe(l[0], l[1]) : e === "straight" ? y(l) : e === "orthogonal" ? ae(l, (i.turns ?? []).map((e) => e === void 0 ? void 0 : e * o)) : b(l)).map((e) => ({
		op: e.op,
		points: e.points.map(c)
	}));
	return {
		path: re(u),
		arrow: i.arrow === !0 ? se(u) : null
	};
}
function re(e) {
	return e.map((e) => `${e.op}${e.points.map((e) => `${x(e.x)},${x(e.y)}`).join(" ")}`).join(" ");
}
function y(e) {
	return e.map((e, t) => ({
		op: t === 0 ? "M" : "L",
		points: [e]
	}));
}
function b(e) {
	let t = [{
		op: "M",
		points: [e[0]]
	}];
	for (let n = 1; n < e.length; n++) {
		let r = e[n - 1], i = e[n], a = ie(r, i);
		t.push({
			op: "C",
			points: [
				{
					x: r.x + a,
					y: r.y
				},
				{
					x: i.x - a,
					y: i.y
				},
				i
			]
		});
	}
	return t;
}
function ie(e, t) {
	let n = t.x - e.x;
	return n >= 0 ? Math.min(Math.max(n * .5, 24), 160) : Math.min(Math.max(-n * .6 + 40, 60), 220);
}
function ae(e, t) {
	let n = [{
		op: "M",
		points: [e[0]]
	}], r = (e, t) => {
		n.push({
			op: "L",
			points: [{
				x: x(e),
				y: x(t)
			}]
		});
	};
	for (let n = 1; n < e.length; n++) {
		let i = e[n - 1], a = e[n];
		if (a.x - i.x >= 48) {
			let e = Math.min(a.x - _, Math.max(i.x + _, t[n - 1] ?? (i.x + a.x) / 2));
			r(e, i.y), r(e, a.y), r(a.x, a.y);
		} else {
			let e = i.x + 24, t = a.x - 24, n = (i.y + a.y) / 2;
			r(e, i.y), r(e, n), r(t, n), r(t, a.y), r(a.x, a.y);
		}
	}
	return n;
}
function oe(e, t) {
	let n = t.x - e.x, r = Math.min(96, 20 + Math.abs(n) * .1), i = Math.min(e.y, t.y) - r, a = n * .2;
	return [{
		op: "M",
		points: [e]
	}, {
		op: "C",
		points: [
			{
				x: e.x + a,
				y: i
			},
			{
				x: t.x - a,
				y: i
			},
			t
		]
	}];
}
function se(e) {
	let t = e[e.length - 1], n = t.points[t.points.length - 1], r = t.points.length > 1 ? t.points[t.points.length - 2] : e.length > 1 ? e[e.length - 2].points[e[e.length - 2].points.length - 1] : null;
	if (r === null) return null;
	let i = n.x - r.x, a = n.y - r.y, o = Math.hypot(i, a);
	if (o === 0) return null;
	let s = i / o, c = a / o, l = n.x - s * v, u = n.y - c * v, d = ee / 2;
	return `M${x(n.x)},${x(n.y)} L${x(l - c * d)},${x(u + s * d)} L${x(l + c * d)},${x(u - s * d)} Z`;
}
function x(e) {
	return Math.round(e * 100) / 100;
}
function ce(e) {
	if (e.length === 0) return null;
	let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity;
	for (let a of e) t = Math.min(t, a.x), n = Math.min(n, a.y), r = Math.max(r, a.x + a.width), i = Math.max(i, a.y + a.height);
	return {
		x: t,
		y: n,
		width: r - t,
		height: i - n
	};
}
function le(e, t) {
	return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function ue(e, t) {
	return t.x >= e.x && t.y >= e.y && t.x + t.width <= e.x + e.width && t.y + t.height <= e.y + e.height;
}
function de(e, t, n, r, i, a = 48) {
	if (e.width <= 0 || e.height <= 0 || t <= 0 || n <= 0) return {
		zoom: 1,
		panX: 0,
		panY: 0
	};
	let o = Math.min(i, Math.max(r, Math.min((t - a * 2) / e.width, (n - a * 2) / e.height)));
	return {
		zoom: o,
		panX: t / 2 - (e.x + e.width / 2) * o,
		panY: n / 2 - (e.y + e.height / 2) * o
	};
}
function S(e, t, n) {
	return n && t > 0 ? Math.round(e / t) * t : e;
}
function fe(e, t, n) {
	let r = n.x - t.x, i = n.y - t.y, a = r * r + i * i;
	if (a === 0) return Math.hypot(e.x - t.x, e.y - t.y);
	let o = Math.min(1, Math.max(0, ((e.x - t.x) * r + (e.y - t.y) * i) / a));
	return Math.hypot(e.x - (t.x + o * r), e.y - (t.y + o * i));
}
//#endregion
//#region src/canvas/canvas-selection.ts
var pe = class {
	nodeElements;
	groupLayer;
	marquee;
	host;
	selection = /* @__PURE__ */ new Set();
	selectedEdges = /* @__PURE__ */ new Set();
	constructor(e, t, n, r) {
		this.nodeElements = t, this.groupLayer = n, this.marquee = e.querySelector(".ui-graph__marquee"), this.host = r;
	}
	get nodeIds() {
		return this.selection;
	}
	get size() {
		return this.selection.size;
	}
	get edgeIds() {
		return this.selectedEdges;
	}
	get edgeSize() {
		return this.selectedEdges.size;
	}
	has(e) {
		return this.selection.has(e);
	}
	hasEdge(e) {
		return this.selectedEdges.has(e);
	}
	pruneNodes(e) {
		for (let t of [...this.selection]) e.has(t) || this.selection.delete(t);
	}
	select(e, t) {
		t || this.selection.clear(), t && this.selection.has(e) ? this.selection.delete(e) : this.selection.add(e), this.selectedEdges.clear(), this.markSelection();
	}
	clearSelection() {
		this.selection.clear(), this.selectedEdges.clear(), this.markSelection(), this.host.drawEdges();
	}
	clearSets() {
		this.selection.clear(), this.selectedEdges.clear();
	}
	chooseForMenu(e) {
		this.select(e, !1);
	}
	selectOnly(e) {
		this.selectOnlyMany([e]);
	}
	selectOnlyMany(e) {
		this.selection.clear();
		for (let t of e) this.selection.add(t);
	}
	selectAll(e) {
		for (let t of e) this.selection.add(t);
		this.markSelection();
	}
	markSelection() {
		for (let [e, t] of this.nodeElements) t.toggleAttribute(r, this.selection.has(e));
		for (let e of this.groupLayer.querySelectorAll(`[${n}]`)) e.toggleAttribute(r, this.selection.has(e.getAttribute(n)));
	}
	toggleEdge(e, t) {
		t || this.selectedEdges.clear(), this.selectedEdges.has(e) ? this.selectedEdges.delete(e) : this.selectedEdges.add(e);
	}
	beginMarquee() {
		this.marquee.hidden = !1;
	}
	hideMarquee() {
		this.marquee.hidden = !0;
	}
	drawMarquee(e, t, n, r) {
		let i = {
			x: Math.min(e, n),
			y: Math.min(t, r),
			width: Math.abs(n - e),
			height: Math.abs(r - t)
		};
		this.marquee.hidden = !1, this.marquee.style.setProperty("--ui-graph-marquee-x", String(i.x)), this.marquee.style.setProperty("--ui-graph-marquee-y", String(i.y)), this.marquee.style.setProperty("--ui-graph-marquee-width", String(i.width)), this.marquee.style.setProperty("--ui-graph-marquee-height", String(i.height));
		for (let e of this.host.items()) {
			let t = this.host.nodeRect(e.id);
			t !== null && (le(i, t) ? this.selection.add(e.id) : this.selection.delete(e.id));
		}
		this.markSelection();
	}
};
function C(e) {
	return e.ctrlKey || e.metaKey;
}
//#endregion
//#region src/canvas/canvas-drag.ts
var me = class {
	selection;
	host;
	settings;
	constructor(e, t, n) {
		this.selection = e, this.host = t, this.settings = n;
	}
	beginNodeDrag(e, t, n) {
		if (this.selection.has(t) ? C(e) && this.selection.select(t, !0) : this.selection.select(t, C(e)), this.settings.readOnly) return null;
		let r = /* @__PURE__ */ new Map();
		for (let e of this.selection.nodeIds) {
			let t = this.host.items().find((t) => t.id === e);
			t !== void 0 && t.pinned !== !0 && r.set(e, {
				x: t.x,
				y: t.y
			});
		}
		return {
			kind: "nodes",
			startX: n.x,
			startY: n.y,
			moving: r
		};
	}
	beginResize(e, t) {
		return {
			kind: "resize",
			nodeId: e.getAttribute(o),
			startX: t.x,
			startY: t.y,
			width: e.offsetWidth,
			height: e.offsetHeight
		};
	}
	beginGroupDrag(e, t, n) {
		let r = this.host.groups().find((e) => e.id === t);
		if (r === void 0 || (this.selection.select(t, C(e)), this.settings.readOnly || r.pinned === !0)) return null;
		let i = {
			x: r.x,
			y: r.y,
			width: r.width,
			height: r.height
		}, a = /* @__PURE__ */ new Map();
		for (let e of this.host.items()) {
			let t = this.host.nodeRect(e.id);
			e.pinned !== !0 && t !== null && ue(i, t) && a.set(e.id, {
				x: e.x,
				y: e.y
			});
		}
		return {
			kind: "group",
			startX: n.x,
			startY: n.y,
			group: r,
			origin: {
				x: r.x,
				y: r.y
			},
			moving: a
		};
	}
	moveNodes(e, t, n) {
		for (let [r, i] of e) {
			let e = this.host.items().find((e) => e.id === r);
			e !== void 0 && (e.x = i.x + t, e.y = i.y + n, this.placeNode(r, e));
		}
		this.host.drawEdges(), this.host.drawMinimap();
	}
	moveGroup(e, t) {
		let n = t.x - e.startX, r = t.y - e.startY;
		e.group.x = e.origin.x + n, e.group.y = e.origin.y + r, this.moveNodes(e.moving, n, r), this.host.drawGroups();
	}
	resizeNode(e, t, n) {
		let r = this.host.items().find((t) => t.id === e), i = this.host.nodeElements.get(e);
		r !== void 0 && i !== void 0 && (i.style.setProperty("--ui-graph-node-w", String(Math.max(1, Math.round(t)))), i.style.setProperty("--ui-graph-node-h", String(Math.max(1, Math.round(n)))), r.width = i.offsetWidth, r.height = i.offsetHeight, this.host.drawEdges(), this.host.drawMinimap());
	}
	snapNodes(e) {
		let t = this.settings.gridSize, n = this.host.items();
		for (let r of e) {
			let e = n.find((e) => e.id === r);
			if (e === void 0) continue;
			let i = this.snapPlace(r, e, t);
			e.x = i.x, e.y = i.y, this.placeNode(r, e);
		}
	}
	snapPlace(e, t, n = this.settings.gridSize) {
		let r = this.host.kind().snapsByCenter === !0 ? this.host.nodeElements.get(e) : void 0, i = (r?.offsetWidth ?? 0) / 2, a = (r?.offsetHeight ?? 0) / 2;
		return {
			x: S(t.x + i, n, !0) - i,
			y: S(t.y + a, n, !0) - a
		};
	}
	snapSize(e) {
		let t = this.host.items().find((t) => t.id === e), n = this.host.nodeElements.get(e);
		if (t === void 0 || n === void 0) return;
		let r = this.settings.gridSize;
		this.resizeNode(e, S(n.offsetWidth, r, !0), S(n.offsetHeight, r, !0)), he(n, r), t.width = n.offsetWidth, t.height = n.offsetHeight;
	}
	settleGroup(e) {
		e.group.x = S(e.group.x, this.settings.gridSize, !0), e.group.y = S(e.group.y, this.settings.gridSize, !0), this.snapNodes(e.moving.keys()), this.host.drawGroups();
	}
	placeNode(e, t) {
		let n = this.host.nodeElements.get(e);
		n?.style.setProperty("--ui-graph-node-x", String(t.x)), n?.style.setProperty("--ui-graph-node-y", String(t.y));
	}
};
function he(e, t) {
	ge([e], t);
}
function ge(e, t) {
	if (t <= 0) return;
	let n = [...e].map((e) => ({
		element: e,
		width: e.offsetWidth,
		height: e.offsetHeight
	}));
	for (let { element: e, width: r, height: i } of n) {
		let n = Math.ceil((r - .5) / t) * t, a = Math.ceil((i - .5) / t) * t;
		n !== r && e.style.setProperty("--ui-graph-node-w", String(n)), a !== i && e.style.setProperty("--ui-graph-node-h", String(a));
	}
}
//#endregion
//#region src/canvas/canvas-menus.ts
var _e = "data-ui-graph-colors", ve = "data-ui-context-menu", w = "data-ui-context-menu-use", ye = "graph-node-menu", be = "graph-group-menu", xe = "graph-edge-menu", Se = "data-ui-graph-menu-panel", Ce = `[${ve}], [${Se}]`, we = "data-ui-collapsed", Te = "data-ui-collapse-toggle", Ee = "ui-menu-item", De = "ui-menu-item--checked", Oe = "data-ui-graph-swatch", ke = "graph:color:", Ae = "graph:color:default", je = class {
	root;
	context;
	documentState;
	selection;
	view;
	settings;
	host;
	groupLayer;
	colors;
	menuTarget = null;
	constructor(e, t, n, r, i, a, o, s) {
		this.root = e, this.context = t, this.documentState = n, this.selection = r, this.view = i, this.settings = a, this.host = o, this.groupLayer = s, this.colors = Me(e.getAttribute(_e));
	}
	panelToggleOf(e) {
		return e.closest("[data-ui-graph-menu-panel]") === null ? null : e.closest(`[${Te}]`);
	}
	foldPanel() {
		let e = this.root.querySelector(`[${Se}] > .ui-menu`);
		e !== null && !e.hasAttribute(we) && e.querySelector(`:scope > [${Te}]`)?.click();
	}
	prepareMenus(e) {
		if (!(e instanceof Element) || e.closest(Ce) !== null) return;
		let t = e.closest("[data-ui-graph-node]")?.getAttribute("data-ui-graph-node") ?? null, n = t === null && e.closest(".ui-graph__group-band") !== null ? e.closest("[data-ui-graph-group]")?.getAttribute("data-ui-graph-group") ?? null : null, r = t === null && n === null && this.host.kind().hasEdgeMenu() ? e.closest("[data-ui-graph-edge]")?.getAttribute("data-ui-graph-edge") ?? null : null;
		if (this.menuTarget = t === null ? n === null ? r === null ? null : {
			kind: "edge",
			id: r
		} : {
			kind: "group",
			id: n
		} : {
			kind: "node",
			id: t
		}, r !== null) {
			this.selection.hasEdge(r) || (this.selection.clearSets(), this.selection.markSelection(), this.selection.toggleEdge(r, !1), this.host.drawEdges()), this.syncMenus();
			return;
		}
		let i = t ?? n;
		i !== null && !this.selection.has(i) && (this.selection.chooseForMenu(i), this.host.drawEdges()), this.syncMenus();
	}
	syncMenus() {
		let e = !this.settings.readOnly, t = this.host.kind().items().some((e) => this.selection.has(e.id));
		this.host.kind().syncMenus(e, this.menuTarget), this.enableEntries("graph:arrange", e), this.enableEntries("graph:save", e), this.enableEntries("graph:group-selection", e && t), this.enableEntries("graph:delete-selection", e && (this.selection.size > 0 || this.selection.edgeSize > 0));
		for (let t of [ye, be]) {
			let n = this.root.querySelector(`[${ve}="${t}"]`), r = this.menuItem(t);
			if (n === null) continue;
			for (let t of D(n, "graph:pin")) Ie(t, r?.pinned === !0), O(t, e);
			let i = e && (t === "graph-group-menu" || this.host.kind().canEditItems());
			for (let e of D(n, "graph:rename")) O(e, i);
			this.syncColors(n, r?.color ?? null, i);
		}
	}
	enableEntries(e, t) {
		T(this.root, e, t);
	}
	syncColors(e, t, n) {
		let r = "";
		for (let n of e.querySelectorAll(`[data-ui-key^="${ke}"]`)) {
			let e = Fe(n), i = n.getAttribute("data-ui-key") ?? "", a = i === Ae ? null : this.colors[Number(i.slice(12))] ?? null, o = a === null ? t === null || t.length === 0 : a === t;
			e !== null && (e.setAttribute(Oe, ""), e.style.setProperty("--ui-graph-swatch", a ?? "transparent"), Ie(e, o), o && (r = e.textContent?.trim() ?? ""));
		}
		for (let t of D(e, "graph:color")) {
			O(t, n);
			let e = t.querySelector(".ui-menu-item__value");
			e !== null && (e.textContent = r);
		}
	}
	menuItem(e) {
		let t = this.menuTarget;
		if (t !== null && e === "graph-node-menu" == (t.kind === "node")) return t.kind === "node" ? this.host.kind().items().find((e) => e.id === t.id) : this.documentState.document.groups.find((e) => e.id === t.id);
	}
	menuItems(e) {
		let t = this.menuItem(e);
		return t === void 0 ? [] : [t, ...(e === "graph-node-menu" ? this.host.kind().items() : this.documentState.document.groups).filter((e) => e !== t && this.selection.has(e.id))];
	}
	raiseEntry(e, t) {
		let n = this.menuTarget, r = t === "graph-node-menu" ? "node" : t === "graph-group-menu" ? "group" : t === "graph-edge-menu" ? "edge" : "canvas", i = n !== null && n.kind === r ? n.id : "";
		this.root.dispatchEvent(new CustomEvent("menu-entry", {
			bubbles: !0,
			detail: { keys: [
				e,
				r,
				i
			] }
		}));
	}
	run(e, t) {
		if (e.startsWith(ke)) {
			this.paintItems(t, e);
			return;
		}
		switch (e) {
			case "graph:delete-selection":
				this.host.deleteSelection();
				break;
			case "graph:group-selection":
				this.groupSelection();
				break;
			case "graph:arrange":
				this.arrangeNodes();
				break;
			case "graph:fit":
				this.view.fit();
				break;
			case "graph:save":
				this.documentState.save();
				break;
			case "graph:pin":
				this.pinItems(t);
				break;
			case "graph:rename":
				this.renameItem(t);
				break;
			default: this.host.kind().runCommand(e, this.menuTarget);
		}
	}
	pinItems(e) {
		let t = this.menuItems(e);
		if (t.length === 0 || this.settings.readOnly) return;
		let n = t[0].pinned !== !0;
		for (let e of t) e.pinned = n;
		this.documentState.edited(), this.syncMenus();
	}
	paintItems(e, t) {
		let n = this.menuItems(e), r = t === Ae ? null : this.colors[Number(t.slice(12))];
		if (!(n.length === 0 || this.settings.readOnly || r === void 0)) {
			for (let t of n) (e !== "graph-node-menu" || !this.host.kind().paintItem(t.id, r)) && (t.color = r);
			this.documentState.edited(), this.syncMenus();
		}
	}
	renameItem(e) {
		let t = this.menuItem(e);
		t !== void 0 && this.openRename(t, e === ye);
	}
	renameNode(e) {
		let t = this.host.kind().items().find((t) => t.id === e);
		t !== void 0 && this.openRename(t, !0);
	}
	openRename(e, t) {
		if (this.settings.readOnly) return;
		let r = t ? e : null, i = r === null ? this.groupLayer.querySelector(`[${n}="${CSS.escape(e.id)}"] > .ui-graph__group-band`) : this.host.nodeElements.get(r.id) ?? null, a = i?.querySelector(r === null ? ".ui-graph__group-title" : ".ui-graph__node-title") ?? null;
		i !== null && a !== null && this.context.renames.open({
			container: i,
			title: a,
			className: "ui-graph__rename",
			value: a.textContent ?? "",
			allowEmpty: !0,
			commit: (t) => {
				let n = t.length === 0 ? null : t;
				(r === null || !this.host.kind().renameItem(r.id, n)) && (e.title = n), this.documentState.edited();
			},
			done: () => this.view.viewportElement.focus({ preventScroll: !0 })
		});
	}
	groupSelection() {
		if (this.settings.readOnly || this.selection.size === 0) return;
		let e = [];
		for (let t of this.selection.nodeIds) {
			let n = this.host.nodeRect(t);
			n !== null && e.push(n);
		}
		let t = ce(e);
		t !== null && (this.documentState.document.groups.push({
			id: h("g"),
			x: t.x - 24,
			y: t.y - 24 - 24,
			width: t.width + 48,
			height: t.height + 48 + 24,
			title: this.context.strings.text("ui.graph.group"),
			color: null
		}), this.documentState.edited());
	}
	arrangeNodes() {
		if (this.settings.readOnly) return;
		let e = /* @__PURE__ */ new Map();
		for (let [t, n] of this.host.nodeElements) e.set(t, {
			width: n.offsetWidth,
			height: n.offsetHeight
		});
		let t = this.host.kind().arrange(e, this.selection.size > 1 ? new Set(this.selection.nodeIds) : void 0);
		for (let e of this.host.kind().items()) {
			let n = t.get(e.id);
			if (n !== void 0) {
				let t = this.settings.snapping ? this.host.snapPlace(e.id, n) : n;
				e.x = t.x, e.y = t.y;
			}
		}
		this.documentState.edited(), this.view.fit();
	}
};
function Me(e) {
	let t = d(e);
	return Array.isArray(t) ? t.map((e) => String(e)) : [];
}
function Ne(e, t, n, r) {
	let i = document.createElement("span");
	i.setAttribute(w, t), i.hidden = !0, (e.querySelector(".ui-graph__viewport") ?? e).append(i), i.dispatchEvent(new MouseEvent("contextmenu", {
		bubbles: !0,
		cancelable: !0,
		button: 2,
		clientX: n,
		clientY: r
	})), i.remove();
}
function T(e, t, n) {
	for (let r of D(e, t)) O(r, n);
}
function Pe(e, t, n) {
	for (let r of D(e, t)) Ie(r, n);
}
function E(e, t, n) {
	for (let r of D(e, t)) {
		let e = r.closest("[data-ui-key]") ?? r;
		e.style.display = n ? "" : "none";
	}
}
function D(e, t) {
	let n = [];
	for (let r of e.querySelectorAll(`:is(${Ce}) [data-ui-key="${CSS.escape(t)}"]`)) {
		let e = Fe(r);
		e !== null && n.push(e);
	}
	return n;
}
function Fe(e) {
	return e.classList.contains(Ee) ? e : e.querySelector(`:scope > .${Ee}`);
}
function O(e, t) {
	e.classList.toggle("ui-disabled", !t), e.toggleAttribute("inert", !t), e.setAttribute("aria-disabled", String(!t));
}
function Ie(e, t) {
	e.classList.toggle(De, t), e.setAttribute("aria-checked", String(t));
}
//#endregion
//#region src/canvas/canvas-render.ts
var k = "http://www.w3.org/2000/svg", Le = "ui-graph--edge-focus", A = "data-ui-graph-related", Re = 4, ze = class {
	context;
	scene;
	nodeLayer;
	groupLayer;
	edgeLayer;
	nodeElements;
	documentState;
	selection;
	settings;
	view;
	kind;
	nodeWatchers = [];
	nodeBoxes = /* @__PURE__ */ new Map();
	edgesQueued = !1;
	focusItem = null;
	edgeParts = /* @__PURE__ */ new Map();
	constructor(e, t, n, r, i, a, o, s, c, l, u) {
		this.context = e, this.scene = t, this.nodeLayer = n, this.groupLayer = r, this.edgeLayer = i, this.nodeElements = a, this.documentState = o, this.selection = s, this.settings = c, this.view = l, this.kind = u;
	}
	draw() {
		this.drawGroups(), this.drawNodes(), this.view.drawMinimap(), this.view.applyView(), this.drawEdges();
	}
	dispose() {
		for (let e of this.nodeWatchers) e();
		this.nodeWatchers.length = 0;
	}
	drawNodes() {
		this.context.tooltips.hide();
		let e = this.kind(), t = /* @__PURE__ */ new Set();
		for (let e of this.nodeWatchers) e();
		this.nodeWatchers.length = 0, this.nodeBoxes.clear(), this.nodeLayer.replaceChildren(), this.nodeElements.clear();
		for (let n of e.items()) {
			let i = e.renderItem(n);
			this.selection.has(n.id) && i.setAttribute(r, ""), i.setAttribute(w, ye), this.nodeLayer.append(i), this.nodeElements.set(n.id, i), t.add(n.id);
		}
		let n = new Set(t);
		for (let e of this.documentState.document.groups) n.add(e.id);
		this.selection.pruneNodes(n), e.itemsDrawn(t), this.watchSizes(), this.markFocus();
	}
	watchSizes() {
		for (let [e, t] of this.nodeElements) this.nodeBoxes.set(e, Be(t));
		for (let [e, t] of this.nodeElements) this.nodeWatchers.push(this.context.observeSize(t, () => this.nodeResized(e, t)));
	}
	nodeResized(e, t) {
		let n = Be(t);
		this.nodeBoxes.get(e) !== n && (this.nodeBoxes.set(e, n), !this.edgesQueued && (this.edgesQueued = !0, queueMicrotask(() => {
			this.edgesQueued = !1, this.drawEdges(), this.view.drawMinimap();
		})));
	}
	drawGroups() {
		this.groupLayer.replaceChildren();
		for (let e of this.documentState.document.groups) {
			let t = document.createElement("div");
			t.className = "ui-graph__group", t.setAttribute(n, e.id), t.style.setProperty("--ui-graph-group-x", String(e.x)), t.style.setProperty("--ui-graph-group-y", String(e.y)), t.style.setProperty("--ui-graph-group-width", String(e.width)), t.style.setProperty("--ui-graph-group-height", String(e.height)), e.color !== null && e.color !== void 0 && e.color.length > 0 && t.style.setProperty("--ui-graph-group-color", e.color), this.selection.has(e.id) && t.setAttribute(r, ""), e.pinned === !0 && t.setAttribute("data-ui-graph-pinned", "");
			let i = document.createElement("div"), a = document.createElement("span");
			if (i.className = "ui-graph__group-band", i.setAttribute(w, be), a.className = "ui-graph__group-title", a.textContent = e.title ?? this.context.strings.text("ui.graph.group"), i.append(a), e.pinned === !0) {
				let e = document.createElement("span");
				e.className = "ui-graph__group-pinned", e.setAttribute("aria-hidden", "true"), this.context.icons.apply(e, "ne-pin"), i.append(e);
			}
			t.append(i), this.groupLayer.append(t);
		}
	}
	setFocusItem(e) {
		this.focusItem !== e && (this.focusItem = e, this.markFocus());
	}
	get root() {
		return this.scene.closest(e);
	}
	markFocus() {
		let e = this.focusItem === null ? null : this.kind().related(this.focusItem), t = e === null ? null : new Set(e.edges), n = e === null ? null : new Set(e.items);
		this.root.classList.toggle(Le, t !== null && t.size > 0);
		for (let [e, n] of this.edgeParts) for (let r of n) r.toggleAttribute(A, t !== null && t.has(e));
		for (let [e, t] of this.nodeElements) t.toggleAttribute(A, n !== null && n.has(e));
	}
	drawEdges() {
		let e = this.kind(), t = e.hasEdgeMenu();
		this.edgeLayer.replaceChildren(), this.edgeParts.clear();
		let n = this.focusItem === null ? null : new Set(e.related(this.focusItem).edges);
		for (let o of e.edges()) {
			let s = e.edgeEnds(o);
			if (s === null) continue;
			let c = [], l = n !== null && n.has(o.id);
			this.edgeParts.set(o.id, c);
			let u = e.edgeColor(o), d = o.points.length === 0 && s.via !== void 0 ? s.via : o.points, f = ne(this.settings.edgeShape, s.from, s.to, d, {
				axis: s.axis,
				back: s.back,
				arrow: s.arrow,
				reversed: s.reversed,
				turns: o.points.length === 0 ? s.turns : void 0
			}), p = document.createElementNS(k, "path");
			if (p.setAttribute("d", f.path), p.setAttribute("class", s.back === !0 ? "ui-graph__edge ui-graph__edge--back" : "ui-graph__edge"), p.setAttribute(i, o.id), p.style.setProperty("--ui-graph-pin-color", u), this.selection.hasEdge(o.id) && p.setAttribute(r, ""), s.conflict === !0 && p.setAttribute("data-ui-graph-conflict", "changed"), t && p.setAttribute(w, xe), p.toggleAttribute(A, l), this.edgeLayer.append(p), c.push(p), f.arrow !== null) {
				let e = document.createElementNS(k, "path");
				e.setAttribute("d", f.arrow), e.setAttribute("class", "ui-graph__edge-arrow"), e.style.setProperty("--ui-graph-pin-color", u), e.toggleAttribute(A, l), this.edgeLayer.append(e), c.push(e);
			}
			s.label !== null && s.label !== void 0 && s.label.length > 0 && c.push(...[this.drawLabel(p, s.label, o.id, t, l)].flat()), o.points.forEach((e, t) => {
				let n = document.createElementNS(k, "circle");
				n.setAttribute("class", "ui-graph__reroute"), n.setAttribute(a, o.id), n.setAttribute("data-ui-graph-reroute-index", String(t)), n.setAttribute("cx", String(e.x)), n.setAttribute("cy", String(e.y)), n.setAttribute("r", "4"), n.style.setProperty("--ui-graph-pin-color", u), n.toggleAttribute(A, l), this.edgeLayer.append(n), c.push(n);
			});
		}
		this.markFocus();
	}
	drawLabel(e, t, n, r, a) {
		let o = e.getPointAtLength(e.getTotalLength() / 2), s = document.createElementNS(k, "text");
		s.setAttribute("class", "ui-graph__edge-label"), s.setAttribute("x", String(o.x)), s.setAttribute("y", String(o.y)), s.setAttribute(i, n), r && s.setAttribute(w, xe), s.textContent = t, s.toggleAttribute(A, a), this.edgeLayer.append(s);
		let c = s.getBBox(), l = document.createElementNS(k, "rect");
		return c.width === 0 ? s : (l.setAttribute("class", "ui-graph__edge-label-box"), l.setAttribute("x", String(c.x - Re)), l.setAttribute("y", String(c.y - Re / 2)), l.setAttribute("width", String(c.width + 8)), l.setAttribute("height", String(c.height + Re)), l.setAttribute("rx", "4"), l.setAttribute(i, n), r && l.setAttribute(w, xe), l.toggleAttribute(A, a), this.edgeLayer.insertBefore(l, s), [l, s]);
	}
	drawPending(e, t, n) {
		this.clearPending();
		let r = document.createElementNS(k, "path");
		r.setAttribute("d", te(this.settings.edgeShape, e, t)), r.setAttribute("class", "ui-graph__edge ui-graph__edge--pending"), r.style.setProperty("--ui-graph-pin-color", n), this.edgeLayer.append(r);
	}
	clearPending() {
		this.edgeLayer.querySelector(".ui-graph__edge--pending")?.remove();
	}
	centerOf(e) {
		let t = this.scene.getBoundingClientRect(), n = e.getBoundingClientRect();
		return {
			x: (n.left + n.width / 2 - t.left) / this.view.zoom,
			y: (n.top + n.height / 2 - t.top) / this.view.zoom
		};
	}
	nodeRect(e) {
		let t = this.kind().items().find((t) => t.id === e), n = this.nodeElements.get(e);
		return t === void 0 || n === void 0 ? null : {
			x: t.x,
			y: t.y,
			width: n.offsetWidth,
			height: n.offsetHeight
		};
	}
	nodeExtent(e) {
		let t = this.nodeRect(e), n = this.nodeElements.get(e);
		if (t === null || n === void 0) return t;
		let r = n.getBoundingClientRect(), i = r.width > 0 && t.width > 0 ? r.width / t.width : 1, a = r.left, o = r.top, s = r.right, c = r.bottom;
		for (let e of n.querySelectorAll("*")) {
			let t = e.getBoundingClientRect();
			t.width !== 0 && t.height !== 0 && (a = Math.min(a, t.left), o = Math.min(o, t.top), s = Math.max(s, t.right), c = Math.max(c, t.bottom));
		}
		return {
			x: t.x - (r.left - a) / i,
			y: t.y - (r.top - o) / i,
			width: (s - a) / i,
			height: (c - o) / i
		};
	}
};
function Be(e) {
	return `${e.offsetWidth}x${e.offsetHeight}`;
}
//#endregion
//#region src/canvas/canvas-settings.ts
var Ve = "data-ui-graph-edge-shape", He = "data-ui-graph-snap", Ue = "data-ui-graph-highlight", We = "data-ui-graph-read-only", Ge = "data-ui-graph-direction", Ke = "data-ui-graph-node-shape", qe = "data-ui-graph-edit-structure", Je = "data-ui-graph-mode", Ye = "data-ui-graph-min-zoom", Xe = "data-ui-graph-max-zoom", Ze = class {
	root;
	constructor(e) {
		this.root = e;
	}
	get readOnly() {
		return this.root.hasAttribute(We);
	}
	get edgeShape() {
		let e = this.root.getAttribute(Ve);
		return e === "straight" || e === "bezier" ? e : "orthogonal";
	}
	get snapping() {
		return this.root.hasAttribute(He);
	}
	get highlightOnHover() {
		return this.root.hasAttribute(Ue);
	}
	get gridSize() {
		return Number(getComputedStyle(this.root).getPropertyValue("--ui-graph-grid-size")) || 20;
	}
	get minZoom() {
		return Number(this.root.getAttribute(Ye)) || .25;
	}
	get maxZoom() {
		return Number(this.root.getAttribute(Xe)) || 2.5;
	}
}, Qe = "data-ui-graph-side", $e = "data-ui-collapsed", et = class {
	root;
	settings;
	store;
	host;
	viewport;
	scene;
	zoomLabel;
	minimap;
	minimapNodes;
	minimapView;
	minimapContent = null;
	minimapPlace = null;
	zoomValue = 1;
	panXValue = 0;
	panYValue = 0;
	constructor(e, t, n, r) {
		this.root = e, this.settings = t, this.store = n, this.host = r, this.viewport = e.querySelector(".ui-graph__viewport"), this.scene = e.querySelector(".ui-graph__scene"), this.zoomLabel = e.querySelector("[data-ui-graph-zoom]"), this.minimap = e.querySelector("[data-ui-graph-map]"), this.minimapNodes = e.querySelector("[data-ui-graph-map-nodes]"), this.minimapView = e.querySelector("[data-ui-graph-map-view]");
	}
	get zoom() {
		return this.zoomValue;
	}
	get panX() {
		return this.panXValue;
	}
	get panY() {
		return this.panYValue;
	}
	get viewportElement() {
		return this.viewport;
	}
	restoreView() {
		let e = this.store.readJson(this.root, "view");
		e !== null && (this.zoomValue = Math.min(this.settings.maxZoom, Math.max(this.settings.minZoom, Number(e.zoom) || 1)), this.panXValue = Number(e.panX) || 0, this.panYValue = Number(e.panY) || 0);
	}
	applyView() {
		this.scene.style.transform = `translate(${this.panXValue}px, ${this.panYValue}px) scale(${this.zoomValue})`, this.root.style.setProperty("--ui-graph-zoom", String(this.zoomValue)), this.root.style.setProperty("--ui-graph-pan-x", `${this.panXValue}px`), this.root.style.setProperty("--ui-graph-pan-y", `${this.panYValue}px`), this.zoomLabel !== null && (this.zoomLabel.textContent = `${Math.round(this.zoomValue * 100)}%`), this.placeMinimapView(), this.store.write(this.root, "view", JSON.stringify({
			zoom: this.zoomValue,
			panX: this.panXValue,
			panY: this.panYValue
		}), {
			selector: e,
			styles: {
				"--ui-graph-zoom": String(this.zoomValue),
				"--ui-graph-pan-x": `${this.panXValue}px`,
				"--ui-graph-pan-y": `${this.panYValue}px`
			}
		});
	}
	fit() {
		let e = this.contentBounds(!0);
		if (e === null) return;
		let t = de(e, this.viewport.clientWidth - this.sideWidth(), this.viewport.clientHeight, this.settings.minZoom, this.settings.maxZoom);
		this.zoomValue = t.zoom, this.panXValue = t.panX, this.panYValue = t.panY, this.applyView();
	}
	sideWidth() {
		let e = this.viewport.querySelector(`[${Qe}]:not([${$e}])`);
		return e === null || e.offsetWidth === 0 ? 0 : this.viewport.clientWidth - e.offsetLeft;
	}
	zoomBy(e, t, n) {
		let r = Math.min(this.settings.maxZoom, Math.max(this.settings.minZoom, this.zoomValue * e));
		if (r === this.zoomValue) return;
		let i = this.toScene(t, n);
		this.zoomValue = r, this.panXValue = t - i.x * r, this.panYValue = n - i.y * r, this.applyView();
	}
	toScene(e, t) {
		return {
			x: (e - this.panXValue) / this.zoomValue,
			y: (t - this.panYValue) / this.zoomValue
		};
	}
	toViewport(e) {
		let t = this.viewport.getBoundingClientRect();
		return {
			x: e.clientX - t.left,
			y: e.clientY - t.top
		};
	}
	dragPan(e, t, n) {
		this.panXValue = e.x + t, this.panYValue = e.y + n, this.applyView();
	}
	centerOnRect(e, t, n) {
		this.panXValue = (this.viewport.clientWidth - this.sideWidth()) / 2 - (e.x + e.width / 2) * this.zoomValue, this.panYValue = t + (this.viewport.clientHeight - t - n) / 2 - (e.y + e.height / 2) * this.zoomValue, this.applyView(), this.viewport.focus({ preventScroll: !0 });
	}
	contentBounds(e = !1) {
		let t = [];
		for (let n of this.host.items()) {
			let r = e ? this.host.nodeExtent(n.id) : this.host.nodeRect(n.id);
			r !== null && t.push(r);
		}
		for (let e of this.host.groups()) t.push({
			x: e.x,
			y: e.y,
			width: e.width,
			height: e.height
		});
		return ce(t);
	}
	drawMinimap() {
		if (this.minimap === null || this.minimapNodes === null) return;
		if (this.minimapContent = this.contentBounds(), this.minimapNodes.replaceChildren(), this.minimap.hidden = this.minimapContent === null, this.minimapContent === null) {
			this.minimapPlace = null;
			return;
		}
		let e = this.minimapPlacement(this.minimapContent);
		if (this.minimapPlace = e, !(e.scale > 0)) {
			this.minimap.hidden = !0;
			return;
		}
		for (let t of this.host.items()) {
			let n = this.host.nodeRect(t.id);
			if (n === null) continue;
			let r = document.createElement("i"), i = this.host.itemColor(t);
			r.className = "ui-graph__minimap-node", r.style.left = `${e.offsetX + (n.x - this.minimapContent.x) * e.scale}px`, r.style.top = `${e.offsetY + (n.y - this.minimapContent.y) * e.scale}px`, r.style.width = `${Math.max(2, n.width * e.scale)}px`, r.style.height = `${Math.max(2, n.height * e.scale)}px`, i.length > 0 && (r.style.background = i), this.minimapNodes.append(r);
		}
		this.placeMinimapView();
	}
	minimapPlacement(e) {
		let t = this.minimap?.clientWidth ?? 0, n = this.minimap?.clientHeight ?? 0, r = Math.min(t / Math.max(1, e.width), n / Math.max(1, e.height));
		return {
			scale: r,
			offsetX: (t - e.width * r) / 2,
			offsetY: (n - e.height * r) / 2
		};
	}
	placeMinimapView() {
		let e = this.minimapPlace;
		if (this.minimapView === null || this.minimapContent === null || e === null) return;
		let t = {
			x: -this.panXValue / this.zoomValue,
			y: -this.panYValue / this.zoomValue,
			width: this.viewport.clientWidth / this.zoomValue,
			height: this.viewport.clientHeight / this.zoomValue
		};
		this.minimapView.style.left = `${e.offsetX + (t.x - this.minimapContent.x) * e.scale}px`, this.minimapView.style.top = `${e.offsetY + (t.y - this.minimapContent.y) * e.scale}px`, this.minimapView.style.width = `${t.width * e.scale}px`, this.minimapView.style.height = `${t.height * e.scale}px`;
	}
	minimapPan(e) {
		let t = this.minimapPlace;
		if (this.minimap === null || this.minimapContent === null || t === null) return;
		let n = this.minimap.getBoundingClientRect(), r = this.minimapContent.x + (e.clientX - n.left - t.offsetX) / t.scale, i = this.minimapContent.y + (e.clientY - n.top - t.offsetY) / t.scale;
		this.panXValue = this.viewport.clientWidth / 2 - r * this.zoomValue, this.panYValue = this.viewport.clientHeight / 2 - i * this.zoomValue, this.applyView();
	}
}, tt = "data-ui-graph-minimap", nt = "graph-document", rt = "graph.save-document", it = class {
	context;
	kinds = /* @__PURE__ */ new Map();
	canvases = /* @__PURE__ */ new WeakMap();
	live = /* @__PURE__ */ new Set();
	constructor(t, n) {
		this.context = t;
		for (let e of n) this.kinds.set(e.name, e);
		this.attach(t.root.querySelectorAll(e)), t.observeComponents(t.root, e, { childList: !0 }, (e) => this.attach(e)), t.observeComponents(t.root, "*", { childList: !0 }, () => this.prune()), t.observeComponents(t.root, e, { attributeFilter: [
			Ve,
			He,
			We,
			tt,
			Ge,
			Ke,
			qe,
			Je
		] }, (e) => {
			for (let t of e) this.canvases.get(t)?.draw();
		}), t.propertyPatchEngine.addValueChangeHandler((e) => {
			if (!(e.local || e.propertyName !== "Value")) for (let t of e.components) this.canvases.get(t)?.load(e.value);
		});
	}
	attach(e) {
		this.prune();
		for (let t of e) {
			let e = this.kinds.get(t.getAttribute("data-ui-graph-kind") ?? "");
			if (e !== void 0 && !this.canvases.has(t)) {
				let n = new ot(t, this.context, e);
				this.canvases.set(t, n), this.live.add(n);
			}
		}
	}
	prune() {
		for (let e of this.live) e.connected || (this.live.delete(e), e.dispose());
	}
	kindOf(e, t) {
		let n = this.canvases.get(e)?.kind;
		return n instanceof t ? n : null;
	}
	saveCompleted(e, t) {
		this.canvases.get(e)?.documentState.saveCompleted(t);
	}
	requestSave(e, t) {
		this.canvases.get(e)?.documentState.requestSave(t);
	}
};
function at(e, t) {
	let n = t.target;
	if (n?.id === void 0) return null;
	let r = typeof n.id == "number" ? n.id : Number(n.id.value);
	return Number.isNaN(r) ? null : e.dom.findComponent(r, n.dynamicParameters ?? []);
}
var ot = class {
	root;
	viewport;
	groupLayer;
	nodeElements = /* @__PURE__ */ new Map();
	settings;
	documentState;
	definition;
	selection;
	view;
	dragging;
	menus;
	render;
	kind;
	drag = null;
	pointerX = 0;
	pointerY = 0;
	constructor(e, t, n) {
		this.root = e, this.definition = n, this.viewport = e.querySelector(".ui-graph__viewport"), this.groupLayer = e.querySelector(".ui-graph__groups");
		let r = e.querySelector(".ui-graph__scene"), i = e.querySelector(".ui-graph__nodes"), a = e.querySelector(".ui-graph__edges"), o = e.querySelector(".ui-graph__value"), s = {
			nodeElements: this.nodeElements,
			kind: () => this.kind,
			items: () => this.kind.items(),
			groups: () => this.documentState.document.groups,
			itemColor: (e) => this.kind.itemColor(e),
			nodeRect: (e) => this.render.nodeRect(e),
			nodeExtent: (e) => this.render.nodeExtent(e),
			snapPlace: (e, t) => this.dragging.snapPlace(e, t),
			drawEdges: () => this.render.drawEdges(),
			drawGroups: () => this.render.drawGroups(),
			drawMinimap: () => this.view.drawMinimap(),
			deleteSelection: () => this.deleteSelection()
		};
		this.settings = new Ze(e), this.documentState = new g(e, o, this.settings, (e) => n.readDocument(e), {
			clearSelectionSets: () => this.selection.clearSets(),
			redraw: () => this.render.draw(),
			redrawEdges: () => this.render.drawEdges()
		}, t.values), this.selection = new pe(e, this.nodeElements, this.groupLayer, s), this.view = new et(e, this.settings, t.store, s), this.dragging = new me(this.selection, s, this.settings), this.menus = new je(e, t, this.documentState, this.selection, this.view, this.settings, s, this.groupLayer), this.render = new ze(t, r, i, this.groupLayer, a, this.nodeElements, this.documentState, this.selection, this.settings, this.view, () => this.kind), this.kind = n.create({
			root: e,
			context: t,
			scene: r,
			nodeLayer: i,
			settings: this.settings,
			documentState: this.documentState,
			selection: this.selection,
			view: this.view,
			nodeElements: this.nodeElements,
			draw: () => this.render.draw(),
			drawEdges: () => this.render.drawEdges(),
			drawPending: (e, t, n) => this.render.drawPending(e, t, n),
			clearPending: () => this.render.clearPending(),
			nodeRect: (e) => this.render.nodeRect(e),
			nodeExtent: (e) => this.render.nodeExtent(e),
			centerOf: (e) => this.render.centerOf(e),
			pointerScene: () => ({
				x: this.pointerX,
				y: this.pointerY
			}),
			snapPlace: (e, t) => this.settings.snapping ? this.dragging.snapPlace(e, t) : t,
			renameItem: (e) => this.menus.renameNode(e)
		}), this.view.restoreView(), this.listen(), this.render.draw();
	}
	draw() {
		this.render.draw();
	}
	get connected() {
		return this.root.isConnected;
	}
	dispose() {
		this.render.dispose();
	}
	load(e) {
		this.documentState.load(this.definition.readDocument(e));
	}
	togglePinned(e) {
		let t = this.kind.items().find((t) => t.id === e);
		t === void 0 || this.settings.readOnly || (t.pinned = t.pinned !== !0, this.documentState.edited());
	}
	toggleCollapsed(e) {
		let t = this.kind.items().find((t) => t.id === e);
		t === void 0 || this.settings.readOnly || (t.collapsed = t.collapsed !== !0, this.documentState.edited());
	}
	copy() {
		this.selection.size > 0 && this.kind.copy(this.selection.nodeIds);
	}
	paste() {
		if (this.settings.readOnly) return;
		let e = this.kind.paste();
		e !== null && (this.selection.selectOnlyMany(e), this.documentState.edited());
	}
	deleteSelection() {
		let e = this.selection.nodeIds, t = this.selection.edgeIds;
		if (this.settings.readOnly || e.size === 0 && t.size === 0) return;
		let n = this.documentState.document;
		n.groups = n.groups.filter((t) => !e.has(t.id)), this.kind.remove(e, t), this.selection.clearSets(), this.documentState.edited();
	}
	listen() {
		this.viewport.addEventListener("wheel", (e) => this.wheel(e), { passive: !1 }), this.viewport.addEventListener("pointerdown", (e) => this.pointerDown(e)), this.viewport.addEventListener("pointermove", (e) => this.pointerMove(e)), this.viewport.addEventListener("pointerup", (e) => this.pointerUp(e)), this.viewport.addEventListener("pointercancel", () => this.endDrag()), this.viewport.addEventListener("pointerleave", () => this.render.setFocusItem(null)), this.viewport.addEventListener("dblclick", (e) => this.doubleClick(e)), this.viewport.addEventListener("keydown", (e) => this.key(e)), this.viewport.addEventListener("click", (e) => this.click(e)), this.root.addEventListener("click", (e) => this.chrome(e)), this.root.addEventListener("contextmenu", (e) => this.menus.prepareMenus(e.target));
	}
	wheel(e) {
		if (e.target instanceof Element && (this.isPanel(e.target) || this.kind.isEditor(e.target))) return;
		e.preventDefault();
		let t = this.view.toViewport(e);
		this.view.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, t.x, t.y);
	}
	pointerDown(e) {
		if (e.button === 2) {
			this.menus.prepareMenus(e.target);
			return;
		}
		if (e.button !== 0 || !(e.target instanceof Element) || ct(e.target) || this.kind.isEditor(e.target) || this.isPanel(e.target)) return;
		if (e.target.closest("[data-ui-graph-map]") !== null) {
			this.drag = { kind: "map" }, this.viewport.setPointerCapture(e.pointerId), this.view.minimapPan(e);
			return;
		}
		let t = this.view.toViewport(e), r = this.view.toScene(t.x, t.y);
		this.pointerX = r.x, this.pointerY = r.y, e.preventDefault(), this.viewport.focus({ preventScroll: !0 });
		let i = e.target.closest(`[${s}]`);
		if (i !== null) {
			this.togglePinned(i.closest(`[${o}]`)?.getAttribute(o));
			return;
		}
		let l = e.target.closest(`[${c}]`);
		if (l !== null) {
			this.toggleCollapsed(l.closest(`[${o}]`)?.getAttribute(o));
			return;
		}
		let u = this.kind.pointerDown(e, e.target);
		if (u !== !1) {
			u !== !0 && (this.drag = u, this.viewport.setPointerCapture(e.pointerId));
			return;
		}
		let d = e.target.closest(`[${a}]`);
		if (d !== null && !this.settings.readOnly) {
			this.drag = {
				kind: "reroute",
				edge: d.getAttribute(a),
				index: Number(d.getAttribute("data-ui-graph-reroute-index"))
			}, this.viewport.setPointerCapture(e.pointerId);
			return;
		}
		let f = e.target.closest(`[${o}]`);
		if (f !== null) {
			e.target.closest("[data-ui-graph-resize]") !== null && !this.settings.readOnly ? (this.drag = this.dragging.beginResize(f, r), this.viewport.setPointerCapture(e.pointerId)) : (this.drag = this.dragging.beginNodeDrag(e, f.getAttribute(o), r), this.drag !== null && this.viewport.setPointerCapture(e.pointerId));
			return;
		}
		let p = e.target.closest(`[${n}]`);
		if (p !== null && e.target.closest(".ui-graph__group-band") !== null) {
			this.drag = this.dragging.beginGroupDrag(e, p.getAttribute(n), r), this.drag !== null && this.viewport.setPointerCapture(e.pointerId);
			return;
		}
		this.render.setFocusItem(null), C(e) ? (this.drag = {
			kind: "marquee",
			startX: r.x,
			startY: r.y
		}, this.selection.beginMarquee()) : (this.selection.clearSelection(), this.drag = {
			kind: "pan",
			startX: t.x,
			startY: t.y,
			panX: this.view.panX,
			panY: this.view.panY
		}), this.viewport.setPointerCapture(e.pointerId);
	}
	pointerMove(e) {
		let t = this.drag;
		if (t === null) {
			this.hover(e);
			return;
		}
		let n = this.view.toViewport(e), r = this.view.toScene(n.x, n.y);
		switch (this.pointerX = r.x, this.pointerY = r.y, t.kind) {
			case "map":
				this.view.minimapPan(e);
				break;
			case "pan":
				this.view.dragPan({
					x: t.panX,
					y: t.panY
				}, n.x - t.startX, n.y - t.startY);
				break;
			case "nodes":
				this.dragging.moveNodes(t.moving, r.x - t.startX, r.y - t.startY);
				break;
			case "group":
				this.dragging.moveGroup(t, r);
				break;
			case "marquee":
				this.selection.drawMarquee(t.startX, t.startY, r.x, r.y);
				break;
			case "resize":
				this.dragging.resizeNode(t.nodeId, t.width + (r.x - t.startX), t.height + (r.y - t.startY));
				break;
			case "reroute":
				this.updateReroute(t, r);
				break;
			case "kind": t.move(r, e);
		}
	}
	hover(e) {
		let t = this.settings.highlightOnHover && e.target instanceof Element ? e.target.closest(`[${o}]`) : null;
		this.render.setFocusItem(t?.getAttribute("data-ui-graph-node") ?? null);
	}
	pointerUp(e) {
		let t = this.drag;
		t !== null && (t.kind === "kind" && t.finish(e), this.endDrag(), (t.kind === "nodes" || t.kind === "group" || t.kind === "reroute" || t.kind === "resize") && (this.settleDrag(t), this.documentState.edited(!1)));
	}
	settleDrag(e) {
		if (this.settings.snapping) {
			switch (e.kind) {
				case "nodes":
					this.dragging.snapNodes(e.moving.keys());
					break;
				case "group":
					this.dragging.settleGroup(e);
					break;
				case "reroute":
					this.settleReroute(e);
					break;
				case "resize":
					this.dragging.snapSize(e.nodeId), this.view.drawMinimap();
					break;
				default: return;
			}
			this.render.drawEdges();
		}
	}
	endDrag() {
		let e = this.drag;
		this.drag = null, e?.kind === "kind" && e.end(), this.selection.hideMarquee(), this.render.clearPending();
	}
	updateReroute(e, t) {
		let n = this.kind.edges().find((t) => t.id === e.edge);
		n !== void 0 && n.points[e.index] !== void 0 && (n.points[e.index] = {
			x: t.x,
			y: t.y
		}, this.render.drawEdges());
	}
	settleReroute(e) {
		let t = this.kind.edges().find((t) => t.id === e.edge)?.points[e.index];
		t !== void 0 && (t.x = S(t.x, this.settings.gridSize, !0), t.y = S(t.y, this.settings.gridSize, !0));
	}
	addReroute(e, t) {
		let n = this.kind.edges().find((t) => t.id === e), r = n === void 0 ? null : this.kind.edgeEnds(n);
		if (n === void 0 || r === null) return;
		let i = [
			r.from,
			...n.points,
			r.to
		], a = 0, o = Infinity;
		for (let e = 1; e < i.length; e++) {
			let n = fe(t, i[e - 1], i[e]);
			n < o && (o = n, a = e - 1);
		}
		n.points.splice(a, 0, {
			x: S(t.x, this.settings.gridSize, this.settings.snapping),
			y: S(t.y, this.settings.gridSize, this.settings.snapping)
		}), this.documentState.edited(!1);
	}
	click(e) {
		if (!(e.target instanceof Element)) return;
		let t = e.target.closest(`[${i}]`);
		if (t !== null) {
			this.selection.toggleEdge(t.getAttribute(i), C(e)), this.render.drawEdges();
			return;
		}
		let n = e.target.closest(`[${o}]`);
		n !== null && !ct(e.target) && !this.kind.isEditor(e.target) && this.raiseNodeClick(n.getAttribute(o));
	}
	raiseNodeClick(e) {
		this.root.dispatchEvent(new CustomEvent("node-click", {
			bubbles: !0,
			detail: { nodeId: e }
		}));
	}
	doubleClick(e) {
		if (this.settings.readOnly || !(e.target instanceof Element)) return;
		let t = e.target.closest(`[${i}]`);
		if (t !== null) {
			let n = this.view.toViewport(e);
			this.addReroute(t.getAttribute(i), this.view.toScene(n.x, n.y));
			return;
		}
		this.isPanel(e.target) || e.target.closest("[data-ui-graph-node], [data-ui-graph-group], .ui-graph__corner") !== null || this.kind.backgroundDoubleClick();
	}
	key(e) {
		if (e.defaultPrevented || e.isComposing) return;
		let t = e.target instanceof Element && (e.target.closest("input, textarea, select") !== null || this.kind.isEditor(e.target)), n = e.ctrlKey || e.metaKey;
		if (n && !e.altKey && !e.shiftKey && e.code === "KeyS") {
			e.preventDefault(), this.documentState.save();
			return;
		}
		t || (e.key === "Delete" || e.key === "Backspace" ? (e.preventDefault(), this.deleteSelection()) : n && e.code === "KeyC" ? (e.preventDefault(), this.copy()) : n && e.code === "KeyV" ? (e.preventDefault(), this.paste()) : n && e.code === "KeyZ" && !e.shiftKey ? (e.preventDefault(), this.replay(this.documentState.undo())) : n && (e.code === "KeyY" || e.code === "KeyZ" && e.shiftKey) ? (e.preventDefault(), this.replay(this.documentState.redo())) : n && e.code === "KeyA" ? (e.preventDefault(), this.selection.selectAll(this.kind.items().map((e) => e.id))) : e.key === "Escape" && (this.kind.escape(), this.selection.clearSelection()));
	}
	isPanel(e) {
		return st(e) || this.kind.isPanel(e);
	}
	replay(e) {
		e !== null && this.documentState.replay(e);
	}
	chrome(e) {
		if (!(e.target instanceof Element)) return;
		if (this.menus.panelToggleOf(e.target) !== null) {
			this.menus.syncMenus();
			return;
		}
		if (this.kind.chrome(e.target)) return;
		if (e.target.closest("[data-ui-graph-zoom-in]") !== null) {
			this.view.zoomBy(1.2, this.viewport.clientWidth / 2, this.viewport.clientHeight / 2);
			return;
		}
		if (e.target.closest("[data-ui-graph-zoom-out]") !== null) {
			this.view.zoomBy(1 / 1.2, this.viewport.clientWidth / 2, this.viewport.clientHeight / 2);
			return;
		}
		if (e.target.closest("[data-ui-graph-fit]") !== null) {
			this.view.fit();
			return;
		}
		let t = e.target.closest("[data-ui-key]"), n = t?.getAttribute("data-ui-key") ?? "", r = e.target.closest(`[${Se}]`);
		if (r !== null && t !== null && this.menus.foldPanel(), n.length === 0 || r === null && e.target.closest("[data-ui-context-menu]") === null) return;
		let i = r?.getAttribute("data-ui-graph-menu-panel") ?? t.closest("[data-ui-context-menu]")?.getAttribute("data-ui-context-menu") ?? "";
		n.startsWith("graph:") ? this.menus.run(n, i) : this.menus.raiseEntry(n, i);
	}
};
function st(e) {
	return e.closest(`[${Se}]`) !== null;
}
function ct(e) {
	let t = e.closest("input, textarea, select, button");
	return t !== null && !t.matches("[data-ui-graph-pin-toggle], [data-ui-graph-fold]");
}
//#endregion
//#region src/framework-api.ts
function lt() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.Graph needs the framework's client (ui.js) on the page before it.");
	return e;
}
//#endregion
//#region src/graph/chain.ts
function ut(e, t) {
	let n = /* @__PURE__ */ new Set([t]), r = /* @__PURE__ */ new Set();
	return dt(e, t, !0, n, r), dt(e, t, !1, n, r), {
		items: [...n],
		edges: [...r]
	};
}
function dt(e, t, n, r, i) {
	let a = /* @__PURE__ */ new Map();
	for (let t of e) {
		let e = n ? t.to : t.from, r = a.get(e);
		r === void 0 ? a.set(e, [t]) : r.push(t);
	}
	let o = /* @__PURE__ */ new Set([t]), s = [t];
	for (let e = 0; e < s.length; e++) for (let t of a.get(s[e]) ?? []) {
		let e = n ? t.from : t.to;
		i.add(t.id), r.add(e), o.has(e) || (o.add(e), s.push(e));
	}
}
//#endregion
//#region src/canvas/aim.ts
var ft = /* @__PURE__ */ new WeakMap();
function pt(e, t, n) {
	let r = ft.get(e) ?? null;
	r !== t && (r !== null && n(r, !1), t !== null && n(t, !0), ft.set(e, t));
}
//#endregion
//#region src/graph/link-drag.ts
var j = "data-ui-graph-handle", mt = "data-ui-graph-entry", ht = "data-ui-graph-link-source", M = "data-ui-graph-drop", gt = "ui-graph--connecting";
function _t(e, t, n) {
	let r = t.closest(`[${o}]`), i = r?.getAttribute("data-ui-graph-node") ?? null;
	if (r === null || i === null) return null;
	let a = e.root, s = null;
	a.classList.add(gt), r.setAttribute(ht, "");
	for (let t of e.nodeLayer.querySelectorAll(`[${o}]`)) {
		let e = t.getAttribute(o);
		e !== i && !n.canLink(i, e) && t.setAttribute(M, "no");
	}
	let c = () => e.nodeLayer.querySelector(`[${o}="${CSS.escape(i)}"]`), l = () => c()?.querySelector("[data-ui-graph-handle]") ?? t;
	return {
		kind: "kind",
		move: (t, r) => {
			s = vt(e, i, r, n);
			let a = s?.querySelector("[data-ui-graph-entry]") ?? null;
			e.drawPending(e.centerOf(l()), a === null ? t : e.centerOf(a), "var(--ui-color-primary)");
		},
		finish: (e) => {
			let t = s?.getAttribute("data-ui-graph-node") ?? null;
			t !== null && n.link(i, t, e);
		},
		end: () => {
			a.classList.remove(gt), r.removeAttribute(ht), c()?.removeAttribute(ht);
			for (let t of e.nodeLayer.querySelectorAll(`[${M}]`)) t.removeAttribute(M);
		}
	};
}
function vt(e, t, n, r) {
	let i = document.elementFromPoint(n.clientX, n.clientY)?.closest("[data-ui-graph-node]") ?? null, a = i?.getAttribute("data-ui-graph-node") ?? null, o = i !== null && a !== null && a !== t && e.nodeLayer.contains(i) && r.canLink(t, a) ? i : null;
	return pt(e.nodeLayer, o, (e, t) => {
		t ? e.setAttribute(M, "yes") : e.removeAttribute(M);
	}), o;
}
function yt(e, t) {
	let n = e.root.querySelector(`.ui-graph__edge[data-ui-graph-edge="${CSS.escape(t)}"]`);
	return n === null ? null : n.getPointAtLength(n.getTotalLength() / 2);
}
function N(e, t, n, r) {
	if (e.settings.readOnly) return;
	let i = document.createElement("div"), a = document.createElement("span");
	i.className = "ui-graph__caption-edit", a.className = "ui-graph__caption-edit-text", i.style.left = `${t.x}px`, i.style.top = `${t.y}px`, a.textContent = n, i.append(a), e.scene.append(i), e.context.renames.open({
		container: i,
		title: a,
		className: "ui-graph__caption-field",
		value: n,
		allowEmpty: !0,
		commit: r,
		done: () => {
			i.remove(), e.view.viewportElement.focus({ preventScroll: !0 });
		}
	});
}
//#endregion
//#region src/graph/card-view.ts
var bt = l.slice(1);
function xt(e, t, n) {
	let r = document.createElement("div"), i = (t.shape ?? n.shape) === "icon", a = t.title ?? t.id;
	r.className = i ? "ui-graph__node ui-graph__bubble" : "ui-graph__node ui-graph__card", r.setAttribute(o, t.id), r.style.setProperty("--ui-graph-node-x", String(e.x)), r.style.setProperty("--ui-graph-node-y", String(e.y)), t.color !== null && t.color.length > 0 && r.style.setProperty("--ui-graph-node-color", t.color), n.conflict !== null && r.setAttribute("data-ui-graph-conflict", n.conflict), e.pinned === !0 && r.setAttribute("data-ui-graph-pinned", "");
	let s = St(t, i ? "ui-graph__bubble-face" : "ui-graph__card-icon", n);
	if (s !== null && r.append(s), i ? r.append(wt(a, "ui-graph__bubble-title")) : r.append(Ct(t, a)), t.badge !== null && r.append(Tt(t.badge, i ? "ui-graph__bubble-badge" : "ui-graph__card-badge")), n.connectable) {
		let e = document.createElement("span"), t = document.createElement("span");
		e.className = "ui-graph__handle", e.setAttribute(j, ""), t.className = "ui-graph__entry", t.setAttribute(mt, ""), r.append(t, e);
	}
	let c = t.tooltip ?? (i ? a : null);
	return c !== null && (r.addEventListener("pointerenter", () => n.tooltips.show(r, c)), r.addEventListener("pointerleave", () => n.tooltips.hide())), r;
}
function St(e, t, n) {
	let r = t === "ui-graph__bubble-face";
	if (e.image === null && e.icon === null && !r) return null;
	let i = document.createElement("span");
	if (i.className = t, i.setAttribute("aria-hidden", "true"), e.image !== null) {
		let t = document.createElement("img");
		t.src = e.image, t.alt = "", t.draggable = !1, i.setAttribute("data-ui-graph-picture", ""), i.append(t);
	} else if (e.icon !== null) {
		let t = document.createElement("span");
		n.icons.apply(t, e.icon), i.append(t);
	}
	return i;
}
function Ct(e, t) {
	let n = document.createElement("div");
	if (n.className = "ui-graph__card-text", n.append(wt(t, null)), e.subtitle !== null) {
		let t = document.createElement("span");
		t.className = "ui-graph__card-subtitle", t.textContent = e.subtitle, n.append(t);
	}
	return n;
}
function wt(e, t) {
	let n = document.createElement("span");
	return n.className = t === null ? bt : `${bt} ${t}`, n.textContent = e, n;
}
function Tt(e, t) {
	let n = document.createElement("span"), r = document.createElement("span");
	return n.className = `ui-badge ui-badge-style--surface ${t}`, n.setAttribute("data-ui-badge-text", ""), r.className = "ui-badge__text", r.textContent = e, n.append(r), n;
}
//#endregion
//#region src/graph/draft.ts
function Et(e, t, n, r) {
	let i = new Set(n), a = new Map(t.map((e) => [e.id, e])), o = /* @__PURE__ */ new Set(), s = [];
	for (let t of e) {
		if (i.has(t.id)) continue;
		let e = a.get(t.id);
		s.push(e === void 0 ? t : r(e)), o.add(t.id);
	}
	for (let e of t) !o.has(e.id) && !i.has(e.id) && s.push(r(e));
	return s;
}
function Dt(e, t) {
	let n = new Map(e.map((e) => [e.id, e])), r = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = n.get(e.id);
		e.created ? t !== void 0 && r.set(e.id, "changed") : t === void 0 ? r.set(e.id, "removed") : e.baseline !== null && e.baseline !== JSON.stringify(t) && r.set(e.id, "changed");
	}
	return r;
}
function Ot(e, t, n, r) {
	let i = e.findIndex((e) => e.id === t);
	if (i < 0) return !1;
	if (r) {
		let t = e[i];
		t.created = n === void 0, t.baseline = n === void 0 ? null : JSON.stringify(n);
	} else e.splice(i, 1);
	return !0;
}
function kt(e, t) {
	let n = 1;
	for (; t.has(`${e}-${n}`);) n++;
	return `${e}-${n}`;
}
//#endregion
//#region src/graph/model.ts
function At() {
	return {
		nodes: [],
		edges: [],
		groups: [],
		draft: {
			nodes: [],
			removed: []
		}
	};
}
function jt(e) {
	let t = e;
	if (typeof t != "object" || !t) return At();
	let n = t.draft;
	return {
		nodes: (t.nodes ?? []).map((e) => ({
			id: String(e.id),
			x: Number(e.x) || 0,
			y: Number(e.y) || 0,
			pinned: e.pinned === !0
		})),
		edges: (t.edges ?? []).map((e) => ({
			id: String(e.id),
			points: p(e.points)
		})),
		groups: (t.groups ?? []).map(m),
		draft: {
			nodes: (n?.nodes ?? []).flatMap((e) => {
				let t = It(e);
				return t === null ? [] : [{
					...Mt(t),
					created: e.created === !0,
					baseline: typeof e.baseline == "string" ? e.baseline : null
				}];
			}),
			removed: (n?.removed ?? []).map((e) => String(e))
		}
	};
}
function Mt(e) {
	return {
		id: e.id,
		title: e.title,
		subtitle: e.subtitle,
		icon: e.icon,
		image: e.image,
		shape: e.shape === "icon" ? "Icon" : e.shape === "card" ? "Card" : null,
		color: e.color,
		badge: e.badge,
		tooltip: e.tooltip,
		links: e.links.map((e) => ({ ...e })),
		created: !1,
		baseline: null
	};
}
function Nt(e) {
	return It(e);
}
function Pt(e, t) {
	return Et(e, t.nodes, t.removed, Nt);
}
function Ft(e, t) {
	return Dt(e, t.nodes);
}
function It(e) {
	if (typeof e != "object" || !e) return null;
	let t = e, n = t.id;
	if (typeof n != "string" || n.length === 0) return null;
	let r = Array.isArray(t.links) ? t.links : [];
	return {
		id: n,
		title: P(t.title),
		subtitle: P(t.subtitle),
		icon: P(t.icon),
		image: P(t.image),
		shape: Lt(t.shape),
		color: P(t.color),
		badge: P(t.badge),
		tooltip: P(t.tooltip),
		links: r.flatMap((e) => {
			let t = e;
			return typeof t == "object" && t && typeof t.id == "string" && typeof t.to == "string" ? [{
				id: t.id,
				to: t.to,
				caption: P(t.caption)
			}] : [];
		})
	};
}
function Lt(e) {
	return e === "Icon" || e === "icon" || e === 1 ? "icon" : e === "Card" || e === "card" || e === 0 ? "card" : null;
}
function P(e) {
	return typeof e == "string" && e.length > 0 ? e : null;
}
function Rt(e) {
	let t = new Set(e.map((e) => e.id));
	return e.flatMap((e) => e.links.filter((e) => t.has(e.to)).map((t) => ({
		...t,
		from: e.id
	})));
}
//#endregion
//#region src/graph/graph-editing.ts
var zt = class {
	services;
	host;
	constructor(e, t) {
		this.services = e, this.host = t;
	}
	get document() {
		return this.services.documentState.document;
	}
	draftOf(e) {
		let t = this.document.draft.nodes.find((t) => t.id === e);
		if (t !== void 0) return t;
		let n = this.host.node(e);
		if (n === void 0) return null;
		let r = this.host.serverNode(e), i = {
			...Mt(n),
			baseline: r === void 0 ? null : JSON.stringify(r)
		};
		return this.document.draft.nodes.push(i), i;
	}
	rename(e, t) {
		let n = this.draftOf(e);
		n !== null && (n.title = t);
	}
	paint(e, t) {
		let n = this.draftOf(e);
		n !== null && (n.color = t);
	}
	addNode() {
		let e = kt("node", new Set(this.host.nodes().map((e) => e.id))), t = this.services.pointerScene(), n = this.services.context.strings.text("ui.graph.new-node");
		this.document.draft.nodes.push({
			id: e,
			title: n,
			subtitle: null,
			icon: null,
			image: null,
			shape: null,
			color: null,
			badge: null,
			tooltip: null,
			links: [],
			created: !0,
			baseline: null
		}), this.document.nodes.push({
			id: e,
			x: t.x,
			y: t.y,
			pinned: !1
		}), this.services.selection.selectOnly(e), this.services.documentState.edited(), this.services.renameItem(e);
	}
	removeNodes(e) {
		let t = this.document.draft;
		for (let n of e) {
			let e = t.nodes.findIndex((e) => e.id === n), r = e >= 0 && t.nodes[e].created;
			e >= 0 && t.nodes.splice(e, 1), !r && this.host.serverNode(n) !== void 0 && !t.removed.includes(n) && t.removed.push(n);
		}
	}
	removeLinks(e) {
		for (let t of e) {
			let e = this.host.link(t), n = e === void 0 ? null : this.draftOf(e.from);
			n !== null && (n.links = n.links.filter((e) => e.id !== t));
		}
	}
	beginLink(e) {
		return _t(this.services, e, {
			canLink: (e, t) => this.host.node(e)?.links.some((e) => e.to === t) !== !0,
			link: (e, t) => this.link(e, t)
		});
	}
	link(e, t) {
		let n = this.draftOf(e);
		if (n === null || n.links.some((e) => e.to === t)) return;
		let r = new Set(this.host.nodes().flatMap((e) => e.links.map((e) => e.id))), i = `${e}>${t}`, a = 2;
		for (; r.has(i);) i = `${e}>${t}~${a++}`;
		n.links.push({
			id: i,
			to: t,
			caption: null
		}), this.services.documentState.edited();
	}
	editCaption(e) {
		let t = this.host.link(e), n = yt(this.services, e);
		t !== void 0 && n !== null && N(this.services, n, t.caption ?? "", (n) => {
			let r = this.draftOf(t.from);
			r !== null && (r.links = r.links.map((t) => t.id === e ? {
				...t,
				caption: n.length === 0 ? null : n
			} : t), this.services.documentState.edited());
		});
	}
};
//#endregion
//#region src/graph/keyed-list.ts
function Bt(e, t, n) {
	switch (t.action) {
		case "Reset":
			e.length = 0;
			return;
		case "Move":
			for (let n of t.moves) Ht(e, n.key, n.newIndex);
			return;
		default: for (let r of t.items) Vt(e, t.action, r.key ?? r.oldKey, r.oldKey ?? r.key, r.index, r.item, n);
	}
}
function Vt(e, t, n, r, i, a, o) {
	let s = e.findIndex((e) => e.id === (t === "Replace" ? r : n));
	if (t === "Remove") {
		s >= 0 && e.splice(s, 1);
		return;
	}
	let c = o(a);
	c !== null && (s >= 0 ? e[s] = c : i !== null && i >= 0 && i <= e.length ? e.splice(i, 0, c) : e.push(c));
}
function Ht(e, t, n) {
	let r = e.findIndex((e) => e.id === t);
	if (r < 0 || n === null) return;
	let [i] = e.splice(r, 1);
	e.splice(Math.min(n, e.length), 0, i);
}
var Ut = 14, Wt = 14, Gt = 6;
function Kt(e, t = {}) {
	let n = t.spacing ?? Ut, r = t.margin ?? Wt, i = e.filter((e) => Math.abs(e.from.across - e.to.across) > .5 && e.to.along - e.from.along >= 48).sort((e, t) => e.from.along - t.from.along || e.from.across - t.from.across), a = /* @__PURE__ */ new Map();
	for (let e of qt(i)) {
		let t = Yt(Jt(e.legs)), i = Math.max(0, e.high - e.low - r * 2), o = t.length > 1 ? Math.min(n, i / (t.length - 1)) : 0, s = (e.low + e.high) / 2;
		t.forEach((e, n) => {
			for (let r of e.legs) a.set(r.id, s + (n - (t.length - 1) / 2) * o);
		});
	}
	return a;
}
function qt(e) {
	let t = [];
	for (let n of e) {
		let e = t[t.length - 1];
		e !== void 0 && n.from.along < e.high && n.to.along > e.low ? (e.legs.push(n), e.low = Math.max(e.low, n.from.along), e.high = Math.min(e.high, n.to.along)) : t.push({
			legs: [n],
			low: n.from.along,
			high: n.to.along
		});
	}
	return t;
}
function Jt(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) t.set(n.source, [...t.get(n.source) ?? [], n]);
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = (t.get(r.source) ?? []).length > 1 ? `from:${r.source}` : `to:${r.target}`;
		n.set(e, [...n.get(e) ?? [], r]);
	}
	return [...n.values()].map((e) => {
		let t = e.flatMap((e) => [e.from.across, e.to.across]);
		return {
			legs: e,
			min: Math.min(...t),
			max: Math.max(...t),
			mean: e.reduce((e, t) => e + t.from.across, 0) / e.length
		};
	});
}
function Yt(e) {
	let t = [...e].sort((e, t) => e.mean - t.mean || e.min - t.min);
	if (t.length < 2 || t.length > Gt) return t;
	let n = t, r = Xt(t);
	for (let e of Qt(t)) {
		let t = Xt(e);
		t < r && (n = e, r = t);
	}
	return n;
}
function Xt(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) for (let r = n + 1; r < e.length; r++) {
		for (let i of e[n].legs) t += +!!Zt(i.to.across, e[r]);
		for (let i of e[r].legs) t += +!!Zt(i.from.across, e[n]);
	}
	return t;
}
function Zt(e, t) {
	return e > t.min + .5 && e < t.max - .5;
}
function* Qt(e) {
	if (e.length <= 1) {
		yield [...e];
		return;
	}
	for (let t = 0; t < e.length; t++) for (let n of Qt([...e.slice(0, t), ...e.slice(t + 1)])) yield [e[t], ...n];
}
//#endregion
//#region src/graph/layered.ts
var $t = 8, en = 4, tn = 6, nn = 48, rn = 96;
function an(e, t, n) {
	let r = n.direction === "down" || n.direction === "up", i = n.direction === "left" || n.direction === "up", a = n.layerGap ?? fn(e, r), o = n.nodeGap ?? 32, s = /* @__PURE__ */ new Map();
	e.forEach((e, t) => {
		s.has(e.id) || s.set(e.id, {
			id: e.id,
			real: !0,
			depth: r ? e.height : e.width,
			breadth: r ? e.width : e.height,
			input: t,
			layer: 0,
			order: 0,
			center: 0
		});
	});
	let c = /* @__PURE__ */ new Set(), l = t.filter((e) => s.has(e.from) && s.has(e.to));
	for (let e of l) e.from === e.to && c.add(e.id);
	let u = l.filter((e) => e.from !== e.to), d = on([...s.values()], u), f = new Map(d.map((e, t) => [e.id, t])), p = [];
	for (let e of u) f.get(e.from) > f.get(e.to) ? (c.add(e.id), p.push({
		id: e.id,
		from: e.to,
		to: e.from
	})) : p.push({
		id: e.id,
		from: e.from,
		to: e.to
	});
	sn(d, p, s);
	let m = /* @__PURE__ */ new Map(), h = ln(p, s, m), g = un(s, h);
	_n(g, h, o), pn(g, h, o), hn(g, h, o);
	let _ = /* @__PURE__ */ new Map(), v = /* @__PURE__ */ new Map(), ee = /* @__PURE__ */ new Map(), te = n.originX ?? 0, ne = n.originY ?? 0, re = [], y = 0, b = Infinity;
	for (let e of g) for (let t of e) b = Math.min(b, t.center - t.breadth / 2);
	for (let e of g) {
		let t = Math.max(0, ...e.map((e) => e.depth));
		for (let n of e) {
			let e = Number.isFinite(b) ? b : 0;
			re.push({
				id: n.id,
				real: n.real,
				along: n.real ? y : y + t / 2,
				depth: n.real ? n.depth : 0,
				across: n.real ? n.center - n.breadth / 2 - e : n.center - e
			}), n.real && ee.set(n.id, n.layer);
		}
		y += t + a;
	}
	let ie = Math.max(0, y - a);
	for (let e of re) {
		let t = i ? ie - e.along - e.depth : e.along, n = r ? {
			x: te + e.across,
			y: ne + t
		} : {
			x: te + t,
			y: ne + e.across
		};
		e.real ? _.set(e.id, n) : v.set(e.id, n);
	}
	let ae = /* @__PURE__ */ new Map();
	for (let [e, t] of m) c.has(e) || ae.set(e, t.map((e) => v.get(e)));
	return {
		positions: _,
		backEdges: c,
		layers: ee,
		routes: ae
	};
}
function on(e, t) {
	let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
	for (let t of e) n.set(t.id, /* @__PURE__ */ new Set()), r.set(t.id, /* @__PURE__ */ new Set());
	for (let e of t) n.get(e.from).add(e.to), r.get(e.to).add(e.from);
	let i = new Set(e.map((e) => e.id)), a = [], o = [], s = (e) => {
		i.delete(e);
		for (let t of n.get(e)) r.get(t).delete(e);
		for (let t of r.get(e)) n.get(t).delete(e);
	}, c = () => e.filter((e) => i.has(e.id));
	for (; i.size > 0;) {
		let e = !0;
		for (; e;) {
			e = !1;
			for (let t of c()) n.get(t.id).size === 0 && (o.unshift(t), s(t.id), e = !0);
			for (let t of c()) r.get(t.id).size === 0 && (a.push(t), s(t.id), e = !0);
		}
		if (i.size === 0) break;
		let t = null, l = -Infinity;
		for (let e of c()) {
			let i = n.get(e.id).size - r.get(e.id).size;
			i > l && (t = e, l = i);
		}
		a.push(t), s(t.id);
	}
	return [...a, ...o];
}
function sn(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = r.get(e.to);
		t === void 0 ? r.set(e.to, [e.from]) : t.push(e.from);
	}
	for (let t of e) {
		let e = 0;
		for (let i of r.get(t.id) ?? []) e = Math.max(e, n.get(i).layer + 1);
		t.layer = e;
	}
	cn(e, t, n);
}
function cn(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
	for (let e of t) r.set(e.to, (r.get(e.to) ?? 0) + 1), i.set(e.from, [...i.get(e.from) ?? [], e.to]);
	for (let t = e.length - 1; t >= 0; t--) {
		let a = e[t], o = i.get(a.id) ?? [];
		o.length > 0 && o.length >= (r.get(a.id) ?? 0) && (a.layer = Math.max(a.layer, Math.min(...o.map((e) => n.get(e).layer)) - 1));
	}
}
function ln(e, t, n) {
	let r = [], i = 0;
	for (let a of e) {
		let e = t.get(a.from), o = t.get(a.to), s = [], c = e.id;
		for (let n = e.layer + 1; n < o.layer; n++) {
			let a = `virtual:${i++}`;
			for (; t.has(a);) a = `virtual:${i++}`;
			t.set(a, {
				id: a,
				real: !1,
				depth: 0,
				breadth: $t,
				input: e.input,
				layer: n,
				order: 0,
				center: 0
			}), r.push({
				from: c,
				to: a
			}), s.push(a), c = a;
		}
		s.length > 0 && n.set(a.id, s), r.push({
			from: c,
			to: o.id
		});
	}
	return r;
}
function un(e, t) {
	let n = [];
	for (let t of e.values()) {
		for (; n.length <= t.layer;) n.push([]);
		n[t.layer].push(t);
	}
	for (let e of n) e.sort((e, t) => e.input - t.input), e.forEach((e, t) => e.order = t);
	let r = F(t, !0), i = F(t, !1);
	for (let t = 0; t < en; t++) {
		let a = t % 2 == 0;
		for (let t = 1; t < n.length; t++) {
			let o = n[a ? t : n.length - 1 - t];
			dn(o, a ? r : i, e);
		}
	}
	return n;
}
function F(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = t ? r.to : r.from, i = t ? r.from : r.to, a = n.get(e);
		a === void 0 ? n.set(e, [i]) : a.push(i);
	}
	return n;
}
function dn(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	for (let i of e) {
		let e = t.get(i.id) ?? [];
		r.set(i.id, e.length === 0 ? i.order : e.reduce((e, t) => e + n.get(t).order, 0) / e.length);
	}
	e.sort((e, t) => r.get(e.id) - r.get(t.id) || e.order - t.order), e.forEach((e, t) => e.order = t);
}
function fn(e, t) {
	if (e.length === 0) return nn;
	let n = e.map((e) => t ? e.height : e.width).sort((e, t) => e - t), r = n[Math.floor(n.length / 2)];
	return Math.max(nn, Math.min(rn, Math.round(r * .75)));
}
function pn(e, t, n) {
	let r = F(t, !0), i = F(t, !1), a = /* @__PURE__ */ new Map(), o = Infinity, s = -Infinity;
	for (let t of e) for (let e of t) a.set(e.id, e), o = Math.min(o, e.center - e.breadth / 2), s = Math.max(s, e.center + e.breadth / 2);
	for (let t = 0; t < tn; t++) {
		let c = t % 2 == 0;
		for (let t = 1; t < e.length; t++) {
			let l = e[c ? t : e.length - 1 - t], u = c ? r : i, d = l.map((e) => gn((u.get(e.id) ?? []).map((e) => a.get(e)?.center))), f = l.map((e) => e.real ? (u.get(e.id) ?? []).length : Infinity), p = l.map((e, t) => t).sort((e, t) => f[t] - f[e] || e - t);
			for (let e of p) d[e] !== null && mn(l, e, d[e] - l[e].center, f, n, o, s);
		}
	}
}
function mn(e, t, n, r, i, a, o) {
	let s = Math.sign(n);
	if (s === 0) return;
	let c = [], l = NaN, u = 0;
	for (let n = t + s; n >= 0 && n < e.length; n += s) {
		let a = e[n], o = e[n - s];
		if (u += Math.max(0, s > 0 ? a.center - a.breadth / 2 - (o.center + o.breadth / 2) - i : o.center - o.breadth / 2 - (a.center + a.breadth / 2) - i), r[n] >= r[t]) {
			l = u;
			break;
		}
		c.push(n);
	}
	if (Number.isNaN(l)) {
		let t = e[s > 0 ? e.length - 1 : 0];
		l = u + Math.max(0, s > 0 ? o - (t.center + t.breadth / 2) : t.center - t.breadth / 2 - a);
	}
	let d = Math.min(Math.abs(n), l);
	if (d <= 0) return;
	e[t].center += s * d;
	let f = t;
	for (let t of c) {
		let n = s > 0 ? e[f].center + e[f].breadth / 2 + i - (e[t].center - e[t].breadth / 2) : e[t].center + e[t].breadth / 2 + i - (e[f].center - e[f].breadth / 2);
		if (n <= 0) break;
		e[t].center += s * n, f = t;
	}
}
function hn(e, t, n) {
	let r = F(t, !0), i = /* @__PURE__ */ new Map();
	for (let t of e) for (let e of t) i.set(e.id, e);
	for (let t of e) for (let e = 0; e < t.length; e++) {
		let a = t[e], o = a.real ? void 0 : i.get((r.get(a.id) ?? [])[0])?.center;
		if (o === void 0) continue;
		let s = t[e - 1], c = t[e + 1], l = s === void 0 ? -Infinity : s.center + s.breadth / 2 + n + a.breadth / 2, u = c === void 0 ? Infinity : c.center - c.breadth / 2 - n - a.breadth / 2;
		l <= u && (a.center = Math.min(u, Math.max(l, o)));
	}
}
function gn(e) {
	let t = e.filter((e) => e !== void 0).sort((e, t) => e - t);
	if (t.length === 0) return null;
	let n = Math.floor(t.length / 2);
	return t.length % 2 == 1 ? t[n] : (t[n - 1] + t[n]) / 2;
}
function _n(e, t, n) {
	let r = F(t, !0);
	for (let [t, i] of e.entries()) {
		let a = i.map((n) => {
			let i = (t === 0 ? [] : r.get(n.id) ?? []).map((n) => e[t - 1].find((e) => e.id === n)?.center).filter((e) => e !== void 0);
			return i.length === 0 ? null : i.reduce((e, t) => e + t, 0) / i.length;
		}), o = -Infinity;
		i.forEach((e, t) => {
			let r = Math.max(a[t] === null ? o : a[t] - e.breadth / 2, o);
			e.center = (Number.isFinite(r) ? r : 0) + e.breadth / 2, o = e.center + e.breadth / 2 + n;
		});
		let s = i.map((e, t) => a[t] === null ? null : a[t] - e.center).filter((e) => e !== null);
		if (s.length > 0) {
			let e = s.reduce((e, t) => e + t, 0) / s.length;
			for (let t of i) t.center += e;
		}
	}
}
//#endregion
//#region src/graph/layered-sheet.ts
var vn = class {
	services;
	host;
	options;
	backEdges = /* @__PURE__ */ new Set();
	pending = /* @__PURE__ */ new Set();
	placing = !1;
	viewKept;
	placedOnce = !1;
	turned = !1;
	laidAt = /* @__PURE__ */ new Map();
	routes = /* @__PURE__ */ new Map();
	lanes = null;
	laidFor;
	constructor(e, t, n) {
		this.services = e, this.host = t, this.options = n, this.viewKept = e.context.store.readJson(e.root, "view") !== null, this.laidFor = this.layoutFor;
	}
	get direction() {
		let e = this.services.root.getAttribute(Ge);
		return e === "down" || e === "left" || e === "up" ? e : "right";
	}
	get document() {
		return this.services.documentState.document;
	}
	get layoutFor() {
		return `${this.direction}:${this.host.layoutKey()}`;
	}
	structureChanged() {
		this.backEdges = an(this.host.nodeIds().map((e) => ({
			id: e,
			width: 0,
			height: 0
		})), this.host.links(), { direction: this.direction }).backEdges;
	}
	isBack(e) {
		return this.backEdges.has(e);
	}
	items() {
		let e = this.document, t = new Map(e.nodes.map((e) => [e.id, e]));
		return this.host.nodeIds().map((n) => {
			let r = t.get(n);
			return r === void 0 && (r = {
				id: n,
				x: 0,
				y: 0,
				pinned: !1
			}, e.nodes.push(r), t.set(n, r), this.pending.add(n)), r;
		});
	}
	edges() {
		this.lanes = null;
		let e = this.document, t = new Map(e.edges.map((e) => [e.id, e]));
		return this.host.links().map((n) => {
			let r = t.get(n.id);
			return r === void 0 && (r = {
				id: n.id,
				points: []
			}, e.edges.push(r), t.set(n.id, r)), r;
		});
	}
	itemsDrawn() {
		if (this.layoutFor !== this.laidFor) {
			this.laidFor = this.layoutFor, this.turned = !0;
			for (let e of this.host.nodeIds()) this.pending.add(e);
		}
		this.pending.size === 0 || this.placing || (this.placing = !0, queueMicrotask(() => this.placePending()));
	}
	placePending() {
		this.placing = !1;
		let e = this.items();
		if (this.pending.size > 0 && this.pending.size < e.length && e.every((e) => this.pending.has(e.id) || this.standsWhereLaid(e.id))) for (let t of e) this.pending.add(t.id);
		let t = e.filter((e) => this.pending.has(e.id));
		if (t.length === 0) return;
		let n = this.layout(this.measure());
		this.laidAt = n.positions, this.routes = n.routes;
		let r = e.filter((e) => !this.pending.has(e.id)).map((e) => this.services.nodeRect(e.id)).filter((e) => e !== null), i = r.length === 0;
		for (let e of t) {
			let t = n.positions.get(e.id), a = this.services.nodeRect(e.id);
			if (t === void 0 || a === null) continue;
			let o = {
				x: t.x,
				y: t.y,
				width: a.width,
				height: a.height
			};
			for (; !i && r.some((e) => le(o, e));) this.direction === "down" ? o.x += o.width + this.options.nodeGap : o.y += o.height + this.options.nodeGap;
			e.x = o.x, e.y = o.y, r.push(o);
		}
		this.pending.clear(), this.services.draw(), (i || this.turned) && (this.placedOnce || !this.viewKept) && this.services.view.fit(), this.placedOnce = !0, this.turned = !1;
	}
	layout(e) {
		let t = this.host.nodeBox === void 0 ? 0 : Math.max(0, ...e.map((e) => this.services.nodeExtent(e.id)?.width ?? 0)), n = e.map((e) => ({
			id: e.id,
			...this.box(e.width, e.height, t)
		})), r = an(n, this.host.links(), {
			direction: this.direction,
			nodeGap: this.options.nodeGap,
			layerGap: this.options.layerGap
		}), i = /* @__PURE__ */ new Map();
		for (let [t, i] of e.entries()) {
			let e = r.positions.get(i.id);
			e !== void 0 && r.positions.set(i.id, {
				x: e.x + (n[t].width - i.width) / 2,
				y: e.y
			});
		}
		for (let [e, t] of r.positions) {
			let n = this.services.snapPlace(e, t);
			i.set(e, {
				x: n.x - t.x,
				y: n.y - t.y
			}), r.positions.set(e, n);
		}
		for (let e of this.host.links()) {
			let t = i.get(e.from), n = r.routes.get(e.id);
			t !== void 0 && n !== void 0 && r.routes.set(e.id, n.map((e) => ({
				x: e.x + t.x,
				y: e.y + t.y
			})));
		}
		return r;
	}
	measure() {
		return this.host.nodeIds().map((e) => {
			let t = this.services.nodeElements.get(e);
			return {
				id: e,
				width: t?.offsetWidth ?? 0,
				height: t?.offsetHeight ?? 0
			};
		});
	}
	box(e, t, n) {
		return this.host.nodeBox === void 0 ? {
			width: e,
			height: t
		} : this.host.nodeBox(e, t, n);
	}
	arrange(e, t) {
		let n = this.layout(this.host.nodeIds().map((t) => ({
			id: t,
			width: e.get(t)?.width ?? 0,
			height: e.get(t)?.height ?? 0
		}))), r = n.positions;
		if (this.laidAt = new Map(n.positions), this.routes = n.routes, t !== void 0) for (let e of [...r.keys()]) t.has(e) || r.delete(e);
		return r;
	}
	ends(e) {
		let t = this.endsOf(e);
		return t === null || t.back === !0 || this.services.settings.edgeShape !== "orthogonal" ? t : (this.lanes ??= this.assignLanes(), {
			...t,
			turns: [t.from, ...t.via ?? []].map((t, n) => this.lanes.get(`${e.id}#${n}`))
		});
	}
	assignLanes() {
		let e = [];
		for (let t of this.host.links()) {
			let n = this.endsOf(t);
			if (n === null || n.back === !0) continue;
			let r = n.reversed === !0 ? -1 : 1, i = (e) => n.axis === "vertical" ? {
				along: e.y * r,
				across: e.x
			} : {
				along: e.x * r,
				across: e.y
			}, a = [
				n.from,
				...n.via ?? [],
				n.to
			];
			for (let n = 0; n + 1 < a.length; n++) e.push({
				id: `${t.id}#${n}`,
				from: i(a[n]),
				to: i(a[n + 1]),
				source: n === 0 ? t.from : `${t.id}#${n}`,
				target: n + 2 === a.length ? t.to : `${t.id}#${n + 1}`
			});
		}
		let t = Kt(e);
		return this.direction === "left" || this.direction === "up" ? new Map([...t].map(([e, t]) => [e, -t])) : t;
	}
	endsOf(e) {
		let t = this.services.nodeRect(e.from), n = this.services.nodeRect(e.to);
		if (t === null || n === null) return null;
		let r = this.direction, i = r === "down" || r === "up", a = this.backEdges.has(e.id), o = r === "left" || r === "up", s = e.from === e.to, c, l;
		if (!a) c = i ? {
			x: t.x + t.width / 2,
			y: o ? t.y : t.y + t.height
		} : {
			x: o ? t.x : t.x + t.width,
			y: t.y + t.height / 2
		}, l = i ? {
			x: n.x + n.width / 2,
			y: o ? n.y + n.height : n.y
		} : {
			x: o ? n.x + n.width : n.x,
			y: n.y + n.height / 2
		};
		else {
			let e = s ? .7 : .5, r = s ? .3 : .5;
			c = i ? {
				x: t.x,
				y: t.y + t.height * e
			} : {
				x: t.x + t.width * e,
				y: t.y
			}, l = i ? {
				x: n.x,
				y: n.y + n.height * r
			} : {
				x: n.x + n.width * r,
				y: n.y
			};
		}
		return {
			from: c,
			to: l,
			axis: i ? "vertical" : "horizontal",
			back: a,
			via: this.routeOf(e),
			reversed: o
		};
	}
	routeOf(e) {
		let t = this.routes.get(e.id);
		return t !== void 0 && this.standsWhereLaid(e.from) && this.standsWhereLaid(e.to) ? t : void 0;
	}
	standsWhereLaid(e) {
		let t = this.laidAt.get(e), n = this.document.nodes.find((t) => t.id === e);
		return t !== void 0 && n !== void 0 && Math.abs(t.x - n.x) < .5 && Math.abs(t.y - n.y) < .5;
	}
}, yn = "data-ui-graph-nodes", bn = 32, xn = {
	name: "graph",
	readDocument: jt,
	create: (e) => new Sn(e)
}, Sn = class {
	snapsByCenter = !0;
	services;
	editing;
	sheet;
	server;
	serverById = /* @__PURE__ */ new Map();
	serverVersion = 0;
	structureKey = "";
	nodes = [];
	nodeById = /* @__PURE__ */ new Map();
	conflicts = /* @__PURE__ */ new Map();
	links = [];
	linkById = /* @__PURE__ */ new Map();
	constructor(e) {
		let t = d(e.root.getAttribute(yn));
		this.services = e, this.server = Array.isArray(t) ? t.map(It).filter((e) => e !== null) : [], this.editing = new zt(e, {
			nodes: () => this.nodes,
			node: (e) => this.nodeById.get(e),
			serverNode: (e) => this.serverById.get(e),
			link: (e) => this.linkById.get(e)
		}), this.sheet = new vn(e, {
			nodeIds: () => this.nodes.map((e) => e.id),
			links: () => this.links,
			layoutKey: () => this.shape,
			nodeBox: (e, t, n) => this.shape === "icon" ? {
				width: Math.max(e, 96, n),
				height: t + 34
			} : {
				width: e,
				height: t
			}
		}, { nodeGap: bn }), this.refresh();
	}
	get editable() {
		return !this.services.settings.readOnly && this.services.root.hasAttribute("data-ui-graph-edit-structure");
	}
	get document() {
		return this.services.documentState.document;
	}
	get shape() {
		return Lt(this.services.root.getAttribute("data-ui-graph-node-shape")) ?? "card";
	}
	applyChange(e) {
		Bt(this.server, e, It), this.serverVersion++, this.services.draw();
	}
	refresh() {
		let e = this.document.draft, t = `${this.serverVersion}|${this.services.documentState.version}`;
		t !== this.structureKey && (this.structureKey = t, this.serverById = new Map(this.server.map((e) => [e.id, e])), this.nodes = Pt(this.server, e), this.conflicts = Ft(this.server, e), this.nodeById = new Map(this.nodes.map((e) => [e.id, e])), this.links = Rt(this.nodes), this.linkById = new Map(this.links.map((e) => [e.id, e])), this.sheet.structureChanged());
	}
	items() {
		return this.refresh(), this.sheet.items();
	}
	edges() {
		return this.refresh(), this.sheet.edges();
	}
	renderItem(e) {
		let t = this.nodeById.get(e.id) ?? {
			id: e.id,
			title: null,
			subtitle: null,
			icon: null,
			image: null,
			shape: null,
			color: null,
			badge: null,
			tooltip: null,
			links: []
		};
		return xt(e, t, {
			icons: this.services.context.icons,
			tooltips: this.services.context.tooltips,
			shape: this.shape,
			connectable: this.editable,
			conflict: this.conflicts.get(t.id) ?? null
		});
	}
	itemsDrawn() {
		this.sheet.itemsDrawn();
	}
	itemColor(e) {
		return this.nodeById.get(e.id)?.color ?? "";
	}
	edgeEnds(e) {
		let t = this.linkById.get(e.id), n = t === void 0 ? null : this.sheet.ends(t);
		return t === void 0 || n === null ? null : {
			...n,
			arrow: !0,
			label: t.caption
		};
	}
	related(e) {
		return ut(this.links, e);
	}
	edgeColor() {
		return "var(--ui-text-muted)";
	}
	isEditor() {
		return !1;
	}
	isPanel() {
		return !1;
	}
	pointerDown(e, t) {
		let n = t.closest(`[${j}]`);
		return n === null || !this.editable ? !1 : this.editing.beginLink(n) ?? !0;
	}
	chrome() {
		return !1;
	}
	backgroundDoubleClick() {}
	escape() {}
	copy() {}
	paste() {
		return null;
	}
	remove(e, t) {
		this.editable && (this.editing.removeLinks(t), this.editing.removeNodes(e));
	}
	canEditItems() {
		return this.editable;
	}
	renameItem(e, t) {
		return this.editable && this.editing.rename(e, t), !0;
	}
	paintItem(e, t) {
		return this.editable && this.editing.paint(e, t), !0;
	}
	hasEdgeMenu() {
		return !0;
	}
	arrange(e, t) {
		return this.sheet.arrange(e, t);
	}
	runCommand(e, t) {
		if (e === "graph:take-server" || e === "graph:keep-mine") return t?.kind === "node" && !this.services.settings.readOnly && Ot(this.document.draft.nodes, t.id, this.serverById.get(t.id), e === "graph:keep-mine") && this.services.documentState.edited(), !0;
		if (!this.editable) return e === "graph:add-node" || e === "graph:caption" || e === "graph:delete-edge";
		switch (e) {
			case "graph:add-node": return this.editing.addNode(), !0;
			case "graph:caption": return t?.kind === "edge" && this.editing.editCaption(t.id), !0;
			case "graph:delete-edge": return t?.kind === "edge" && (this.editing.removeLinks(/* @__PURE__ */ new Set([t.id])), this.services.documentState.edited()), !0;
			default: return !1;
		}
	}
	syncMenus(e, t) {
		let n = e && this.editable, r = e && t?.kind === "node" && this.conflicts.has(t.id);
		E(this.services.root, "graph:take-server", r), E(this.services.root, "graph:keep-mine", r);
		for (let e of [
			"graph:add-node",
			"graph:caption",
			"graph:delete-edge"
		]) T(this.services.root, e, n);
	}
};
//#endregion
//#region src/nodes/layout.ts
function Cn(e, t) {
	let n = t.fallback ?? {
		width: 220,
		height: 120
	}, r = t.columnGap ?? 80, i = t.rowGap ?? 32, a = e.nodes.filter((e) => e.pinned !== !0 && (t.only === void 0 || t.only.has(e.id))), o = new Set(a.map((e) => e.id));
	if (a.length === 0) return /* @__PURE__ */ new Map();
	let s = wn(e, o), c = /* @__PURE__ */ new Map();
	for (let e of a) {
		let t = s.get(e.id) ?? 0, n = c.get(t);
		n === void 0 ? c.set(t, [e.id]) : n.push(e.id);
	}
	let l = /* @__PURE__ */ new Map(), u = /* @__PURE__ */ new Map(), d = t.originX ?? 0;
	for (let a of [...c.keys()].sort((e, t) => e - t)) {
		let o = c.get(a);
		o.sort((t, n) => (Tn(e, t, u) ?? 2 ** 53 - 1) - (Tn(e, n, u) ?? 2 ** 53 - 1));
		let s = t.originY ?? 0, f = 0;
		for (let e of o) {
			let r = t.sizes.get(e) ?? n;
			l.set(e, {
				x: d,
				y: s
			}), u.set(e, s + r.height / 2), s += r.height + i, f = Math.max(f, r.width);
		}
		d += f + r;
	}
	return l;
}
function wn(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e.edges) {
		if (!t.has(r.toNode) || !t.has(r.fromNode)) continue;
		let e = n.get(r.toNode);
		e === void 0 ? n.set(r.toNode, [r.fromNode]) : e.includes(r.fromNode) || e.push(r.fromNode);
	}
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Set(), a = (e) => {
		let t = r.get(e);
		if (t !== void 0) return t;
		if (i.has(e)) return 0;
		i.add(e);
		let o = 0;
		for (let t of n.get(e) ?? []) o = Math.max(o, a(t) + 1);
		return i.delete(e), r.set(e, o), o;
	};
	for (let e of t) a(e);
	return r;
}
function Tn(e, t, n) {
	let r = 0, i = 0;
	for (let a of e.edges) {
		if (a.toNode !== t) continue;
		let e = n.get(a.fromNode);
		e !== void 0 && (r += e, i++);
	}
	return i === 0 ? void 0 : r / i;
}
function En() {
	return {
		nodes: [],
		edges: [],
		groups: []
	};
}
function Dn(e) {
	let t = e;
	return typeof t != "object" || !t ? En() : {
		nodes: (t.nodes ?? []).map(On),
		edges: (t.edges ?? []).map(kn),
		groups: (t.groups ?? []).map(m)
	};
}
function On(e) {
	return {
		id: String(e.id),
		type: String(e.type),
		x: Number(e.x) || 0,
		y: Number(e.y) || 0,
		title: e.title ?? null,
		color: e.color ?? null,
		pinned: e.pinned === !0,
		collapsed: e.collapsed === !0,
		values: { ...e.values ?? {} },
		width: f(e.width),
		height: f(e.height)
	};
}
function kn(e) {
	return {
		id: String(e.id),
		fromNode: String(e.fromNode),
		fromPin: String(e.fromPin),
		toNode: String(e.toNode),
		toPin: String(e.toPin),
		points: p(e.points)
	};
}
function An(e) {
	return e === "array" || e.startsWith("array:");
}
function jn(e) {
	return e === "text" || e === "image";
}
function Mn(e, t) {
	return e.length === 0 || t.length === 0 ? !1 : e === t || e === "any" || t === "any" || jn(e) && jn(t) ? !0 : An(e) && An(t) && (e === "array" || t === "array");
}
function Nn(e, t, n) {
	let r = {};
	for (let t of e.inputs) t.editor !== "None" && t.defaultValue !== void 0 && t.defaultValue !== null && (r[t.name] = t.defaultValue);
	return {
		id: h("n"),
		type: e.key,
		x: t,
		y: n,
		title: null,
		color: null,
		pinned: !1,
		values: r
	};
}
function Pn(e, t, n) {
	return e.edges.find((e) => e.toNode === t && e.toPin === n);
}
function Fn(e, t, n) {
	return e.edges.filter((e) => e.toNode === t && e.toPin === n);
}
function In(e, t) {
	let n = e.visibleWhen ?? "";
	if (n.length === 0) return !0;
	let r = t[n], i = e.visibleValues ?? [];
	return i.length > 0 ? i.some((e) => e === Ln(r)) : r != null && r !== !1 && Ln(r).length > 0;
}
function Ln(e) {
	return e == null ? "" : String(e);
}
function Rn(e, t, n) {
	return (n ? e?.outputs : e?.inputs)?.find((e) => e.name === t);
}
function zn(e, t, n, r, i = /* @__PURE__ */ new Set()) {
	let a = `${n}:${r}`;
	if (i.has(a)) return "any";
	i.add(a);
	let o = e.nodes.find((e) => e.id === n), s = o === void 0 ? void 0 : t.get(o.type), c = Rn(s, r, !0);
	if (c === void 0) return "any";
	if (c.typeOf === null || c.typeOf === void 0 || c.typeOf.length === 0) return c.type;
	let l = Pn(e, n, c.typeOf);
	return l === void 0 ? Rn(s, c.typeOf, !1)?.type ?? "any" : zn(e, t, l.fromNode, l.fromPin, i);
}
function Bn(e, t) {
	let n = e.nodes.filter((e) => t.has(e.id)), r = e.edges.filter((e) => t.has(e.fromNode) && t.has(e.toNode));
	return {
		nodes: n.map((e) => ({
			...e,
			values: { ...e.values }
		})),
		edges: r.map((e) => ({
			...e,
			points: [...e.points]
		}))
	};
}
function Vn(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	return {
		nodes: e.nodes.map((e) => {
			let i = h("n");
			return r.set(e.id, i), {
				...e,
				id: i,
				x: e.x + t,
				y: e.y + n,
				values: { ...e.values }
			};
		}),
		edges: e.edges.map((e) => ({
			...e,
			id: h("e"),
			fromNode: r.get(e.fromNode) ?? e.fromNode,
			toNode: r.get(e.toNode) ?? e.toNode,
			points: e.points.map((e) => ({
				x: e.x + t,
				y: e.y + n
			}))
		}))
	};
}
//#endregion
//#region src/nodes/display.ts
var Hn = /^(https?:\/\/|data:image\/|blob:|\/)/i;
function Un(e, t) {
	return e == null || e === "" ? I(t.empty, "ui-graph__display-empty") : typeof e == "string" ? Wn(e) ? Gn(e) : I(e, "ui-graph__display-text") : typeof e == "number" ? I(t.number(e), "ui-graph__display-number") : typeof e == "bigint" ? I(String(e), "ui-graph__display-number") : typeof e == "boolean" ? I(e ? "✓" : "✕", "ui-graph__display-number") : Array.isArray(e) ? e.length === 0 ? I(t.empty, "ui-graph__display-empty") : Kn(e, t) : typeof e == "object" ? Jn(e, t) : I(String(e), "ui-graph__display-text");
}
function Wn(e) {
	return Hn.test(e.trim());
}
function I(e, t) {
	let n = document.createElement("div");
	return n.className = t, n.textContent = e, n;
}
function Gn(e) {
	let t = document.createElement("img");
	return t.className = "ui-graph__display-image", t.src = e, t.alt = "", t.addEventListener("error", () => t.replaceWith(I(e, "ui-graph__display-text")), { once: !0 }), t;
}
function Kn(e, t) {
	let n = qn(e);
	if (n === null) {
		let n = document.createElement("div");
		n.className = "ui-graph__display-list";
		for (let r of e) n.append(Un(r, t));
		return n;
	}
	let r = document.createElement("table"), i = document.createElement("tr");
	r.className = "ui-graph__display-table";
	for (let e of n) {
		let t = document.createElement("th");
		t.textContent = e, i.append(t);
	}
	r.append(i);
	for (let i of e) {
		let e = document.createElement("tr"), a = i;
		for (let r of n) {
			let n = document.createElement("td");
			n.textContent = Yn(a[r], t), e.append(n);
		}
		r.append(e);
	}
	return r;
}
function qn(e) {
	let t = [];
	for (let n of e) {
		if (typeof n != "object" || !n || Array.isArray(n)) return null;
		for (let e of Object.keys(n)) t.includes(e) || t.push(e);
	}
	return t.length === 0 ? null : t;
}
function Jn(e, t) {
	let n = document.createElement("div"), r = Object.keys(e).find((t) => typeof e[t] == "string" && Wn(e[t])), i = f(e.width), a = f(e.height), o = r !== void 0 && i !== null;
	if (n.className = "ui-graph__display-record", o) {
		let t = Gn(e[r]);
		t.classList.add("ui-graph__display-image--sized"), t.style.width = `${i}px`, a !== null && (t.style.height = `${a}px`), n.append(t);
	}
	for (let [i, a] of Object.entries(e)) {
		if (o && (i === r || i === "width" || i === "height")) continue;
		if (typeof a == "string" && Wn(a)) {
			n.append(Gn(a));
			continue;
		}
		let e = document.createElement("div");
		e.className = "ui-graph__display-field", e.append(I(i, "ui-graph__display-key")), e.append(I(Yn(a, t), "ui-graph__display-value")), n.append(e);
	}
	return n.childElementCount === 0 ? I(t.empty, "ui-graph__display-empty") : n;
}
function Yn(e, t) {
	return e == null ? "" : typeof e == "number" ? t.number(e) : typeof e == "object" ? JSON.stringify(e) : String(e);
}
//#endregion
//#region src/nodes/node-view.ts
var L = "data-ui-graph-pin", Xn = "data-ui-graph-pin-dir", Zn = "data-ui-graph-pin-type", Qn = "data-ui-graph-state", $n = "data-ui-graph-head", er = "data-ui-graph-value", tr = "data-ui-graph-display", nr = "data-ui-graph-uploading", rr = "data-ui-graph-pin-many", ir = "data-ui-graph-pin-optional", ar = "graph-editor:", or = "graph-list-remove", sr = "ui-image-input__selection", cr = "ui-image-input__text", lr = "graph-list-add", ur = "data-ui-graph-list-add";
function dr(e, t, n) {
	let r = document.createElement("div");
	r.className = "ui-graph__node", r.setAttribute(o, e.id), r.style.setProperty("--ui-graph-node-x", String(e.x)), r.style.setProperty("--ui-graph-node-y", String(e.y)), t?.minWidth !== null && t?.minWidth !== void 0 && r.style.setProperty("--ui-graph-node-min-width", `${t.minWidth}rem`), e.collapsed !== !0 && e.width !== null && e.width !== void 0 && e.width > 0 && r.style.setProperty("--ui-graph-node-w", String(e.width)), e.collapsed !== !0 && e.height !== null && e.height !== void 0 && e.height > 0 && r.style.setProperty("--ui-graph-node-h", String(e.height));
	let i = e.color ?? t?.color ?? null;
	i !== null && i.length > 0 && r.style.setProperty("--ui-graph-node-color", i), e.pinned === !0 && r.setAttribute("data-ui-graph-pinned", "");
	let a = mr(e, t, n);
	if (r.append(a), t?.showProgress === !0 && r.append(gr()), e.collapsed === !0) return r.setAttribute("data-ui-graph-collapsed", ""), a.append(fr(e, t, n)), r;
	let s = document.createElement("div");
	if (s.className = "ui-graph__node-body", t === void 0) {
		let t = document.createElement("div");
		t.className = "ui-graph__node-unknown", t.textContent = e.type, s.append(t);
	} else {
		let r = t.inputs.filter((t) => In(t, e.values)), i = r.filter((e) => e.editor === "None");
		for (let r = 0; r < Math.max(i.length, t.outputs.length); r++) s.append(_r(e, i[r], t.outputs[r], n));
		for (let t of r) t.editor !== "None" && s.append(br(e, t, n));
	}
	return r.append(s), !n.readOnly && t?.resizable !== !1 && r.append(pr()), r;
}
function fr(e, t, n) {
	let r = document.createElement("div");
	if (r.className = "ui-graph__node-ports", t === void 0) return r;
	for (let i of t.inputs) i.hasPin !== !1 && In(i, e.values) && r.append(R(e, i, i.type, "in", n));
	for (let i of t.outputs) r.append(R(e, i, n.outputType(e.id, i.name), "out", n));
	return r;
}
function pr() {
	let e = document.createElement("div");
	return e.className = "ui-graph__node-resize", e.setAttribute("data-ui-graph-resize", ""), e;
}
function mr(e, t, n) {
	let r = document.createElement("div");
	r.className = "ui-graph__node-head", r.setAttribute($n, "");
	let i = document.createElement("button"), a = e.collapsed === !0;
	i.type = "button", i.className = "ui-graph__node-fold", i.setAttribute(c, ""), i.title = n.words.text(a ? "ui.graph.expand" : "ui.graph.collapse"), i.setAttribute("aria-label", i.title), i.setAttribute("aria-expanded", String(!a)), i.append(hr(n, a ? "ne-chevron-right" : "ne-chevron-down")), r.append(i);
	let o = t?.icon ?? null;
	o !== null && o.length > 0 && r.append(hr(n, o, "ui-graph__node-icon"));
	let l = document.createElement("span");
	l.className = "ui-graph__node-title", l.textContent = e.title ?? t?.title ?? e.type, r.append(l);
	let u = document.createElement("button");
	return u.type = "button", u.className = "ui-graph__node-pinned", u.setAttribute(s, ""), u.title = n.words.text(e.pinned === !0 ? "ui.graph.unpin" : "ui.graph.pin"), u.setAttribute("aria-label", u.title), u.append(hr(n, e.pinned === !0 ? "ne-pin" : "ne-pin-outlined")), r.append(u), r;
}
function hr(e, t, n) {
	let r = document.createElement("span");
	return n !== void 0 && (r.className = n), r.setAttribute("aria-hidden", "true"), e.icons.apply(r, t), r;
}
function gr() {
	let e = document.createElement("div");
	return e.className = "ui-graph__node-progress", e.hidden = !0, e.append(document.createElement("i")), e;
}
function _r(e, t, n, r) {
	let i = document.createElement("div");
	return i.className = "ui-graph__row", t !== void 0 && (i.append(R(e, t, t.type, "in", r)), i.append(yr(t, "ui-graph__row-label"))), n !== void 0 && (i.append(vr(n.title, "ui-graph__row-label ui-graph__row-label--out")), i.append(R(e, n, r.outputType(e.id, n.name), "out", r))), i;
}
function vr(e, t) {
	let n = document.createElement("span");
	return n.className = t, n.textContent = e, n;
}
function yr(e, t) {
	return vr(e.title, t);
}
function br(e, t, n) {
	let r = document.createElement("div"), i = t.hasPin !== !1 && n.isConnected(e.id, t.name, "in"), a = xr(t);
	r.className = a ? "ui-graph__row ui-graph__row--tall" : "ui-graph__row", (t.editor === "Image" && t.large === !0 || t.editor === "Display") && r.classList.add("ui-graph__row--grow"), t.hasPin !== !1 && r.append(R(e, t, t.type, "in", n));
	let o = Cr(e, t, n), s = o.querySelector(`[${ur}]`);
	if (s !== null) {
		let e = document.createElement("div");
		e.className = "ui-graph__row-head", e.append(yr(t, "ui-graph__row-label")), e.append(s), r.append(e);
	} else (a || t.editor === "Boolean") && r.append(yr(t, "ui-graph__row-label"));
	return t.height !== null && t.height !== void 0 && t.height > 0 && o.style.setProperty("--ui-graph-editor-height", `${t.height}rem`), i && t.editor !== "List" && (r.classList.add("ui-graph__row--connected"), o.setAttribute("inert", "")), r.append(o), r;
}
function xr(e) {
	return e.editor === "Image" && e.large === !0 || e.editor === "List" || e.editor === "Display" || e.editor === "Text" && (e.maxLines ?? 1) > 1;
}
function R(e, t, n, r, i) {
	let a = document.createElement("span");
	a.className = "ui-graph__pin", a.setAttribute(L, t.name), a.setAttribute(Xn, r), a.setAttribute(Zn, n), a.style.setProperty("--ui-graph-pin-color", i.pinColor(n)), t.multiple === !0 && a.setAttribute(rr, ""), i.isConnected(e.id, t.name, r) && a.classList.add("ui-graph__pin--filled"), (r === "out" || t.required !== !0) && a.setAttribute(ir, "");
	let o = t.description ?? "", s = `${t.title} (${Sr(n, t.multiple === !0, i)})${o.length > 0 ? `\n${o}` : ""}`;
	return a.addEventListener("pointerenter", () => i.tooltips.show(a, s)), a.addEventListener("pointerleave", () => i.tooltips.hide()), a;
}
function Sr(e, t, n) {
	let r = (e) => e.startsWith("array:") ? `${r(e.slice(6))}[]` : e.startsWith("enum:") ? e.slice(5) : e;
	return t ? n.words.format("ui.graph.pin-many", { type: r(e) }) : r(e);
}
function Cr(e, t, n) {
	let r = e.values[t.name];
	switch (t.editor) {
		case "Image": return Ar(e, t, r, n);
		case "List": return Mr(e, t, r, n);
		case "Display": return kr(t, n);
		default: return wr(e, t, r, n);
	}
}
function wr(e, t, n, r) {
	let i = Tr(t, t.editor === "Boolean" ? "ui-graph__editor--check" : null), a = r.cloneEditor(`${ar}${e.type}:${t.name}`);
	return a === null ? i : (i.append(a), Er(a, n ?? null, r, () => r.onValueChanged(e.id, t.name, Dr(t, r.readValue(a)))), i);
}
function Tr(e, t) {
	let n = document.createElement("div");
	return n.className = t === null ? "ui-graph__editor" : `ui-graph__editor ${t}`, n.setAttribute(er, e.name), n;
}
function Er(e, t, n, r) {
	n.setProperty(e, "Value", t), n.readOnly ? n.setProperty(e, "IsReadOnly", !0) : e.addEventListener("change", r);
}
function Dr(e, t) {
	return Or(e.editor === "Number", t);
}
function Or(e, t) {
	if (t === void 0 || t === "") return null;
	if (e && typeof t == "string") {
		let e = Number(t);
		return Number.isFinite(e) ? e : null;
	}
	return t;
}
function kr(e, t) {
	let n = document.createElement("div");
	return n.className = "ui-graph__editor ui-graph__editor--display", n.setAttribute(er, e.name), n.setAttribute(tr, ""), n.append(Un(null, {
		empty: t.words.text("ui.graph.no-value"),
		number: (n) => t.number(n, e.format)
	})), n;
}
function Ar(e, t, n, r) {
	let i = t.large === !0, a = Tr(t, i ? "ui-graph__editor--picture" : null), o = Ln(n), s = r.cloneEditor(`${ar}${e.type}:${t.name}`);
	if (s === null) return a;
	if (a.append(s), i) return Er(s, o.length === 0 ? null : o, r, () => {
		let n = s.querySelector(`input.${sr}`);
		if (n === null || n.value.length === 0) return;
		let i = s.querySelector(`.${cr}`)?.textContent ?? "";
		r.onImageUploaded(e.id, t.name, n.value, i);
	}), a;
	Er(s, o.length === 0 ? null : o, r, () => {
		let n = Ln(r.readValue(s));
		r.onValueChanged(e.id, t.name, n.length === 0 ? null : n);
	});
	let c = s.querySelector(".ui-text-input__action > *");
	return c !== null && (jr(c, r), c.addEventListener("click", (n) => {
		n.preventDefault(), r.onPickImage(e.id, t.name);
	})), a;
}
function jr(e, t) {
	t.readOnly && t.setProperty(e, "Enabled", !1);
}
function Mr(e, t, n, r) {
	let i = Tr(t, "ui-graph__editor--list"), a = Array.isArray(n) ? [...n] : [], o = t.type === "array:number" || t.type === "number", s = document.createElement("div");
	s.className = "ui-graph__list-rows", i.append(s);
	let c = () => r.onValueChanged(e.id, t.name, [...a]), l = () => {
		s.replaceChildren(), s.hidden = a.length === 0, a.forEach((n, i) => {
			let u = document.createElement("div"), d = r.cloneEditor(`${ar}${e.type}:${t.name}`), f = r.cloneEditor(or);
			u.className = "ui-graph__list-row", d !== null && (Er(d, n ?? null, r, () => {
				a[i] = Or(o, r.readValue(d)), c();
			}), u.append(d)), f !== null && (jr(f, r), f.addEventListener("click", () => {
				a.splice(i, 1), l(), c();
			}), u.append(f)), s.append(u);
		});
	};
	l();
	let u = r.cloneEditor(lr);
	return u !== null && (u.setAttribute(ur, ""), jr(u, r), u.addEventListener("click", () => {
		a.push(null), l(), c();
	}), i.append(u)), i;
}
//#endregion
//#region src/nodes/nodes-log.ts
var Nr = "data-ui-graph-log-node", Pr = "data-ui-graph-log-open", Fr = "data-ui-graph-run-state", Ir = 500, Lr = class {
	root;
	context;
	services;
	types;
	runLine;
	runLabel;
	runShare;
	logPanel;
	logEntries;
	logToggle;
	logCount;
	log = [];
	runStarted = !1;
	runCompleted = 0;
	runTotal = 0;
	runFailed = !1;
	runningNode = null;
	statuses = /* @__PURE__ */ new Map();
	displays = /* @__PURE__ */ new Map();
	constructor(e, t) {
		let n = e.root;
		this.root = n, this.context = e.context, this.services = e, this.types = t, this.runLine = n.querySelector("[data-ui-graph-run]"), this.runLabel = n.querySelector("[data-ui-graph-run-label]"), this.runShare = n.querySelector("[data-ui-graph-run-share]"), this.logPanel = n.querySelector("[data-ui-graph-log]"), this.logEntries = n.querySelector("[data-ui-graph-log-entries]"), this.logToggle = n.querySelector("[data-ui-graph-log-toggle]"), this.logCount = n.querySelector("[data-ui-graph-log-count]");
	}
	reapplyToRedrawnNodes(e) {
		for (let [t, n] of this.statuses) e.has(t) ? this.applyStatus(t, n) : this.statuses.delete(t);
		for (let [t, n] of this.displays) {
			if (!e.has(t)) {
				this.displays.delete(t);
				continue;
			}
			for (let [e, r] of n) this.applyDisplay(t, e, r);
		}
	}
	setStatus(e, t, n, r) {
		let i = {
			state: t.toLowerCase(),
			progress: n,
			message: r
		};
		i.state === "idle" && n === null && r === null ? this.statuses.delete(e) : this.statuses.set(e, i), i.state === "running" ? this.runningNode = e : this.runningNode === e && (this.runningNode = null), i.state === "failed" && (this.runFailed = !0), this.applyStatus(e, i), this.drawRun();
	}
	applyStatus(e, t) {
		let n = this.services.nodeElements.get(e);
		if (n === void 0) return;
		let r = n.querySelector(".ui-graph__node-progress");
		n.setAttribute(Qn, t.state), r !== null && (r.hidden = t.state !== "running" || t.progress === null, t.progress !== null && r.style.setProperty("--ui-graph-progress", String(Math.min(1, Math.max(0, t.progress)))));
	}
	setDisplay(e, t, n) {
		let r = this.displays.get(e);
		r === void 0 && (r = /* @__PURE__ */ new Map(), this.displays.set(e, r)), r.set(t, n), this.applyDisplay(e, t, n);
	}
	applyDisplay(e, t, n) {
		let r = this.services.nodeElements.get(e)?.querySelector(`[${tr}][${er}="${CSS.escape(t)}"]`), i = this.inputPin(e, t)?.format;
		r?.replaceChildren(Un(n, {
			empty: this.context.strings.text("ui.graph.no-value"),
			number: (e) => this.formatNumber(e, i)
		}));
	}
	inputPin(e, t) {
		let n = this.services.documentState.document.nodes.find((t) => t.id === e);
		return Rn(n === void 0 ? void 0 : this.types.get(n.type), t, !1);
	}
	formatNumber(e, t) {
		return this.context.numbers.format(e, t ?? null, this.context.numbers.readCulture(this.root));
	}
	addLog(e, t, n) {
		let r = {
			nodeId: e,
			level: t.toLowerCase(),
			message: n,
			at: /* @__PURE__ */ new Date()
		};
		if (this.log.push(r), this.log.length > Ir && (this.log.shift(), this.logEntries?.firstElementChild?.remove()), this.logEntries !== null) {
			let e = this.logEntries.scrollHeight - this.logEntries.scrollTop - this.logEntries.clientHeight < 8;
			this.logEntries.append(this.renderLogEntry(r)), e && (this.logEntries.scrollTop = this.logEntries.scrollHeight);
		}
		this.drawLogCount(), r.level === "error" && (this.runFailed = !0, this.drawRun());
	}
	renderLogEntry(e) {
		let t = document.createElement("li"), n = document.createElement("time"), r = document.createElement("button"), i = document.createElement("span");
		return t.className = "ui-graph__log-entry", t.setAttribute("data-ui-graph-log-level", e.level), n.className = "ui-graph__log-time", n.dateTime = e.at.toISOString(), n.textContent = this.context.temporal.format(e.at, "HH:mm:ss", this.context.temporal.readCulture(this.root)), r.type = "button", r.className = "ui-graph__log-node", r.setAttribute(Nr, e.nodeId), r.textContent = this.nodeName(e.nodeId), i.className = "ui-graph__log-message", i.textContent = e.message, t.append(n, r, i), t;
	}
	nodeName(e) {
		let t = this.services.documentState.document.nodes.find((t) => t.id === e);
		return t?.title ?? (t === void 0 ? void 0 : this.types.get(t.type)?.title) ?? e;
	}
	drawLogCount() {
		if (this.logCount === null) return;
		let e = this.log.filter((e) => e.level === "error").length, t = this.log.filter((e) => e.level === "warning").length;
		this.logCount.hidden = this.log.length === 0, this.context.badges.writeCount(this.logCount, this.log.length), this.logCount.classList.toggle("ui-badge-style--danger", e > 0), this.logCount.classList.toggle("ui-badge-style--warning", e === 0 && t > 0), this.logCount.classList.toggle("ui-badge-style--surface", e === 0 && t === 0);
	}
	clearLog() {
		this.log.length = 0, this.logEntries?.replaceChildren(), this.drawLogCount();
	}
	setLogOpen(e, t = !1) {
		this.root.toggleAttribute(Pr, e), this.logToggle?.setAttribute("aria-expanded", String(e)), t && this.context.store.write(this.root, "log", e ? "open" : null);
	}
	isLogOpen() {
		return this.root.hasAttribute(Pr);
	}
	goToNode(e) {
		let t = this.services.nodeRect(e);
		if (t === null) return;
		this.services.selection.chooseForMenu(e), this.services.drawEdges();
		let n = this.runLine?.offsetHeight ?? 0, r = this.logPanel?.offsetHeight ?? 0;
		this.services.view.centerOnRect(t, n, r);
	}
	setRunProgress(e, t) {
		e <= 0 && (this.clearLog(), this.runStarted = !0, this.runFailed = !1, this.runningNode = null), this.runCompleted = Math.max(0, e), this.runTotal = Math.max(0, t), this.runCompleted >= this.runTotal && (this.runningNode = null), this.drawRun();
	}
	drawRun() {
		if (this.runLine === null) return;
		let e = this.runningNode === null ? void 0 : this.statuses.get(this.runningNode), t = e?.state === "running" ? Math.min(1, Math.max(0, e.progress ?? 0)) : 0, n = this.runTotal === 0 ? +!!this.runStarted : Math.min(1, (this.runCompleted + t) / this.runTotal), r = Math.round(n * 100), i = this.runStarted && this.runCompleted >= this.runTotal;
		this.runLine.style.setProperty("--ui-graph-run", String(n)), this.runLine.style.setProperty("--ui-graph-run-step", String(t)), this.runLine.setAttribute("aria-valuenow", String(r)), this.runLine.setAttribute(Fr, this.runStarted ? this.runFailed ? "failed" : i ? "done" : "running" : "idle"), this.runLabel !== null && (this.runLabel.textContent = this.runLabelText(e)), this.runShare !== null && (this.runShare.textContent = this.runStarted ? `${r}%` : "");
	}
	runLabelText(e) {
		if (this.runningNode !== null) {
			let t = e?.message ?? "";
			return t.length > 0 ? `${this.nodeName(this.runningNode)} · ${t}` : this.nodeName(this.runningNode);
		}
		let t = this.log.find((e) => e.level === "error");
		return t === void 0 ? "" : `${this.nodeName(t.nodeId)} · ${t.message}`;
	}
}, Rr = "[data-ui-graph-picker]", zr = "[data-ui-graph-picker-search] input", Br = "[data-ui-graph-picker-rail]", Vr = "[data-ui-graph-picker-list]", Hr = "[data-ui-graph-picker-empty]", Ur = "data-ui-graph-kind", z = "data-ui-graph-category", B = "ui-graph__picker-entry", Wr = "ui-graph__picker-entry--current", V = "", Gr = class e {
	panel;
	search;
	rail;
	list;
	empty;
	entries;
	words;
	icons;
	ids;
	roving;
	choose;
	category = V;
	constructor(e, t, n, r, i, a, o, s, c, l, u) {
		this.panel = e, this.search = t, this.rail = n, this.list = r, this.empty = i, this.entries = a, this.words = o, this.icons = s, this.ids = c, this.roving = l, this.choose = u, this.search.addEventListener("input", () => this.draw()), this.search.addEventListener("change", () => this.draw()), this.search.addEventListener("keydown", (e) => this.key(e)), this.rail.addEventListener("click", (e) => this.rails(e)), this.list.addEventListener("click", (e) => this.click(e)), this.panel.addEventListener("click", (e) => {
			e.target === this.panel && this.close();
		});
	}
	static create(t, n, r, i, a, o, s) {
		let c = t.querySelector(Rr), l = c?.querySelector(zr) ?? null, u = c?.querySelector(Br) ?? null, d = c?.querySelector(Vr) ?? null, f = c?.querySelector(Hr) ?? null;
		return c === null || l === null || u === null || d === null || f === null ? null : (l.setAttribute("role", "combobox"), l.setAttribute("aria-controls", i.ensureId(d, "ui-graph-picker-list")), l.setAttribute("aria-autocomplete", "list"), l.setAttribute("aria-expanded", "false"), new e(c, l, u, d, f, n, r, a, i, o, s));
	}
	get isOpen() {
		return this.panel.open;
	}
	open() {
		this.search.value = "", this.category = V, this.drawRail(), this.draw(), this.panel.open || this.panel.showModal(), this.search.setAttribute("aria-expanded", "true"), this.search.focus({ preventScroll: !0 });
	}
	close() {
		this.search.setAttribute("aria-expanded", "false"), this.panel.open && this.panel.close();
	}
	contains(e) {
		return e instanceof Node && this.panel.contains(e);
	}
	drawRail() {
		let e = /* @__PURE__ */ new Set();
		this.rail.replaceChildren(this.railEntry(V, this.words.text("ui.graph.all-kinds")));
		for (let t of this.entries()) {
			let n = t.category ?? "";
			e.has(n) || (e.add(n), this.rail.append(this.railEntry(n, n.length === 0 ? this.words.text("ui.graph.uncategorized") : n)));
		}
	}
	railEntry(e, t) {
		let n = document.createElement("button");
		return n.type = "button", n.className = "ui-graph__picker-category", n.setAttribute("role", "tab"), n.setAttribute(z, e), n.setAttribute("aria-selected", String(e === this.category)), n.textContent = t, n;
	}
	rails(e) {
		let t = e.target instanceof Element ? e.target.closest(`[${z}]`) : null;
		if (t !== null) {
			this.category = t.getAttribute(z) ?? V;
			for (let e of this.rail.querySelectorAll(`[${z}]`)) e.setAttribute("aria-selected", String(e.getAttribute(z) === this.category));
			this.draw();
		}
	}
	draw() {
		let e = this.search.value.trim().toLowerCase(), t = this.entries().filter((t) => this.chosen(t) && (e.length === 0 || Kr(t, e)));
		this.list.replaceChildren(), this.empty.hidden = t.length > 0;
		for (let e of t) {
			let t = document.createElement("button");
			t.type = "button", t.className = B, t.id = this.ids.ensureId(t, `${this.list.id}-entry`), t.setAttribute("role", "option"), t.setAttribute(Ur, e.key);
			let n = e.icon ?? "";
			if (n.length > 0) {
				let e = document.createElement("span");
				e.className = "ui-graph__picker-entry-icon", e.setAttribute("aria-hidden", "true"), this.icons.apply(e, n), t.append(e);
			}
			let r = document.createElement("span"), i = document.createElement("span");
			r.className = "ui-graph__picker-entry-text", i.className = "ui-graph__picker-entry-title", i.textContent = e.title, r.append(i);
			let a = e.description ?? "";
			if (a.length > 0) {
				let e = document.createElement("span");
				e.className = "ui-graph__picker-entry-line", e.textContent = a, r.append(e);
			}
			t.append(r), this.list.append(t);
		}
		this.setCurrent(this.list.querySelector(`.${B}`));
	}
	setCurrent(e) {
		for (let t of this.list.querySelectorAll(`.${B}`)) {
			let n = t === e;
			t.classList.toggle(Wr, n), t.setAttribute("aria-selected", String(n));
		}
		e === null ? this.search.removeAttribute("aria-activedescendant") : this.search.setAttribute("aria-activedescendant", e.id);
	}
	chosen(e) {
		return this.category === V || (e.category ?? "") === this.category;
	}
	key(e) {
		if (e.isComposing) return;
		if (e.key === "Enter") {
			e.preventDefault(), this.take(this.list.querySelector(`.${Wr}`));
			return;
		}
		let t = [...this.list.querySelectorAll(`.${B}`)], n = this.roving.target({
			key: e.key,
			items: t,
			current: t.find((e) => e.classList.contains(Wr)) ?? null,
			axis: "vertical"
		});
		n !== null && (e.preventDefault(), this.setCurrent(n), n.scrollIntoView({ block: "nearest" }));
	}
	click(e) {
		this.take(e.target instanceof Element ? e.target.closest(`.${B}`) : null);
	}
	take(e) {
		let t = e?.getAttribute(Ur), n = t == null ? void 0 : this.entries().find((e) => e.key === t);
		n !== void 0 && (this.close(), this.choose(n));
	}
};
function Kr(e, t) {
	return e.title.toLowerCase().includes(t) || (e.description ?? "").toLowerCase().includes(t) || (e.category ?? "").toLowerCase().includes(t) || e.key.toLowerCase().includes(t);
}
//#endregion
//#region src/nodes/nodes-picker-binding.ts
var qr = class {
	services;
	picker;
	constructor(e, t) {
		let n = e.context;
		this.services = e;
		let r = t.filter((e) => e.hidden !== !0);
		this.picker = Gr.create(e.root, () => r, n.strings, n.dom, n.icons, n.roving, (e) => this.addNode(e));
	}
	open() {
		this.picker?.open();
	}
	close() {
		this.picker?.close();
	}
	addNode(e) {
		let t = this.services.settings;
		if (t.readOnly) return;
		let n = this.services.pointerScene(), r = Nn(e, S(n.x, t.gridSize, t.snapping), S(n.y, t.gridSize, t.snapping));
		this.services.documentState.document.nodes.push(r), this.services.selection.selectOnly(r.id), this.services.documentState.edited();
	}
}, Jr = "image-upload", Yr = class {
	root;
	context;
	settings;
	nodeElements;
	constructor(e) {
		this.root = e.root, this.context = e.context, this.settings = e.settings, this.nodeElements = e.nodeElements;
	}
	pickImage(e, t) {
		if (this.settings.readOnly) return;
		let n = document.createElement("input");
		n.type = "file", n.accept = "image/*", n.addEventListener("change", () => {
			let r = n.files?.[0];
			r !== void 0 && this.uploadImage(e, t, r);
		}), n.click();
	}
	async uploadImage(e, t, n) {
		this.editorOf(e, t)?.setAttribute(nr, "0%");
		try {
			let r = await this.context.uploads.uploadAsync([n], (n) => this.editorOf(e, t)?.setAttribute(nr, `${n}%`));
			this.announce(e, t, r.selectionId, n.name);
		} catch {
			this.editorOf(e, t)?.setAttribute(nr, this.context.strings.text("ui.graph.upload-failed"));
		}
	}
	announce(e, t, n, r) {
		this.root.dispatchEvent(new CustomEvent(Jr, {
			bubbles: !0,
			detail: { keys: [
				e,
				t,
				n,
				r
			] }
		}));
	}
	editorOf(e, t) {
		return this.nodeElements.get(e)?.querySelector(`[data-ui-graph-value="${CSS.escape(t)}"]`) ?? null;
	}
}, H = "data-ui-graph-drop", Xr = ".ui-graph__row", Zr = "ui-graph__pin--aimed", Qr = class {
	services;
	host;
	types;
	constructor(e, t, n) {
		this.services = e, this.host = t, this.types = n;
	}
	get document() {
		return this.services.documentState.document;
	}
	beginConnect(e) {
		let t = this.connectionFrom(e);
		return t === null ? null : (this.offerDropTargets(t.fromNode, t.fromType), {
			kind: "kind",
			move: (e, n) => this.trackConnect(t, e, n),
			finish: (e) => this.finishConnection(e, t),
			end: () => this.clearDropTargets()
		});
	}
	connectionFrom(e) {
		let t = e.closest(`[${o}]`)?.getAttribute(o);
		if (t == null) return null;
		let n = e.getAttribute(L);
		if (e.getAttribute("data-ui-graph-pin-dir") === "out") return {
			fromNode: t,
			fromPin: n,
			fromType: e.getAttribute("data-ui-graph-pin-type") ?? "any",
			detached: null
		};
		let r = Fn(this.document, t, n).at(-1);
		if (r === void 0) return null;
		this.document.edges = this.document.edges.filter((e) => e.id !== r.id);
		let i = {
			fromNode: r.fromNode,
			fromPin: r.fromPin,
			fromType: zn(this.document, this.types, r.fromNode, r.fromPin),
			detached: r
		};
		return this.services.draw(), i;
	}
	offerDropTargets(e, t) {
		this.services.root.classList.add("ui-graph--connecting");
		for (let n of this.services.nodeLayer.querySelectorAll(`[${L}]`)) {
			let r = n.getAttribute("data-ui-graph-pin-dir") === "in" && n.closest("[data-ui-graph-node]")?.getAttribute("data-ui-graph-node") !== e && Mn(t, n.getAttribute("data-ui-graph-pin-type") ?? "any");
			n.setAttribute(H, r ? "yes" : "no");
		}
		for (let e of this.services.nodeLayer.querySelectorAll(Xr)) {
			let t = e.querySelector(`[${L}][${Xn}="in"]`);
			e.setAttribute(H, t?.getAttribute(H) === "yes" ? "yes" : "no");
		}
	}
	aimAt(e) {
		let t = document.elementFromPoint(e.clientX, e.clientY)?.closest(`[data-ui-graph-pin][${H}="yes"]`) ?? null;
		pt(this.services.nodeLayer, t, (e, t) => e.classList.toggle(Zr, t));
	}
	clearDropTargets() {
		this.services.root.classList.remove("ui-graph--connecting");
		for (let e of this.services.nodeLayer.querySelectorAll(`[${H}]`)) e.removeAttribute(H), e.classList.remove(Zr);
	}
	trackConnect(e, t, n) {
		let r = this.host.pinPoint(e.fromNode, e.fromPin, "out");
		r !== null && this.services.drawPending(r, t, this.host.pinColor(e.fromType)), this.aimAt(n);
	}
	finishConnection(e, t) {
		let n = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-ui-graph-pin][data-ui-graph-pin-dir=\"in\"]") ?? null, r = n?.closest("[data-ui-graph-node]")?.getAttribute("data-ui-graph-node") ?? null, i = n?.getAttribute("data-ui-graph-pin") ?? null;
		if (r === null || i === null) {
			t.detached !== null && this.services.documentState.edited();
			return;
		}
		let a = n?.getAttribute("data-ui-graph-pin-type") ?? "any";
		if (r === t.fromNode || !Mn(t.fromType, a)) {
			t.detached !== null && (this.document.edges.push(t.detached), this.services.draw());
			return;
		}
		if (this.inputPin(r, i)?.multiple === !0) {
			if (this.document.edges.some((e) => e.toNode === r && e.toPin === i && e.fromNode === t.fromNode && e.fromPin === t.fromPin)) {
				t.detached !== null && this.document.edges.push(t.detached), this.services.draw();
				return;
			}
		} else this.document.edges = this.document.edges.filter((e) => e.toNode !== r || e.toPin !== i);
		this.document.edges.push({
			id: h("e"),
			fromNode: t.fromNode,
			fromPin: t.fromPin,
			toNode: r,
			toPin: i,
			points: []
		}), this.services.documentState.edited();
	}
	inputPin(e, t) {
		let n = this.document.nodes.find((t) => t.id === e);
		return Rn(n === void 0 ? void 0 : this.types.get(n.type), t, !1);
	}
}, $r = ".ui-graph__editor", ei = "[data-ui-graph-log], [data-ui-graph-run]", ti = "data-ui-graph-catalog", ni = {
	name: "nodes",
	readDocument: Dn,
	create: (e) => new ri(e)
}, ri = class {
	services;
	types = /* @__PURE__ */ new Map();
	seriesColors;
	wiring;
	wires = null;
	log;
	pickerBinding;
	upload;
	clipboard = null;
	constructor(e) {
		let t = ii(e.root.getAttribute(ti));
		this.services = e, this.seriesColors = ai(e.root);
		for (let e of t) this.types.set(e.key, e);
		this.wiring = new Qr(e, {
			pinPoint: (e, t, n) => this.pinPoint(e, t, n),
			pinColor: (e) => this.pinColor(e)
		}, this.types), this.log = new Lr(e, this.types), this.pickerBinding = new qr(e, t), this.upload = new Yr(e), this.log.setLogOpen(e.context.store.read(e.root, "log") === "open"), this.log.drawRun();
	}
	get document() {
		return this.services.documentState.document;
	}
	items() {
		return this.document.nodes;
	}
	edges() {
		return this.wires = null, this.document.edges;
	}
	renderItem(e) {
		let t = e, n = this.services.context;
		return dr(t, this.types.get(t.type), {
			words: n.strings,
			icons: n.icons,
			readOnly: this.services.settings.readOnly,
			pinColor: (e) => this.pinColor(e),
			outputType: (e, t) => zn(this.document, this.types, e, t),
			isConnected: (e, t, n) => n === "in" ? Pn(this.document, e, t) !== void 0 : this.document.edges.some((n) => n.fromNode === e && n.fromPin === t),
			onValueChanged: (e, t, n) => this.setValue(e, t, n),
			onPickImage: (e, t) => this.upload.pickImage(e, t),
			onImageUploaded: (e, t, n, r) => this.upload.announce(e, t, n, r),
			tooltips: n.tooltips,
			number: (e, t) => this.log.formatNumber(e, t),
			cloneEditor: (e) => this.cloneEditor(e),
			setProperty: (e, t, r) => n.properties.set(e, t, r),
			readValue: (e) => n.values.read(e)
		});
	}
	cloneEditor(e) {
		let t = this.services.root.querySelector(`template[data-ui-graph-editor="${CSS.escape(e)}"]`)?.content.firstElementChild?.cloneNode(!0);
		return t instanceof HTMLElement ? t : null;
	}
	itemsDrawn(e) {
		this.log.reapplyToRedrawnNodes(e), this.services.settings.snapping && ge(this.services.nodeElements.values(), this.services.settings.gridSize);
	}
	itemColor(e) {
		return e.color ?? this.types.get(e.type)?.color ?? "";
	}
	edgeEnds(e) {
		return this.wires ??= this.readWires(), this.wires.get(e.id) ?? null;
	}
	readWires() {
		let e = /* @__PURE__ */ new Map();
		for (let t of this.document.edges) {
			let n = this.pinPoint(t.fromNode, t.fromPin, "out"), r = this.pinPoint(t.toNode, t.toPin, "in");
			n !== null && r !== null && e.set(t.id, {
				from: n,
				to: r
			});
		}
		if (this.services.settings.edgeShape !== "orthogonal") return e;
		let t = Kt(this.document.edges.flatMap((t) => {
			let n = e.get(t.id);
			return n === void 0 ? [] : [{
				id: t.id,
				from: {
					along: n.from.x,
					across: n.from.y
				},
				to: {
					along: n.to.x,
					across: n.to.y
				},
				source: `${t.fromNode}:${t.fromPin}`,
				target: `${t.toNode}:${t.toPin}`
			}];
		}));
		for (let [n, r] of t) e.set(n, {
			...e.get(n),
			turns: [r]
		});
		return e;
	}
	related(e) {
		let t = this.document.edges.filter((t) => t.fromNode === e || t.toNode === e);
		return {
			edges: t.map((e) => e.id),
			items: [e, ...t.map((t) => t.fromNode === e ? t.toNode : t.fromNode)]
		};
	}
	edgeColor(e) {
		let t = e;
		return this.pinColor(zn(this.document, this.types, t.fromNode, t.fromPin));
	}
	pinPoint(e, t, n) {
		let r = this.services.nodeElements.get(e)?.querySelector(`[${L}="${CSS.escape(t)}"][${Xn}="${n}"]`);
		return r == null ? null : this.services.centerOf(r);
	}
	pinColor(e) {
		return e === "any" ? "var(--ui-text-muted)" : `var(--ui-color-series-${(({
			image: 1,
			array: 2,
			number: 3,
			boolean: 4,
			text: 5,
			date: 8,
			time: 8,
			datetime: 8
		}[e] ?? oi(e) + 1) - 1) % this.seriesColors + 1})`;
	}
	setValue(e, t, n) {
		let r = this.document.nodes.find((t) => t.id === e);
		r !== void 0 && (r.values[t] = n, this.services.documentState.edited(this.types.get(r.type)?.inputs.some((e) => e.visibleWhen === t) === !0));
	}
	setPinValue(e, t, n) {
		let r = this.document.nodes.find((t) => t.id === e);
		r !== void 0 && (r.values[t] = n, this.services.documentState.edited());
	}
	setStatus(e, t, n, r) {
		this.log.setStatus(e, t, n, r);
	}
	setDisplay(e, t, n) {
		this.log.setDisplay(e, t, n);
	}
	addLog(e, t, n) {
		this.log.addLog(e, t, n);
	}
	setRunProgress(e, t) {
		this.log.setRunProgress(e, t);
	}
	isEditor(e) {
		return e.closest($r) !== null && e.closest("[data-ui-graph-head]") === null;
	}
	isPanel(e) {
		return e.closest(ei) !== null;
	}
	pointerDown(e, t) {
		let n = t.closest(`[${L}]`);
		return n === null || this.services.settings.readOnly ? !1 : this.wiring.beginConnect(n) ?? !0;
	}
	chrome(e) {
		if (e.closest("[data-ui-graph-log-toggle]") !== null) return this.log.setLogOpen(!this.log.isLogOpen(), !0), !0;
		if (e.closest("[data-ui-graph-log-clear]") !== null) return this.log.clearLog(), !0;
		let t = e.closest(`[${Nr}]`);
		return t !== null && (this.log.goToNode(t.getAttribute(Nr)), !0);
	}
	backgroundDoubleClick() {
		this.pickerBinding.open();
	}
	escape() {
		this.pickerBinding.close();
	}
	copy(e) {
		this.clipboard = Bn(this.document, e);
	}
	paste() {
		if (this.clipboard === null) return null;
		let e = this.services.settings.gridSize * 2, t = Vn(this.clipboard, e, e);
		return this.document.nodes.push(...t.nodes), this.document.edges.push(...t.edges), this.clipboard = t, t.nodes.map((e) => e.id);
	}
	remove(e, t) {
		let n = this.document;
		n.nodes = n.nodes.filter((t) => !e.has(t.id)), n.edges = n.edges.filter((n) => !t.has(n.id) && !e.has(n.fromNode) && !e.has(n.toNode));
	}
	arrange(e, t) {
		return Cn(this.document, {
			sizes: e,
			only: t
		});
	}
	canEditItems() {
		return !0;
	}
	renameItem() {
		return !1;
	}
	paintItem() {
		return !1;
	}
	hasEdgeMenu() {
		return !1;
	}
	runCommand(e) {
		return e === "graph:add-node" && (this.pickerBinding.open(), !0);
	}
	syncMenus(e) {
		T(this.services.root, "graph:add-node", e);
	}
};
function ii(e) {
	let t = d(e);
	return Array.isArray(t) ? t : [];
}
function ai(e) {
	let t = Number(getComputedStyle(e).getPropertyValue("--ui-color-series-count"));
	return Number.isFinite(t) && t >= 1 ? Math.floor(t) : 8;
}
function oi(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t = t * 31 + e.charCodeAt(n) >>> 0;
	return t;
}
//#endregion
//#region src/production/craft-view.ts
var si = l.slice(1), ci = new Intl.NumberFormat(void 0, { maximumFractionDigits: 3 });
function li(e, t, n) {
	let r = document.createElement("div"), i = document.createElement("span"), a = document.createElement("span");
	if (r.className = "ui-graph__node ui-graph__craft", r.setAttribute(o, t.id), r.style.setProperty("--ui-graph-node-x", String(e.x)), r.style.setProperty("--ui-graph-node-y", String(e.y)), t.color !== null && r.style.setProperty("--ui-graph-node-color", t.color), n.conflict !== null && r.setAttribute("data-ui-graph-conflict", n.conflict), e.pinned === !0 && r.setAttribute("data-ui-graph-pinned", ""), i.className = `${si} ui-graph__craft-name`, i.textContent = t.title ?? n.word, a.className = "ui-graph__craft-time", a.textContent = n.note ?? U(t.time), r.append(i, a), n.connectable) {
		let e = document.createElement("span"), t = document.createElement("span");
		e.className = "ui-graph__handle", e.setAttribute(j, ""), t.className = "ui-graph__entry", t.setAttribute(mt, ""), r.append(t, e);
	}
	let s = t.tooltip ?? ui(t, n.resource);
	return r.addEventListener("pointerenter", () => n.tooltips.show(r, s)), r.addEventListener("pointerleave", () => n.tooltips.hide()), r;
}
function ui(e, t) {
	let n = (e) => e.map((e) => `${W(e.amount, t(e.resource)?.unit ?? null)} ${t(e.resource)?.title ?? e.resource}`).join(" + ");
	return `${n(e.ingredients) || "—"} → ${n(e.products) || "—"}`;
}
function U(e) {
	return `${ci.format(e)} s`;
}
function W(e, t) {
	return t === null ? `×${ci.format(e)}` : `×${ci.format(e)} ${t}`;
}
function di(e, t, n) {
	return `${W(e, t)} · ${U(n)}`;
}
function G(e) {
	let t = Number(e.trim().replace("×", "").replace(",", ".").trim());
	return Number.isFinite(t) && t > 0 ? t : null;
}
//#endregion
//#region src/production/model.ts
function fi() {
	return {
		nodes: [],
		edges: [],
		groups: [],
		draft: {
			resources: [],
			crafts: [],
			removed: []
		},
		plan: {
			targets: [],
			period: "Once",
			objective: "LeastRaw",
			bought: []
		}
	};
}
function pi(e) {
	let t = e;
	if (typeof t != "object" || !t) return fi();
	let n = t.draft;
	return {
		nodes: (t.nodes ?? []).map((e) => ({
			id: String(e.id),
			x: Number(e.x) || 0,
			y: Number(e.y) || 0,
			pinned: e.pinned === !0
		})),
		edges: (t.edges ?? []).map((e) => ({
			id: String(e.id),
			points: p(e.points)
		})),
		groups: (t.groups ?? []).map(m),
		draft: {
			resources: (n?.resources ?? []).flatMap((e) => {
				let t = _i(e);
				return t === null ? [] : [{
					...Ci(t),
					...hi(e)
				}];
			}),
			crafts: (n?.crafts ?? []).flatMap((e) => {
				let t = vi(e);
				return t === null ? [] : [{
					...wi(t),
					...hi(e)
				}];
			}),
			removed: (n?.removed ?? []).map((e) => String(e))
		},
		plan: mi(t.plan)
	};
}
function mi(e) {
	let t = e ?? {}, n = String(t.period ?? "").toLowerCase(), r = String(t.objective ?? "").toLowerCase();
	return {
		targets: yi(t.targets),
		period: n === "minute" ? "Minute" : n === "hour" ? "Hour" : "Once",
		objective: r === "leasttime" ? "LeastTime" : r === "leastcost" ? "LeastCost" : "LeastRaw",
		bought: Array.isArray(t.bought) ? t.bought.map((e) => String(e)) : []
	};
}
function hi(e) {
	let t = e;
	return {
		created: t.created === !0,
		baseline: typeof t.baseline == "string" ? t.baseline : null
	};
}
function gi(e) {
	if (typeof e != "object" || !e) return null;
	let t = e.kind;
	return t === "Craft" || t === "craft" || t === 1 ? vi(e) : t === "Resource" || t === "resource" || t === 0 ? _i(e) : null;
}
function _i(e) {
	let t = e;
	return typeof t.id != "string" || t.id.length === 0 ? null : {
		kind: "resource",
		id: t.id,
		title: K(t.title),
		icon: K(t.icon),
		color: K(t.color),
		tooltip: K(t.tooltip),
		image: K(t.image),
		category: K(t.category),
		unit: K(t.unit),
		cost: typeof t.cost == "number" && Number.isFinite(t.cost) ? t.cost : null
	};
}
function vi(e) {
	let t = e;
	return typeof t.id != "string" || t.id.length === 0 ? null : {
		kind: "craft",
		id: t.id,
		title: K(t.title),
		icon: K(t.icon),
		color: K(t.color),
		tooltip: K(t.tooltip),
		ingredients: yi(t.ingredients),
		products: yi(t.products),
		time: bi(t.time)
	};
}
function yi(e) {
	return Array.isArray(e) ? e.flatMap((e) => {
		let t = e;
		return typeof t == "object" && t && typeof t.resource == "string" ? [{
			resource: t.resource,
			amount: Number(t.amount) || 0
		}] : [];
	}) : [];
}
function K(e) {
	return typeof e == "string" && e.length > 0 ? e : null;
}
function bi(e) {
	if (typeof e == "number") return Number.isFinite(e) ? e : 0;
	if (typeof e != "string") return 0;
	let t = /^(-)?(?:(\d+)\.)?(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(e.trim());
	if (t === null) return 0;
	let n = Number(t[2] ?? 0) * 86400 + Number(t[3]) * 3600 + Number(t[4]) * 60 + Number(t[5]);
	return t[1] === "-" ? -n : n;
}
function xi(e) {
	let t = Math.round(Math.max(0, e) * 1e7), n = Math.floor(t / 864e9), r = t - n * 86400 * 1e7, i = Math.floor(r / 36e9), a = Math.floor(r % 36e9 / 6e8), o = Math.floor(r % 6e8 / 1e7), s = r % 1e7, c = `${Si(i)}:${Si(a)}:${Si(o)}${s === 0 ? "" : `.${String(s).padStart(7, "0")}`}`;
	return n > 0 ? `${n}.${c}` : c;
}
function Si(e) {
	return String(e).padStart(2, "0");
}
function Ci(e) {
	return {
		id: e.id,
		title: e.title,
		icon: e.icon,
		color: e.color,
		tooltip: e.tooltip,
		image: e.image,
		category: e.category,
		unit: e.unit,
		cost: e.cost,
		created: !1,
		baseline: null
	};
}
function wi(e) {
	return {
		id: e.id,
		title: e.title,
		icon: e.icon,
		color: e.color,
		tooltip: e.tooltip,
		ingredients: e.ingredients.map((e) => ({ ...e })),
		products: e.products.map((e) => ({ ...e })),
		time: xi(e.time),
		created: !1,
		baseline: null
	};
}
function Ti(e, t) {
	let n = [...t.resources, ...t.crafts], r = new Set(t.crafts);
	return Et(e, n, t.removed, (e) => r.has(e) ? vi(e) : _i(e));
}
function Ei(e, t) {
	return Dt(e, [...t.resources, ...t.crafts]);
}
function Di(e) {
	let t = new Set(e.filter((e) => e.kind === "resource").map((e) => e.id)), n = e.filter((e) => e.kind === "craft"), r = /* @__PURE__ */ new Map();
	for (let e of n) for (let n of e.products) {
		if (!t.has(n.resource)) continue;
		let i = r.get(n.resource);
		i === void 0 ? r.set(n.resource, [e]) : i.push(e);
	}
	let i = [], a = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Set();
	for (let e of n) {
		let n = e.ingredients.filter((e) => t.has(e.resource)), o = e.products.filter((e) => t.has(e.resource));
		if (o.length === 1 && (r.get(o[0].resource) ?? []).length === 1) {
			a.add(e.id);
			for (let t of n) i.push({
				id: Oi(e.id, t.resource),
				from: t.resource,
				to: o[0].resource,
				craft: e.id,
				resource: t.resource,
				role: "recipe",
				amount: t.amount,
				output: o[0].amount,
				product: o[0].resource,
				time: e.time
			});
			continue;
		}
		for (let t of n) i.push({
			id: Oi(e.id, t.resource),
			from: t.resource,
			to: e.id,
			craft: e.id,
			resource: t.resource,
			role: "ingredient",
			amount: t.amount
		});
		for (let t of o) i.push({
			id: ki(e.id, t.resource),
			from: e.id,
			to: t.resource,
			craft: e.id,
			resource: t.resource,
			role: "product",
			amount: t.amount
		});
	}
	for (let [e, t] of r) {
		if (t.length !== 1) continue;
		let n = t[0], r = n.products.find((t) => t.resource === e).amount;
		o.set(e, {
			craft: n.id,
			amount: r,
			time: n.time,
			edge: ki(n.id, e)
		}), a.has(n.id) || s.add(ki(n.id, e));
	}
	return {
		edges: i,
		collapsed: a,
		outputs: o,
		quiet: s
	};
}
function Oi(e, t) {
	return `${e}<${t}`;
}
function ki(e, t) {
	return `${e}>${t}`;
}
//#endregion
//#region src/production/production-editing.ts
var Ai = "graph-link-menu", ji = class {
	services;
	host;
	constructor(e, t) {
		this.services = e, this.host = t;
	}
	get document() {
		return this.services.documentState.document;
	}
	draftOf(e) {
		let t = this.document.draft, n = t.resources.find((t) => t.id === e) ?? t.crafts.find((t) => t.id === e);
		if (n !== void 0) return n;
		let r = this.host.entry(e);
		if (r === void 0) return null;
		let i = this.host.serverEntry(e), a = i === void 0 ? null : JSON.stringify(i);
		if (r.kind === "craft") {
			let e = {
				...wi(r),
				baseline: a
			};
			return t.crafts.push(e), e;
		}
		let o = {
			...Ci(r),
			baseline: a
		};
		return t.resources.push(o), o;
	}
	craftOf(e) {
		let t = this.host.entry(e)?.kind === "craft" ? this.draftOf(e) : null;
		return t === null ? null : t;
	}
	rename(e, t) {
		let n = this.draftOf(e);
		n !== null && (n.title = t);
	}
	paint(e, t) {
		let n = this.draftOf(e);
		n !== null && (n.color = t);
	}
	addResource() {
		let e = kt("resource", this.keys()), t = this.services.pointerScene();
		this.document.draft.resources.push({
			id: e,
			title: this.services.context.strings.text("ui.graph.new-resource"),
			icon: null,
			color: null,
			tooltip: null,
			image: null,
			category: null,
			unit: null,
			cost: null,
			created: !0,
			baseline: null
		}), this.document.nodes.push({
			id: e,
			x: t.x,
			y: t.y,
			pinned: !1
		}), this.services.selection.selectOnly(e), this.services.documentState.edited(), this.services.renameItem(e);
	}
	keys() {
		return new Set(this.host.entries().map((e) => e.id));
	}
	removeEntries(e) {
		let t = this.document.draft;
		for (let n of e) {
			let e = [...t.resources, ...t.crafts].some((e) => e.id === n && e.created);
			t.resources = t.resources.filter((e) => e.id !== n), t.crafts = t.crafts.filter((e) => e.id !== n), !e && this.host.serverEntry(n) !== void 0 && !t.removed.includes(n) && t.removed.push(n);
		}
	}
	removeEdges(e) {
		let t = /* @__PURE__ */ new Set();
		for (let n of e) {
			let e = this.host.edge(n), r = e === void 0 ? null : this.craftOf(e.craft);
			e !== void 0 && r !== null && (e.role === "product" ? r.products = r.products.filter((t) => t.resource !== e.resource) : r.ingredients = r.ingredients.filter((t) => t.resource !== e.resource), (r.ingredients.length === 0 && r.products.length === 0 || e.role === "recipe" && r.ingredients.length === 0) && t.add(r.id));
		}
		t.size > 0 && this.removeEntries(t);
	}
	beginLink(e) {
		return _t(this.services, e, {
			canLink: (e, t) => this.canLink(e, t),
			link: (e, t, n) => this.link(e, t, n)
		});
	}
	asked = null;
	canLink(e, t) {
		let n = this.host.entry(e), r = this.host.entry(t);
		return n === void 0 || r === void 0 ? !1 : n.kind === "resource" ? r.kind === "resource" || !r.ingredients.some((t) => t.resource === e) : r.kind === "resource" && !n.products.some((e) => e.resource === t);
	}
	link(e, t, n) {
		if (!this.canLink(e, t)) return;
		let r = this.host.entry(e), i = this.host.entry(t);
		if (r.kind === "resource" && i.kind === "resource") {
			let r = this.soleRecipe(e, t);
			if (r !== null) {
				this.asked = {
					from: e,
					to: t,
					craft: r
				}, Ne(this.services.root, Ai, n.clientX, n.clientY);
				return;
			}
			this.addRecipe(e, t);
		} else if (i.kind === "craft") {
			let n = this.craftOf(t);
			n.ingredients = [...n.ingredients, {
				resource: e,
				amount: 1
			}];
		} else {
			let n = this.craftOf(e);
			n.products = [...n.products, {
				resource: t,
				amount: 1
			}];
		}
		this.services.documentState.edited();
	}
	soleRecipe(e, t) {
		let n = this.host.entries().filter((e) => e.kind === "craft" && e.products.some((e) => e.resource === t));
		return n.length === 1 && this.host.collapsed(n[0].id) && !n[0].ingredients.some((t) => t.resource === e) ? n[0].id : null;
	}
	addRecipe(e, t) {
		this.document.draft.crafts.push({
			id: kt("craft", this.keys()),
			title: null,
			icon: null,
			color: null,
			tooltip: null,
			ingredients: [{
				resource: e,
				amount: 1
			}],
			products: [{
				resource: t,
				amount: 1
			}],
			time: xi(1),
			created: !0,
			baseline: null
		});
	}
	answerLink(e) {
		let t = this.asked;
		if (this.asked = null, t === null || !this.canLink(t.from, t.to)) return;
		let n = e ? this.craftOf(t.craft) : null;
		n === null ? this.addRecipe(t.from, t.to) : n.ingredients = [...n.ingredients, {
			resource: t.from,
			amount: 1
		}], this.services.documentState.edited();
	}
	editAmount(e) {
		this.editSide(e, "in");
	}
	editOutput(e) {
		this.editSide(e, "out");
	}
	editSide(e, t) {
		let n = this.host.edge(e), r = yt(this.services, e);
		if (n === void 0 || r === null) return;
		let i = t === "in" ? n.role !== "product" : n.role === "product", a = t === "in" ? n.resource : n.product ?? n.resource, o = t === "in" ? n.amount : n.output ?? n.amount;
		N(this.services, r, String(o), (e) => {
			let t = G(e), r = t === null ? null : this.craftOf(n.craft);
			if (t === null || r === null) return;
			let o = (e) => e.map((e) => e.resource === a ? {
				...e,
				amount: t
			} : e);
			i ? r.ingredients = o(r.ingredients) : r.products = o(r.products), this.services.documentState.edited();
		});
	}
	editTime(e) {
		let t = this.host.entry(e), n = this.host.collapsed(e) ? null : this.services.nodeRect(e), r = this.host.craftEdge(e), i = n === null ? r === void 0 ? null : yt(this.services, r) : {
			x: n.x + n.width / 2,
			y: n.y + n.height / 2
		};
		i !== null && t?.kind === "craft" && N(this.services, i, String(t.time), (t) => {
			let n = G(t), r = n === null ? null : this.craftOf(e);
			n !== null && r !== null && bi(r.time) !== n && (r.time = xi(n), this.services.documentState.edited());
		});
	}
}, q = 1e-9, Mi = 1e-12;
function Ni(e) {
	let t = e.cost.length, n = e.rows.length, r = [];
	for (let t = 0; t < n; t++) e.atLeast[t] > q && r.push(t);
	let i = t + n, a = i + r.length, o = [], s = [], c = 1;
	for (let l = 0; l < n; l++) {
		let n = Array(a + 1).fill(0), u = r.indexOf(l), d = u < 0 ? -1 : 1;
		for (let r = 0; r < t; r++) n[r] = d * e.rows[l][r];
		n[t + l] = -d, u >= 0 && (n[i + u] = 1, n[a] = e.atLeast[l], c = Math.max(c, e.atLeast[l])), o.push(n), s.push(u < 0 ? t + l : i + u);
	}
	let l = Array(a + 1).fill(0), u = Array(a + 1).fill(0), d = Array(a + 1).fill(0);
	for (let n = 0; n < t; n++) l[n] = e.cost[n], u[n] = e.tieCost[n];
	for (let e of r) {
		for (let t = 0; t < i; t++) d[t] -= o[e][t];
		d[a] -= o[e][a];
	}
	let f = [
		d,
		l,
		u
	];
	if (r.length > 0) {
		if (!Pi(o, s, f, i, (e) => d[e] < -1e-9)) return null;
		let e = 0;
		for (let t = 0; t < n; t++) s[t] >= i && (e += o[t][a]);
		if (e > 1e-7 * c) return null;
		Fi(o, s, f, i);
	}
	if (!Pi(o, s, f, i, (e) => l[e] < -1e-9) || !Pi(o, s, f, i, (e) => Math.abs(l[e]) <= q && u[e] < -1e-9)) return null;
	let p = Array(t).fill(0);
	for (let e = 0; e < n; e++) s[e] < t && (p[s[e]] = Math.max(0, o[e][a]));
	return p;
}
function Pi(e, t, n, r, i) {
	let a = e.length === 0 ? r : e[0].length - 1, o = 64 * (e.length + a) + 256;
	for (let s = 0; s < o; s++) {
		let o = -1;
		for (let e = 0; e < r; e++) if (i(e)) {
			o = e;
			break;
		}
		if (o < 0) return !0;
		let s = -1, c = 0;
		for (let n = 0; n < e.length; n++) {
			if (e[n][o] <= q) continue;
			let r = e[n][a] / e[n][o];
			s < 0 || r < c - q ? (s = n, c = r) : r <= c + q && t[n] < t[s] && (s = n, c = Math.min(c, r));
		}
		if (s < 0) return !1;
		Ii(e, t, n, s, o);
	}
	return !1;
}
function Fi(e, t, n, r) {
	let i = e[0].length - 1;
	for (let a = 0; a < e.length; a++) if (!(t[a] < r)) {
		e[a][i] = 0;
		for (let i = 0; i < r; i++) if (Math.abs(e[a][i]) > q) {
			Ii(e, t, n, a, i);
			break;
		}
	}
}
function Ii(e, t, n, r, i) {
	let a = e[r], o = a[i];
	for (let e = 0; e < a.length; e++) a[e] = Ri(a[e] / o);
	a[i] = 1;
	for (let t = 0; t < e.length; t++) t !== r && Li(e[t], a, i);
	for (let e of n) Li(e, a, i);
	t[r] = i;
}
function Li(e, t, n) {
	let r = e[n];
	if (r !== 0) {
		for (let n = 0; n < e.length; n++) e[n] = Ri(e[n] - r * t[n]);
		e[n] = 0;
	}
}
function Ri(e) {
	return Math.abs(e) < Mi ? 0 : e;
}
//#endregion
//#region src/production/plan.ts
var J = 1e-9;
function zi(e) {
	return e === "Minute" ? 60 : e === "Hour" ? 3600 : null;
}
function Bi(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let t of e) t.kind === "resource" && !n.has(t.id) && n.set(t.id, t);
	let r = e.filter((e) => e.kind === "craft"), i = new Set(t.bought ?? []), a = /* @__PURE__ */ new Map();
	for (let e of r) for (let t of Y(e.products, n)) {
		if (i.has(t.resource)) continue;
		let n = a.get(t.resource);
		n === void 0 ? a.set(t.resource, [e]) : n.includes(e) || n.push(e);
	}
	let o = /* @__PURE__ */ new Map();
	for (let e of t.targets) n.has(e.resource) && e.amount > J && o.set(e.resource, (o.get(e.resource) ?? 0) + e.amount);
	if (o.size === 0) return {
		status: "Empty",
		crafts: [],
		resources: [],
		time: 0,
		raw: 0,
		cost: 0
	};
	let s = new Set(o.keys()), c = /* @__PURE__ */ new Set(), l = [...s];
	for (let e = l.shift(); e !== void 0; e = l.shift()) for (let t of a.get(e) ?? []) if (!c.has(t)) {
		c.add(t);
		for (let e of Y(t.ingredients, n)) s.has(e.resource) || (s.add(e.resource), l.push(e.resource));
	}
	let u = r.filter((e) => c.has(e)), d = [...n.keys()].filter((e) => s.has(e) && a.has(e)), f = d.map((e) => u.map((t) => Wi(t.products, e) - Wi(t.ingredients, e))), p = d.map((e) => o.get(e) ?? 0), m = t.objective === "LeastCost", h = u.map((e) => Ui(e, n, a, !1)), g = m ? u.map((e) => Ui(e, n, a, !0)) : h, _ = u.map((e) => Math.max(0, e.time)), v = t.objective === "LeastTime" ? Ni({
		rows: f,
		atLeast: p,
		cost: _,
		tieCost: h
	}) : Ni({
		rows: f,
		atLeast: p,
		cost: g,
		tieCost: _
	});
	return v === null ? {
		status: "Infeasible",
		crafts: [],
		resources: [],
		time: 0,
		raw: 0,
		cost: 0
	} : Hi(n, a, o, u, (t.period === "Once" ? Vi(f, p, v) : null) ?? v, zi(t.period));
}
function Vi(e, t, n) {
	let r = n.map((e) => e <= J ? 0 : Math.ceil(e - 1e-6));
	for (let i = 0; i < 1e3; i++) {
		let i = !1;
		for (let a = 0; a < e.length; a++) {
			let o = 0;
			for (let t = 0; t < r.length; t++) o += e[a][t] * r[t];
			if (o >= t[a] - 1e-6) continue;
			let s = -1;
			for (let t = 0; t < r.length; t++) e[a][t] > J && (s < 0 || n[t] > n[s] + J) && (s = t);
			if (s < 0) return null;
			r[s] += Math.ceil((t[a] - o) / e[a][s] - 1e-9), i = !0;
		}
		if (!i) return r;
	}
	return null;
}
function Hi(e, t, n, r, i, a) {
	let o = [], s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), l = 0;
	for (let t = 0; t < r.length; t++) {
		let n = r[t], u = i[t];
		if (u <= J) continue;
		let d = u * Math.max(0, n.time);
		o.push({
			craft: n.id,
			runs: u,
			time: d,
			workers: a === null ? null : Math.ceil(d / a - J)
		}), l += d;
		for (let t of Y(n.products, e)) s.set(t.resource, (s.get(t.resource) ?? 0) + u * t.amount);
		for (let t of Y(n.ingredients, e)) c.set(t.resource, (c.get(t.resource) ?? 0) + u * t.amount);
	}
	let u = [], d = 0, f = 0;
	for (let r of e.values()) {
		if (!n.has(r.id) && !s.has(r.id) && !c.has(r.id)) continue;
		let e = !t.has(r.id), i = n.get(r.id) ?? 0, a = s.get(r.id) ?? 0, o = c.get(r.id) ?? 0;
		e && (d += o + i, f += (o + i) * (r.cost ?? 1)), u.push({
			resource: r.id,
			source: e,
			target: i,
			produced: a,
			consumed: o,
			surplus: e ? 0 : Gi(a - o - i)
		});
	}
	return {
		status: "Solved",
		crafts: o,
		resources: u,
		time: l,
		raw: d,
		cost: f
	};
}
function Ui(e, t, n, r) {
	let i = 0;
	for (let a of Y(e.ingredients, t)) n.has(a.resource) || (i += a.amount * (r ? t.get(a.resource).cost ?? 1 : 1));
	return i;
}
function Y(e, t) {
	return e.filter((e) => t.has(e.resource) && e.amount > 0);
}
function Wi(e, t) {
	let n = 0;
	for (let r of e) r.resource === t && r.amount > 0 && (n += r.amount);
	return n;
}
function Gi(e) {
	return Math.abs(e) < 1e-7 ? 0 : e;
}
//#endregion
//#region src/production/plan-view.ts
var Ki = new Intl.NumberFormat(void 0, { maximumFractionDigits: 2 });
function qi(e, t) {
	return {
		plan: e,
		period: t,
		crafts: new Map(e.crafts.map((e) => [e.craft, e])),
		resources: new Map(e.resources.map((e) => [e.resource, e]))
	};
}
function Ji(e, t) {
	return e.filter((e) => e.kind === "craft" ? t.crafts.has(e.id) : t.resources.has(e.id));
}
function Yi(e, t) {
	return e === "Minute" ? t.text("ui.graph.per-minute") : e === "Hour" ? t.text("ui.graph.per-hour") : "";
}
function Xi(e, t) {
	return W(X(e), t);
}
function Zi(e, t, n) {
	let r = t === void 0 ? null : t.source ? t.consumed + t.target : t.produced;
	return r !== null && Math.abs(r - e) < 1e-6 ? null : Xi(e, n);
}
function Qi(e, t) {
	return e.workers === null ? U(X(e.time)) : t.text("ui.graph.plan-at-once").replace("{count}", String(e.workers));
}
function $i(e, t, n, r) {
	let i = Xi(e.source ? e.consumed + e.target : e.produced, t);
	return n === void 0 ? i : `${i} · ${Qi(n, r)}`;
}
function ea(e, t) {
	return `×${Ki.format(X(e.runs))} · ${Qi(e, t)}`;
}
function X(e) {
	return Math.round(e * 1e6) / 1e6;
}
function Z(e) {
	return Ki.format(X(e));
}
//#endregion
//#region src/production/plan-panel.ts
var ta = "[data-ui-graph-plan]", na = "[data-ui-collapse-toggle]", ra = "data-ui-collapsed", ia = "[data-ui-graph-plan-targets]", aa = "[data-ui-graph-plan-add]", oa = "data-ui-graph-plan-remove", sa = "[data-ui-graph-plan-message]", ca = "[data-ui-graph-plan-totals]", la = "data-ui-graph-plan-rate", ua = "plan", da = class {
	services;
	host;
	panel;
	period;
	objective;
	drawnKey = "";
	constructor(e, t) {
		this.services = e, this.host = t, this.panel = e.root.querySelector(ta), this.period = this.field("[data-ui-graph-plan-period]"), this.objective = this.field("[data-ui-graph-plan-objective]"), this.period?.addEventListener("change", () => this.choose()), this.objective?.addEventListener("change", () => this.choose()), this.panel !== null && e.context.store.read(e.root, ua) === "folded" && (this.panel.setAttribute(ra, ""), this.panel.querySelector(na)?.setAttribute("aria-expanded", "false"));
	}
	field(e) {
		return this.panel?.querySelector(`${e} > *`) ?? null;
	}
	choose() {
		let e = this.services.context.values, t = this.period === null ? null : e.read(this.period), n = this.objective === null ? null : e.read(this.objective), r = this.host.request();
		this.host.change({
			...r,
			period: t === "Minute" || t === "Hour" ? t : "Once",
			objective: n === "LeastTime" || n === "LeastCost" ? n : "LeastRaw"
		});
	}
	contains(e) {
		return this.panel !== null && this.panel.contains(e);
	}
	press(e) {
		if (this.panel === null || !this.panel.contains(e)) return !1;
		if (e.closest(na) !== null) return this.services.context.store.write(this.services.root, ua, this.panel.hasAttribute(ra) ? "folded" : null), !0;
		if (this.services.settings.readOnly) return !0;
		if (e.closest(aa) !== null) return this.host.pick(), !0;
		let t = e.closest(`[${oa}]`)?.getAttribute(oa);
		if (t != null) {
			let e = this.host.request();
			return this.host.change({
				...e,
				targets: e.targets.filter((e) => e.resource !== t)
			}), !0;
		}
		let n = e.closest("[data-ui-graph-plan-item]")?.getAttribute("data-ui-graph-plan-item");
		return n != null && this.host.show(n), !0;
	}
	draw(e) {
		if (this.panel === null || e === this.drawnKey) return;
		this.drawnKey = e;
		let t = this.host.request(), n = this.host.reading(), r = this.services.settings.readOnly, i = this.services.context.properties;
		this.period !== null && (i.set(this.period, "Value", t.period), i.set(this.period, "IsReadOnly", r)), this.objective !== null && (i.set(this.objective, "Value", t.objective), i.set(this.objective, "IsReadOnly", r));
		let a = this.field(aa);
		a !== null && i.set(a, "Enabled", !r), this.panel.toggleAttribute(la, t.period !== "Once");
		for (let e of this.panel.querySelectorAll("[data-ui-graph-plan-counted]")) e.setAttribute("data-ui-graph-plan-counted", Yi(t.period, this.services.context.strings));
		this.drawTargets(t, r), this.drawMessage(t, n), this.drawTables(n);
	}
	drawTargets(e, t) {
		let n = this.panel.querySelector(ia);
		if (n !== null) {
			n.replaceChildren();
			for (let r of e.targets) {
				let e = this.host.resource(r.resource), i = document.createElement("div"), a = this.nameOf(r.resource, e?.title ?? r.resource, e?.icon ?? null), o = this.clone("graph-plan-amount"), s = this.clone("graph-plan-remove");
				i.className = "ui-graph__plan-target", i.append(a), o !== null && (this.services.context.properties.set(o, "Value", r.amount), this.services.context.properties.set(o, "IsReadOnly", t), o.addEventListener("change", () => this.setAmount(r.resource, this.services.context.values.read(o))), i.append(o)), s !== null && (s.setAttribute(oa, r.resource), this.services.context.properties.set(s, "Enabled", !t), i.append(s)), n.append(i);
			}
		}
	}
	clone(e) {
		let t = this.services.root.querySelector(`template[data-ui-graph-editor="${CSS.escape(e)}"]`)?.content.firstElementChild?.cloneNode(!0);
		return t instanceof HTMLElement ? t : null;
	}
	setAmount(e, t) {
		let n = typeof t == "number" ? t : Number(String(t ?? "").replace(",", ".")), r = this.host.request();
		if (!Number.isFinite(n) || n <= 0) {
			this.drawnKey = "", this.services.draw();
			return;
		}
		this.host.change({
			...r,
			targets: r.targets.map((t) => t.resource === e ? {
				...t,
				amount: n
			} : t)
		});
	}
	drawMessage(e, t) {
		let n = this.services.context.strings, r = this.panel.querySelector(sa), i = this.panel.querySelector(ca);
		r !== null && (r.hidden = t !== null, r.toggleAttribute("data-ui-graph-plan-failed", this.host.infeasible()), r.textContent = t === null ? n.text(e.targets.length > 0 && this.host.infeasible() ? "ui.graph.plan-infeasible" : "ui.graph.plan-empty") : ""), i !== null && (i.hidden = t === null, t !== null && (i.textContent = n.text("ui.graph.plan-totals").replace("{time}", U(X(t.plan.time))).replace("{raw}", Z(t.plan.raw)).replace("{cost}", Z(t.plan.cost))));
	}
	drawTables(e) {
		let t = this.services.context.strings, n = [], r = [], i = [];
		for (let t of e?.plan.resources ?? []) {
			let e = this.host.resource(t.resource), i = e?.unit === null || e?.unit === void 0 ? "" : ` ${e.unit}`, a = this.nameOf(t.resource, e?.title ?? t.resource, e?.icon ?? null);
			if (t.source) {
				n.push(fa(t.resource, a, `${Z(t.consumed + t.target)}${i}`));
				continue;
			}
			r.push(fa(t.resource, a, `${Z(t.produced)}${i}`, `${Z(t.consumed)}${i}`, t.surplus > 0 ? `${Z(t.surplus)}${i}` : "—"));
		}
		for (let n of e?.plan.crafts ?? []) {
			let e = this.host.craft(n.craft), r = this.nameOf(n.craft, e?.title ?? t.text("ui.graph.recipe"), e?.icon ?? null);
			i.push(fa(n.craft, r, Z(n.runs), U(X(n.time)), n.workers === null ? "—" : String(n.workers)));
		}
		this.fill("raw", n), this.fill("resources", r), this.fill("crafts", i);
	}
	fill(e, t) {
		let n = this.panel.querySelector(`[data-ui-graph-plan-section="${e}"]`), r = this.panel.querySelector(`[data-ui-graph-plan-rows="${e}"]`);
		n !== null && r !== null && (n.hidden = t.length === 0, r.replaceChildren(...t));
	}
	nameOf(e, t, n) {
		let r = document.createElement("span"), i = document.createElement("span");
		if (r.className = "ui-graph__plan-name", r.setAttribute("data-ui-graph-plan-item", e), r.title = t, n !== null) {
			let e = document.createElement("span");
			e.className = "ui-graph__plan-icon", e.setAttribute("aria-hidden", "true"), this.services.context.icons.apply(e, n), r.append(e);
		}
		return i.textContent = t, r.append(i), r;
	}
};
function fa(e, t, ...n) {
	let r = document.createElement("tr"), i = document.createElement("th");
	i.scope = "row", i.append(t), r.setAttribute("data-ui-graph-plan-item", e), r.append(i);
	for (let e of n) {
		let t = document.createElement("td");
		t.textContent = e, r.append(t);
	}
	return r;
}
//#endregion
//#region src/production/production-kind.ts
var pa = 32, ma = 84, ha = "graph:add-node", ga = "graph:amount", _a = "graph:output", va = "graph:craft-time", ya = "graph:delete-edge", ba = "graph:target", xa = "graph:bought", Sa = "data-ui-graph-target", Ca = {
	name: "production",
	readDocument: pi,
	create: (e) => new wa(e)
}, wa = class {
	snapsByCenter = !0;
	services;
	editing;
	sheet;
	panel;
	picker;
	server;
	serverById = /* @__PURE__ */ new Map();
	serverVersion = 0;
	structureKey = "";
	entries = [];
	entryById = /* @__PURE__ */ new Map();
	conflicts = /* @__PURE__ */ new Map();
	links = [];
	linkById = /* @__PURE__ */ new Map();
	collapsed = /* @__PURE__ */ new Set();
	drawn = [];
	outputs = /* @__PURE__ */ new Map();
	quiet = /* @__PURE__ */ new Set();
	reading = null;
	unreachable = !1;
	constructor(e) {
		let t = d(e.root.getAttribute(yn));
		this.services = e, this.server = Array.isArray(t) ? t.map(gi).filter((e) => e !== null) : [], this.editing = new ji(e, {
			entries: () => this.entries,
			collapsed: (e) => this.collapsed.has(e),
			craftEdge: (e) => this.links.find((t) => t.craft === e)?.id,
			entry: (e) => this.entryById.get(e),
			serverEntry: (e) => this.serverById.get(e),
			edge: (e) => this.linkById.get(e)
		}), this.sheet = new vn(e, {
			nodeIds: () => this.drawn.map((e) => e.id),
			links: () => this.links,
			layoutKey: () => this.reading === null ? this.shape : `${this.shape}|${this.drawn.map((e) => e.id).join(",")}`,
			nodeBox: (e, t, n) => this.shape === "icon" ? {
				width: Math.max(e, 96, n),
				height: t + 34
			} : {
				width: e,
				height: t
			}
		}, {
			nodeGap: pa,
			layerGap: ma
		}), this.panel = new da(e, {
			request: () => this.document.plan,
			reading: () => this.reading,
			infeasible: () => this.unreachable,
			resource: (e) => this.resource(e),
			craft: (e) => {
				let t = this.entryById.get(e);
				return t?.kind === "craft" ? t : void 0;
			},
			change: (e) => this.changePlan(e),
			pick: () => this.picker?.open(),
			show: (e) => this.show(e)
		}), this.picker = Gr.create(e.root, () => this.targetChoices(), e.context.strings, e.context.dom, e.context.icons, e.context.roving, (e) => this.setTarget(e.key, 1)), this.refresh();
	}
	targetChoices() {
		let e = new Set(this.document.plan.targets.map((e) => e.resource));
		return this.entries.flatMap((t) => t.kind === "resource" && !e.has(t.id) ? [{
			key: t.id,
			title: t.title ?? t.id,
			category: t.category,
			icon: t.icon
		}] : []);
	}
	get planning() {
		return this.services.root.getAttribute(Je) === "plan";
	}
	get editable() {
		return !this.planning && !this.services.settings.readOnly && this.services.root.hasAttribute("data-ui-graph-edit-structure");
	}
	get document() {
		return this.services.documentState.document;
	}
	get shape() {
		return Lt(this.services.root.getAttribute("data-ui-graph-node-shape")) ?? "icon";
	}
	applyChange(e) {
		Bt(this.server, e, gi), this.serverVersion++, this.services.draw();
	}
	refresh() {
		let e = this.document.draft, t = this.planning, n = `${this.serverVersion}|${JSON.stringify(e)}|${t ? JSON.stringify(this.document.plan) : ""}|${this.services.settings.readOnly}`;
		if (n === this.structureKey) return;
		this.structureKey = n, this.serverById = new Map(this.server.map((e) => [e.id, e])), this.entries = Ti(this.server, e);
		let r = t ? Bi(this.entries, this.document.plan) : null;
		this.reading = r?.status === "Solved" ? qi(r, this.document.plan.period) : null, this.unreachable = r?.status === "Infeasible";
		let i = this.reading === null ? this.entries : Ji(this.entries, this.reading), a = Di(i);
		this.links = a.edges, this.collapsed = a.collapsed, this.outputs = a.outputs, this.quiet = a.quiet, this.drawn = i.filter((e) => !this.collapsed.has(e.id)), this.conflicts = Ei(this.server, e), this.entryById = new Map(this.entries.map((e) => [e.id, e])), this.linkById = new Map(this.links.map((e) => [e.id, e])), this.sheet.structureChanged(), this.panel.draw(n);
	}
	resource(e) {
		let t = this.entryById.get(e);
		return t?.kind === "resource" ? t : void 0;
	}
	items() {
		return this.refresh(), this.sheet.items();
	}
	edges() {
		return this.refresh(), this.sheet.edges();
	}
	renderItem(e) {
		let t = this.entryById.get(e.id), n = this.conflicts.get(e.id) ?? null, r = this.services.context.strings;
		if (t?.kind === "craft") {
			let i = this.reading?.crafts.get(t.id);
			return li(e, t, {
				tooltips: this.services.context.tooltips,
				word: r.text("ui.graph.recipe"),
				connectable: this.editable,
				conflict: n,
				note: i === void 0 ? null : ea(i, r),
				resource: (e) => this.resource(e)
			});
		}
		let i = t ?? {
			id: e.id,
			title: null,
			icon: null,
			color: null,
			tooltip: null,
			image: null,
			category: null,
			unit: null
		}, a = this.outputs.get(i.id), o = this.reading?.resources.get(i.id), s = o !== void 0 && this.reading !== null ? $i(o, i.unit ?? null, a !== void 0 && this.collapsed.has(a.craft) ? this.reading.crafts.get(a.craft) : void 0, r) : a === void 0 ? null : di(a.amount, i.unit ?? null, a.time), c = xt(e, {
			id: i.id,
			title: i.title,
			subtitle: i.category,
			icon: i.icon,
			image: i.image,
			shape: null,
			color: i.color,
			badge: s,
			tooltip: i.tooltip,
			links: []
		}, {
			icons: this.services.context.icons,
			tooltips: this.services.context.tooltips,
			shape: this.shape,
			connectable: this.editable,
			conflict: n
		});
		return this.planning && this.document.plan.targets.some((e) => e.resource === i.id) && c.setAttribute(Sa, ""), c;
	}
	itemsDrawn() {
		this.sheet.itemsDrawn();
	}
	itemColor(e) {
		return this.entryById.get(e.id)?.color ?? "";
	}
	edgeEnds(e) {
		let t = this.linkById.get(e.id), n = t === void 0 ? null : this.sheet.ends(t);
		return t === void 0 || n === null ? null : {
			...n,
			arrow: !0,
			conflict: t.role === "recipe" && this.conflicts.has(t.craft),
			label: this.quiet.has(t.id) ? null : this.amountOf(t)
		};
	}
	amountOf(e) {
		let t = this.resource(e.resource)?.unit ?? null, n = this.reading?.crafts.get(e.craft);
		return n === void 0 || this.reading === null ? W(e.amount, t) : e.role === "product" ? Xi(n.runs * e.amount, t) : Zi(n.runs * e.amount, this.reading.resources.get(e.resource), t);
	}
	related(e) {
		return ut(this.links, e);
	}
	edgeColor() {
		return "var(--ui-text-muted)";
	}
	isEditor() {
		return !1;
	}
	isPanel(e) {
		return this.panel.contains(e);
	}
	pointerDown(e, t) {
		let n = t.closest(`[${j}]`);
		return n === null || !this.editable ? !1 : this.editing.beginLink(n) ?? !0;
	}
	chrome(e) {
		return this.panel.press(e);
	}
	backgroundDoubleClick() {}
	escape() {
		this.picker?.close();
	}
	changePlan(e) {
		this.services.settings.readOnly || (this.document.plan = e, this.services.documentState.edited());
	}
	setTarget(e, t) {
		let n = this.document.plan, r = n.targets.filter((t) => t.resource !== e);
		t === null ? this.changePlan({
			...n,
			targets: r
		}) : r.length === n.targets.length ? this.changePlan({
			...n,
			targets: [...n.targets, {
				resource: e,
				amount: t
			}]
		}) : this.changePlan({
			...n,
			targets: n.targets.map((n) => n.resource === e ? {
				resource: e,
				amount: t
			} : n)
		});
	}
	editTarget(e) {
		let t = this.services.nodeRect(e);
		if (t === null || this.resource(e) === void 0) return;
		let n = this.document.plan.targets.find((t) => t.resource === e);
		N(this.services, {
			x: t.x + t.width / 2,
			y: t.y + t.height / 2
		}, n === void 0 ? "" : String(n.amount), (t) => {
			t.trim().length === 0 ? this.setTarget(e, null) : G(t) !== null && this.setTarget(e, G(t));
		});
	}
	show(e) {
		let t = this.services.nodeRect(e);
		t !== null && (this.services.selection.selectOnly(e), this.services.view.centerOnRect(t, 0, 0), this.services.draw());
	}
	copy() {}
	paste() {
		return null;
	}
	remove(e, t) {
		this.editable && (this.editing.removeEdges(t), this.editing.removeEntries(e));
	}
	canEditItems() {
		return this.editable;
	}
	renameItem(e, t) {
		return this.editable && this.editing.rename(e, t), !0;
	}
	paintItem(e, t) {
		return this.editable && this.editing.paint(e, t), !0;
	}
	hasEdgeMenu() {
		return !0;
	}
	arrange(e, t) {
		return this.sheet.arrange(e, t);
	}
	runCommand(e, t) {
		let n = e === ha || e === ga || e === _a || e === va || e === ya;
		if (e === "graph:link-ingredient" || e === "graph:link-recipe") return this.editable && this.editing.answerLink(e === "graph:link-ingredient"), !0;
		if (e === "graph:take-server" || e === "graph:keep-mine") {
			let n = this.conflictOf(t);
			if (n !== null && !this.services.settings.readOnly) {
				let t = this.document.draft, r = e === "graph:keep-mine";
				(Ot(t.resources, n, this.serverById.get(n), r) || Ot(t.crafts, n, this.serverById.get(n), r)) && this.services.documentState.edited();
			}
			return !0;
		}
		if (e === xa) {
			if (this.planning && t?.kind === "node" && this.isMade(t.id)) {
				let e = this.document.plan, n = e.bought ?? [];
				this.changePlan({
					...e,
					bought: n.includes(t.id) ? n.filter((e) => e !== t.id) : [...n, t.id]
				});
			}
			return !0;
		}
		if (e === ba) return this.planning && t?.kind === "node" && this.editTarget(t.id), !0;
		if (!n || !this.editable) return n;
		switch (e) {
			case ha:
				this.editing.addResource();
				break;
			case ga:
				t?.kind === "edge" && this.editing.editAmount(t.id);
				break;
			case _a:
				t?.kind === "edge" && this.editing.editOutput(t.id);
				break;
			case va:
				t !== null && this.editing.editTime(t.kind === "node" ? t.id : this.linkById.get(t.id)?.craft ?? "");
				break;
			default: t?.kind === "edge" && (this.editing.removeEdges(/* @__PURE__ */ new Set([t.id])), this.services.documentState.edited());
		}
		return !0;
	}
	isMade(e) {
		return this.entries.some((t) => t.kind === "craft" && t.products.some((t) => t.resource === e && t.amount > 0));
	}
	conflictOf(e) {
		let t = e?.kind === "node" ? e.id : e?.kind === "edge" ? this.linkById.get(e.id)?.craft ?? null : null;
		return t !== null && this.conflicts.has(t) ? t : null;
	}
	syncMenus(e, t) {
		let n = e && this.editable, r = e && this.conflictOf(t) !== null;
		E(this.services.root, "graph:take-server", r), E(this.services.root, "graph:keep-mine", r);
		let i = t?.kind === "node" && this.entryById.get(t.id)?.kind === "craft", a = t?.kind === "edge" && this.linkById.get(t.id)?.role === "recipe";
		for (let e of [
			ha,
			ga,
			ya
		]) T(this.services.root, e, n);
		let o = this.planning && t?.kind === "node" && this.resource(t.id) !== void 0, s = o && this.isMade(t.id);
		E(this.services.root, ba, o), E(this.services.root, xa, s), T(this.services.root, ba, e && o), T(this.services.root, xa, e && s), Pe(this.services.root, xa, s && (this.document.plan.bought ?? []).includes(t.id)), T(this.services.root, _a, n && a), T(this.services.root, va, n && (i || a));
	}
}, Ta = "graph.set-node-status", Ea = "graph.set-node-display", Da = "graph.set-node-value", Oa = "graph.add-node-log", ka = "graph.set-run-progress";
function Aa(e, t) {
	e.registerEvent("node-click", { dynamicParameters: (e) => [e.domEvent.detail?.nodeId ?? ""] }), e.registerEvent(Jr, { dynamicParameters: (e) => [...e.domEvent.detail?.keys ?? []] });
	let n = (e, n) => {
		let r = e.effect, i = at(e, r), a = i === null ? null : t()?.kindOf(i, ri) ?? null;
		a !== null && r.nodeId !== void 0 && n(a, r.nodeId, r);
	};
	e.registerEffect({
		kind: Ta,
		handler: (e) => n(e, (e, t, n) => e.setStatus(t, n.state ?? "Idle", typeof n.progress == "number" ? n.progress : null, typeof n.message == "string" ? n.message : null))
	}), e.registerEffect({
		kind: Ea,
		handler: (e) => n(e, (e, t, n) => e.setDisplay(t, n.pinName ?? "", n.value))
	}), e.registerEffect({
		kind: Da,
		handler: (e) => n(e, (e, t, n) => e.setPinValue(t, n.pinName ?? "", n.value))
	}), e.registerEffect({
		kind: Oa,
		handler: (e) => n(e, (e, t, n) => e.addLog(t, String(n.level ?? "Info"), String(n.message ?? "")))
	}), e.registerEffect({
		kind: ka,
		handler: (e) => {
			let n = e.effect, r = at(e, n);
			(r === null ? null : t()?.kindOf(r, ri) ?? null)?.setRunProgress(Number(n.completed) || 0, Number(n.total) || 0);
		}
	});
}
//#endregion
//#region src/graph.ts
var Q = lt(), ja = [
	ni,
	xn,
	Ca
], $ = null;
Q.registerEngine((e) => {
	$ = new it(e, ja);
}), Q.registerEvent("save", {
	settlesValue: !0,
	submitsForm: !0,
	dynamicParameters: (e) => [e.domEvent.detail?.reason ?? ""],
	completed: (e) => $?.saveCompleted(e.component, e.success)
}), Q.registerEvent("menu-entry", { dynamicParameters: (e) => [...e.domEvent.detail?.keys ?? []] }), Q.registerValueReader({
	kind: nt,
	read: (e) => d(e.getAttribute(t))
}), Q.registerDomOperation({
	kind: nt,
	handler: (e) => e.target.setAttribute(t, JSON.stringify(e.value ?? null))
}), Q.registerConverter("graph-edge-shape", (e) => String(e ?? "Orthogonal").toLowerCase()), Q.registerConverter("graph-rem", (e) => typeof e == "number" && e > 0 ? `${e}rem` : ""), Q.registerConverter("graph-direction", (e) => {
	let t = String(e ?? "");
	return t === "TopToBottom" ? "down" : t === "RightToLeft" ? "left" : t === "BottomToTop" ? "up" : "right";
}), Q.registerConverter("graph-node-shape", (e) => String(e ?? "") === "Icon" ? "icon" : "card"), Q.registerConverter("graph-production-mode", (e) => String(e ?? "") === "Plan" ? "plan" : "constructor"), Q.registerEffect({
	kind: rt,
	handler: (e) => {
		let t = e.effect, n = at(e, t);
		n !== null && $?.requestSave(n, typeof t.reason == "string" ? t.reason : "");
	}
}), Aa(Q, () => $), Q.registerCollectionSink({
	kind: "graph",
	handler: (e) => $?.kindOf(e.component, Sn)?.applyChange(e)
}), Q.registerCollectionSink({
	kind: "production",
	handler: (e) => $?.kindOf(e.component, wa)?.applyChange(e)
});
//#endregion
