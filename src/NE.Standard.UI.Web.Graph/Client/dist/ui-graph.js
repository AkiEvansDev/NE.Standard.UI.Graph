//#region src/canvas/canvas-dom.ts
var e = ".ui-graph", t = "data-ui-graph-document", n = "data-ui-graph-group", r = "data-ui-graph-selected", i = "data-ui-graph-edge", a = "data-ui-graph-reroute", o = "data-ui-graph-node", s = "data-ui-graph-pin-toggle", c = "data-ui-graph-fold", l = "data-ui-graph-collapsed", u = ".ui-graph__node-title", d = "ui-graph--connecting", f = "data-ui-graph-drop", p = "data-ui-graph-menu-panel", m = "data-ui-graph-side", h = {
	menuOpeningEvent: "ui-context-menu-opening",
	collapsed: "data-ui-collapsed",
	collapseToggle: "data-ui-collapse-toggle",
	menuClass: "ui-menu",
	menuItemValueClass: "ui-menu-item__value",
	pictureSelectionClass: "ui-image-input__selection",
	pictureTextClass: "ui-image-input__text",
	textInputActionClass: "ui-text-input__action",
	badgeClass: "ui-badge",
	badgeTextClass: "ui-badge__text",
	badgeText: "data-ui-badge-text",
	badgeDangerClass: "ui-badge-style--danger",
	badgeWarningClass: "ui-badge-style--warning",
	badgeSurfaceClass: "ui-badge-style--surface"
}, g = h.collapsed, _ = `[${p}], [${m}][${g}], [data-ui-graph-run], .ui-graph__run-panel`, v = `.ui-graph__bar-button, [${p}] > * > [${h.collapseToggle}], [${m}] > [${h.collapseToggle}], .ui-graph__log-head > button`, y = "ui-readonly";
function b(e, t) {
	let n = e.querySelector(`template[data-ui-graph-editor="${CSS.escape(t)}"]`)?.content.firstElementChild?.cloneNode(!0);
	return n instanceof HTMLElement ? n : null;
}
function x(e, t, n) {
	return e.strings.format("ui.graph.percent", { value: e.numbers.format(n, null, e.numbers.readCulture(t)) });
}
function S(e, t, n) {
	e.addEventListener("pointerenter", () => n.show(e, t, { delay: !0 })), e.addEventListener("pointerleave", () => n.hide());
}
//#endregion
//#region src/canvas/history.ts
var C = 100, ee = class {
	read;
	depth;
	past = [];
	future = [];
	present;
	saved;
	constructor(e, t, n = C) {
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
		for (let t = 0; t < this.past.length; t++) this.past[t] = w(this.past[t], e);
		for (let t = 0; t < this.future.length; t++) this.future[t] = w(this.future[t], e);
		this.saved = w(this.saved, e);
	}
	revert(e) {
		return JSON.stringify(e) === this.present ? null : this.read(JSON.parse(this.present));
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
function w(e, t) {
	let n = JSON.parse(e);
	return t(n), JSON.stringify(n);
}
//#endregion
//#region src/canvas/canvas-model.ts
function te(e) {
	return typeof e.key == "string" ? e.key : null;
}
function T(e) {
	if (e === null || e.length === 0) return null;
	try {
		return JSON.parse(e);
	} catch {
		return null;
	}
}
function ne(e) {
	let t = Number(e);
	return Number.isFinite(t) && t > 0 ? t : null;
}
function re(e) {
	return (e ?? []).map((e) => ({
		x: Number(e.x) || 0,
		y: Number(e.y) || 0
	}));
}
function ie(e) {
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
function E(e) {
	return `${e}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
//#endregion
//#region src/canvas/canvas-document.ts
var ae = "auto", oe = class {
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
		this.root = e, this.valueElement = n, this.settings = r, this.callbacks = a, this.values = o, this.documentValue = i(T(this.valueElement.getAttribute(t))), this.history = new ee(this.documentValue, i);
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
		if (this.settings.readOnly) {
			this.refuseEdit();
			return;
		}
		let t = this.history.record(this.documentValue);
		this.version++, this.showDirty(), e ? this.callbacks.redraw() : this.callbacks.redrawEdges(), this.settings.autoSave && t && queueMicrotask(() => this.save(ae));
	}
	refuseEdit() {
		let e = this.history.revert(this.documentValue);
		e !== null && (this.documentValue = e, this.version++, this.callbacks.redraw());
	}
	committed(e, t = !0) {
		let n = !this.history.dirty;
		e(this.documentValue), this.version++, this.history.commit(e), this.history.absorb(JSON.stringify(this.documentValue)), this.sent === null ? n && this.history.markSaved() : this.sent = w(this.sent, e), this.showDirty(), t && this.callbacks.redraw();
	}
	save(e = "") {
		if (this.settings.readOnly) return;
		if (this.sent !== null) {
			(this.queuedSave === null || !se(this.queuedSave) || se(e)) && (this.queuedSave = e);
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
		return this.settings.readOnly ? null : this.history.undo();
	}
	redo() {
		return this.settings.readOnly ? null : this.history.redo();
	}
	replay(e) {
		this.documentValue = e, this.version++, this.showDirty(), this.callbacks.redraw(), this.settings.autoSave && this.history.dirty && queueMicrotask(() => this.save(ae));
	}
};
function se(e) {
	return e !== "" && e !== ae;
}
var ce = 6;
function le(e, t = {}) {
	let n = t.spacing ?? 14, r = t.margin ?? 14, i = e.filter((e) => Math.abs(e.from.across - e.to.across) > .5 && e.to.along - e.from.along >= 48).sort((e, t) => e.from.along - t.from.along || e.from.across - t.from.across), a = /* @__PURE__ */ new Map();
	for (let e of ue(i, n, r)) {
		let t = xe(ge(e.legs)), { middle: i, step: o } = me(e, t.length, n, r);
		t.forEach((e, n) => {
			for (let r of e.legs) a.set(r.id, i + (n - (t.length - 1) / 2) * o);
		});
	}
	return a;
}
function ue(e, t, n) {
	let r = e.map((e) => pe({
		legs: [e],
		low: e.from.along,
		high: e.to.along,
		top: Math.min(e.from.across, e.to.across),
		bottom: Math.max(e.from.across, e.to.across),
		turns: (e.from.along + e.to.along) / 2,
		from: 0,
		to: 0
	}, t, n));
	for (let e = 0; e < r.length; e++) for (let i = 0; i < r.length; i++) i !== e && de(r[e], r[i], t) && (fe(r[e], r[i], t, n), r.splice(i, 1), i < e && e--, i = -1);
	return r;
}
function de(e, t, n) {
	return e.top <= t.bottom + n && t.top <= e.bottom + n && Math.max(e.low, t.low) < Math.min(e.high, t.high) && e.from < t.to + n && t.from < e.to + n;
}
function fe(e, t, n, r) {
	e.legs.push(...t.legs), e.low = Math.max(e.low, t.low), e.high = Math.min(e.high, t.high), e.top = Math.min(e.top, t.top), e.bottom = Math.max(e.bottom, t.bottom), e.turns += t.turns, pe(e, n, r);
}
function pe(e, t, n) {
	let r = he(e.legs), { middle: i, step: a } = me(e, r, t, n), o = (r - 1) / 2 * a;
	return e.from = i - o, e.to = i + o, e;
}
function me(e, t, n, r) {
	let i = Math.max(0, e.high - e.low - r * 2), a = t > 1 ? Math.min(n, i / (t - 1)) : 0, o = (t - 1) / 2 * a, s = e.low + r + o, c = e.high - r - o, l = e.turns / e.legs.length;
	return {
		middle: s <= c ? Math.min(Math.max(l, s), c) : (e.low + e.high) / 2,
		step: a
	};
}
function he(e) {
	let t = _e(e), n = /* @__PURE__ */ new Set();
	for (let r of e) n.add(ve(r, t));
	return n.size;
}
function ge(e) {
	let t = _e(e), n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = ve(r, t), i = n.get(e);
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
function _e(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		let e = be(n).from;
		t.set(e, (t.get(e) ?? 0) + 1);
	}
	return t;
}
function ve(e, t) {
	let n = be(e);
	return (t.get(n.from) ?? 0) > 1 ? n.fromLane : n.toLane;
}
var ye = /* @__PURE__ */ new WeakMap();
function be(e) {
	let t = ye.get(e);
	if (t === void 0) {
		let n = `${e.source}@${Math.round(e.from.across)}`, r = `${e.target}@${Math.round(e.to.across)}`;
		t = {
			from: n,
			to: r,
			fromLane: `from:${n}`,
			toLane: `to:${r}`
		}, ye.set(e, t);
	}
	return t;
}
function xe(e) {
	let t = [...e].sort((e, t) => e.mean - t.mean || e.min - t.min);
	if (t.length < 2 || t.length > ce) return t;
	let n = t.map((e) => t.map((t) => e === t ? 0 : Se(e, t))), r = (e) => {
		let t = 0;
		for (let r = 0; r < e.length; r++) for (let i = r + 1; i < e.length; i++) t += n[e[r]][e[i]];
		return t;
	}, i = t.map((e, t) => t), a = r(i);
	for (let e of we(i)) {
		let t = r(e);
		t < a && (i = e, a = t);
	}
	return i.map((e) => t[e]);
}
function Se(e, t) {
	let n = 0;
	for (let r of e.legs) n += +!!Ce(r.to.across, t);
	for (let r of t.legs) n += +!!Ce(r.from.across, e);
	return n;
}
function Ce(e, t) {
	return e > t.min + .5 && e < t.max - .5;
}
function* we(e) {
	if (e.length <= 1) {
		yield [...e];
		return;
	}
	for (let t = 0; t < e.length; t++) for (let n of we([...e.slice(0, t), ...e.slice(t + 1)])) yield [e[t], ...n];
}
//#endregion
//#region src/canvas/geometry.ts
var Te = 4, Ee = 12, De = 64, Oe = 56, ke = 16, Ae = 9, je = 7;
function Me(e, t, n, r = [], i = {}) {
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
	].map(s), u = (i.back === !0 && r.length === 0 ? i.loop === !0 ? Ue(l[0], l[1]) : He(l[0], l[1]) : e === "straight" ? Re(l) : e === "orthogonal" ? Ve(l, (i.turns ?? []).map((e) => e === void 0 ? void 0 : e * o)) : ze(l)).map((e) => ({
		op: e.op,
		points: e.points.map(c)
	}));
	return {
		path: Pe(u),
		pieces: Ne(u) ? null : Fe(u),
		arrow: i.arrow === !0 ? We(u) : null
	};
}
function Ne(e) {
	let t = null;
	for (let n of e) {
		let e = n.points[n.points.length - 1];
		if (n.op === "C" || n.op === "L" && t !== null && t.x !== e.x && t.y !== e.y) return !1;
		t = e;
	}
	return !0;
}
function Pe(e) {
	return e.map((e) => `${e.op}${e.points.map((e) => `${D(e.x)},${D(e.y)}`).join(" ")}`).join(" ");
}
function Fe(e) {
	let t = [], n = null;
	for (let r of e) {
		if (r.op === "M") {
			n = r.points[0];
			continue;
		}
		let e = r.op === "C" && n !== null ? Ie(n, r.points) : [r.points[r.points.length - 1]];
		for (let r of e) n !== null && Le(t, n, r), n = r;
	}
	return t;
}
function Ie(e, [t, n, r]) {
	let i = Math.hypot(t.x - e.x, t.y - e.y) + Math.hypot(n.x - t.x, n.y - t.y) + Math.hypot(r.x - n.x, r.y - n.y), a = Math.max(1, Math.ceil(i / Te)), o = [];
	for (let i = 1; i <= a; i++) {
		let s = i / a, c = 1 - s, l = c * c * c, u = 3 * c * c * s, d = 3 * c * s * s, f = s * s * s;
		o.push({
			x: l * e.x + u * t.x + d * n.x + f * r.x,
			y: l * e.y + u * t.y + d * n.y + f * r.y
		});
	}
	return o;
}
function Le(e, t, n) {
	if (t.x === n.x && t.y === n.y) return;
	let r = e.length === 0 ? null : e[e.length - 1], i = r === null ? 0 : r.along + Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
	e.push({
		x1: t.x,
		y1: t.y,
		x2: n.x,
		y2: n.y,
		along: i
	});
}
function Re(e) {
	return e.map((e, t) => ({
		op: t === 0 ? "M" : "L",
		points: [e]
	}));
}
function ze(e) {
	let t = [{
		op: "M",
		points: [e[0]]
	}];
	for (let n = 1; n < e.length; n++) {
		let r = e[n - 1], i = e[n], a = Be(r, i);
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
function Be(e, t) {
	let n = t.x - e.x;
	return n >= 0 ? Math.min(Math.max(n * .5, 24), 160) : Math.min(Math.max(-n * .6 + 40, 60), 220);
}
function Ve(e, t) {
	let n = [{
		op: "M",
		points: [e[0]]
	}], r = (e, t) => {
		n.push({
			op: "L",
			points: [{
				x: D(e),
				y: D(t)
			}]
		});
	};
	for (let n = 1; n < e.length; n++) {
		let i = e[n - 1], a = e[n];
		if (a.x - i.x >= 48) {
			let e = Math.min(a.x - Ee, Math.max(i.x + Ee, t[n - 1] ?? (i.x + a.x) / 2));
			r(e, i.y), r(e, a.y), r(a.x, a.y);
		} else {
			let e = i.x + 24, t = a.x - 24, n = (i.y + a.y) / 2;
			r(e, i.y), r(e, n), r(t, n), r(t, a.y), r(a.x, a.y);
		}
	}
	return n;
}
function He(e, t) {
	let n = t.x - e.x, r = Math.min(96, 20 + Math.abs(n) * .1), i = Math.min(e.y, t.y) - r, a = Math.sign(n) * Math.min(Math.abs(n) * .45, De);
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
function Ue(e, t) {
	let n = Math.min(e.y, t.y) - Oe, r = Math.sign(e.x - t.x) * ke;
	return [{
		op: "M",
		points: [e]
	}, {
		op: "C",
		points: [
			{
				x: e.x + r,
				y: n
			},
			{
				x: t.x - r,
				y: n
			},
			t
		]
	}];
}
function We(e) {
	let t = e[e.length - 1], n = t.points[t.points.length - 1], r = t.points.length > 1 ? t.points[t.points.length - 2] : e.length > 1 ? e[e.length - 2].points[e[e.length - 2].points.length - 1] : null;
	if (r === null) return null;
	let i = n.x - r.x, a = n.y - r.y, o = Math.hypot(i, a);
	if (o === 0) return null;
	let s = i / o, c = a / o, l = n.x - s * Ae, u = n.y - c * Ae, d = je / 2;
	return `M${D(n.x)},${D(n.y)} L${D(l - c * d)},${D(u + s * d)} L${D(l + c * d)},${D(u - s * d)} Z`;
}
function D(e) {
	return Math.round(e * 100) / 100;
}
function Ge(e) {
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
function Ke(e, t) {
	return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function qe(e, t) {
	return t.x >= e.x && t.y >= e.y && t.x + t.width <= e.x + e.width && t.y + t.height <= e.y + e.height;
}
var Je = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0
}, Ye = 48;
function Xe(e, t, n, r, i, a = Ye, o = Je) {
	if (e.width <= 0 || e.height <= 0 || t <= 0 || n <= 0) return {
		zoom: 1,
		panX: 0,
		panY: 0
	};
	let s = Math.max(a, o.top), c = Math.max(a, o.left), l = t - c - Math.max(a, o.right), u = n - s - Math.max(a, o.bottom), d = Math.min(i, Math.max(r, Math.min(l / e.width, u / e.height)));
	return {
		zoom: d,
		panX: c + l / 2 - (e.x + e.width / 2) * d,
		panY: s + u / 2 - (e.y + e.height / 2) * d
	};
}
function Ze(e, t, n, r, i, a, o = 8) {
	let s = 0, c = 0, l = 0, u = 0;
	for (let e of a) {
		if (e.width <= 0 || e.height <= 0 || e.x >= t) continue;
		let n = e.y + e.height + o;
		c = Math.max(c, n), e.width >= t / 2 ? s = Math.max(s, n) : e.x + e.width / 2 < t / 2 ? l = Math.max(l, e.x + e.width + o) : u = Math.max(u, t - e.x + o);
	}
	let d = Xe(e, t, n, r, i, Ye, {
		top: s,
		right: u,
		bottom: 0,
		left: l
	}), f = Xe(e, t, n, r, i, Ye, {
		top: c,
		right: 0,
		bottom: 0,
		left: 0
	});
	return f.zoom > d.zoom ? f : d;
}
function Qe(e, t, n, r) {
	let i = {
		x: -t.panX / t.zoom,
		y: -t.panY / t.zoom,
		width: n / t.zoom,
		height: r / t.zoom
	};
	return e.some((e) => Ke(e, i));
}
var $e = 3;
function et(e, t) {
	let n = t * $e;
	return !Number.isFinite(e.y) || Math.abs(e.y) < .5 || Math.abs(e.x) > Math.abs(e.y) ? 1 : Math.exp(-Math.max(-n, Math.min(n, e.y)) * Math.log(1.1) / t);
}
function O(e, t, n) {
	return n && t > 0 ? Math.round(e / t) * t : e;
}
function tt(e, t, n) {
	let r = n.x - t.x, i = n.y - t.y, a = r * r + i * i;
	if (a === 0) return Math.hypot(e.x - t.x, e.y - t.y);
	let o = Math.min(1, Math.max(0, ((e.x - t.x) * r + (e.y - t.y) * i) / a));
	return Math.hypot(e.x - (t.x + o * r), e.y - (t.y + o * i));
}
function nt(e) {
	let t = e.getPointAtLength(e.getTotalLength() / 2);
	return {
		x: t.x,
		y: t.y
	};
}
//#endregion
//#region src/canvas/canvas-selection.ts
var rt = class {
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
			t !== null && (Ke(i, t) || this.beforeMarquee.has(e.id) ? this.selection.add(e.id) : this.selection.delete(e.id));
		}
		this.markSelection();
	}
};
function it(e) {
	return e.ctrlKey || e.metaKey;
}
//#endregion
//#region src/canvas/canvas-drag.ts
var at = class {
	selection;
	host;
	settings;
	constructor(e, t, n) {
		this.selection = e, this.host = t, this.settings = n;
	}
	beginNodeDrag(e, t, n) {
		if (this.selection.has(t) ? it(e) && this.selection.select(t, !0) : this.selection.select(t, it(e)), this.settings.readOnly) return null;
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
		if (r === void 0 || (this.selection.select(t, it(e)), this.settings.readOnly || r.pinned === !0)) return null;
		let i = {
			x: r.x,
			y: r.y,
			width: r.width,
			height: r.height
		}, a = /* @__PURE__ */ new Map();
		for (let e of this.host.items()) {
			let t = this.host.nodeRect(e.id);
			e.pinned !== !0 && t !== null && qe(i, t) && a.set(e.id, {
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
			x: O(t.x + i, n, !0) - i,
			y: O(t.y + a, n, !0) - a
		};
	}
	snapSize(e) {
		let t = this.host.items().find((t) => t.id === e), n = this.host.nodeElements.get(e);
		if (t === void 0 || n === void 0) return;
		let r = this.settings.gridSize;
		this.resizeNode(e, O(n.offsetWidth, r, !0), O(n.offsetHeight, r, !0)), ot(n, r), t.width = n.offsetWidth, t.height = n.offsetHeight;
	}
	settleGroup(e) {
		let t = this.findGroup(e.groupId);
		t !== void 0 && (t.x = O(t.x, this.settings.gridSize, !0), t.y = O(t.y, this.settings.gridSize, !0)), this.snapNodes(e.moving.keys()), this.host.drawGroups();
	}
	placeNode(e, t) {
		let n = this.host.nodeElements.get(e);
		n?.style.setProperty("--ui-graph-node-x", String(t.x)), n?.style.setProperty("--ui-graph-node-y", String(t.y));
	}
};
function ot(e, t) {
	st([e], t);
}
function st(e, t) {
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
var ct = "data-ui-graph-colors", lt = "graph-node-menu", ut = "graph-group-menu", dt = "graph-edge-menu", ft = "data-ui-graph-swatch", pt = "graph:color:", mt = "graph:color:default", ht = class {
	root;
	context;
	documentState;
	selection;
	view;
	settings;
	host;
	groupLayer;
	colors;
	scope;
	menuTarget = null;
	constructor(e, t, n, r, i, a, o, s) {
		this.root = e, this.context = t, this.documentState = n, this.selection = r, this.view = i, this.settings = a, this.host = o, this.groupLayer = s, this.colors = gt(e.getAttribute(ct)), this.scope = {
			root: e,
			context: t
		};
	}
	panelToggleOf(e) {
		return e.closest("[data-ui-graph-menu-panel]") === null ? null : e.closest(`[${h.collapseToggle}]`);
	}
	foldPanel() {
		let e = this.root.querySelector(`[${p}] > .${h.menuClass}`), t = e?.querySelector(`:scope > [${h.collapseToggle}]`) ?? null;
		e === null || t === null || e.hasAttribute(g) || (t.click(), t.focus({ preventScroll: !0 }));
	}
	prepareMenus(e) {
		if (!(e instanceof Element) || e.closest(yt(this.scope)) !== null) return;
		this.menuTarget = this.targetOf(e);
		let t = this.menuTarget?.kind === "node" ? this.menuTarget.id : null, n = this.menuTarget?.kind === "group" ? this.menuTarget.id : null, r = this.menuTarget?.kind === "edge" ? this.menuTarget.id : null;
		if (r !== null) {
			this.selection.hasEdge(r) || (this.selection.clearSets(), this.selection.markSelection(), this.selection.toggleEdge(r, !1), this.host.drawEdges()), this.syncMenus();
			return;
		}
		let i = t ?? n;
		i !== null && !this.selection.has(i) && (this.selection.chooseForMenu(i), this.host.drawEdges()), this.syncMenus();
	}
	prepareBar(e) {
		this.menuTarget = this.targetOf(e), this.syncMenus();
	}
	targetOf(e) {
		let t = e.closest("[data-ui-graph-node]")?.getAttribute("data-ui-graph-node") ?? null, n = t === null && e.closest(".ui-graph__group-band") !== null ? e.closest("[data-ui-graph-group]")?.getAttribute("data-ui-graph-group") ?? null : null, r = t === null && n === null && this.host.kind().hasEdgeMenu() ? e.closest("[data-ui-graph-edge]")?.getAttribute("data-ui-graph-edge") ?? null : null;
		return t === null ? n === null ? r === null ? null : {
			kind: "edge",
			id: r
		} : {
			kind: "group",
			id: n
		} : {
			kind: "node",
			id: t
		};
	}
	syncMenus() {
		let e = !this.settings.readOnly, t = this.host.kind().items().some((e) => this.selection.has(e.id));
		this.host.kind().syncMenus(e, this.menuTarget), this.enableEntries("graph:arrange", e), this.enableEntries("graph:save", e), this.enableEntries("graph:group-selection", e && t), this.enableEntries("graph:delete-selection", e && (this.selection.size > 0 || this.selection.edgeSize > 0)), this.enableEntries("graph:delete", e);
		for (let t of [lt, ut]) {
			let n = this.root.querySelector(`[${this.context.names.contextMenu}="${t}"]`), r = this.menuItem(t);
			if (n === null) continue;
			for (let t of j({
				root: n,
				context: this.context
			}, "graph:pin")) xt(t, r?.pinned === !0, this.context.names), this.context.states.setDisabled(t, !e);
			let i = e && (t === "graph-group-menu" || this.host.kind().canEditItems());
			for (let e of j({
				root: n,
				context: this.context
			}, "graph:rename")) this.context.states.setDisabled(e, !i);
			this.syncColors(n, r?.color ?? null, i);
		}
	}
	enableEntries(e, t) {
		k(this.scope, e, t);
	}
	syncColors(e, t, n) {
		let r = this.context.names.key, i = "";
		for (let n of e.querySelectorAll(`[${r}^="${pt}"]`)) {
			let e = bt(n, this.context.names), a = n.getAttribute(r) ?? "", o = a === mt ? null : this.colors[Number(a.slice(12))] ?? null, s = o === null ? t === null || t.length === 0 : o === t;
			e !== null && (e.setAttribute(ft, ""), e.style.setProperty("--ui-graph-swatch", o ?? "transparent"), xt(e, s, this.context.names), s && (i = e.textContent?.trim() ?? ""));
		}
		for (let t of j({
			root: e,
			context: this.context
		}, "graph:color")) {
			this.context.states.setDisabled(t, !n);
			let e = t.querySelector(`.${h.menuItemValueClass}`);
			e !== null && (e.textContent = i);
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
		if (e.startsWith(pt)) {
			this.paintItems(t, e);
			return;
		}
		switch (e) {
			case "graph:delete-selection":
			case "graph:delete":
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
		let n = this.menuItems(e), r = t === mt ? null : this.colors[Number(t.slice(12))];
		if (!(n.length === 0 || this.settings.readOnly || r === void 0)) {
			for (let t of n) (e !== "graph-node-menu" || !this.host.kind().paintItem(t.id, r)) && (t.color = r);
			this.documentState.edited(), this.syncMenus();
		}
	}
	renameItem(e) {
		let t = this.menuItem(e);
		t !== void 0 && this.openRename(t, e === lt);
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
			refocus: () => this.view.viewportElement.focus({ preventScroll: !0 })
		});
	}
	groupSelection() {
		if (this.settings.readOnly || this.selection.size === 0) return;
		let e = [];
		for (let t of this.selection.nodeIds) {
			let n = this.host.nodeRect(t);
			n !== null && e.push(n);
		}
		let t = Ge(e);
		t !== null && (this.documentState.document.groups.push({
			id: E("g"),
			x: t.x - 24,
			y: t.y - 24 - 24,
			width: t.width + 48,
			height: t.height + 48 + 24,
			title: null,
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
function gt(e) {
	let t = T(e);
	return Array.isArray(t) ? t.map((e) => String(e)) : [];
}
function _t(e, t, n, r) {
	let i = document.createElement("span");
	i.setAttribute(e.context.names.contextMenuUse, t), i.hidden = !0, (e.root.querySelector(".ui-graph__viewport") ?? e.root).append(i), i.dispatchEvent(new MouseEvent("contextmenu", {
		bubbles: !0,
		cancelable: !0,
		button: 2,
		clientX: n,
		clientY: r
	})), i.remove();
}
function k(e, t, n) {
	for (let r of j(e, t)) e.context.states.setDisabled(r, !n);
}
function vt(e, t, n) {
	for (let r of j(e, t)) xt(r, n, e.context.names);
}
function A(e, t, n) {
	for (let r of j(e, t)) {
		let t = r.closest(`[${e.context.names.key}]`) ?? r;
		t.style.display = n ? "" : "none";
	}
}
function yt(e) {
	return `[${e.context.names.contextMenu}], [${p}]`;
}
function j(e, t) {
	let n = [];
	for (let r of e.root.querySelectorAll(`:is(${yt(e)}) [${e.context.names.key}="${CSS.escape(t)}"]`)) {
		let t = bt(r, e.context.names);
		t !== null && n.push(t);
	}
	return n;
}
function bt(e, t) {
	return e.classList.contains(t.menuItemClass) ? e : e.querySelector(`:scope > .${t.menuItemClass}`);
}
function xt(e, t, n) {
	e.classList.toggle(n.menuItemCheckedClass, t), e.setAttribute("aria-checked", String(t));
}
//#endregion
//#region src/canvas/canvas-render.ts
var St = "center", M = "http://www.w3.org/2000/svg", Ct = "ui-graph--edge-focus", N = "data-ui-graph-related", wt = [
	.5,
	.38,
	.62,
	.26,
	.74
], Tt = class {
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
	paintedEdges = /* @__PURE__ */ new Map();
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
			this.drawnItems.set(n.id, n), this.selection.has(n.id) && i.setAttribute(r, ""), i.setAttribute(this.context.names.contextMenuUse, lt), this.settings.nodeActionBar && (i.setAttribute(this.context.names.actionBar, St), i.setAttribute(this.context.names.actionBarKey, n.id), this.settings.nodeActionBarRepeats || i.setAttribute(this.context.names.actionBarRest, "")), this.nodeLayer.append(i), this.nodeElements.set(n.id, i), t.add(n.id);
		}
		let n = new Set(t);
		for (let e of this.documentState.document.groups) n.add(e.id);
		this.selection.pruneNodes(n), e.itemsDrawn(t), this.watchSizes(), this.markFocus();
	}
	watchSizes() {
		for (let [e, t] of this.nodeElements) this.nodeBoxes.set(e, Dt(t));
		for (let [e, t] of this.nodeElements) this.nodeWatchers.push(this.context.observeSize(t, () => this.nodeResized(e, t)));
	}
	nodeResized(e, t) {
		let n = Dt(t);
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
			if (i.className = "ui-graph__group-band", i.setAttribute(this.context.names.contextMenuUse, ut), a.className = "ui-graph__group-title", a.textContent = e.title ?? this.context.strings.text("ui.graph.group"), i.append(a), e.pinned === !0) {
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
		this.root.classList.toggle(Ct, t !== null && t.size > 0);
		for (let [e, n] of this.edgeParts) for (let r of n) r.toggleAttribute(N, t !== null && t.has(e));
		for (let [e, t] of this.nodeElements) t.toggleAttribute(N, n !== null && n.has(e));
	}
	drawEdges() {
		let e = this.kind(), t = e.hasEdgeMenu();
		this.edgeLayer.replaceChildren(), this.labelLayer.replaceChildren(), this.edgeParts.clear(), this.labelObstacles = null;
		let n = this.focusItem === null ? null : new Set(e.related(this.focusItem).edges), o = [], s = /* @__PURE__ */ new Map();
		for (let c of e.edges()) {
			let l = e.edgeEnds(c);
			if (l === null) continue;
			let u = [], d = n !== null && n.has(c.id);
			this.edgeParts.set(c.id, u);
			let f = e.edgeColor(c), p = c.points.length === 0 && l.via !== void 0 ? l.via : c.points, m = Me(this.settings.edgeShape, l.from, l.to, p, {
				axis: l.axis,
				back: l.back,
				loop: l.loop,
				arrow: l.arrow,
				reversed: l.reversed,
				turns: c.points.length === 0 ? l.turns : void 0
			}), h = document.createElementNS(M, "path");
			h.setAttribute("d", m.path), h.setAttribute("class", l.back === !0 ? "ui-graph__edge ui-graph__edge--back" : "ui-graph__edge"), h.setAttribute(i, c.id), h.style.setProperty("--ui-graph-pin-color", f), this.selection.hasEdge(c.id) && h.setAttribute(r, ""), l.conflict === !0 && h.setAttribute("data-ui-graph-conflict", "changed"), t && h.setAttribute(this.context.names.contextMenuUse, dt), h.toggleAttribute(N, d), this.edgeLayer.append(h), u.push(h);
			let g = l.back === !0 ? "ui-graph__edge-line ui-graph__edge-line--back" : "ui-graph__edge-line", _ = `${m.path}|${f}|${g}`, v = this.paintedEdges.get(c.id), y = v !== void 0 && v.from === _ ? v.group : Et(m, f, g);
			if (s.set(c.id, {
				from: _,
				group: y
			}), y.toggleAttribute(r, this.selection.hasEdge(c.id)), y.toggleAttribute(N, d), this.edgeLayer.append(y), u.push(y), m.arrow !== null) {
				let e = document.createElementNS(M, "path");
				e.setAttribute("d", m.arrow), e.setAttribute("class", "ui-graph__edge-arrow"), e.style.setProperty("--ui-graph-pin-color", f), e.toggleAttribute(N, d), this.edgeLayer.append(e), u.push(e);
			}
			l.label !== null && l.label !== void 0 && l.label.length > 0 && u.push(this.drawLabel(h, l.label, c.id, t, d, o)), c.points.forEach((e, t) => {
				let n = document.createElementNS(M, "circle");
				n.setAttribute("class", "ui-graph__reroute"), n.setAttribute(a, c.id), n.setAttribute("data-ui-graph-reroute-index", String(t)), n.setAttribute("cx", String(e.x)), n.setAttribute("cy", String(e.y)), n.setAttribute("r", "4"), n.style.setProperty("--ui-graph-pin-color", f), n.toggleAttribute(N, d), this.edgeLayer.append(n), u.push(n);
			});
		}
		this.paintedEdges = s, this.placeLabels(o), this.markFocus();
	}
	drawLabel(e, t, n, r, a, o) {
		let s = document.createElement("span");
		return s.className = "ui-graph__edge-label", s.setAttribute(i, n), r && s.setAttribute(this.context.names.contextMenuUse, dt), s.textContent = t, s.toggleAttribute(N, a), this.labelLayer.append(s), o.push({
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
		for (let i of wt) {
			let a = i === .5 ? nt(e) : e.getPointAtLength(r * i), o = {
				x: a.x - t / 2,
				y: a.y - n / 2
			};
			if (t === 0 || !this.coversNode({
				...o,
				width: t,
				height: n
			})) return o;
		}
		let i = nt(e);
		return {
			x: i.x - t / 2,
			y: i.y - n / 2
		};
	}
	coversNode(e) {
		return this.labelObstacles ??= [...this.nodeElements.keys()].map((e) => this.nodeRect(e)).filter((e) => e !== null), this.labelObstacles.some((t) => Ke(e, t));
	}
	drawPending(e, t, n) {
		this.clearPending(), this.edgeLayer.append(Et(Me(this.settings.edgeShape, e, t), n, "ui-graph__edge-line ui-graph__edge-line--pending"));
	}
	clearPending() {
		this.edgeLayer.querySelector(".ui-graph__edge-line--pending")?.remove();
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
function Et(e, t, n) {
	let r = document.createElementNS(M, "g");
	if (r.setAttribute("class", n), r.style.setProperty("--ui-graph-pin-color", t), e.pieces === null) {
		let t = document.createElementNS(M, "path");
		return t.setAttribute("d", e.path), r.append(t), r;
	}
	for (let t of e.pieces) {
		let e = document.createElementNS(M, "line");
		e.setAttribute("x1", P(t.x1)), e.setAttribute("y1", P(t.y1)), e.setAttribute("x2", P(t.x2)), e.setAttribute("y2", P(t.y2)), t.along > 0 && e.setAttribute("stroke-dashoffset", P(t.along)), r.append(e);
	}
	return r;
}
function P(e) {
	return String(Math.round(e * 100) / 100);
}
function Dt(e) {
	return `${e.offsetWidth}x${e.offsetHeight}`;
}
//#endregion
//#region src/canvas/canvas-settings.ts
var Ot = "data-ui-graph-edge-shape", kt = "data-ui-graph-snap", At = "data-ui-graph-highlight", jt = "data-ui-graph-auto-save", Mt = "data-ui-graph-direction", Nt = "data-ui-graph-node-shape", Pt = "data-ui-graph-edit-structure", Ft = "data-ui-graph-mode", It = "data-ui-graph-node-action-bar", Lt = "data-ui-graph-node-action-bar-repeat", Rt = "data-ui-graph-min-zoom", zt = "data-ui-graph-max-zoom", Bt = class {
	root;
	constructor(e) {
		this.root = e;
	}
	get readOnly() {
		return this.root.classList.contains(y);
	}
	get edgeShape() {
		let e = this.root.getAttribute(Ot);
		return e === "straight" || e === "bezier" ? e : "orthogonal";
	}
	get snapping() {
		return this.root.hasAttribute(kt);
	}
	get highlightOnHover() {
		return this.root.hasAttribute(At);
	}
	get autoSave() {
		return this.root.hasAttribute(jt);
	}
	get gridSize() {
		return Number(getComputedStyle(this.root).getPropertyValue("--ui-graph-grid-size")) || 20;
	}
	get nodeActionBar() {
		return this.root.hasAttribute(It);
	}
	get nodeActionBarRepeats() {
		return this.root.hasAttribute(Lt);
	}
	get minZoom() {
		return Number(this.root.getAttribute(Rt)) || .25;
	}
	get maxZoom() {
		return Number(this.root.getAttribute(zt)) || 2.5;
	}
}, Vt = ".ui-graph__grid", Ht = 250, Ut = class {
	root;
	settings;
	context;
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
	zoomShare = NaN;
	panXValue = 0;
	panYValue = 0;
	keepTimer;
	fitted = !1;
	fittedWidth = 0;
	fittedHeight = 0;
	stopSizeWatch;
	constructor(e, t, n, r) {
		this.root = e, this.settings = t, this.context = n, this.store = n.store, this.host = r, this.viewport = e.querySelector(".ui-graph__viewport"), this.scene = e.querySelector(".ui-graph__scene"), this.grid = e.querySelector(Vt), this.zoomLabel = e.querySelector("[data-ui-graph-zoom]"), this.minimap = e.querySelector("[data-ui-graph-map]"), this.minimapNodes = e.querySelector("[data-ui-graph-map-nodes]"), this.minimapView = e.querySelector("[data-ui-graph-map-view]"), this.stopSizeWatch = n.observeSize(this.viewport, () => this.viewportResized());
	}
	viewportResized() {
		let e = this.viewport.clientWidth, t = this.viewport.clientHeight;
		if (!(!this.fitted || e === 0 || t === 0 || e === this.fittedWidth && t === this.fittedHeight)) {
			if (this.fittedWidth === 0) {
				this.fittedWidth = e, this.fittedHeight = t;
				return;
			}
			this.fit();
		}
	}
	dispose() {
		this.stopSizeWatch();
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
		e !== null && (this.zoomValue = Math.min(this.settings.maxZoom, Math.max(this.settings.minZoom, Number(e.zoom) || 1)), this.panXValue = Number(e.panX) || 0, this.panYValue = Number(e.panY) || 0, this.fitted = e.fitted === !0, this.fittedWidth = this.fitted ? this.viewport.clientWidth : 0, this.fittedHeight = this.fitted ? this.viewport.clientHeight : 0);
	}
	applyView() {
		this.scene.style.transform = `translate(${this.panXValue}px, ${this.panYValue}px) scale(${this.zoomValue})`, this.grid?.style.setProperty("--ui-graph-zoom", String(this.zoomValue)), this.grid?.style.setProperty("--ui-graph-pan-x", `${this.panXValue}px`), this.grid?.style.setProperty("--ui-graph-pan-y", `${this.panYValue}px`), this.drawZoom(), this.placeMinimapView(), this.viewport.dispatchEvent(new Event("scroll")), clearTimeout(this.keepTimer), this.keepTimer = setTimeout(() => this.keepView(), Ht);
	}
	drawZoom() {
		let e = Math.round(this.zoomValue * 100);
		this.zoomLabel !== null && e !== this.zoomShare && (this.zoomShare = e, this.zoomLabel.textContent = x(this.context, this.zoomLabel, e));
	}
	wordsChanged() {
		this.zoomShare = NaN, this.drawZoom();
	}
	keepView() {
		this.keepTimer = void 0, this.store.write(this.root, "view", JSON.stringify({
			zoom: this.zoomValue,
			panX: this.panXValue,
			panY: this.panYValue,
			fitted: this.fitted
		}), {
			selector: Vt,
			styles: {
				"--ui-graph-zoom": String(this.zoomValue),
				"--ui-graph-pan-x": `${this.panXValue}px`,
				"--ui-graph-pan-y": `${this.panYValue}px`
			}
		});
	}
	showsAnyItem() {
		return Qe(this.host.items().flatMap((e) => this.host.nodeRect(e.id) ?? []), {
			zoom: this.zoomValue,
			panX: this.panXValue,
			panY: this.panYValue
		}, this.viewport.clientWidth - this.sideWidth(), this.viewport.clientHeight);
	}
	fit() {
		let e = this.contentBounds(!0);
		if (e === null) return;
		let t = Ze(e, this.viewport.clientWidth - this.sideWidth(), this.viewport.clientHeight, this.settings.minZoom, Math.min(1, this.settings.maxZoom), this.topChrome());
		this.zoomValue = t.zoom, this.panXValue = t.panX, this.panYValue = t.panY, this.fitted = !0, this.fittedWidth = this.viewport.clientWidth, this.fittedHeight = this.viewport.clientHeight, this.applyView();
	}
	topChrome() {
		let e = this.viewport.getBoundingClientRect(), t = e.left + this.viewport.clientLeft, n = e.top + this.viewport.clientTop;
		return Array.from(this.viewport.querySelectorAll(_), (e) => {
			let r = e.getBoundingClientRect();
			return {
				x: r.left - t,
				y: r.top - n,
				width: r.width,
				height: r.height
			};
		});
	}
	sideWidth() {
		let e = this.viewport.querySelector(`[${m}]:not([${g}])`);
		return e === null || e.offsetWidth === 0 ? 0 : this.viewport.clientWidth - e.offsetLeft;
	}
	zoomBy(e, t, n) {
		let r = Math.min(this.settings.maxZoom, Math.max(this.settings.minZoom, this.zoomValue * e));
		if (r === this.zoomValue) return;
		let i = this.toScene(t, n);
		this.zoomValue = r, this.panXValue = t - i.x * r, this.panYValue = n - i.y * r, this.fitted = !1, this.applyView();
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
		(e.x + t !== this.panXValue || e.y + n !== this.panYValue) && (this.panXValue = e.x + t, this.panYValue = e.y + n, this.fitted = !1, this.applyView());
	}
	centerOnRect(e, t, n) {
		this.panXValue = (this.viewport.clientWidth - this.sideWidth()) / 2 - (e.x + e.width / 2) * this.zoomValue, this.panYValue = t + (this.viewport.clientHeight - t - n) / 2 - (e.y + e.height / 2) * this.zoomValue, this.fitted = !1, this.applyView();
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
		return Ge(t);
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
		this.panXValue = (this.viewport.clientWidth - this.sideWidth()) / 2 - r * this.zoomValue, this.panYValue = this.viewport.clientHeight / 2 - i * this.zoomValue, this.fitted = !1, this.applyView();
	}
}, Wt = "ui-graph--panning", Gt = `[${s}], [${c}]`, Kt = "graph-document", qt = "graph.save-document", Jt = class {
	context;
	kinds = /* @__PURE__ */ new Map();
	canvases = /* @__PURE__ */ new WeakMap();
	live = /* @__PURE__ */ new Set();
	constructor(t, n) {
		this.context = t;
		for (let e of n) this.kinds.set(e.name, e);
		this.attach(t.root.querySelectorAll(e)), t.observeComponents(t.root, e, { childList: !0 }, (e) => this.attach(e)), t.observeComponents(t.root, "*", { childList: !0 }, () => this.prune()), t.observeComponents(t.root, e, { attributeFilter: [
			Ot,
			kt,
			"data-ui-graph-minimap",
			Mt,
			Nt,
			Pt,
			Ft
		] }, (e) => {
			for (let t of e) this.canvases.get(t)?.draw();
		}), t.observeComponents(t.root, e, {
			attributeFilter: ["class"],
			relevant: (e) => e.target instanceof Element && e.target.matches(".ui-graph")
		}, (e) => {
			for (let t of e) this.canvases.get(t)?.readOnlyMoved();
		}), t.observeComponents(t.root, e, { attributeFilter: ["aria-disabled", "aria-busy"] }, (e) => {
			for (let t of e) this.canvases.get(t)?.refuseEdits();
		}), t.strings.onChange(() => {
			for (let e of this.live) e.connected && e.wordsChanged();
		}), t.propertyPatchEngine.addValueChangeHandler((e) => {
			if (!(e.local || e.propertyName !== "Value")) for (let t of e.components) this.canvases.get(t)?.load(e.value);
		});
	}
	attach(e) {
		this.prune();
		for (let t of e) {
			let e = this.kinds.get(t.getAttribute("data-ui-graph-kind") ?? "");
			if (e !== void 0 && !this.canvases.has(t)) {
				let n = new Xt(t, this.context, e);
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
function Yt(e, t) {
	let n = t.target;
	if (n?.id === void 0) return null;
	let r = typeof n.id == "number" ? n.id : Number(n.id.value);
	return Number.isNaN(r) ? null : e.dom.findComponent(r, n.dynamicParameters ?? []);
}
var Xt = class {
	root;
	context;
	states;
	wheelReading;
	viewport;
	scene;
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
	drawnReadOnly;
	wordsWaitingOn = null;
	constructor(e, t, n) {
		this.root = e, this.context = t, this.states = t.states, this.wheelReading = t.wheel, this.definition = n, this.viewport = e.querySelector(".ui-graph__viewport"), this.groupLayer = e.querySelector(".ui-graph__groups"), this.scene = e.querySelector(".ui-graph__scene");
		let r = this.scene, i = e.querySelector(".ui-graph__nodes"), a = e.querySelector(".ui-graph__edges"), o = e.querySelector(".ui-graph__labels"), s = e.querySelector(".ui-graph__value"), c = {
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
		this.settings = new Bt(e), this.drawnReadOnly = this.settings.readOnly, this.documentState = new oe(e, s, this.settings, (e) => n.readDocument(e), {
			clearSelectionSets: () => this.selection.clearSets(),
			redraw: () => this.render.draw(),
			redrawEdges: () => this.render.drawEdges()
		}, t.values), this.selection = new rt(e, this.nodeElements, this.groupLayer, c), this.view = new Ut(e, this.settings, t, c), this.dragging = new at(this.selection, c, this.settings), this.menus = new ht(e, t, this.documentState, this.selection, this.view, this.settings, c, this.groupLayer), this.render = new Tt(t, r, i, this.groupLayer, a, o, this.nodeElements, this.documentState, this.selection, this.settings, this.view, () => this.kind), this.kind = n.create({
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
		this.drawnReadOnly = this.settings.readOnly, this.render.draw(), this.menus.syncMenus(), this.refuseEdits();
	}
	readOnlyMoved() {
		this.settings.readOnly !== this.drawnReadOnly && this.draw();
	}
	wordsChanged() {
		this.kind.wordsChanged?.(), this.view.wordsChanged(), this.drawWords();
	}
	drawWords() {
		let e = document.activeElement;
		if (e === null || !this.scene.contains(e) || !this.kind.isEditor(e)) {
			this.wordsWaitingOn = null, this.render.draw();
			return;
		}
		this.wordsWaitingOn !== e && (this.wordsWaitingOn = e, e.addEventListener("focusout", () => setTimeout(() => {
			this.wordsWaitingOn === e && (this.wordsWaitingOn = null, this.drawWords());
		}), { once: !0 }));
	}
	refuseEdits() {
		(this.settings.readOnly || this.states.isInert(this.root)) && (this.kind.escape(), this.drag?.kind === "kind" && (this.drag.cancel?.(), this.endDrag()));
	}
	get connected() {
		return this.root.isConnected;
	}
	dispose() {
		this.render.dispose(), this.view.dispose();
	}
	load(e) {
		this.drag?.kind === "kind" && (this.drag.cancel?.(), this.endDrag()), this.documentState.load(this.definition.readDocument(e));
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
		this.viewport.addEventListener("wheel", (e) => this.wheel(e), { passive: !1 }), this.viewport.addEventListener("pointerdown", (e) => this.pointerDown(e)), this.viewport.addEventListener("pointermove", (e) => this.pointerMove(e)), this.viewport.addEventListener("pointerup", (e) => this.pointerUp(e)), this.viewport.addEventListener("pointercancel", () => this.pointerCancel()), this.viewport.addEventListener("pointerleave", () => this.render.setFocusItem(null)), this.viewport.addEventListener("dblclick", (e) => this.doubleClick(e)), this.viewport.addEventListener("keydown", (e) => this.key(e)), this.viewport.addEventListener("click", (e) => this.click(e)), this.root.addEventListener("click", (e) => this.chrome(e)), this.root.addEventListener(h.menuOpeningEvent, (e) => this.menuOpening(e));
	}
	menuOpening(e) {
		let t = e instanceof CustomEvent ? e.detail : null;
		if (t?.actionBar === !0) {
			this.barOpening(e, t.target ?? null);
			return;
		}
		this.states.isInert(this.root) || this.menus.prepareMenus(t?.target ?? null);
	}
	barOpening(e, t) {
		if (!(t instanceof HTMLElement) || this.settings.readOnly || this.states.isInert(this.root) || this.drag !== null) {
			e.preventDefault();
			return;
		}
		this.menus.prepareBar(t);
	}
	wheel(e) {
		if (e.target instanceof Element && (this.isPanel(e.target) || this.kind.isEditor(e.target))) return;
		e.preventDefault();
		let t = et(this.wheelReading.pixels(e, 400), this.wheelReading.notch);
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
		if (e.button !== 0 || !(e.target instanceof Element) || Qt(e.target) || this.kind.isEditor(e.target) || this.isPanel(e.target)) return;
		if (e.target.closest("[data-ui-graph-map]") !== null) {
			this.drag = { kind: "map" }, this.viewport.setPointerCapture(e.pointerId), this.view.minimapPan(e);
			return;
		}
		let t = this.view.toViewport(e), r = this.view.toScene(t.x, t.y);
		this.pointerX = r.x, this.pointerY = r.y, e.preventDefault(), this.viewport.focus({ preventScroll: !0 });
		let i = e.target.closest(Gt);
		if (i !== null) {
			this.pressMark(i, !1);
			return;
		}
		let s = this.kind.pointerDown(e, e.target);
		if (s !== !1) {
			s !== !0 && (this.drag = s, this.viewport.setPointerCapture(e.pointerId));
			return;
		}
		let c = e.target.closest(`[${a}]`);
		if (c !== null && !this.settings.readOnly) {
			this.drag = {
				kind: "reroute",
				edge: c.getAttribute(a),
				index: Number(c.getAttribute("data-ui-graph-reroute-index"))
			}, this.viewport.setPointerCapture(e.pointerId);
			return;
		}
		let l = e.target.closest(`[${o}]`);
		if (l !== null) {
			e.target.closest("[data-ui-graph-resize]") !== null && !this.settings.readOnly ? (this.drag = this.dragging.beginResize(l, r), this.viewport.setPointerCapture(e.pointerId)) : (this.drag = this.dragging.beginNodeDrag(e, l.getAttribute(o), r), this.drag !== null && this.viewport.setPointerCapture(e.pointerId));
			return;
		}
		let u = e.target.closest(`[${n}]`);
		if (u !== null && e.target.closest(".ui-graph__group-band") !== null) {
			this.drag = this.dragging.beginGroupDrag(e, u.getAttribute(n), r), this.drag !== null && this.viewport.setPointerCapture(e.pointerId);
			return;
		}
		this.render.setFocusItem(null), it(e) ? (this.drag = {
			kind: "marquee",
			startX: r.x,
			startY: r.y
		}, this.selection.beginMarquee()) : (this.selection.clearSelection(), this.drag = {
			kind: "pan",
			startX: t.x,
			startY: t.y,
			panX: this.view.panX,
			panY: this.view.panY
		}, this.root.classList.add(Wt)), this.viewport.setPointerCapture(e.pointerId);
	}
	pressMark(e, t) {
		let n = e.closest(`[${o}]`)?.getAttribute(o), r = e.hasAttribute(s);
		r ? this.togglePinned(n) : this.toggleCollapsed(n), t && n != null && this.nodeElements.get(n)?.querySelector(`[${r ? s : c}]`)?.focus({ preventScroll: !0 });
	}
	togglePinned(e) {
		let t = this.kind.items().find((t) => t.id === e);
		t === void 0 || this.settings.readOnly || (t.pinned = t.pinned !== !0, this.documentState.edited());
	}
	toggleCollapsed(e) {
		let t = this.kind.items().find((t) => t.id === e);
		t === void 0 || this.settings.readOnly || (t.collapsed = t.collapsed !== !0, this.documentState.edited());
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
		this.drag = null, e?.kind === "kind" && e.end(), this.root.classList.remove(Wt), this.selection.hideMarquee(), this.render.clearPending();
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
		t !== void 0 && (t.x = O(t.x, this.settings.gridSize, !0), t.y = O(t.y, this.settings.gridSize, !0));
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
			let n = tt(t, i[e - 1], i[e]);
			n < o && (o = n, a = e - 1);
		}
		n.points.splice(a, 0, {
			x: O(t.x, this.settings.gridSize, this.settings.snapping),
			y: O(t.y, this.settings.gridSize, this.settings.snapping)
		}), this.documentState.edited(!1);
	}
	click(e) {
		if (!(e.target instanceof Element)) return;
		let t = e.target.closest(Gt);
		if (t !== null) {
			e.detail === 0 && this.pressMark(t, !0);
			return;
		}
		let n = e.target.closest(`[${i}]`);
		if (n !== null) {
			this.selection.toggleEdge(n.getAttribute(i), it(e)), this.render.drawEdges();
			return;
		}
		let r = e.target.closest(`[${o}]`);
		r !== null && !Qt(e.target) && !this.kind.isEditor(e.target) && this.raiseNodeClick(r.getAttribute(o));
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
		t || e.target instanceof Element && e.target.closest(`[${this.context.names.eventBoundary}]`) !== null && this.onSheet(e.target) || (this.onSheet(e.target) || e.target instanceof Element && e.target.matches(v)) && (e.key === "Delete" || e.key === "Backspace" ? (e.preventDefault(), this.deleteSelection()) : n && e.code === "KeyC" ? (e.preventDefault(), this.copy()) : n && e.code === "KeyV" ? (e.preventDefault(), this.paste()) : n && e.code === "KeyZ" && !e.shiftKey ? (e.preventDefault(), this.replay(this.documentState.undo())) : n && (e.code === "KeyY" || e.code === "KeyZ" && e.shiftKey) ? (e.preventDefault(), this.replay(this.documentState.redo())) : n && e.code === "KeyA" ? (e.preventDefault(), this.selection.selectAll(this.kind.items().map((e) => e.id))) : e.key === "Escape" && (this.kind.escape(), this.selection.clearSelection()));
	}
	onSheet(e) {
		return e === this.viewport || e instanceof Node && this.scene.contains(e);
	}
	isPanel(e) {
		return Zt(e) || this.kind.isPanel(e);
	}
	replay(e) {
		e !== null && this.documentState.replay(e);
	}
	chrome(e) {
		if (!(e.target instanceof Element) || this.states.isInert(e.target)) return;
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
		let t = this.context.names, n = e.target.closest(`[${t.key}]`), r = n?.getAttribute(t.key) ?? "", i = e.target.closest(`[${p}]`);
		if (i !== null && n !== null && this.menus.foldPanel(), r.length === 0 || i === null && e.target.closest(`[${t.contextMenu}]`) === null) return;
		let a = i?.getAttribute("data-ui-graph-menu-panel") ?? n.closest(`[${t.contextMenu}]`)?.getAttribute(t.contextMenu) ?? "";
		r.startsWith("graph:") ? this.menus.run(r, a) : this.menus.raiseEntry(r, a);
		let o = document.activeElement;
		(!(o instanceof HTMLElement) || o === document.body || !o.isConnected) && this.viewport.focus({ preventScroll: !0 });
	}
};
function Zt(e) {
	return e.closest(`[${p}]`) !== null;
}
function Qt(e) {
	let t = e.closest("input, textarea, select, button");
	return t !== null && !t.matches("[data-ui-graph-pin-toggle], [data-ui-graph-fold]");
}
//#endregion
//#region src/framework-api.ts
var $t = 2;
function en() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.Graph needs the framework's client (ui.js) on the page before it.");
	if (e.contractVersion !== $t) throw Error(`NE.Standard.UI.Web.Graph was built for plugin contract ${$t}, but the framework's client on the page implements ${String(e.contractVersion ?? "an older one")}; install the package version that matches the framework.`);
	return e;
}
//#endregion
//#region src/graph/chain.ts
function tn(e, t) {
	let n = /* @__PURE__ */ new Set([t]), r = /* @__PURE__ */ new Set();
	return nn(e, t, !0, n, r), nn(e, t, !1, n, r), {
		items: [...n],
		edges: [...r]
	};
}
function nn(e, t, n, r, i) {
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
var rn = /* @__PURE__ */ new WeakMap();
function an(e) {
	e.classList.add(d);
}
function on(e, t, n) {
	e.classList.remove(d);
	for (let e of t.querySelectorAll(`[${f}]`)) e.removeAttribute(f), n?.(e);
}
function sn(e, t, n) {
	let r = rn.get(e) ?? null;
	r !== t && (r !== null && n(r, !1), t !== null && n(t, !0), rn.set(e, t));
}
//#endregion
//#region src/graph/link-drag.ts
var cn = "data-ui-graph-handle", ln = "data-ui-graph-entry", un = "data-ui-graph-link-source";
function dn(e, t, n) {
	let r = t.closest(`[${o}]`), i = r?.getAttribute("data-ui-graph-node") ?? null;
	if (r === null || i === null) return null;
	let a = e.root, s = null;
	an(a), r.setAttribute(un, "");
	for (let t of e.nodeLayer.querySelectorAll(`[${o}]`)) {
		let e = t.getAttribute(o);
		e !== i && !n.canLink(i, e) && t.setAttribute(f, "no");
	}
	let c = () => e.nodeLayer.querySelector(`[${o}="${CSS.escape(i)}"]`), l = () => c()?.querySelector("[data-ui-graph-handle]") ?? t;
	return {
		kind: "kind",
		move: (t, r) => {
			s = fn(e, i, r, n);
			let a = s?.querySelector("[data-ui-graph-entry]") ?? null;
			e.drawPending(e.centerOf(l()), a === null ? t : e.centerOf(a), "var(--ui-color-primary)");
		},
		finish: (e) => {
			let t = s?.getAttribute("data-ui-graph-node") ?? null;
			t !== null && n.link(i, t, e);
		},
		end: () => {
			r.removeAttribute(un), c()?.removeAttribute(un), on(a, e.nodeLayer);
		}
	};
}
function fn(e, t, n, r) {
	let i = document.elementFromPoint(n.clientX, n.clientY)?.closest("[data-ui-graph-node]") ?? null, a = i?.getAttribute("data-ui-graph-node") ?? null, o = i !== null && a !== null && a !== t && e.nodeLayer.contains(i) && r.canLink(t, a) ? i : null;
	return sn(e.nodeLayer, o, (e, t) => {
		t ? e.setAttribute(f, "yes") : e.removeAttribute(f);
	}), o;
}
function pn(e, t) {
	let n = e.root.querySelector(`.ui-graph__edge[data-ui-graph-edge="${CSS.escape(t)}"]`);
	return n === null ? null : nt(n);
}
function mn(e, t, n, r) {
	if (e.settings.readOnly) return;
	let i = document.createElement("div"), a = document.createElement("span");
	i.className = "ui-graph__caption-edit", a.className = "ui-graph__caption-edit-text", i.style.left = `${t.x}px`, i.style.top = `${t.y}px`, a.textContent = n, i.append(a), e.scene.append(i), e.context.renames.open({
		container: i,
		title: a,
		className: "ui-graph__caption-field",
		value: n,
		allowEmpty: !0,
		commit: r,
		done: () => i.remove(),
		refocus: () => e.view.viewportElement.focus({ preventScroll: !0 })
	});
}
//#endregion
//#region src/graph/card-view.ts
var hn = u.slice(1);
function gn(e, t, n) {
	let r = document.createElement("div"), i = (t.shape ?? n.shape) === "icon", a = t.title ?? t.id;
	r.className = i ? "ui-graph__node ui-graph__bubble" : "ui-graph__node ui-graph__card", r.setAttribute(o, t.id), r.style.setProperty("--ui-graph-node-x", String(e.x)), r.style.setProperty("--ui-graph-node-y", String(e.y)), t.color !== null && t.color.length > 0 && r.style.setProperty("--ui-graph-node-color", t.color), n.conflict !== null && r.setAttribute("data-ui-graph-conflict", n.conflict), e.pinned === !0 && r.setAttribute("data-ui-graph-pinned", "");
	let s = _n(t, i ? "ui-graph__bubble-face" : "ui-graph__card-icon", n);
	if (s !== null && r.append(s), i ? r.append(yn(a, "ui-graph__bubble-title")) : r.append(vn(t, a)), t.badge !== null && r.append(bn(t.badge, i ? "ui-graph__bubble-badge" : "ui-graph__card-badge")), n.connectable) {
		let e = document.createElement("span"), t = document.createElement("span");
		e.className = "ui-graph__handle", e.setAttribute(cn, ""), t.className = "ui-graph__entry", t.setAttribute(ln, ""), r.append(t, e);
	}
	let c = t.tooltip ?? (i ? a : null);
	return c !== null && S(r, c, n.tooltips), r;
}
function _n(e, t, n) {
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
function vn(e, t) {
	let n = document.createElement("div");
	if (n.className = "ui-graph__card-text", n.append(yn(t, null)), e.subtitle !== null) {
		let t = document.createElement("span");
		t.className = "ui-graph__card-subtitle", t.textContent = e.subtitle, n.append(t);
	}
	return n;
}
function yn(e, t) {
	let n = document.createElement("span");
	return n.className = t === null ? hn : `${hn} ${t}`, n.textContent = e, n;
}
function bn(e, t) {
	let n = document.createElement("span"), r = document.createElement("span");
	return n.className = `${h.badgeClass} ${h.badgeSurfaceClass} ${t}`, n.setAttribute(h.badgeText, ""), r.className = h.badgeTextClass, r.textContent = e, n.append(r), n;
}
//#endregion
//#region src/graph/draft.ts
function xn(e, t, n, r) {
	let i = new Set(n), a = new Map(t.map((e) => [e.id, e])), o = /* @__PURE__ */ new Set(), s = [];
	for (let t of e) {
		if (i.has(t.id)) continue;
		let e = a.get(t.id);
		s.push(e === void 0 ? t : r(e)), o.add(t.id);
	}
	for (let e of t) !o.has(e.id) && !i.has(e.id) && s.push(r(e));
	return s;
}
function Sn(e, t) {
	let n = new Map(e.map((e) => [e.id, e])), r = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = n.get(e.id);
		e.created ? t !== void 0 && r.set(e.id, "changed") : t === void 0 ? r.set(e.id, "removed") : e.baseline !== null && e.baseline !== JSON.stringify(t) && r.set(e.id, "changed");
	}
	return r;
}
function Cn(e, t, n, r) {
	let i = e.findIndex((e) => e.id === t);
	if (i < 0) return !1;
	if (r) {
		let t = e[i];
		t.created = n === void 0, t.baseline = n === void 0 ? null : JSON.stringify(n);
	} else e.splice(i, 1);
	return !0;
}
function wn(e, t, n) {
	return /* @__PURE__ */ new Set([
		...e.map((e) => e.id),
		...t.map((e) => e.id),
		...n
	]);
}
function Tn(e, t) {
	let n = 1;
	for (; t.has(`${e}-${n}`);) n++;
	return `${e}-${n}`;
}
//#endregion
//#region src/graph/model.ts
function En() {
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
function Dn(e) {
	let t = e;
	if (typeof t != "object" || !t) return En();
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
			points: re(e.points)
		})),
		groups: (t.groups ?? []).map(ie),
		draft: {
			nodes: (n?.nodes ?? []).flatMap((e) => {
				let t = Mn(e);
				return t === null ? [] : [{
					...On(t),
					created: e.created === !0,
					baseline: typeof e.baseline == "string" ? e.baseline : null
				}];
			}),
			removed: (n?.removed ?? []).map((e) => String(e))
		},
		key: te(t)
	};
}
function On(e) {
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
function kn(e) {
	return Mn(e);
}
function An(e, t) {
	return xn(e, t.nodes, t.removed, kn);
}
function jn(e, t) {
	return Sn(e, t.nodes);
}
function Mn(e) {
	if (typeof e != "object" || !e) return null;
	let t = e, n = t.id;
	if (typeof n != "string" || n.length === 0) return null;
	let r = Array.isArray(t.links) ? t.links : [];
	return {
		id: n,
		title: F(t.title),
		subtitle: F(t.subtitle),
		icon: F(t.icon),
		image: F(t.image),
		shape: Nn(t.shape),
		color: F(t.color),
		badge: F(t.badge),
		tooltip: F(t.tooltip),
		links: r.flatMap((e) => {
			let t = e;
			return typeof t == "object" && t && typeof t.id == "string" && typeof t.to == "string" ? [{
				id: t.id,
				to: t.to,
				caption: F(t.caption)
			}] : [];
		})
	};
}
function Nn(e) {
	return e === "Icon" || e === "icon" || e === 1 ? "icon" : e === "Card" || e === "card" || e === 0 ? "card" : null;
}
function F(e) {
	return typeof e == "string" && e.length > 0 ? e : null;
}
function Pn(e) {
	let t = new Set(e.map((e) => e.id));
	return e.flatMap((e) => e.links.filter((e) => t.has(e.to)).map((t) => ({
		...t,
		from: e.id
	})));
}
//#endregion
//#region src/graph/graph-editing.ts
var Fn = class {
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
			...On(n),
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
		let e = Tn("node", wn(this.host.serverNodes(), this.document.draft.nodes, this.document.draft.removed)), t = this.services.pointerScene(), n = this.services.context.strings.text("ui.graph.new-node");
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
		return dn(this.services, e, {
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
		let t = this.host.link(e), n = pn(this.services, e);
		t !== void 0 && n !== null && mn(this.services, n, t.caption ?? "", (n) => {
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
function In(e, t, n) {
	switch (t.action) {
		case "Reset":
			e.length = 0;
			return;
		case "Move":
			for (let n of t.moves) Rn(e, n.key, n.newIndex);
			return;
		default: for (let r of t.items) Ln(e, t.action, r.key ?? r.oldKey, r.oldKey ?? r.key, r.index, r.item, n);
	}
}
function Ln(e, t, n, r, i, a, o) {
	let s = e.findIndex((e) => e.id === (t === "Replace" ? r : n));
	if (t === "Remove") {
		s >= 0 && e.splice(s, 1);
		return;
	}
	let c = o(a);
	c !== null && (s >= 0 ? e[s] = c : i !== null && i >= 0 && i <= e.length ? e.splice(i, 0, c) : e.push(c));
}
function Rn(e, t, n) {
	let r = e.findIndex((e) => e.id === t);
	if (r < 0 || n === null) return;
	let [i] = e.splice(r, 1);
	e.splice(Math.min(n, e.length), 0, i);
}
//#endregion
//#region src/graph/layered.ts
var zn = 8, Bn = 4, Vn = 24, Hn = 128, Un = 48, Wn = 96;
function Gn(e, t, n) {
	let r = n.direction === "down" || n.direction === "up", i = n.direction === "left" || n.direction === "up", a = n.layerGap ?? cr(e, r), o = n.nodeGap ?? 32, s = /* @__PURE__ */ new Map();
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
	let { sequence: c, forward: l, backEdges: u } = qn([...s.values()], t);
	nr(c, l, s);
	let d = n.layerGaps?.(new Map([...s.values()].map((e) => [e.id, e.layer]))), f = /* @__PURE__ */ new Map(), p = ir(l, s, f), m = ar(s, p);
	lr(m, p, o);
	let h = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map(), _ = /* @__PURE__ */ new Map(), v = n.originX ?? 0, y = n.originY ?? 0, b = [], x = 0, S = a, C = Infinity;
	for (let e of m) for (let t of e) C = Math.min(C, t.line - t.lead);
	for (let [e, t] of m.entries()) {
		let n = 0;
		for (let e of t) n = Math.max(n, e.depth);
		for (let e of t) {
			let t = Number.isFinite(C) ? C : 0;
			b.push({
				id: e.id,
				real: e.real,
				along: e.real ? x : x + n / 2,
				depth: e.real ? e.depth : 0,
				across: e.real ? e.line - e.lead - t : e.line - t
			}), e.real && _.set(e.id, e.layer);
		}
		S = d?.get(e) ?? a, x += n + S;
	}
	let ee = Math.max(0, x - S);
	for (let e of b) {
		let t = i ? ee - e.along - e.depth : e.along, n = r ? {
			x: v + e.across,
			y: y + t
		} : {
			x: v + t,
			y: y + e.across
		};
		e.real ? h.set(e.id, n) : g.set(e.id, n);
	}
	let w = /* @__PURE__ */ new Map();
	for (let [e, t] of f) u.has(e) || w.set(e, t.map((e) => g.get(e)));
	return {
		positions: h,
		backEdges: u,
		layers: _,
		routes: w
	};
}
function Kn(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let t of e) n.has(t) || n.set(t, { id: t });
	return qn([...n.values()], t).backEdges;
}
function qn(e, t) {
	let n = new Set(e.map((e) => e.id)), r = /* @__PURE__ */ new Set(), i = t.filter((e) => n.has(e.from) && n.has(e.to));
	for (let e of i) e.from === e.to && r.add(e.id);
	let a = i.filter((e) => e.from !== e.to), o = Jn(e, a), s = er(e, a, o), c = [];
	for (let e of a) o.has(e.id) ? (r.add(e.id), c.push({
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
		sequence: s,
		forward: c,
		backEdges: r
	};
}
function Jn(e, t) {
	let n = /* @__PURE__ */ new Set(), r = Yn(e, t), i = /* @__PURE__ */ new Map();
	r.forEach((e, t) => {
		for (let n of e) i.set(n, t);
	});
	let a = r.map(() => []), o = r.map(() => []);
	for (let e of t) {
		let t = i.get(e.from), n = i.get(e.to);
		if (t !== void 0 && t === n) {
			a[t].push(e);
			continue;
		}
		t !== void 0 && o[t].push(e), n !== void 0 && o[n].push(e);
	}
	return r.forEach((e, t) => {
		let r = Xn(e, a[t], o[t]), i = e.length <= Vn ? Zn(r, a[t], o[t]) : r, s = new Map(i.map((e, t) => [e, t]));
		for (let e of a[t]) s.get(e.from) > s.get(e.to) && n.add(e.id);
	}), n;
}
function Yn(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = n.get(e.from);
		t === void 0 ? n.set(e.from, [e.to]) : t.push(e.to);
	}
	let r = new Map(e.map((e, t) => [e.id, t])), i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map(), o = [], s = /* @__PURE__ */ new Set(), c = [], l = 0, u = (e) => {
		i.set(e, l), a.set(e, l++), o.push(e), s.add(e);
	};
	for (let t of e) {
		if (i.has(t.id)) continue;
		let e = [{
			id: t.id,
			next: 0
		}];
		for (u(t.id); e.length > 0;) {
			let t = e[e.length - 1], l = n.get(t.id) ?? [];
			if (t.next < l.length) {
				let n = l[t.next++];
				i.has(n) ? s.has(n) && a.set(t.id, Math.min(a.get(t.id), i.get(n))) : (u(n), e.push({
					id: n,
					next: 0
				}));
				continue;
			}
			if (e.pop(), e.length > 0) {
				let n = e[e.length - 1].id;
				a.set(n, Math.min(a.get(n), a.get(t.id)));
			}
			if (a.get(t.id) !== i.get(t.id)) continue;
			let d = [], f;
			do
				f = o.pop(), s.delete(f), d.push(f);
			while (f !== t.id);
			d.length > 1 && c.push(d.sort((e, t) => r.get(e) - r.get(t)));
		}
	}
	return c;
}
function Xn(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
	for (let e of n) a.set(e.from, (a.get(e.from) ?? 0) + 1), a.set(e.to, (a.get(e.to) ?? 0) - 1);
	for (let t of e) r.set(t, /* @__PURE__ */ new Set()), i.set(t, /* @__PURE__ */ new Set());
	for (let e of t) r.get(e.from).add(e.to), i.get(e.to).add(e.from);
	let o = new Set(e), s = [], c = [], l = (e) => {
		o.delete(e);
		for (let t of r.get(e)) i.get(t).delete(e);
		for (let t of i.get(e)) r.get(t).delete(e);
	}, u = () => e.filter((e) => o.has(e));
	for (; o.size > 0;) {
		let e = !0;
		for (; e;) {
			e = !1;
			for (let t of u()) r.get(t).size === 0 && (c.push(t), l(t), e = !0);
			for (let t of u()) i.get(t).size === 0 && (s.push(t), l(t), e = !0);
		}
		if (o.size === 0) break;
		let t = null, n = -Infinity;
		for (let e of u()) {
			let o = r.get(e).size - i.get(e).size + (a.get(e) ?? 0);
			o > n && (t = e, n = o);
		}
		s.push(t), l(t);
	}
	return [...s, ...c.reverse()];
}
function Zn(e, t, n) {
	let r = e, i = Qn(r, t, n), a = 0;
	for (let o = 0; o < 3; o++) {
		let o = !1;
		for (let s of e) {
			let e = r.filter((e) => e !== s);
			for (let c of [[...e, s], [s, ...e]]) {
				if (a++ >= Hn) return r;
				let e = Qn(c, t, n);
				$n(e, i) && (r = c, i = e, o = !0);
			}
		}
		if (!o) break;
	}
	return r;
}
function Qn(e, t, n) {
	let r = new Map(e.map((e, t) => [e, t])), i = t.map((e) => r.get(e.from) < r.get(e.to) ? {
		from: e.from,
		to: e.to
	} : {
		from: e.to,
		to: e.from
	}), a = new Map(e.map((e) => [e, 0]));
	i.sort((e, t) => r.get(e.from) - r.get(t.from));
	for (let e of i) a.set(e.to, Math.max(a.get(e.to), a.get(e.from) + 1));
	let o = 0, s = 0, c = 0;
	for (let e of t) r.get(e.from) > r.get(e.to) && c++;
	for (let e of a.values()) o = Math.max(o, e);
	for (let e of i) s += a.get(e.to) - a.get(e.from);
	for (let e of n) s += r.has(e.to) ? a.get(e.to) + 1 : o + 1 - a.get(e.from);
	return {
		back: c,
		span: s
	};
}
function $n(e, t) {
	return e.back === t.back ? e.span < t.span : e.back < t.back;
}
function er(e, t, n) {
	let r = new Map(e.map((e, t) => [e.id, t])), i = Array(e.length).fill(0), a = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = r.get(n.has(e.id) ? e.to : e.from), o = r.get(n.has(e.id) ? e.from : e.to), s = a.get(t);
		i[o]++, s === void 0 ? a.set(t, [o]) : s.push(o);
	}
	let o = new tr(), s = [];
	for (i.forEach((e, t) => {
		e === 0 && o.push(t);
	}); o.size > 0;) {
		let t = o.pop();
		s.push(e[t]);
		for (let e of a.get(t) ?? []) --i[e] === 0 && o.push(e);
	}
	return s;
}
var tr = class {
	items = [];
	get size() {
		return this.items.length;
	}
	push(e) {
		let t = this.items, n = t.length;
		for (t.push(e); n > 0;) {
			let r = n - 1 >> 1;
			if (t[r] <= e) break;
			t[n] = t[r], n = r;
		}
		t[n] = e;
	}
	pop() {
		let e = this.items, t = e[0], n = e.pop();
		if (e.length === 0) return t;
		let r = 0;
		for (; r * 2 + 1 < e.length;) {
			let t = r * 2 + 1, i = t + 1 < e.length && e[t + 1] < e[t] ? t + 1 : t;
			if (e[i] >= n) break;
			e[r] = e[i], r = i;
		}
		return e[r] = n, t;
	}
};
function nr(e, t, n) {
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
	rr(e, t, n);
}
function rr(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
	for (let e of t) {
		r.set(e.to, (r.get(e.to) ?? 0) + 1);
		let t = i.get(e.from);
		t === void 0 ? i.set(e.from, [e.to]) : t.push(e.to);
	}
	for (let t = e.length - 1; t >= 0; t--) {
		let a = e[t], o = i.get(a.id) ?? [];
		if (o.length === 0 || o.length < (r.get(a.id) ?? 0)) continue;
		let s = Infinity;
		for (let e of o) s = Math.min(s, n.get(e).layer);
		a.layer = Math.max(a.layer, s - 1);
	}
}
function ir(e, t, n) {
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
				breadth: zn,
				lead: zn / 2,
				input: e.input,
				layer: n,
				order: 0,
				line: 0
			}), r.push({
				from: c,
				to: a,
				fromOffset: l,
				toOffset: zn / 2
			}), s.push(a), c = a, l = zn / 2;
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
function ar(e, t) {
	let n = [];
	for (let t of e.values()) {
		for (; n.length <= t.layer;) n.push([]);
		n[t.layer].push(t);
	}
	for (let e of n) e.sort((e, t) => e.input - t.input), e.forEach((e, t) => e.order = t);
	let r = or(t, !0), i = or(t, !1);
	for (let t = 0; t < Bn; t++) {
		let a = t % 2 == 0;
		for (let t = 1; t < n.length; t++) {
			let o = n[a ? t : n.length - 1 - t];
			sr(o, a ? r : i, e);
		}
	}
	return n;
}
function or(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = t ? r.to : r.from, i = t ? r.from : r.to, a = n.get(e);
		a === void 0 ? n.set(e, [i]) : a.push(i);
	}
	return n;
}
function sr(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	for (let i of e) {
		let e = t.get(i.id) ?? [];
		r.set(i.id, e.length === 0 ? i.order : e.reduce((e, t) => e + n.get(t).order, 0) / e.length);
	}
	e.sort((e, t) => r.get(e.id) - r.get(t.id) || e.order - t.order), e.forEach((e, t) => e.order = t);
}
function cr(e, t) {
	if (e.length === 0) return Un;
	let n = e.map((e) => t ? e.height : e.width).sort((e, t) => e - t), r = n[Math.floor(n.length / 2)];
	return Math.max(Un, Math.min(Wn, Math.round(r * .75)));
}
function lr(e, t, n) {
	let r = new Map(e.flat().map((e) => [e.id, e])), i = or(t, !0), a = or(t, !1), o = ur(e, i, r), s = pr(t, r), c = [];
	for (let t of [!1, !0]) for (let l of [!1, !0]) {
		let u = (t ? [...e].reverse() : [...e]).map((e) => l ? [...e].reverse() : [...e]);
		c.push(hr(u, mr(u, t ? a : i, o, s, r), n, l));
	}
	let l = gr(e, c);
	for (let t of e) for (let e of t) e.line = l.get(e.id);
}
function ur(e, t, n) {
	let r = /* @__PURE__ */ new Set();
	for (let i = 1; i < e.length; i++) {
		let a = e[i], o = 0, s = 0;
		for (let c = 0; c < a.length; c++) {
			let l = dr(a[c], t, n);
			if (c !== a.length - 1 && l === void 0) continue;
			let u = l ?? e[i - 1].length - 1;
			for (; s <= c; s++) {
				let e = a[s], i = dr(e, t, n);
				for (let a of t.get(e.id) ?? []) {
					let t = n.get(a).order;
					(t < o || t > u) && t !== i && r.add(fr(a, e.id));
				}
			}
			o = u;
		}
	}
	return r;
}
function dr(e, t, n) {
	if (e.real) return;
	let r = n.get((t.get(e.id) ?? [])[0]);
	return r === void 0 || r.real ? void 0 : r.order;
}
function fr(e, t) {
	return `${e}\u0000${t}`;
}
function pr(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = fr(r.from, r.to);
		n.has(e) || n.set(e, r.fromOffset - t.get(r.from).lead - (r.toOffset - t.get(r.to).lead));
	}
	return n;
}
function mr(e, t, n, r, i) {
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
				let d = i.get(u).layer < l.layer, f = d ? fr(u, l.id) : fr(l.id, u);
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
function hr(e, t, n, r) {
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
function gr(e, t) {
	let n = e.flat(), r = t.map((e) => {
		let t = Infinity, r = -Infinity;
		for (let i of n) {
			let n = e.get(i.id);
			t = Math.min(t, n - i.lead), r = Math.max(r, n + i.breadth - i.lead);
		}
		return r - t;
	});
	return t[r.indexOf(Math.min(...r))];
}
//#endregion
//#region src/graph/layered-sheet.ts
var _r = .35, vr = 12, yr = .6, br = class {
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
		let e = this.services.root.getAttribute(Mt);
		return e === "down" || e === "left" || e === "up" ? e : "right";
	}
	get document() {
		return this.services.documentState.document;
	}
	get layoutFor() {
		return `${this.direction}:${this.host.layoutKey()}`;
	}
	structureChanged() {
		this.backEdges = Kn(this.host.nodeIds(), this.host.links());
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
			for (; r.some((e) => Ke(o, e));) this.direction === "down" ? o.x += o.width + this.options.nodeGap : o.y += o.height + this.options.nodeGap;
			e.x = o.x, e.y = o.y, r.push(o), a || this.laidAt.set(e.id, {
				x: o.x,
				y: o.y
			});
		}
		this.pending.clear(), this.services.draw(), (i || this.turned) && (this.placedOnce || !this.viewKept || !this.services.view.showsAnyItem()) && this.services.view.fit(), this.placedOnce = !0, this.turned = !1;
	}
	waitForSize() {
		this.waiting === null && (this.waiting = new ResizeObserver(() => {
			this.services.root.offsetWidth !== 0 && (this.waiting?.disconnect(), this.waiting = null, this.placePending());
		}), this.waiting.observe(this.services.root));
	}
	layout(e) {
		let t = 0;
		if (this.host.nodeBox !== void 0) for (let n of e) t = Math.max(t, this.services.nodeExtent(n.id)?.width ?? 0);
		let n = e.map((e) => ({
			id: e.id,
			...this.box(e.width, e.height, t)
		})), r = Gn(n, this.host.links(), {
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
		let t = le(e);
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
			let o = [...a].sort((e, t) => e.across - t.across), s = o.findIndex((e) => e.level), c = s >= 0 ? s : (o.length - 1) / 2, l = Math.max(c, o.length - 1 - c), u = Math.min(vr, (r ? e.width : e.height) * yr / (2 * l));
			o.forEach((e, r) => {
				t.get(e.id)[n] = (r - c) * u;
			});
		}
	}
	middleEndsOf(e) {
		let t = this.services.nodeRect(e.from), n = this.services.nodeRect(e.to);
		if (t === null || n === null) return null;
		let r = this.direction, i = this.backEdges.has(e.id), a = e.from === e.to, { start: o, end: s } = xr(t, n, r, i, a);
		return {
			from: o,
			to: s,
			axis: r === "down" || r === "up" ? "vertical" : "horizontal",
			back: i,
			loop: i && a,
			via: this.routeOf(e),
			reversed: r === "left" || r === "up"
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
};
function xr(e, t, n, r, i) {
	let a = n === "down" || n === "up", o = n === "left" || n === "up";
	if (!r) return {
		start: a ? {
			x: e.x + e.width / 2,
			y: o ? e.y : e.y + e.height
		} : {
			x: o ? e.x : e.x + e.width,
			y: e.y + e.height / 2
		},
		end: a ? {
			x: t.x + t.width / 2,
			y: o ? t.y + t.height : t.y
		} : {
			x: o ? t.x + t.width : t.x,
			y: t.y + t.height / 2
		}
	};
	let s = i ? !o : o, c = i ? o : !o;
	return {
		start: a ? {
			x: e.x + e.width * _r,
			y: s ? e.y + e.height : e.y
		} : {
			x: s ? e.x + e.width : e.x,
			y: e.y + e.height * _r
		},
		end: a ? {
			x: t.x + t.width * _r,
			y: c ? t.y + t.height : t.y
		} : {
			x: c ? t.x + t.width : t.x,
			y: t.y + t.height * _r
		}
	};
}
//#endregion
//#region src/graph/layered-kind.ts
var Sr = "data-ui-graph-nodes", Cr = 32, wr = 34, Tr = 96;
function Er(e, t, n) {
	let r = Math.max(e, Tr, n);
	return {
		width: r,
		height: t + wr,
		anchor: {
			x: r / 2,
			y: t / 2
		}
	};
}
var Dr = {
	name: "layered",
	readDocument: Dn,
	create: (e) => new Or(e)
}, Or = class {
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
		let t = T(e.root.getAttribute(Sr));
		this.services = e, this.server = Array.isArray(t) ? t.map(Mn).filter((e) => e !== null) : [], this.editing = new Fn(e, {
			nodes: () => this.nodes,
			serverNodes: () => this.server,
			node: (e) => this.nodeById.get(e),
			serverNode: (e) => this.serverById.get(e),
			link: (e) => this.linkById.get(e)
		}), this.sheet = new br(e, {
			nodeIds: () => this.nodes.map((e) => e.id),
			links: () => this.links,
			layoutKey: () => this.shape,
			nodeBox: (e, t, n) => this.shape === "icon" ? Er(e, t, n) : {
				width: e,
				height: t
			},
			spreadsEnds: (e) => (this.nodeById.get(e)?.shape ?? this.shape) === "card"
		}, { nodeGap: Cr }), this.refresh();
	}
	get editable() {
		return !this.services.settings.readOnly && this.services.root.hasAttribute("data-ui-graph-edit-structure");
	}
	get document() {
		return this.services.documentState.document;
	}
	get shape() {
		return Nn(this.services.root.getAttribute("data-ui-graph-node-shape")) ?? "card";
	}
	applyChange(e) {
		In(this.server, e, Mn), this.serverVersion++, this.services.draw();
	}
	refresh() {
		let e = this.document.draft, t = `${this.serverVersion}|${this.services.documentState.version}`;
		t !== this.structureKey && (this.structureKey = t, this.serverById = new Map(this.server.map((e) => [e.id, e])), this.nodes = An(this.server, e), this.conflicts = jn(this.server, e), this.nodeById = new Map(this.nodes.map((e) => [e.id, e])), this.links = Pn(this.nodes), this.linkById = new Map(this.links.map((e) => [e.id, e])), this.sheet.structureChanged());
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
		return gn(e, t, {
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
		return tn(this.links, e);
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
		let n = t.closest(`[${cn}]`);
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
		if (e === "graph:take-server" || e === "graph:keep-mine") return t?.kind === "node" && !this.services.settings.readOnly && Cn(this.document.draft.nodes, t.id, this.serverById.get(t.id), e === "graph:keep-mine") && this.services.documentState.edited(), !0;
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
		A(this.services, "graph:take-server", r), A(this.services, "graph:keep-mine", r);
		for (let e of [
			"graph:add-node",
			"graph:caption",
			"graph:delete-edge"
		]) k(this.services, e, n);
	}
};
//#endregion
//#region src/nodes/layout.ts
function kr(e, t) {
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
	})), l = t.only !== void 0, u = Infinity, d = Infinity;
	for (let e of i) u = Math.min(u, e.x), d = Math.min(d, e.y);
	let f = Gn(s, c, {
		direction: "right",
		layerGap: r,
		layerGaps: (e) => jr(o, e, r),
		nodeGap: t.rowGap ?? 32,
		originX: l ? u : 0,
		originY: l ? d : 0
	}).positions;
	return (t.gridSize ?? 0) > 0 && Ar(f, s, c, t.gridSize), f;
}
function Ar(e, t, n, r) {
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
		c.has(i) || c.set(i, O(e.get(i).y, r, !0) - e.get(i).y), e.set(n.id, {
			x: O(t.x, r, !0),
			y: t.y + c.get(i)
		});
	}
}
function jr(e, t, n) {
	let r = e.filter((e) => t.get(e.toNode) > t.get(e.fromNode)), i = /* @__PURE__ */ new Map();
	for (let e of r) i.set(`${e.fromNode}:${e.fromPin}`, (i.get(`${e.fromNode}:${e.fromPin}`) ?? 0) + 1);
	let a = /* @__PURE__ */ new Map();
	for (let e of r) {
		let n = `${e.fromNode}:${e.fromPin}`, r = t.get(e.fromNode), o = a.get(r) ?? /* @__PURE__ */ new Set();
		o.add((i.get(n) ?? 0) > 1 ? `from:${n}` : `to:${e.toNode}:${e.toPin}`), a.set(r, o);
	}
	return new Map([...a].map(([e, t]) => [e, Math.max(n, 28 + (t.size - 1) * 14)]));
}
var Mr = "array", Nr = "array:", Pr = "text", Fr = "image";
function Ir() {
	return {
		nodes: [],
		edges: [],
		groups: [],
		key: null,
		parameters: []
	};
}
function Lr(e) {
	let t = e;
	return typeof t != "object" || !t ? Ir() : {
		nodes: (t.nodes ?? []).map(Rr),
		edges: (t.edges ?? []).map(zr),
		groups: (t.groups ?? []).map(ie),
		key: te(t),
		parameters: (t.parameters ?? []).map((e) => ({
			node: String(e.node),
			pin: String(e.pin)
		}))
	};
}
function Rr(e) {
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
		width: ne(e.width),
		height: ne(e.height)
	};
}
function zr(e) {
	return {
		id: String(e.id),
		fromNode: String(e.fromNode),
		fromPin: String(e.fromPin),
		toNode: String(e.toNode),
		toPin: String(e.toPin),
		points: re(e.points)
	};
}
function Br(e) {
	return e === Mr || e.startsWith(Nr);
}
function Vr(e) {
	return e === Pr || e === Fr;
}
function Hr(e, t) {
	return e.length === 0 || t.length === 0 ? !1 : e === t || e === "any" || t === "any" || Vr(e) && Vr(t) ? !0 : Br(e) && Br(t) && (e === Mr || t === Mr);
}
function Ur(e, t, n) {
	let r = {};
	for (let t of e.inputs) t.editor !== "None" && t.defaultValue !== void 0 && t.defaultValue !== null && (r[t.name] = t.defaultValue);
	return {
		id: E("n"),
		type: e.key,
		x: t,
		y: n,
		title: null,
		color: null,
		pinned: !1,
		values: r
	};
}
function Wr(e) {
	return e.hidden !== !0 && e.editor !== "None" && e.editor !== "Image" && e.editor !== "List" && e.editor !== "Display";
}
function Gr(e, t, n, r) {
	let i = e.nodes.find((e) => e.id === n), a = i === void 0 ? void 0 : t.get(i.type), o = I(a, r, !1);
	return i !== void 0 && a !== void 0 && o !== void 0 && Wr(o) && Zr(e, n, r) === void 0 && $r(o, i, a);
}
function Kr(e, t, n) {
	let r = e.parameters.filter((e) => e.node !== t || e.pin !== n), i = r.length !== e.parameters.length;
	return e.parameters = r, i;
}
function qr(e, t, n, r, i) {
	let a = e.nodes.find((e) => e.id === n), o = I(a === void 0 ? void 0 : t.get(a.type), r, i === "out");
	return a === void 0 || o === void 0 ? !1 : e.edges.some((e) => Yr(e, n, r, i)) ? !0 : i === "in" && Xr(o) && JSON.stringify(a.values[r] ?? o.defaultValue ?? null) !== JSON.stringify(o.defaultValue ?? null);
}
function Jr(e, t, n, r, i) {
	let a = e.nodes.find((e) => e.id === n), o = I(a === void 0 ? void 0 : t.get(a.type), r, i === "out");
	a !== void 0 && o !== void 0 && (e.edges = e.edges.filter((e) => !Yr(e, n, r, i)), i === "in" && Xr(o) && (a.values[r] = o.defaultValue ?? null));
}
function Yr(e, t, n, r) {
	return r === "in" ? e.toNode === t && e.toPin === n : e.fromNode === t && e.fromPin === n;
}
function Xr(e) {
	return e.editor !== "None" && e.editor !== "Display";
}
function Zr(e, t, n) {
	return e.edges.find((e) => e.toNode === t && e.toPin === n);
}
function Qr(e, t, n) {
	return e.edges.filter((e) => e.toNode === t && e.toPin === n);
}
function $r(e, t, n) {
	if (e.hidden === !0) return !1;
	let r = e.visibleWhen ?? "";
	if (r.length === 0) return !0;
	let i = ei(t.values, n, r), a = e.visibleValues ?? [];
	return a.length > 0 ? a.some((e) => e === ti(i)) : i != null && i !== !1 && ti(i).length > 0;
}
function ei(e, t, n) {
	return e[n] ?? t.inputs.find((e) => e.name === n)?.defaultValue;
}
function ti(e) {
	return e == null ? "" : String(e);
}
function I(e, t, n) {
	return (n ? e?.outputs : e?.inputs)?.find((e) => e.name === t);
}
function L(e, t, n, r, i = /* @__PURE__ */ new Set()) {
	let a = `${n}:${r}`;
	if (i.has(a)) return "any";
	i.add(a);
	let o = e.nodes.find((e) => e.id === n), s = o === void 0 ? void 0 : t.get(o.type), c = I(s, r, !0);
	if (c === void 0) return "any";
	if (c.typeOf === null || c.typeOf === void 0 || c.typeOf.length === 0) return c.type;
	let l = Zr(e, n, c.typeOf);
	return l === void 0 ? I(s, c.typeOf, !1)?.type ?? "any" : L(e, t, l.fromNode, l.fromPin, i);
}
function ni(e, t, n, r) {
	if (r.type === Fr) return !0;
	let i = Zr(e, n, r.name);
	return i !== void 0 && L(e, t, i.fromNode, i.fromPin) === Fr;
}
function ri(e, t) {
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
function ii(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	return {
		nodes: e.nodes.map((e) => {
			let i = E("n");
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
			id: E("e"),
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
var ai = "$picture", oi = "ui.graph.more", si = "✓", ci = "✕";
function li(e, t) {
	if (e == null || e === "") return R(t.empty, "ui-graph__display-empty");
	if (typeof e == "string") return t.picture === !0 && pi(e, t) ? mi(e, null, null) : R(t.moment(e) ?? e, "ui-graph__display-text");
	if (typeof e == "number") return R(t.number(e), "ui-graph__display-number");
	if (typeof e == "bigint") return R(String(e), "ui-graph__display-number");
	if (typeof e == "boolean") return R(e ? si : ci, "ui-graph__display-number");
	if (Array.isArray(e)) return e.length === 0 ? R(t.empty, "ui-graph__display-empty") : hi(e, t);
	let n = di(e);
	if (n !== null) return fi(n, t);
	let r = ui(e);
	return r === null ? typeof e == "object" ? vi(e, t) : R(String(e), "ui-graph__display-text") : R(t.more(r), "ui-graph__display-empty");
}
function ui(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) return null;
	let t = e;
	return t.key === "ui.graph.more" && Object.keys(e).length === 2 && typeof t.args?.count == "number" ? t.args.count : null;
}
function di(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) return null;
	let t = e, n = t[ai];
	return typeof n == "string" ? {
		address: n,
		width: ne(t.width),
		height: ne(t.height)
	} : null;
}
function fi(e, t) {
	return pi(e.address, t) ? mi(e.address, e.width, e.height) : R(e.address, "ui-graph__display-text");
}
function pi(e, t) {
	return /^blob:/i.test(e.trim()) || t.isImageSource(e);
}
function R(e, t) {
	let n = document.createElement("div");
	return n.className = t, n.textContent = e, n;
}
function mi(e, t, n) {
	let r = document.createElement("img");
	return r.className = "ui-graph__display-image", t !== null && (r.classList.add("ui-graph__display-image--sized"), r.style.width = `${t}px`, n !== null && (r.style.height = `${n}px`)), r.src = e, r.alt = "", r.addEventListener("error", () => r.replaceWith(R(e, "ui-graph__display-text")), { once: !0 }), r;
}
function hi(e, t) {
	let { entries: n, more: r } = gi(e), i = _i(n);
	if (i === null) {
		let n = document.createElement("div");
		n.className = "ui-graph__display-list";
		let r = {
			...t,
			picture: !1
		};
		for (let t of e) n.append(li(t, r));
		return n;
	}
	let a = document.createElement("table"), o = document.createElement("tr");
	a.className = "ui-graph__display-table";
	for (let e of i) {
		let t = document.createElement("th");
		t.textContent = e, o.append(t);
	}
	a.append(o);
	for (let e of n) {
		let n = document.createElement("tr"), r = e;
		for (let e of i) {
			let i = document.createElement("td");
			i.textContent = yi(r[e], t), n.append(i);
		}
		a.append(n);
	}
	if (r !== null) {
		let e = document.createElement("tr"), n = document.createElement("td");
		n.colSpan = i.length, n.className = "ui-graph__display-empty", n.textContent = t.more(r), e.append(n), a.append(e);
	}
	return a;
}
function gi(e) {
	let t = e.length === 0 ? null : ui(e.at(-1));
	return t === null ? {
		entries: e,
		more: null
	} : {
		entries: e.slice(0, -1),
		more: t
	};
}
function _i(e) {
	let t = [];
	for (let n of e) {
		if (typeof n != "object" || !n || Array.isArray(n) || di(n) !== null) return null;
		for (let e of Object.keys(n)) t.includes(e) || t.push(e);
	}
	return t.length === 0 ? null : t;
}
function vi(e, t) {
	let n = document.createElement("div");
	n.className = "ui-graph__display-record";
	for (let [r, i] of Object.entries(e)) {
		let e = di(i);
		if (e !== null) {
			n.append(fi(e, t));
			continue;
		}
		let a = document.createElement("div");
		a.className = "ui-graph__display-field", a.append(R(r, "ui-graph__display-key")), a.append(R(yi(i, t), "ui-graph__display-value")), n.append(a);
	}
	return n.childElementCount === 0 ? R(t.empty, "ui-graph__display-empty") : n;
}
function yi(e, t) {
	if (e == null) return "";
	if (typeof e == "number") return t.number(e);
	if (typeof e == "boolean") return e ? si : ci;
	if (typeof e == "string") return t.moment(e) ?? e;
	if (Array.isArray(e)) return t.list(e.map((e) => yi(e, t)));
	let n = di(e);
	if (n !== null) return n.address;
	let r = ui(e);
	return r === null ? typeof e == "object" ? t.list(Object.entries(e).map(([e, n]) => t.field(e, yi(n, t)))) : String(e) : t.more(r);
}
var bi = /* @__PURE__ */ new Map();
function xi(e, t) {
	let n = bi.get(t);
	if (n === void 0) {
		try {
			n = new Intl.ListFormat(t.length === 0 ? void 0 : t, {
				type: "conjunction",
				style: "narrow"
			});
		} catch {
			n = new Intl.ListFormat("en", {
				type: "conjunction",
				style: "narrow"
			});
		}
		bi.set(t, n);
	}
	return n.format(e);
}
//#endregion
//#region src/nodes/node-view.ts
var z = "data-ui-graph-pin", Si = "data-ui-graph-pin-dir", Ci = "data-ui-graph-pin-type", wi = "data-ui-graph-state", Ti = "data-ui-graph-head", Ei = "data-ui-graph-value", Di = "data-ui-graph-display", Oi = "data-ui-graph-uploading", ki = "graph-pin-menu", Ai = "data-ui-graph-pin-menu", ji = "data-ui-graph-pin-menu-dir", Mi = "data-ui-graph-pin-many", Ni = "data-ui-graph-pin-optional", Pi = {
	any: "ui.graph.type-any",
	array: "ui.graph.type-list",
	text: "ui.graph.type-text",
	number: "ui.graph.type-number",
	boolean: "ui.graph.type-boolean",
	image: "ui.graph.type-image",
	date: "ui.graph.type-date",
	time: "ui.graph.type-time",
	datetime: "ui.graph.type-datetime"
}, Fi = "array:", Ii = "enum:", Li = "ui.graph.display-field", Ri = "graph-editor:", zi = "graph-list-remove", Bi = "graph-list-add", Vi = "graph-state-reset", Hi = "data-ui-graph-list-add";
function Ui(e, t, n) {
	let r = document.createElement("div");
	r.className = "ui-graph__node", r.setAttribute(o, e.id), r.style.setProperty("--ui-graph-node-x", String(e.x)), r.style.setProperty("--ui-graph-node-y", String(e.y)), t?.minWidth !== null && t?.minWidth !== void 0 && r.style.setProperty("--ui-graph-node-min-width", `${t.minWidth}rem`), e.collapsed !== !0 && e.width !== null && e.width !== void 0 && e.width > 0 && r.style.setProperty("--ui-graph-node-w", String(e.width)), e.collapsed !== !0 && e.height !== null && e.height !== void 0 && e.height > 0 && r.style.setProperty("--ui-graph-node-h", String(e.height));
	let i = e.color ?? t?.color ?? null;
	if (i !== null && i.length > 0 && r.style.setProperty("--ui-graph-node-color", i), e.pinned === !0 && r.setAttribute("data-ui-graph-pinned", ""), t?.compact === !0) return Wi(r, e, t, n);
	let a = qi(e, t, n);
	if (r.append(a), t?.showProgress === !0 && a.append(Xi()), e.collapsed === !0) return r.setAttribute(l, ""), a.append(Gi(e, t, n)), r;
	let s = document.createElement("div");
	if (s.className = "ui-graph__node-body", t === void 0) {
		let t = document.createElement("div");
		t.className = "ui-graph__node-unknown", t.textContent = e.type, s.append(t);
	} else {
		let r = t.inputs.filter((n) => $r(n, e, t)), i = r.filter((e) => e.editor === "None");
		for (let r = 0; r < Math.max(i.length, t.outputs.length); r++) s.append(Zi(e, i[r], t.outputs[r], n));
		for (let t of r) t.editor !== "None" && s.append(ea(e, t, n));
	}
	return r.append(s), !n.readOnly && t?.resizable !== !1 && r.append(Ki()), r;
}
function Wi(e, t, n, r) {
	let i = n.inputs[0], a = n.outputs[0];
	e.classList.add("ui-graph__node--compact"), (t.color ?? null) === null && a !== void 0 && e.style.setProperty("--ui-graph-node-color", r.pinColor(r.outputType(t.id, a.name)));
	let o = document.createElement("span");
	o.className = "ui-graph__node-reroute", o.textContent = t.title ?? (i === void 0 ? null : r.feedTitle(t.id, i.name)) ?? n.title;
	let s = document.createElement("div");
	return s.className = "ui-graph__node-ports", i !== void 0 && a !== void 0 && s.append(B(V(t, i, r.outputType(t.id, a.name), "in", r), i, "in", r)), a !== void 0 && s.append(B(V(t, a, r.outputType(t.id, a.name), "out", r), a, "out", r)), e.append(o, s), e;
}
function Gi(e, t, n) {
	let r = document.createElement("div");
	if (r.className = "ui-graph__node-ports", t === void 0) return r;
	for (let i of t.inputs) i.hasPin !== !1 && $r(i, e, t) && r.append(B(V(e, i, i.type, "in", n), i, "in", n));
	for (let i of t.outputs) r.append(B(V(e, i, n.outputType(e.id, i.name), "out", n), i, "out", n));
	return r;
}
function Ki() {
	let e = document.createElement("div");
	return e.className = "ui-graph__node-resize", e.setAttribute("data-ui-graph-resize", ""), e;
}
function qi(e, t, n) {
	let r = document.createElement("div");
	r.className = "ui-graph__node-head", r.setAttribute(Ti, "");
	let i = document.createElement("button"), a = e.collapsed === !0;
	i.type = "button", i.className = "ui-graph__node-fold", i.setAttribute(c, ""), Ji(i, a ? "ui.graph.expand" : "ui.graph.collapse", n), i.setAttribute("aria-expanded", String(!a)), i.append(Yi(n, a ? "ne-chevron-right" : "ne-chevron-down")), r.append(i);
	let o = t?.icon ?? null;
	o !== null && o.length > 0 && r.append(Yi(n, o, "ui-graph__node-icon"));
	let l = document.createElement("span");
	l.className = "ui-graph__node-title", l.textContent = e.title ?? t?.title ?? e.type, r.append(l);
	let u = document.createElement("button");
	return u.type = "button", u.className = "ui-graph__node-pinned", u.setAttribute(s, ""), Ji(u, e.pinned === !0 ? "ui.graph.unpin" : "ui.graph.pin", n), u.append(Yi(n, e.pinned === !0 ? "ne-pin" : "ne-pin-outlined")), r.append(u), r;
}
function Ji(e, t, n) {
	n.words.write(e, "aria-label", t), n.words.write(e, n.names.tooltip, t), n.readOnly && n.states.setDisabled(e, !0);
}
function Yi(e, t, n) {
	let r = document.createElement("span");
	return n !== void 0 && (r.className = n), r.setAttribute("aria-hidden", "true"), e.icons.apply(r, t), r;
}
function Xi() {
	let e = document.createElement("div");
	return e.className = "ui-graph__node-progress", e.hidden = !0, e.append(document.createElement("i")), e;
}
function Zi(e, t, n, r) {
	let i = document.createElement("div");
	return i.className = "ui-graph__row", t !== void 0 && (i.append(B(V(e, t, t.type, "in", r), t, "in", r)), i.append(B($i(t, "ui-graph__row-label"), t, "in", r))), n !== void 0 && (i.append(B(Qi(n.title, "ui-graph__row-label ui-graph__row-label--out"), n, "out", r)), i.append(B(V(e, n, r.outputType(e.id, n.name), "out", r), n, "out", r))), i;
}
function B(e, t, n, r) {
	return e.setAttribute(r.names.contextMenuUse, ki), e.setAttribute(Ai, t.name), e.setAttribute(ji, n), e;
}
function Qi(e, t) {
	let n = document.createElement("span");
	return n.className = t, n.textContent = e, n;
}
function $i(e, t) {
	return Qi(e.title, t);
}
function ea(e, t, n) {
	let r = document.createElement("div"), i = t.hasPin !== !1 && n.isConnected(e.id, t.name, "in");
	r.className = ra(t) ? "ui-graph__row ui-graph__row--tall" : "ui-graph__row", B(r, t, "in", n), (t.editor === "Image" && t.large === !0 || t.editor === "Display" || t.editor === "Text" && (t.maxLines ?? 1) > 1) && r.classList.add("ui-graph__row--grow"), t.hasPin !== !1 && r.append(V(e, t, t.type, "in", n));
	let a = i && t.editor !== "List", o = aa(e, t, a, n), s = o.querySelector(`[${Hi}]`);
	if (s !== null) {
		let e = document.createElement("div");
		e.className = "ui-graph__row-head", e.append($i(t, "ui-graph__row-label")), e.append(s), r.append(e);
	} else na(t) || r.append($i(t, "ui-graph__row-label"));
	if (t.height !== null && t.height !== void 0 && t.height > 0 && o.style.setProperty("--ui-graph-editor-height", `${t.height}rem`), a && r.classList.add("ui-graph__row--connected"), r.append(o), t.state === !0) {
		let i = ta(e, t, o, n);
		i !== null && r.append(i);
	}
	return r;
}
function ta(e, t, n, r) {
	let i = r.cloneEditor(Vi);
	return i === null ? null : (ma(i, r.readOnly, r), i.addEventListener("click", () => {
		let i = t.defaultValue ?? null, a = n.firstElementChild;
		a !== null && r.setProperty(a, "Value", i), r.onValueChanged(e.id, t.name, i);
	}), i);
}
function na(e) {
	return !ra(e) && e.editor !== "Boolean";
}
function ra(e) {
	return e.editor === "Image" && e.large === !0 || e.editor === "List" || e.editor === "Display" || e.editor === "Text" && (e.maxLines ?? 1) > 1;
}
function V(e, t, n, r, i) {
	let a = document.createElement("span");
	a.className = "ui-graph__pin", a.setAttribute(z, t.name), a.setAttribute(Si, r), a.setAttribute(Ci, n), a.style.setProperty("--ui-graph-pin-color", i.pinColor(n)), t.multiple === !0 && a.setAttribute(Mi, ""), i.isConnected(e.id, t.name, r) && a.classList.add("ui-graph__pin--filled"), (r === "out" || t.required !== !0) && a.setAttribute(Ni, "");
	let o = i.words, s = t.description ?? "", c = o.format("ui.graph.pin-type", {
		name: t.title,
		type: ia(n, t.multiple === !0, i)
	});
	return S(a, s.length > 0 ? `${c}\n${s}` : c, i.tooltips), a;
}
function ia(e, t, n) {
	let r = n.words, i = (e) => {
		if (e.startsWith(Fi)) return r.format("ui.graph.type-list-of", { type: i(e.slice(6)) });
		let t = Pi[e];
		if (t !== void 0) return r.text(t);
		let a = n.typeTitles.get(e);
		return a === void 0 ? e.startsWith(Ii) ? e.slice(5) : e : a;
	};
	return t ? r.format("ui.graph.pin-many", { type: i(e) }) : i(e);
}
function aa(e, t, n, r) {
	let i = r.isConnected(e.id, t.name, "in"), a = e.values[t.name] ?? (i ? null : t.defaultValue);
	switch (t.editor) {
		case "Image": return pa(e, t, a, n || r.readOnly, r);
		case "List": return ha(e, t, a, r);
		case "Display": return da(t, r);
		default: return oa(e, t, a, n || r.readOnly, r);
	}
}
function oa(e, t, n, r, i) {
	let a = sa(t, t.editor === "Boolean" ? "ui-graph__editor--check" : null), o = i.cloneEditor(`${Ri}${e.type}:${t.name}`);
	return o === null ? a : (a.append(o), ca(o, n ?? null, r, i, () => i.onValueChanged(e.id, t.name, la(t, i.readValue(o)))), a);
}
function sa(e, t) {
	let n = document.createElement("div");
	return n.className = t === null ? "ui-graph__editor" : `ui-graph__editor ${t}`, n.setAttribute(Ei, e.name), n;
}
function ca(e, t, n, r, i) {
	r.setProperty(e, "Value", t), n ? r.setProperty(e, "IsReadOnly", !0) : e.addEventListener("change", i);
}
function la(e, t) {
	return e.editor === "Text" && t === "" ? "" : ua(e.editor === "Number", t);
}
function ua(e, t) {
	if (t === void 0 || t === "") return null;
	if (e && typeof t == "string") {
		let e = Number(t);
		return Number.isFinite(e) ? e : null;
	}
	return t;
}
function da(e, t) {
	let n = document.createElement("div");
	return n.className = "ui-graph__editor ui-graph__editor--display", n.setAttribute(Ei, e.name), n.setAttribute(Di, ""), n.append(li(null, fa(e, t))), n;
}
function fa(e, t) {
	return {
		empty: t.words.text("ui.graph.no-value"),
		more: (e) => t.words.format(oi, { count: e }),
		list: (e) => xi(e, document.documentElement.lang),
		field: (e, n) => t.words.format(Li, {
			key: e,
			value: n
		}),
		number: (n) => t.number(n, e?.format),
		isImageSource: (e) => t.urls.isImageSource(e),
		moment: (e) => {
			let n = t.temporal.parse(e);
			return n === null ? null : t.date(t.temporal.toDate(n), e.length <= 10 ? "yyyy-MM-dd" : null);
		}
	};
}
function pa(e, t, n, r, i) {
	let a = t.large === !0, o = sa(t, a ? "ui-graph__editor--picture" : null), s = ti(n), c = i.cloneEditor(`${Ri}${e.type}:${t.name}`);
	if (c === null) return o;
	if (o.append(c), a) return ca(c, s.length === 0 ? null : s, r, i, () => {
		let n = c.querySelector(`input.${h.pictureSelectionClass}`);
		if (n === null || n.value.length === 0) return;
		let r = c.querySelector(`.${h.pictureTextClass}`)?.textContent ?? "";
		i.onImageUploaded(e.id, t.name, n.value, r);
	}), o;
	ca(c, s.length === 0 ? null : s, r, i, () => {
		let n = ti(i.readValue(c));
		i.onValueChanged(e.id, t.name, n.length === 0 ? null : n);
	});
	let l = c.querySelector(`.${h.textInputActionClass} > *`);
	return l !== null && (ma(l, r, i), l.addEventListener("click", (n) => {
		n.preventDefault(), i.onPickImage(e.id, t.name);
	})), o;
}
function ma(e, t, n) {
	t && n.setProperty(e, "Enabled", !1);
}
function ha(e, t, n, r) {
	let i = sa(t, "ui-graph__editor--list"), a = Array.isArray(n) ? [...n] : [], o = t.type === "array:number" || t.type === "number", s = document.createElement("div");
	s.className = "ui-graph__list-rows", i.append(s);
	let c = () => r.onValueChanged(e.id, t.name, [...a]), l = () => {
		s.replaceChildren(), s.hidden = a.length === 0, a.forEach((n, i) => {
			let u = document.createElement("div"), d = r.cloneEditor(`${Ri}${e.type}:${t.name}`), f = r.cloneEditor(zi);
			u.className = "ui-graph__list-row", d !== null && (ca(d, n ?? null, r.readOnly, r, () => {
				a[i] = ua(o, r.readValue(d)), c();
			}), u.append(d)), f !== null && (ma(f, r.readOnly, r), f.addEventListener("click", () => {
				a.splice(i, 1), l(), c();
			}), u.append(f)), s.append(u);
		});
	};
	l();
	let u = r.cloneEditor(Bi);
	return u !== null && (u.setAttribute(Hi, ""), ma(u, r.readOnly, r), u.addEventListener("click", () => {
		a.push(null), l(), c();
	}), i.append(u)), i;
}
//#endregion
//#region src/nodes/nodes-log.ts
var ga = "data-ui-graph-log-node", _a = "data-ui-graph-log-open", va = "data-ui-graph-run-state", ya = 500, ba = "ui.graph.run-line", xa = class {
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
		i.state === "idle" && n === null && this.said(r).length === 0 ? this.statuses.delete(e) : this.statuses.set(e, i), i.state === "running" ? this.runningNode = e : this.runningNode === e && (this.runningNode = null), i.state === "error" && (this.runFailed = !0), this.applyStatus(e, i), this.drawRun();
	}
	applyStatus(e, t) {
		let n = this.services.nodeElements.get(e);
		if (n === void 0) return;
		let r = n.querySelector(".ui-graph__node-progress");
		n.setAttribute(wi, t.state), r !== null && (r.hidden = t.state !== "running" || t.progress === null, t.progress !== null && r.style.setProperty("--ui-graph-progress", String(Math.min(1, Math.max(0, t.progress)))));
	}
	setDisplay(e, t, n) {
		let r = this.displays.get(e);
		r === void 0 && (r = /* @__PURE__ */ new Map(), this.displays.set(e, r)), r.set(t, n), this.applyDisplay(e, t, n);
	}
	applyDisplay(e, t, n) {
		let r = this.services.nodeElements.get(e)?.querySelector(`[${Di}][${Ei}="${CSS.escape(t)}"]`), i = this.services.documentState.document, a = i.nodes.find((t) => t.id === e), o = I(a === void 0 ? void 0 : this.types.get(a.type), t, !1), s = fa(o, {
			words: this.context.strings,
			number: (e, t) => this.formatNumber(e, t),
			date: (e, t) => this.formatDate(e, t),
			temporal: this.context.temporal,
			urls: this.context.urls
		});
		r?.replaceChildren(li(n, {
			...s,
			picture: o !== void 0 && ni(i, this.types, e, o)
		}));
	}
	formatNumber(e, t) {
		return this.context.numbers.format(e, t ?? null, this.context.numbers.readCulture(this.root));
	}
	formatDate(e, t) {
		return this.context.temporal.format(e, t, this.context.temporal.readCulture(this.root));
	}
	addLog(e, t, n) {
		let r = {
			nodeId: e,
			level: t.toLowerCase(),
			message: n,
			at: /* @__PURE__ */ new Date()
		};
		if (this.log.push(r), this.log.length > ya) {
			let e = this.logEntries?.firstElementChild ?? null;
			this.log.shift(), this.removeLines(e === null ? [] : [e], e?.nextElementSibling ?? null);
		}
		if (this.logEntries !== null) {
			let e = this.logEntries.scrollHeight - this.logEntries.scrollTop - this.logEntries.clientHeight < 8;
			this.logEntries.append(this.renderLogEntry(r)), e && (this.logEntries.scrollTop = this.logEntries.scrollHeight);
		}
		this.drawLogCount(), r.level === "error" && (this.runFailed = !0, this.drawRun());
	}
	renderLogEntry(e) {
		let t = document.createElement("li"), n = document.createElement("time"), r = document.createElement("button"), i = document.createElement("span");
		t.className = "ui-graph__log-entry", t.setAttribute("data-ui-graph-log-level", e.level), n.className = "ui-graph__log-time", n.dateTime = e.at.toISOString(), n.textContent = this.context.temporal.format(e.at, "HH:mm:ss", this.context.temporal.readCulture(this.root)), r.type = "button", r.className = "ui-graph__log-node", r.setAttribute(ga, e.nodeId), r.textContent = this.nodeName(e.nodeId), i.className = "ui-graph__log-message";
		let a = e.message;
		return typeof a?.key == "string" ? this.context.strings.write(i, null, a.key, a.args ?? null) : i.textContent = this.said(e.message), t.append(n, r, i), t;
	}
	said(e) {
		if (typeof e == "string") return e;
		let t = e;
		return typeof t?.key == "string" ? this.context.strings.format(t.key, t.args ?? {}) : typeof t?.text == "string" ? t.text : "";
	}
	nodeName(e) {
		let t = this.services.documentState.document.nodes.find((t) => t.id === e);
		return t?.title ?? (t === void 0 ? void 0 : this.types.get(t.type)?.title) ?? e;
	}
	drawLogCount() {
		if (this.logCount === null) return;
		let e = this.log.filter((e) => e.level === "error").length, t = this.log.filter((e) => e.level === "warning").length;
		this.logCount.hidden = this.log.length === 0, this.context.badges.writeCount(this.logCount, this.log.length), this.logCount.classList.toggle(h.badgeDangerClass, e > 0), this.logCount.classList.toggle(h.badgeWarningClass, e === 0 && t > 0), this.logCount.classList.toggle(h.badgeSurfaceClass, e === 0 && t === 0);
	}
	wordsChanged() {
		this.drawRun();
	}
	clearLog() {
		this.log.length = 0, this.removeLines([...this.logEntries?.children ?? []], null), this.drawLogCount();
	}
	removeLines(e, t) {
		let n = e.some((e) => e.contains(document.activeElement));
		for (let t of e) t.remove();
		n && (t?.querySelector("[data-ui-graph-log-node]") ?? this.logToggle)?.focus({ preventScroll: !0 });
	}
	setLogOpen(e, t = !1) {
		this.root.toggleAttribute(_a, e), this.logToggle?.setAttribute("aria-expanded", String(e)), t && this.context.store.write(this.root, "log", e ? "open" : null);
	}
	isLogOpen() {
		return this.root.hasAttribute(_a);
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
		this.runLine.style.setProperty("--ui-graph-run", String(n)), this.runLine.style.setProperty("--ui-graph-run-step", String(t)), this.runLine.setAttribute("aria-valuenow", String(r)), this.runLine.setAttribute(va, this.runStarted ? this.runFailed ? "failed" : this.runStopped ? "stopped" : i ? "done" : "running" : "idle"), this.runLabel !== null && (this.runLabel.textContent = this.runLabelText(e)), this.runShare !== null && (this.runShare.textContent = this.runStarted ? x(this.context, this.runShare, r) : "");
	}
	runLabelText(e) {
		if (this.runningNode !== null) {
			let t = this.said(e?.message);
			return t.length > 0 ? this.joined(this.runningNode, t) : this.nodeName(this.runningNode);
		}
		let t = this.runStopped && !this.runFailed ? [...this.log].reverse().find((e) => e.level === "warning") : this.log.find((e) => e.level === "error");
		return t === void 0 ? "" : this.joined(t.nodeId, this.said(t.message));
	}
	joined(e, t) {
		return this.context.strings.format(ba, {
			node: this.nodeName(e),
			message: t
		});
	}
}, Sa = `[${h.collapseToggle}]`, Ca = h.collapsed, wa = "folded", Ta = "open", Ea = "--ui-graph-side-folded", Da = class {
	store;
	root;
	panel;
	slot;
	foldedByDefault;
	constructor(e, t, n, r) {
		this.store = e, this.root = t, this.panel = n, this.slot = r, this.foldedByDefault = n !== null && (n.hasAttribute(Ca) || Oa(n));
		let i = e.read(t, r), a = i === wa || i !== Ta && this.foldedByDefault;
		n !== null && a !== n.hasAttribute(Ca) && (n.toggleAttribute(Ca, a), n.querySelector(Sa)?.setAttribute("aria-expanded", a ? "false" : "true"));
	}
	press(e) {
		if (this.panel === null || !this.panel.contains(e) || e.closest(Sa) === null) return !1;
		let t = this.panel.hasAttribute(Ca);
		return this.store.write(this.root, this.slot, t === this.foldedByDefault ? null : t ? wa : Ta), !0;
	}
};
function Oa(e) {
	return getComputedStyle(e).getPropertyValue(Ea).trim() === "1";
}
//#endregion
//#region src/nodes/nodes-parameters.ts
var ka = "[data-ui-graph-parameters-panel]", Aa = "[data-ui-graph-parameters-list]", ja = "data-ui-graph-parameters", H = "data-ui-graph-parameter-node", Ma = "data-ui-graph-parameter-pin", U = "data-ui-graph-parameter-remove", Na = "graph-editor:", Pa = "graph-list-remove", Fa = "parameters", Ia = "ui.graph.show-node", La = "ui-graph__parameter", Ra = "ui-graph__parameter-name", za = "ui-graph__parameter-node", Ba = "ui-graph__parameter-pin", Va = "ui-graph__parameter-field", Ha = "input, select, textarea, button, [tabindex]", Ua = class {
	services;
	host;
	panel;
	list;
	fold;
	drawnKey = "";
	fields = /* @__PURE__ */ new Map();
	rows = /* @__PURE__ */ new Map();
	constructor(e, t) {
		this.services = e, this.host = t, this.panel = e.root.querySelector(ka), this.list = this.panel?.querySelector(Aa) ?? null, this.fold = new Da(e.context.store, e.root, this.panel, Fa);
	}
	get shown() {
		return this.services.root.hasAttribute(ja);
	}
	get document() {
		return this.services.documentState.document;
	}
	has(e, t) {
		return this.document.parameters.some((n) => n.node === e && n.pin === t);
	}
	allows(e, t) {
		return this.shown && Gr(this.document, this.host.types, e, t);
	}
	toggle(e, t) {
		if (!this.services.settings.readOnly) {
			if (!Kr(this.document, e, t)) {
				if (!this.allows(e, t)) return;
				this.document.parameters = [...this.document.parameters, {
					node: e,
					pin: t
				}];
			}
			this.services.documentState.edited(!1), this.draw();
		}
	}
	forget(e) {
		let t = this.document;
		t.parameters = t.parameters.filter((t) => !e.has(t.node));
	}
	contains(e) {
		return this.panel !== null && this.panel.contains(e);
	}
	press(e) {
		if (this.panel === null || !this.panel.contains(e)) return !1;
		if (this.fold.press(e)) return !0;
		let t = e.closest(`[${U}]`);
		if (t !== null) return this.remove(t), !0;
		let n = e.closest(`[${H}]`)?.getAttribute(H);
		return n != null && this.host.show(n), !0;
	}
	remove(e) {
		let t = e.closest(`.${La}`), n = t === null || this.list === null ? -1 : [...this.list.children].indexOf(t), r = e.contains(document.activeElement);
		this.toggle(e.getAttribute(H) ?? "", e.getAttribute(Ma) ?? ""), r && this.list !== null && !this.list.contains(document.activeElement) && Wa(this.list.children[n]?.querySelector(`[${U}]`) ?? this.panel?.querySelector(`[${h.collapseToggle}]`) ?? null)?.focus({ preventScroll: !0 });
	}
	draw() {
		if (this.list === null) return;
		let e = this.find(), t = this.services.settings.readOnly, n = JSON.stringify([t, e.map((e) => [
			e.parameter.node,
			e.parameter.pin,
			e.node.title ?? null
		])]);
		if (n === this.drawnKey) {
			for (let t of e) this.showValue(t.node.id, t.pin.name, t.node.values[t.pin.name]);
			return;
		}
		let r = this.focusedPart();
		this.drawnKey = n, this.fields.clear(), this.rows.clear(), this.list.replaceChildren(...e.map((e) => this.row(e, t))), this.restoreFocus(r);
	}
	focusedPart() {
		let e = document.activeElement;
		if (e === null || this.list === null || !this.list.contains(e)) return null;
		for (let [t, n] of this.rows) if (n.contains(e)) return {
			row: t,
			part: e.closest(`.${Ra}`) === null ? e.closest(`[${U}]`) === null ? Va : U : Ra
		};
		return null;
	}
	restoreFocus(e) {
		let t = e === null ? void 0 : this.rows.get(e.row);
		e !== null && t !== void 0 && Wa(t.querySelector(e.part === U ? `[${U}]` : `.${e.part}`))?.focus({ preventScroll: !0 });
	}
	showValue(e, t, n) {
		let r = this.fields.get(`${e}\n${t}`);
		r === void 0 || r.field.contains(document.activeElement) || this.services.context.properties.set(r.field, "Value", this.shownValue(r.found, n));
	}
	find() {
		let e = [];
		for (let t of this.document.parameters) {
			let n = this.document.nodes.find((e) => e.id === t.node), r = n === void 0 ? void 0 : this.host.types.get(n.type), i = I(r, t.pin, !1);
			n !== void 0 && r !== void 0 && i !== void 0 && Gr(this.document, this.host.types, n.id, i.name) && e.push({
				parameter: t,
				node: n,
				type: r,
				pin: i
			});
		}
		return e;
	}
	nameOf(e) {
		return e.node.title ?? e.type.title;
	}
	shownValue(e, t) {
		return t ?? e.pin.defaultValue ?? null;
	}
	row(e, t) {
		let n = this.services.context, r = document.createElement("div"), i = document.createElement("button"), a = document.createElement("span"), o = document.createElement("span"), s = this.host.cloneEditor(`${Na}${e.node.type}:${e.pin.name}`), c = this.host.cloneEditor(Pa);
		if (r.className = La, i.className = Ra, i.type = "button", n.strings.write(i, n.names.tooltip, Ia), i.setAttribute(H, e.node.id), a.className = za, a.textContent = this.nameOf(e), i.append(a), na(e.pin) || (o.className = Ba, o.textContent = e.pin.title, i.append(o)), r.append(i), this.rows.set(`${e.node.id}\n${e.pin.name}`, r), s !== null) {
			let i = n.properties;
			s.classList.add(Va), i.set(s, "Value", this.shownValue(e, e.node.values[e.pin.name])), t ? i.set(s, "IsReadOnly", !0) : s.addEventListener("change", () => this.host.setValue(e.node.id, e.pin.name, this.host.readValue(e.pin, s))), this.fields.set(`${e.node.id}\n${e.pin.name}`, {
				field: s,
				found: e
			}), r.append(s);
		}
		return c !== null && (c.setAttribute(U, ""), c.setAttribute(H, e.node.id), c.setAttribute(Ma, e.pin.name), n.properties.set(c, "Enabled", !t), r.append(c)), r;
	}
};
function Wa(e) {
	return e === null || e.matches(Ha) ? e : e.querySelector(Ha);
}
//#endregion
//#region src/canvas/picker.ts
var Ga = "[data-ui-graph-picker]", Ka = "[data-ui-graph-picker-search] input", qa = "[data-ui-graph-picker-rail]", Ja = "[data-ui-graph-picker-list]", Ya = "[data-ui-graph-picker-empty]", Xa = "data-ui-graph-kind", W = "data-ui-graph-category", Za = "data-ui-graph-category-fold", G = "/", Qa = "--ui-graph-picker-depth", $a = ".ui-graph__viewport", eo = "input, button, [tabindex]", K = "ui-graph__picker-entry", to = "ui-graph__picker-entry--current", q = "/", no = class e {
	panel;
	search;
	rail;
	list;
	empty;
	home;
	entries;
	words;
	icons;
	ids;
	roving;
	choose;
	category = q;
	railStop = q;
	drawnTerms = "";
	unfolded = /* @__PURE__ */ new Set();
	pointerX = NaN;
	pointerY = NaN;
	constructor(e, t, n, r, i, a, o, s, c, l, u, d) {
		this.panel = e, this.search = t, this.rail = n, this.list = r, this.empty = i, this.home = a, this.entries = o, this.words = s, this.icons = c, this.ids = l, this.roving = u, this.choose = d, this.search.addEventListener("input", () => this.draw()), this.search.addEventListener("change", () => {
			this.search.value !== this.drawnTerms && this.draw();
		}), this.search.addEventListener("keydown", (e) => this.key(e)), this.panel.addEventListener("keydown", (e) => this.escape(e)), this.panel.addEventListener("keydown", (e) => this.tab(e)), this.panel.addEventListener("mousedown", (e) => this.press(e)), this.rail.addEventListener("click", (e) => this.rails(e)), this.rail.addEventListener("keydown", (e) => this.railKey(e)), this.list.addEventListener("click", (e) => this.click(e)), this.list.addEventListener("pointermove", (e) => this.point(e)), this.panel.addEventListener("click", (e) => {
			e.target === this.panel && this.close();
		}), this.panel.addEventListener("close", () => {
			this.search.setAttribute("aria-expanded", "false"), this.returnKeyboard();
		});
	}
	static create(t, n, r, i, a, o, s) {
		let c = t.querySelector(Ga), l = c?.querySelector(Ka) ?? null, u = c?.querySelector(qa) ?? null, d = c?.querySelector(Ja) ?? null, f = c?.querySelector(Ya) ?? null;
		return c === null || l === null || u === null || d === null || f === null ? null : (l.setAttribute("role", "combobox"), l.setAttribute("aria-controls", i.ensureId(d, "ui-graph-picker-list")), l.setAttribute("aria-autocomplete", "list"), l.setAttribute("aria-expanded", "false"), d.tabIndex = -1, new e(c, l, u, d, f, t.querySelector($a), n, r, a, i, o, s));
	}
	get isOpen() {
		return this.panel.open;
	}
	open() {
		this.search.value = "", this.category = q, this.railStop = q, this.drawRail(), this.draw(), this.panel.open || this.panel.showModal(), this.search.setAttribute("aria-expanded", "true"), this.search.focus({ preventScroll: !0 });
	}
	close() {
		this.search.setAttribute("aria-expanded", "false"), this.panel.open && this.panel.close();
	}
	contains(e) {
		return e instanceof Node && this.panel.contains(e);
	}
	escape(e) {
		e.key !== "Escape" || e.defaultPrevented || e.isComposing || !this.isOpen || (e.preventDefault(), this.close());
	}
	returnKeyboard() {
		let e = document.activeElement;
		this.home !== null && (e === null || e === document.body || this.panel.contains(e)) && this.home.focus({ preventScroll: !0 });
	}
	tab(e) {
		if (e.key !== "Tab" || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
		let t = [...this.panel.querySelectorAll(eo)].filter((e) => e.tabIndex >= 0 && !e.matches(":disabled") && e.getClientRects().length > 0), n = e.shiftKey ? t[0] : t.at(-1);
		n !== void 0 && document.activeElement === n && (e.preventDefault(), (e.shiftKey ? t.at(-1) : t[0])?.focus({ preventScroll: !0 }));
	}
	press(e) {
		let t = e.target instanceof Element ? e.target : null;
		if (t === null || t === this.panel) return;
		let n = t.closest(eo);
		(n === null || n === this.panel || !this.panel.contains(n) || this.list.contains(n)) && (e.preventDefault(), document.activeElement !== this.search && this.search.focus({ preventScroll: !0 }));
	}
	drawRail() {
		let e = [], t = /* @__PURE__ */ new Map();
		for (let n of this.entries()) {
			let r = ro(n), i = r.length === 0 ? [""] : r.split(G), a = e;
			for (let e = 0; e < i.length; e++) {
				let n = i.slice(0, e + 1).join(G), r = t.get(n);
				r === void 0 && (r = {
					path: n,
					name: i[e],
					children: []
				}, t.set(n, r), a.push(r)), a = r.children;
			}
		}
		let n = [{
			category: q,
			caption: this.words.text("ui.graph.all-kinds"),
			depth: 0,
			folds: !1
		}];
		this.listRail(e, 0, n);
		let r = /* @__PURE__ */ new Map();
		for (let e of this.rail.querySelectorAll(`[${W}]`)) r.set(e.getAttribute(W) ?? "", e);
		let i = new Set(n.map((e) => e.category));
		for (let [e, t] of r) i.has(e) || t.remove();
		let a = this.rail.firstElementChild;
		for (let e of n) {
			let t = r.get(e.category);
			t !== void 0 && t.hasAttribute("aria-expanded") !== e.folds && (t === a && (a = t.nextElementSibling), t.remove(), t = void 0), t ??= this.railEntry(e), this.showRailEntry(t, e), t === a ? a = t.nextElementSibling : this.rail.insertBefore(t, a);
		}
		let o = this.railEntries();
		this.roving.applyTabIndex(o, o.find((e) => e.getAttribute(W) === this.railStop) ?? o.find((e) => e.getAttribute(W) === this.category) ?? o[0] ?? null);
	}
	railEntries() {
		return [...this.rail.querySelectorAll(`[${W}]`)];
	}
	listRail(e, t, n) {
		for (let r of e) {
			let e = r.children.length > 0;
			n.push({
				category: r.path,
				caption: r.path.length === 0 ? this.words.text("ui.graph.uncategorized") : r.name,
				depth: t,
				folds: e
			}), e && this.unfolded.has(r.path) && this.listRail(r.children, t + 1, n);
		}
	}
	railEntry(e) {
		let t = document.createElement("button"), n = document.createElement("span"), r = document.createElement("span");
		return t.type = "button", t.className = "ui-graph__picker-category", t.setAttribute("role", "treeitem"), t.setAttribute(W, e.category), n.className = "ui-graph__picker-fold", n.setAttribute("aria-hidden", "true"), e.folds && (n.setAttribute(Za, ""), this.icons.apply(n, "ne-chevron-right")), t.append(n, r), t;
	}
	showRailEntry(e, t) {
		let n = e.lastElementChild;
		e.setAttribute("aria-selected", String(t.category === this.category)), e.setAttribute("aria-level", String(t.depth + 1)), e.style.setProperty(Qa, String(t.depth)), t.folds && e.setAttribute("aria-expanded", String(this.unfolded.has(t.category))), n !== null && n.textContent !== t.caption && (n.textContent = t.caption);
	}
	rails(e) {
		let t = e.target instanceof Element ? e.target : null, n = t === null ? null : t.closest(`[${W}]`);
		if (t === null || n === null) return;
		let r = n.getAttribute(W) ?? q;
		t.closest(`[${Za}]`) === null ? (n.hasAttribute("aria-expanded") && this.toggle(r, r !== this.category || void 0), this.category = r, this.railStop = r, this.drawRail(), this.draw()) : (this.toggle(r), this.drawRail()), e.detail > 0 && this.search.focus({ preventScroll: !0 });
	}
	railKey(e) {
		let t = e.target instanceof Element ? e.target.closest(`[${W}]`) : null;
		if (t === null || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
		let n = t.getAttribute(W) ?? q, r = this.railEntries(), i = r.indexOf(t), a = (e) => Number(e?.getAttribute("aria-level") ?? 0), o = null;
		if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
			let s = t.getAttribute("aria-expanded");
			if (e.key === "ArrowRight" && s === "false" || e.key === "ArrowLeft" && s === "true") {
				e.preventDefault(), this.toggle(n), this.drawRail();
				return;
			}
			o = e.key === "ArrowRight" ? s === "true" ? r[i + 1] : null : r.slice(0, i).reverse().find((e) => a(e) < a(t));
		} else o = this.roving.target({
			key: e.key,
			items: r,
			current: t,
			axis: "vertical",
			loop: !1
		});
		o != null && (e.preventDefault(), this.railStop = o.getAttribute(W) ?? q, this.roving.applyTabIndex(r, o), o.focus({ preventScroll: !0 }));
	}
	toggle(e, t) {
		t ?? !this.unfolded.has(e) ? this.unfolded.add(e) : this.unfolded.delete(e);
	}
	draw() {
		this.drawnTerms = this.search.value;
		let e = this.search.value.trim().toLowerCase(), t = this.entries().filter((t) => this.chosen(t) && (e.length === 0 || io(t, e)));
		this.list.replaceChildren(), this.empty.hidden = t.length > 0;
		for (let e of t) {
			let t = document.createElement("button");
			t.type = "button", t.className = K, t.tabIndex = -1, t.id = this.ids.ensureId(t, `${this.list.id}-entry`), t.setAttribute("role", "option"), t.setAttribute(Xa, e.key);
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
		this.setCurrent(this.list.querySelector(`.${K}`));
	}
	setCurrent(e) {
		for (let t of this.list.querySelectorAll(`.${K}`)) {
			let n = t === e;
			t.classList.toggle(to, n), t.setAttribute("aria-selected", String(n));
		}
		e === null ? this.search.removeAttribute("aria-activedescendant") : this.search.setAttribute("aria-activedescendant", e.id);
	}
	chosen(e) {
		if (this.category === q) return !0;
		let t = ro(e);
		return t === this.category || t.startsWith(this.category + G);
	}
	key(e) {
		if (e.isComposing) return;
		if (e.key === "Enter") {
			e.preventDefault(), this.take(this.list.querySelector(`.${to}`));
			return;
		}
		if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
		let t = [...this.list.querySelectorAll(`.${K}`)], n = this.roving.target({
			key: e.key,
			items: t,
			current: t.find((e) => e.classList.contains(to)) ?? null,
			axis: "vertical"
		});
		n !== null && (e.preventDefault(), this.setCurrent(n), n.scrollIntoView({ block: "nearest" }));
	}
	click(e) {
		this.take(e.target instanceof Element ? e.target.closest(`.${K}`) : null);
	}
	point(e) {
		if (e.clientX === this.pointerX && e.clientY === this.pointerY) return;
		this.pointerX = e.clientX, this.pointerY = e.clientY;
		let t = e.target instanceof Element ? e.target.closest(`.${K}`) : null;
		t !== null && !t.classList.contains(to) && this.setCurrent(t);
	}
	take(e) {
		let t = e?.getAttribute(Xa), n = t == null ? void 0 : this.entries().find((e) => e.key === t);
		n !== void 0 && (this.close(), this.choose(n));
	}
};
function ro(e) {
	return (e.category ?? "").split(G).map((e) => e.trim()).filter((e) => e.length > 0).join(G);
}
function io(e, t) {
	return e.title.toLowerCase().includes(t) || (e.description ?? "").toLowerCase().includes(t) || (e.category ?? "").toLowerCase().includes(t) || e.key.toLowerCase().includes(t);
}
//#endregion
//#region src/nodes/nodes-picker-binding.ts
var ao = class {
	services;
	picker;
	loose = null;
	constructor(e, t) {
		let n = e.context;
		this.services = e;
		let r = t.filter((e) => e.hidden !== !0);
		this.picker = no.create(e.root, () => r, n.strings, n.dom, n.icons, n.roving, (e) => this.addNode(e));
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
		let r = n?.at ?? this.services.pointerScene(), i = Ur(e, O(r.x, t.gridSize, t.snapping), O(r.y, t.gridSize, t.snapping)), a = this.services.documentState.document;
		a.nodes.push(i), n !== null && a.nodes.some((e) => e.id === n.fromNode) && this.wire(a, n, i, e), this.services.selection.selectOnly(i.id), this.services.documentState.edited();
	}
	wire(e, t, n, r) {
		let i = r.inputs.find((e) => e.hasPin !== !1 && $r(e, n, r) && Hr(t.fromType, e.type));
		i !== void 0 && e.edges.push({
			id: E("e"),
			fromNode: t.fromNode,
			fromPin: t.fromPin,
			toNode: n.id,
			toPin: i.name,
			points: []
		});
	}
}, oo = "graph.run", so = "graph.run-all", co = "run-stop", lo = "ui-graph--running", uo = class {
	services;
	once;
	all;
	stop;
	asked = !1;
	running = !1;
	constructor(e) {
		this.services = e, this.once = e.root.querySelector("[data-ui-graph-run-once]"), this.all = e.root.querySelector("[data-ui-graph-run-all]"), this.stop = e.root.querySelector("[data-ui-graph-run-stop]"), this.once?.addEventListener("click", () => this.start(oo)), this.all?.addEventListener("click", () => this.start(so)), this.stop?.addEventListener("click", () => e.root.dispatchEvent(new CustomEvent(co, { bubbles: !0 }))), this.draw();
	}
	setRunning(e) {
		this.running = e, this.asked = !1, this.draw();
	}
	saveCompleted(e) {
		!this.asked || e !== oo && e !== so || (this.asked = !1, this.draw());
	}
	start(e) {
		this.asked || this.running || (this.asked = !0, this.draw(), this.services.documentState.requestSave(e));
	}
	draw() {
		let e = this.asked || this.running, t = this.services.context.states;
		this.once !== null && t.setDisabled(this.once, e), this.all !== null && t.setDisabled(this.all, e), this.stop !== null && t.setDisabled(this.stop, !this.running), this.services.root.classList.toggle(lo, e);
	}
}, fo = "image-upload", po = class {
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
		this.markUpload(e, t, 0);
		try {
			let r = await this.context.uploads.uploadAsync([n], (n) => this.markUpload(e, t, n));
			this.announce(e, t, r.selectionId, n.name);
		} catch {
			this.editorOf(e, t)?.setAttribute(Oi, this.context.strings.text("ui.graph.upload-failed"));
		}
	}
	announce(e, t, n, r) {
		this.root.dispatchEvent(new CustomEvent(fo, {
			bubbles: !0,
			detail: { keys: [
				e,
				t,
				n,
				r
			] }
		}));
	}
	markUpload(e, t, n) {
		let r = this.editorOf(e, t);
		r?.setAttribute(Oi, x(this.context, r, n));
	}
	editorOf(e, t) {
		return this.nodeElements.get(e)?.querySelector(`[data-ui-graph-value="${CSS.escape(t)}"]`) ?? null;
	}
}, mo = ".ui-graph__row", ho = "ui-graph__pin--aimed", go = class {
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
		let n = e.getAttribute(z);
		if (e.getAttribute("data-ui-graph-pin-dir") === "out") return {
			fromNode: t,
			fromPin: n,
			fromType: e.getAttribute("data-ui-graph-pin-type") ?? "any",
			detached: null
		};
		let r = Qr(this.document, t, n).at(-1);
		if (r === void 0) return null;
		this.document.edges = this.document.edges.filter((e) => e.id !== r.id);
		let i = {
			fromNode: r.fromNode,
			fromPin: r.fromPin,
			fromType: L(this.document, this.types, r.fromNode, r.fromPin),
			detached: r
		};
		return this.services.draw(), i;
	}
	offerDropTargets(e, t) {
		an(this.services.root);
		for (let n of this.services.nodeLayer.querySelectorAll(`[${z}]`)) {
			let r = n.getAttribute("data-ui-graph-pin-dir") === "in" && n.closest("[data-ui-graph-node]")?.getAttribute("data-ui-graph-node") !== e && Hr(t, n.getAttribute("data-ui-graph-pin-type") ?? "any");
			n.setAttribute(f, r ? "yes" : "no");
		}
		for (let e of this.services.nodeLayer.querySelectorAll(mo)) {
			let t = e.querySelector(`[${z}][${Si}="in"]`);
			e.setAttribute(f, t?.getAttribute("data-ui-graph-drop") === "yes" ? "yes" : "no");
		}
	}
	aimAt(e) {
		let t = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-ui-graph-pin][data-ui-graph-drop=\"yes\"]") ?? null;
		sn(this.services.nodeLayer, t, (e, t) => e.classList.toggle(ho, t));
	}
	clearDropTargets() {
		on(this.services.root, this.services.nodeLayer, (e) => e.classList.remove(ho));
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
		if (i === t.fromNode || !Hr(t.fromType, o)) {
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
			id: E("e"),
			fromNode: t.fromNode,
			fromPin: t.fromPin,
			toNode: i,
			toPin: a,
			points: []
		}), Kr(this.document, i, a), this.services.documentState.edited();
	}
	inputPin(e, t) {
		let n = this.document.nodes.find((t) => t.id === e);
		return I(n === void 0 ? void 0 : this.types.get(n.type), t, !1);
	}
}, _o = ".ui-graph__editor", vo = "[data-ui-graph-log], [data-ui-graph-run], .ui-graph__run-panel, [data-ui-graph-parameters-panel]", yo = "data-ui-graph-catalog", bo = "graph.reroute", xo = 30, So = 12, Co = "graph:add-parameter", wo = "graph:remove-parameter", To = "graph:reset-pin", Eo = {
	name: "nodes",
	readDocument: Lr,
	create: (e) => new Do(e)
}, Do = class {
	services;
	types = /* @__PURE__ */ new Map();
	typeTitles = /* @__PURE__ */ new Map();
	seriesColors;
	wiring;
	wires = null;
	log;
	pickerBinding;
	upload;
	runPanel;
	parameters;
	viewKept;
	drawnOnce = !1;
	clipboard = null;
	pinTarget = null;
	constructor(e) {
		let t = Oo(e.root.getAttribute(yo));
		this.services = e, this.seriesColors = ko(e.root), this.viewKept = e.context.store.readJson(e.root, "view") !== null;
		for (let e of t) {
			this.types.set(e.key, e);
			for (let t of [...e.inputs, ...e.outputs]) t.typeTitle !== null && t.typeTitle !== void 0 && this.typeTitles.set(jo(t.type), t.typeTitle);
		}
		this.pickerBinding = new ao(e, t), this.wiring = new go(e, {
			pinPoint: (e, t, n) => this.pinPoint(e, t, n),
			pinColor: (e) => this.pinColor(e),
			dropOnNothing: (e) => this.pickerBinding.openFor(e)
		}, this.types), this.log = new xa(e, this.types), this.upload = new po(e), this.runPanel = new uo(e), this.parameters = new Ua(e, {
			types: this.types,
			setValue: (e, t, n) => this.setValue(e, t, n, !0),
			readValue: (t, n) => la(t, e.context.values.read(n)),
			show: (e) => this.log.goToNode(e),
			cloneEditor: (t) => b(e.root, t)
		}), this.log.setLogOpen(e.context.store.read(e.root, "log") === "open"), this.log.drawRun(), e.root.addEventListener(h.menuOpeningEvent, (e) => this.pinMenuOpening(e));
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
		return Ui(t, this.types.get(t.type), {
			words: n.strings,
			names: n.names,
			states: n.states,
			typeTitles: this.typeTitles,
			icons: n.icons,
			readOnly: this.services.settings.readOnly,
			pinColor: (e) => this.pinColor(e),
			outputType: (e, t) => L(this.document, this.types, e, t),
			feedTitle: (e, t) => this.feedTitle(e, t, /* @__PURE__ */ new Set()),
			isConnected: (e, t, n) => n === "in" ? Zr(this.document, e, t) !== void 0 : this.document.edges.some((n) => n.fromNode === e && n.fromPin === t),
			onValueChanged: (e, t, n) => this.setValue(e, t, n),
			onPickImage: (e, t) => this.upload.pickImage(e, t),
			onImageUploaded: (e, t, n, r) => this.upload.announce(e, t, n, r),
			tooltips: n.tooltips,
			number: (e, t) => this.log.formatNumber(e, t),
			date: (e, t) => this.log.formatDate(e, t),
			temporal: n.temporal,
			urls: n.urls,
			cloneEditor: (e) => b(this.services.root, e),
			setProperty: (e, t, r) => n.properties.set(e, t, r),
			readValue: (e) => n.values.read(e)
		});
	}
	wordsChanged() {
		this.log.wordsChanged();
	}
	itemsDrawn(e) {
		this.log.reapplyToRedrawnNodes(e), this.services.settings.snapping && st(this.services.nodeElements.values(), this.services.settings.gridSize), this.parameters.draw(), this.fitFirstDraw();
	}
	fitFirstDraw() {
		if (this.drawnOnce || (this.drawnOnce = !0, this.document.nodes.length === 0)) return;
		let e = this.services.root;
		if (e.offsetWidth > 0) {
			this.fitUnlessKept();
			return;
		}
		let t = new ResizeObserver(() => {
			e.offsetWidth !== 0 && (t.disconnect(), this.fitUnlessKept());
		});
		t.observe(e);
	}
	fitUnlessKept() {
		(!this.viewKept || !this.services.view.showsAnyItem()) && this.services.view.fit();
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
		let t = le(this.document.edges.flatMap((t) => {
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
		return this.pinColor(L(this.document, this.types, t.fromNode, t.fromPin));
	}
	pinPoint(e, t, n) {
		let r = this.services.nodeElements.get(e)?.querySelector(`[${z}="${CSS.escape(t)}"][${Si}="${n}"]`);
		return r == null ? null : this.services.centerOf(r);
	}
	feedTitle(e, t, n) {
		let r = Zr(this.document, e, t);
		if (r === void 0 || n.has(r.fromNode)) return null;
		n.add(e);
		let i = this.document.nodes.find((e) => e.id === r.fromNode), a = i === void 0 ? void 0 : this.types.get(i.type), o = a?.compact === !0 ? a.inputs[0] : void 0;
		return o === void 0 ? I(a, r.fromPin, !0)?.title ?? null : this.feedTitle(r.fromNode, o.name, n);
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
		}[e] ?? Ao(e) + 1) - 1) % this.seriesColors + 1})`;
	}
	setValue(e, t, n, r = !1) {
		let i = this.document.nodes.find((t) => t.id === e);
		if (i !== void 0) {
			if (i.values[t] = n, r) {
				this.services.documentState.edited(!this.showCommitted(e, t, n));
				return;
			}
			this.parameters.showValue(e, t, n), this.services.documentState.edited(this.types.get(i.type)?.inputs.some((e) => e.visibleWhen === t) === !0);
		}
	}
	setPinValue(e, t, n, r) {
		let i = (r) => {
			let i = r.nodes.find((t) => t.id === e);
			i !== void 0 && (i.values[t] = n);
		};
		if (this.document.nodes.some((t) => t.id === e)) {
			if (r) {
				let r = this.showCommitted(e, t, n);
				this.parameters.showValue(e, t, n), this.services.documentState.committed((e) => i(e), !r);
				return;
			}
			i(this.document), this.services.documentState.edited();
		}
	}
	showCommitted(e, t, n) {
		let r = this.document.nodes.find((t) => t.id === e), i = r === void 0 ? void 0 : this.types.get(r.type), a = this.services.nodeElements.get(e)?.querySelector(`[${Ei}="${CSS.escape(t)}"] > *`);
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
		return e.closest(_o) !== null && e.closest("[data-ui-graph-head]") === null;
	}
	isPanel(e) {
		return e.closest(vo) !== null;
	}
	pointerDown(e, t) {
		let n = t.closest(`[${z}]`);
		return n === null || this.services.settings.readOnly ? !1 : this.wiring.beginConnect(n) ?? !0;
	}
	chrome(e) {
		if (this.parameters.press(e)) return !0;
		if (e.closest("[data-ui-graph-log-toggle]") !== null) return this.log.setLogOpen(!this.log.isLogOpen(), !0), !0;
		if (e.closest("[data-ui-graph-log-clear]") !== null) return this.log.clearLog(), !0;
		let t = e.closest(`[${ga}]`);
		return t !== null && (this.log.goToNode(t.getAttribute(ga)), !0);
	}
	backgroundDoubleClick() {
		this.pickerBinding.open();
	}
	escape() {
		this.pickerBinding.close();
	}
	copy(e) {
		this.clipboard = ri(this.document, e);
	}
	paste() {
		if (this.clipboard === null) return null;
		let e = this.services.settings.gridSize * 2, t = ii(this.clipboard, e, e);
		return this.document.nodes.push(...t.nodes), this.document.edges.push(...t.edges), this.clipboard = ri(this.document, new Set(t.nodes.map((e) => e.id))), t.nodes.map((e) => e.id);
	}
	remove(e, t) {
		let n = this.document;
		n.nodes = n.nodes.filter((t) => !e.has(t.id)), n.edges = n.edges.filter((n) => !t.has(n.id) && !e.has(n.fromNode) && !e.has(n.toNode)), this.parameters.forget(e);
	}
	arrange(e, t) {
		let n = this.services.settings;
		return kr(this.document, {
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
			case "graph:add-node": return this.services.settings.readOnly || this.pickerBinding.open(), !0;
			case "graph:add-reroute": return (t === null || t.kind === "edge") && this.addReroute(t?.id ?? null), !0;
			case "graph:reset-state": return t?.kind === "node" && this.resetState(t.id), !0;
			case Co:
			case wo: return this.pinTarget !== null && this.parameters.toggle(this.pinTarget.node, this.pinTarget.pin), !0;
			case To: return this.resetPin(), !0;
			case "graph:delete-edge": return t?.kind === "edge" && !this.services.settings.readOnly && (this.document.edges = this.document.edges.filter((e) => e.id !== t.id), this.services.documentState.edited()), !0;
			default: return !1;
		}
	}
	addReroute(e) {
		let t = e === null ? null : this.document.edges.find((t) => t.id === e), n = this.types.get(bo), r = n?.inputs[0], i = n?.outputs[0];
		if (this.services.settings.readOnly || t === void 0 || n === void 0 || r === void 0 || i === void 0) return;
		let a = this.services.settings, o = this.services.pointerScene(), s = Ur(n, O(o.x - xo, a.gridSize, a.snapping), O(o.y - So, a.gridSize, a.snapping));
		this.document.nodes.push(s), t !== null && (this.document.edges = [
			...this.document.edges.filter((e) => e.id !== t.id),
			{
				id: E("e"),
				fromNode: t.fromNode,
				fromPin: t.fromPin,
				toNode: s.id,
				toPin: r.name,
				points: []
			},
			{
				id: E("e"),
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
		]) k(this.services, t, e);
		A(this.services, "graph:reset-state", t?.kind === "node" && this.statePins(t.id).length > 0), this.syncPinMenu();
	}
	pinMenuOpening(e) {
		let t = this.services.context.names.contextMenu, n = e.target instanceof Element ? e.target.closest(`[${t}]`) : null, r = e instanceof CustomEvent ? e.detail?.target ?? null : null;
		if (n?.getAttribute(t) !== "graph-pin-menu" || !(r instanceof Element) || this.services.context.states.isInert(this.services.root)) return;
		let i = r.closest(`[${Ai}]`), a = i?.closest("[data-ui-graph-node]")?.getAttribute("data-ui-graph-node") ?? null;
		this.pinTarget = i === null || a === null ? null : {
			node: a,
			pin: i.getAttribute("data-ui-graph-pin-menu") ?? "",
			direction: i.getAttribute("data-ui-graph-pin-menu-dir") === "out" ? "out" : "in"
		}, this.syncPinMenu();
	}
	syncPinMenu() {
		let e = this.services, t = this.pinTarget, n = !this.services.settings.readOnly, r = t !== null && t.direction === "in" && this.parameters.allows(t.node, t.pin), i = r && this.parameters.has(t.node, t.pin);
		A(e, Co, r && !i), A(e, wo, i), k(e, Co, n), k(e, wo, n), k(e, To, n && t !== null && qr(this.document, this.types, t.node, t.pin, t.direction));
	}
	resetPin() {
		let e = this.pinTarget;
		!this.services.settings.readOnly && e !== null && qr(this.document, this.types, e.node, e.pin, e.direction) && (Jr(this.document, this.types, e.node, e.pin, e.direction), this.services.documentState.edited());
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
function Oo(e) {
	let t = T(e);
	return Array.isArray(t) ? t : [];
}
function ko(e) {
	let t = Number(getComputedStyle(e).getPropertyValue("--ui-color-series-count"));
	return Number.isFinite(t) && t >= 1 ? Math.floor(t) : 8;
}
function Ao(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t = t * 31 + e.charCodeAt(n) >>> 0;
	return t;
}
function jo(e) {
	return e.startsWith("array:") ? jo(e.slice(6)) : e;
}
//#endregion
//#region src/production/craft-view.ts
var Mo = u.slice(1);
function No(e, t) {
	let n = e.readCulture(t);
	return (t) => e.format(Math.round(t * 1e3) / 1e3, null, n);
}
function Po(e, t, n) {
	let r = document.createElement("div"), i = document.createElement("span"), a = document.createElement("span");
	if (r.className = "ui-graph__node ui-graph__craft", r.setAttribute(o, t.id), r.style.setProperty("--ui-graph-node-x", String(e.x)), r.style.setProperty("--ui-graph-node-y", String(e.y)), t.color !== null && r.style.setProperty("--ui-graph-node-color", t.color), n.conflict !== null && r.setAttribute("data-ui-graph-conflict", n.conflict), e.pinned === !0 && r.setAttribute("data-ui-graph-pinned", ""), i.className = `${Mo} ui-graph__craft-name`, i.textContent = t.title ?? n.word, a.className = "ui-graph__craft-time", a.textContent = n.note ?? J(t.time, n.number), r.append(i, a), n.connectable) {
		let e = document.createElement("span"), t = document.createElement("span");
		e.className = "ui-graph__handle", e.setAttribute(cn, ""), t.className = "ui-graph__entry", t.setAttribute(ln, ""), r.append(t, e);
	}
	return S(r, t.tooltip ?? Fo(t, n.resource, n.number), n.tooltips), r;
}
function Fo(e, t, n) {
	let r = (e) => e.map((e) => `${Io(e.amount, t(e.resource)?.unit ?? null, n)} ${t(e.resource)?.title ?? e.resource}`).join(" + ");
	return `${r(e.ingredients) || "—"} → ${r(e.products) || "—"}`;
}
function J(e, t) {
	return `${t(e)} s`;
}
function Io(e, t, n) {
	return t === null ? `×${n(e)}` : `×${n(e)} ${t}`;
}
function Lo(e, t, n, r) {
	return `${Io(e, t, r)} · ${J(n, r)}`;
}
function Ro(e, t) {
	let n = e.trim().replace("×", "").trim(), r = Number(t === "," ? n.replace(",", ".") : n.replaceAll(",", ""));
	return Number.isFinite(r) && r > 0 ? r : null;
}
//#endregion
//#region src/production/model.ts
function zo() {
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
function Bo(e) {
	let t = e;
	if (typeof t != "object" || !t) return zo();
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
			points: re(e.points)
		})),
		groups: (t.groups ?? []).map(ie),
		draft: {
			resources: (n?.resources ?? []).flatMap((e) => {
				let t = Wo(e);
				return t === null ? [] : [{
					...Xo(t),
					...Ho(e)
				}];
			}),
			crafts: (n?.crafts ?? []).flatMap((e) => {
				let t = Go(e);
				return t === null ? [] : [{
					...Zo(t),
					...Ho(e)
				}];
			}),
			removed: (n?.removed ?? []).map((e) => String(e))
		},
		plan: Vo(t.plan),
		key: te(t)
	};
}
function Vo(e) {
	let t = e ?? {}, n = String(t.period ?? "").toLowerCase(), r = String(t.objective ?? "").toLowerCase();
	return {
		targets: Ko(t.targets),
		period: n === "minute" ? "Minute" : n === "hour" ? "Hour" : "Once",
		objective: r === "leasttime" ? "LeastTime" : r === "leastcost" ? "LeastCost" : "LeastRaw",
		bought: Array.isArray(t.bought) ? t.bought.map((e) => String(e)) : []
	};
}
function Ho(e) {
	let t = e;
	return {
		created: t.created === !0,
		baseline: typeof t.baseline == "string" ? t.baseline : null
	};
}
function Uo(e) {
	if (typeof e != "object" || !e) return null;
	let t = e.kind;
	return t === "Craft" || t === "craft" || t === 1 ? Go(e) : t === "Resource" || t === "resource" || t === 0 ? Wo(e) : null;
}
function Wo(e) {
	let t = e;
	return typeof t.id != "string" || t.id.length === 0 ? null : {
		kind: "resource",
		id: t.id,
		title: Y(t.title),
		icon: Y(t.icon),
		color: Y(t.color),
		tooltip: Y(t.tooltip),
		image: Y(t.image),
		category: Y(t.category),
		unit: Y(t.unit),
		cost: typeof t.cost == "number" && Number.isFinite(t.cost) ? t.cost : null
	};
}
function Go(e) {
	let t = e;
	return typeof t.id != "string" || t.id.length === 0 ? null : {
		kind: "craft",
		id: t.id,
		title: Y(t.title),
		icon: Y(t.icon),
		color: Y(t.color),
		tooltip: Y(t.tooltip),
		ingredients: Ko(t.ingredients),
		products: Ko(t.products),
		time: qo(t.time)
	};
}
function Ko(e) {
	return Array.isArray(e) ? e.flatMap((e) => {
		let t = e;
		return typeof t == "object" && t && typeof t.resource == "string" ? [{
			resource: t.resource,
			amount: Number(t.amount) || 0
		}] : [];
	}) : [];
}
function Y(e) {
	return typeof e == "string" && e.length > 0 ? e : null;
}
function qo(e) {
	if (typeof e == "number") return Number.isFinite(e) ? e : 0;
	if (typeof e != "string") return 0;
	let t = /^(-)?(?:(\d+)\.)?(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(e.trim());
	if (t === null) return 0;
	let n = Number(t[2] ?? 0) * 86400 + Number(t[3]) * 3600 + Number(t[4]) * 60 + Number(t[5]);
	return t[1] === "-" ? -n : n;
}
function Jo(e) {
	let t = Math.round(Math.max(0, e) * 1e7), n = Math.floor(t / 864e9), r = t - n * 86400 * 1e7, i = Math.floor(r / 36e9), a = Math.floor(r % 36e9 / 6e8), o = Math.floor(r % 6e8 / 1e7), s = r % 1e7, c = `${Yo(i)}:${Yo(a)}:${Yo(o)}${s === 0 ? "" : `.${String(s).padStart(7, "0")}`}`;
	return n > 0 ? `${n}.${c}` : c;
}
function Yo(e) {
	return String(e).padStart(2, "0");
}
function Xo(e) {
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
function Zo(e) {
	return {
		id: e.id,
		title: e.title,
		icon: e.icon,
		color: e.color,
		tooltip: e.tooltip,
		ingredients: e.ingredients.map((e) => ({ ...e })),
		products: e.products.map((e) => ({ ...e })),
		time: Jo(e.time),
		created: !1,
		baseline: null
	};
}
function Qo(e, t) {
	let n = [...t.resources, ...t.crafts], r = new Set(t.crafts);
	return xn(e, n, t.removed, (e) => r.has(e) ? Go(e) : Wo(e));
}
function $o(e, t) {
	let n = e.ingredients.filter((e) => !t.has(e.resource)), r = e.products.filter((e) => !t.has(e.resource)), i = n.length !== e.ingredients.length;
	return !i && r.length === e.products.length ? null : {
		ingredients: n,
		products: r,
		goes: n.length === 0 && (i || r.length === 0)
	};
}
function es(e, t) {
	return Sn(e, [...t.resources, ...t.crafts]);
}
function ts(e) {
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
				id: ns(e.id, t.resource),
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
			id: ns(e.id, t.resource),
			from: t.resource,
			to: e.id,
			craft: e.id,
			resource: t.resource,
			role: "ingredient",
			amount: t.amount
		});
		for (let t of o) i.push({
			id: rs(e.id, t.resource),
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
			edge: rs(n.id, e)
		}), a.has(n.id) || s.add(rs(n.id, e));
	}
	return {
		edges: i,
		collapsed: a,
		outputs: o,
		quiet: s
	};
}
function ns(e, t) {
	return `${e}<${t}`;
}
function rs(e, t) {
	return `${e}>${t}`;
}
//#endregion
//#region src/production/production-editing.ts
var is = "graph-link-menu", as = class {
	services;
	number;
	decimalSeparator;
	host;
	constructor(e, t) {
		this.services = e, this.host = t, this.number = No(e.context.numbers, e.root), this.decimalSeparator = e.context.numbers.readCulture(e.root).decimalSeparator;
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
				...Zo(r),
				baseline: a
			};
			return t.crafts.push(e), e;
		}
		let o = {
			...Xo(r),
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
		let e = Tn("resource", this.keys()), t = this.services.pointerScene();
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
		return wn(this.host.entries(), [], this.document.draft.removed);
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
			if (n.kind !== "craft" || !this.stands(n.id) || $o(n, e) === null) continue;
			let r = this.craftOf(n.id), i = $o(r, e);
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
		return dn(this.services, e, {
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
				}, _t(this.services, is, n.clientX, n.clientY);
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
			id: Tn("craft", this.keys()),
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
			time: Jo(1),
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
		let n = this.host.edge(e), r = pn(this.services, e);
		if (n === void 0 || r === null) return;
		let i = t === "in" ? n.role !== "product" : n.role === "product", a = t === "in" ? n.resource : n.product ?? n.resource, o = t === "in" ? n.amount : n.output ?? n.amount;
		mn(this.services, r, this.number(o), (e) => {
			let t = Ro(e, this.decimalSeparator), r = t === null ? null : this.craftOf(n.craft);
			if (t === null || r === null) return;
			let o = (e) => e.map((e) => e.resource === a ? {
				...e,
				amount: t
			} : e);
			i ? r.ingredients = o(r.ingredients) : r.products = o(r.products), this.services.documentState.edited();
		});
	}
	editTime(e) {
		let t = this.host.entry(e), n = this.host.collapsed(e) ? null : this.services.nodeRect(e), r = this.host.craftEdge(e), i = n === null ? r === void 0 ? null : pn(this.services, r) : {
			x: n.x + n.width / 2,
			y: n.y + n.height / 2
		};
		i !== null && t?.kind === "craft" && mn(this.services, i, this.number(t.time), (t) => {
			let n = Ro(t, this.decimalSeparator), r = n === null ? null : this.craftOf(e);
			n !== null && r !== null && qo(r.time) !== n && (r.time = Jo(n), this.services.documentState.edited());
		});
	}
}, X = 1e-9, os = 1e-12;
function ss(e) {
	let t = e.cost.length, n = e.rows.length, r = [];
	for (let t = 0; t < n; t++) e.atLeast[t] > X && r.push(t);
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
		if (!cs(o, s, f, i, (e) => d[e] < -1e-9)) return "unsettled";
		let e = 0;
		for (let t = 0; t < n; t++) s[t] >= i && (e += o[t][a]);
		if (e > 1e-7 * c) return "infeasible";
		fs(o, s, f, i);
	}
	if (!cs(o, s, f, i, (e) => l[e] < -1e-9) || !cs(o, s, f, i, (e) => Math.abs(l[e]) <= X && u[e] < -1e-9)) return "unsettled";
	let p = Array(t).fill(0);
	for (let e = 0; e < n; e++) s[e] < t && (p[s[e]] = Math.max(0, o[e][a]));
	return p;
}
function cs(e, t, n, r, i) {
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
			if (e[n][o] <= X) continue;
			let r = e[n][a] / e[n][o];
			s < 0 || r < c - X ? (s = n, c = r) : r <= c + X && t[n] < t[s] && (s = n, c = Math.min(c, r));
		}
		if (s < 0) return !1;
		ls(e, t, n, s, o);
	}
	return !1;
}
function ls(e, t, n, r, i) {
	let a = e[r], o = a[i];
	for (let e = 0; e < a.length; e++) a[e] = ds(a[e] / o);
	a[i] = 1;
	for (let t = 0; t < e.length; t++) t !== r && us(e[t], a, i);
	for (let e of n) us(e, a, i);
	t[r] = i;
}
function us(e, t, n) {
	let r = e[n];
	if (r !== 0) {
		for (let n = 0; n < e.length; n++) e[n] = ds(e[n] - r * t[n]);
		e[n] = 0;
	}
}
function ds(e) {
	return Math.abs(e) < os ? 0 : e;
}
function fs(e, t, n, r) {
	let i = e[0].length - 1;
	for (let a = 0; a < e.length; a++) if (!(t[a] < r)) {
		e[a][i] = 0;
		for (let i = 0; i < r; i++) if (Math.abs(e[a][i]) > X) {
			ls(e, t, n, a, i);
			break;
		}
	}
}
//#endregion
//#region src/production/plan.ts
var Z = 1e-9, ps = 922337203685.4775, ms = 2147483647;
function hs(e) {
	return e.source ? e.consumed + e.target : 0;
}
function gs(e) {
	return e === "Minute" ? 60 : e === "Hour" ? 3600 : null;
}
function _s(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let t of e) t.kind === "resource" && !n.has(t.id) && n.set(t.id, t);
	let r = e.filter((e) => e.kind === "craft"), i = new Set(t.bought ?? []), a = /* @__PURE__ */ new Map();
	for (let e of r) for (let t of Ss(e.products, n)) {
		if (i.has(t.resource)) continue;
		let n = a.get(t.resource);
		n === void 0 ? a.set(t.resource, [e]) : n.includes(e) || n.push(e);
	}
	let o = /* @__PURE__ */ new Map();
	for (let e of t.targets) n.has(e.resource) && e.amount > Z && o.set(e.resource, (o.get(e.resource) ?? 0) + e.amount);
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
		for (let e of Ss(t.ingredients, n)) s.has(e.resource) || (s.add(e.resource), l.push(e.resource));
	}
	let u = r.filter((e) => c.has(e)), d = [...n.keys()].filter((e) => s.has(e) && a.has(e)), f = d.map((e) => u.map((t) => Cs(t.products, e) - Cs(t.ingredients, e))), p = d.map((e) => o.get(e) ?? 0), m = t.objective === "LeastCost", h = u.map((e) => bs(e, n, a, !1)), g = m ? u.map((e) => bs(e, n, a, !0)) : h, _ = u.map((e) => Math.max(0, e.time)), v = t.objective === "LeastTime" ? ss({
		rows: f,
		atLeast: p,
		cost: _,
		tieCost: h
	}) : ss({
		rows: f,
		atLeast: p,
		cost: g,
		tieCost: _
	});
	return Array.isArray(v) ? ys(n, a, o, u, (t.period === "Once" ? vs(f, p, v) : null) ?? v, gs(t.period)) : {
		status: v === "infeasible" ? "Infeasible" : "Unsettled",
		crafts: [],
		resources: [],
		time: 0,
		raw: 0,
		cost: 0
	};
}
function vs(e, t, n) {
	let r = n.map((e) => e <= Z ? 0 : Math.ceil(e - 1e-6));
	for (let i = 0; i < 1e3; i++) {
		let i = !1;
		for (let a = 0; a < e.length; a++) {
			let o = 0;
			for (let t = 0; t < r.length; t++) o += e[a][t] * r[t];
			if (o >= t[a] - 1e-6) continue;
			let s = -1;
			for (let t = 0; t < r.length; t++) e[a][t] > Z && (s < 0 || n[t] > n[s] + Z) && (s = t);
			if (s < 0) return null;
			r[s] += Math.ceil((t[a] - o) / e[a][s] - 1e-9), i = !0;
		}
		if (!i) return r;
	}
	return null;
}
function ys(e, t, n, r, i, a) {
	let o = [], s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), l = 0;
	for (let t = 0; t < r.length; t++) {
		let n = r[t], u = i[t];
		if (u <= Z) continue;
		let d = u * Math.max(0, n.time);
		o.push({
			craft: n.id,
			runs: u,
			time: Math.min(d, ps),
			workers: a === null ? null : Math.min(Math.ceil(d / a - Z), ms)
		}), l += d;
		for (let t of Ss(n.products, e)) s.set(t.resource, (s.get(t.resource) ?? 0) + u * t.amount);
		for (let t of Ss(n.ingredients, e)) c.set(t.resource, (c.get(t.resource) ?? 0) + u * t.amount);
	}
	let u = [], d = 0, f = 0;
	for (let r of e.values()) {
		if (!n.has(r.id) && !s.has(r.id) && !c.has(r.id)) continue;
		let e = !t.has(r.id), i = n.get(r.id) ?? 0, a = s.get(r.id) ?? 0, o = c.get(r.id) ?? 0;
		e && (d += o + i, f += (o + i) * xs(r)), u.push({
			resource: r.id,
			source: e,
			target: i,
			produced: a,
			consumed: o,
			surplus: e ? 0 : ws(a - o - i)
		});
	}
	return {
		status: "Solved",
		crafts: o,
		resources: u,
		time: Math.min(l, ps),
		raw: d,
		cost: f
	};
}
function bs(e, t, n, r) {
	let i = 0;
	for (let a of Ss(e.ingredients, t)) n.has(a.resource) || (i += a.amount * (r ? xs(t.get(a.resource)) : 1));
	return i;
}
function xs(e) {
	return e.cost !== null && Number.isFinite(e.cost) && e.cost >= 0 ? e.cost : 1;
}
function Ss(e, t) {
	return e.filter((e) => t.has(e.resource) && e.amount > 0);
}
function Cs(e, t) {
	let n = 0;
	for (let r of e) r.resource === t && r.amount > 0 && (n += r.amount);
	return n;
}
function ws(e) {
	return Math.abs(e) < 1e-7 ? 0 : e;
}
//#endregion
//#region src/production/plan-view.ts
function Ts(e, t) {
	return {
		plan: e,
		period: t,
		crafts: new Map(e.crafts.map((e) => [e.craft, e])),
		resources: new Map(e.resources.map((e) => [e.resource, e]))
	};
}
function Es(e, t) {
	return e.filter((e) => e.kind === "craft" ? t.crafts.has(e.id) : t.resources.has(e.id));
}
function Ds(e, t) {
	return e === "Minute" ? t.text("ui.graph.per-minute") : e === "Hour" ? t.text("ui.graph.per-hour") : "";
}
function Os(e, t, n) {
	return Io(e, t, n);
}
function ks(e, t, n, r) {
	let i = t === void 0 ? null : As(t);
	return i !== null && Math.abs(i - e) < 1e-6 ? null : Os(e, n, r);
}
function As(e) {
	return e.source ? hs(e) : e.produced;
}
function js(e, t, n) {
	return e.workers === null ? J(e.time, n) : t.format("ui.graph.plan-at-once", { count: n(e.workers) });
}
function Ms(e, t, n, r, i) {
	let a = Os(As(e), t, i);
	return n === void 0 ? a : `${a} · ${js(n, r, i)}`;
}
function Ns(e, t, n) {
	return `×${n(e.runs)} · ${js(e, t, n)}`;
}
//#endregion
//#region src/production/plan-panel.ts
var Ps = "[data-ui-graph-plan]", Fs = "[data-ui-graph-plan-targets]", Is = "[data-ui-graph-plan-add]", Ls = "data-ui-graph-plan-remove", Rs = "[data-ui-graph-plan-message]", zs = "[data-ui-graph-plan-totals]", Bs = "data-ui-graph-plan-rate", Vs = "plan", Hs = {
	infeasible: "ui.graph.plan-infeasible",
	unsettled: "ui.graph.plan-unsettled"
}, Us = class {
	services;
	number;
	host;
	panel;
	period;
	objective;
	fold;
	drawnKey = "";
	targetsKey = "";
	amounts = /* @__PURE__ */ new Map();
	constructor(e, t) {
		this.services = e, this.host = t, this.number = No(e.context.numbers, e.root), this.panel = e.root.querySelector(Ps), this.period = this.field("[data-ui-graph-plan-period]"), this.objective = this.field("[data-ui-graph-plan-objective]"), this.period?.addEventListener("change", () => this.choose()), this.objective?.addEventListener("change", () => this.choose()), this.fold = new Da(e.context.store, e.root, this.panel, Vs);
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
		if (this.fold.press(e) || !this.services.settings.readOnly && this.edit(e)) return !0;
		let t = e.closest("[data-ui-graph-plan-item]")?.getAttribute("data-ui-graph-plan-item");
		return t != null && this.host.show(t), !0;
	}
	edit(e) {
		if (e.closest(Is) !== null) return this.host.pick(), !0;
		let t = e.closest(`[${Ls}]`), n = t?.getAttribute(Ls);
		if (t === null || n == null) return !1;
		let r = this.host.request(), i = r.targets.findIndex((e) => e.resource === n), a = t.contains(document.activeElement);
		return this.host.change({
			...r,
			targets: r.targets.filter((e) => e.resource !== n)
		}), a && this.focusAfterRemoval(i), !0;
	}
	focusAfterRemoval(e) {
		let t = this.panel?.querySelector(Fs);
		if (this.panel === null || (t?.contains(document.activeElement) ?? !1)) return;
		let n = t?.children[e]?.querySelector(`[${Ls}]`) ?? this.panel.querySelector(`[${h.collapseToggle}]`);
		(n === null || n.matches("button") ? n : n.querySelector("button"))?.focus({ preventScroll: !0 });
	}
	draw(e) {
		if (this.panel === null || e === this.drawnKey) return;
		this.drawnKey = e;
		let t = this.host.request(), n = this.host.reading(), r = this.services.settings.readOnly, i = this.services.context.properties;
		this.period !== null && (i.set(this.period, "Value", t.period), i.set(this.period, "IsReadOnly", r)), this.objective !== null && (i.set(this.objective, "Value", t.objective), i.set(this.objective, "IsReadOnly", r));
		let a = this.field(Is);
		a !== null && i.set(a, "Enabled", !r), this.panel.toggleAttribute(Bs, t.period !== "Once");
		for (let e of this.panel.querySelectorAll("[data-ui-graph-plan-counted]")) e.setAttribute("data-ui-graph-plan-counted", Ds(t.period, this.services.context.strings));
		this.drawTargets(t, r), this.drawMessage(t, n), this.drawTables(n);
	}
	wordsChanged() {
		let e = this.drawnKey;
		this.drawnKey = "", this.targetsKey = "", this.draw(e);
	}
	drawTargets(e, t) {
		let n = this.panel.querySelector(Fs);
		if (n === null) return;
		let r = JSON.stringify([t, e.targets.map((e) => {
			let t = this.host.resource(e.resource);
			return [
				e.resource,
				t?.title,
				t?.image ?? t?.icon
			];
		})]);
		if (r === this.targetsKey) {
			for (let t of e.targets) this.showAmount(t.resource, t.amount);
			return;
		}
		this.targetsKey = r, this.amounts.clear(), n.replaceChildren(...e.targets.map((e) => this.targetRow(e.resource, e.amount, t)));
	}
	showAmount(e, t) {
		let n = this.amounts.get(e);
		n !== void 0 && !n.contains(document.activeElement) && this.services.context.properties.set(n, "Value", t);
	}
	targetRow(e, t, n) {
		let r = this.host.resource(e), i = document.createElement("div"), a = this.nameOf(e, r?.title ?? e, r?.image ?? r?.icon ?? null), o = b(this.services.root, "graph-plan-amount"), s = b(this.services.root, "graph-plan-remove"), c = this.services.context.properties;
		return i.className = "ui-graph__plan-target", i.append(a), o !== null && (c.set(o, "Value", t), c.set(o, "IsReadOnly", n), o.addEventListener("change", () => this.setAmount(e, o, this.services.context.values.read(o))), this.amounts.set(e, o), i.append(o)), s !== null && (s.setAttribute(Ls, e), c.set(s, "Enabled", !n), i.append(s)), i;
	}
	setAmount(e, t, n) {
		let r = typeof n == "number" ? n : Number(String(n ?? "").replace(",", ".")), i = this.host.request();
		if (!Number.isFinite(r) || r <= 0) {
			let n = i.targets.find((t) => t.resource === e);
			n !== void 0 && this.services.context.properties.set(t, "Value", n.amount);
			return;
		}
		this.host.change({
			...i,
			targets: i.targets.map((t) => t.resource === e ? {
				...t,
				amount: r
			} : t)
		});
	}
	drawMessage(e, t) {
		let n = this.services.context.strings, r = this.panel.querySelector(Rs), i = this.panel.querySelector(zs);
		if (r !== null) {
			r.hidden = t !== null;
			let i = e.targets.length > 0 ? this.host.failure() : null;
			r.toggleAttribute("data-ui-graph-plan-failed", i !== null), r.textContent = t === null ? n.text(i === null ? "ui.graph.plan-empty" : Hs[i]) : "";
		}
		i !== null && (i.hidden = t === null, t !== null && (i.textContent = n.format("ui.graph.plan-totals", {
			time: J(t.plan.time, this.number),
			raw: this.number(t.plan.raw),
			cost: this.number(t.plan.cost)
		})));
	}
	drawTables(e) {
		let t = this.services.context.strings, n = [], r = [], i = [];
		for (let t of e?.plan.resources ?? []) {
			let e = this.host.resource(t.resource), i = e?.unit === null || e?.unit === void 0 ? "" : ` ${e.unit}`, a = this.nameOf(t.resource, e?.title ?? t.resource, e?.image ?? e?.icon ?? null);
			if (t.source) {
				n.push(Ws(t.resource, a, `${this.number(hs(t))}${i}`));
				continue;
			}
			r.push(Ws(t.resource, a, `${this.number(t.produced)}${i}`, `${this.number(t.consumed)}${i}`, t.surplus > 0 ? `${this.number(t.surplus)}${i}` : "—"));
		}
		for (let n of e?.plan.crafts ?? []) {
			let e = this.host.craft(n.craft), r = e?.products[0] === void 0 ? void 0 : this.host.resource(e.products[0].resource), a = this.nameOf(n.craft, e?.title ?? t.text("ui.graph.recipe"), e?.icon ?? r?.image ?? r?.icon ?? null);
			i.push(Ws(n.craft, a, this.number(n.runs), J(n.time, this.number), n.workers === null ? "—" : this.number(n.workers)));
		}
		this.fill("raw", n), this.fill("resources", r), this.fill("crafts", i);
	}
	fill(e, t) {
		let n = this.panel.querySelector(`[data-ui-graph-plan-section="${e}"]`), r = this.panel.querySelector(`[data-ui-graph-plan-rows="${e}"]`);
		n !== null && r !== null && (n.hidden = t.length === 0, r.replaceChildren(...t));
	}
	nameOf(e, t, n) {
		let r = document.createElement("button"), i = document.createElement("span");
		if (r.type = "button", r.className = "ui-graph__plan-name", r.setAttribute("data-ui-graph-plan-item", e), r.setAttribute(this.services.context.names.tooltip, t), n !== null) {
			let e = document.createElement("span");
			e.className = "ui-graph__plan-icon", e.setAttribute("aria-hidden", "true"), this.services.context.icons.apply(e, n), r.append(e);
		}
		return i.textContent = t, r.append(i), r;
	}
};
function Ws(e, t, ...n) {
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
var Gs = 32, Ks = 84, qs = "graph:add-node", Js = "graph:amount", Ys = "graph:output", Xs = "graph:craft-time", Zs = "graph:delete-edge", Qs = "graph:target", $s = "graph:bought", ec = "data-ui-graph-target", tc = {
	name: "production",
	readDocument: Bo,
	create: (e) => new nc(e)
}, nc = class {
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
		let t = T(e.root.getAttribute(Sr));
		this.services = e, this.number = No(e.context.numbers, e.root), this.decimalSeparator = e.context.numbers.readCulture(e.root).decimalSeparator, this.server = Array.isArray(t) ? t.map(Uo).filter((e) => e !== null) : [], this.editing = new as(e, {
			entries: () => this.entries,
			collapsed: (e) => this.collapsed.has(e),
			craftEdge: (e) => this.links.find((t) => t.craft === e)?.id,
			entry: (e) => this.entryById.get(e),
			serverEntry: (e) => this.serverById.get(e),
			edge: (e) => this.linkById.get(e)
		}), this.sheet = new br(e, {
			nodeIds: () => this.drawn.map((e) => e.id),
			links: () => this.links,
			layoutKey: () => this.reading === null ? this.shape : `${this.shape}|${this.drawn.map((e) => e.id).join(",")}`,
			nodeBox: (e, t, n) => this.shape === "icon" ? Er(e, t, n) : {
				width: e,
				height: t
			}
		}, {
			nodeGap: Gs,
			layerGap: Ks
		}), this.panel = new Us(e, {
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
		}), this.picker = no.create(e.root, () => this.targetChoices(), e.context.strings, e.context.dom, e.context.icons, e.context.roving, (e) => this.setTarget(e.key, 1)), this.refresh();
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
		return this.services.root.getAttribute(Ft) === "plan";
	}
	get editable() {
		return !this.planning && !this.services.settings.readOnly && this.services.root.hasAttribute("data-ui-graph-edit-structure");
	}
	get document() {
		return this.services.documentState.document;
	}
	get shape() {
		return Nn(this.services.root.getAttribute("data-ui-graph-node-shape")) ?? "icon";
	}
	applyChange(e) {
		In(this.server, e, Uo), this.serverVersion++, this.services.draw();
	}
	refresh() {
		let e = this.document.draft, t = this.planning, n = `${this.serverVersion}|${this.services.documentState.version}|${t}|${this.services.settings.readOnly}`;
		if (n === this.structureKey) return;
		this.structureKey = n, this.serverById = new Map(this.server.map((e) => [e.id, e])), this.entries = Qo(this.server, e);
		let r = t ? _s(this.entries, this.document.plan) : null;
		this.reading = r?.status === "Solved" ? Ts(r, this.document.plan.period) : null, this.failure = r?.status === "Infeasible" ? "infeasible" : r?.status === "Unsettled" ? "unsettled" : null;
		let i = this.reading === null ? t ? [] : this.entries : Es(this.entries, this.reading), a = ts(i);
		this.links = a.edges, this.collapsed = a.collapsed, this.outputs = a.outputs, this.quiet = a.quiet, this.drawn = i.filter((e) => !this.collapsed.has(e.id)), this.conflicts = es(this.server, e), this.entryById = new Map(this.entries.map((e) => [e.id, e])), this.linkById = new Map(this.links.map((e) => [e.id, e])), this.sheet.structureChanged(), this.panel.draw(n);
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
			return Po(e, t, {
				tooltips: this.services.context.tooltips,
				word: r.text("ui.graph.recipe"),
				connectable: this.editable,
				conflict: n,
				note: i === void 0 ? null : Ns(i, r, this.number),
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
		}, a = this.outputs.get(i.id), o = this.reading?.resources.get(i.id), s = o !== void 0 && this.reading !== null ? Ms(o, i.unit ?? null, a !== void 0 && this.collapsed.has(a.craft) ? this.reading.crafts.get(a.craft) : void 0, r, this.number) : a === void 0 ? null : Lo(a.amount, i.unit ?? null, a.time, this.number), c = gn(e, {
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
		return this.planning && this.document.plan.targets.some((e) => e.resource === i.id) && c.setAttribute(ec, ""), c;
	}
	wordsChanged() {
		this.panel.wordsChanged();
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
		return n === void 0 || this.reading === null ? Io(e.amount, t, this.number) : e.role === "product" ? Os(n.runs * e.amount, t, this.number) : ks(n.runs * e.amount, this.reading.resources.get(e.resource), t, this.number);
	}
	related(e) {
		return tn(this.links, e);
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
		let n = t.closest(`[${cn}]`);
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
		mn(this.services, {
			x: t.x + t.width / 2,
			y: t.y + t.height / 2
		}, n === void 0 ? "" : this.number(n.amount), (t) => {
			let n = Ro(t, this.decimalSeparator);
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
		let n = e === qs || e === Js || e === Ys || e === Xs || e === Zs;
		if (e === "graph:link-ingredient" || e === "graph:link-recipe") return this.editable && this.editing.answerLink(e === "graph:link-ingredient"), !0;
		if (e === "graph:take-server" || e === "graph:keep-mine") {
			let n = this.conflictOf(t);
			if (n !== null && !this.services.settings.readOnly) {
				let t = this.document.draft, r = e === "graph:keep-mine";
				(Cn(t.resources, n, this.serverById.get(n), r) || Cn(t.crafts, n, this.serverById.get(n), r)) && this.services.documentState.edited();
			}
			return !0;
		}
		if (e === $s) {
			if (this.planning && t?.kind === "node" && this.isMade(t.id)) {
				let e = this.document.plan, n = e.bought ?? [];
				this.changePlan({
					...e,
					bought: n.includes(t.id) ? n.filter((e) => e !== t.id) : [...n, t.id]
				});
			}
			return !0;
		}
		if (e === Qs) return this.planning && t?.kind === "node" && this.editTarget(t.id), !0;
		if (!n || !this.editable) return n;
		switch (e) {
			case qs:
				this.editing.addResource();
				break;
			case Js:
				t?.kind === "edge" && this.editing.editAmount(t.id);
				break;
			case Ys:
				t?.kind === "edge" && this.editing.editOutput(t.id);
				break;
			case Xs:
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
		A(this.services, "graph:take-server", r), A(this.services, "graph:keep-mine", r);
		let i = t?.kind === "node" && this.entryById.get(t.id)?.kind === "craft", a = t?.kind === "edge" && this.linkById.get(t.id)?.role === "recipe";
		for (let e of [
			qs,
			Js,
			Zs
		]) k(this.services, e, n);
		let o = this.planning && t?.kind === "node" && this.resource(t.id) !== void 0, s = o && this.isMade(t.id);
		A(this.services, Qs, o), A(this.services, $s, s), k(this.services, Qs, e && o), k(this.services, $s, e && s), vt(this.services, $s, s && (this.document.plan.bought ?? []).includes(t.id)), k(this.services, Ys, n && a), k(this.services, Xs, n && (i || a));
	}
}, rc = "graph.set-node-status", ic = "graph.set-node-display", ac = "graph.set-node-value", oc = "graph.add-node-log", sc = "graph.set-run-progress", cc = "graph.set-running";
function lc(e, t) {
	e.registerEvent("node-click", { dynamicParameters: (e) => [e.domEvent.detail?.nodeId ?? ""] }), e.registerEvent(fo, { dynamicParameters: (e) => [...e.domEvent.detail?.keys ?? []] });
	let n = (e, n) => {
		let r = Yt(e, n);
		return r === null ? null : t()?.kindOf(r, Do) ?? null;
	}, r = (e, t) => {
		let r = e.effect, i = n(e, r);
		i !== null && r.nodeId !== void 0 && t(i, r.nodeId, r);
	};
	e.registerEffect({
		kind: rc,
		handler: (e) => r(e, (e, t, n) => e.setStatus(t, n.state ?? "Idle", typeof n.progress == "number" ? n.progress : null, n.message ?? null))
	}), e.registerEffect({
		kind: ic,
		handler: (e) => r(e, (e, t, n) => e.setDisplay(t, n.pinName ?? "", n.value))
	}), e.registerEffect({
		kind: ac,
		handler: (e) => r(e, (e, t, n) => e.setPinValue(t, n.pinName ?? "", n.value, n.committed === !0))
	}), e.registerEffect({
		kind: oc,
		handler: (e) => r(e, (e, t, n) => e.addLog(t, String(n.level ?? "Info"), n.message ?? null))
	}), e.registerEffect({
		kind: sc,
		handler: (e) => {
			let t = e.effect;
			n(e, t)?.setRunProgress(Number(t.completed) || 0, Number(t.total) || 0);
		}
	}), e.registerEffect({
		kind: cc,
		handler: (e) => {
			let t = e.effect;
			n(e, t)?.setRunning(t.running === !0);
		}
	}), e.registerEvent(co, {});
}
//#endregion
//#region src/graph.ts
var Q = en(), uc = [
	Eo,
	Dr,
	tc
], $ = null;
Q.registerEngine((e) => {
	$ = new Jt(e, uc);
}), Q.registerEvent("save", {
	settlesValue: !0,
	submitsForm: !0,
	dynamicParameters: (e) => [e.domEvent.detail?.reason ?? ""],
	completed: (e) => $?.saveCompleted(e.component, e.success, e.domEvent.detail?.id, e.domEvent.detail?.reason ?? "")
}), Q.registerEvent("menu-entry", { dynamicParameters: (e) => [...e.domEvent.detail?.keys ?? []] }), Q.registerValueReader({
	kind: Kt,
	read: (e) => T(e.getAttribute(t))
}), Q.registerDomOperation({
	kind: Kt,
	handler: (e) => e.target.setAttribute(t, JSON.stringify(e.value ?? null))
}), Q.registerConverter("graph-edge-shape", (e) => String(e ?? "Orthogonal").toLowerCase()), Q.registerConverter("graph-rem", (e) => typeof e == "number" && e > 0 ? `${e}rem` : ""), Q.registerConverter("graph-direction", (e) => {
	let t = String(e ?? "");
	return t === "TopToBottom" ? "down" : t === "RightToLeft" ? "left" : t === "BottomToTop" ? "up" : "right";
}), Q.registerConverter("graph-node-shape", (e) => String(e ?? "") === "Icon" ? "icon" : "card"), Q.registerConverter("graph-production-mode", (e) => String(e ?? "") === "Plan" ? "plan" : "constructor"), Q.registerEffect({
	kind: qt,
	handler: (e) => {
		let t = e.effect, n = Yt(e, t);
		n !== null && $?.requestSave(n, typeof t.reason == "string" ? t.reason : "");
	}
}), lc(Q, () => $), Q.registerCollectionSink({
	kind: "layered",
	handler: (e) => $?.kindOf(e.component, Or)?.applyChange(e)
}), Q.registerCollectionSink({
	kind: "production",
	handler: (e) => $?.kindOf(e.component, nc)?.applyChange(e)
});
//#endregion
