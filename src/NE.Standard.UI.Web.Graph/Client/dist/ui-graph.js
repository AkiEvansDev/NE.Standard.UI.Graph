//#region src/canvas/canvas-dom.ts
var e = ".ui-graph", t = "data-ui-graph-document", n = "data-ui-graph-group", r = "data-ui-graph-selected", i = "data-ui-graph-edge", a = "data-ui-graph-reroute", o = "data-ui-graph-node", s = "data-ui-graph-pin-toggle", c = "data-ui-graph-fold", l = "data-ui-graph-collapsed", u = ".ui-graph__node-title", d = class {
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
		return t !== this.present && (this.past.push(this.present), this.past.length > this.depth && this.past.shift(), this.future.length = 0, this.present = t, !0);
	}
	absorb(e) {
		this.present = e;
	}
	commit(e) {
		for (let t = 0; t < this.past.length; t++) this.past[t] = f(this.past[t], e);
		for (let t = 0; t < this.future.length; t++) this.future[t] = f(this.future[t], e);
		this.saved = f(this.saved, e);
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
function f(e, t) {
	let n = JSON.parse(e);
	return t(n), JSON.stringify(n);
}
//#endregion
//#region src/canvas/canvas-model.ts
function p(e) {
	return typeof e.key == "string" ? e.key : null;
}
function m(e) {
	if (e === null || e.length === 0) return null;
	try {
		return JSON.parse(e);
	} catch {
		return null;
	}
}
function h(e) {
	let t = Number(e);
	return Number.isFinite(t) && t > 0 ? t : null;
}
function g(e) {
	return (e ?? []).map((e) => ({
		x: Number(e.x) || 0,
		y: Number(e.y) || 0
	}));
}
function _(e) {
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
function v(e) {
	return `${e}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
//#endregion
//#region src/canvas/canvas-document.ts
var y = "auto", ee = class {
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
	saves = 0;
	sentId = 0;
	constructor(e, n, r, i, a, o) {
		this.root = e, this.valueElement = n, this.settings = r, this.callbacks = a, this.values = o, this.documentValue = i(m(this.valueElement.getAttribute(t))), this.history = new d(this.documentValue, i);
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
		let t = this.history.record(this.documentValue);
		this.version++, this.showDirty(), e ? this.callbacks.redraw() : this.callbacks.redrawEdges(), this.settings.autoSave && t && queueMicrotask(() => this.save(y));
	}
	committed(e, t = !0) {
		let n = !this.history.dirty;
		e(this.documentValue), this.version++, this.history.commit(e), this.history.absorb(JSON.stringify(this.documentValue)), this.sent === null ? n && this.history.markSaved() : this.sent = f(this.sent, e), this.showDirty(), t && this.callbacks.redraw();
	}
	save(e = "") {
		if (this.settings.readOnly) return;
		if (this.sent !== null) {
			(this.queuedSave === null || !b(this.queuedSave) || b(e)) && (this.queuedSave = e);
			return;
		}
		let n = JSON.stringify(this.documentValue);
		this.history.absorb(n), this.valueElement.setAttribute(t, n), this.valueElement.dispatchEvent(new Event("change", { bubbles: !0 })), this.sent = n, this.sentId = ++this.saves, this.root.classList.add("ui-graph--saving"), this.raiseSave(e, this.sentId);
	}
	raiseSave(e, t) {
		this.valueElement.dispatchEvent(new CustomEvent("save", {
			bubbles: !0,
			detail: {
				reason: e,
				id: t
			}
		}));
	}
	requestSave(e) {
		this.settings.readOnly ? this.raiseSave(e, ++this.saves) : this.save(e);
	}
	saveCompleted(e, t) {
		(t === void 0 || t === this.sentId) && this.finishSend(e);
	}
	settle() {
		this.sent !== null && this.finishSend(!0);
	}
	finishSend(e) {
		let t = this.sent;
		this.sent = null, this.sentId = 0, this.root.classList.remove("ui-graph--saving"), e && t !== null && (this.history.markSaved(t), this.showDirty());
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
		this.documentValue = e, this.version++, this.showDirty(), this.callbacks.redraw(), this.settings.autoSave && this.history.dirty && queueMicrotask(() => this.save(y));
	}
};
function b(e) {
	return e !== "" && e !== y;
}
var te = 6;
function x(e, t = {}) {
	let n = t.spacing ?? 14, r = t.margin ?? 14, i = e.filter((e) => Math.abs(e.from.across - e.to.across) > .5 && e.to.along - e.from.along >= 48).sort((e, t) => e.from.along - t.from.along || e.from.across - t.from.across), a = /* @__PURE__ */ new Map();
	for (let e of ne(i, n, r)) {
		let t = pe(ce(e.legs)), { middle: i, step: o } = oe(e, t.length, n, r);
		t.forEach((e, n) => {
			for (let r of e.legs) a.set(r.id, i + (n - (t.length - 1) / 2) * o);
		});
	}
	return a;
}
function ne(e, t, n) {
	let r = e.map((e) => ae({
		legs: [e],
		low: e.from.along,
		high: e.to.along,
		top: Math.min(e.from.across, e.to.across),
		bottom: Math.max(e.from.across, e.to.across),
		turns: (e.from.along + e.to.along) / 2,
		from: 0,
		to: 0
	}, t, n));
	for (let e = 0; e < r.length; e++) for (let i = 0; i < r.length; i++) i !== e && re(r[e], r[i], t) && (ie(r[e], r[i], t, n), r.splice(i, 1), i < e && e--, i = -1);
	return r;
}
function re(e, t, n) {
	return e.top <= t.bottom + n && t.top <= e.bottom + n && Math.max(e.low, t.low) < Math.min(e.high, t.high) && e.from < t.to + n && t.from < e.to + n;
}
function ie(e, t, n, r) {
	e.legs.push(...t.legs), e.low = Math.max(e.low, t.low), e.high = Math.min(e.high, t.high), e.top = Math.min(e.top, t.top), e.bottom = Math.max(e.bottom, t.bottom), e.turns += t.turns, ae(e, n, r);
}
function ae(e, t, n) {
	let r = se(e.legs), { middle: i, step: a } = oe(e, r, t, n), o = (r - 1) / 2 * a;
	return e.from = i - o, e.to = i + o, e;
}
function oe(e, t, n, r) {
	let i = Math.max(0, e.high - e.low - r * 2), a = t > 1 ? Math.min(n, i / (t - 1)) : 0, o = (t - 1) / 2 * a, s = e.low + r + o, c = e.high - r - o, l = e.turns / e.legs.length;
	return {
		middle: s <= c ? Math.min(Math.max(l, s), c) : (e.low + e.high) / 2,
		step: a
	};
}
function se(e) {
	let t = le(e), n = /* @__PURE__ */ new Set();
	for (let r of e) n.add(ue(r, t));
	return n.size;
}
function ce(e) {
	let t = le(e), n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = ue(r, t), i = n.get(e);
		i === void 0 ? n.set(e, [r]) : i.push(r);
	}
	return [...n.values()].map((e) => {
		let t = Infinity, n = -Infinity, r = 0;
		for (let i of e) t = Math.min(t, i.from.across, i.to.across), n = Math.max(n, i.from.across, i.to.across), r += i.from.across;
		return {
			legs: e,
			min: t,
			max: n,
			mean: r / e.length
		};
	});
}
function le(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		let e = fe(n).from;
		t.set(e, (t.get(e) ?? 0) + 1);
	}
	return t;
}
function ue(e, t) {
	let n = fe(e);
	return (t.get(n.from) ?? 0) > 1 ? n.fromLane : n.toLane;
}
var de = /* @__PURE__ */ new WeakMap();
function fe(e) {
	let t = de.get(e);
	if (t === void 0) {
		let n = `${e.source}@${Math.round(e.from.across)}`, r = `${e.target}@${Math.round(e.to.across)}`;
		t = {
			from: n,
			to: r,
			fromLane: `from:${n}`,
			toLane: `to:${r}`
		}, de.set(e, t);
	}
	return t;
}
function pe(e) {
	let t = [...e].sort((e, t) => e.mean - t.mean || e.min - t.min);
	if (t.length < 2 || t.length > te) return t;
	let n = t.map((e) => t.map((t) => e === t ? 0 : me(e, t))), r = (e) => {
		let t = 0;
		for (let r = 0; r < e.length; r++) for (let i = r + 1; i < e.length; i++) t += n[e[r]][e[i]];
		return t;
	}, i = t.map((e, t) => t), a = r(i);
	for (let e of ge(i)) {
		let t = r(e);
		t < a && (i = e, a = t);
	}
	return i.map((e) => t[e]);
}
function me(e, t) {
	let n = 0;
	for (let r of e.legs) n += +!!he(r.to.across, t);
	for (let r of t.legs) n += +!!he(r.from.across, e);
	return n;
}
function he(e, t) {
	return e > t.min + .5 && e < t.max - .5;
}
function* ge(e) {
	if (e.length <= 1) {
		yield [...e];
		return;
	}
	for (let t = 0; t < e.length; t++) for (let n of ge([...e.slice(0, t), ...e.slice(t + 1)])) yield [e[t], ...n];
}
//#endregion
//#region src/canvas/geometry.ts
var _e = 12, ve = 9, ye = 7;
function be(e, t, n, r = []) {
	return xe(e, t, n, r).path;
}
function xe(e, t, n, r = [], i = {}) {
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
	].map(s), u = (i.back === !0 && r.length === 0 ? De(l[0], l[1]) : e === "straight" ? Ce(l) : e === "orthogonal" ? Ee(l, (i.turns ?? []).map((e) => e === void 0 ? void 0 : e * o)) : we(l)).map((e) => ({
		op: e.op,
		points: e.points.map(c)
	}));
	return {
		path: Se(u),
		arrow: i.arrow === !0 ? Oe(u) : null
	};
}
function Se(e) {
	return e.map((e) => `${e.op}${e.points.map((e) => `${S(e.x)},${S(e.y)}`).join(" ")}`).join(" ");
}
function Ce(e) {
	return e.map((e, t) => ({
		op: t === 0 ? "M" : "L",
		points: [e]
	}));
}
function we(e) {
	let t = [{
		op: "M",
		points: [e[0]]
	}];
	for (let n = 1; n < e.length; n++) {
		let r = e[n - 1], i = e[n], a = Te(r, i);
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
function Te(e, t) {
	let n = t.x - e.x;
	return n >= 0 ? Math.min(Math.max(n * .5, 24), 160) : Math.min(Math.max(-n * .6 + 40, 60), 220);
}
function Ee(e, t) {
	let n = [{
		op: "M",
		points: [e[0]]
	}], r = (e, t) => {
		n.push({
			op: "L",
			points: [{
				x: S(e),
				y: S(t)
			}]
		});
	};
	for (let n = 1; n < e.length; n++) {
		let i = e[n - 1], a = e[n];
		if (a.x - i.x >= 48) {
			let e = Math.min(a.x - _e, Math.max(i.x + _e, t[n - 1] ?? (i.x + a.x) / 2));
			r(e, i.y), r(e, a.y), r(a.x, a.y);
		} else {
			let e = i.x + 24, t = a.x - 24, n = (i.y + a.y) / 2;
			r(e, i.y), r(e, n), r(t, n), r(t, a.y), r(a.x, a.y);
		}
	}
	return n;
}
function De(e, t) {
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
function Oe(e) {
	let t = e[e.length - 1], n = t.points[t.points.length - 1], r = t.points.length > 1 ? t.points[t.points.length - 2] : e.length > 1 ? e[e.length - 2].points[e[e.length - 2].points.length - 1] : null;
	if (r === null) return null;
	let i = n.x - r.x, a = n.y - r.y, o = Math.hypot(i, a);
	if (o === 0) return null;
	let s = i / o, c = a / o, l = n.x - s * ve, u = n.y - c * ve, d = ye / 2;
	return `M${S(n.x)},${S(n.y)} L${S(l - c * d)},${S(u + s * d)} L${S(l + c * d)},${S(u - s * d)} Z`;
}
function S(e) {
	return Math.round(e * 100) / 100;
}
function ke(e) {
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
function Ae(e, t) {
	return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function je(e, t) {
	return t.x >= e.x && t.y >= e.y && t.x + t.width <= e.x + e.width && t.y + t.height <= e.y + e.height;
}
function Me(e, t, n, r, i, a = 48) {
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
var Ne = 33, Pe = 400, Fe = 100, Ie = 300;
function Le(e, t, n) {
	let r = t * (n === 1 ? Ne : n === 2 ? Pe : 1);
	return !Number.isFinite(r) || Math.abs(r) < .5 || Math.abs(e) > Math.abs(t) ? 1 : Math.exp(-Math.max(-300, Math.min(Ie, r)) * Math.log(1.1) / Fe);
}
function C(e, t, n) {
	return n && t > 0 ? Math.round(e / t) * t : e;
}
function Re(e, t, n) {
	let r = n.x - t.x, i = n.y - t.y, a = r * r + i * i;
	if (a === 0) return Math.hypot(e.x - t.x, e.y - t.y);
	let o = Math.min(1, Math.max(0, ((e.x - t.x) * r + (e.y - t.y) * i) / a));
	return Math.hypot(e.x - (t.x + o * r), e.y - (t.y + o * i));
}
function ze(e) {
	let t = e.getPointAtLength(e.getTotalLength() / 2);
	return {
		x: t.x,
		y: t.y
	};
}
//#endregion
//#region src/canvas/canvas-selection.ts
var Be = class {
	nodeElements;
	groupLayer;
	marquee;
	host;
	selection = /* @__PURE__ */ new Set();
	beforeMarquee = /* @__PURE__ */ new Set();
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
		this.beforeMarquee = new Set(this.selection), this.marquee.hidden = !1;
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
			t !== null && (Ae(i, t) || this.beforeMarquee.has(e.id) ? this.selection.add(e.id) : this.selection.delete(e.id));
		}
		this.markSelection();
	}
};
function w(e) {
	return e.ctrlKey || e.metaKey;
}
//#endregion
//#region src/canvas/canvas-drag.ts
var Ve = class {
	selection;
	host;
	settings;
	constructor(e, t, n) {
		this.selection = e, this.host = t, this.settings = n;
	}
	beginNodeDrag(e, t, n) {
		if (this.selection.has(t) ? w(e) && this.selection.select(t, !0) : this.selection.select(t, w(e)), this.settings.readOnly) return null;
		let r = /* @__PURE__ */ new Map(), i = this.itemsById();
		for (let e of this.selection.nodeIds) {
			let t = i.get(e);
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
	itemsById() {
		return new Map(this.host.items().map((e) => [e.id, e]));
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
		let r = this.findGroup(t);
		if (r === void 0 || (this.selection.select(t, w(e)), this.settings.readOnly || r.pinned === !0)) return null;
		let i = {
			x: r.x,
			y: r.y,
			width: r.width,
			height: r.height
		}, a = /* @__PURE__ */ new Map();
		for (let e of this.host.items()) {
			let t = this.host.nodeRect(e.id);
			e.pinned !== !0 && t !== null && je(i, t) && a.set(e.id, {
				x: e.x,
				y: e.y
			});
		}
		return {
			kind: "group",
			startX: n.x,
			startY: n.y,
			groupId: t,
			origin: {
				x: r.x,
				y: r.y
			},
			moving: a
		};
	}
	findGroup(e) {
		return this.host.groups().find((t) => t.id === e);
	}
	moveNodes(e, t, n) {
		let r = this.itemsById();
		for (let [i, a] of e) {
			let e = r.get(i);
			e !== void 0 && (e.x = a.x + t, e.y = a.y + n, this.placeNode(i, e));
		}
		this.host.drawEdges(), this.host.drawMinimap();
	}
	moveGroup(e, t) {
		let n = t.x - e.startX, r = t.y - e.startY, i = this.findGroup(e.groupId);
		i !== void 0 && (i.x = e.origin.x + n, i.y = e.origin.y + r), this.moveNodes(e.moving, n, r), this.host.drawGroups();
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
			x: C(t.x + i, n, !0) - i,
			y: C(t.y + a, n, !0) - a
		};
	}
	snapSize(e) {
		let t = this.host.items().find((t) => t.id === e), n = this.host.nodeElements.get(e);
		if (t === void 0 || n === void 0) return;
		let r = this.settings.gridSize;
		this.resizeNode(e, C(n.offsetWidth, r, !0), C(n.offsetHeight, r, !0)), He(n, r), t.width = n.offsetWidth, t.height = n.offsetHeight;
	}
	settleGroup(e) {
		let t = this.findGroup(e.groupId);
		t !== void 0 && (t.x = C(t.x, this.settings.gridSize, !0), t.y = C(t.y, this.settings.gridSize, !0)), this.snapNodes(e.moving.keys()), this.host.drawGroups();
	}
	placeNode(e, t) {
		let n = this.host.nodeElements.get(e);
		n?.style.setProperty("--ui-graph-node-x", String(t.x)), n?.style.setProperty("--ui-graph-node-y", String(t.y));
	}
};
function He(e, t) {
	Ue([e], t);
}
function Ue(e, t) {
	if (t <= 0) return;
	let n = [...e].map((e) => ({
		element: e,
		width: e.offsetWidth,
		height: e.offsetHeight,
		folded: e.hasAttribute(l)
	}));
	for (let { element: e, width: r, height: i, folded: a } of n) {
		let n = Math.ceil((r - .5) / t) * t, o = Math.ceil((i - .5) / t) * t;
		n !== r && e.style.setProperty("--ui-graph-node-w", String(n)), o !== i && !a && e.style.setProperty("--ui-graph-node-h", String(o));
	}
}
//#endregion
//#region src/canvas/canvas-menus.ts
var We = "data-ui-graph-colors", Ge = "data-ui-context-menu", T = "data-ui-context-menu-use", Ke = "graph-node-menu", qe = "graph-group-menu", Je = "graph-edge-menu", E = "data-ui-graph-menu-panel", Ye = `[${Ge}], [${E}]`, Xe = "data-ui-collapse-toggle", Ze = "ui-menu-item", Qe = "ui-menu-item--checked", $e = "data-ui-graph-swatch", et = "graph:color:", tt = "graph:color:default", nt = class {
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
		this.root = e, this.context = t, this.documentState = n, this.selection = r, this.view = i, this.settings = a, this.host = o, this.groupLayer = s, this.colors = rt(e.getAttribute(We));
	}
	panelToggleOf(e) {
		return e.closest("[data-ui-graph-menu-panel]") === null ? null : e.closest(`[${Xe}]`);
	}
	foldPanel() {
		let e = this.root.querySelector(`[${E}] > .ui-menu`);
		e !== null && !e.hasAttribute("data-ui-collapsed") && e.querySelector(`:scope > [${Xe}]`)?.click();
	}
	prepareMenus(e) {
		if (!(e instanceof Element) || e.closest(Ye) !== null) return;
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
		for (let t of [Ke, qe]) {
			let n = this.root.querySelector(`[${Ge}="${t}"]`), r = this.menuItem(t);
			if (n === null) continue;
			for (let t of k(n, "graph:pin")) ct(t, r?.pinned === !0), st(t, e);
			let i = e && (t === "graph-group-menu" || this.host.kind().canEditItems());
			for (let e of k(n, "graph:rename")) st(e, i);
			this.syncColors(n, r?.color ?? null, i);
		}
	}
	enableEntries(e, t) {
		D(this.root, e, t);
	}
	syncColors(e, t, n) {
		let r = "";
		for (let n of e.querySelectorAll(`[data-ui-key^="${et}"]`)) {
			let e = ot(n), i = n.getAttribute("data-ui-key") ?? "", a = i === tt ? null : this.colors[Number(i.slice(12))] ?? null, o = a === null ? t === null || t.length === 0 : a === t;
			e !== null && (e.setAttribute($e, ""), e.style.setProperty("--ui-graph-swatch", a ?? "transparent"), ct(e, o), o && (r = e.textContent?.trim() ?? ""));
		}
		for (let t of k(e, "graph:color")) {
			st(t, n);
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
		if (e.startsWith(et)) {
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
		let n = this.menuItems(e), r = t === tt ? null : this.colors[Number(t.slice(12))];
		if (!(n.length === 0 || this.settings.readOnly || r === void 0)) {
			for (let t of n) (e !== "graph-node-menu" || !this.host.kind().paintItem(t.id, r)) && (t.color = r);
			this.documentState.edited(), this.syncMenus();
		}
	}
	renameItem(e) {
		let t = this.menuItem(e);
		t !== void 0 && this.openRename(t, e === Ke);
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
		let t = ke(e);
		t !== null && (this.documentState.document.groups.push({
			id: v("g"),
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
			n !== void 0 && e.pinned !== !0 && (e.x = n.x, e.y = n.y);
		}
		this.documentState.edited(), this.view.fit();
	}
};
function rt(e) {
	let t = m(e);
	return Array.isArray(t) ? t.map((e) => String(e)) : [];
}
function it(e, t, n, r) {
	let i = document.createElement("span");
	i.setAttribute(T, t), i.hidden = !0, (e.querySelector(".ui-graph__viewport") ?? e).append(i), i.dispatchEvent(new MouseEvent("contextmenu", {
		bubbles: !0,
		cancelable: !0,
		button: 2,
		clientX: n,
		clientY: r
	})), i.remove();
}
function D(e, t, n) {
	for (let r of k(e, t)) st(r, n);
}
function at(e, t, n) {
	for (let r of k(e, t)) ct(r, n);
}
function O(e, t, n) {
	for (let r of k(e, t)) {
		let e = r.closest("[data-ui-key]") ?? r;
		e.style.display = n ? "" : "none";
	}
}
function k(e, t) {
	let n = [];
	for (let r of e.querySelectorAll(`:is(${Ye}) [data-ui-key="${CSS.escape(t)}"]`)) {
		let e = ot(r);
		e !== null && n.push(e);
	}
	return n;
}
function ot(e) {
	return e.classList.contains(Ze) ? e : e.querySelector(`:scope > .${Ze}`);
}
function st(e, t) {
	e.classList.toggle("ui-disabled", !t), e.toggleAttribute("inert", !t), e.setAttribute("aria-disabled", String(!t));
}
function ct(e, t) {
	e.classList.toggle(Qe, t), e.setAttribute("aria-checked", String(t));
}
//#endregion
//#region src/canvas/canvas-render.ts
var lt = "http://www.w3.org/2000/svg", ut = "ui-graph--edge-focus", A = "data-ui-graph-related", dt = [
	.5,
	.38,
	.62,
	.26,
	.74
], ft = class {
	context;
	scene;
	nodeLayer;
	groupLayer;
	edgeLayer;
	labelLayer;
	nodeElements;
	documentState;
	selection;
	settings;
	view;
	kind;
	nodeWatchers = [];
	nodeBoxes = /* @__PURE__ */ new Map();
	drawnItems = /* @__PURE__ */ new Map();
	labelObstacles = null;
	edgesQueued = !1;
	focusItem = null;
	edgeParts = /* @__PURE__ */ new Map();
	constructor(e, t, n, r, i, a, o, s, c, l, u, d) {
		this.context = e, this.scene = t, this.nodeLayer = n, this.groupLayer = r, this.edgeLayer = i, this.labelLayer = a, this.nodeElements = o, this.documentState = s, this.selection = c, this.settings = l, this.view = u, this.kind = d;
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
		this.nodeWatchers.length = 0, this.nodeBoxes.clear(), this.nodeLayer.replaceChildren(), this.nodeElements.clear(), this.drawnItems.clear();
		for (let n of e.items()) {
			let i = e.renderItem(n);
			this.drawnItems.set(n.id, n), this.selection.has(n.id) && i.setAttribute(r, ""), i.setAttribute(T, Ke), this.nodeLayer.append(i), this.nodeElements.set(n.id, i), t.add(n.id);
		}
		let n = new Set(t);
		for (let e of this.documentState.document.groups) n.add(e.id);
		this.selection.pruneNodes(n), e.itemsDrawn(t), this.watchSizes(), this.markFocus();
	}
	watchSizes() {
		for (let [e, t] of this.nodeElements) this.nodeBoxes.set(e, pt(t));
		for (let [e, t] of this.nodeElements) this.nodeWatchers.push(this.context.observeSize(t, () => this.nodeResized(e, t)));
	}
	nodeResized(e, t) {
		let n = pt(t);
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
			if (i.className = "ui-graph__group-band", i.setAttribute(T, qe), a.className = "ui-graph__group-title", a.textContent = e.title ?? this.context.strings.text("ui.graph.group"), i.append(a), e.pinned === !0) {
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
		this.root.classList.toggle(ut, t !== null && t.size > 0);
		for (let [e, n] of this.edgeParts) for (let r of n) r.toggleAttribute(A, t !== null && t.has(e));
		for (let [e, t] of this.nodeElements) t.toggleAttribute(A, n !== null && n.has(e));
	}
	drawEdges() {
		let e = this.kind(), t = e.hasEdgeMenu();
		this.edgeLayer.replaceChildren(), this.labelLayer.replaceChildren(), this.edgeParts.clear(), this.labelObstacles = null;
		let n = this.focusItem === null ? null : new Set(e.related(this.focusItem).edges), o = [];
		for (let s of e.edges()) {
			let c = e.edgeEnds(s);
			if (c === null) continue;
			let l = [], u = n !== null && n.has(s.id);
			this.edgeParts.set(s.id, l);
			let d = e.edgeColor(s), f = s.points.length === 0 && c.via !== void 0 ? c.via : s.points, p = xe(this.settings.edgeShape, c.from, c.to, f, {
				axis: c.axis,
				back: c.back,
				arrow: c.arrow,
				reversed: c.reversed,
				turns: s.points.length === 0 ? c.turns : void 0
			}), m = document.createElementNS(lt, "path");
			if (m.setAttribute("d", p.path), m.setAttribute("class", c.back === !0 ? "ui-graph__edge ui-graph__edge--back" : "ui-graph__edge"), m.setAttribute(i, s.id), m.style.setProperty("--ui-graph-pin-color", d), this.selection.hasEdge(s.id) && m.setAttribute(r, ""), c.conflict === !0 && m.setAttribute("data-ui-graph-conflict", "changed"), t && m.setAttribute(T, Je), m.toggleAttribute(A, u), this.edgeLayer.append(m), l.push(m), p.arrow !== null) {
				let e = document.createElementNS(lt, "path");
				e.setAttribute("d", p.arrow), e.setAttribute("class", "ui-graph__edge-arrow"), e.style.setProperty("--ui-graph-pin-color", d), e.toggleAttribute(A, u), this.edgeLayer.append(e), l.push(e);
			}
			c.label !== null && c.label !== void 0 && c.label.length > 0 && l.push(this.drawLabel(m, c.label, s.id, t, u, o)), s.points.forEach((e, t) => {
				let n = document.createElementNS(lt, "circle");
				n.setAttribute("class", "ui-graph__reroute"), n.setAttribute(a, s.id), n.setAttribute("data-ui-graph-reroute-index", String(t)), n.setAttribute("cx", String(e.x)), n.setAttribute("cy", String(e.y)), n.setAttribute("r", "4"), n.style.setProperty("--ui-graph-pin-color", d), n.toggleAttribute(A, u), this.edgeLayer.append(n), l.push(n);
			});
		}
		this.placeLabels(o), this.markFocus();
	}
	drawLabel(e, t, n, r, a, o) {
		let s = document.createElement("span");
		return s.className = "ui-graph__edge-label", s.setAttribute(i, n), r && s.setAttribute(T, Je), s.textContent = t, s.toggleAttribute(A, a), this.labelLayer.append(s), o.push({
			chip: s,
			path: e
		}), s;
	}
	placeLabels(e) {
		let t = e.map(({ chip: e }) => ({
			width: e.offsetWidth,
			height: e.offsetHeight
		})), n = e.map(({ path: e }, n) => this.labelPlace(e, t[n].width, t[n].height));
		e.forEach(({ chip: e }, t) => {
			e.style.left = `${n[t].x}px`, e.style.top = `${n[t].y}px`;
		});
	}
	labelPlace(e, t, n) {
		let r = e.getTotalLength();
		for (let i of dt) {
			let a = i === .5 ? ze(e) : e.getPointAtLength(r * i), o = {
				x: a.x - t / 2,
				y: a.y - n / 2
			};
			if (t === 0 || !this.coversNode({
				...o,
				width: t,
				height: n
			})) return o;
		}
		let i = ze(e);
		return {
			x: i.x - t / 2,
			y: i.y - n / 2
		};
	}
	coversNode(e) {
		return this.labelObstacles ??= [...this.nodeElements.keys()].map((e) => this.nodeRect(e)).filter((e) => e !== null), this.labelObstacles.some((t) => Ae(e, t));
	}
	drawPending(e, t, n) {
		this.clearPending();
		let r = document.createElementNS(lt, "path");
		r.setAttribute("d", be(this.settings.edgeShape, e, t)), r.setAttribute("class", "ui-graph__edge ui-graph__edge--pending"), r.style.setProperty("--ui-graph-pin-color", n), this.edgeLayer.append(r);
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
		let t = this.drawnItems.get(e) ?? this.kind().items().find((t) => t.id === e), n = this.nodeElements.get(e);
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
function pt(e) {
	return `${e.offsetWidth}x${e.offsetHeight}`;
}
//#endregion
//#region src/canvas/canvas-settings.ts
var mt = "data-ui-graph-edge-shape", ht = "data-ui-graph-snap", gt = "data-ui-graph-highlight", _t = "data-ui-graph-auto-save", vt = "data-ui-graph-read-only", yt = "data-ui-graph-direction", bt = "data-ui-graph-node-shape", xt = "data-ui-graph-edit-structure", St = "data-ui-graph-mode", Ct = "data-ui-graph-min-zoom", wt = "data-ui-graph-max-zoom", Tt = class {
	root;
	constructor(e) {
		this.root = e;
	}
	get readOnly() {
		return this.root.hasAttribute(vt);
	}
	get edgeShape() {
		let e = this.root.getAttribute(mt);
		return e === "straight" || e === "bezier" ? e : "orthogonal";
	}
	get snapping() {
		return this.root.hasAttribute(ht);
	}
	get highlightOnHover() {
		return this.root.hasAttribute(gt);
	}
	get autoSave() {
		return this.root.hasAttribute(_t);
	}
	get gridSize() {
		return Number(getComputedStyle(this.root).getPropertyValue("--ui-graph-grid-size")) || 20;
	}
	get minZoom() {
		return Number(this.root.getAttribute(Ct)) || .25;
	}
	get maxZoom() {
		return Number(this.root.getAttribute(wt)) || 2.5;
	}
}, Et = "data-ui-graph-side", Dt = ".ui-graph__grid", Ot = 250, kt = class {
	root;
	settings;
	store;
	host;
	viewport;
	scene;
	grid;
	zoomLabel;
	minimap;
	minimapNodes;
	minimapView;
	minimapContent = null;
	minimapPlace = null;
	zoomValue = 1;
	panXValue = 0;
	panYValue = 0;
	keepTimer;
	constructor(e, t, n, r) {
		this.root = e, this.settings = t, this.store = n, this.host = r, this.viewport = e.querySelector(".ui-graph__viewport"), this.scene = e.querySelector(".ui-graph__scene"), this.grid = e.querySelector(Dt), this.zoomLabel = e.querySelector("[data-ui-graph-zoom]"), this.minimap = e.querySelector("[data-ui-graph-map]"), this.minimapNodes = e.querySelector("[data-ui-graph-map-nodes]"), this.minimapView = e.querySelector("[data-ui-graph-map-view]");
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
		this.scene.style.transform = `translate(${this.panXValue}px, ${this.panYValue}px) scale(${this.zoomValue})`, this.grid?.style.setProperty("--ui-graph-zoom", String(this.zoomValue)), this.grid?.style.setProperty("--ui-graph-pan-x", `${this.panXValue}px`), this.grid?.style.setProperty("--ui-graph-pan-y", `${this.panYValue}px`), this.zoomLabel !== null && (this.zoomLabel.textContent = `${Math.round(this.zoomValue * 100)}%`), this.placeMinimapView(), clearTimeout(this.keepTimer), this.keepTimer = setTimeout(() => this.keepView(), Ot);
	}
	keepView() {
		this.keepTimer = void 0, this.store.write(this.root, "view", JSON.stringify({
			zoom: this.zoomValue,
			panX: this.panXValue,
			panY: this.panYValue
		}), {
			selector: Dt,
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
		let t = Me(e, this.viewport.clientWidth - this.sideWidth(), this.viewport.clientHeight, this.settings.minZoom, Math.min(1, this.settings.maxZoom));
		this.zoomValue = t.zoom, this.panXValue = t.panX, this.panYValue = t.panY, this.applyView();
	}
	sideWidth() {
		let e = this.viewport.querySelector(`[${Et}]:not([data-ui-collapsed])`);
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
		return ke(t);
	}
	drawMinimap() {
		if (this.minimap === null || this.minimapNodes === null) return;
		if (!this.root.hasAttribute("data-ui-graph-minimap")) {
			this.minimapContent = null, this.minimapPlace = null;
			return;
		}
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
		this.panXValue = (this.viewport.clientWidth - this.sideWidth()) / 2 - r * this.zoomValue, this.panYValue = this.viewport.clientHeight / 2 - i * this.zoomValue, this.applyView();
	}
}, At = "ui-context-menu-opening", jt = "graph-document", Mt = "graph.save-document", Nt = class {
	context;
	kinds = /* @__PURE__ */ new Map();
	canvases = /* @__PURE__ */ new WeakMap();
	live = /* @__PURE__ */ new Set();
	constructor(t, n) {
		this.context = t;
		for (let e of n) this.kinds.set(e.name, e);
		this.attach(t.root.querySelectorAll(e)), t.observeComponents(t.root, e, { childList: !0 }, (e) => this.attach(e)), t.observeComponents(t.root, "*", { childList: !0 }, () => this.prune()), t.observeComponents(t.root, e, { attributeFilter: [
			mt,
			ht,
			vt,
			"data-ui-graph-minimap",
			yt,
			bt,
			xt,
			St
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
				let n = new Ft(t, this.context, e);
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
	saveCompleted(e, t, n, r) {
		let i = this.canvases.get(e);
		i?.documentState.saveCompleted(t, n), i?.kind.saveCompleted?.(t, r);
	}
	requestSave(e, t) {
		this.canvases.get(e)?.documentState.requestSave(t);
	}
};
function Pt(e, t) {
	let n = t.target;
	if (n?.id === void 0) return null;
	let r = typeof n.id == "number" ? n.id : Number(n.id.value);
	return Number.isNaN(r) ? null : e.dom.findComponent(r, n.dynamicParameters ?? []);
}
var Ft = class {
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
		let r = e.querySelector(".ui-graph__scene"), i = e.querySelector(".ui-graph__nodes"), a = e.querySelector(".ui-graph__edges"), o = e.querySelector(".ui-graph__labels"), s = e.querySelector(".ui-graph__value"), c = {
			nodeElements: this.nodeElements,
			kind: () => this.kind,
			items: () => this.kind.items(),
			groups: () => this.documentState.document.groups,
			itemColor: (e) => this.kind.itemColor(e),
			nodeRect: (e) => this.render.nodeRect(e),
			nodeExtent: (e) => this.render.nodeExtent(e),
			drawEdges: () => this.render.drawEdges(),
			drawGroups: () => this.render.drawGroups(),
			drawMinimap: () => this.view.drawMinimap(),
			deleteSelection: () => this.deleteSelection()
		};
		this.settings = new Tt(e), this.documentState = new ee(e, s, this.settings, (e) => n.readDocument(e), {
			clearSelectionSets: () => this.selection.clearSets(),
			redraw: () => this.render.draw(),
			redrawEdges: () => this.render.drawEdges()
		}, t.values), this.selection = new Be(e, this.nodeElements, this.groupLayer, c), this.view = new kt(e, this.settings, t.store, c), this.dragging = new Ve(this.selection, c, this.settings), this.menus = new nt(e, t, this.documentState, this.selection, this.view, this.settings, c, this.groupLayer), this.render = new ft(t, r, i, this.groupLayer, a, o, this.nodeElements, this.documentState, this.selection, this.settings, this.view, () => this.kind), this.kind = n.create({
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
		this.drag?.kind === "kind" && (this.drag.cancel?.(), this.endDrag()), this.documentState.load(this.definition.readDocument(e));
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
		this.viewport.addEventListener("wheel", (e) => this.wheel(e), { passive: !1 }), this.viewport.addEventListener("pointerdown", (e) => this.pointerDown(e)), this.viewport.addEventListener("pointermove", (e) => this.pointerMove(e)), this.viewport.addEventListener("pointerup", (e) => this.pointerUp(e)), this.viewport.addEventListener("pointercancel", () => this.pointerCancel()), this.viewport.addEventListener("pointerleave", () => this.render.setFocusItem(null)), this.viewport.addEventListener("dblclick", (e) => this.doubleClick(e)), this.viewport.addEventListener("keydown", (e) => this.key(e)), this.viewport.addEventListener("click", (e) => this.click(e)), this.root.addEventListener("click", (e) => this.chrome(e)), this.root.addEventListener(At, (e) => this.menus.prepareMenus(e instanceof CustomEvent ? e.detail?.target ?? null : null));
	}
	wheel(e) {
		if (e.target instanceof Element && (this.isPanel(e.target) || this.kind.isEditor(e.target))) return;
		e.preventDefault();
		let t = Le(e.deltaX, e.deltaY, e.deltaMode);
		if (t === 1) return;
		let n = this.view.toViewport(e);
		this.view.zoomBy(t, n.x, n.y);
	}
	pointerDown(e) {
		if (e.button === 2) {
			let t = this.view.toViewport(e), n = this.view.toScene(t.x, t.y);
			this.pointerX = n.x, this.pointerY = n.y, this.menus.prepareMenus(e.target);
			return;
		}
		if (e.button !== 0 || !(e.target instanceof Element) || Lt(e.target) || this.kind.isEditor(e.target) || this.isPanel(e.target)) return;
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
		this.render.setFocusItem(null), w(e) ? (this.drag = {
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
		if (t !== null) {
			try {
				t.kind === "kind" && t.finish(e);
			} finally {
				this.endDrag();
			}
			this.recordMoved(t);
		}
	}
	pointerCancel() {
		let e = this.drag;
		e !== null && (e.kind === "kind" && e.cancel?.(), this.endDrag(), this.recordMoved(e));
	}
	recordMoved(e) {
		(e.kind === "nodes" || e.kind === "group" || e.kind === "reroute" || e.kind === "resize") && (this.settleDrag(e), this.documentState.edited(!1));
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
		t !== void 0 && (t.x = C(t.x, this.settings.gridSize, !0), t.y = C(t.y, this.settings.gridSize, !0));
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
			let n = Re(t, i[e - 1], i[e]);
			n < o && (o = n, a = e - 1);
		}
		n.points.splice(a, 0, {
			x: C(t.x, this.settings.gridSize, this.settings.snapping),
			y: C(t.y, this.settings.gridSize, this.settings.snapping)
		}), this.documentState.edited(!1);
	}
	click(e) {
		if (!(e.target instanceof Element)) return;
		let t = e.target.closest(`[${i}]`);
		if (t !== null) {
			this.selection.toggleEdge(t.getAttribute(i), w(e)), this.render.drawEdges();
			return;
		}
		let n = e.target.closest(`[${o}]`);
		n !== null && !Lt(e.target) && !this.kind.isEditor(e.target) && this.raiseNodeClick(n.getAttribute(o));
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
		return It(e) || this.kind.isPanel(e);
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
		let t = e.target.closest("[data-ui-key]"), n = t?.getAttribute("data-ui-key") ?? "", r = e.target.closest(`[${E}]`);
		if (r !== null && t !== null && this.menus.foldPanel(), n.length === 0 || r === null && e.target.closest("[data-ui-context-menu]") === null) return;
		let i = r?.getAttribute("data-ui-graph-menu-panel") ?? t.closest("[data-ui-context-menu]")?.getAttribute("data-ui-context-menu") ?? "";
		n.startsWith("graph:") ? this.menus.run(n, i) : this.menus.raiseEntry(n, i);
	}
};
function It(e) {
	return e.closest(`[${E}]`) !== null;
}
function Lt(e) {
	let t = e.closest("input, textarea, select, button");
	return t !== null && !t.matches("[data-ui-graph-pin-toggle], [data-ui-graph-fold]");
}
//#endregion
//#region src/framework-api.ts
var Rt = 1;
function zt() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.Graph needs the framework's client (ui.js) on the page before it.");
	if (e.contractVersion !== Rt) throw Error(`NE.Standard.UI.Web.Graph was built for plugin contract ${Rt}, but the framework's client on the page implements ${String(e.contractVersion ?? "an older one")}; install the package version that matches the framework.`);
	return e;
}
//#endregion
//#region src/graph/chain.ts
function Bt(e, t) {
	let n = /* @__PURE__ */ new Set([t]), r = /* @__PURE__ */ new Set();
	return Vt(e, t, !0, n, r), Vt(e, t, !1, n, r), {
		items: [...n],
		edges: [...r]
	};
}
function Vt(e, t, n, r, i) {
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
var Ht = /* @__PURE__ */ new WeakMap();
function Ut(e, t, n) {
	let r = Ht.get(e) ?? null;
	r !== t && (r !== null && n(r, !1), t !== null && n(t, !0), Ht.set(e, t));
}
//#endregion
//#region src/graph/link-drag.ts
var Wt = "data-ui-graph-handle", Gt = "data-ui-graph-entry", Kt = "data-ui-graph-link-source", j = "data-ui-graph-drop", qt = "ui-graph--connecting";
function Jt(e, t, n) {
	let r = t.closest(`[${o}]`), i = r?.getAttribute("data-ui-graph-node") ?? null;
	if (r === null || i === null) return null;
	let a = e.root, s = null;
	a.classList.add(qt), r.setAttribute(Kt, "");
	for (let t of e.nodeLayer.querySelectorAll(`[${o}]`)) {
		let e = t.getAttribute(o);
		e !== i && !n.canLink(i, e) && t.setAttribute(j, "no");
	}
	let c = () => e.nodeLayer.querySelector(`[${o}="${CSS.escape(i)}"]`), l = () => c()?.querySelector("[data-ui-graph-handle]") ?? t;
	return {
		kind: "kind",
		move: (t, r) => {
			s = Yt(e, i, r, n);
			let a = s?.querySelector("[data-ui-graph-entry]") ?? null;
			e.drawPending(e.centerOf(l()), a === null ? t : e.centerOf(a), "var(--ui-color-primary)");
		},
		finish: (e) => {
			let t = s?.getAttribute("data-ui-graph-node") ?? null;
			t !== null && n.link(i, t, e);
		},
		end: () => {
			a.classList.remove(qt), r.removeAttribute(Kt), c()?.removeAttribute(Kt);
			for (let t of e.nodeLayer.querySelectorAll(`[${j}]`)) t.removeAttribute(j);
		}
	};
}
function Yt(e, t, n, r) {
	let i = document.elementFromPoint(n.clientX, n.clientY)?.closest("[data-ui-graph-node]") ?? null, a = i?.getAttribute("data-ui-graph-node") ?? null, o = i !== null && a !== null && a !== t && e.nodeLayer.contains(i) && r.canLink(t, a) ? i : null;
	return Ut(e.nodeLayer, o, (e, t) => {
		t ? e.setAttribute(j, "yes") : e.removeAttribute(j);
	}), o;
}
function Xt(e, t) {
	let n = e.root.querySelector(`.ui-graph__edge[data-ui-graph-edge="${CSS.escape(t)}"]`);
	return n === null ? null : ze(n);
}
function Zt(e, t, n, r) {
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
var Qt = u.slice(1);
function $t(e, t, n) {
	let r = document.createElement("div"), i = (t.shape ?? n.shape) === "icon", a = t.title ?? t.id;
	r.className = i ? "ui-graph__node ui-graph__bubble" : "ui-graph__node ui-graph__card", r.setAttribute(o, t.id), r.style.setProperty("--ui-graph-node-x", String(e.x)), r.style.setProperty("--ui-graph-node-y", String(e.y)), t.color !== null && t.color.length > 0 && r.style.setProperty("--ui-graph-node-color", t.color), n.conflict !== null && r.setAttribute("data-ui-graph-conflict", n.conflict), e.pinned === !0 && r.setAttribute("data-ui-graph-pinned", "");
	let s = en(t, i ? "ui-graph__bubble-face" : "ui-graph__card-icon", n);
	if (s !== null && r.append(s), i ? r.append(nn(a, "ui-graph__bubble-title")) : r.append(tn(t, a)), t.badge !== null && r.append(rn(t.badge, i ? "ui-graph__bubble-badge" : "ui-graph__card-badge")), n.connectable) {
		let e = document.createElement("span"), t = document.createElement("span");
		e.className = "ui-graph__handle", e.setAttribute(Wt, ""), t.className = "ui-graph__entry", t.setAttribute(Gt, ""), r.append(t, e);
	}
	let c = t.tooltip ?? (i ? a : null);
	return c !== null && (r.addEventListener("pointerenter", () => n.tooltips.show(r, c)), r.addEventListener("pointerleave", () => n.tooltips.hide())), r;
}
function en(e, t, n) {
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
function tn(e, t) {
	let n = document.createElement("div");
	if (n.className = "ui-graph__card-text", n.append(nn(t, null)), e.subtitle !== null) {
		let t = document.createElement("span");
		t.className = "ui-graph__card-subtitle", t.textContent = e.subtitle, n.append(t);
	}
	return n;
}
function nn(e, t) {
	let n = document.createElement("span");
	return n.className = t === null ? Qt : `${Qt} ${t}`, n.textContent = e, n;
}
function rn(e, t) {
	let n = document.createElement("span"), r = document.createElement("span");
	return n.className = `ui-badge ui-badge-style--surface ${t}`, n.setAttribute("data-ui-badge-text", ""), r.className = "ui-badge__text", r.textContent = e, n.append(r), n;
}
//#endregion
//#region src/graph/draft.ts
function an(e, t, n, r) {
	let i = new Set(n), a = new Map(t.map((e) => [e.id, e])), o = /* @__PURE__ */ new Set(), s = [];
	for (let t of e) {
		if (i.has(t.id)) continue;
		let e = a.get(t.id);
		s.push(e === void 0 ? t : r(e)), o.add(t.id);
	}
	for (let e of t) !o.has(e.id) && !i.has(e.id) && s.push(r(e));
	return s;
}
function on(e, t) {
	let n = new Map(e.map((e) => [e.id, e])), r = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = n.get(e.id);
		e.created ? t !== void 0 && r.set(e.id, "changed") : t === void 0 ? r.set(e.id, "removed") : e.baseline !== null && e.baseline !== JSON.stringify(t) && r.set(e.id, "changed");
	}
	return r;
}
function sn(e, t, n, r) {
	let i = e.findIndex((e) => e.id === t);
	if (i < 0) return !1;
	if (r) {
		let t = e[i];
		t.created = n === void 0, t.baseline = n === void 0 ? null : JSON.stringify(n);
	} else e.splice(i, 1);
	return !0;
}
function cn(e, t, n) {
	return /* @__PURE__ */ new Set([
		...e.map((e) => e.id),
		...t.map((e) => e.id),
		...n
	]);
}
function ln(e, t) {
	let n = 1;
	for (; t.has(`${e}-${n}`);) n++;
	return `${e}-${n}`;
}
//#endregion
//#region src/graph/model.ts
function un() {
	return {
		nodes: [],
		edges: [],
		groups: [],
		draft: {
			nodes: [],
			removed: []
		},
		key: null
	};
}
function dn(e) {
	let t = e;
	if (typeof t != "object" || !t) return un();
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
			points: g(e.points)
		})),
		groups: (t.groups ?? []).map(_),
		draft: {
			nodes: (n?.nodes ?? []).flatMap((e) => {
				let t = M(e);
				return t === null ? [] : [{
					...fn(t),
					created: e.created === !0,
					baseline: typeof e.baseline == "string" ? e.baseline : null
				}];
			}),
			removed: (n?.removed ?? []).map((e) => String(e))
		},
		key: p(t)
	};
}
function fn(e) {
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
function pn(e) {
	return M(e);
}
function mn(e, t) {
	return an(e, t.nodes, t.removed, pn);
}
function hn(e, t) {
	return on(e, t.nodes);
}
function M(e) {
	if (typeof e != "object" || !e) return null;
	let t = e, n = t.id;
	if (typeof n != "string" || n.length === 0) return null;
	let r = Array.isArray(t.links) ? t.links : [];
	return {
		id: n,
		title: N(t.title),
		subtitle: N(t.subtitle),
		icon: N(t.icon),
		image: N(t.image),
		shape: gn(t.shape),
		color: N(t.color),
		badge: N(t.badge),
		tooltip: N(t.tooltip),
		links: r.flatMap((e) => {
			let t = e;
			return typeof t == "object" && t && typeof t.id == "string" && typeof t.to == "string" ? [{
				id: t.id,
				to: t.to,
				caption: N(t.caption)
			}] : [];
		})
	};
}
function gn(e) {
	return e === "Icon" || e === "icon" || e === 1 ? "icon" : e === "Card" || e === "card" || e === 0 ? "card" : null;
}
function N(e) {
	return typeof e == "string" && e.length > 0 ? e : null;
}
function _n(e) {
	let t = new Set(e.map((e) => e.id));
	return e.flatMap((e) => e.links.filter((e) => t.has(e.to)).map((t) => ({
		...t,
		from: e.id
	})));
}
//#endregion
//#region src/graph/graph-editing.ts
var vn = class {
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
			...fn(n),
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
		let e = ln("node", cn(this.host.serverNodes(), this.document.draft.nodes, this.document.draft.removed)), t = this.services.pointerScene(), n = this.services.context.strings.text("ui.graph.new-node");
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
		return Jt(this.services, e, {
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
		let t = this.host.link(e), n = Xt(this.services, e);
		t !== void 0 && n !== null && Zt(this.services, n, t.caption ?? "", (n) => {
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
function yn(e, t, n) {
	switch (t.action) {
		case "Reset":
			e.length = 0;
			return;
		case "Move":
			for (let n of t.moves) xn(e, n.key, n.newIndex);
			return;
		default: for (let r of t.items) bn(e, t.action, r.key ?? r.oldKey, r.oldKey ?? r.key, r.index, r.item, n);
	}
}
function bn(e, t, n, r, i, a, o) {
	let s = e.findIndex((e) => e.id === (t === "Replace" ? r : n));
	if (t === "Remove") {
		s >= 0 && e.splice(s, 1);
		return;
	}
	let c = o(a);
	c !== null && (s >= 0 ? e[s] = c : i !== null && i >= 0 && i <= e.length ? e.splice(i, 0, c) : e.push(c));
}
function xn(e, t, n) {
	let r = e.findIndex((e) => e.id === t);
	if (r < 0 || n === null) return;
	let [i] = e.splice(r, 1);
	e.splice(Math.min(n, e.length), 0, i);
}
//#endregion
//#region src/graph/layered.ts
var P = 8, Sn = 4, Cn = 48, wn = 96;
function Tn(e, t, n) {
	let r = n.direction === "down" || n.direction === "up", i = n.direction === "left" || n.direction === "up", a = n.layerGap ?? Pn(e, r), o = n.nodeGap ?? 32, s = /* @__PURE__ */ new Map();
	e.forEach((e, t) => {
		let n = r ? e.width : e.height, i = e.anchor === void 0 ? n / 2 : r ? e.anchor.x : e.anchor.y;
		s.has(e.id) || s.set(e.id, {
			id: e.id,
			real: !0,
			depth: r ? e.height : e.width,
			breadth: n,
			lead: i,
			input: t,
			layer: 0,
			order: 0,
			line: 0
		});
	});
	let { sequence: c, forward: l, backEdges: u } = Dn([...s.values()], t);
	kn(c, l, s);
	let d = n.layerGaps?.(new Map([...s.values()].map((e) => [e.id, e.layer]))), f = /* @__PURE__ */ new Map(), p = jn(l, s, f), m = Mn(s, p);
	Fn(m, p, o);
	let h = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map(), _ = /* @__PURE__ */ new Map(), v = n.originX ?? 0, y = n.originY ?? 0, ee = [], b = 0, te = a, x = Infinity;
	for (let e of m) for (let t of e) x = Math.min(x, t.line - t.lead);
	for (let [e, t] of m.entries()) {
		let n = Math.max(0, ...t.map((e) => e.depth));
		for (let e of t) {
			let t = Number.isFinite(x) ? x : 0;
			ee.push({
				id: e.id,
				real: e.real,
				along: e.real ? b : b + n / 2,
				depth: e.real ? e.depth : 0,
				across: e.real ? e.line - e.lead - t : e.line - t
			}), e.real && _.set(e.id, e.layer);
		}
		te = d?.get(e) ?? a, b += n + te;
	}
	let ne = Math.max(0, b - te);
	for (let e of ee) {
		let t = i ? ne - e.along - e.depth : e.along, n = r ? {
			x: v + e.across,
			y: y + t
		} : {
			x: v + t,
			y: y + e.across
		};
		e.real ? h.set(e.id, n) : g.set(e.id, n);
	}
	let re = /* @__PURE__ */ new Map();
	for (let [e, t] of f) u.has(e) || re.set(e, t.map((e) => g.get(e)));
	return {
		positions: h,
		backEdges: u,
		layers: _,
		routes: re
	};
}
function En(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let t of e) n.has(t) || n.set(t, { id: t });
	return Dn([...n.values()], t).backEdges;
}
function Dn(e, t) {
	let n = new Set(e.map((e) => e.id)), r = /* @__PURE__ */ new Set(), i = t.filter((e) => n.has(e.from) && n.has(e.to));
	for (let e of i) e.from === e.to && r.add(e.id);
	let a = i.filter((e) => e.from !== e.to), o = On(e, a), s = new Map(o.map((e, t) => [e.id, t])), c = [];
	for (let e of a) s.get(e.from) > s.get(e.to) ? (r.add(e.id), c.push({
		id: e.id,
		from: e.to,
		to: e.from,
		fromOffset: e.toOffset,
		toOffset: e.fromOffset
	})) : c.push({
		id: e.id,
		from: e.from,
		to: e.to,
		fromOffset: e.fromOffset,
		toOffset: e.toOffset
	});
	return {
		sequence: o,
		forward: c,
		backEdges: r
	};
}
function On(e, t) {
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
			for (let t of c()) n.get(t.id).size === 0 && (o.push(t), s(t.id), e = !0);
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
	return [...a, ...o.reverse()];
}
function kn(e, t, n) {
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
	An(e, t, n);
}
function An(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
	for (let e of t) r.set(e.to, (r.get(e.to) ?? 0) + 1), i.set(e.from, [...i.get(e.from) ?? [], e.to]);
	for (let t = e.length - 1; t >= 0; t--) {
		let a = e[t], o = i.get(a.id) ?? [];
		o.length > 0 && o.length >= (r.get(a.id) ?? 0) && (a.layer = Math.max(a.layer, Math.min(...o.map((e) => n.get(e).layer)) - 1));
	}
}
function jn(e, t, n) {
	let r = [], i = 0;
	for (let a of e) {
		let e = t.get(a.from), o = t.get(a.to), s = [], c = e.id, l = a.fromOffset ?? e.lead;
		for (let n = e.layer + 1; n < o.layer; n++) {
			let a = `virtual:${i++}`;
			for (; t.has(a);) a = `virtual:${i++}`;
			t.set(a, {
				id: a,
				real: !1,
				depth: 0,
				breadth: P,
				lead: P / 2,
				input: e.input,
				layer: n,
				order: 0,
				line: 0
			}), r.push({
				from: c,
				to: a,
				fromOffset: l,
				toOffset: P / 2
			}), s.push(a), c = a, l = P / 2;
		}
		s.length > 0 && n.set(a.id, s), r.push({
			from: c,
			to: o.id,
			fromOffset: l,
			toOffset: a.toOffset ?? o.lead
		});
	}
	return r;
}
function Mn(e, t) {
	let n = [];
	for (let t of e.values()) {
		for (; n.length <= t.layer;) n.push([]);
		n[t.layer].push(t);
	}
	for (let e of n) e.sort((e, t) => e.input - t.input), e.forEach((e, t) => e.order = t);
	let r = F(t, !0), i = F(t, !1);
	for (let t = 0; t < Sn; t++) {
		let a = t % 2 == 0;
		for (let t = 1; t < n.length; t++) {
			let o = n[a ? t : n.length - 1 - t];
			Nn(o, a ? r : i, e);
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
function Nn(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	for (let i of e) {
		let e = t.get(i.id) ?? [];
		r.set(i.id, e.length === 0 ? i.order : e.reduce((e, t) => e + n.get(t).order, 0) / e.length);
	}
	e.sort((e, t) => r.get(e.id) - r.get(t.id) || e.order - t.order), e.forEach((e, t) => e.order = t);
}
function Pn(e, t) {
	if (e.length === 0) return Cn;
	let n = e.map((e) => t ? e.height : e.width).sort((e, t) => e - t), r = n[Math.floor(n.length / 2)];
	return Math.max(Cn, Math.min(wn, Math.round(r * .75)));
}
function Fn(e, t, n) {
	let r = new Map(e.flat().map((e) => [e.id, e])), i = F(t, !0), a = F(t, !1), o = In(e, i, r), s = Rn(t, r), c = [];
	for (let t of [!1, !0]) for (let l of [!1, !0]) {
		let u = (t ? [...e].reverse() : [...e]).map((e) => l ? [...e].reverse() : [...e]);
		c.push(Bn(u, zn(u, t ? a : i, o, s, r), n, l));
	}
	let l = Vn(e, c);
	for (let t of e) for (let e of t) e.line = l.get(e.id);
}
function In(e, t, n) {
	let r = /* @__PURE__ */ new Set();
	for (let i = 1; i < e.length; i++) {
		let a = e[i], o = 0, s = 0;
		for (let c = 0; c < a.length; c++) {
			let l = Ln(a[c], t, n);
			if (c !== a.length - 1 && l === void 0) continue;
			let u = l ?? e[i - 1].length - 1;
			for (; s <= c; s++) {
				let e = a[s], i = Ln(e, t, n);
				for (let a of t.get(e.id) ?? []) {
					let t = n.get(a).order;
					(t < o || t > u) && t !== i && r.add(I(a, e.id));
				}
			}
			o = u;
		}
	}
	return r;
}
function Ln(e, t, n) {
	if (e.real) return;
	let r = n.get((t.get(e.id) ?? [])[0]);
	return r === void 0 || r.real ? void 0 : r.order;
}
function I(e, t) {
	return `${e}\u0000${t}`;
}
function Rn(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = I(r.from, r.to);
		n.has(e) || n.set(e, r.fromOffset - t.get(r.from).lead - (r.toOffset - t.get(r.to).lead));
	}
	return n;
}
function zn(e, t, n, r, i) {
	let a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map();
	for (let t of e) t.forEach((e, t) => {
		a.set(e.id, e.id), o.set(e.id, 0), s.set(e.id, t);
	});
	for (let c of e.slice(1)) {
		let e = -1;
		for (let l of c) {
			let c = [...new Set(t.get(l.id) ?? [])].sort((e, t) => s.get(e) - s.get(t));
			for (let t of /* @__PURE__ */ new Set([Math.floor((c.length - 1) / 2), Math.ceil((c.length - 1) / 2)])) {
				let u = c[t];
				if (u === void 0) continue;
				let d = i.get(u).layer < l.layer, f = d ? I(u, l.id) : I(l.id, u);
				if (!n.has(f) && e < s.get(u)) {
					a.set(l.id, a.get(u)), o.set(l.id, o.get(u) + (d ? r.get(f) : -r.get(f))), e = s.get(u);
					break;
				}
			}
		}
	}
	return {
		root: a,
		shift: o
	};
}
function Bn(e, t, n, r) {
	let { root: i } = t, a = (e) => r ? -t.shift.get(e.id) : t.shift.get(e.id), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map();
	for (let t of e) {
		for (let e of t) s.set(i.get(e.id), s.get(i.get(e.id)) ?? 0), c.set(i.get(e.id), Math.min(c.get(i.get(e.id)) ?? 0, a(e)));
		for (let e = 1; e < t.length; e++) {
			let c = i.get(t[e - 1].id), l = i.get(t[e].id), [u, d] = r ? [t[e], t[e - 1]] : [t[e - 1], t[e]], f = u.breadth - u.lead + n + d.lead + a(t[e - 1]) - a(t[e]), p = o.get(c);
			p === void 0 ? o.set(c, [{
				block: l,
				room: f
			}]) : p.push({
				block: l,
				room: f
			}), s.set(l, s.get(l) + 1);
		}
	}
	let l = /* @__PURE__ */ new Map(), u = [...s].filter(([, e]) => e === 0).map(([e]) => e);
	for (let e of s.keys()) {
		let t = c.get(e);
		l.set(e, t < 0 ? -t : 0);
	}
	for (let e = 0; e < u.length; e++) {
		let t = u[e];
		for (let { block: e, room: n } of o.get(t) ?? []) l.set(e, Math.max(l.get(e), l.get(t) + n)), s.set(e, s.get(e) - 1), s.get(e) === 0 && u.push(e);
	}
	let d = /* @__PURE__ */ new Map();
	for (let t of e) for (let e of t) d.set(e.id, (r ? -1 : 1) * (l.get(i.get(e.id)) + a(e)));
	return d;
}
function Vn(e, t) {
	let n = e.flat(), r = t.map((e) => {
		let t = Math.min(...n.map((t) => e.get(t.id) - t.lead));
		return Math.max(...n.map((t) => e.get(t.id) + t.breadth - t.lead)) - t;
	});
	return t[r.indexOf(Math.min(...r))];
}
//#endregion
//#region src/graph/layered-sheet.ts
var Hn = 12, Un = .6, Wn = class {
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
	shifts = null;
	laidFor;
	waiting = null;
	placements = null;
	constructor(e, t, n) {
		this.services = e, this.host = t, this.options = n, this.viewKept = e.context.store.readJson(e.root, "view") !== null, this.laidFor = this.layoutFor;
	}
	get direction() {
		let e = this.services.root.getAttribute(yt);
		return e === "down" || e === "left" || e === "up" ? e : "right";
	}
	get document() {
		return this.services.documentState.document;
	}
	get layoutFor() {
		return `${this.direction}:${this.host.layoutKey()}`;
	}
	structureChanged() {
		this.backEdges = En(this.host.nodeIds(), this.host.links());
	}
	isBack(e) {
		return this.backEdges.has(e);
	}
	items() {
		let e = this.document, t = new Set(this.host.nodeIds());
		for (let n = e.nodes.length - 1; n >= 0; n--) {
			let r = e.nodes[n].id;
			!t.has(r) && this.standsWhereLaid(r) && (e.nodes.splice(n, 1), this.placements = null);
		}
		let n = new Map(e.nodes.map((e) => [e.id, e]));
		return this.host.nodeIds().map((t) => {
			let r = n.get(t);
			return r === void 0 && (r = {
				id: t,
				x: 0,
				y: 0,
				pinned: !1
			}, e.nodes.push(r), n.set(t, r), this.pending.add(t), this.placements = null), r;
		});
	}
	edges() {
		this.lanes = null, this.shifts = null, this.placements = null;
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
		if (this.placing = !1, this.services.root.offsetWidth === 0) {
			this.waitForSize();
			return;
		}
		let e = this.items();
		if (this.pending.size > 0 && this.pending.size < e.length && e.every((e) => this.pending.has(e.id) || this.standsWhereLaid(e.id))) for (let t of e) this.pending.add(t.id);
		let t = e.filter((e) => this.pending.has(e.id));
		if (t.length === 0) return;
		let n = this.layout(this.measure()), r = e.filter((e) => !this.pending.has(e.id)).map((e) => this.services.nodeRect(e.id)).filter((e) => e !== null), i = r.length === 0, a = t.length === e.length;
		if (a) this.laidAt = n.positions, this.routes = n.routes;
		else for (let e of this.host.links()) (this.pending.has(e.from) || this.pending.has(e.to)) && this.routes.delete(e.id);
		for (let e of t) {
			let t = n.positions.get(e.id), i = this.services.nodeRect(e.id);
			if (t === void 0 || i === null) continue;
			let o = {
				x: t.x,
				y: t.y,
				width: i.width,
				height: i.height
			};
			for (; r.some((e) => Ae(o, e));) this.direction === "down" ? o.x += o.width + this.options.nodeGap : o.y += o.height + this.options.nodeGap;
			e.x = o.x, e.y = o.y, r.push(o), a || this.laidAt.set(e.id, {
				x: o.x,
				y: o.y
			});
		}
		this.pending.clear(), this.services.draw(), (i || this.turned) && (this.placedOnce || !this.viewKept) && this.services.view.fit(), this.placedOnce = !0, this.turned = !1;
	}
	waitForSize() {
		this.waiting === null && (this.waiting = new ResizeObserver(() => {
			this.services.root.offsetWidth !== 0 && (this.waiting?.disconnect(), this.waiting = null, this.placePending());
		}), this.waiting.observe(this.services.root));
	}
	layout(e) {
		let t = this.host.nodeBox === void 0 ? 0 : Math.max(0, ...e.map((e) => this.services.nodeExtent(e.id)?.width ?? 0)), n = e.map((e) => ({
			id: e.id,
			...this.box(e.width, e.height, t)
		})), r = Tn(n, this.host.links(), {
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
		let t = x(e);
		return this.direction === "left" || this.direction === "up" ? new Map([...t].map(([e, t]) => [e, -t])) : t;
	}
	endsOf(e) {
		let t = this.middleEndsOf(e);
		if (t === null || t.back === !0 || this.host.spreadsEnds === void 0) return t;
		this.shifts ??= this.assignShifts();
		let n = this.shifts.get(e.id);
		if (n === void 0) return t;
		let r = (e, n) => t.axis === "vertical" ? {
			x: e.x + n,
			y: e.y
		} : {
			x: e.x,
			y: e.y + n
		};
		return {
			...t,
			from: r(t.from, n.from),
			to: r(t.to, n.to)
		};
	}
	assignShifts() {
		let e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map();
		for (let r of this.host.links()) {
			let i = this.middleEndsOf(r);
			if (i === null || i.back === !0 || r.from === r.to) continue;
			let a = i.via ?? [], o = (e) => i.axis === "vertical" ? e.x : e.y, s = [i.to, ...a].every((e) => Math.abs(o(e) - o(i.from)) < .5);
			e.set(r.id, {
				from: 0,
				to: 0
			}), t.set(r.from, [...t.get(r.from) ?? [], {
				id: r.id,
				across: o(a[0] ?? i.to),
				level: s
			}]), n.set(r.to, [...n.get(r.to) ?? [], {
				id: r.id,
				across: o(a.at(-1) ?? i.from),
				level: s
			}]);
		}
		return this.spread(t, e, "from"), this.spread(n, e, "to"), e;
	}
	spread(e, t, n) {
		let r = this.direction === "down" || this.direction === "up";
		for (let [i, a] of e) {
			let e = a.length > 1 && this.host.spreadsEnds(i) ? this.services.nodeRect(i) : null;
			if (e === null) continue;
			let o = [...a].sort((e, t) => e.across - t.across), s = o.findIndex((e) => e.level), c = s >= 0 ? s : (o.length - 1) / 2, l = Math.max(c, o.length - 1 - c), u = Math.min(Hn, (r ? e.width : e.height) * Un / (2 * l));
			o.forEach((e, r) => {
				t.get(e.id)[n] = (r - c) * u;
			});
		}
	}
	middleEndsOf(e) {
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
		let t = this.laidAt.get(e), n = t === void 0 ? void 0 : this.placementOf(e);
		return t !== void 0 && n !== void 0 && Math.abs(t.x - n.x) < .5 && Math.abs(t.y - n.y) < .5;
	}
	placementOf(e) {
		let t = this.document.nodes;
		return (this.placements === null || this.placements.nodes !== t) && (this.placements = {
			nodes: t,
			byId: new Map(t.map((e) => [e.id, e]))
		}), this.placements.byId.get(e);
	}
}, Gn = "data-ui-graph-nodes", Kn = 32, qn = 34, Jn = 96;
function Yn(e, t, n) {
	let r = Math.max(e, Jn, n);
	return {
		width: r,
		height: t + qn,
		anchor: {
			x: r / 2,
			y: t / 2
		}
	};
}
var Xn = {
	name: "layered",
	readDocument: dn,
	create: (e) => new Zn(e)
}, Zn = class {
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
		let t = m(e.root.getAttribute(Gn));
		this.services = e, this.server = Array.isArray(t) ? t.map(M).filter((e) => e !== null) : [], this.editing = new vn(e, {
			nodes: () => this.nodes,
			serverNodes: () => this.server,
			node: (e) => this.nodeById.get(e),
			serverNode: (e) => this.serverById.get(e),
			link: (e) => this.linkById.get(e)
		}), this.sheet = new Wn(e, {
			nodeIds: () => this.nodes.map((e) => e.id),
			links: () => this.links,
			layoutKey: () => this.shape,
			nodeBox: (e, t, n) => this.shape === "icon" ? Yn(e, t, n) : {
				width: e,
				height: t
			},
			spreadsEnds: (e) => (this.nodeById.get(e)?.shape ?? this.shape) === "card"
		}, { nodeGap: Kn }), this.refresh();
	}
	get editable() {
		return !this.services.settings.readOnly && this.services.root.hasAttribute("data-ui-graph-edit-structure");
	}
	get document() {
		return this.services.documentState.document;
	}
	get shape() {
		return gn(this.services.root.getAttribute("data-ui-graph-node-shape")) ?? "card";
	}
	applyChange(e) {
		yn(this.server, e, M), this.serverVersion++, this.services.draw();
	}
	refresh() {
		let e = this.document.draft, t = `${this.serverVersion}|${this.services.documentState.version}`;
		t !== this.structureKey && (this.structureKey = t, this.serverById = new Map(this.server.map((e) => [e.id, e])), this.nodes = mn(this.server, e), this.conflicts = hn(this.server, e), this.nodeById = new Map(this.nodes.map((e) => [e.id, e])), this.links = _n(this.nodes), this.linkById = new Map(this.links.map((e) => [e.id, e])), this.sheet.structureChanged());
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
		return $t(e, t, {
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
		return Bt(this.links, e);
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
		let n = t.closest(`[${Wt}]`);
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
		if (e === "graph:take-server" || e === "graph:keep-mine") return t?.kind === "node" && !this.services.settings.readOnly && sn(this.document.draft.nodes, t.id, this.serverById.get(t.id), e === "graph:keep-mine") && this.services.documentState.edited(), !0;
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
		O(this.services.root, "graph:take-server", r), O(this.services.root, "graph:keep-mine", r);
		for (let e of [
			"graph:add-node",
			"graph:caption",
			"graph:delete-edge"
		]) D(this.services.root, e, n);
	}
};
//#endregion
//#region src/nodes/layout.ts
function Qn(e, t) {
	let n = t.fallback ?? {
		width: 220,
		height: 120
	}, r = t.columnGap ?? 80, i = e.nodes.filter((e) => e.pinned !== !0 && (t.only === void 0 || t.only.has(e.id)));
	if (i.length === 0) return /* @__PURE__ */ new Map();
	let a = new Set(i.map((e) => e.id)), o = e.edges.filter((e) => a.has(e.fromNode) && a.has(e.toNode)), s = i.map((e) => {
		let r = t.sizes.get(e.id) ?? n;
		return {
			id: e.id,
			width: r.width,
			height: r.height
		};
	}), c = o.map((e) => ({
		id: e.id,
		from: e.fromNode,
		to: e.toNode,
		fromOffset: t.pinOffset?.(e.fromNode, e.fromPin, "out") ?? void 0,
		toOffset: t.pinOffset?.(e.toNode, e.toPin, "in") ?? void 0
	})), l = t.only !== void 0, u = Tn(s, c, {
		direction: "right",
		layerGap: r,
		layerGaps: (e) => er(o, e, r),
		nodeGap: t.rowGap ?? 32,
		originX: l ? Math.min(...i.map((e) => e.x)) : 0,
		originY: l ? Math.min(...i.map((e) => e.y)) : 0
	}).positions;
	return (t.gridSize ?? 0) > 0 && $n(u, s, c, t.gridSize), u;
}
function $n(e, t, n, r) {
	let i = new Map(t.map((e) => [e.id, e.height])), a = new Map(t.map((e, t) => [e.id, t])), o = new Map(t.map((e) => [e.id, e.id])), s = (e) => {
		let t = o.get(e);
		return t === e ? e : s(t);
	};
	for (let t of n) {
		let n = e.get(t.from), r = e.get(t.to);
		if (n === void 0 || r === void 0) continue;
		let c = n.y + (t.fromOffset ?? i.get(t.from) / 2), l = r.y + (t.toOffset ?? i.get(t.to) / 2), u = s(t.from), d = s(t.to);
		if (Math.abs(c - l) >= .5 || u === d) continue;
		let [f, p] = a.get(u) < a.get(d) ? [u, d] : [d, u];
		o.set(p, f);
	}
	let c = /* @__PURE__ */ new Map();
	for (let n of t) {
		let t = e.get(n.id);
		if (t === void 0) continue;
		let i = s(n.id);
		c.has(i) || c.set(i, C(e.get(i).y, r, !0) - e.get(i).y), e.set(n.id, {
			x: C(t.x, r, !0),
			y: t.y + c.get(i)
		});
	}
}
function er(e, t, n) {
	let r = e.filter((e) => t.get(e.toNode) > t.get(e.fromNode)), i = /* @__PURE__ */ new Map();
	for (let e of r) i.set(`${e.fromNode}:${e.fromPin}`, (i.get(`${e.fromNode}:${e.fromPin}`) ?? 0) + 1);
	let a = /* @__PURE__ */ new Map();
	for (let e of r) {
		let n = `${e.fromNode}:${e.fromPin}`, r = t.get(e.fromNode), o = a.get(r) ?? /* @__PURE__ */ new Set();
		o.add((i.get(n) ?? 0) > 1 ? `from:${n}` : `to:${e.toNode}:${e.toPin}`), a.set(r, o);
	}
	return new Map([...a].map(([e, t]) => [e, Math.max(n, 28 + (t.size - 1) * 14)]));
}
var tr = "array", nr = "array:", rr = "text", ir = "image";
function ar() {
	return {
		nodes: [],
		edges: [],
		groups: [],
		key: null
	};
}
function or(e) {
	let t = e;
	return typeof t != "object" || !t ? ar() : {
		nodes: (t.nodes ?? []).map(sr),
		edges: (t.edges ?? []).map(cr),
		groups: (t.groups ?? []).map(_),
		key: p(t)
	};
}
function sr(e) {
	return {
		id: String(e.id),
		type: String(e.type),
		x: Number(e.x) || 0,
		y: Number(e.y) || 0,
		title: e.title ?? null,
		color: e.color ?? null,
		pinned: e.pinned === !0,
		collapsed: e.collapsed === !0,
		values: { ...e.values },
		width: h(e.width),
		height: h(e.height)
	};
}
function cr(e) {
	return {
		id: String(e.id),
		fromNode: String(e.fromNode),
		fromPin: String(e.fromPin),
		toNode: String(e.toNode),
		toPin: String(e.toPin),
		points: g(e.points)
	};
}
function lr(e) {
	return e === tr || e.startsWith(nr);
}
function ur(e) {
	return e === rr || e === ir;
}
function dr(e, t) {
	return e.length === 0 || t.length === 0 ? !1 : e === t || e === "any" || t === "any" || ur(e) && ur(t) ? !0 : lr(e) && lr(t) && (e === tr || t === tr);
}
function fr(e, t, n) {
	let r = {};
	for (let t of e.inputs) t.editor !== "None" && t.defaultValue !== void 0 && t.defaultValue !== null && (r[t.name] = t.defaultValue);
	return {
		id: v("n"),
		type: e.key,
		x: t,
		y: n,
		title: null,
		color: null,
		pinned: !1,
		values: r
	};
}
function pr(e, t, n) {
	return e.edges.find((e) => e.toNode === t && e.toPin === n);
}
function mr(e, t, n) {
	return e.edges.filter((e) => e.toNode === t && e.toPin === n);
}
function hr(e, t, n) {
	if (e.hidden === !0) return !1;
	let r = e.visibleWhen ?? "";
	if (r.length === 0) return !0;
	let i = gr(t.values, n, r), a = e.visibleValues ?? [];
	return a.length > 0 ? a.some((e) => e === L(i)) : i != null && i !== !1 && L(i).length > 0;
}
function gr(e, t, n) {
	return e[n] ?? t.inputs.find((e) => e.name === n)?.defaultValue;
}
function L(e) {
	return e == null ? "" : String(e);
}
function R(e, t, n) {
	return (n ? e?.outputs : e?.inputs)?.find((e) => e.name === t);
}
function z(e, t, n, r, i = /* @__PURE__ */ new Set()) {
	let a = `${n}:${r}`;
	if (i.has(a)) return "any";
	i.add(a);
	let o = e.nodes.find((e) => e.id === n), s = o === void 0 ? void 0 : t.get(o.type), c = R(s, r, !0);
	if (c === void 0) return "any";
	if (c.typeOf === null || c.typeOf === void 0 || c.typeOf.length === 0) return c.type;
	let l = pr(e, n, c.typeOf);
	return l === void 0 ? R(s, c.typeOf, !1)?.type ?? "any" : z(e, t, l.fromNode, l.fromPin, i);
}
function _r(e, t) {
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
function vr(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	return {
		nodes: e.nodes.map((e) => {
			let i = v("n");
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
			id: v("e"),
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
var yr = /^(https?:\/\/|data:image\/|blob:|\/)/i;
function br(e, t) {
	return e == null || e === "" ? B(t.empty, "ui-graph__display-empty") : typeof e == "string" ? xr(e) ? Sr(e) : B(e, "ui-graph__display-text") : typeof e == "number" ? B(t.number(e), "ui-graph__display-number") : typeof e == "bigint" ? B(String(e), "ui-graph__display-number") : typeof e == "boolean" ? B(e ? "✓" : "✕", "ui-graph__display-number") : Array.isArray(e) ? e.length === 0 ? B(t.empty, "ui-graph__display-empty") : Cr(e, t) : typeof e == "object" ? Tr(e, t) : B(String(e), "ui-graph__display-text");
}
function xr(e) {
	return yr.test(e.trim());
}
function B(e, t) {
	let n = document.createElement("div");
	return n.className = t, n.textContent = e, n;
}
function Sr(e) {
	let t = document.createElement("img");
	return t.className = "ui-graph__display-image", t.src = e, t.alt = "", t.addEventListener("error", () => t.replaceWith(B(e, "ui-graph__display-text")), { once: !0 }), t;
}
function Cr(e, t) {
	let n = wr(e);
	if (n === null) {
		let n = document.createElement("div");
		n.className = "ui-graph__display-list";
		for (let r of e) n.append(br(r, t));
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
			n.textContent = Er(a[r], t), e.append(n);
		}
		r.append(e);
	}
	return r;
}
function wr(e) {
	let t = [];
	for (let n of e) {
		if (typeof n != "object" || !n || Array.isArray(n)) return null;
		for (let e of Object.keys(n)) t.includes(e) || t.push(e);
	}
	return t.length === 0 ? null : t;
}
function Tr(e, t) {
	let n = document.createElement("div"), r = Object.keys(e).find((t) => typeof e[t] == "string" && xr(e[t])), i = h(e.width), a = h(e.height), o = r !== void 0 && i !== null;
	if (n.className = "ui-graph__display-record", o) {
		let t = Sr(e[r]);
		t.classList.add("ui-graph__display-image--sized"), t.style.width = `${i}px`, a !== null && (t.style.height = `${a}px`), n.append(t);
	}
	for (let [i, a] of Object.entries(e)) {
		if (o && (i === r || i === "width" || i === "height")) continue;
		if (typeof a == "string" && xr(a)) {
			n.append(Sr(a));
			continue;
		}
		let e = document.createElement("div");
		e.className = "ui-graph__display-field", e.append(B(i, "ui-graph__display-key")), e.append(B(Er(a, t), "ui-graph__display-value")), n.append(e);
	}
	return n.childElementCount === 0 ? B(t.empty, "ui-graph__display-empty") : n;
}
function Er(e, t) {
	return e == null ? "" : typeof e == "number" ? t.number(e) : typeof e == "object" ? JSON.stringify(e) : String(e);
}
//#endregion
//#region src/nodes/node-view.ts
var V = "data-ui-graph-pin", Dr = "data-ui-graph-pin-dir", Or = "data-ui-graph-pin-type", kr = "data-ui-graph-state", Ar = "data-ui-graph-head", jr = "data-ui-graph-value", Mr = "data-ui-graph-display", Nr = "data-ui-graph-uploading", Pr = "data-ui-graph-pin-many", Fr = "data-ui-graph-pin-optional", Ir = "graph-editor:", Lr = "graph-list-remove", Rr = "ui-image-input__selection", zr = "ui-image-input__text", Br = "graph-list-add", Vr = "graph-state-reset", Hr = "data-ui-graph-list-add";
function Ur(e, t, n) {
	let r = document.createElement("div");
	r.className = "ui-graph__node", r.setAttribute(o, e.id), r.style.setProperty("--ui-graph-node-x", String(e.x)), r.style.setProperty("--ui-graph-node-y", String(e.y)), t?.minWidth !== null && t?.minWidth !== void 0 && r.style.setProperty("--ui-graph-node-min-width", `${t.minWidth}rem`), e.collapsed !== !0 && e.width !== null && e.width !== void 0 && e.width > 0 && r.style.setProperty("--ui-graph-node-w", String(e.width)), e.collapsed !== !0 && e.height !== null && e.height !== void 0 && e.height > 0 && r.style.setProperty("--ui-graph-node-h", String(e.height));
	let i = e.color ?? t?.color ?? null;
	if (i !== null && i.length > 0 && r.style.setProperty("--ui-graph-node-color", i), e.pinned === !0 && r.setAttribute("data-ui-graph-pinned", ""), t?.compact === !0) return Wr(r, e, t, n);
	let a = qr(e, t, n);
	if (r.append(a), t?.showProgress === !0 && a.append(Yr()), e.collapsed === !0) return r.setAttribute(l, ""), a.append(Gr(e, t, n)), r;
	let s = document.createElement("div");
	if (s.className = "ui-graph__node-body", t === void 0) {
		let t = document.createElement("div");
		t.className = "ui-graph__node-unknown", t.textContent = e.type, s.append(t);
	} else {
		let r = t.inputs.filter((n) => hr(n, e, t)), i = r.filter((e) => e.editor === "None");
		for (let r = 0; r < Math.max(i.length, t.outputs.length); r++) s.append(Xr(e, i[r], t.outputs[r], n));
		for (let t of r) t.editor !== "None" && s.append($r(e, t, n));
	}
	return r.append(s), !n.readOnly && t?.resizable !== !1 && r.append(Kr()), r;
}
function Wr(e, t, n, r) {
	let i = n.inputs[0], a = n.outputs[0];
	e.classList.add("ui-graph__node--compact"), (t.color ?? null) === null && a !== void 0 && e.style.setProperty("--ui-graph-node-color", r.pinColor(r.outputType(t.id, a.name)));
	let o = document.createElement("span");
	o.className = "ui-graph__node-reroute", o.textContent = t.title ?? (i === void 0 ? null : r.feedTitle(t.id, i.name)) ?? n.title;
	let s = document.createElement("div");
	return s.className = "ui-graph__node-ports", i !== void 0 && a !== void 0 && s.append(H(t, i, r.outputType(t.id, a.name), "in", r)), a !== void 0 && s.append(H(t, a, r.outputType(t.id, a.name), "out", r)), e.append(o, s), e;
}
function Gr(e, t, n) {
	let r = document.createElement("div");
	if (r.className = "ui-graph__node-ports", t === void 0) return r;
	for (let i of t.inputs) i.hasPin !== !1 && hr(i, e, t) && r.append(H(e, i, i.type, "in", n));
	for (let i of t.outputs) r.append(H(e, i, n.outputType(e.id, i.name), "out", n));
	return r;
}
function Kr() {
	let e = document.createElement("div");
	return e.className = "ui-graph__node-resize", e.setAttribute("data-ui-graph-resize", ""), e;
}
function qr(e, t, n) {
	let r = document.createElement("div");
	r.className = "ui-graph__node-head", r.setAttribute(Ar, "");
	let i = document.createElement("button"), a = e.collapsed === !0;
	i.type = "button", i.className = "ui-graph__node-fold", i.setAttribute(c, ""), i.title = n.words.text(a ? "ui.graph.expand" : "ui.graph.collapse"), i.setAttribute("aria-label", i.title), i.setAttribute("aria-expanded", String(!a)), i.disabled = n.readOnly, i.append(Jr(n, a ? "ne-chevron-right" : "ne-chevron-down")), r.append(i);
	let o = t?.icon ?? null;
	o !== null && o.length > 0 && r.append(Jr(n, o, "ui-graph__node-icon"));
	let l = document.createElement("span");
	l.className = "ui-graph__node-title", l.textContent = e.title ?? t?.title ?? e.type, r.append(l);
	let u = document.createElement("button");
	return u.type = "button", u.className = "ui-graph__node-pinned", u.setAttribute(s, ""), u.title = n.words.text(e.pinned === !0 ? "ui.graph.unpin" : "ui.graph.pin"), u.setAttribute("aria-label", u.title), u.disabled = n.readOnly, u.append(Jr(n, e.pinned === !0 ? "ne-pin" : "ne-pin-outlined")), r.append(u), r;
}
function Jr(e, t, n) {
	let r = document.createElement("span");
	return n !== void 0 && (r.className = n), r.setAttribute("aria-hidden", "true"), e.icons.apply(r, t), r;
}
function Yr() {
	let e = document.createElement("div");
	return e.className = "ui-graph__node-progress", e.hidden = !0, e.append(document.createElement("i")), e;
}
function Xr(e, t, n, r) {
	let i = document.createElement("div");
	return i.className = "ui-graph__row", t !== void 0 && (i.append(H(e, t, t.type, "in", r)), i.append(Qr(t, "ui-graph__row-label"))), n !== void 0 && (i.append(Zr(n.title, "ui-graph__row-label ui-graph__row-label--out")), i.append(H(e, n, r.outputType(e.id, n.name), "out", r))), i;
}
function Zr(e, t) {
	let n = document.createElement("span");
	return n.className = t, n.textContent = e, n;
}
function Qr(e, t) {
	return Zr(e.title, t);
}
function $r(e, t, n) {
	let r = document.createElement("div"), i = t.hasPin !== !1 && n.isConnected(e.id, t.name, "in"), a = ti(t);
	r.className = a ? "ui-graph__row ui-graph__row--tall" : "ui-graph__row", (t.editor === "Image" && t.large === !0 || t.editor === "Display" || t.editor === "Text" && (t.maxLines ?? 1) > 1) && r.classList.add("ui-graph__row--grow"), t.hasPin !== !1 && r.append(H(e, t, t.type, "in", n));
	let o = ri(e, t, n), s = o.querySelector(`[${Hr}]`);
	if (s !== null) {
		let e = document.createElement("div");
		e.className = "ui-graph__row-head", e.append(Qr(t, "ui-graph__row-label")), e.append(s), r.append(e);
	} else (a || t.editor === "Boolean") && r.append(Qr(t, "ui-graph__row-label"));
	if (t.height !== null && t.height !== void 0 && t.height > 0 && o.style.setProperty("--ui-graph-editor-height", `${t.height}rem`), i && t.editor !== "List" && (r.classList.add("ui-graph__row--connected"), o.setAttribute("inert", "")), r.append(o), t.state === !0) {
		let i = ei(e, t, o, n);
		i !== null && r.append(i);
	}
	return r;
}
function ei(e, t, n, r) {
	let i = r.cloneEditor(Vr);
	return i === null ? null : (di(i, r), i.addEventListener("click", () => {
		let i = t.defaultValue ?? null, a = n.firstElementChild;
		a !== null && r.setProperty(a, "Value", i), r.onValueChanged(e.id, t.name, i);
	}), i);
}
function ti(e) {
	return e.editor === "Image" && e.large === !0 || e.editor === "List" || e.editor === "Display" || e.editor === "Text" && (e.maxLines ?? 1) > 1;
}
function H(e, t, n, r, i) {
	let a = document.createElement("span");
	a.className = "ui-graph__pin", a.setAttribute(V, t.name), a.setAttribute(Dr, r), a.setAttribute(Or, n), a.style.setProperty("--ui-graph-pin-color", i.pinColor(n)), t.multiple === !0 && a.setAttribute(Pr, ""), i.isConnected(e.id, t.name, r) && a.classList.add("ui-graph__pin--filled"), (r === "out" || t.required !== !0) && a.setAttribute(Fr, "");
	let o = t.description ?? "", s = `${t.title} (${ni(n, t.multiple === !0, i)})${o.length > 0 ? `\n${o}` : ""}`;
	return a.addEventListener("pointerenter", () => i.tooltips.show(a, s)), a.addEventListener("pointerleave", () => i.tooltips.hide()), a;
}
function ni(e, t, n) {
	let r = (e) => e.startsWith("array:") ? `${r(e.slice(6))}[]` : e.startsWith("enum:") ? e.slice(5) : e;
	return t ? n.words.format("ui.graph.pin-many", { type: r(e) }) : r(e);
}
function ri(e, t, n) {
	let r = n.isConnected(e.id, t.name, "in"), i = e.values[t.name] ?? (r ? null : t.defaultValue);
	switch (t.editor) {
		case "Image": return ui(e, t, i, n);
		case "List": return fi(e, t, i, n);
		case "Display": return li(t, n);
		default: return ii(e, t, i, n);
	}
}
function ii(e, t, n, r) {
	let i = ai(t, t.editor === "Boolean" ? "ui-graph__editor--check" : null), a = r.cloneEditor(`${Ir}${e.type}:${t.name}`);
	return a === null ? i : (i.append(a), oi(a, n ?? null, r, () => r.onValueChanged(e.id, t.name, si(t, r.readValue(a)))), i);
}
function ai(e, t) {
	let n = document.createElement("div");
	return n.className = t === null ? "ui-graph__editor" : `ui-graph__editor ${t}`, n.setAttribute(jr, e.name), n;
}
function oi(e, t, n, r) {
	n.setProperty(e, "Value", t), n.readOnly ? n.setProperty(e, "IsReadOnly", !0) : e.addEventListener("change", r);
}
function si(e, t) {
	return e.editor === "Text" && t === "" ? "" : ci(e.editor === "Number", t);
}
function ci(e, t) {
	if (t === void 0 || t === "") return null;
	if (e && typeof t == "string") {
		let e = Number(t);
		return Number.isFinite(e) ? e : null;
	}
	return t;
}
function li(e, t) {
	let n = document.createElement("div");
	return n.className = "ui-graph__editor ui-graph__editor--display", n.setAttribute(jr, e.name), n.setAttribute(Mr, ""), n.append(br(null, {
		empty: t.words.text("ui.graph.no-value"),
		number: (n) => t.number(n, e.format)
	})), n;
}
function ui(e, t, n, r) {
	let i = t.large === !0, a = ai(t, i ? "ui-graph__editor--picture" : null), o = L(n), s = r.cloneEditor(`${Ir}${e.type}:${t.name}`);
	if (s === null) return a;
	if (a.append(s), i) return oi(s, o.length === 0 ? null : o, r, () => {
		let n = s.querySelector(`input.${Rr}`);
		if (n === null || n.value.length === 0) return;
		let i = s.querySelector(`.${zr}`)?.textContent ?? "";
		r.onImageUploaded(e.id, t.name, n.value, i);
	}), a;
	oi(s, o.length === 0 ? null : o, r, () => {
		let n = L(r.readValue(s));
		r.onValueChanged(e.id, t.name, n.length === 0 ? null : n);
	});
	let c = s.querySelector(".ui-text-input__action > *");
	return c !== null && (di(c, r), c.addEventListener("click", (n) => {
		n.preventDefault(), r.onPickImage(e.id, t.name);
	})), a;
}
function di(e, t) {
	t.readOnly && t.setProperty(e, "Enabled", !1);
}
function fi(e, t, n, r) {
	let i = ai(t, "ui-graph__editor--list"), a = Array.isArray(n) ? [...n] : [], o = t.type === "array:number" || t.type === "number", s = document.createElement("div");
	s.className = "ui-graph__list-rows", i.append(s);
	let c = () => r.onValueChanged(e.id, t.name, [...a]), l = () => {
		s.replaceChildren(), s.hidden = a.length === 0, a.forEach((n, i) => {
			let u = document.createElement("div"), d = r.cloneEditor(`${Ir}${e.type}:${t.name}`), f = r.cloneEditor(Lr);
			u.className = "ui-graph__list-row", d !== null && (oi(d, n ?? null, r, () => {
				a[i] = ci(o, r.readValue(d)), c();
			}), u.append(d)), f !== null && (di(f, r), f.addEventListener("click", () => {
				a.splice(i, 1), l(), c();
			}), u.append(f)), s.append(u);
		});
	};
	l();
	let u = r.cloneEditor(Br);
	return u !== null && (u.setAttribute(Hr, ""), di(u, r), u.addEventListener("click", () => {
		a.push(null), l(), c();
	}), i.append(u)), i;
}
//#endregion
//#region src/nodes/nodes-log.ts
var pi = "data-ui-graph-log-node", mi = "data-ui-graph-log-open", hi = "data-ui-graph-run-state", gi = 500, _i = class {
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
	runStopped = !1;
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
		i.state === "idle" && n === null && r === null ? this.statuses.delete(e) : this.statuses.set(e, i), i.state === "running" ? this.runningNode = e : this.runningNode === e && (this.runningNode = null), i.state === "error" && (this.runFailed = !0), this.applyStatus(e, i), this.drawRun();
	}
	applyStatus(e, t) {
		let n = this.services.nodeElements.get(e);
		if (n === void 0) return;
		let r = n.querySelector(".ui-graph__node-progress");
		n.setAttribute(kr, t.state), r !== null && (r.hidden = t.state !== "running" || t.progress === null, t.progress !== null && r.style.setProperty("--ui-graph-progress", String(Math.min(1, Math.max(0, t.progress)))));
	}
	setDisplay(e, t, n) {
		let r = this.displays.get(e);
		r === void 0 && (r = /* @__PURE__ */ new Map(), this.displays.set(e, r)), r.set(t, n), this.applyDisplay(e, t, n);
	}
	applyDisplay(e, t, n) {
		let r = this.services.nodeElements.get(e)?.querySelector(`[${Mr}][${jr}="${CSS.escape(t)}"]`), i = this.inputPin(e, t)?.format;
		r?.replaceChildren(br(n, {
			empty: this.context.strings.text("ui.graph.no-value"),
			number: (e) => this.formatNumber(e, i)
		}));
	}
	inputPin(e, t) {
		let n = this.services.documentState.document.nodes.find((t) => t.id === e);
		return R(n === void 0 ? void 0 : this.types.get(n.type), t, !1);
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
		if (this.log.push(r), this.log.length > gi && (this.log.shift(), this.logEntries?.firstElementChild?.remove()), this.logEntries !== null) {
			let e = this.logEntries.scrollHeight - this.logEntries.scrollTop - this.logEntries.clientHeight < 8;
			this.logEntries.append(this.renderLogEntry(r)), e && (this.logEntries.scrollTop = this.logEntries.scrollHeight);
		}
		this.drawLogCount(), r.level === "error" && (this.runFailed = !0, this.drawRun());
	}
	renderLogEntry(e) {
		let t = document.createElement("li"), n = document.createElement("time"), r = document.createElement("button"), i = document.createElement("span");
		return t.className = "ui-graph__log-entry", t.setAttribute("data-ui-graph-log-level", e.level), n.className = "ui-graph__log-time", n.dateTime = e.at.toISOString(), n.textContent = this.context.temporal.format(e.at, "HH:mm:ss", this.context.temporal.readCulture(this.root)), r.type = "button", r.className = "ui-graph__log-node", r.setAttribute(pi, e.nodeId), r.textContent = this.nodeName(e.nodeId), i.className = "ui-graph__log-message", i.textContent = e.message, t.append(n, r, i), t;
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
		this.root.toggleAttribute(mi, e), this.logToggle?.setAttribute("aria-expanded", String(e)), t && this.context.store.write(this.root, "log", e ? "open" : null);
	}
	isLogOpen() {
		return this.root.hasAttribute(mi);
	}
	goToNode(e) {
		let t = this.services.nodeRect(e);
		if (t === null) return;
		this.services.selection.chooseForMenu(e), this.services.drawEdges();
		let n = this.runLine?.offsetHeight ?? 0, r = this.logPanel?.offsetHeight ?? 0;
		this.services.view.centerOnRect(t, n, r);
	}
	setRunProgress(e, t) {
		e <= 0 && (this.clearLog(), this.runStarted = !0, this.runFailed = !1, this.runStopped = !1, this.runningNode = null), this.runCompleted = Math.max(0, e), this.runTotal = Math.max(0, t), this.runCompleted >= this.runTotal && (this.runningNode = null), this.drawRun();
	}
	setRunning(e) {
		e || !this.runStarted || this.runCompleted >= this.runTotal || (this.runStopped = !0, this.runningNode = null, this.drawRun());
	}
	drawRun() {
		if (this.runLine === null) return;
		let e = this.runningNode === null ? void 0 : this.statuses.get(this.runningNode), t = e?.state === "running" ? Math.min(1, Math.max(0, e.progress ?? 0)) : 0, n = this.runTotal === 0 ? +!!this.runStarted : Math.min(1, (this.runCompleted + t) / this.runTotal), r = Math.round(n * 100), i = this.runStarted && this.runCompleted >= this.runTotal;
		this.runLine.style.setProperty("--ui-graph-run", String(n)), this.runLine.style.setProperty("--ui-graph-run-step", String(t)), this.runLine.setAttribute("aria-valuenow", String(r)), this.runLine.setAttribute(hi, this.runStarted ? this.runFailed ? "failed" : this.runStopped ? "stopped" : i ? "done" : "running" : "idle"), this.runLabel !== null && (this.runLabel.textContent = this.runLabelText(e)), this.runShare !== null && (this.runShare.textContent = this.runStarted ? `${r}%` : "");
	}
	runLabelText(e) {
		if (this.runningNode !== null) {
			let t = e?.message ?? "";
			return t.length > 0 ? `${this.nodeName(this.runningNode)} · ${t}` : this.nodeName(this.runningNode);
		}
		let t = this.runStopped && !this.runFailed ? [...this.log].reverse().find((e) => e.level === "warning") : this.log.find((e) => e.level === "error");
		return t === void 0 ? "" : `${this.nodeName(t.nodeId)} · ${t.message}`;
	}
}, vi = "[data-ui-graph-picker]", yi = "[data-ui-graph-picker-search] input", bi = "[data-ui-graph-picker-rail]", xi = "[data-ui-graph-picker-list]", Si = "[data-ui-graph-picker-empty]", Ci = "data-ui-graph-kind", wi = "data-ui-graph-category", Ti = "data-ui-graph-category-fold", U = "/", Ei = "--ui-graph-picker-depth", W = "ui-graph__picker-entry", Di = "ui-graph__picker-entry--current", G = "/", Oi = class e {
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
	category = G;
	drawnTerms = "";
	unfolded = /* @__PURE__ */ new Set();
	constructor(e, t, n, r, i, a, o, s, c, l, u) {
		this.panel = e, this.search = t, this.rail = n, this.list = r, this.empty = i, this.entries = a, this.words = o, this.icons = s, this.ids = c, this.roving = l, this.choose = u, this.search.addEventListener("input", () => this.draw()), this.search.addEventListener("change", () => {
			this.search.value !== this.drawnTerms && this.draw();
		}), this.search.addEventListener("keydown", (e) => this.key(e)), this.rail.addEventListener("click", (e) => this.rails(e)), this.list.addEventListener("click", (e) => this.click(e)), this.panel.addEventListener("click", (e) => {
			e.target === this.panel && this.close();
		}), this.panel.addEventListener("close", () => this.search.setAttribute("aria-expanded", "false"));
	}
	static create(t, n, r, i, a, o, s) {
		let c = t.querySelector(vi), l = c?.querySelector(yi) ?? null, u = c?.querySelector(bi) ?? null, d = c?.querySelector(xi) ?? null, f = c?.querySelector(Si) ?? null;
		return c === null || l === null || u === null || d === null || f === null ? null : (l.setAttribute("role", "combobox"), l.setAttribute("aria-controls", i.ensureId(d, "ui-graph-picker-list")), l.setAttribute("aria-autocomplete", "list"), l.setAttribute("aria-expanded", "false"), new e(c, l, u, d, f, n, r, a, i, o, s));
	}
	get isOpen() {
		return this.panel.open;
	}
	open() {
		this.search.value = "", this.category = G, this.drawRail(), this.draw(), this.panel.open || this.panel.showModal(), this.search.setAttribute("aria-expanded", "true"), this.search.focus({ preventScroll: !0 });
	}
	close() {
		this.search.setAttribute("aria-expanded", "false"), this.panel.open && this.panel.close();
	}
	contains(e) {
		return e instanceof Node && this.panel.contains(e);
	}
	drawRail() {
		let e = [], t = /* @__PURE__ */ new Map();
		for (let n of this.entries()) {
			let r = ki(n), i = r.length === 0 ? [""] : r.split(U), a = e;
			for (let e = 0; e < i.length; e++) {
				let n = i.slice(0, e + 1).join(U), r = t.get(n);
				r === void 0 && (r = {
					path: n,
					name: i[e],
					children: []
				}, t.set(n, r), a.push(r)), a = r.children;
			}
		}
		this.rail.replaceChildren(this.railEntry(G, this.words.text("ui.graph.all-kinds"), 0, !1)), this.appendRail(e, 0);
	}
	appendRail(e, t) {
		for (let n of e) {
			let e = n.children.length > 0;
			this.rail.append(this.railEntry(n.path, n.path.length === 0 ? this.words.text("ui.graph.uncategorized") : n.name, t, e)), e && this.unfolded.has(n.path) && this.appendRail(n.children, t + 1);
		}
	}
	railEntry(e, t, n, r) {
		let i = document.createElement("button"), a = document.createElement("span"), o = document.createElement("span");
		return i.type = "button", i.className = "ui-graph__picker-category", i.setAttribute("role", "tab"), i.setAttribute(wi, e), i.setAttribute("aria-selected", String(e === this.category)), i.style.setProperty(Ei, String(n)), a.className = "ui-graph__picker-fold", a.setAttribute("aria-hidden", "true"), r && (a.setAttribute(Ti, ""), this.icons.apply(a, "ne-chevron-right"), i.setAttribute("aria-expanded", String(this.unfolded.has(e)))), o.textContent = t, i.append(a, o), i;
	}
	rails(e) {
		let t = e.target instanceof Element ? e.target : null, n = t === null ? null : t.closest(`[${wi}]`);
		if (t === null || n === null) return;
		let r = n.getAttribute(wi) ?? G;
		if (t.closest(`[${Ti}]`) !== null) {
			this.toggle(r), this.drawRail();
			return;
		}
		n.hasAttribute("aria-expanded") && this.toggle(r, r !== this.category || void 0), this.category = r, this.drawRail(), this.draw();
	}
	toggle(e, t) {
		t ?? !this.unfolded.has(e) ? this.unfolded.add(e) : this.unfolded.delete(e);
	}
	draw() {
		this.drawnTerms = this.search.value;
		let e = this.search.value.trim().toLowerCase(), t = this.entries().filter((t) => this.chosen(t) && (e.length === 0 || Ai(t, e)));
		this.list.replaceChildren(), this.empty.hidden = t.length > 0;
		for (let e of t) {
			let t = document.createElement("button");
			t.type = "button", t.className = W, t.id = this.ids.ensureId(t, `${this.list.id}-entry`), t.setAttribute("role", "option"), t.setAttribute(Ci, e.key);
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
		this.setCurrent(this.list.querySelector(`.${W}`));
	}
	setCurrent(e) {
		for (let t of this.list.querySelectorAll(`.${W}`)) {
			let n = t === e;
			t.classList.toggle(Di, n), t.setAttribute("aria-selected", String(n));
		}
		e === null ? this.search.removeAttribute("aria-activedescendant") : this.search.setAttribute("aria-activedescendant", e.id);
	}
	chosen(e) {
		if (this.category === G) return !0;
		let t = ki(e);
		return t === this.category || t.startsWith(this.category + U);
	}
	key(e) {
		if (e.isComposing) return;
		if (e.key === "Enter") {
			e.preventDefault(), this.take(this.list.querySelector(`.${Di}`));
			return;
		}
		let t = [...this.list.querySelectorAll(`.${W}`)], n = this.roving.target({
			key: e.key,
			items: t,
			current: t.find((e) => e.classList.contains(Di)) ?? null,
			axis: "vertical"
		});
		n !== null && (e.preventDefault(), this.setCurrent(n), n.scrollIntoView({ block: "nearest" }));
	}
	click(e) {
		this.take(e.target instanceof Element ? e.target.closest(`.${W}`) : null);
	}
	take(e) {
		let t = e?.getAttribute(Ci), n = t == null ? void 0 : this.entries().find((e) => e.key === t);
		n !== void 0 && (this.close(), this.choose(n));
	}
};
function ki(e) {
	return (e.category ?? "").split(U).map((e) => e.trim()).filter((e) => e.length > 0).join(U);
}
function Ai(e, t) {
	return e.title.toLowerCase().includes(t) || (e.description ?? "").toLowerCase().includes(t) || (e.category ?? "").toLowerCase().includes(t) || e.key.toLowerCase().includes(t);
}
//#endregion
//#region src/nodes/nodes-picker-binding.ts
var ji = class {
	services;
	picker;
	loose = null;
	constructor(e, t) {
		let n = e.context;
		this.services = e;
		let r = t.filter((e) => e.hidden !== !0);
		this.picker = Oi.create(e.root, () => r, n.strings, n.dom, n.icons, n.roving, (e) => this.addNode(e));
	}
	open() {
		this.loose = null, this.picker?.open();
	}
	openFor(e) {
		this.picker?.open(), this.loose = e;
	}
	close() {
		this.picker?.close();
	}
	addNode(e) {
		let t = this.services.settings, n = this.loose;
		if (this.loose = null, t.readOnly) return;
		let r = n?.at ?? this.services.pointerScene(), i = fr(e, C(r.x, t.gridSize, t.snapping), C(r.y, t.gridSize, t.snapping)), a = this.services.documentState.document;
		a.nodes.push(i), n !== null && a.nodes.some((e) => e.id === n.fromNode) && this.wire(a, n, i, e), this.services.selection.selectOnly(i.id), this.services.documentState.edited();
	}
	wire(e, t, n, r) {
		let i = r.inputs.find((e) => e.hasPin !== !1 && hr(e, n, r) && dr(t.fromType, e.type));
		i !== void 0 && e.edges.push({
			id: v("e"),
			fromNode: t.fromNode,
			fromPin: t.fromPin,
			toNode: n.id,
			toPin: i.name,
			points: []
		});
	}
}, Mi = "graph.run", Ni = "graph.run-all", Pi = "run-stop", Fi = "ui-graph--running", Ii = class {
	services;
	once;
	all;
	stop;
	asked = !1;
	running = !1;
	constructor(e) {
		this.services = e, this.once = e.root.querySelector("[data-ui-graph-run-once]"), this.all = e.root.querySelector("[data-ui-graph-run-all]"), this.stop = e.root.querySelector("[data-ui-graph-run-stop]"), this.once?.addEventListener("click", () => this.start(Mi)), this.all?.addEventListener("click", () => this.start(Ni)), this.stop?.addEventListener("click", () => e.root.dispatchEvent(new CustomEvent(Pi, { bubbles: !0 }))), this.draw();
	}
	setRunning(e) {
		this.running = e, this.asked = !1, this.draw();
	}
	saveCompleted(e) {
		!this.asked || e !== Mi && e !== Ni || (this.asked = !1, this.draw());
	}
	start(e) {
		this.asked || this.running || (this.asked = !0, this.draw(), this.services.documentState.requestSave(e));
	}
	draw() {
		let e = this.asked || this.running;
		this.once !== null && (this.once.disabled = e), this.all !== null && (this.all.disabled = e), this.stop !== null && (this.stop.disabled = !this.running), this.services.root.classList.toggle(Fi, e);
	}
}, Li = "image-upload", Ri = class {
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
		this.editorOf(e, t)?.setAttribute(Nr, "0%");
		try {
			let r = await this.context.uploads.uploadAsync([n], (n) => this.editorOf(e, t)?.setAttribute(Nr, `${n}%`));
			this.announce(e, t, r.selectionId, n.name);
		} catch {
			this.editorOf(e, t)?.setAttribute(Nr, this.context.strings.text("ui.graph.upload-failed"));
		}
	}
	announce(e, t, n, r) {
		this.root.dispatchEvent(new CustomEvent(Li, {
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
}, K = "data-ui-graph-drop", zi = ".ui-graph__row", Bi = "ui-graph__pin--aimed", Vi = class {
	services;
	host;
	types;
	pulledTo = null;
	constructor(e, t, n) {
		this.services = e, this.host = t, this.types = n;
	}
	get document() {
		return this.services.documentState.document;
	}
	beginConnect(e) {
		let t = this.connectionFrom(e);
		return t === null ? null : (this.offerDropTargets(t.fromNode, t.fromType), this.pulledTo = null, {
			kind: "kind",
			move: (e, n) => this.trackConnect(t, e, n),
			finish: (e) => this.finishConnection(e, t),
			cancel: () => this.cancelConnection(t),
			end: () => this.clearDropTargets()
		});
	}
	connectionFrom(e) {
		let t = e.closest(`[${o}]`)?.getAttribute(o);
		if (t == null) return null;
		let n = e.getAttribute(V);
		if (e.getAttribute("data-ui-graph-pin-dir") === "out") return {
			fromNode: t,
			fromPin: n,
			fromType: e.getAttribute("data-ui-graph-pin-type") ?? "any",
			detached: null
		};
		let r = mr(this.document, t, n).at(-1);
		if (r === void 0) return null;
		this.document.edges = this.document.edges.filter((e) => e.id !== r.id);
		let i = {
			fromNode: r.fromNode,
			fromPin: r.fromPin,
			fromType: z(this.document, this.types, r.fromNode, r.fromPin),
			detached: r
		};
		return this.services.draw(), i;
	}
	offerDropTargets(e, t) {
		this.services.root.classList.add("ui-graph--connecting");
		for (let n of this.services.nodeLayer.querySelectorAll(`[${V}]`)) {
			let r = n.getAttribute("data-ui-graph-pin-dir") === "in" && n.closest("[data-ui-graph-node]")?.getAttribute("data-ui-graph-node") !== e && dr(t, n.getAttribute("data-ui-graph-pin-type") ?? "any");
			n.setAttribute(K, r ? "yes" : "no");
		}
		for (let e of this.services.nodeLayer.querySelectorAll(zi)) {
			let t = e.querySelector(`[${V}][${Dr}="in"]`);
			e.setAttribute(K, t?.getAttribute(K) === "yes" ? "yes" : "no");
		}
	}
	aimAt(e) {
		let t = document.elementFromPoint(e.clientX, e.clientY)?.closest(`[data-ui-graph-pin][${K}="yes"]`) ?? null;
		Ut(this.services.nodeLayer, t, (e, t) => e.classList.toggle(Bi, t));
	}
	clearDropTargets() {
		this.services.root.classList.remove("ui-graph--connecting");
		for (let e of this.services.nodeLayer.querySelectorAll(`[${K}]`)) e.removeAttribute(K), e.classList.remove(Bi);
	}
	trackConnect(e, t, n) {
		let r = this.host.pinPoint(e.fromNode, e.fromPin, "out");
		r !== null && this.services.drawPending(r, t, this.host.pinColor(e.fromType)), this.pulledTo = t, this.aimAt(n);
	}
	cancelConnection(e) {
		e.detached !== null && (this.document.edges.push(e.detached), this.services.draw());
	}
	finishConnection(e, t) {
		let n = document.elementFromPoint(e.clientX, e.clientY), r = n?.closest("[data-ui-graph-pin][data-ui-graph-pin-dir=\"in\"]") ?? null, i = r?.closest("[data-ui-graph-node]")?.getAttribute("data-ui-graph-node") ?? null, a = r?.getAttribute("data-ui-graph-pin") ?? null;
		if (i === null || a === null) {
			t.detached === null ? this.pulledTo !== null && n?.closest("[data-ui-graph-node]") === null && this.host.dropOnNothing({
				fromNode: t.fromNode,
				fromPin: t.fromPin,
				fromType: t.fromType,
				at: this.pulledTo
			}) : this.services.documentState.edited();
			return;
		}
		let o = r?.getAttribute("data-ui-graph-pin-type") ?? "any";
		if (t.detached !== null && t.detached.toNode === i && t.detached.toPin === a) {
			this.cancelConnection(t);
			return;
		}
		if (i === t.fromNode || !dr(t.fromType, o)) {
			t.detached !== null && (this.document.edges.push(t.detached), this.services.draw());
			return;
		}
		if (this.inputPin(i, a)?.multiple === !0) {
			if (this.document.edges.some((e) => e.toNode === i && e.toPin === a && e.fromNode === t.fromNode && e.fromPin === t.fromPin)) {
				t.detached !== null && this.document.edges.push(t.detached), this.services.draw();
				return;
			}
		} else this.document.edges = this.document.edges.filter((e) => e.toNode !== i || e.toPin !== a);
		this.document.edges.push({
			id: v("e"),
			fromNode: t.fromNode,
			fromPin: t.fromPin,
			toNode: i,
			toPin: a,
			points: []
		}), this.services.documentState.edited();
	}
	inputPin(e, t) {
		let n = this.document.nodes.find((t) => t.id === e);
		return R(n === void 0 ? void 0 : this.types.get(n.type), t, !1);
	}
}, Hi = ".ui-graph__editor", Ui = "[data-ui-graph-log], [data-ui-graph-run], .ui-graph__run-panel", Wi = "data-ui-graph-catalog", Gi = "graph.reroute", Ki = 30, qi = 12, Ji = {
	name: "nodes",
	readDocument: or,
	create: (e) => new Yi(e)
}, Yi = class {
	services;
	types = /* @__PURE__ */ new Map();
	seriesColors;
	wiring;
	wires = null;
	log;
	pickerBinding;
	upload;
	runPanel;
	clipboard = null;
	constructor(e) {
		let t = Xi(e.root.getAttribute(Wi));
		this.services = e, this.seriesColors = Zi(e.root);
		for (let e of t) this.types.set(e.key, e);
		this.pickerBinding = new ji(e, t), this.wiring = new Vi(e, {
			pinPoint: (e, t, n) => this.pinPoint(e, t, n),
			pinColor: (e) => this.pinColor(e),
			dropOnNothing: (e) => this.pickerBinding.openFor(e)
		}, this.types), this.log = new _i(e, this.types), this.upload = new Ri(e), this.runPanel = new Ii(e), this.log.setLogOpen(e.context.store.read(e.root, "log") === "open"), this.log.drawRun();
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
		return Ur(t, this.types.get(t.type), {
			words: n.strings,
			icons: n.icons,
			readOnly: this.services.settings.readOnly,
			pinColor: (e) => this.pinColor(e),
			outputType: (e, t) => z(this.document, this.types, e, t),
			feedTitle: (e, t) => this.feedTitle(e, t, /* @__PURE__ */ new Set()),
			isConnected: (e, t, n) => n === "in" ? pr(this.document, e, t) !== void 0 : this.document.edges.some((n) => n.fromNode === e && n.fromPin === t),
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
		this.log.reapplyToRedrawnNodes(e), this.services.settings.snapping && Ue(this.services.nodeElements.values(), this.services.settings.gridSize);
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
		let t = x(this.document.edges.flatMap((t) => {
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
		return this.pinColor(z(this.document, this.types, t.fromNode, t.fromPin));
	}
	pinPoint(e, t, n) {
		let r = this.services.nodeElements.get(e)?.querySelector(`[${V}="${CSS.escape(t)}"][${Dr}="${n}"]`);
		return r == null ? null : this.services.centerOf(r);
	}
	feedTitle(e, t, n) {
		let r = pr(this.document, e, t);
		if (r === void 0 || n.has(r.fromNode)) return null;
		n.add(e);
		let i = this.document.nodes.find((e) => e.id === r.fromNode), a = i === void 0 ? void 0 : this.types.get(i.type), o = a?.compact === !0 ? a.inputs[0] : void 0;
		return o === void 0 ? R(a, r.fromPin, !0)?.title ?? null : this.feedTitle(r.fromNode, o.name, n);
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
		}[e] ?? Qi(e) + 1) - 1) % this.seriesColors + 1})`;
	}
	setValue(e, t, n) {
		let r = this.document.nodes.find((t) => t.id === e);
		r !== void 0 && (r.values[t] = n, this.services.documentState.edited(this.types.get(r.type)?.inputs.some((e) => e.visibleWhen === t) === !0));
	}
	setPinValue(e, t, n, r) {
		let i = (r) => {
			let i = r.nodes.find((t) => t.id === e);
			i !== void 0 && (i.values[t] = n);
		};
		if (this.document.nodes.some((t) => t.id === e)) {
			if (r) {
				let r = this.showCommitted(e, t, n);
				this.services.documentState.committed((e) => i(e), !r);
				return;
			}
			i(this.document), this.services.documentState.edited();
		}
	}
	showCommitted(e, t, n) {
		let r = this.document.nodes.find((t) => t.id === e), i = r === void 0 ? void 0 : this.types.get(r.type), a = this.services.nodeElements.get(e)?.querySelector(`[${jr}="${CSS.escape(t)}"] > *`);
		return i === void 0 || a == null || i.inputs.some((e) => e.visibleWhen === t) ? !1 : (this.services.context.properties.set(a, "Value", n ?? i.inputs.find((e) => e.name === t)?.defaultValue ?? null), !0);
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
	setRunning(e) {
		e && this.services.documentState.settle(), this.runPanel.setRunning(e), this.log.setRunning(e);
	}
	saveCompleted(e, t) {
		this.runPanel.saveCompleted(t);
	}
	isEditor(e) {
		return e.closest(Hi) !== null && e.closest("[data-ui-graph-head]") === null;
	}
	isPanel(e) {
		return e.closest(Ui) !== null;
	}
	pointerDown(e, t) {
		let n = t.closest(`[${V}]`);
		return n === null || this.services.settings.readOnly ? !1 : this.wiring.beginConnect(n) ?? !0;
	}
	chrome(e) {
		if (e.closest("[data-ui-graph-log-toggle]") !== null) return this.log.setLogOpen(!this.log.isLogOpen(), !0), !0;
		if (e.closest("[data-ui-graph-log-clear]") !== null) return this.log.clearLog(), !0;
		let t = e.closest(`[${pi}]`);
		return t !== null && (this.log.goToNode(t.getAttribute(pi)), !0);
	}
	backgroundDoubleClick() {
		this.pickerBinding.open();
	}
	escape() {
		this.pickerBinding.close();
	}
	copy(e) {
		this.clipboard = _r(this.document, e);
	}
	paste() {
		if (this.clipboard === null) return null;
		let e = this.services.settings.gridSize * 2, t = vr(this.clipboard, e, e);
		return this.document.nodes.push(...t.nodes), this.document.edges.push(...t.edges), this.clipboard = _r(this.document, new Set(t.nodes.map((e) => e.id))), t.nodes.map((e) => e.id);
	}
	remove(e, t) {
		let n = this.document;
		n.nodes = n.nodes.filter((t) => !e.has(t.id)), n.edges = n.edges.filter((n) => !t.has(n.id) && !e.has(n.fromNode) && !e.has(n.toNode));
	}
	arrange(e, t) {
		let n = this.services.settings;
		return Qn(this.document, {
			sizes: e,
			only: t,
			pinOffset: (e, t, n) => this.pinOffset(e, t, n),
			gridSize: n.snapping ? n.gridSize : 0
		});
	}
	pinOffset(e, t, n) {
		let r = this.services.nodeElements.get(e), i = this.pinPoint(e, t, n);
		return r === void 0 || i === null ? null : Math.round(i.y - (this.services.centerOf(r).y - r.offsetHeight / 2));
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
		return !0;
	}
	runCommand(e, t) {
		switch (e) {
			case "graph:add-node": return this.pickerBinding.open(), !0;
			case "graph:add-reroute": return (t === null || t.kind === "edge") && this.addReroute(t?.id ?? null), !0;
			case "graph:reset-state": return t?.kind === "node" && this.resetState(t.id), !0;
			case "graph:delete-edge": return t?.kind === "edge" && !this.services.settings.readOnly && (this.document.edges = this.document.edges.filter((e) => e.id !== t.id), this.services.documentState.edited()), !0;
			default: return !1;
		}
	}
	addReroute(e) {
		let t = e === null ? null : this.document.edges.find((t) => t.id === e), n = this.types.get(Gi), r = n?.inputs[0], i = n?.outputs[0];
		if (this.services.settings.readOnly || t === void 0 || n === void 0 || r === void 0 || i === void 0) return;
		let a = this.services.settings, o = this.services.pointerScene(), s = fr(n, C(o.x - Ki, a.gridSize, a.snapping), C(o.y - qi, a.gridSize, a.snapping));
		this.document.nodes.push(s), t !== null && (this.document.edges = [
			...this.document.edges.filter((e) => e.id !== t.id),
			{
				id: v("e"),
				fromNode: t.fromNode,
				fromPin: t.fromPin,
				toNode: s.id,
				toPin: r.name,
				points: []
			},
			{
				id: v("e"),
				fromNode: s.id,
				fromPin: i.name,
				toNode: t.toNode,
				toPin: t.toPin,
				points: []
			}
		]), this.services.selection.selectOnly(s.id), this.services.documentState.edited();
	}
	syncMenus(e, t) {
		for (let t of [
			"graph:add-node",
			"graph:add-reroute",
			"graph:delete-edge",
			"graph:reset-state"
		]) D(this.services.root, t, e);
		O(this.services.root, "graph:reset-state", t?.kind === "node" && this.statePins(t.id).length > 0);
	}
	resetState(e) {
		let t = this.document.nodes.find((t) => t.id === e), n = this.statePins(e);
		if (!(this.services.settings.readOnly || t === void 0 || n.length === 0)) {
			for (let e of n) t.values[e.name] = e.defaultValue ?? null;
			this.services.documentState.edited();
		}
	}
	statePins(e) {
		let t = this.document.nodes.find((t) => t.id === e);
		return t === void 0 ? [] : this.types.get(t.type)?.inputs.filter((e) => e.state === !0) ?? [];
	}
};
function Xi(e) {
	let t = m(e);
	return Array.isArray(t) ? t : [];
}
function Zi(e) {
	let t = Number(getComputedStyle(e).getPropertyValue("--ui-color-series-count"));
	return Number.isFinite(t) && t >= 1 ? Math.floor(t) : 8;
}
function Qi(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t = t * 31 + e.charCodeAt(n) >>> 0;
	return t;
}
//#endregion
//#region src/production/craft-view.ts
var $i = u.slice(1);
function ea(e, t) {
	let n = e.readCulture(t);
	return (t) => e.format(Math.round(t * 1e3) / 1e3, null, n);
}
function ta(e, t, n) {
	let r = document.createElement("div"), i = document.createElement("span"), a = document.createElement("span");
	if (r.className = "ui-graph__node ui-graph__craft", r.setAttribute(o, t.id), r.style.setProperty("--ui-graph-node-x", String(e.x)), r.style.setProperty("--ui-graph-node-y", String(e.y)), t.color !== null && r.style.setProperty("--ui-graph-node-color", t.color), n.conflict !== null && r.setAttribute("data-ui-graph-conflict", n.conflict), e.pinned === !0 && r.setAttribute("data-ui-graph-pinned", ""), i.className = `${$i} ui-graph__craft-name`, i.textContent = t.title ?? n.word, a.className = "ui-graph__craft-time", a.textContent = n.note ?? q(t.time, n.number), r.append(i, a), n.connectable) {
		let e = document.createElement("span"), t = document.createElement("span");
		e.className = "ui-graph__handle", e.setAttribute(Wt, ""), t.className = "ui-graph__entry", t.setAttribute(Gt, ""), r.append(t, e);
	}
	let s = t.tooltip ?? na(t, n.resource, n.number);
	return r.addEventListener("pointerenter", () => n.tooltips.show(r, s)), r.addEventListener("pointerleave", () => n.tooltips.hide()), r;
}
function na(e, t, n) {
	let r = (e) => e.map((e) => `${ra(e.amount, t(e.resource)?.unit ?? null, n)} ${t(e.resource)?.title ?? e.resource}`).join(" + ");
	return `${r(e.ingredients) || "—"} → ${r(e.products) || "—"}`;
}
function q(e, t) {
	return `${t(e)} s`;
}
function ra(e, t, n) {
	return t === null ? `×${n(e)}` : `×${n(e)} ${t}`;
}
function ia(e, t, n, r) {
	return `${ra(e, t, r)} · ${q(n, r)}`;
}
function aa(e, t) {
	let n = e.trim().replace("×", "").trim(), r = Number(t === "," ? n.replace(",", ".") : n.replaceAll(",", ""));
	return Number.isFinite(r) && r > 0 ? r : null;
}
//#endregion
//#region src/production/model.ts
function oa() {
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
		},
		key: null
	};
}
function sa(e) {
	let t = e;
	if (typeof t != "object" || !t) return oa();
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
			points: g(e.points)
		})),
		groups: (t.groups ?? []).map(_),
		draft: {
			resources: (n?.resources ?? []).flatMap((e) => {
				let t = da(e);
				return t === null ? [] : [{
					..._a(t),
					...la(e)
				}];
			}),
			crafts: (n?.crafts ?? []).flatMap((e) => {
				let t = fa(e);
				return t === null ? [] : [{
					...va(t),
					...la(e)
				}];
			}),
			removed: (n?.removed ?? []).map((e) => String(e))
		},
		plan: ca(t.plan),
		key: p(t)
	};
}
function ca(e) {
	let t = e ?? {}, n = String(t.period ?? "").toLowerCase(), r = String(t.objective ?? "").toLowerCase();
	return {
		targets: pa(t.targets),
		period: n === "minute" ? "Minute" : n === "hour" ? "Hour" : "Once",
		objective: r === "leasttime" ? "LeastTime" : r === "leastcost" ? "LeastCost" : "LeastRaw",
		bought: Array.isArray(t.bought) ? t.bought.map((e) => String(e)) : []
	};
}
function la(e) {
	let t = e;
	return {
		created: t.created === !0,
		baseline: typeof t.baseline == "string" ? t.baseline : null
	};
}
function ua(e) {
	if (typeof e != "object" || !e) return null;
	let t = e.kind;
	return t === "Craft" || t === "craft" || t === 1 ? fa(e) : t === "Resource" || t === "resource" || t === 0 ? da(e) : null;
}
function da(e) {
	let t = e;
	return typeof t.id != "string" || t.id.length === 0 ? null : {
		kind: "resource",
		id: t.id,
		title: J(t.title),
		icon: J(t.icon),
		color: J(t.color),
		tooltip: J(t.tooltip),
		image: J(t.image),
		category: J(t.category),
		unit: J(t.unit),
		cost: typeof t.cost == "number" && Number.isFinite(t.cost) ? t.cost : null
	};
}
function fa(e) {
	let t = e;
	return typeof t.id != "string" || t.id.length === 0 ? null : {
		kind: "craft",
		id: t.id,
		title: J(t.title),
		icon: J(t.icon),
		color: J(t.color),
		tooltip: J(t.tooltip),
		ingredients: pa(t.ingredients),
		products: pa(t.products),
		time: ma(t.time)
	};
}
function pa(e) {
	return Array.isArray(e) ? e.flatMap((e) => {
		let t = e;
		return typeof t == "object" && t && typeof t.resource == "string" ? [{
			resource: t.resource,
			amount: Number(t.amount) || 0
		}] : [];
	}) : [];
}
function J(e) {
	return typeof e == "string" && e.length > 0 ? e : null;
}
function ma(e) {
	if (typeof e == "number") return Number.isFinite(e) ? e : 0;
	if (typeof e != "string") return 0;
	let t = /^(-)?(?:(\d+)\.)?(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(e.trim());
	if (t === null) return 0;
	let n = Number(t[2] ?? 0) * 86400 + Number(t[3]) * 3600 + Number(t[4]) * 60 + Number(t[5]);
	return t[1] === "-" ? -n : n;
}
function ha(e) {
	let t = Math.round(Math.max(0, e) * 1e7), n = Math.floor(t / 864e9), r = t - n * 86400 * 1e7, i = Math.floor(r / 36e9), a = Math.floor(r % 36e9 / 6e8), o = Math.floor(r % 6e8 / 1e7), s = r % 1e7, c = `${ga(i)}:${ga(a)}:${ga(o)}${s === 0 ? "" : `.${String(s).padStart(7, "0")}`}`;
	return n > 0 ? `${n}.${c}` : c;
}
function ga(e) {
	return String(e).padStart(2, "0");
}
function _a(e) {
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
function va(e) {
	return {
		id: e.id,
		title: e.title,
		icon: e.icon,
		color: e.color,
		tooltip: e.tooltip,
		ingredients: e.ingredients.map((e) => ({ ...e })),
		products: e.products.map((e) => ({ ...e })),
		time: ha(e.time),
		created: !1,
		baseline: null
	};
}
function ya(e, t) {
	let n = [...t.resources, ...t.crafts], r = new Set(t.crafts);
	return an(e, n, t.removed, (e) => r.has(e) ? fa(e) : da(e));
}
function ba(e, t) {
	let n = e.ingredients.filter((e) => !t.has(e.resource)), r = e.products.filter((e) => !t.has(e.resource)), i = n.length !== e.ingredients.length;
	return !i && r.length === e.products.length ? null : {
		ingredients: n,
		products: r,
		goes: n.length === 0 && (i || r.length === 0)
	};
}
function xa(e, t) {
	return on(e, [...t.resources, ...t.crafts]);
}
function Sa(e) {
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
				id: Ca(e.id, t.resource),
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
			id: Ca(e.id, t.resource),
			from: t.resource,
			to: e.id,
			craft: e.id,
			resource: t.resource,
			role: "ingredient",
			amount: t.amount
		});
		for (let t of o) i.push({
			id: wa(e.id, t.resource),
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
			edge: wa(n.id, e)
		}), a.has(n.id) || s.add(wa(n.id, e));
	}
	return {
		edges: i,
		collapsed: a,
		outputs: o,
		quiet: s
	};
}
function Ca(e, t) {
	return `${e}<${t}`;
}
function wa(e, t) {
	return `${e}>${t}`;
}
//#endregion
//#region src/production/production-editing.ts
var Ta = "graph-link-menu", Ea = class {
	services;
	number;
	decimalSeparator;
	host;
	constructor(e, t) {
		this.services = e, this.host = t, this.number = ea(e.context.numbers, e.root), this.decimalSeparator = e.context.numbers.readCulture(e.root).decimalSeparator;
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
				...va(r),
				baseline: a
			};
			return t.crafts.push(e), e;
		}
		let o = {
			..._a(r),
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
		let e = ln("resource", this.keys()), t = this.services.pointerScene();
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
		return cn(this.host.entries(), [], this.document.draft.removed);
	}
	removeEntries(e) {
		let t = this.document.draft, n = /* @__PURE__ */ new Set();
		for (let r of e) {
			let e = [...t.resources, ...t.crafts].some((e) => e.id === r && e.created);
			this.host.entry(r)?.kind === "resource" && n.add(r), t.resources = t.resources.filter((e) => e.id !== r), t.crafts = t.crafts.filter((e) => e.id !== r), !e && this.host.serverEntry(r) !== void 0 && !t.removed.includes(r) && t.removed.push(r);
		}
		n.size > 0 && this.dropResources(n);
	}
	dropResources(e) {
		let t = /* @__PURE__ */ new Set();
		for (let n of this.host.entries()) {
			if (n.kind !== "craft" || !this.stands(n.id) || ba(n, e) === null) continue;
			let r = this.craftOf(n.id), i = ba(r, e);
			if (i !== null) {
				if (i.goes) {
					t.add(r.id);
					continue;
				}
				r.ingredients = i.ingredients, r.products = i.products;
			}
		}
		t.size > 0 && this.removeEntries(t);
	}
	stands(e) {
		let t = this.document.draft;
		return t.crafts.some((t) => t.id === e) || t.resources.some((t) => t.id === e) || this.host.serverEntry(e) !== void 0 && !t.removed.includes(e);
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
		return Jt(this.services, e, {
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
				}, it(this.services.root, Ta, n.clientX, n.clientY);
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
			id: ln("craft", this.keys()),
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
			time: ha(1),
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
		let n = this.host.edge(e), r = Xt(this.services, e);
		if (n === void 0 || r === null) return;
		let i = t === "in" ? n.role !== "product" : n.role === "product", a = t === "in" ? n.resource : n.product ?? n.resource, o = t === "in" ? n.amount : n.output ?? n.amount;
		Zt(this.services, r, this.number(o), (e) => {
			let t = aa(e, this.decimalSeparator), r = t === null ? null : this.craftOf(n.craft);
			if (t === null || r === null) return;
			let o = (e) => e.map((e) => e.resource === a ? {
				...e,
				amount: t
			} : e);
			i ? r.ingredients = o(r.ingredients) : r.products = o(r.products), this.services.documentState.edited();
		});
	}
	editTime(e) {
		let t = this.host.entry(e), n = this.host.collapsed(e) ? null : this.services.nodeRect(e), r = this.host.craftEdge(e), i = n === null ? r === void 0 ? null : Xt(this.services, r) : {
			x: n.x + n.width / 2,
			y: n.y + n.height / 2
		};
		i !== null && t?.kind === "craft" && Zt(this.services, i, this.number(t.time), (t) => {
			let n = aa(t, this.decimalSeparator), r = n === null ? null : this.craftOf(e);
			n !== null && r !== null && ma(r.time) !== n && (r.time = ha(n), this.services.documentState.edited());
		});
	}
}, Y = 1e-9, Da = 1e-12;
function Oa(e) {
	let t = e.cost.length, n = e.rows.length, r = [];
	for (let t = 0; t < n; t++) e.atLeast[t] > Y && r.push(t);
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
		if (!ka(o, s, f, i, (e) => d[e] < -1e-9)) return "unsettled";
		let e = 0;
		for (let t = 0; t < n; t++) s[t] >= i && (e += o[t][a]);
		if (e > 1e-7 * c) return "infeasible";
		Na(o, s, f, i);
	}
	if (!ka(o, s, f, i, (e) => l[e] < -1e-9) || !ka(o, s, f, i, (e) => Math.abs(l[e]) <= Y && u[e] < -1e-9)) return "unsettled";
	let p = Array(t).fill(0);
	for (let e = 0; e < n; e++) s[e] < t && (p[s[e]] = Math.max(0, o[e][a]));
	return p;
}
function ka(e, t, n, r, i) {
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
			if (e[n][o] <= Y) continue;
			let r = e[n][a] / e[n][o];
			s < 0 || r < c - Y ? (s = n, c = r) : r <= c + Y && t[n] < t[s] && (s = n, c = Math.min(c, r));
		}
		if (s < 0) return !1;
		Aa(e, t, n, s, o);
	}
	return !1;
}
function Aa(e, t, n, r, i) {
	let a = e[r], o = a[i];
	for (let e = 0; e < a.length; e++) a[e] = Ma(a[e] / o);
	a[i] = 1;
	for (let t = 0; t < e.length; t++) t !== r && ja(e[t], a, i);
	for (let e of n) ja(e, a, i);
	t[r] = i;
}
function ja(e, t, n) {
	let r = e[n];
	if (r !== 0) {
		for (let n = 0; n < e.length; n++) e[n] = Ma(e[n] - r * t[n]);
		e[n] = 0;
	}
}
function Ma(e) {
	return Math.abs(e) < Da ? 0 : e;
}
function Na(e, t, n, r) {
	let i = e[0].length - 1;
	for (let a = 0; a < e.length; a++) if (!(t[a] < r)) {
		e[a][i] = 0;
		for (let i = 0; i < r; i++) if (Math.abs(e[a][i]) > Y) {
			Aa(e, t, n, a, i);
			break;
		}
	}
}
//#endregion
//#region src/production/plan.ts
var X = 1e-9;
function Pa(e) {
	return e.source ? e.consumed + e.target : 0;
}
function Fa(e) {
	return e === "Minute" ? 60 : e === "Hour" ? 3600 : null;
}
function Ia(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let t of e) t.kind === "resource" && !n.has(t.id) && n.set(t.id, t);
	let r = e.filter((e) => e.kind === "craft"), i = new Set(t.bought ?? []), a = /* @__PURE__ */ new Map();
	for (let e of r) for (let t of Z(e.products, n)) {
		if (i.has(t.resource)) continue;
		let n = a.get(t.resource);
		n === void 0 ? a.set(t.resource, [e]) : n.includes(e) || n.push(e);
	}
	let o = /* @__PURE__ */ new Map();
	for (let e of t.targets) n.has(e.resource) && e.amount > X && o.set(e.resource, (o.get(e.resource) ?? 0) + e.amount);
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
		for (let e of Z(t.ingredients, n)) s.has(e.resource) || (s.add(e.resource), l.push(e.resource));
	}
	let u = r.filter((e) => c.has(e)), d = [...n.keys()].filter((e) => s.has(e) && a.has(e)), f = d.map((e) => u.map((t) => Va(t.products, e) - Va(t.ingredients, e))), p = d.map((e) => o.get(e) ?? 0), m = t.objective === "LeastCost", h = u.map((e) => za(e, n, a, !1)), g = m ? u.map((e) => za(e, n, a, !0)) : h, _ = u.map((e) => Math.max(0, e.time)), v = t.objective === "LeastTime" ? Oa({
		rows: f,
		atLeast: p,
		cost: _,
		tieCost: h
	}) : Oa({
		rows: f,
		atLeast: p,
		cost: g,
		tieCost: _
	});
	return Array.isArray(v) ? Ra(n, a, o, u, (t.period === "Once" ? La(f, p, v) : null) ?? v, Fa(t.period)) : {
		status: v === "infeasible" ? "Infeasible" : "Unsettled",
		crafts: [],
		resources: [],
		time: 0,
		raw: 0,
		cost: 0
	};
}
function La(e, t, n) {
	let r = n.map((e) => e <= X ? 0 : Math.ceil(e - 1e-6));
	for (let i = 0; i < 1e3; i++) {
		let i = !1;
		for (let a = 0; a < e.length; a++) {
			let o = 0;
			for (let t = 0; t < r.length; t++) o += e[a][t] * r[t];
			if (o >= t[a] - 1e-6) continue;
			let s = -1;
			for (let t = 0; t < r.length; t++) e[a][t] > X && (s < 0 || n[t] > n[s] + X) && (s = t);
			if (s < 0) return null;
			r[s] += Math.ceil((t[a] - o) / e[a][s] - 1e-9), i = !0;
		}
		if (!i) return r;
	}
	return null;
}
function Ra(e, t, n, r, i, a) {
	let o = [], s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), l = 0;
	for (let t = 0; t < r.length; t++) {
		let n = r[t], u = i[t];
		if (u <= X) continue;
		let d = u * Math.max(0, n.time);
		o.push({
			craft: n.id,
			runs: u,
			time: d,
			workers: a === null ? null : Math.ceil(d / a - X)
		}), l += d;
		for (let t of Z(n.products, e)) s.set(t.resource, (s.get(t.resource) ?? 0) + u * t.amount);
		for (let t of Z(n.ingredients, e)) c.set(t.resource, (c.get(t.resource) ?? 0) + u * t.amount);
	}
	let u = [], d = 0, f = 0;
	for (let r of e.values()) {
		if (!n.has(r.id) && !s.has(r.id) && !c.has(r.id)) continue;
		let e = !t.has(r.id), i = n.get(r.id) ?? 0, a = s.get(r.id) ?? 0, o = c.get(r.id) ?? 0;
		e && (d += o + i, f += (o + i) * Ba(r)), u.push({
			resource: r.id,
			source: e,
			target: i,
			produced: a,
			consumed: o,
			surplus: e ? 0 : Ha(a - o - i)
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
function za(e, t, n, r) {
	let i = 0;
	for (let a of Z(e.ingredients, t)) n.has(a.resource) || (i += a.amount * (r ? Ba(t.get(a.resource)) : 1));
	return i;
}
function Ba(e) {
	return e.cost !== null && Number.isFinite(e.cost) && e.cost >= 0 ? e.cost : 1;
}
function Z(e, t) {
	return e.filter((e) => t.has(e.resource) && e.amount > 0);
}
function Va(e, t) {
	let n = 0;
	for (let r of e) r.resource === t && r.amount > 0 && (n += r.amount);
	return n;
}
function Ha(e) {
	return Math.abs(e) < 1e-7 ? 0 : e;
}
//#endregion
//#region src/production/plan-view.ts
function Ua(e, t) {
	return {
		plan: e,
		period: t,
		crafts: new Map(e.crafts.map((e) => [e.craft, e])),
		resources: new Map(e.resources.map((e) => [e.resource, e]))
	};
}
function Wa(e, t) {
	return e.filter((e) => e.kind === "craft" ? t.crafts.has(e.id) : t.resources.has(e.id));
}
function Ga(e, t) {
	return e === "Minute" ? t.text("ui.graph.per-minute") : e === "Hour" ? t.text("ui.graph.per-hour") : "";
}
function Ka(e, t, n) {
	return ra(e, t, n);
}
function qa(e, t, n, r) {
	let i = t === void 0 ? null : Ja(t);
	return i !== null && Math.abs(i - e) < 1e-6 ? null : Ka(e, n, r);
}
function Ja(e) {
	return e.source ? Pa(e) : e.produced;
}
function Ya(e, t, n) {
	return e.workers === null ? q(e.time, n) : t.text("ui.graph.plan-at-once").replace("{count}", n(e.workers));
}
function Xa(e, t, n, r, i) {
	let a = Ka(Ja(e), t, i);
	return n === void 0 ? a : `${a} · ${Ya(n, r, i)}`;
}
function Za(e, t, n) {
	return `×${n(e.runs)} · ${Ya(e, t, n)}`;
}
//#endregion
//#region src/production/plan-panel.ts
var Qa = "[data-ui-graph-plan]", $a = "[data-ui-collapse-toggle]", eo = "data-ui-collapsed", to = "[data-ui-graph-plan-targets]", no = "[data-ui-graph-plan-add]", ro = "data-ui-graph-plan-remove", io = "[data-ui-graph-plan-message]", ao = "[data-ui-graph-plan-totals]", oo = "data-ui-graph-plan-rate", so = "plan", co = class {
	services;
	number;
	host;
	panel;
	period;
	objective;
	drawnKey = "";
	constructor(e, t) {
		this.services = e, this.host = t, this.number = ea(e.context.numbers, e.root), this.panel = e.root.querySelector(Qa), this.period = this.field("[data-ui-graph-plan-period]"), this.objective = this.field("[data-ui-graph-plan-objective]"), this.period?.addEventListener("change", () => this.choose()), this.objective?.addEventListener("change", () => this.choose()), this.panel !== null && e.context.store.read(e.root, so) === "folded" && (this.panel.setAttribute(eo, ""), this.panel.querySelector($a)?.setAttribute("aria-expanded", "false"));
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
		if (e.closest($a) !== null) return this.services.context.store.write(this.services.root, so, this.panel.hasAttribute(eo) ? "folded" : null), !0;
		if (!this.services.settings.readOnly && this.edit(e)) return !0;
		let t = e.closest("[data-ui-graph-plan-item]")?.getAttribute("data-ui-graph-plan-item");
		return t != null && this.host.show(t), !0;
	}
	edit(e) {
		if (e.closest(no) !== null) return this.host.pick(), !0;
		let t = e.closest(`[${ro}]`)?.getAttribute(ro);
		if (t == null) return !1;
		let n = this.host.request();
		return this.host.change({
			...n,
			targets: n.targets.filter((e) => e.resource !== t)
		}), !0;
	}
	draw(e) {
		if (this.panel === null || e === this.drawnKey) return;
		this.drawnKey = e;
		let t = this.host.request(), n = this.host.reading(), r = this.services.settings.readOnly, i = this.services.context.properties;
		this.period !== null && (i.set(this.period, "Value", t.period), i.set(this.period, "IsReadOnly", r)), this.objective !== null && (i.set(this.objective, "Value", t.objective), i.set(this.objective, "IsReadOnly", r));
		let a = this.field(no);
		a !== null && i.set(a, "Enabled", !r), this.panel.toggleAttribute(oo, t.period !== "Once");
		for (let e of this.panel.querySelectorAll("[data-ui-graph-plan-counted]")) e.setAttribute("data-ui-graph-plan-counted", Ga(t.period, this.services.context.strings));
		this.drawTargets(t, r), this.drawMessage(t, n), this.drawTables(n);
	}
	drawTargets(e, t) {
		let n = this.panel.querySelector(to);
		if (n !== null) {
			n.replaceChildren();
			for (let r of e.targets) {
				let e = this.host.resource(r.resource), i = document.createElement("div"), a = this.nameOf(r.resource, e?.title ?? r.resource, e?.image ?? e?.icon ?? null), o = this.clone("graph-plan-amount"), s = this.clone("graph-plan-remove");
				i.className = "ui-graph__plan-target", i.append(a), o !== null && (this.services.context.properties.set(o, "Value", r.amount), this.services.context.properties.set(o, "IsReadOnly", t), o.addEventListener("change", () => this.setAmount(r.resource, this.services.context.values.read(o))), i.append(o)), s !== null && (s.setAttribute(ro, r.resource), this.services.context.properties.set(s, "Enabled", !t), i.append(s)), n.append(i);
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
		let n = this.services.context.strings, r = this.panel.querySelector(io), i = this.panel.querySelector(ao);
		if (r !== null) {
			r.hidden = t !== null;
			let i = e.targets.length > 0 ? this.host.failure() : null;
			r.toggleAttribute("data-ui-graph-plan-failed", i !== null), r.textContent = t === null ? n.text(i === null ? "ui.graph.plan-empty" : `ui.graph.plan-${i}`) : "";
		}
		i !== null && (i.hidden = t === null, t !== null && (i.textContent = n.text("ui.graph.plan-totals").replace("{time}", q(t.plan.time, this.number)).replace("{raw}", this.number(t.plan.raw)).replace("{cost}", this.number(t.plan.cost))));
	}
	drawTables(e) {
		let t = this.services.context.strings, n = [], r = [], i = [];
		for (let t of e?.plan.resources ?? []) {
			let e = this.host.resource(t.resource), i = e?.unit === null || e?.unit === void 0 ? "" : ` ${e.unit}`, a = this.nameOf(t.resource, e?.title ?? t.resource, e?.image ?? e?.icon ?? null);
			if (t.source) {
				n.push(lo(t.resource, a, `${this.number(Pa(t))}${i}`));
				continue;
			}
			r.push(lo(t.resource, a, `${this.number(t.produced)}${i}`, `${this.number(t.consumed)}${i}`, t.surplus > 0 ? `${this.number(t.surplus)}${i}` : "—"));
		}
		for (let n of e?.plan.crafts ?? []) {
			let e = this.host.craft(n.craft), r = e?.products[0] === void 0 ? void 0 : this.host.resource(e.products[0].resource), a = this.nameOf(n.craft, e?.title ?? t.text("ui.graph.recipe"), e?.icon ?? r?.image ?? r?.icon ?? null);
			i.push(lo(n.craft, a, this.number(n.runs), q(n.time, this.number), n.workers === null ? "—" : String(n.workers)));
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
function lo(e, t, ...n) {
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
var uo = 32, fo = 84, po = "graph:add-node", mo = "graph:amount", ho = "graph:output", go = "graph:craft-time", _o = "graph:delete-edge", vo = "graph:target", yo = "graph:bought", bo = "data-ui-graph-target", xo = {
	name: "production",
	readDocument: sa,
	create: (e) => new So(e)
}, So = class {
	snapsByCenter = !0;
	services;
	number;
	decimalSeparator;
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
	failure = null;
	constructor(e) {
		let t = m(e.root.getAttribute(Gn));
		this.services = e, this.number = ea(e.context.numbers, e.root), this.decimalSeparator = e.context.numbers.readCulture(e.root).decimalSeparator, this.server = Array.isArray(t) ? t.map(ua).filter((e) => e !== null) : [], this.editing = new Ea(e, {
			entries: () => this.entries,
			collapsed: (e) => this.collapsed.has(e),
			craftEdge: (e) => this.links.find((t) => t.craft === e)?.id,
			entry: (e) => this.entryById.get(e),
			serverEntry: (e) => this.serverById.get(e),
			edge: (e) => this.linkById.get(e)
		}), this.sheet = new Wn(e, {
			nodeIds: () => this.drawn.map((e) => e.id),
			links: () => this.links,
			layoutKey: () => this.reading === null ? this.shape : `${this.shape}|${this.drawn.map((e) => e.id).join(",")}`,
			nodeBox: (e, t, n) => this.shape === "icon" ? Yn(e, t, n) : {
				width: e,
				height: t
			}
		}, {
			nodeGap: uo,
			layerGap: fo
		}), this.panel = new co(e, {
			request: () => this.document.plan,
			reading: () => this.reading,
			failure: () => this.failure,
			resource: (e) => this.resource(e),
			craft: (e) => {
				let t = this.entryById.get(e);
				return t?.kind === "craft" ? t : void 0;
			},
			change: (e) => this.changePlan(e),
			pick: () => this.picker?.open(),
			show: (e) => this.show(e)
		}), this.picker = Oi.create(e.root, () => this.targetChoices(), e.context.strings, e.context.dom, e.context.icons, e.context.roving, (e) => this.setTarget(e.key, 1)), this.refresh();
	}
	targetChoices() {
		let e = new Set(this.document.plan.targets.map((e) => e.resource));
		return this.entries.flatMap((t) => t.kind === "resource" && !e.has(t.id) ? [{
			key: t.id,
			title: t.title ?? t.id,
			category: t.category,
			icon: t.image ?? t.icon
		}] : []);
	}
	get planning() {
		return this.services.root.getAttribute(St) === "plan";
	}
	get editable() {
		return !this.planning && !this.services.settings.readOnly && this.services.root.hasAttribute("data-ui-graph-edit-structure");
	}
	get document() {
		return this.services.documentState.document;
	}
	get shape() {
		return gn(this.services.root.getAttribute("data-ui-graph-node-shape")) ?? "icon";
	}
	applyChange(e) {
		yn(this.server, e, ua), this.serverVersion++, this.services.draw();
	}
	refresh() {
		let e = this.document.draft, t = this.planning, n = `${this.serverVersion}|${this.services.documentState.version}|${t}|${this.services.settings.readOnly}`;
		if (n === this.structureKey) return;
		this.structureKey = n, this.serverById = new Map(this.server.map((e) => [e.id, e])), this.entries = ya(this.server, e);
		let r = t ? Ia(this.entries, this.document.plan) : null;
		this.reading = r?.status === "Solved" ? Ua(r, this.document.plan.period) : null, this.failure = r?.status === "Infeasible" ? "infeasible" : r?.status === "Unsettled" ? "unsettled" : null;
		let i = this.reading === null ? t ? [] : this.entries : Wa(this.entries, this.reading), a = Sa(i);
		this.links = a.edges, this.collapsed = a.collapsed, this.outputs = a.outputs, this.quiet = a.quiet, this.drawn = i.filter((e) => !this.collapsed.has(e.id)), this.conflicts = xa(this.server, e), this.entryById = new Map(this.entries.map((e) => [e.id, e])), this.linkById = new Map(this.links.map((e) => [e.id, e])), this.sheet.structureChanged(), this.panel.draw(n);
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
			return ta(e, t, {
				tooltips: this.services.context.tooltips,
				word: r.text("ui.graph.recipe"),
				connectable: this.editable,
				conflict: n,
				note: i === void 0 ? null : Za(i, r, this.number),
				resource: (e) => this.resource(e),
				number: this.number
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
		}, a = this.outputs.get(i.id), o = this.reading?.resources.get(i.id), s = o !== void 0 && this.reading !== null ? Xa(o, i.unit ?? null, a !== void 0 && this.collapsed.has(a.craft) ? this.reading.crafts.get(a.craft) : void 0, r, this.number) : a === void 0 ? null : ia(a.amount, i.unit ?? null, a.time, this.number), c = $t(e, {
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
		return this.planning && this.document.plan.targets.some((e) => e.resource === i.id) && c.setAttribute(bo, ""), c;
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
		return n === void 0 || this.reading === null ? ra(e.amount, t, this.number) : e.role === "product" ? Ka(n.runs * e.amount, t, this.number) : qa(n.runs * e.amount, this.reading.resources.get(e.resource), t, this.number);
	}
	related(e) {
		return Bt(this.links, e);
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
		let n = t.closest(`[${Wt}]`);
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
		Zt(this.services, {
			x: t.x + t.width / 2,
			y: t.y + t.height / 2
		}, n === void 0 ? "" : this.number(n.amount), (t) => {
			let n = aa(t, this.decimalSeparator);
			t.trim().length === 0 ? this.setTarget(e, null) : n !== null && this.setTarget(e, n);
		});
	}
	show(e) {
		let t = this.collapsed.has(e) ? this.links.filter((t) => t.craft === e) : [], n = this.services.nodeRect(t[0]?.product ?? e);
		if (n !== null) {
			this.services.selection.clearSets(), t.length === 0 && this.services.selection.selectOnly(e);
			for (let e of t) this.services.selection.toggleEdge(e.id, !0);
			this.services.view.centerOnRect(n, 0, 0), this.services.draw();
		}
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
		let n = e === po || e === mo || e === ho || e === go || e === _o;
		if (e === "graph:link-ingredient" || e === "graph:link-recipe") return this.editable && this.editing.answerLink(e === "graph:link-ingredient"), !0;
		if (e === "graph:take-server" || e === "graph:keep-mine") {
			let n = this.conflictOf(t);
			if (n !== null && !this.services.settings.readOnly) {
				let t = this.document.draft, r = e === "graph:keep-mine";
				(sn(t.resources, n, this.serverById.get(n), r) || sn(t.crafts, n, this.serverById.get(n), r)) && this.services.documentState.edited();
			}
			return !0;
		}
		if (e === yo) {
			if (this.planning && t?.kind === "node" && this.isMade(t.id)) {
				let e = this.document.plan, n = e.bought ?? [];
				this.changePlan({
					...e,
					bought: n.includes(t.id) ? n.filter((e) => e !== t.id) : [...n, t.id]
				});
			}
			return !0;
		}
		if (e === vo) return this.planning && t?.kind === "node" && this.editTarget(t.id), !0;
		if (!n || !this.editable) return n;
		switch (e) {
			case po:
				this.editing.addResource();
				break;
			case mo:
				t?.kind === "edge" && this.editing.editAmount(t.id);
				break;
			case ho:
				t?.kind === "edge" && this.editing.editOutput(t.id);
				break;
			case go:
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
		O(this.services.root, "graph:take-server", r), O(this.services.root, "graph:keep-mine", r);
		let i = t?.kind === "node" && this.entryById.get(t.id)?.kind === "craft", a = t?.kind === "edge" && this.linkById.get(t.id)?.role === "recipe";
		for (let e of [
			po,
			mo,
			_o
		]) D(this.services.root, e, n);
		let o = this.planning && t?.kind === "node" && this.resource(t.id) !== void 0, s = o && this.isMade(t.id);
		O(this.services.root, vo, o), O(this.services.root, yo, s), D(this.services.root, vo, e && o), D(this.services.root, yo, e && s), at(this.services.root, yo, s && (this.document.plan.bought ?? []).includes(t.id)), D(this.services.root, ho, n && a), D(this.services.root, go, n && (i || a));
	}
}, Co = "graph.set-node-status", wo = "graph.set-node-display", To = "graph.set-node-value", Eo = "graph.add-node-log", Do = "graph.set-run-progress", Oo = "graph.set-running";
function ko(e, t) {
	e.registerEvent("node-click", { dynamicParameters: (e) => [e.domEvent.detail?.nodeId ?? ""] }), e.registerEvent(Li, { dynamicParameters: (e) => [...e.domEvent.detail?.keys ?? []] });
	let n = (e, n) => {
		let r = Pt(e, n);
		return r === null ? null : t()?.kindOf(r, Yi) ?? null;
	}, r = (e, t) => {
		let r = e.effect, i = n(e, r);
		i !== null && r.nodeId !== void 0 && t(i, r.nodeId, r);
	};
	e.registerEffect({
		kind: Co,
		handler: (e) => r(e, (e, t, n) => e.setStatus(t, n.state ?? "Idle", typeof n.progress == "number" ? n.progress : null, typeof n.message == "string" ? n.message : null))
	}), e.registerEffect({
		kind: wo,
		handler: (e) => r(e, (e, t, n) => e.setDisplay(t, n.pinName ?? "", n.value))
	}), e.registerEffect({
		kind: To,
		handler: (e) => r(e, (e, t, n) => e.setPinValue(t, n.pinName ?? "", n.value, n.committed === !0))
	}), e.registerEffect({
		kind: Eo,
		handler: (e) => r(e, (e, t, n) => e.addLog(t, String(n.level ?? "Info"), String(n.message ?? "")))
	}), e.registerEffect({
		kind: Do,
		handler: (e) => {
			let t = e.effect;
			n(e, t)?.setRunProgress(Number(t.completed) || 0, Number(t.total) || 0);
		}
	}), e.registerEffect({
		kind: Oo,
		handler: (e) => {
			let t = e.effect;
			n(e, t)?.setRunning(t.running === !0);
		}
	}), e.registerEvent(Pi, {});
}
//#endregion
//#region src/graph.ts
var Q = zt(), Ao = [
	Ji,
	Xn,
	xo
], $ = null;
Q.registerEngine((e) => {
	$ = new Nt(e, Ao);
}), Q.registerEvent("save", {
	settlesValue: !0,
	submitsForm: !0,
	dynamicParameters: (e) => [e.domEvent.detail?.reason ?? ""],
	completed: (e) => $?.saveCompleted(e.component, e.success, e.domEvent.detail?.id, e.domEvent.detail?.reason ?? "")
}), Q.registerEvent("menu-entry", { dynamicParameters: (e) => [...e.domEvent.detail?.keys ?? []] }), Q.registerValueReader({
	kind: jt,
	read: (e) => m(e.getAttribute(t))
}), Q.registerDomOperation({
	kind: jt,
	handler: (e) => e.target.setAttribute(t, JSON.stringify(e.value ?? null))
}), Q.registerConverter("graph-edge-shape", (e) => String(e ?? "Orthogonal").toLowerCase()), Q.registerConverter("graph-rem", (e) => typeof e == "number" && e > 0 ? `${e}rem` : ""), Q.registerConverter("graph-direction", (e) => {
	let t = String(e ?? "");
	return t === "TopToBottom" ? "down" : t === "RightToLeft" ? "left" : t === "BottomToTop" ? "up" : "right";
}), Q.registerConverter("graph-node-shape", (e) => String(e ?? "") === "Icon" ? "icon" : "card"), Q.registerConverter("graph-production-mode", (e) => String(e ?? "") === "Plan" ? "plan" : "constructor"), Q.registerEffect({
	kind: Mt,
	handler: (e) => {
		let t = e.effect, n = Pt(e, t);
		n !== null && $?.requestSave(n, typeof t.reason == "string" ? t.reason : "");
	}
}), ko(Q, () => $), Q.registerCollectionSink({
	kind: "layered",
	handler: (e) => $?.kindOf(e.component, Zn)?.applyChange(e)
}), Q.registerCollectionSink({
	kind: "production",
	handler: (e) => $?.kindOf(e.component, So)?.applyChange(e)
});
//#endregion
