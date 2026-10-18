//#region src/canvas/canvas-dom.ts
var e = ".ui-graph", t = "data-ui-graph-document", n = "data-ui-graph-group", r = "data-ui-graph-selected", i = "data-ui-graph-edge", a = "data-ui-graph-reroute", o = "data-ui-graph-node", s = "data-ui-graph-resize", c = "data-ui-graph-resizing", l = "data-ui-graph-pin-toggle", u = "data-ui-graph-fold", d = "data-ui-graph-collapsed", f = ".ui-graph__node-title", p = "ui-graph--connecting", m = "data-ui-graph-drop", h = "data-ui-graph-menu-panel", g = "data-ui-graph-side", _ = {
	menuOpeningEvent: "ui-context-menu-opening",
	collapsed: "data-ui-collapsed",
	collapseToggle: "data-ui-collapse-toggle",
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
}, v = _.collapsed, y = `[${h}], [${g}][${v}], [data-ui-graph-run], .ui-graph__run-panel`, ee = `.ui-graph__bar-button, :is([${h}], [${g}]) > [${_.collapseToggle}], .ui-graph__log-head > button`, b = ".ui-graph__bubble", te = ".ui-graph__bubble-face";
function x(e, t) {
	let n = e.closest(`[${i}]`);
	if (n !== null) return {
		to: "reroute",
		id: n.getAttribute(i)
	};
	if (t(e)) return null;
	let r = e.closest(`[${o}]`);
	return r === null ? e.closest("[data-ui-graph-group], .ui-graph__corner") === null ? { to: "sheet" } : null : ne(e, r) ? {
		to: "rename",
		id: r.getAttribute(o)
	} : null;
}
function ne(e, t) {
	return e.closest(".ui-graph__node-title") !== null || t.matches(b) && (e === t || e.closest(te) !== null);
}
function S(e, t) {
	let n = e.querySelector(`template[data-ui-graph-editor="${CSS.escape(t)}"]`)?.content.firstElementChild?.cloneNode(!0);
	return n instanceof HTMLElement ? n : null;
}
function re(e, t, n) {
	return e.strings.format("ui.graph.percent", { value: e.numbers.format(n, null, e.numbers.readCulture(t)) });
}
function ie(e, t, n, r, i) {
	let a = document.createElement("div");
	return a.className = e, a.setAttribute(o, t), a.style.setProperty("--ui-graph-node-x", String(n.x)), a.style.setProperty("--ui-graph-node-y", String(n.y)), r !== null && r.length > 0 && a.style.setProperty("--ui-graph-node-color", r), i !== null && a.setAttribute("data-ui-graph-conflict", i), n.pinned === !0 && a.setAttribute("data-ui-graph-pinned", ""), a;
}
function ae() {
	let e = document.createElement("div");
	return e.className = "ui-graph__resize", e.setAttribute(s, ""), e;
}
function oe(e, t, n) {
	e.addEventListener("pointerenter", () => n.show(e, t, { delay: !0 })), e.addEventListener("pointerleave", () => n.hide());
}
function se(e, t) {
	e.addEventListener("focusin", (n) => {
		n.target === e && t.focus({ preventScroll: !0 });
	});
}
//#endregion
//#region src/canvas/history.ts
var ce = 100, le = class {
	read;
	depth;
	past = [];
	future = [];
	present;
	saved;
	constructor(e, t, n = ce) {
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
		for (let t = 0; t < this.past.length; t++) this.past[t] = ue(this.past[t], e);
		for (let t = 0; t < this.future.length; t++) this.future[t] = ue(this.future[t], e);
		this.saved = ue(this.saved, e);
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
function ue(e, t) {
	let n = JSON.parse(e);
	return t(n), JSON.stringify(n);
}
//#endregion
//#region src/canvas/canvas-model.ts
function de(e) {
	return typeof e.key == "string" ? e.key : null;
}
function C(e) {
	if (e === null || e.length === 0) return null;
	try {
		return JSON.parse(e);
	} catch {
		return null;
	}
}
function fe(e) {
	let t = Number(e);
	return Number.isFinite(t) && t > 0 ? t : null;
}
function pe(e) {
	return {
		id: String(e.id),
		x: Number(e.x) || 0,
		y: Number(e.y) || 0,
		pinned: e.pinned === !0
	};
}
function me(e) {
	return {
		id: String(e.id),
		points: ge(e.points)
	};
}
function he(e) {
	let t = e;
	return {
		created: t.created === !0,
		baseline: typeof t.baseline == "string" ? t.baseline : null
	};
}
function w(e) {
	return typeof e == "string" && e.length > 0 ? e : null;
}
function ge(e) {
	return (e ?? []).map((e) => ({
		x: Number(e.x) || 0,
		y: Number(e.y) || 0
	}));
}
function _e(e) {
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
function T(e) {
	return `${e}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
//#endregion
//#region src/canvas/canvas-document.ts
var ve = "auto", ye = class {
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
		this.root = e, this.valueElement = n, this.settings = r, this.callbacks = a, this.values = o, this.documentValue = i(C(this.valueElement.getAttribute(t))), this.history = new le(this.documentValue, i);
	}
	get document() {
		return this.documentValue;
	}
	load(e) {
		JSON.stringify(e) === JSON.stringify(this.documentValue) ? (this.history.markSaved(), this.markClean()) : (this.documentValue = e, this.version++, this.history.reset(e, !0), this.callbacks.clearSelectionSets(), this.markClean(), this.callbacks.redraw());
	}
	edited(e = !0) {
		if (this.settings.readOnly) {
			this.refuseEdit();
			return;
		}
		let t = this.history.record(this.documentValue);
		this.version++, this.showDirty(), e ? this.callbacks.redraw() : this.callbacks.redrawEdges(), this.settings.autoSave && t && queueMicrotask(() => this.save(ve));
	}
	refuseEdit() {
		let e = this.history.revert(this.documentValue);
		e !== null && (this.documentValue = e, this.version++, this.callbacks.redraw());
	}
	committed(e, t = !0) {
		let n = !this.history.dirty;
		e(this.documentValue), this.version++, this.history.commit(e), this.history.absorb(JSON.stringify(this.documentValue)), this.sent === null ? n && this.history.markSaved() : this.sent = ue(this.sent, e), this.showDirty(), t && this.callbacks.redraw();
	}
	save(e = "") {
		if (this.settings.readOnly) return;
		if (this.sent !== null) {
			(this.queuedSave === null || !be(this.queuedSave) || be(e)) && (this.queuedSave = e);
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
		this.documentValue = e, this.version++, this.showDirty(), this.callbacks.redraw(), this.settings.autoSave && this.history.dirty && queueMicrotask(() => this.save(ve));
	}
};
function be(e) {
	return e !== "" && e !== ve;
}
var xe = 6;
function Se(e, t = {}) {
	let n = t.spacing ?? 14, r = t.margin ?? 14, i = e.filter((e) => Math.abs(e.from.across - e.to.across) > .5 && e.to.along - e.from.along >= 48).sort((e, t) => e.from.along - t.from.along || e.from.across - t.from.across), a = /* @__PURE__ */ new Map();
	for (let e of Ce(i, n, r)) {
		let t = Pe(ke(e.legs)), { middle: i, step: o } = De(e, t.length, n, r);
		t.forEach((e, n) => {
			for (let r of e.legs) a.set(r.id, i + (n - (t.length - 1) / 2) * o);
		});
	}
	return a;
}
function Ce(e, t, n) {
	let r = e.map((e) => Ee({
		legs: [e],
		low: e.from.along,
		high: e.to.along,
		top: Math.min(e.from.across, e.to.across),
		bottom: Math.max(e.from.across, e.to.across),
		turns: (e.from.along + e.to.along) / 2,
		from: 0,
		to: 0
	}, t, n));
	for (let e = 0; e < r.length; e++) for (let i = 0; i < r.length; i++) i !== e && we(r[e], r[i], t) && (Te(r[e], r[i], t, n), r.splice(i, 1), i < e && e--, i = -1);
	return r;
}
function we(e, t, n) {
	return e.top <= t.bottom + n && t.top <= e.bottom + n && Math.max(e.low, t.low) < Math.min(e.high, t.high) && e.from < t.to + n && t.from < e.to + n;
}
function Te(e, t, n, r) {
	e.legs.push(...t.legs), e.low = Math.max(e.low, t.low), e.high = Math.min(e.high, t.high), e.top = Math.min(e.top, t.top), e.bottom = Math.max(e.bottom, t.bottom), e.turns += t.turns, Ee(e, n, r);
}
function Ee(e, t, n) {
	let r = Oe(e.legs), { middle: i, step: a } = De(e, r, t, n), o = (r - 1) / 2 * a;
	return e.from = i - o, e.to = i + o, e;
}
function De(e, t, n, r) {
	let i = Math.max(0, e.high - e.low - r * 2), a = t > 1 ? Math.min(n, i / (t - 1)) : 0, o = (t - 1) / 2 * a, s = e.low + r + o, c = e.high - r - o, l = e.turns / e.legs.length;
	return {
		middle: s <= c ? Math.min(Math.max(l, s), c) : (e.low + e.high) / 2,
		step: a
	};
}
function Oe(e) {
	let t = Ae(e), n = /* @__PURE__ */ new Set();
	for (let r of e) n.add(je(r, t));
	return n.size;
}
function ke(e) {
	let t = Ae(e), n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = je(r, t), i = n.get(e);
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
function Ae(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		let e = Ne(n).from;
		t.set(e, (t.get(e) ?? 0) + 1);
	}
	return t;
}
function je(e, t) {
	let n = Ne(e);
	return (t.get(n.from) ?? 0) > 1 ? n.fromLane : n.toLane;
}
var Me = /* @__PURE__ */ new WeakMap();
function Ne(e) {
	let t = Me.get(e);
	if (t === void 0) {
		let n = `${e.source}@${Math.round(e.from.across)}`, r = `${e.target}@${Math.round(e.to.across)}`;
		t = {
			from: n,
			to: r,
			fromLane: `from:${n}`,
			toLane: `to:${r}`
		}, Me.set(e, t);
	}
	return t;
}
function Pe(e) {
	let t = [...e].sort((e, t) => e.mean - t.mean || e.min - t.min);
	if (t.length < 2 || t.length > xe) return t;
	let n = t.map((e) => t.map((t) => e === t ? 0 : Fe(e, t))), r = (e) => {
		let t = 0;
		for (let r = 0; r < e.length; r++) for (let i = r + 1; i < e.length; i++) t += n[e[r]][e[i]];
		return t;
	}, i = t.map((e, t) => t), a = r(i);
	for (let e of Le(i)) {
		let t = r(e);
		t < a && (i = e, a = t);
	}
	return i.map((e) => t[e]);
}
function Fe(e, t) {
	let n = 0;
	for (let r of e.legs) n += +!!Ie(r.to.across, t);
	for (let r of t.legs) n += +!!Ie(r.from.across, e);
	return n;
}
function Ie(e, t) {
	return e > t.min + .5 && e < t.max - .5;
}
function* Le(e) {
	if (e.length <= 1) yield [...e];
	else for (let t = 0; t < e.length; t++) for (let n of Le([...e.slice(0, t), ...e.slice(t + 1)])) yield [e[t], ...n];
}
//#endregion
//#region src/canvas/geometry.ts
var Re = 4, ze = 12, Be = 64, Ve = 56, He = 16, Ue = 9, We = 7;
function Ge(e, t, n, r = [], i = {}) {
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
	].map(s), u = (i.back === !0 && r.length === 0 ? i.loop === !0 ? rt(l[0], l[1]) : tt(l[0], l[1]) : e === "straight" ? Ze(l) : e === "orthogonal" ? et(l, (i.turns ?? []).map((e) => e === void 0 ? void 0 : e * o)) : Qe(l)).map((e) => ({
		op: e.op,
		points: e.points.map(c)
	}));
	return {
		path: qe(u),
		pieces: Ke(u) ? null : Je(u),
		arrow: i.arrow === !0 ? it(u) : null
	};
}
function Ke(e) {
	let t = null;
	for (let n of e) {
		let e = n.points[n.points.length - 1];
		if (n.op === "C" || n.op === "L" && t !== null && t.x !== e.x && t.y !== e.y) return !1;
		t = e;
	}
	return !0;
}
function qe(e) {
	return e.map((e) => `${e.op}${e.points.map((e) => `${E(e.x)},${E(e.y)}`).join(" ")}`).join(" ");
}
function Je(e) {
	let t = [], n = null;
	for (let r of e) {
		if (r.op === "M") {
			n = r.points[0];
			continue;
		}
		let e = r.op === "C" && n !== null ? Ye(n, r.points) : [r.points[r.points.length - 1]];
		for (let r of e) n !== null && Xe(t, n, r), n = r;
	}
	return t;
}
function Ye(e, [t, n, r]) {
	let i = Math.hypot(t.x - e.x, t.y - e.y) + Math.hypot(n.x - t.x, n.y - t.y) + Math.hypot(r.x - n.x, r.y - n.y), a = Math.max(1, Math.ceil(i / Re)), o = [];
	for (let i = 1; i <= a; i++) {
		let s = i / a, c = 1 - s, l = c * c * c, u = 3 * c * c * s, d = 3 * c * s * s, f = s * s * s;
		o.push({
			x: l * e.x + u * t.x + d * n.x + f * r.x,
			y: l * e.y + u * t.y + d * n.y + f * r.y
		});
	}
	return o;
}
function Xe(e, t, n) {
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
function Ze(e) {
	return e.map((e, t) => ({
		op: t === 0 ? "M" : "L",
		points: [e]
	}));
}
function Qe(e) {
	let t = [{
		op: "M",
		points: [e[0]]
	}];
	for (let n = 1; n < e.length; n++) {
		let r = e[n - 1], i = e[n], a = $e(r, i);
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
function $e(e, t) {
	let n = t.x - e.x;
	return n >= 0 ? Math.min(Math.max(n * .5, 24), 160) : Math.min(Math.max(-n * .6 + 40, 60), 220);
}
function et(e, t) {
	let n = [{
		op: "M",
		points: [e[0]]
	}], r = (e, t) => {
		n.push({
			op: "L",
			points: [{
				x: E(e),
				y: E(t)
			}]
		});
	};
	for (let n = 1; n < e.length; n++) {
		let i = e[n - 1], a = e[n];
		if (a.x - i.x >= 48) {
			let e = Math.min(a.x - ze, Math.max(i.x + ze, t[n - 1] ?? (i.x + a.x) / 2));
			r(e, i.y), r(e, a.y), r(a.x, a.y);
		} else {
			let e = i.x + 24, t = a.x - 24, n = (i.y + a.y) / 2;
			r(e, i.y), r(e, n), r(t, n), r(t, a.y), r(a.x, a.y);
		}
	}
	return n;
}
function tt(e, t) {
	let n = t.x - e.x, r = Math.min(96, 20 + Math.abs(n) * .1), i = Math.min(e.y, t.y) - r, a = Math.sign(n) * Math.min(Math.abs(n) * .45, Be);
	return [{
		op: "M",
		points: [e]
	}, {
		op: "C",
		points: [
			nt(e, t, {
				x: e.x + a,
				y: i
			}),
			nt(t, e, {
				x: t.x - a,
				y: i
			}),
			t
		]
	}];
}
function nt(e, t, n) {
	let r = t.x - e.x, i = t.y - e.y, a = Math.hypot(r, i), o = n.x - e.x, s = n.y - e.y, c = Math.hypot(o, s);
	if (a === 0 || c === 0) return n;
	let l = (o * r + s * i) / (a * c), u = 2 * a / 3;
	if (c * (1 + l) <= u) return n;
	let d = u / (c * (1 + l));
	return {
		x: e.x + o * d,
		y: e.y + s * d
	};
}
function rt(e, t) {
	let n = Math.min(e.y, t.y) - Ve, r = Math.sign(e.x - t.x) * He;
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
function it(e) {
	let t = e[e.length - 1], n = t.points[t.points.length - 1], r = t.points.length > 1 ? t.points[t.points.length - 2] : e.length > 1 ? e[e.length - 2].points[e[e.length - 2].points.length - 1] : null;
	if (r === null) return null;
	let i = n.x - r.x, a = n.y - r.y, o = Math.hypot(i, a);
	if (o === 0) return null;
	let s = i / o, c = a / o, l = n.x - s * Ue, u = n.y - c * Ue, d = We / 2;
	return `M${E(n.x)},${E(n.y)} L${E(l - c * d)},${E(u + s * d)} L${E(l + c * d)},${E(u - s * d)} Z`;
}
function E(e) {
	return Math.round(e * 100) / 100;
}
function at(e) {
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
function D(e, t) {
	return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function ot(e, t) {
	return t.x >= e.x && t.y >= e.y && t.x + t.width <= e.x + e.width && t.y + t.height <= e.y + e.height;
}
var st = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0
}, ct = 48, lt = 1 / 12;
function ut(e, t, n, r, i, a = ct, o = st) {
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
function dt(e, t, n, r, i, a, o = 8) {
	let s = 0, c = 0, l = 0, u = 0;
	for (let e of a) {
		if (e.width <= 0 || e.height <= 0 || e.x >= t) continue;
		let n = e.y + e.height + o;
		c = Math.max(c, n), e.width >= t / 2 ? s = Math.max(s, n) : e.x + e.width / 2 < t / 2 ? l = Math.max(l, e.x + e.width + o) : u = Math.max(u, t - e.x + o);
	}
	let d = Math.min(ct, t * lt), f = ut(e, t, n, r, i, d, {
		top: s,
		right: u,
		bottom: 0,
		left: l
	}), p = ut(e, t, n, r, i, d, {
		top: c,
		right: 0,
		bottom: 0,
		left: 0
	});
	return p.zoom > f.zoom ? p : f;
}
function ft(e, t, n, r) {
	let i = {
		x: -t.panX / t.zoom,
		y: -t.panY / t.zoom,
		width: n / t.zoom,
		height: r / t.zoom
	};
	return e.some((e) => D(e, i));
}
function pt(e, t, n, r, i, a, o) {
	let s = n <= 0 ? e.zoom : Math.min(o, Math.max(a, e.zoom * (i / n))), c = (t.x - e.panX) / e.zoom, l = (t.y - e.panY) / e.zoom;
	return {
		zoom: s,
		panX: r.x - c * s,
		panY: r.y - l * s
	};
}
var mt = 4;
function ht(e, t, n) {
	return Math.hypot(t.x - e.x, t.y - e.y) * n <= mt;
}
var gt = 3;
function _t(e, t) {
	let n = t * gt;
	return !Number.isFinite(e.y) || Math.abs(e.y) < .5 || Math.abs(e.x) > Math.abs(e.y) ? 1 : Math.exp(-Math.max(-n, Math.min(n, e.y)) * Math.log(1.1) / t);
}
function O(e, t, n) {
	return n && t > 0 ? Math.round(e / t) * t : e;
}
function vt(e, t, n) {
	let r = n.x - t.x, i = n.y - t.y, a = r * r + i * i;
	if (a === 0) return Math.hypot(e.x - t.x, e.y - t.y);
	let o = Math.min(1, Math.max(0, ((e.x - t.x) * r + (e.y - t.y) * i) / a));
	return Math.hypot(e.x - (t.x + o * r), e.y - (t.y + o * i));
}
function yt(e) {
	let t = e.getPointAtLength(e.getTotalLength() / 2);
	return {
		x: t.x,
		y: t.y
	};
}
//#endregion
//#region src/canvas/canvas-selection.ts
var bt = class {
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
	get any() {
		return this.selection.size + this.selectedEdges.size > 0;
	}
	has(e) {
		return this.selection.has(e);
	}
	hasEdge(e) {
		return this.selectedEdges.has(e);
	}
	pruneNodes(e) {
		for (let t of [...this.selection]) e.has(t) || this.selection.delete(t);
		this.changed();
	}
	changed() {
		this.host.chosenChanged(this.any);
	}
	select(e, t) {
		t || this.selection.clear(), t && this.selection.has(e) ? this.selection.delete(e) : this.selection.add(e), this.selectedEdges.clear(), this.markSelection();
	}
	clearSelection() {
		this.selection.clear(), this.selectedEdges.clear(), this.markSelection(), this.host.drawEdges();
	}
	clearSets() {
		this.selection.clear(), this.selectedEdges.clear(), this.changed();
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
		this.changed();
	}
	selectAll(e) {
		for (let t of e) this.selection.add(t);
		this.markSelection();
	}
	markSelection() {
		for (let [e, t] of this.nodeElements) t.toggleAttribute(r, this.selection.has(e));
		for (let e of this.groupLayer.querySelectorAll(`[${n}]`)) e.toggleAttribute(r, this.selection.has(e.getAttribute(n)));
		this.changed();
	}
	toggleEdge(e, t) {
		t || this.selectedEdges.clear(), this.selectedEdges.has(e) ? this.selectedEdges.delete(e) : this.selectedEdges.add(e), this.changed();
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
			t !== null && (D(i, t) || this.beforeMarquee.has(e.id) ? this.selection.add(e.id) : this.selection.delete(e.id));
		}
		this.markSelection();
	}
};
function k(e) {
	return e.ctrlKey || e.metaKey;
}
//#endregion
//#region src/canvas/canvas-drag.ts
var xt = {
	width: 1,
	height: 1
}, St = 120, Ct = class {
	selection;
	host;
	settings;
	constructor(e, t, n) {
		this.selection = e, this.host = t, this.settings = n;
	}
	beginNodeDrag(e, t, n) {
		if (this.selection.has(t) ? k(e) && this.selection.select(t, !0) : this.selection.select(t, k(e)), this.settings.readOnly) return null;
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
			nodeId: t,
			startX: n.x,
			startY: n.y,
			moving: r
		};
	}
	itemsById() {
		return new Map(this.host.items().map((e) => [e.id, e]));
	}
	beginResize(e, t, r) {
		let i = e.getAttribute(n);
		return t.setAttribute(c, ""), {
			kind: "resize",
			of: i === null ? "node" : "group",
			id: i ?? e.getAttribute("data-ui-graph-node"),
			grip: t,
			startX: r.x,
			startY: r.y,
			width: e.offsetWidth,
			height: e.offsetHeight,
			least: i === null ? xt : this.groupLeast(e)
		};
	}
	groupLeast(e) {
		return {
			width: St,
			height: (e.querySelector(".ui-graph__group-band")?.offsetHeight ?? 0) + this.settings.gridSize + (e.offsetHeight - e.clientHeight)
		};
	}
	beginGroupDrag(e, t, n) {
		let r = this.findGroup(t);
		if (r === void 0 || (this.selection.select(t, k(e)), this.settings.readOnly || r.pinned === !0)) return null;
		let i = /* @__PURE__ */ new Map();
		for (let e of wt(r, this.host.items(), (e) => this.host.nodeRect(e))) e.pinned !== !0 && i.set(e.id, {
			x: e.x,
			y: e.y
		});
		return {
			kind: "group",
			startX: n.x,
			startY: n.y,
			groupId: t,
			origin: {
				x: r.x,
				y: r.y
			},
			moving: i
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
	resize(e, t) {
		let n = Math.max(e.least.width, e.width + (t.x - e.startX)), r = Math.max(e.least.height, e.height + (t.y - e.startY));
		e.of === "node" ? this.resizeNode(e.id, n, r) : this.resizeGroup(e.id, n, r);
	}
	resizeNode(e, t, n) {
		let r = this.itemsById().get(e), i = this.host.nodeElements.get(e);
		r !== void 0 && i !== void 0 && this.resizeItem(r, i, t, n);
	}
	resizeItem(e, t, n, r) {
		t.style.setProperty("--ui-graph-node-w", String(Math.max(1, Math.round(n)))), t.style.setProperty("--ui-graph-node-h", String(Math.max(1, Math.round(r)))), e.width = t.offsetWidth, e.height = t.offsetHeight, this.host.drawEdges(), this.host.drawMinimap();
	}
	resizeGroup(e, t, n) {
		let r = this.findGroup(e);
		r !== void 0 && (r.width = Math.round(t), r.height = Math.round(n), this.host.drawGroups(), this.host.drawMinimap());
	}
	snapNodes(e) {
		let t = this.settings.gridSize, n = this.itemsById(), r = new Set(e);
		for (let e of r) {
			let i = n.get(e);
			if (i === void 0) continue;
			let a = this.snapPlace(e, i, t);
			i.y = this.levelTop(e, i.y, r, t) ?? a.y, i.x = a.x, this.placeNode(e, i);
		}
	}
	levelTop(e, t, n, r) {
		let i = null;
		for (let a of this.host.kind().levelTops?.(e, n) ?? []) Math.abs(a - t) <= r / 2 && (i === null || Math.abs(a - t) < Math.abs(i - t)) && (i = a);
		return i;
	}
	snapPlace(e, t, n = this.settings.gridSize) {
		let r = this.host.kind().snapsByCenter === !0 ? this.host.nodeElements.get(e) : void 0, i = (r?.offsetWidth ?? 0) / 2, a = (r?.offsetHeight ?? 0) / 2;
		return {
			x: O(t.x + i, n, !0) - i,
			y: O(t.y + a, n, !0) - a
		};
	}
	snapSize(e) {
		if (e.of === "node") {
			this.snapNodeSize(e.id);
			return;
		}
		let t = this.findGroup(e.id);
		if (t === void 0) return;
		let n = this.settings.gridSize;
		t.width = Math.max(Tt(e.least.width, n), O(t.width, n, !0)), t.height = Math.max(Tt(e.least.height, n), O(t.height, n, !0)), this.host.drawGroups();
	}
	snapNodeSize(e) {
		let t = this.itemsById().get(e), n = this.host.nodeElements.get(e);
		if (t === void 0 || n === void 0) return;
		let r = this.settings.gridSize;
		this.resizeItem(t, n, O(n.offsetWidth, r, !0), O(n.offsetHeight, r, !0)), Et(n, r), t.width = n.offsetWidth, t.height = n.offsetHeight;
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
function wt(e, t, n) {
	let r = {
		x: e.x,
		y: e.y,
		width: e.width,
		height: e.height
	};
	return t.filter((e) => {
		let t = n(e.id);
		return t !== null && ot(r, t);
	});
}
function Tt(e, t) {
	return t > 0 ? Math.ceil(e / t) * t : e;
}
function Et(e, t) {
	Dt([e], t);
}
function Dt(e, t) {
	if (t <= 0) return;
	let n = [...e].map((e) => ({
		element: e,
		width: e.offsetWidth,
		height: e.offsetHeight,
		folded: e.hasAttribute(d)
	}));
	for (let { element: e, width: r, height: i, folded: a } of n) {
		let n = Math.ceil((r - .5) / t) * t, o = Math.ceil((i - .5) / t) * t;
		n !== r && e.style.setProperty("--ui-graph-node-w", String(n)), o !== i && !a && e.style.setProperty("--ui-graph-node-h", String(o));
	}
}
//#endregion
//#region src/canvas/side-panel.ts
var Ot = `[${_.collapseToggle}]`, kt = _.collapsed, At = "folded", jt = "open", Mt = "--ui-graph-side-folded";
function Nt(e, t, n) {
	Pt(e ?? t, n)?.focus({ preventScroll: !0 });
}
function Pt(e, t) {
	return e === null || e.tabIndex >= 0 ? e : t.first(e);
}
var Ft = class {
	store;
	root;
	panel;
	slot;
	foldedByDefault;
	constructor(e, t, n, r) {
		this.store = e, this.root = t, this.panel = n, this.slot = r, this.foldedByDefault = n !== null && (n.hasAttribute(kt) || It(n));
		let i = e.read(t, r), a = i === At || i !== jt && this.foldedByDefault;
		n !== null && a !== n.hasAttribute(kt) && (n.toggleAttribute(kt, a), n.querySelector(Ot)?.setAttribute("aria-expanded", a ? "false" : "true"));
	}
	press(e) {
		if (this.panel === null || !this.panel.contains(e) || e.closest(Ot) === null) return !1;
		let t = this.panel.hasAttribute(kt);
		return this.store.write(this.root, this.slot, t === this.foldedByDefault ? null : t ? At : jt), !0;
	}
};
function It(e) {
	return getComputedStyle(e).getPropertyValue(Mt).trim() === "1";
}
//#endregion
//#region src/canvas/canvas-menus.ts
var Lt = "data-ui-graph-colors", A = "graph-node-menu", Rt = "graph-group-menu", zt = "graph-edge-menu", Bt = "data-ui-graph-swatch", Vt = "graph:color:", Ht = "graph:color:default", Ut = "menu", Wt = 480, Gt = 280, Kt = class {
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
	cornerFold;
	menuTarget = null;
	constructor(e, t, n, r, i, a, o, s) {
		this.root = e, this.context = t, this.documentState = n, this.selection = r, this.view = i, this.settings = a, this.host = o, this.groupLayer = s, this.colors = qt(e.getAttribute(Lt)), this.scope = {
			root: e,
			context: t
		}, this.cornerFold = new Ft(t.store, e, e.querySelector(`[${h}]`), Ut);
	}
	foldCorner(e) {
		return this.cornerFold.press(e);
	}
	prepareMenus(e) {
		if (!(e instanceof Element) || e.closest(Xt(this.scope)) !== null) return;
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
		this.host.kind().syncMenus(e, this.menuTarget), this.enableEntries("graph:arrange", e), this.enableEntries("graph:save", e), this.enableEntries("graph:add-group", e), this.enableEntries("graph:group-selection", e && t);
		let n = this.host.kind().canEditItems(), r = this.documentState.document.groups.some((e) => this.selection.has(e.id));
		this.enableEntries("graph:delete-selection", e && (r || n && this.selection.any)), this.enableEntries("graph:delete", e && n);
		let i = this.host.kind(), a = this.menuTarget?.kind === "node" ? this.menuTarget.id : null;
		this.enableEntries("graph:duplicate-selection", e && [...this.selection.nodeIds].some((e) => i.canDuplicate(e))), this.enableEntries("graph:duplicate", e && a !== null && i.canDuplicate(a)), this.enableEntries("graph:disconnect-all", e && a !== null && i.canDisconnect(a));
		for (let t of [A, Rt]) {
			let n = this.root.querySelector(`[${this.context.names.contextMenu}="${t}"]`), r = this.menuItem(t);
			if (n === null) continue;
			for (let t of N({
				root: n,
				context: this.context
			}, "graph:pin")) Qt(t, r?.pinned === !0, this.context.names), this.context.states.setDisabled(t, !e);
			let i = e && (t === "graph-group-menu" || this.host.kind().canEditItems());
			for (let e of N({
				root: n,
				context: this.context
			}, "graph:rename")) this.context.states.setDisabled(e, !i);
			this.syncColors(n, r?.color ?? null, i);
		}
	}
	enableEntries(e, t) {
		j(this.scope, e, t);
	}
	syncColors(e, t, n) {
		let r = this.context.names.key, i = "";
		for (let n of e.querySelectorAll(`[${r}^="${Vt}"]`)) {
			let e = Zt(n, this.context.names), a = n.getAttribute(r) ?? "", o = a === Ht ? null : this.colors[Number(a.slice(12))] ?? null, s = o === null ? t === null || t.length === 0 : o === t;
			e !== null && (e.setAttribute(Bt, ""), e.style.setProperty("--ui-graph-swatch", o ?? "transparent"), Qt(e, s, this.context.names), s && (i = e.textContent?.trim() ?? ""));
		}
		for (let t of N({
			root: e,
			context: this.context
		}, "graph:color")) {
			this.context.states.setDisabled(t, !n);
			let e = t.querySelector(`.${_.menuItemValueClass}`);
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
		if (e.startsWith(Vt)) this.paintItems(t, e);
		else switch (e) {
			case "graph:delete-selection":
			case "graph:delete":
				this.host.deleteSelection();
				break;
			case "graph:add-group":
				this.addGroup();
				break;
			case "graph:group-selection":
				this.groupSelection();
				break;
			case "graph:duplicate-selection":
				this.host.duplicate(this.selection.nodeIds);
				break;
			case "graph:duplicate":
				this.host.duplicate(new Set(this.menuItems(A).map((e) => e.id)));
				break;
			case "graph:disconnect-all":
				this.disconnectItems();
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
	disconnectItems() {
		let e = this.menuItems(A);
		e.length !== 0 && !this.settings.readOnly && this.host.kind().disconnect(new Set(e.map((e) => e.id))) && this.documentState.edited();
	}
	pinItems(e) {
		let t = this.menuItems(e);
		if (t.length === 0 || this.settings.readOnly) return;
		let n = t[0].pinned !== !0;
		for (let e of t) e.pinned = n;
		this.documentState.edited(), this.syncMenus();
	}
	paintItems(e, t) {
		let n = this.menuItems(e), r = t === Ht ? null : this.colors[Number(t.slice(12))];
		if (!(n.length === 0 || this.settings.readOnly || r === void 0)) {
			for (let t of n) (e !== "graph-node-menu" || !this.host.kind().paintItem(t.id, r)) && (t.color = r);
			this.documentState.edited(), this.syncMenus();
		}
	}
	renameItem(e) {
		let t = this.menuItem(e);
		t !== void 0 && this.openRename(t, e === A);
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
	addGroup() {
		if (this.settings.readOnly) return;
		let e = T("g"), t = this.host.snapPlace(e, this.host.pointerScene()), n = this.settings.gridSize, r = this.settings.snapping;
		this.documentState.document.groups.push({
			id: e,
			x: t.x,
			y: t.y,
			width: Math.max(n, O(Wt, n, r)),
			height: Math.max(n, O(Gt, n, r)),
			title: null,
			color: null
		}), this.selection.select(e, !1), this.documentState.edited();
	}
	groupSelection() {
		if (this.settings.readOnly || this.selection.size === 0) return;
		let e = [];
		for (let t of this.selection.nodeIds) {
			let n = this.host.nodeRect(t);
			n !== null && e.push(n);
		}
		let t = at(e);
		t !== null && (this.documentState.document.groups.push({
			id: T("g"),
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
function qt(e) {
	let t = C(e);
	return Array.isArray(t) ? t.map((e) => String(e)) : [];
}
function Jt(e, t, n, r) {
	let i = document.createElement("span");
	i.setAttribute(e.context.names.contextMenuUse, t), i.hidden = !0, (e.root.querySelector(".ui-graph__viewport") ?? e.root).append(i), i.dispatchEvent(new MouseEvent("contextmenu", {
		bubbles: !0,
		cancelable: !0,
		button: 2,
		clientX: n,
		clientY: r
	})), i.remove();
}
function j(e, t, n) {
	for (let r of N(e, t)) e.context.states.setDisabled(r, !n);
}
function Yt(e, t, n) {
	for (let r of N(e, t)) Qt(r, n, e.context.names);
}
function M(e, t, n) {
	for (let r of N(e, t)) {
		let t = r.closest(`[${e.context.names.key}]`) ?? r;
		t.style.display = n ? "" : "none";
	}
}
function Xt(e) {
	return `[${e.context.names.contextMenu}], [${h}]`;
}
function N(e, t) {
	let n = [];
	for (let r of e.root.querySelectorAll(`:is(${Xt(e)}) [${e.context.names.key}="${CSS.escape(t)}"]`)) {
		let t = Zt(r, e.context.names);
		t !== null && n.push(t);
	}
	return n;
}
function Zt(e, t) {
	return e.classList.contains(t.menuItemClass) ? e : e.querySelector(`:scope > .${t.menuItemClass}`);
}
function Qt(e, t, n) {
	e.classList.toggle(n.menuItemCheckedClass, t), e.setAttribute("aria-checked", String(t));
}
//#endregion
//#region src/canvas/canvas-render.ts
var $t = "center", P = "http://www.w3.org/2000/svg", en = "ui-graph--edge-focus", F = "data-ui-graph-related", tn = [
	.5,
	.38,
	.62,
	.26,
	.74
], nn = 4, rn = class {
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
			this.drawnItems.set(n.id, n), this.selection.has(n.id) && i.setAttribute(r, ""), i.setAttribute(this.context.names.contextMenuUse, A), this.settings.nodeActionBar && (i.setAttribute(this.context.names.actionBar, $t), i.setAttribute(this.context.names.actionBarKey, n.id), this.settings.nodeActionBarRepeats || i.setAttribute(this.context.names.actionBarRest, "")), this.nodeLayer.append(i), this.nodeElements.set(n.id, i), t.add(n.id);
		}
		let n = new Set(t);
		for (let e of this.documentState.document.groups) n.add(e.id);
		this.selection.pruneNodes(n), e.itemsDrawn(t), this.watchSizes(), this.markFocus();
	}
	watchSizes() {
		for (let [e, t] of this.nodeElements) this.nodeBoxes.set(e, on(t));
		for (let [e, t] of this.nodeElements) this.nodeWatchers.push(this.context.observeSize(t, () => this.nodeResized(e, t)));
	}
	nodeResized(e, t) {
		let n = on(t);
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
			if (i.className = "ui-graph__group-band", i.setAttribute(this.context.names.contextMenuUse, Rt), a.className = "ui-graph__group-title", a.textContent = e.title ?? this.context.strings.text("ui.graph.group"), i.append(a), e.pinned === !0) {
				let e = document.createElement("span");
				e.className = "ui-graph__group-pinned", e.setAttribute("aria-hidden", "true"), this.context.icons.apply(e, "ne-pin"), i.append(e);
			}
			t.append(i), this.settings.readOnly || t.append(ae()), this.groupLayer.append(t);
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
		this.root.classList.toggle(en, t !== null && t.size > 0);
		for (let [e, n] of this.edgeParts) for (let r of n) r.toggleAttribute(F, t !== null && t.has(e));
		for (let [e, t] of this.nodeElements) t.toggleAttribute(F, n !== null && n.has(e));
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
			let f = e.edgeColor(c), p = c.points.length === 0 && l.via !== void 0 ? l.via : c.points, m = Ge(this.settings.edgeShape, l.from, l.to, p, {
				axis: l.axis,
				back: l.back,
				loop: l.loop,
				arrow: l.arrow,
				reversed: l.reversed,
				turns: c.points.length === 0 ? l.turns : void 0
			}), h = document.createElementNS(P, "path");
			h.setAttribute("d", m.path), h.setAttribute("class", l.back === !0 ? "ui-graph__edge ui-graph__edge--back" : "ui-graph__edge"), h.setAttribute(i, c.id), h.style.setProperty("--ui-graph-pin-color", f), this.selection.hasEdge(c.id) && h.setAttribute(r, ""), l.conflict === !0 && h.setAttribute("data-ui-graph-conflict", "changed"), t && h.setAttribute(this.context.names.contextMenuUse, zt), h.toggleAttribute(F, d), this.edgeLayer.append(h), u.push(h);
			let g = l.back === !0 ? "ui-graph__edge-line ui-graph__edge-line--back" : "ui-graph__edge-line", _ = `${m.path}|${f}|${g}`, v = this.paintedEdges.get(c.id), y = v !== void 0 && v.from === _ ? v.group : an(m, f, g);
			if (s.set(c.id, {
				from: _,
				group: y
			}), y.toggleAttribute(r, this.selection.hasEdge(c.id)), y.toggleAttribute(F, d), this.edgeLayer.append(y), u.push(y), m.arrow !== null) {
				let e = document.createElementNS(P, "path");
				e.setAttribute("d", m.arrow), e.setAttribute("class", "ui-graph__edge-arrow"), e.style.setProperty("--ui-graph-pin-color", f), e.toggleAttribute(F, d), this.edgeLayer.append(e), u.push(e);
			}
			l.label !== null && l.label !== void 0 && l.label.length > 0 && u.push(this.drawLabel(h, l.label, c.id, t, d, o)), c.points.forEach((e, t) => {
				let n = document.createElementNS(P, "circle");
				n.setAttribute("class", "ui-graph__reroute"), n.setAttribute(a, c.id), n.setAttribute("data-ui-graph-reroute-index", String(t)), n.setAttribute("cx", String(e.x)), n.setAttribute("cy", String(e.y)), n.setAttribute("r", "4"), n.style.setProperty("--ui-graph-pin-color", f), n.toggleAttribute(F, d), this.edgeLayer.append(n), u.push(n);
			});
		}
		this.paintedEdges = s, this.placeLabels(o), this.markFocus();
	}
	drawLabel(e, t, n, r, a, o) {
		let s = document.createElement("span");
		return s.className = "ui-graph__edge-label", s.setAttribute(i, n), r && s.setAttribute(this.context.names.contextMenuUse, zt), s.textContent = t, s.toggleAttribute(F, a), this.labelLayer.append(s), o.push({
			chip: s,
			path: e
		}), s;
	}
	placeLabels(e) {
		let t = e.map(({ chip: e }) => ({
			width: e.offsetWidth,
			height: e.offsetHeight
		})), n = [], r = e.map(({ path: e }, r) => {
			let { width: i, height: a } = t[r], o = this.labelPlace(e, i, a, n);
			return i > 0 && n.push({
				...o,
				width: i,
				height: a
			}), o;
		});
		e.forEach(({ chip: e }, t) => {
			e.style.left = `${r[t].x}px`, e.style.top = `${r[t].y}px`;
		});
	}
	labelPlace(e, t, n, r) {
		let i = e.getTotalLength();
		for (let a of tn) {
			let o = a === .5 ? yt(e) : e.getPointAtLength(i * a), s = {
				x: o.x - t / 2,
				y: o.y - n / 2
			}, c = {
				...s,
				width: t,
				height: n
			};
			if (t === 0 || !this.coversNode(c) && !r.some((e) => D(c, e))) return s;
		}
		return this.stepAcross(e, t, n, r);
	}
	coversNode(e) {
		return this.labelObstacles ??= [...this.nodeElements.keys()].map((e) => this.nodeRect(e)).filter((e) => e !== null), this.labelObstacles.some((t) => D(e, t));
	}
	stepAcross(e, t, n, r) {
		let i = e.getTotalLength(), a = yt(e), o = e.getPointAtLength(Math.max(0, i / 2 - 1)), s = e.getPointAtLength(Math.min(i, i / 2 + 1)), c = Math.abs(s.y - o.y) >= Math.abs(s.x - o.x), l = {
			x: a.x - t / 2,
			y: a.y - n / 2,
			width: t,
			height: n
		};
		for (let e = 0; e < r.length; e++) {
			let e = r.find((e) => D(l, e));
			if (e === void 0) break;
			c ? l.x = l.x + t / 2 < e.x + e.width / 2 ? e.x - t - nn : e.x + e.width + nn : l.y = l.y + n / 2 < e.y + e.height / 2 ? e.y - n - nn : e.y + e.height + nn;
		}
		return {
			x: l.x,
			y: l.y
		};
	}
	drawPending(e, t, n) {
		this.clearPending(), this.edgeLayer.append(an(Ge(this.settings.edgeShape, e, t), n, "ui-graph__edge-line ui-graph__edge-line--pending"));
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
function an(e, t, n) {
	let r = document.createElementNS(P, "g");
	if (r.setAttribute("class", n), r.style.setProperty("--ui-graph-pin-color", t), e.pieces === null) {
		let t = document.createElementNS(P, "path");
		return t.setAttribute("d", e.path), r.append(t), r;
	}
	for (let t of e.pieces) {
		let e = document.createElementNS(P, "line");
		e.setAttribute("x1", I(t.x1)), e.setAttribute("y1", I(t.y1)), e.setAttribute("x2", I(t.x2)), e.setAttribute("y2", I(t.y2)), t.along > 0 && e.setAttribute("stroke-dashoffset", I(t.along)), r.append(e);
	}
	return r;
}
function I(e) {
	return String(Math.round(e * 100) / 100);
}
function on(e) {
	return `${e.offsetWidth}x${e.offsetHeight}`;
}
//#endregion
//#region src/canvas/canvas-settings.ts
var sn = "data-ui-graph-edge-shape", cn = "data-ui-graph-snap", ln = "data-ui-graph-highlight", un = "data-ui-graph-auto-save", dn = "data-ui-graph-direction", fn = "data-ui-graph-node-shape", pn = "data-ui-graph-edit-structure", mn = "data-ui-graph-mode", hn = "data-ui-graph-node-action-bar", gn = "data-ui-graph-node-action-bar-repeat", _n = "data-ui-graph-min-zoom", vn = "data-ui-graph-max-zoom", yn = class {
	root;
	readOnlyClass;
	constructor(e, t) {
		this.root = e, this.readOnlyClass = t;
	}
	get readOnly() {
		return this.root.classList.contains(this.readOnlyClass);
	}
	get edgeShape() {
		let e = this.root.getAttribute(sn);
		return e === "straight" || e === "bezier" ? e : "orthogonal";
	}
	get snapping() {
		return this.root.hasAttribute(cn);
	}
	get highlightOnHover() {
		return this.root.hasAttribute(ln);
	}
	get autoSave() {
		return this.root.hasAttribute(un);
	}
	get gridSize() {
		return Number(getComputedStyle(this.root).getPropertyValue("--ui-graph-grid-size")) || 20;
	}
	get nodeActionBar() {
		return this.root.hasAttribute(hn);
	}
	get nodeActionBarRepeats() {
		return this.root.hasAttribute(gn);
	}
	get minZoom() {
		return Number(this.root.getAttribute(_n)) || .25;
	}
	get maxZoom() {
		return Number(this.root.getAttribute(vn)) || 2.5;
	}
}, bn = ".ui-graph__grid", xn = 250, Sn = class {
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
	stopSizeWatch = null;
	viewKept;
	opened = !1;
	stopOpenWatch = null;
	constructor(e, t, n, r) {
		this.root = e, this.settings = t, this.context = n, this.store = n.store, this.host = r, this.viewport = e.querySelector(".ui-graph__viewport"), this.scene = e.querySelector(".ui-graph__scene"), this.grid = e.querySelector(bn), this.zoomLabel = e.querySelector("[data-ui-graph-zoom]"), this.minimap = e.querySelector("[data-ui-graph-map]"), this.minimapNodes = e.querySelector("[data-ui-graph-map-nodes]"), this.minimapView = e.querySelector("[data-ui-graph-map-view]"), this.viewKept = n.store.readJson(e, "view") !== null, this.watchSize();
	}
	watchSize() {
		this.stopSizeWatch ??= this.context.observeSize(this.viewport, () => this.viewportResized());
	}
	viewportResized() {
		let e = this.viewport.clientWidth, t = this.viewport.clientHeight;
		!this.fitted || e === 0 || t === 0 || e === this.fittedWidth && t === this.fittedHeight || (this.fittedWidth === 0 ? (this.fittedWidth = e, this.fittedHeight = t) : this.fit());
	}
	dispose() {
		this.stopSizeWatch?.(), this.stopSizeWatch = null, this.stopOpenWatch?.(), this.stopOpenWatch = null;
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
		e !== null && (this.zoomValue = Math.min(this.settings.maxZoom, Math.max(this.settings.minZoom, Number(e.zoom) || 1)), this.panXValue = Number(e.panX) || 0, this.panYValue = Number(e.panY) || 0, this.fitted = e.fitted === !0, this.fittedWidth = this.fitted ? Number(e.width) || this.viewport.clientWidth : 0, this.fittedHeight = this.fitted ? Number(e.height) || this.viewport.clientHeight : 0);
	}
	applyView() {
		this.scene.style.transform = `translate(${this.panXValue}px, ${this.panYValue}px) scale(${this.zoomValue})`, this.grid?.style.setProperty("--ui-graph-zoom", String(this.zoomValue)), this.grid?.style.setProperty("--ui-graph-pan-x", `${this.panXValue}px`), this.grid?.style.setProperty("--ui-graph-pan-y", `${this.panYValue}px`), this.drawZoom(), this.placeMinimapView(), this.viewport.dispatchEvent(new Event("scroll")), clearTimeout(this.keepTimer), this.keepTimer = setTimeout(() => this.keepView(), xn);
	}
	drawZoom() {
		let e = Math.round(this.zoomValue * 100);
		this.zoomLabel !== null && e !== this.zoomShare && (this.zoomShare = e, this.zoomLabel.textContent = re(this.context, this.zoomLabel, e));
	}
	wordsChanged() {
		this.zoomShare = NaN, this.drawZoom();
	}
	keepView() {
		this.keepTimer = void 0, this.store.write(this.root, "view", JSON.stringify({
			zoom: this.zoomValue,
			panX: this.panXValue,
			panY: this.panYValue,
			fitted: this.fitted,
			width: this.fittedWidth,
			height: this.fittedHeight
		}), {
			selector: bn,
			styles: {
				"--ui-graph-zoom": String(this.zoomValue),
				"--ui-graph-pan-x": `${this.panXValue}px`,
				"--ui-graph-pan-y": `${this.panYValue}px`
			}
		});
	}
	showsAnyItem() {
		let e = this.host.items().flatMap((e) => this.host.nodeRect(e.id) ?? []), t = this.visibleRect();
		return ft(e, {
			zoom: this.zoomValue,
			panX: this.panXValue,
			panY: this.panYValue
		}, t.width, t.height);
	}
	fitSheet() {
		this.root.offsetWidth > 0 ? this.fitUnlessKept() : this.stopOpenWatch ??= this.context.observeSize(this.root, () => {
			this.root.offsetWidth !== 0 && (this.stopOpenWatch?.(), this.stopOpenWatch = null, this.fitUnlessKept());
		});
	}
	fitUnlessKept() {
		(this.opened || !this.viewKept || !this.showsAnyItem()) && this.fit(), this.opened = !0;
	}
	fit() {
		let e = this.contentBounds(!0);
		if (e === null) return;
		let t = this.visibleRect(), n = dt(e, t.width, t.height, this.settings.minZoom, Math.min(1, this.settings.maxZoom), this.topChrome());
		this.zoomValue = n.zoom, this.panXValue = n.panX, this.panYValue = n.panY, this.fitted = !0, this.fittedWidth = this.viewport.clientWidth, this.fittedHeight = this.viewport.clientHeight, this.applyView();
	}
	topChrome() {
		let e = this.viewport.getBoundingClientRect(), t = e.left + this.viewport.clientLeft, n = e.top + this.viewport.clientTop;
		return Array.from(this.viewport.querySelectorAll(y), (e) => {
			let r = e.getBoundingClientRect();
			return {
				x: r.left - t,
				y: r.top - n,
				width: r.width,
				height: r.height
			};
		});
	}
	visibleRect() {
		let e = this.viewport.querySelector(`[${g}]:not([${v}])`), t = e === null || e.offsetWidth === 0 ? 0 : this.viewport.clientWidth - e.offsetLeft;
		return {
			x: 0,
			y: 0,
			width: this.viewport.clientWidth - t,
			height: this.viewport.clientHeight
		};
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
	pinchTo(e) {
		(e.zoom !== this.zoomValue || e.panX !== this.panXValue || e.panY !== this.panYValue) && (this.zoomValue = e.zoom, this.panXValue = e.panX, this.panYValue = e.panY, this.fitted = !1, this.applyView());
	}
	dragPan(e, t, n) {
		(e.x + t !== this.panXValue || e.y + n !== this.panYValue) && (this.panXValue = e.x + t, this.panYValue = e.y + n, this.fitted = !1, this.applyView());
	}
	centerOnRect(e, t, n) {
		this.panXValue = this.visibleRect().width / 2 - (e.x + e.width / 2) * this.zoomValue, this.panYValue = t + (this.viewport.clientHeight - t - n) / 2 - (e.y + e.height / 2) * this.zoomValue, this.fitted = !1, this.applyView();
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
		return at(t);
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
		if (this.minimapPlace = e, !(e.scale > 0)) this.minimap.hidden = !0;
		else {
			for (let t of this.host.items()) {
				let n = this.host.nodeRect(t.id);
				if (n === null) continue;
				let r = document.createElement("i"), i = this.host.itemColor(t);
				r.className = "ui-graph__minimap-node", r.style.left = `${e.offsetX + (n.x - this.minimapContent.x) * e.scale}px`, r.style.top = `${e.offsetY + (n.y - this.minimapContent.y) * e.scale}px`, r.style.width = `${Math.max(2, n.width * e.scale)}px`, r.style.height = `${Math.max(2, n.height * e.scale)}px`, i.length > 0 && (r.style.background = i), this.minimapNodes.append(r);
			}
			this.placeMinimapView();
		}
	}
	minimapPlacement(e) {
		let t = this.minimap;
		if (t === null) return {
			scale: 0,
			offsetX: 0,
			offsetY: 0
		};
		let n = getComputedStyle(t), r = Number.parseFloat(n.paddingLeft) || 0, i = Number.parseFloat(n.paddingTop) || 0, a = t.clientWidth - r - (Number.parseFloat(n.paddingRight) || 0), o = t.clientHeight - i - (Number.parseFloat(n.paddingBottom) || 0), s = Math.min(a / Math.max(1, e.width), o / Math.max(1, e.height));
		return {
			scale: s,
			offsetX: r + (a - e.width * s) / 2,
			offsetY: i + (o - e.height * s) / 2
		};
	}
	placeMinimapView() {
		let e = this.minimapPlace;
		if (this.minimapView === null || this.minimapContent === null || e === null) return;
		let t = {
			x: -this.panXValue / this.zoomValue,
			y: -this.panYValue / this.zoomValue,
			width: this.visibleRect().width / this.zoomValue,
			height: this.viewport.clientHeight / this.zoomValue
		};
		this.minimapView.style.left = `${e.offsetX + (t.x - this.minimapContent.x) * e.scale}px`, this.minimapView.style.top = `${e.offsetY + (t.y - this.minimapContent.y) * e.scale}px`, this.minimapView.style.width = `${t.width * e.scale}px`, this.minimapView.style.height = `${t.height * e.scale}px`;
	}
	minimapPan(e) {
		let t = this.minimapPlace;
		if (this.minimap === null || this.minimapContent === null || t === null) return;
		let n = this.minimap.getBoundingClientRect(), r = this.minimapContent.x + (e.clientX - n.left - this.minimap.clientLeft - t.offsetX) / t.scale, i = this.minimapContent.y + (e.clientY - n.top - this.minimap.clientTop - t.offsetY) / t.scale, a = this.visibleRect();
		this.panXValue = a.width / 2 - r * this.zoomValue, this.panYValue = a.height / 2 - i * this.zoomValue, this.fitted = !1, this.applyView();
	}
}, Cn = class {
	touches = /* @__PURE__ */ new Map();
	pinch = null;
	get pinching() {
		return this.pinch !== null;
	}
	down(e, t, n) {
		if (this.touches.set(e, t), this.pinch !== null || this.touches.size !== 2) return !1;
		let [r, i] = [...this.touches.keys()], [a, o] = [this.touches.get(r), this.touches.get(i)];
		return this.pinch = {
			fingers: [r, i],
			view: {
				zoom: n.zoom,
				panX: n.panX,
				panY: n.panY
			},
			mid: wn(a, o),
			distance: Math.hypot(o.x - a.x, o.y - a.y)
		}, !0;
	}
	move(e, t, n, r) {
		if (!this.touches.has(e)) return null;
		this.touches.set(e, t);
		let i = this.pinch;
		if (i === null || !i.fingers.includes(e)) return null;
		let a = this.touches.get(i.fingers[0]), o = this.touches.get(i.fingers[1]);
		return pt(i.view, i.mid, i.distance, wn(a, o), Math.hypot(o.x - a.x, o.y - a.y), n, r);
	}
	up(e) {
		this.touches.delete(e);
		let t = this.pinch;
		if (t === null || !t.fingers.includes(e)) return {
			ended: !1,
			left: null
		};
		this.pinch = null;
		let n = t.fingers[0] === e ? t.fingers[1] : t.fingers[0];
		return {
			ended: !0,
			left: this.touches.get(n) ?? null
		};
	}
};
function wn(e, t) {
	return {
		x: (e.x + t.x) / 2,
		y: (e.y + t.y) / 2
	};
}
//#endregion
//#region src/canvas/canvas.ts
var Tn = "ui-graph--panning", En = `[${l}], [${u}]`, Dn = "graph-document", On = "graph.save-document", kn = class {
	context;
	kinds = /* @__PURE__ */ new Map();
	canvases = /* @__PURE__ */ new WeakMap();
	live = /* @__PURE__ */ new Set();
	constructor(t, n) {
		this.context = t;
		for (let e of n) this.kinds.set(e.name, e);
		this.attach(t.root.querySelectorAll(e)), t.observeComponents(t.root, e, { childList: !0 }, (e) => this.attach(e)), t.observeComponents(t.root, "*", { childList: !0 }, () => this.prune()), t.observeComponents(t.root, e, { attributeFilter: [
			sn,
			cn,
			"data-ui-graph-minimap",
			dn,
			fn,
			pn,
			mn
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
			let e = this.kinds.get(t.getAttribute("data-ui-graph-kind") ?? ""), n = this.canvases.get(t);
			if (n !== void 0 && !this.live.has(n)) n.revive(), this.live.add(n);
			else if (e !== void 0 && n === void 0) {
				let n = new jn(t, this.context, e);
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
function An(e, t) {
	let n = t.target;
	if (n?.id === void 0) return null;
	let r = typeof n.id == "number" ? n.id : Number(n.id.value);
	return Number.isNaN(r) ? null : e.dom.findComponent(r, n.dynamicParameters ?? []);
}
var jn = class {
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
	pinch = new Cn();
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
			pointerScene: () => ({
				x: this.pointerX,
				y: this.pointerY
			}),
			snapPlace: (e, t) => this.settings.snapping ? this.dragging.snapPlace(e, t) : t,
			drawEdges: () => this.render.drawEdges(),
			drawGroups: () => this.render.drawGroups(),
			drawMinimap: () => this.view.drawMinimap(),
			deleteSelection: () => this.deleteSelection(),
			duplicate: (e) => this.duplicate(e),
			chosenChanged: (e) => this.viewport.toggleAttribute(t.names.ownsKeys, e)
		};
		this.settings = new yn(e, t.names.readOnlyClass), this.drawnReadOnly = this.settings.readOnly, this.documentState = new ye(e, s, this.settings, (e) => n.readDocument(e), {
			clearSelectionSets: () => this.selection.clearSets(),
			redraw: () => this.render.draw(),
			redrawEdges: () => this.render.drawEdges()
		}, t.values), this.selection = new bt(e, this.nodeElements, this.groupLayer, c), this.view = new Sn(e, this.settings, t, c), this.dragging = new Ct(this.selection, c, this.settings), this.menus = new Kt(e, t, this.documentState, this.selection, this.view, this.settings, c, this.groupLayer), this.render = new rn(t, r, i, this.groupLayer, a, o, this.nodeElements, this.documentState, this.selection, this.settings, this.view, () => this.kind), this.kind = n.create({
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
			pointerScene: c.pointerScene,
			snapPlace: c.snapPlace,
			renameItem: (e) => this.menus.renameNode(e)
		}), this.view.restoreView(), this.listen(), this.render.draw(), this.menus.syncMenus();
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
		e === null || !this.scene.contains(e) || !this.kind.isEditor(e) ? (this.wordsWaitingOn = null, this.render.draw()) : this.wordsWaitingOn !== e && (this.wordsWaitingOn = e, e.addEventListener("focusout", () => setTimeout(() => {
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
		this.render.dispose(), this.view.dispose(), this.kind.dispose?.();
	}
	revive() {
		this.view.watchSize(), this.draw();
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
	duplicate(e) {
		if (this.settings.readOnly || e.size === 0) return;
		let t = this.kind.duplicate(e);
		t !== null && t.length !== 0 && (this.selection.selectOnlyMany(t), this.documentState.edited());
	}
	deleteSelection() {
		let e = this.selection.nodeIds, t = this.selection.edgeIds;
		if (this.settings.readOnly || e.size === 0 && t.size === 0) return;
		let n = this.documentState.document, r = n.groups.length;
		n.groups = n.groups.filter((t) => !e.has(t.id)), (this.kind.remove(e, t) || n.groups.length !== r) && (this.selection.clearSets(), this.documentState.edited());
	}
	listen() {
		this.viewport.addEventListener("wheel", (e) => this.wheel(e), { passive: !1 }), this.viewport.addEventListener("pointerdown", (e) => this.pointerDown(e)), this.viewport.addEventListener("pointermove", (e) => this.pointerMove(e)), this.viewport.addEventListener("pointerup", (e) => this.pointerUp(e)), this.viewport.addEventListener("pointercancel", (e) => this.fingerTaken(e)), this.viewport.addEventListener("pointerleave", () => this.render.setFocusItem(null)), this.viewport.addEventListener("dblclick", (e) => this.doubleClick(e)), this.viewport.addEventListener("keydown", (e) => this.key(e)), this.viewport.addEventListener("click", (e) => this.click(e)), this.root.addEventListener("click", (e) => this.chrome(e)), this.root.addEventListener(_.menuOpeningEvent, (e) => this.menuOpening(e)), se(this.root, this.viewport);
	}
	menuOpening(e) {
		let t = e instanceof CustomEvent ? e.detail : null;
		t?.actionBar === !0 ? this.barOpening(e, t.target ?? null) : this.states.isInert(this.root) || this.menus.prepareMenus(t?.target ?? null);
	}
	barOpening(e, t) {
		!(t instanceof HTMLElement) || this.settings.readOnly || this.states.isInert(this.root) || this.drag !== null ? e.preventDefault() : this.menus.prepareBar(t);
	}
	wheel(e) {
		if (e.target instanceof Element && (this.isPanel(e.target) || this.kind.isEditor(e.target))) return;
		e.preventDefault();
		let t = _t(this.wheelReading.pixels(e, 400), this.wheelReading.notch);
		if (t === 1) return;
		let n = this.view.toViewport(e);
		this.view.zoomBy(t, n.x, n.y);
	}
	pointerDown(e) {
		if (e.pointerType === "touch" && this.pinch.down(e.pointerId, this.view.toViewport(e), {
			zoom: this.view.zoom,
			panX: this.view.panX,
			panY: this.view.panY
		})) {
			e.preventDefault(), this.pointerCancel(), this.viewport.setPointerCapture(e.pointerId);
			return;
		}
		if (e.button === 2) {
			let t = this.view.toViewport(e), n = this.view.toScene(t.x, t.y);
			this.pointerX = n.x, this.pointerY = n.y, this.menus.prepareMenus(e.target);
			return;
		}
		if (e.button !== 0 || !(e.target instanceof Element) || Nn(e.target) || this.kind.isEditor(e.target) || this.isPanel(e.target)) return;
		if (e.target.closest("[data-ui-graph-map]") !== null) {
			this.drag = { kind: "map" }, this.viewport.setPointerCapture(e.pointerId), this.view.minimapPan(e);
			return;
		}
		let t = this.view.toViewport(e), r = this.view.toScene(t.x, t.y);
		this.pointerX = r.x, this.pointerY = r.y, e.preventDefault(), this.viewport.focus({ preventScroll: !0 });
		let i = e.target.closest(En);
		if (i !== null) {
			this.pressMark(i, !1);
			return;
		}
		let c = this.kind.pointerDown(e, e.target);
		if (c !== !1) {
			c !== !0 && (this.drag = c, this.viewport.setPointerCapture(e.pointerId));
			return;
		}
		let l = e.target.closest(`[${a}]`);
		if (l !== null && !this.settings.readOnly) {
			this.drag = {
				kind: "reroute",
				edge: l.getAttribute(a),
				index: Number(l.getAttribute("data-ui-graph-reroute-index"))
			}, this.viewport.setPointerCapture(e.pointerId);
			return;
		}
		let u = e.target.closest(`[${s}]`), d = e.target.closest(`[${o}]`);
		if (d !== null) {
			u !== null && !this.settings.readOnly ? (this.drag = this.dragging.beginResize(d, u, r), this.viewport.setPointerCapture(e.pointerId)) : (this.drag = this.dragging.beginNodeDrag(e, d.getAttribute(o), r), this.drag !== null && this.viewport.setPointerCapture(e.pointerId));
			return;
		}
		let f = e.target.closest(`[${n}]`);
		f !== null && u !== null && !this.settings.readOnly ? (this.drag = this.dragging.beginResize(f, u, r), this.viewport.setPointerCapture(e.pointerId)) : f !== null && e.target.closest(".ui-graph__group-band") !== null ? (this.drag = this.dragging.beginGroupDrag(e, f.getAttribute(n), r), this.drag !== null && this.viewport.setPointerCapture(e.pointerId)) : (this.render.setFocusItem(null), k(e) ? (this.drag = {
			kind: "marquee",
			startX: r.x,
			startY: r.y
		}, this.selection.beginMarquee()) : (this.selection.clearSelection(), this.drag = {
			kind: "pan",
			startX: t.x,
			startY: t.y,
			panX: this.view.panX,
			panY: this.view.panY
		}, this.root.classList.add(Tn)), this.viewport.setPointerCapture(e.pointerId));
	}
	pressMark(e, t) {
		let n = e.closest(`[${o}]`)?.getAttribute(o), r = e.hasAttribute(l);
		r ? this.togglePinned(n) : this.toggleCollapsed(n), t && n != null && this.nodeElements.get(n)?.querySelector(`[${r ? l : u}]`)?.focus({ preventScroll: !0 });
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
		if (e.pointerType === "touch") {
			let t = this.pinch.move(e.pointerId, this.view.toViewport(e), this.settings.minZoom, this.settings.maxZoom);
			if (t !== null && this.view.pinchTo(t), this.pinch.pinching) return;
		}
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
				this.dragging.resize(t, r);
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
		if (this.liftFinger(e)) return;
		let t = this.drag;
		if (t !== null) {
			try {
				t.kind === "kind" && t.finish(e);
			} finally {
				this.endDrag();
			}
			if (this.recordMoved(t), t.kind === "nodes" && e.pointerType !== "touch") {
				let n = this.view.toViewport(e);
				ht({
					x: t.startX,
					y: t.startY
				}, this.view.toScene(n.x, n.y), this.view.zoom) && this.raiseNodeClick(t.nodeId);
			}
		}
	}
	fingerTaken(e) {
		this.liftFinger(e) || this.pointerCancel();
	}
	liftFinger(e) {
		if (e.pointerType !== "touch") return !1;
		let { ended: t, left: n } = this.pinch.up(e.pointerId);
		return t ? (n !== null && (this.drag = {
			kind: "pan",
			startX: n.x,
			startY: n.y,
			panX: this.view.panX,
			panY: this.view.panY
		}), !0) : !1;
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
					this.dragging.snapSize(e), this.view.drawMinimap();
					break;
				default: return;
			}
			this.render.drawEdges();
		}
	}
	endDrag() {
		let e = this.drag;
		this.drag = null, e?.kind === "kind" && e.end(), e?.kind === "resize" && e.grip.removeAttribute(c), this.root.classList.remove(Tn), this.selection.hideMarquee(), this.render.clearPending();
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
			let n = vt(t, i[e - 1], i[e]);
			n < o && (o = n, a = e - 1);
		}
		n.points.splice(a, 0, {
			x: O(t.x, this.settings.gridSize, this.settings.snapping),
			y: O(t.y, this.settings.gridSize, this.settings.snapping)
		}), this.documentState.edited(!1);
	}
	click(e) {
		if (!(e.target instanceof Element)) return;
		let t = e.target.closest(En);
		if (t !== null) {
			e.detail === 0 && this.pressMark(t, !0);
			return;
		}
		let n = e.target.closest(`[${i}]`);
		if (n !== null) {
			this.selection.toggleEdge(n.getAttribute(i), k(e)), this.render.drawEdges();
			return;
		}
		let r = e.target.closest(`[${o}]`);
		r !== null && !Nn(e.target) && !this.kind.isEditor(e.target) && this.raiseNodeClick(r.getAttribute(o));
	}
	raiseNodeClick(e) {
		this.root.dispatchEvent(new CustomEvent("node-click", {
			bubbles: !0,
			detail: { nodeId: e }
		}));
	}
	doubleClick(e) {
		if (this.settings.readOnly || !(e.target instanceof Element)) return;
		let t = x(this.viewport.ownerDocument.elementFromPoint(e.clientX, e.clientY) ?? e.target, (e) => this.isPanel(e));
		if (t !== null) switch (t.to) {
			case "reroute": {
				let n = this.view.toViewport(e);
				this.addReroute(t.id, this.view.toScene(n.x, n.y));
				break;
			}
			case "rename":
				this.renameNode(t.id);
				break;
			case "sheet": this.kind.backgroundDoubleClick();
		}
	}
	renameNode(e) {
		!this.settings.readOnly && this.kind.canEditItems() && this.menus.renameNode(e);
	}
	key(e) {
		if (e.defaultPrevented || this.context.shortcuts.isComposing(e)) return;
		let t = this.context.shortcuts.isFieldKey(e) || e.target instanceof Element && this.kind.isEditor(e.target), n = (t) => this.context.shortcuts.matches(e, t);
		n("Ctrl+S") ? (e.preventDefault(), this.documentState.save()) : t || e.target instanceof Element && e.target.closest(`[${this.context.names.eventBoundary}]`) !== null && this.onSheet(e.target) || (this.onSheet(e.target) || e.target instanceof Element && e.target.matches(ee)) && ((e.key === "Delete" || e.key === "Backspace") && this.context.shortcuts.isPlainKey(e, { shift: !0 }) ? (e.preventDefault(), this.deleteSelection()) : n("Ctrl+C") ? (e.preventDefault(), this.copy()) : n("Ctrl+V") ? (e.preventDefault(), this.paste()) : n("Ctrl+D") ? (e.preventDefault(), this.duplicate(this.selection.nodeIds)) : n("Ctrl+Z") ? (e.preventDefault(), this.replay(this.documentState.undo())) : n("Ctrl+Y") || n("Ctrl+Shift+Z") ? (e.preventDefault(), this.replay(this.documentState.redo())) : n("Ctrl+A") ? (e.preventDefault(), this.selection.selectAll(this.kind.items().map((e) => e.id))) : e.key === "Escape" ? (this.selection.any && e.preventDefault(), this.kind.escape(), this.selection.clearSelection()) : n("F2") && this.selection.nodeIds.size === 1 && (e.preventDefault(), this.renameNode(this.selection.nodeIds.values().next().value)));
	}
	onSheet(e) {
		return e === this.viewport || e instanceof Node && this.scene.contains(e);
	}
	isPanel(e) {
		return Mn(e) || this.kind.isPanel(e);
	}
	replay(e) {
		e !== null && this.documentState.replay(e);
	}
	chrome(e) {
		if (!(e.target instanceof Element) || this.states.isInert(e.target) || this.menus.foldCorner(e.target) || this.kind.chrome(e.target)) return;
		let t = this.view.visibleRect();
		if (e.target.closest("[data-ui-graph-zoom-in]") !== null) {
			this.view.zoomBy(1.2, t.width / 2, t.height / 2);
			return;
		}
		if (e.target.closest("[data-ui-graph-zoom-out]") !== null) {
			this.view.zoomBy(1 / 1.2, t.width / 2, t.height / 2);
			return;
		}
		if (e.target.closest("[data-ui-graph-fit]") !== null) {
			this.view.fit();
			return;
		}
		let n = this.context.names, r = e.target.closest(`[${n.key}]`), i = r?.getAttribute(n.key) ?? "", a = e.target.closest(`[${h}]`);
		if (i.length === 0 || a === null && e.target.closest(`[${n.contextMenu}]`) === null) return;
		let o = a?.getAttribute("data-ui-graph-menu-panel") ?? r.closest(`[${n.contextMenu}]`)?.getAttribute(n.contextMenu) ?? "";
		i.startsWith("graph:") ? this.menus.run(i, o) : this.menus.raiseEntry(i, o);
		let s = document.activeElement;
		(!(s instanceof HTMLElement) || s === document.body || !s.isConnected) && this.viewport.focus({ preventScroll: !0 });
	}
};
function Mn(e) {
	return e.closest(`[${h}]`) !== null;
}
function Nn(e) {
	let t = e.closest("input, textarea, select, button");
	return t !== null && !t.matches("[data-ui-graph-pin-toggle], [data-ui-graph-fold]");
}
//#endregion
//#region src/framework-api.ts
var Pn = 4;
function Fn() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.Graph needs the framework's client (ui.js) on the page before it.");
	if (e.contractVersion !== Pn) throw Error(`NE.Standard.UI.Web.Graph was built for plugin contract ${Pn}, but the framework's client on the page implements ${String(e.contractVersion ?? "an older one")}; install the package version that matches the framework.`);
	return e;
}
//#endregion
//#region src/canvas/aim.ts
var In = /* @__PURE__ */ new WeakMap();
function Ln(e) {
	e.classList.add(p);
}
function Rn(e, t, n) {
	e.classList.remove(p);
	for (let e of t.querySelectorAll(`[${m}]`)) e.removeAttribute(m), n?.(e);
}
function zn(e, t, n) {
	let r = In.get(e) ?? null;
	r !== t && (r !== null && n(r, !1), t !== null && n(t, !0), In.set(e, t));
}
//#endregion
//#region src/graph/link-drag.ts
var Bn = "data-ui-graph-handle", Vn = "data-ui-graph-entry", Hn = "data-ui-graph-link-source";
function Un(e) {
	let t = document.createElement("span"), n = document.createElement("span");
	t.className = "ui-graph__handle", t.setAttribute(Bn, ""), n.className = "ui-graph__entry", n.setAttribute(Vn, ""), e.append(n, t);
}
function Wn(e, t, n) {
	let r = t.closest(`[${o}]`), i = r?.getAttribute("data-ui-graph-node") ?? null;
	if (r === null || i === null) return null;
	let a = e.root, s = null;
	Ln(a), r.setAttribute(Hn, "");
	for (let t of e.nodeLayer.querySelectorAll(`[${o}]`)) {
		let e = t.getAttribute(o);
		e !== i && !n.canLink(i, e) && t.setAttribute(m, "no");
	}
	let c = () => e.nodeLayer.querySelector(`[${o}="${CSS.escape(i)}"]`), l = () => c()?.querySelector("[data-ui-graph-handle]") ?? t;
	return {
		kind: "kind",
		move: (t, r) => {
			s = Gn(e, i, r, n);
			let a = s?.querySelector(`[${Vn}]`) ?? null;
			e.drawPending(e.centerOf(l()), a === null ? t : e.centerOf(a), "var(--ui-color-primary)");
		},
		finish: (e) => {
			let t = s?.getAttribute("data-ui-graph-node") ?? null;
			t !== null && n.link(i, t, e);
		},
		end: () => {
			r.removeAttribute(Hn), c()?.removeAttribute(Hn), Rn(a, e.nodeLayer);
		}
	};
}
function Gn(e, t, n, r) {
	let i = document.elementFromPoint(n.clientX, n.clientY)?.closest("[data-ui-graph-node]") ?? null, a = i?.getAttribute("data-ui-graph-node") ?? null, o = i !== null && a !== null && a !== t && e.nodeLayer.contains(i) && r.canLink(t, a) ? i : null;
	return zn(e.nodeLayer, o, (e, t) => {
		t ? e.setAttribute(m, "yes") : e.removeAttribute(m);
	}), o;
}
function Kn(e, t) {
	let n = e.root.querySelector(`.ui-graph__edge[data-ui-graph-edge="${CSS.escape(t)}"]`);
	return n === null ? null : yt(n);
}
function qn(e, t, n, r) {
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
var Jn = f.slice(1);
function Yn(e, t, n) {
	let r = (t.shape ?? n.shape) === "icon", i = t.title ?? t.id, a = ie(r ? "ui-graph__node ui-graph__bubble" : "ui-graph__node ui-graph__card", t.id, e, t.color, n.conflict), o = Xn(t, r ? "ui-graph__bubble-face" : "ui-graph__card-icon", n);
	o !== null && a.append(o), r ? a.append(Qn(i, "ui-graph__bubble-title")) : a.append(Zn(t, i)), t.badge !== null && a.append($n(t.badge, r ? "ui-graph__bubble-badge" : "ui-graph__card-badge")), n.connectable && Un(a);
	let s = t.tooltip ?? (r ? n.tooltips.escape(i) : null);
	return s !== null && oe(a, s, n.tooltips), a;
}
function Xn(e, t, n) {
	let r = t === "ui-graph__bubble-face", i = e.image !== null && n.urls.isImageSource(e.image) ? e.image : null;
	if (i === null && e.icon === null && !r) return null;
	let a = document.createElement("span");
	if (a.className = t, a.setAttribute("aria-hidden", "true"), i !== null) {
		let e = document.createElement("img");
		e.src = i, e.alt = "", e.draggable = !1, a.setAttribute("data-ui-graph-picture", ""), a.append(e);
	} else if (e.icon !== null) {
		let t = document.createElement("span");
		n.icons.apply(t, e.icon), a.append(t);
	}
	return a;
}
function Zn(e, t) {
	let n = document.createElement("div");
	if (n.className = "ui-graph__card-text", n.append(Qn(t, null)), e.subtitle !== null) {
		let t = document.createElement("span");
		t.className = "ui-graph__card-subtitle", t.textContent = e.subtitle, n.append(t);
	}
	return n;
}
function Qn(e, t) {
	let n = document.createElement("span");
	return n.className = t === null ? Jn : `${Jn} ${t}`, n.textContent = e, n;
}
function $n(e, t) {
	let n = document.createElement("span"), r = document.createElement("span");
	return n.className = `${_.badgeClass} ${_.badgeSurfaceClass} ${t}`, n.setAttribute(_.badgeText, ""), r.className = _.badgeTextClass, r.textContent = e, n.append(r), n;
}
//#endregion
//#region src/graph/draft.ts
function er(e, t, n, r) {
	let i = new Set(n), a = new Map(t.map((e) => [e.id, e])), o = /* @__PURE__ */ new Set(), s = [];
	for (let t of e) {
		if (i.has(t.id)) continue;
		let e = a.get(t.id);
		s.push(e === void 0 ? t : r(e)), o.add(t.id);
	}
	for (let e of t) !o.has(e.id) && !i.has(e.id) && s.push(r(e));
	return s;
}
function tr(e, t) {
	let n = new Map(e.map((e) => [e.id, e])), r = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = n.get(e.id);
		e.created ? t !== void 0 && r.set(e.id, "changed") : t === void 0 ? r.set(e.id, "removed") : e.baseline !== null && e.baseline !== JSON.stringify(t) && r.set(e.id, "changed");
	}
	return r;
}
function nr(e, t, n) {
	return /* @__PURE__ */ new Set([
		...e.map((e) => e.id),
		...t.map((e) => e.id),
		...n
	]);
}
function rr(e, t) {
	let n = 1;
	for (; t.has(`${e}-${n}`);) n++;
	return `${e}-${n}`;
}
//#endregion
//#region src/graph/keyed-list.ts
function ir(e, t, n) {
	switch (t.action) {
		case "Reset":
			e.length = 0;
			return;
		case "Move":
			for (let n of t.moves) or(e, n.key, n.newIndex);
			return;
		default: for (let r of t.items) ar(e, t.action, r.key ?? r.oldKey, r.oldKey ?? r.key, r.index, r.item, n);
	}
}
function ar(e, t, n, r, i, a, o) {
	let s = e.findIndex((e) => e.id === (t === "Replace" ? r : n));
	if (t === "Remove") {
		s >= 0 && e.splice(s, 1);
		return;
	}
	let c = o(a);
	c !== null && (s >= 0 ? e[s] = c : i !== null && i >= 0 && i <= e.length ? e.splice(i, 0, c) : e.push(c));
}
function or(e, t, n) {
	let r = e.findIndex((e) => e.id === t);
	if (r < 0 || n === null) return;
	let [i] = e.splice(r, 1);
	e.splice(Math.min(n, e.length), 0, i);
}
//#endregion
//#region src/graph/drafted-collection.ts
var sr = "data-ui-graph-nodes", cr = "graph:take-server", lr = "graph:keep-mine", ur = class {
	services;
	model;
	placeAt;
	server;
	serverById = /* @__PURE__ */ new Map();
	serverVersion = 0;
	drawnKey = "";
	drawn = [];
	drawnById = /* @__PURE__ */ new Map();
	conflicts = /* @__PURE__ */ new Map();
	constructor(e, t, n) {
		let r = C(e.root.getAttribute(sr));
		this.services = e, this.model = t, this.placeAt = n, this.server = Array.isArray(r) ? r.map(t.read).filter((e) => e !== null) : [];
	}
	get document() {
		return this.services.documentState.document;
	}
	applyChange(e) {
		ir(this.server, e, this.model.read), this.serverVersion++, this.services.draw();
	}
	refresh(e = "") {
		let t = `${this.serverVersion}|${this.services.documentState.version}|${e}`;
		return t !== this.drawnKey && (this.drawnKey = t, this.serverById = new Map(this.server.map((e) => [e.id, e])), this.drawn = this.model.overlay(this.server, this.document), this.drawnById = new Map(this.drawn.map((e) => [e.id, e])), this.conflicts = tr(this.server, this.model.lists(this.document).flat()), !0);
	}
	get key() {
		return this.drawnKey;
	}
	get items() {
		return this.drawn;
	}
	item(e) {
		return this.drawnById.get(e);
	}
	serverItem(e) {
		return this.serverById.get(e);
	}
	conflict(e) {
		return this.conflicts.get(e) ?? null;
	}
	draftOf(e) {
		let t = this.document;
		for (let n of this.model.lists(t)) {
			let t = n.find((t) => t.id === e);
			if (t !== void 0) return t;
		}
		let n = this.drawnById.get(e);
		if (n === void 0) return null;
		let r = this.serverById.get(e), i = this.model.toEntry(n);
		return i.baseline = r === void 0 ? null : JSON.stringify(r), this.model.listOf(t, i).push(i), i;
	}
	rename(e, t) {
		let n = this.draftOf(e);
		n !== null && (n.title = t);
	}
	paint(e, t) {
		let n = this.draftOf(e);
		n !== null && (n.color = t);
	}
	freeKey(e) {
		let t = this.document;
		return rr(e, nr(this.server, this.model.lists(t).flat(), t.draft.removed));
	}
	add(e, t) {
		let n = t(this.freeKey(e)), r = this.services.pointerScene();
		this.model.listOf(this.document, n).push(n), this.placeAt(n.id, r), this.services.selection.selectOnly(n.id), this.services.documentState.edited(), this.services.renameItem(n.id);
	}
	duplicate(e, t, n) {
		let r = this.document, i = /* @__PURE__ */ new Map(), a = [];
		for (let n of e) {
			let e = this.drawnById.get(n);
			if (e === void 0 || i.has(n)) continue;
			let o = this.model.toEntry(e), s = r.nodes.find((e) => e.id === n);
			o.id = this.freeKey(this.model.prefix(o)), o.created = !0, o.baseline = null, this.model.listOf(r, o).push(o), this.placeAt(o.id, s === void 0 ? this.services.pointerScene() : {
				x: s.x + t,
				y: s.y + t
			}), i.set(n, o.id), a.push(o);
		}
		for (let e of a) n(e, i);
		return a.map((e) => e.id);
	}
	remove(e) {
		let t = this.document, n = t.draft.removed;
		for (let r of e) {
			let e = !1;
			for (let n of this.model.lists(t)) {
				let t = n.findIndex((e) => e.id === r);
				t >= 0 && (e = n[t].created, n.splice(t, 1));
			}
			!e && this.serverById.has(r) && !n.includes(r) && n.push(r);
		}
	}
	stands(e) {
		let t = this.document;
		return this.model.lists(t).some((t) => t.some((t) => t.id === e)) || this.serverById.has(e) && !t.draft.removed.includes(e);
	}
	answerConflict(e, t) {
		return e !== cr && e !== lr ? !1 : (t !== null && this.conflicts.has(t) && !this.services.settings.readOnly && this.resolve(t, e === lr) && this.services.documentState.edited(), !0);
	}
	resolve(e, t) {
		for (let n of this.model.lists(this.document)) {
			let r = n.findIndex((t) => t.id === e);
			if (r < 0) continue;
			let i = n[r], a = this.serverById.get(e);
			return t ? i.created && a !== void 0 ? this.rekey(i) : (i.created = a === void 0, i.baseline = a === void 0 ? null : JSON.stringify(a)) : n.splice(r, 1), !0;
		}
		return !1;
	}
	rekey(e) {
		let t = this.document, n = e.id, r = this.freeKey(this.model.prefix(e));
		e.id = r;
		for (let e of t.nodes) e.id === n && (e.id = r);
		this.model.rekey(t, n, r, this.drawn);
	}
	showConflictAnswers(e) {
		M(this.services, cr, e), M(this.services, lr, e);
	}
};
//#endregion
//#region src/graph/chain.ts
function dr(e, t) {
	let n = /* @__PURE__ */ new Set([t]), r = /* @__PURE__ */ new Set();
	return fr(e, t, !0, n, r), fr(e, t, !1, n, r), {
		items: [...n],
		edges: [...r]
	};
}
function fr(e, t, n, r, i) {
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
//#region src/graph/drafted-layered-kind.ts
var pr = class {
	snapsByCenter = !0;
	services;
	links = [];
	linkById = /* @__PURE__ */ new Map();
	constructor(e) {
		this.services = e;
	}
	applyChange(e) {
		this.collection.applyChange(e);
	}
	items() {
		return this.refresh(), this.sheet.items();
	}
	edges() {
		return this.refresh(), this.sheet.edges();
	}
	itemsDrawn() {
		this.sheet.itemsDrawn();
	}
	dispose() {
		this.sheet.dispose();
	}
	itemColor(e) {
		return this.collection.item(e.id)?.color ?? "";
	}
	related(e) {
		return dr(this.links, e);
	}
	edgeColor() {
		return "var(--ui-text-muted)";
	}
	arrange(e, t) {
		return this.sheet.arrange(e, t);
	}
	isEditor() {
		return !1;
	}
	pointerDown(e, t) {
		let n = t.closest(`[${Bn}]`);
		return n === null || !this.editable ? !1 : this.editing.beginLink(n) ?? !0;
	}
	backgroundDoubleClick() {}
	copy() {}
	paste() {
		return null;
	}
	canEditItems() {
		return this.editable;
	}
	renameItem(e, t) {
		return this.editable && this.collection.rename(e, t), !0;
	}
	paintItem(e, t) {
		return this.editable && this.collection.paint(e, t), !0;
	}
	hasEdgeMenu() {
		return !0;
	}
};
//#endregion
//#region src/graph/model.ts
function mr() {
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
function hr(e) {
	let t = e;
	if (typeof t != "object" || !t) return mr();
	let n = t.draft;
	return {
		nodes: (t.nodes ?? []).map(pe),
		edges: (t.edges ?? []).map(me),
		groups: (t.groups ?? []).map(_e),
		draft: {
			nodes: (n?.nodes ?? []).flatMap((e) => {
				let t = Cr(e);
				return t === null ? [] : [{
					...gr(t),
					...he(e)
				}];
			}),
			removed: (n?.removed ?? []).map((e) => String(e))
		},
		key: de(t)
	};
}
function gr(e) {
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
function _r(e) {
	return Cr(e);
}
function vr(e, t) {
	return er(e, t.nodes, t.removed, _r);
}
var yr = {
	read: Cr,
	overlay: (e, t) => vr(e, t.draft),
	lists: (e) => [e.draft.nodes],
	listOf: (e) => e.draft.nodes,
	toEntry: gr,
	prefix: () => "node",
	rekey: br
};
function br(e, t, n, r) {
	let i = new Set([...r, ...e.draft.nodes].flatMap((e) => e.links.map((e) => e.id))), a = /* @__PURE__ */ new Map();
	for (let r of e.draft.nodes) r.links = r.links.map((e) => {
		if (r.id !== n && e.to !== t) return e;
		let o = e.to === t ? n : e.to, s = Sr(r.id, o, i);
		return i.add(s), a.set(e.id, s), {
			...e,
			id: s,
			to: o
		};
	});
	for (let t of e.edges) t.id = a.get(t.id) ?? t.id;
}
function xr(e, t, n) {
	return e.links.flatMap((r) => {
		let i = t.get(r.to);
		if (i === void 0) return [];
		let a = Sr(e.id, i, n);
		return n.add(a), [{
			...r,
			id: a,
			to: i
		}];
	});
}
function Sr(e, t, n) {
	let r = `${e}>${t}`, i = 2;
	for (; n.has(r);) r = `${e}>${t}~${i++}`;
	return r;
}
function Cr(e) {
	if (typeof e != "object" || !e) return null;
	let t = e, n = t.id;
	if (typeof n != "string" || n.length === 0) return null;
	let r = Array.isArray(t.links) ? t.links : [];
	return {
		id: n,
		title: w(t.title),
		subtitle: w(t.subtitle),
		icon: w(t.icon),
		image: w(t.image),
		shape: wr(t.shape),
		color: w(t.color),
		badge: w(t.badge),
		tooltip: w(t.tooltip),
		links: r.flatMap((e) => {
			let t = e;
			return typeof t == "object" && t && typeof t.id == "string" && typeof t.to == "string" ? [{
				id: t.id,
				to: t.to,
				caption: w(t.caption)
			}] : [];
		})
	};
}
function wr(e) {
	return e === "Icon" || e === "icon" || e === 1 ? "icon" : e === "Card" || e === "card" || e === 0 ? "card" : null;
}
function Tr(e) {
	let t = new Set(e.map((e) => e.id));
	return e.flatMap((e) => e.links.filter((e) => t.has(e.to)).map((t) => ({
		...t,
		from: e.id
	})));
}
//#endregion
//#region src/graph/graph-editing.ts
var Er = class {
	services;
	nodes;
	link;
	constructor(e, t, n) {
		this.services = e, this.nodes = t, this.link = n;
	}
	addNode() {
		let e = this.services.context.strings.text("ui.graph.new-node");
		this.nodes.add("node", (t) => ({
			id: t,
			title: e,
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
		}));
	}
	removeNodes(e) {
		this.nodes.remove(e);
		for (let t of this.services.documentState.document.draft.nodes) t.links.some((t) => e.has(t.to)) && (t.links = t.links.filter((t) => !e.has(t.to)));
	}
	removeLinks(e) {
		for (let t of e) {
			let e = this.link(t), n = e === void 0 ? null : this.nodes.draftOf(e.from);
			n !== null && (n.links = n.links.filter((e) => e.id !== t));
		}
	}
	beginLink(e) {
		return Wn(this.services, e, {
			canLink: (e, t) => this.nodes.item(e)?.links.some((e) => e.to === t) !== !0,
			link: (e, t) => this.addLink(e, t)
		});
	}
	addLink(e, t) {
		let n = this.nodes.draftOf(e);
		if (n === null || n.links.some((e) => e.to === t)) return;
		let r = new Set(this.nodes.items.flatMap((e) => e.links.map((e) => e.id)));
		n.links.push({
			id: Sr(e, t, r),
			to: t,
			caption: null
		}), this.services.documentState.edited();
	}
	editCaption(e) {
		let t = this.link(e), n = Kn(this.services, e);
		t !== void 0 && n !== null && qn(this.services, n, t.caption ?? "", (n) => {
			let r = this.nodes.draftOf(t.from);
			r !== null && (r.links = r.links.map((t) => t.id === e ? {
				...t,
				caption: n.length === 0 ? null : n
			} : t), this.services.documentState.edited());
		});
	}
}, Dr = 8, Or = 4, kr = 24, Ar = 128, jr = 48, Mr = 96;
function Nr(e, t, n) {
	let r = n.direction === "down" || n.direction === "up", i = n.direction === "left" || n.direction === "up", a = n.layerGap ?? Xr(e, r), o = n.nodeGap ?? 32, s = /* @__PURE__ */ new Map();
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
	let { sequence: c, forward: l, backEdges: u } = Fr([...s.values()], t);
	Wr(c, l, s);
	let d = n.layerGaps?.(new Map([...s.values()].map((e) => [e.id, e.layer]))), f = /* @__PURE__ */ new Map(), p = Kr(l, s, f), m = qr(s, p);
	Zr(m, p, o);
	let h = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map(), _ = /* @__PURE__ */ new Map(), v = n.originX ?? 0, y = n.originY ?? 0, ee = [], b = 0, te = a, x = Infinity;
	for (let e of m) for (let t of e) x = Math.min(x, t.line - t.lead);
	for (let [e, t] of m.entries()) {
		let n = 0;
		for (let e of t) n = Math.max(n, e.depth);
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
	let S = /* @__PURE__ */ new Map();
	for (let [e, t] of f) u.has(e) || S.set(e, t.map((e) => g.get(e)));
	return {
		positions: h,
		backEdges: u,
		layers: _,
		routes: S
	};
}
function Pr(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let t of e) n.has(t) || n.set(t, { id: t });
	return Fr([...n.values()], t).backEdges;
}
function Fr(e, t) {
	let n = new Set(e.map((e) => e.id)), r = /* @__PURE__ */ new Set(), i = t.filter((e) => n.has(e.from) && n.has(e.to));
	for (let e of i) e.from === e.to && r.add(e.id);
	let a = i.filter((e) => e.from !== e.to), o = Ir(e, a), s = Hr(e, a, o), c = [];
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
function Ir(e, t) {
	let n = /* @__PURE__ */ new Set(), r = Lr(e, t), i = /* @__PURE__ */ new Map();
	r.forEach((e, t) => {
		for (let n of e) i.set(n, t);
	});
	let a = r.map(() => []), o = r.map(() => []);
	for (let e of t) {
		let t = i.get(e.from), n = i.get(e.to);
		t !== void 0 && t === n ? a[t].push(e) : (t !== void 0 && o[t].push(e), n !== void 0 && o[n].push(e));
	}
	return r.forEach((e, t) => {
		let r = Rr(e, a[t], o[t]), i = e.length <= kr ? zr(r, a[t], o[t]) : r, s = new Map(i.map((e, t) => [e, t]));
		for (let e of a[t]) s.get(e.from) > s.get(e.to) && n.add(e.id);
	}), n;
}
function Lr(e, t) {
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
function Rr(e, t, n) {
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
function zr(e, t, n) {
	let r = e, i = Br(r, t, n), a = 0;
	for (let o = 0; o < 3; o++) {
		let o = !1;
		for (let s of e) {
			let e = r.filter((e) => e !== s);
			for (let c of [[...e, s], [s, ...e]]) {
				if (a++ >= Ar) return r;
				let e = Br(c, t, n);
				Vr(e, i) && (r = c, i = e, o = !0);
			}
		}
		if (!o) break;
	}
	return r;
}
function Br(e, t, n) {
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
function Vr(e, t) {
	return e.back === t.back ? e.span < t.span : e.back < t.back;
}
function Hr(e, t, n) {
	let r = new Map(e.map((e, t) => [e.id, t])), i = Array(e.length).fill(0), a = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = r.get(n.has(e.id) ? e.to : e.from), o = r.get(n.has(e.id) ? e.from : e.to), s = a.get(t);
		i[o]++, s === void 0 ? a.set(t, [o]) : s.push(o);
	}
	let o = new Ur(), s = [];
	for (i.forEach((e, t) => {
		e === 0 && o.push(t);
	}); o.size > 0;) {
		let t = o.pop();
		s.push(e[t]);
		for (let e of a.get(t) ?? []) --i[e] === 0 && o.push(e);
	}
	return s;
}
var Ur = class {
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
function Wr(e, t, n) {
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
	Gr(e, t, n);
}
function Gr(e, t, n) {
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
function Kr(e, t, n) {
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
				breadth: Dr,
				lead: Dr / 2,
				input: e.input,
				layer: n,
				order: 0,
				line: 0
			}), r.push({
				from: c,
				to: a,
				fromOffset: l,
				toOffset: Dr / 2
			}), s.push(a), c = a, l = Dr / 2;
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
function qr(e, t) {
	let n = [];
	for (let t of e.values()) {
		for (; n.length <= t.layer;) n.push([]);
		n[t.layer].push(t);
	}
	for (let e of n) e.sort((e, t) => e.input - t.input), e.forEach((e, t) => e.order = t);
	let r = Jr(t, !0), i = Jr(t, !1);
	for (let t = 0; t < Or; t++) {
		let a = t % 2 == 0;
		for (let t = 1; t < n.length; t++) {
			let o = n[a ? t : n.length - 1 - t];
			Yr(o, a ? r : i, e);
		}
	}
	return n;
}
function Jr(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = t ? r.to : r.from, i = t ? r.from : r.to, a = n.get(e);
		a === void 0 ? n.set(e, [i]) : a.push(i);
	}
	return n;
}
function Yr(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	for (let i of e) {
		let e = t.get(i.id) ?? [];
		r.set(i.id, e.length === 0 ? i.order : e.reduce((e, t) => e + n.get(t).order, 0) / e.length);
	}
	e.sort((e, t) => r.get(e.id) - r.get(t.id) || e.order - t.order), e.forEach((e, t) => e.order = t);
}
function Xr(e, t) {
	if (e.length === 0) return jr;
	let n = e.map((e) => t ? e.height : e.width).sort((e, t) => e - t), r = n[Math.floor(n.length / 2)];
	return Math.max(jr, Math.min(Mr, Math.round(r * .75)));
}
function Zr(e, t, n) {
	let r = new Map(e.flat().map((e) => [e.id, e])), i = Jr(t, !0), a = Jr(t, !1), o = Qr(e, i, r), s = ti(t, r), c = [];
	for (let t of [!1, !0]) for (let l of [!1, !0]) {
		let u = (t ? [...e].reverse() : [...e]).map((e) => l ? [...e].reverse() : [...e]);
		c.push(ri(u, ni(u, t ? a : i, o, s, r), n, l));
	}
	let l = ii(e, c);
	for (let t of e) for (let e of t) e.line = l.get(e.id);
}
function Qr(e, t, n) {
	let r = /* @__PURE__ */ new Set();
	for (let i = 1; i < e.length; i++) {
		let a = e[i], o = 0, s = 0;
		for (let c = 0; c < a.length; c++) {
			let l = $r(a[c], t, n);
			if (c !== a.length - 1 && l === void 0) continue;
			let u = l ?? e[i - 1].length - 1;
			for (; s <= c; s++) {
				let e = a[s], i = $r(e, t, n);
				for (let a of t.get(e.id) ?? []) {
					let t = n.get(a).order;
					(t < o || t > u) && t !== i && r.add(ei(a, e.id));
				}
			}
			o = u;
		}
	}
	return r;
}
function $r(e, t, n) {
	if (e.real) return;
	let r = n.get((t.get(e.id) ?? [])[0]);
	return r === void 0 || r.real ? void 0 : r.order;
}
function ei(e, t) {
	return `${e}\u0000${t}`;
}
function ti(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = ei(r.from, r.to);
		n.has(e) || n.set(e, r.fromOffset - t.get(r.from).lead - (r.toOffset - t.get(r.to).lead));
	}
	return n;
}
function ni(e, t, n, r, i) {
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
				let d = i.get(u).layer < l.layer, f = d ? ei(u, l.id) : ei(l.id, u);
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
function ri(e, t, n, r) {
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
function ii(e, t) {
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
var ai = {
	from: 0,
	to: 0
}, oi = .35, si = 12, ci = .6, li = class {
	services;
	host;
	options;
	backEdges = /* @__PURE__ */ new Set();
	pending = /* @__PURE__ */ new Set();
	settling = /* @__PURE__ */ new Set();
	placing = !1;
	turned = !1;
	laidAt = /* @__PURE__ */ new Map();
	routes = /* @__PURE__ */ new Map();
	lanes = null;
	shifts = null;
	laidFor;
	waiting = null;
	placements = null;
	constructor(e, t, n) {
		this.services = e, this.host = t, this.options = n, this.laidFor = this.layoutFor;
	}
	get direction() {
		let e = this.services.root.getAttribute(dn);
		return e === "down" || e === "left" || e === "up" ? e : "right";
	}
	get document() {
		return this.services.documentState.document;
	}
	get layoutFor() {
		return `${this.direction}:${this.host.layoutKey()}`;
	}
	structureChanged() {
		this.backEdges = Pr(this.host.nodeIds(), this.host.links());
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
	placeAt(e, t) {
		let n = this.document.nodes, r = n.findIndex((t) => t.id === e);
		r >= 0 && n.splice(r, 1), n.push({
			id: e,
			x: t.x,
			y: t.y,
			pinned: !1
		}), this.placements = null, this.settling.add(e);
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
		this.pending.size === 0 && this.settling.size === 0 || this.placing || (this.placing = !0, queueMicrotask(() => this.placePending()));
	}
	placePending() {
		if (this.placing = !1, this.services.root.offsetWidth === 0) {
			this.waitForSize();
			return;
		}
		let e = this.settleAdded(), t = this.items();
		if (this.pending.size > 0 && this.pending.size < t.length && t.every((e) => this.pending.has(e.id) || this.standsWhereLaid(e.id))) for (let e of t) this.pending.add(e.id);
		let n = t.filter((e) => this.pending.has(e.id));
		if (n.length === 0) {
			e && this.services.draw();
			return;
		}
		let r = this.layout(this.measure()), i = t.filter((e) => !this.pending.has(e.id)).map((e) => this.services.nodeRect(e.id)).filter((e) => e !== null), a = i.length === 0, o = n.length === t.length;
		if (o) this.laidAt = r.positions, this.routes = r.routes;
		else for (let e of this.host.links()) (this.pending.has(e.from) || this.pending.has(e.to)) && this.routes.delete(e.id);
		for (let e of n) {
			let t = r.positions.get(e.id), n = this.services.nodeRect(e.id);
			if (t === void 0 || n === null) continue;
			let a = {
				x: t.x,
				y: t.y,
				width: n.width,
				height: n.height
			};
			for (; i.some((e) => D(a, e));) this.direction === "down" ? a.x += a.width + this.options.nodeGap : a.y += a.height + this.options.nodeGap;
			e.x = a.x, e.y = a.y, i.push(a), o || this.laidAt.set(e.id, {
				x: a.x,
				y: a.y
			});
		}
		this.pending.clear(), this.services.draw(), (a || this.turned) && this.services.view.fitSheet(), this.turned = !1;
	}
	settleAdded() {
		if (this.settling.size === 0) return !1;
		for (let e of this.document.nodes) {
			if (!this.settling.has(e.id)) continue;
			let t = this.services.snapPlace(e.id, e);
			e.x = t.x, e.y = t.y;
		}
		return this.settling.clear(), !0;
	}
	waitForSize() {
		this.waiting === null && (this.waiting = this.services.context.observeSize(this.services.root, () => {
			this.services.root.offsetWidth !== 0 && (this.dispose(), this.placePending());
		}));
	}
	dispose() {
		this.waiting?.(), this.waiting = null;
	}
	layout(e) {
		let t = 0;
		if (this.host.nodeBox !== void 0) for (let n of e) t = Math.max(t, this.services.nodeExtent(n.id)?.width ?? 0);
		let n = e.map((e) => ({
			id: e.id,
			...this.box(e.id, e.width, e.height, t)
		})), r = Nr(n, this.host.links(), {
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
	box(e, t, n, r) {
		return this.host.nodeBox === void 0 ? {
			width: t,
			height: n
		} : this.host.nodeBox(e, t, n, r);
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
		let t = Se(e);
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
			let o = [...a].sort((e, t) => e.across - t.across), s = o.findIndex((e) => e.level), c = s >= 0 ? s : (o.length - 1) / 2, l = Math.max(c, o.length - 1 - c), u = Math.min(si, (r ? e.width : e.height) * ci / (2 * l));
			o.forEach((e, r) => {
				t.get(e.id)[n] = (r - c) * u;
			});
		}
	}
	middleEndsOf(e) {
		let t = this.services.nodeRect(e.from), n = this.services.nodeRect(e.to);
		if (t === null || n === null) return null;
		let r = this.direction, i = this.backEdges.has(e.id), a = e.from === e.to, { start: o, end: s } = ui(t, n, r, i, a, this.host.footRoom === void 0 ? ai : {
			from: this.host.footRoom(e.from),
			to: this.host.footRoom(e.to)
		});
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
function ui(e, t, n, r, i, a = ai) {
	let o = n === "down" || n === "up", s = n === "left" || n === "up", c = e.y + e.height + a.from, l = t.y + t.height + a.to;
	if (!r) return {
		start: o ? {
			x: e.x + e.width / 2,
			y: s ? e.y : c
		} : {
			x: s ? e.x : e.x + e.width,
			y: e.y + e.height / 2
		},
		end: o ? {
			x: t.x + t.width / 2,
			y: s ? l : t.y
		} : {
			x: s ? t.x + t.width : t.x,
			y: t.y + t.height / 2
		}
	};
	let u = i ? !s : s, d = i ? s : !s;
	return {
		start: o ? {
			x: e.x + e.width * oi,
			y: u ? c : e.y
		} : {
			x: u ? e.x + e.width : e.x,
			y: e.y + e.height * oi
		},
		end: o ? {
			x: t.x + t.width * oi,
			y: d ? l : t.y
		} : {
			x: d ? t.x + t.width : t.x,
			y: t.y + t.height * oi
		}
	};
}
//#endregion
//#region src/graph/layered-kind.ts
var di = 32, fi = 96;
function pi(e, t, n) {
	let r = Math.max(e, fi, n);
	return {
		width: r,
		height: t + 38,
		anchor: {
			x: r / 2,
			y: t / 2
		}
	};
}
var mi = {
	name: "layered",
	readDocument: hr,
	create: (e) => new hi(e)
}, hi = class extends pr {
	collection;
	editing;
	sheet;
	constructor(e) {
		super(e), this.collection = new ur(e, yr, (e, t) => this.sheet.placeAt(e, t)), this.editing = new Er(e, this.collection, (e) => this.linkById.get(e)), this.sheet = new li(e, {
			nodeIds: () => this.collection.items.map((e) => e.id),
			links: () => this.links,
			layoutKey: () => this.shape,
			nodeBox: (e, t, n, r) => this.shapeOf(e) === "icon" ? pi(t, n, r) : {
				width: t,
				height: n
			},
			spreadsEnds: (e) => this.shapeOf(e) === "card",
			footRoom: (e) => this.shapeOf(e) === "icon" ? 38 : 0
		}, { nodeGap: di }), this.refresh();
	}
	get editable() {
		return !this.services.settings.readOnly && this.services.root.hasAttribute("data-ui-graph-edit-structure");
	}
	get shape() {
		return wr(this.services.root.getAttribute("data-ui-graph-node-shape")) ?? "card";
	}
	shapeOf(e) {
		return this.collection.item(e)?.shape ?? this.shape;
	}
	refresh() {
		this.collection.refresh() && (this.links = Tr(this.collection.items), this.linkById = new Map(this.links.map((e) => [e.id, e])), this.sheet.structureChanged());
	}
	renderItem(e) {
		let t = this.collection.item(e.id) ?? {
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
		return Yn(e, t, {
			icons: this.services.context.icons,
			tooltips: this.services.context.tooltips,
			urls: this.services.context.urls,
			shape: this.shape,
			connectable: this.editable,
			conflict: this.collection.conflict(t.id)
		});
	}
	edgeEnds(e) {
		let t = this.linkById.get(e.id), n = t === void 0 ? null : this.sheet.ends(t);
		return t === void 0 || n === null ? null : {
			...n,
			arrow: !0,
			label: t.caption
		};
	}
	isPanel() {
		return !1;
	}
	chrome() {
		return !1;
	}
	escape() {}
	duplicate(e) {
		if (!this.editable) return null;
		let t = new Set([...this.collection.items, ...this.services.documentState.document.draft.nodes].flatMap((e) => e.links.map((e) => e.id))), n = this.collection.duplicate(e, this.services.settings.gridSize * 2, (e, n) => {
			e.links = xr(e, n, t);
		});
		return n.length === 0 ? null : n;
	}
	canDuplicate(e) {
		return this.editable && this.collection.item(e) !== void 0;
	}
	disconnect(e) {
		let t = this.editable ? this.links.filter((t) => e.has(t.from) || e.has(t.to)) : [];
		return this.editing.removeLinks(new Set(t.map((e) => e.id))), t.length > 0;
	}
	canDisconnect(e) {
		return this.editable && this.links.some((t) => t.from === e || t.to === e);
	}
	remove(e, t) {
		return this.editable ? (this.editing.removeLinks(t), this.editing.removeNodes(e), !0) : !1;
	}
	runCommand(e, t) {
		if (this.collection.answerConflict(e, t?.kind === "node" ? t.id : null)) return !0;
		if (!this.editable) return e === "graph:add-node" || e === "graph:caption" || e === "graph:delete-edge";
		switch (e) {
			case "graph:add-node": return this.editing.addNode(), !0;
			case "graph:caption": return t?.kind === "edge" && this.editing.editCaption(t.id), !0;
			case "graph:delete-edge": return t?.kind === "edge" && (this.editing.removeLinks(/* @__PURE__ */ new Set([t.id])), this.services.documentState.edited()), !0;
			default: return !1;
		}
	}
	syncMenus(e, t) {
		let n = e && this.editable;
		this.collection.showConflictAnswers(e && t?.kind === "node" && this.collection.conflict(t.id) !== null);
		for (let e of [
			"graph:add-node",
			"graph:caption",
			"graph:delete-edge"
		]) j(this.services, e, n);
	}
};
//#endregion
//#region src/nodes/layout.ts
function gi(e, t) {
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
	let f = Nr(s, c, {
		direction: "right",
		layerGap: r,
		layerGaps: (e) => vi(o, e, r),
		nodeGap: t.rowGap ?? 32,
		originX: l ? u : 0,
		originY: l ? d : 0
	}).positions;
	return (t.gridSize ?? 0) > 0 && _i(f, s, c, t.gridSize), f;
}
function _i(e, t, n, r) {
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
function vi(e, t, n) {
	let r = e.filter((e) => t.get(e.toNode) > t.get(e.fromNode)), i = /* @__PURE__ */ new Map();
	for (let e of r) i.set(`${e.fromNode}:${e.fromPin}`, (i.get(`${e.fromNode}:${e.fromPin}`) ?? 0) + 1);
	let a = /* @__PURE__ */ new Map();
	for (let e of r) {
		let n = `${e.fromNode}:${e.fromPin}`, r = t.get(e.fromNode), o = a.get(r) ?? /* @__PURE__ */ new Set();
		o.add((i.get(n) ?? 0) > 1 ? `from:${n}` : `to:${e.toNode}:${e.toPin}`), a.set(r, o);
	}
	return new Map([...a].map(([e, t]) => [e, Math.max(n, 28 + (t.size - 1) * 14)]));
}
var yi = "array", bi = "array:", xi = "text", Si = "image";
function Ci() {
	return {
		nodes: [],
		edges: [],
		groups: [],
		key: null,
		parameters: []
	};
}
function wi(e) {
	let t = e;
	return typeof t != "object" || !t ? Ci() : {
		nodes: (t.nodes ?? []).map(Ti),
		edges: (t.edges ?? []).map(Ei),
		groups: (t.groups ?? []).map(_e),
		key: de(t),
		parameters: (t.parameters ?? []).map((e) => ({
			node: String(e.node),
			pin: String(e.pin)
		}))
	};
}
function Ti(e) {
	return {
		id: String(e.id),
		type: String(e.type),
		x: Number(e.x) || 0,
		y: Number(e.y) || 0,
		title: e.title ?? null,
		color: e.color ?? null,
		pinned: e.pinned === !0,
		collapsed: e.collapsed === !0,
		enabled: e.enabled !== !1,
		values: { ...e.values },
		width: fe(e.width),
		height: fe(e.height)
	};
}
function Ei(e) {
	return {
		id: String(e.id),
		fromNode: String(e.fromNode),
		fromPin: String(e.fromPin),
		toNode: String(e.toNode),
		toPin: String(e.toPin),
		points: ge(e.points)
	};
}
function Di(e) {
	return e === yi || e.startsWith(bi);
}
function Oi(e) {
	return e === xi || e === Si;
}
function ki(e, t) {
	return e.length === 0 || t.length === 0 ? !1 : e === t || e === "any" || t === "any" || Oi(e) && Oi(t) ? !0 : Di(e) && Di(t) && (e === yi || t === yi);
}
function Ai(e, t, n) {
	let r = {};
	for (let t of e.inputs) t.editor !== "None" && t.defaultValue !== void 0 && t.defaultValue !== null && (r[t.name] = t.defaultValue);
	return {
		id: T("n"),
		type: e.key,
		x: t,
		y: n,
		title: null,
		color: null,
		pinned: !1,
		values: r
	};
}
function ji(e) {
	return e.hidden !== !0 && e.editor !== "None" && e.editor !== "Image" && e.editor !== "List" && e.editor !== "Display";
}
function Mi(e, t, n, r) {
	let i = e.nodes.find((e) => e.id === n), a = i === void 0 ? void 0 : t.get(i.type), o = L(a, r, !1);
	return i !== void 0 && a !== void 0 && o !== void 0 && ji(o) && Wi(e, n, r) === void 0 && Ki(o, i, a);
}
function Ni(e, t, n) {
	let r = e.parameters.filter((e) => e.node !== t || e.pin !== n), i = r.length !== e.parameters.length;
	return e.parameters = r, i;
}
function Pi(e, t, n, r, i) {
	let a = e.nodes.find((e) => e.id === n), o = L(a === void 0 ? void 0 : t.get(a.type), r, i === "out");
	return a === void 0 || o === void 0 ? !1 : e.edges.some((e) => Hi(e, n, r, i)) ? !0 : i === "in" && Fi(a, o);
}
function Fi(e, t) {
	return Ui(t) && JSON.stringify(e.values[t.name] ?? t.defaultValue ?? null) !== JSON.stringify(t.defaultValue ?? null);
}
function Ii(e, t, n, r, i) {
	let a = e.nodes.find((e) => e.id === n), o = L(a === void 0 ? void 0 : t.get(a.type), r, i === "out");
	a !== void 0 && o !== void 0 && (e.edges = e.edges.filter((e) => !Hi(e, n, r, i)), i === "in" && Li(a, o));
}
function Li(e, t) {
	Ui(t) && (e.values[t.name] = t.defaultValue ?? null);
}
function Ri(e, t, n) {
	let r = e.nodes.find((e) => e.id === n);
	return r !== void 0 && (t.get(r.type)?.inputs.some((e) => Fi(r, e)) ?? !1);
}
function zi(e, t, n) {
	let r = e.nodes.find((e) => e.id === n);
	if (r !== void 0) for (let e of t.get(r.type)?.inputs ?? []) Fi(r, e) && Li(r, e);
}
function Bi(e, t) {
	return e.edges.some((e) => e.fromNode === t || e.toNode === t);
}
function Vi(e, t) {
	let n = e.edges.filter((e) => !t.has(e.fromNode) && !t.has(e.toNode)), r = n.length !== e.edges.length;
	return e.edges = n, r;
}
function Hi(e, t, n, r) {
	return r === "in" ? e.toNode === t && e.toPin === n : e.fromNode === t && e.fromPin === n;
}
function Ui(e) {
	return e.editor !== "None" && e.editor !== "Display";
}
function Wi(e, t, n) {
	return e.edges.find((e) => e.toNode === t && e.toPin === n);
}
function Gi(e, t, n) {
	return e.edges.filter((e) => e.toNode === t && e.toPin === n);
}
function Ki(e, t, n) {
	if (e.hidden === !0) return !1;
	let r = e.visibleWhen ?? "";
	if (r.length === 0) return !0;
	let i = qi(t.values, n, r), a = e.visibleValues ?? [];
	return a.length > 0 ? a.some((e) => e === Ji(i)) : i != null && i !== !1 && Ji(i).length > 0;
}
function qi(e, t, n) {
	return e[n] ?? t.inputs.find((e) => e.name === n)?.defaultValue;
}
function Ji(e) {
	return e == null ? "" : String(e);
}
function L(e, t, n) {
	return (n ? e?.outputs : e?.inputs)?.find((e) => e.name === t);
}
function R(e, t, n, r, i = /* @__PURE__ */ new Set()) {
	let a = `${n}:${r}`;
	if (i.has(a)) return "any";
	i.add(a);
	let o = e.nodes.find((e) => e.id === n), s = o === void 0 ? void 0 : t.get(o.type), c = L(s, r, !0);
	if (c === void 0) return "any";
	if (c.typeOf === null || c.typeOf === void 0 || c.typeOf.length === 0) return c.type;
	let l = Wi(e, n, c.typeOf);
	return l === void 0 ? L(s, c.typeOf, !1)?.type ?? "any" : R(e, t, l.fromNode, l.fromPin, i);
}
function Yi(e, t, n, r) {
	if (r.type === Si) return !0;
	let i = Wi(e, n, r.name);
	return i !== void 0 && R(e, t, i.fromNode, i.fromPin) === Si;
}
function Xi(e, t) {
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
function Zi(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	return {
		nodes: e.nodes.map((e) => {
			let i = T("n");
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
			id: T("e"),
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
var Qi = "$picture", $i = "ui.graph.more", ea = "✓", ta = "✕", na = "ui-graph__display--picture";
function ra(e, t, n) {
	let r = ia(t, n);
	e.replaceChildren(r), e.classList.toggle(na, r.classList.contains("ui-graph__display-image") && !r.classList.contains("ui-graph__display-image--sized"));
}
function ia(e, t) {
	if (e == null || e === "") return z(t.empty, "ui-graph__display-empty");
	if (typeof e == "string") return t.picture === !0 && ca(e, t) ? la(e, null, null) : z(t.moment(e) ?? e, "ui-graph__display-text");
	if (typeof e == "number") return z(t.number(e), "ui-graph__display-number");
	if (typeof e == "bigint") return z(String(e), "ui-graph__display-number");
	if (typeof e == "boolean") return z(e ? ea : ta, "ui-graph__display-number");
	if (Array.isArray(e)) return e.length === 0 ? z(t.empty, "ui-graph__display-empty") : ua(e, t);
	let n = oa(e);
	if (n !== null) return sa(n, t);
	let r = aa(e);
	return r === null ? typeof e == "object" ? pa(e, t) : z(String(e), "ui-graph__display-text") : z(t.more(r), "ui-graph__display-empty");
}
function aa(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) return null;
	let t = e;
	return t.key === "ui.graph.more" && Object.keys(e).length === 2 && typeof t.args?.count == "number" ? t.args.count : null;
}
function oa(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) return null;
	let t = e, n = t[Qi];
	return typeof n == "string" ? {
		address: n,
		width: fe(t.width),
		height: fe(t.height)
	} : null;
}
function sa(e, t) {
	return ca(e.address, t) ? la(e.address, e.width, e.height) : z(e.address, "ui-graph__display-text");
}
function ca(e, t) {
	return /^blob:/i.test(e.trim()) || t.isImageSource(e);
}
function z(e, t) {
	let n = document.createElement("div");
	return n.className = t, n.textContent = e, n;
}
function la(e, t, n) {
	let r = document.createElement("img");
	return r.className = "ui-graph__display-image", t !== null && (r.classList.add("ui-graph__display-image--sized"), r.style.width = `${t}px`, n !== null && (r.style.height = `${n}px`)), r.src = e, r.alt = "", r.addEventListener("error", () => {
		r.parentElement?.classList.remove(na), r.replaceWith(z(e, "ui-graph__display-text"));
	}, { once: !0 }), r;
}
function ua(e, t) {
	let { entries: n, more: r } = da(e), i = fa(n);
	if (i === null) {
		let n = document.createElement("div");
		n.className = "ui-graph__display-list";
		let r = {
			...t,
			picture: !1
		};
		for (let t of e) n.append(ia(t, r));
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
			i.textContent = ma(r[e], t), n.append(i);
		}
		a.append(n);
	}
	if (r !== null) {
		let e = document.createElement("tr"), n = document.createElement("td");
		n.colSpan = i.length, n.className = "ui-graph__display-empty", n.textContent = t.more(r), e.append(n), a.append(e);
	}
	return a;
}
function da(e) {
	let t = e.length === 0 ? null : aa(e.at(-1));
	return t === null ? {
		entries: e,
		more: null
	} : {
		entries: e.slice(0, -1),
		more: t
	};
}
function fa(e) {
	let t = [];
	for (let n of e) {
		if (typeof n != "object" || !n || Array.isArray(n) || oa(n) !== null) return null;
		for (let e of Object.keys(n)) t.includes(e) || t.push(e);
	}
	return t.length === 0 ? null : t;
}
function pa(e, t) {
	let n = document.createElement("div");
	n.className = "ui-graph__display-record";
	for (let [r, i] of Object.entries(e)) {
		let e = oa(i);
		if (e !== null) {
			n.append(sa(e, t));
			continue;
		}
		let a = document.createElement("div");
		a.className = "ui-graph__display-field", a.append(z(r, "ui-graph__display-key")), a.append(z(ma(i, t), "ui-graph__display-value")), n.append(a);
	}
	return n.childElementCount === 0 ? z(t.empty, "ui-graph__display-empty") : n;
}
function ma(e, t) {
	if (e == null) return "";
	if (typeof e == "number") return t.number(e);
	if (typeof e == "boolean") return e ? ea : ta;
	if (typeof e == "string") return t.moment(e) ?? e;
	if (Array.isArray(e)) return t.list(e.map((e) => ma(e, t)));
	let n = oa(e);
	if (n !== null) return n.address;
	let r = aa(e);
	return r === null ? typeof e == "object" ? t.list(Object.entries(e).map(([e, n]) => t.field(e, ma(n, t)))) : String(e) : t.more(r);
}
var ha = /* @__PURE__ */ new Map();
function ga(e, t) {
	let n = ha.get(t);
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
		ha.set(t, n);
	}
	return n.format(e);
}
//#endregion
//#region src/nodes/node-view.ts
var B = "data-ui-graph-pin", _a = "data-ui-graph-pin-dir", va = "data-ui-graph-pin-type", ya = "data-ui-graph-state", ba = "data-ui-graph-head", xa = "data-ui-graph-value", Sa = "data-ui-graph-display", Ca = "data-ui-graph-uploading", wa = "data-ui-graph-off", Ta = "graph-pin-menu", Ea = "data-ui-graph-pin-menu", Da = "data-ui-graph-pin-menu-dir", Oa = "data-ui-graph-pin-many", ka = "data-ui-graph-pin-optional", Aa = {
	any: "ui.graph.type-any",
	array: "ui.graph.type-list",
	text: "ui.graph.type-text",
	number: "ui.graph.type-number",
	boolean: "ui.graph.type-boolean",
	image: "ui.graph.type-image",
	date: "ui.graph.type-date",
	time: "ui.graph.type-time",
	datetime: "ui.graph.type-datetime"
}, ja = "array:", Ma = "enum:", Na = "ui.graph.display-field", Pa = "graph-editor:", Fa = "graph-list-remove", Ia = "graph-list-add", La = "graph-state-reset", Ra = "data-ui-graph-list-add";
function za(e, t, n) {
	let r = ie("ui-graph__node", e.id, e, e.color ?? t?.color ?? null, null);
	if (t?.minWidth !== null && t?.minWidth !== void 0 && r.style.setProperty("--ui-graph-node-min-width", `${t.minWidth}rem`), e.collapsed !== !0 && e.width !== null && e.width !== void 0 && e.width > 0 && r.style.setProperty("--ui-graph-node-w", String(e.width)), e.collapsed !== !0 && e.height !== null && e.height !== void 0 && e.height > 0 && r.style.setProperty("--ui-graph-node-h", String(e.height)), e.enabled === !1 && r.setAttribute(wa, ""), t?.compact === !0) return Ba(r, e, t, n);
	let i = Ha(e, t, n);
	if (r.append(i), t?.showProgress === !0 && i.append(Ga()), e.collapsed === !0) return r.setAttribute(d, ""), i.append(Va(e, t, n)), r;
	let a = document.createElement("div");
	if (a.className = "ui-graph__node-body", t === void 0) {
		let t = document.createElement("div");
		t.className = "ui-graph__node-unknown", t.textContent = e.type, a.append(t);
	} else {
		let r = t.inputs.filter((n) => Ki(n, e, t)), i = r.filter((e) => e.editor === "None");
		for (let r = 0; r < Math.max(i.length, t.outputs.length); r++) a.append(Ka(e, i[r], t.outputs[r], n));
		for (let t of r) t.editor !== "None" && a.append(Ya(e, t, n));
	}
	return r.append(a), !n.readOnly && t?.resizable !== !1 && r.append(ae()), r;
}
function Ba(e, t, n, r) {
	let i = n.inputs[0], a = n.outputs[0];
	e.classList.add("ui-graph__node--compact"), (t.color ?? null) === null && a !== void 0 && e.style.setProperty("--ui-graph-node-color", r.pinColor(r.outputType(t.id, a.name)));
	let o = document.createElement("span");
	o.className = "ui-graph__node-reroute", o.textContent = t.title ?? (i === void 0 ? null : r.feedTitle(t.id, i.name)) ?? n.title;
	let s = document.createElement("div");
	return s.className = "ui-graph__node-ports", i !== void 0 && a !== void 0 && s.append(V(H(t, i, r.outputType(t.id, a.name), "in", r), i, "in", r)), a !== void 0 && s.append(V(H(t, a, r.outputType(t.id, a.name), "out", r), a, "out", r)), e.append(o, s), e;
}
function Va(e, t, n) {
	let r = document.createElement("div");
	if (r.className = "ui-graph__node-ports", t === void 0) return r;
	for (let i of t.inputs) i.hasPin !== !1 && Ki(i, e, t) && r.append(V(H(e, i, i.type, "in", n), i, "in", n));
	for (let i of t.outputs) r.append(V(H(e, i, n.outputType(e.id, i.name), "out", n), i, "out", n));
	return r;
}
function Ha(e, t, n) {
	let r = document.createElement("div");
	r.className = "ui-graph__node-head", r.setAttribute(ba, "");
	let i = document.createElement("button"), a = e.collapsed === !0;
	i.type = "button", i.className = "ui-graph__node-fold", i.setAttribute(u, ""), Ua(i, a ? "ui.graph.expand" : "ui.graph.collapse", n), i.setAttribute("aria-expanded", String(!a)), i.append(Wa(n, a ? "ne-chevron-right" : "ne-chevron-down")), r.append(i);
	let o = t?.icon ?? null;
	o !== null && o.length > 0 && r.append(Wa(n, o, "ui-graph__node-icon"));
	let s = document.createElement("span");
	s.className = "ui-graph__node-title", s.textContent = e.title ?? t?.title ?? e.type, r.append(s);
	let c = document.createElement("button");
	return c.type = "button", c.className = "ui-graph__node-pinned", c.setAttribute(l, ""), Ua(c, e.pinned === !0 ? "ui.graph.unpin" : "ui.graph.pin", n), c.append(Wa(n, e.pinned === !0 ? "ne-pin" : "ne-pin-outlined")), r.append(c), r;
}
function Ua(e, t, n) {
	n.words.write(e, "aria-label", t), n.words.write(e, n.names.tooltip, t), n.readOnly && n.states.setDisabled(e, !0);
}
function Wa(e, t, n) {
	let r = document.createElement("span");
	return n !== void 0 && (r.className = n), r.setAttribute("aria-hidden", "true"), e.icons.apply(r, t), r;
}
function Ga() {
	let e = document.createElement("div");
	return e.className = "ui-graph__node-progress", e.hidden = !0, e.append(document.createElement("i")), e;
}
function Ka(e, t, n, r) {
	let i = document.createElement("div");
	return i.className = "ui-graph__row", t !== void 0 && (i.append(V(H(e, t, t.type, "in", r), t, "in", r)), i.append(V(Ja(t, "ui-graph__row-label"), t, "in", r))), n !== void 0 && (i.append(V(qa(n.title, "ui-graph__row-label ui-graph__row-label--out"), n, "out", r)), i.append(V(H(e, n, r.outputType(e.id, n.name), "out", r), n, "out", r))), i;
}
function V(e, t, n, r) {
	return e.setAttribute(r.names.contextMenuUse, Ta), e.setAttribute(Ea, t.name), e.setAttribute(Da, n), e;
}
function qa(e, t) {
	let n = document.createElement("span");
	return n.className = t, n.textContent = e, n;
}
function Ja(e, t) {
	return qa(e.title, t);
}
function Ya(e, t, n) {
	let r = document.createElement("div"), i = t.hasPin !== !1 && n.isConnected(e.id, t.name, "in");
	r.className = Qa(t) ? "ui-graph__row ui-graph__row--tall" : "ui-graph__row", V(r, t, "in", n), (t.editor === "Image" && t.large === !0 || t.editor === "Display" || t.editor === "Text" && (t.maxLines ?? 1) > 1) && r.classList.add("ui-graph__row--grow"), t.hasPin !== !1 && r.append(H(e, t, t.type, "in", n));
	let a = i && t.editor !== "List", o = eo(e, t, a, n), s = o.querySelector(`[${Ra}]`);
	if (s !== null) {
		let e = document.createElement("div");
		e.className = "ui-graph__row-head", e.append(Ja(t, "ui-graph__row-label")), e.append(s), r.append(e), r.classList.add("ui-graph__row--headed");
	} else Za(t) || r.append(Ja(t, "ui-graph__row-label"));
	if (t.height !== null && t.height !== void 0 && t.height > 0 && o.style.setProperty("--ui-graph-editor-height", `${t.height}rem`), a && r.classList.add("ui-graph__row--connected"), r.append(o), t.state === !0) {
		let i = Xa(e, t, o, n);
		i !== null && r.append(i);
	}
	return r;
}
function Xa(e, t, n, r) {
	let i = r.cloneEditor(La);
	return i === null ? null : (lo(i, r.readOnly, r), i.addEventListener("click", () => {
		let i = t.defaultValue ?? null, a = n.firstElementChild;
		a !== null && r.setProperty(a, "Value", i), r.onValueChanged(e.id, t.name, i);
	}), i);
}
function Za(e) {
	return !Qa(e) && e.editor !== "Boolean";
}
function Qa(e) {
	return e.editor === "Image" && e.large === !0 || e.editor === "List" || e.editor === "Display" || e.editor === "Text" && (e.maxLines ?? 1) > 1;
}
function H(e, t, n, r, i) {
	let a = document.createElement("span");
	a.className = "ui-graph__pin", a.setAttribute(B, t.name), a.setAttribute(_a, r), a.setAttribute(va, n), a.style.setProperty("--ui-graph-pin-color", i.pinColor(n)), t.multiple === !0 && a.setAttribute(Oa, ""), i.isConnected(e.id, t.name, r) && a.classList.add("ui-graph__pin--filled"), (r === "out" || t.required !== !0) && a.setAttribute(ka, "");
	let o = i.words, s = t.description ?? "", c = o.format("ui.graph.pin-type", {
		name: i.tooltips.escape(t.title),
		type: $a(n, t.multiple === !0, i)
	});
	return oe(a, s.length > 0 ? `${c}\n${s}` : c, i.tooltips), a;
}
function $a(e, t, n) {
	let r = n.words, i = (e) => {
		if (e.startsWith(ja)) return r.format("ui.graph.type-list-of", { type: i(e.slice(6)) });
		let t = Aa[e];
		if (t !== void 0) return r.text(t);
		let a = n.typeTitles.get(e);
		return n.tooltips.escape(a === void 0 ? e.startsWith(Ma) ? e.slice(5) : e : a);
	};
	return t ? r.format("ui.graph.pin-many", { type: i(e) }) : i(e);
}
function eo(e, t, n, r) {
	let i = r.isConnected(e.id, t.name, "in"), a = e.values[t.name] ?? (i ? null : t.defaultValue);
	switch (t.editor) {
		case "Image": return co(e, t, a, n || r.readOnly, r);
		case "List": return uo(e, t, a, r);
		case "Display": return oo(t, r);
		default: return to(e, t, a, n || r.readOnly, r);
	}
}
function to(e, t, n, r, i) {
	let a = no(t, t.editor === "Boolean" ? "ui-graph__editor--check" : null), o = i.cloneEditor(`${Pa}${e.type}:${t.name}`);
	return o === null || (a.append(o), ro(o, n ?? null, r, i, () => i.onValueChanged(e.id, t.name, io(t, i.readValue(o))))), a;
}
function no(e, t) {
	let n = document.createElement("div");
	return n.className = t === null ? "ui-graph__editor" : `ui-graph__editor ${t}`, n.setAttribute(xa, e.name), n;
}
function ro(e, t, n, r, i) {
	r.setProperty(e, "Value", t), n ? r.setProperty(e, "IsReadOnly", !0) : e.addEventListener("change", i);
}
function io(e, t) {
	return e.editor === "Text" && t === "" ? "" : ao(e.editor === "Number", t);
}
function ao(e, t) {
	if (t === void 0 || t === "") return null;
	if (e && typeof t == "string") {
		let e = Number(t);
		return Number.isFinite(e) ? e : null;
	}
	return t;
}
function oo(e, t) {
	let n = document.createElement("div");
	return n.className = "ui-graph__editor ui-graph__editor--display", n.setAttribute(xa, e.name), n.setAttribute(Sa, ""), ra(n, null, so(e, t)), n;
}
function so(e, t) {
	return {
		empty: t.words.text("ui.graph.no-value"),
		more: (e) => t.words.format($i, { count: e }),
		list: (e) => ga(e, document.documentElement.lang),
		field: (e, n) => t.words.format(Na, {
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
function co(e, t, n, r, i) {
	let a = t.large === !0, o = no(t, a ? "ui-graph__editor--picture" : null), s = Ji(n), c = i.cloneEditor(`${Pa}${e.type}:${t.name}`);
	if (c === null) return o;
	if (o.append(c), a) return ro(c, s.length === 0 ? null : s, r, i, () => {
		let n = c.querySelector(`input.${_.pictureSelectionClass}`);
		if (n === null || n.value.length === 0) return;
		let r = c.querySelector(`.${_.pictureTextClass}`)?.textContent ?? "";
		i.onImageUploaded(e.id, t.name, n.value, r);
	}), o;
	ro(c, s.length === 0 ? null : s, r, i, () => {
		let n = Ji(i.readValue(c));
		i.onValueChanged(e.id, t.name, n.length === 0 ? null : n);
	});
	let l = c.querySelector(`.${_.textInputActionClass} > *`);
	return l !== null && (lo(l, r, i), l.addEventListener("click", (n) => {
		n.preventDefault(), i.onPickImage(e.id, t.name);
	})), o;
}
function lo(e, t, n) {
	t && n.setProperty(e, "Enabled", !1);
}
function uo(e, t, n, r) {
	let i = no(t, "ui-graph__editor--list"), a = Array.isArray(n) ? [...n] : [], o = t.type === "array:number" || t.type === "number", s = document.createElement("div");
	s.className = "ui-graph__list-rows", i.append(s);
	let c = () => r.onValueChanged(e.id, t.name, [...a]), l = () => {
		s.replaceChildren(), s.hidden = a.length === 0, a.forEach((n, i) => {
			let u = document.createElement("div"), d = r.cloneEditor(`${Pa}${e.type}:${t.name}`), f = r.cloneEditor(Fa);
			u.className = "ui-graph__list-row", d !== null && (ro(d, n ?? null, r.readOnly, r, () => {
				a[i] = ao(o, r.readValue(d)), c();
			}), u.append(d)), f !== null && (lo(f, r.readOnly, r), f.addEventListener("click", () => {
				a.splice(i, 1), l(), c();
			}), u.append(f)), s.append(u);
		});
	};
	l();
	let u = r.cloneEditor(Ia);
	return u !== null && (u.setAttribute(Ra, ""), lo(u, r.readOnly, r), u.addEventListener("click", () => {
		a.push(null), l(), c();
	}), i.append(u)), i;
}
//#endregion
//#region src/nodes/nodes-log.ts
var fo = "data-ui-graph-log-node", po = "data-ui-graph-log-open", mo = "data-ui-graph-run-state", ho = 500, go = "ui.graph.run-line", _o = class {
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
		for (let [t, n] of this.displays) if (!e.has(t)) this.displays.delete(t);
		else for (let [e, r] of n) this.applyDisplay(t, e, r);
	}
	forgetNode(e) {
		this.statuses.delete(e), this.displays.delete(e);
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
		n.setAttribute(ya, t.state), r !== null && (r.hidden = t.state !== "running" || t.progress === null, t.progress !== null && r.style.setProperty("--ui-graph-progress", String(Math.min(1, Math.max(0, t.progress)))));
	}
	setDisplay(e, t, n) {
		let r = this.displays.get(e);
		r === void 0 && (r = /* @__PURE__ */ new Map(), this.displays.set(e, r)), r.set(t, n), this.applyDisplay(e, t, n);
	}
	applyDisplay(e, t, n) {
		let r = this.services.nodeElements.get(e)?.querySelector(`[data-ui-graph-display][data-ui-graph-value="${CSS.escape(t)}"]`) ?? null;
		if (r === null) return;
		let i = this.services.documentState.document, a = i.nodes.find((t) => t.id === e), o = L(a === void 0 ? void 0 : this.types.get(a.type), t, !1);
		ra(r, n, {
			...so(o, {
				words: this.context.strings,
				number: (e, t) => this.formatNumber(e, t),
				date: (e, t) => this.formatDate(e, t),
				temporal: this.context.temporal,
				urls: this.context.urls
			}),
			picture: o !== void 0 && Yi(i, this.types, e, o)
		});
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
		if (this.log.push(r), this.log.length > ho) {
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
		t.className = "ui-graph__log-entry", t.setAttribute("data-ui-graph-log-level", e.level), n.className = "ui-graph__log-time", n.dateTime = e.at.toISOString(), n.textContent = this.context.temporal.format(e.at, "HH:mm:ss", this.context.temporal.readCulture(this.root)), r.type = "button", r.className = "ui-graph__log-node", r.setAttribute(fo, e.nodeId), r.textContent = this.nodeName(e.nodeId), i.className = "ui-graph__log-message";
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
		this.logCount.hidden = this.log.length === 0, this.context.badges.writeCount(this.logCount, this.log.length), this.logCount.classList.toggle(_.badgeDangerClass, e > 0), this.logCount.classList.toggle(_.badgeWarningClass, e === 0 && t > 0), this.logCount.classList.toggle(_.badgeSurfaceClass, e === 0 && t === 0);
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
		n && Nt(t?.querySelector("[data-ui-graph-log-node]") ?? null, this.logToggle, this.context.focus);
	}
	setLogOpen(e, t = !1) {
		this.root.toggleAttribute(po, e), this.logToggle?.setAttribute("aria-expanded", String(e)), t && this.context.store.write(this.root, "log", e ? "open" : null);
	}
	isLogOpen() {
		return this.root.hasAttribute(po);
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
		this.runLine.style.setProperty("--ui-graph-run", String(n)), this.runLine.style.setProperty("--ui-graph-run-step", String(t)), this.runLine.setAttribute("aria-valuenow", String(r)), this.runLine.setAttribute(mo, this.runStarted ? this.runFailed ? "failed" : this.runStopped ? "stopped" : i ? "done" : "running" : "idle"), this.runLabel !== null && (this.runLabel.textContent = this.runLabelText(e)), this.runShare !== null && (this.runShare.textContent = this.runStarted ? re(this.context, this.runShare, r) : "");
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
		return this.context.strings.format(go, {
			node: this.nodeName(e),
			message: t
		});
	}
}, vo = "data-ui-graph-parameters-for", yo = "[data-ui-graph-parameters-list]", bo = "data-ui-graph-parameter-node", xo = "data-ui-graph-parameter-pin", U = "data-ui-graph-parameter-remove", So = "graph-editor:", Co = "graph-list-remove", wo = "ui-graph__parameter", To = "ui-graph__parameter-name", Eo = "ui-graph__parameter-node", Do = "ui-graph__parameter-pin", Oo = "ui-graph__parameter-field", ko = class {
	services;
	host;
	drawnKey = "";
	drawnList = null;
	fields = /* @__PURE__ */ new Map();
	rows = /* @__PURE__ */ new Map();
	heard = /* @__PURE__ */ new WeakSet();
	constructor(e, t) {
		this.services = e, this.host = t;
	}
	get panel() {
		let e = this.services.root.getAttribute(this.services.context.names.componentId);
		return e === null ? null : this.services.context.root.querySelector(`[${vo}="${CSS.escape(e)}"]`);
	}
	get shown() {
		return this.panel !== null;
	}
	get document() {
		return this.services.documentState.document;
	}
	has(e, t) {
		return this.document.parameters.some((n) => n.node === e && n.pin === t);
	}
	allows(e, t) {
		return this.shown && Mi(this.document, this.host.types, e, t);
	}
	toggle(e, t) {
		if (!this.services.settings.readOnly) {
			if (!Ni(this.document, e, t)) {
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
	press(e, t) {
		if (!this.services.root.isConnected) return;
		let n = t.closest(`[${U}]`);
		if (n !== null) {
			this.remove(e, n);
			return;
		}
		let r = t.closest(`[${bo}]`)?.getAttribute(bo);
		r != null && this.host.show(r);
	}
	remove(e, t) {
		let n = e.querySelector(yo), r = t.closest(`.${wo}`), i = r === null || n === null ? -1 : [...n.children].indexOf(r), a = t.contains(document.activeElement);
		this.toggle(t.getAttribute(bo) ?? "", t.getAttribute(xo) ?? ""), a && n !== null && !n.contains(document.activeElement) && (Pt(n.children[i]?.querySelector(`[${U}]`) ?? null, this.services.context.focus) ?? e).focus({ preventScroll: !0 });
	}
	draw() {
		let e = this.panel, t = e?.querySelector(yo) ?? null;
		if (e === null || t === null) return;
		this.listen(e);
		let n = this.find(), r = this.services.settings.readOnly, i = JSON.stringify([r, n.map((e) => [
			e.parameter.node,
			e.parameter.pin,
			e.node.title ?? null
		])]);
		if (i === this.drawnKey && t === this.drawnList) {
			for (let e of n) this.showValue(e.node.id, e.pin.name, e.node.values[e.pin.name]);
			return;
		}
		let a = this.focusedPart(t);
		this.drawnKey = i, this.drawnList = t, this.fields.clear(), this.rows.clear(), t.replaceChildren(...n.map((e) => this.row(e, r))), this.restoreFocus(a);
	}
	listen(e) {
		this.heard.has(e) || (this.heard.add(e), e.addEventListener("click", (t) => {
			t.target instanceof Element && this.press(e, t.target);
		}));
	}
	focusedPart(e) {
		let t = document.activeElement;
		if (t === null || !e.contains(t)) return null;
		for (let [e, n] of this.rows) if (n.contains(t)) return {
			row: e,
			part: t.closest(`.${To}`) === null ? t.closest(`[${U}]`) === null ? Oo : U : To
		};
		return null;
	}
	restoreFocus(e) {
		let t = e === null ? void 0 : this.rows.get(e.row);
		e !== null && t !== void 0 && Pt(t.querySelector(e.part === U ? `[${U}]` : `.${e.part}`), this.services.context.focus)?.focus({ preventScroll: !0 });
	}
	showValue(e, t, n) {
		let r = this.fields.get(`${e}\n${t}`);
		r === void 0 || r.field.contains(document.activeElement) || this.services.context.properties.set(r.field, "Value", this.shownValue(r.found, n));
	}
	find() {
		let e = [];
		for (let t of this.document.parameters) {
			let n = this.document.nodes.find((e) => e.id === t.node), r = n === void 0 ? void 0 : this.host.types.get(n.type), i = L(r, t.pin, !1);
			n !== void 0 && r !== void 0 && i !== void 0 && Mi(this.document, this.host.types, n.id, i.name) && e.push({
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
		let n = this.services.context, r = document.createElement("div"), i = document.createElement("button"), a = document.createElement("span"), o = document.createElement("span"), s = this.host.cloneEditor(`${So}${e.node.type}:${e.pin.name}`), c = this.host.cloneEditor(Co);
		if (r.className = wo, i.className = To, i.type = "button", i.setAttribute(bo, e.node.id), a.className = Eo, a.textContent = this.nameOf(e), i.append(a), Za(e.pin) || (o.className = Do, o.textContent = e.pin.title, i.append(o)), r.append(i), this.rows.set(`${e.node.id}\n${e.pin.name}`, r), s !== null) {
			let i = n.properties;
			s.classList.add(Oo), i.set(s, "Value", this.shownValue(e, e.node.values[e.pin.name])), t ? i.set(s, "IsReadOnly", !0) : s.addEventListener("change", () => this.host.setValue(e.node.id, e.pin.name, this.host.readValue(e.pin, s))), this.fields.set(`${e.node.id}\n${e.pin.name}`, {
				field: s,
				found: e
			}), r.append(s);
		}
		return c !== null && (c.setAttribute(U, ""), c.setAttribute(bo, e.node.id), c.setAttribute(xo, e.pin.name), n.properties.set(c, "Enabled", !t), r.append(c)), r;
	}
}, Ao = "[data-ui-graph-picker]", jo = "[data-ui-graph-picker-search] input", Mo = "[data-ui-graph-picker-rail]", No = "[data-ui-graph-picker-rail-toggle]", Po = "[data-ui-graph-picker-list]", Fo = "[data-ui-graph-picker-empty]", Io = "data-ui-graph-kind", W = "data-ui-graph-category", Lo = "data-ui-graph-category-fold", G = "/", Ro = "--ui-graph-picker-depth", zo = ".ui-graph__viewport", Bo = "input, button, [tabindex]", K = "ui-graph__picker-entry", Vo = "ui-graph__picker-entry--current", Ho = "ui-graph__picker-entry--pointed", q = "/", Uo = class e {
	panel;
	search;
	rail;
	railToggle;
	list;
	empty;
	home;
	entries;
	words;
	icons;
	ids;
	roving;
	focus;
	shortcuts;
	choose;
	category = q;
	railStop = q;
	drawnTerms = "";
	unfolded = /* @__PURE__ */ new Set();
	pointerX = NaN;
	pointerY = NaN;
	pressedBackdrop = !1;
	constructor(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
		this.panel = e, this.search = t, this.rail = n, this.railToggle = e.querySelector(No), this.list = r, this.empty = i, this.home = a, this.entries = o, this.words = s, this.icons = c, this.ids = l, this.roving = u, this.focus = d, this.shortcuts = f, this.choose = p, this.search.addEventListener("input", () => this.draw(!0)), this.search.addEventListener("change", () => {
			this.search.value !== this.drawnTerms && this.draw(!1);
		}), this.search.addEventListener("keydown", (e) => this.key(e)), this.panel.addEventListener("keydown", (e) => this.escape(e)), this.panel.addEventListener("keydown", (e) => this.tab(e)), this.panel.addEventListener("mousedown", (e) => this.press(e)), this.rail.addEventListener("click", (e) => this.rails(e)), this.railToggle?.addEventListener("click", () => this.showRail(this.railToggle?.getAttribute("aria-expanded") !== "true")), this.rail.addEventListener("keydown", (e) => this.railKey(e)), this.list.addEventListener("click", (e) => this.click(e)), this.list.addEventListener("pointermove", (e) => this.point(e)), this.panel.addEventListener("pointerdown", (e) => {
			this.pressedBackdrop = e.target === this.panel;
		}), this.panel.addEventListener("click", (e) => {
			e.target === this.panel && this.pressedBackdrop && this.close();
		}), this.panel.addEventListener("close", () => {
			this.search.setAttribute("aria-expanded", "false"), this.returnKeyboard();
		});
	}
	static create(t, n, r, i, a, o, s, c, l) {
		let u = t.querySelector(Ao), d = u?.querySelector(jo) ?? null, f = u?.querySelector(Mo) ?? null, p = u?.querySelector(Po) ?? null, m = u?.querySelector(Fo) ?? null;
		return u === null || d === null || f === null || p === null || m === null ? null : (d.setAttribute("role", "combobox"), d.setAttribute("aria-controls", i.ensureId(p, "ui-graph-picker-list")), d.setAttribute("aria-autocomplete", "list"), d.setAttribute("aria-expanded", "false"), p.tabIndex = -1, u.querySelector(No)?.setAttribute("aria-controls", i.ensureId(f, "ui-graph-picker-rail")), new e(u, d, f, p, m, t.querySelector(zo), n, r, a, i, o, s, c, l));
	}
	get isOpen() {
		return this.panel.open;
	}
	open() {
		this.search.value = "", this.category = q, this.railStop = q, this.showRail(!1), this.drawRail(), this.draw(!1), this.panel.open || this.panel.showModal(), this.search.setAttribute("aria-expanded", "true"), this.search.focus({ preventScroll: !0 });
	}
	close() {
		this.search.setAttribute("aria-expanded", "false"), this.panel.open && this.panel.close();
	}
	showRail(e) {
		this.railToggle?.setAttribute("aria-expanded", String(e));
	}
	contains(e) {
		return e instanceof Node && this.panel.contains(e);
	}
	escape(e) {
		e.key !== "Escape" || e.defaultPrevented || this.shortcuts.isEscapeClaimed(e) || !this.isOpen || (e.preventDefault(), this.close());
	}
	returnKeyboard() {
		let e = document.activeElement;
		this.home !== null && (e === null || e === document.body || this.panel.contains(e)) && this.home.focus({ preventScroll: !0 });
	}
	tab(e) {
		e.key === "Tab" && !e.defaultPrevented && this.shortcuts.isPlainKey(e, { shift: !0 }) && this.focus.trapTab(this.panel, e);
	}
	press(e) {
		let t = e.target instanceof Element ? e.target : null;
		if (t === null || t === this.panel) return;
		let n = t.closest(Bo);
		(n === null || n === this.panel || !this.panel.contains(n) || this.list.contains(n)) && (e.preventDefault(), document.activeElement !== this.search && this.search.focus({ preventScroll: !0 }));
	}
	drawRail() {
		let e = [], t = /* @__PURE__ */ new Map();
		for (let n of this.entries()) {
			let r = Wo(n), i = r.length === 0 ? [""] : r.split(G), a = e;
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
		let r = t.get(this.category);
		this.showChosen(r === void 0 ? n[0].caption : r.path.length === 0 ? this.words.text("ui.graph.uncategorized") : r.name);
		let i = /* @__PURE__ */ new Map();
		for (let e of this.rail.querySelectorAll(`[${W}]`)) i.set(e.getAttribute(W) ?? "", e);
		let a = new Set(n.map((e) => e.category));
		for (let [e, t] of i) a.has(e) || t.remove();
		let o = this.rail.firstElementChild;
		for (let e of n) {
			let t = i.get(e.category);
			t !== void 0 && t.hasAttribute("aria-expanded") !== e.folds && (t === o && (o = t.nextElementSibling), t.remove(), t = void 0), t ??= this.railEntry(e), this.showRailEntry(t, e), t === o ? o = t.nextElementSibling : this.rail.insertBefore(t, o);
		}
		let s = this.railEntries();
		this.roving.applyTabIndex(s, s.find((e) => e.getAttribute(W) === this.railStop) ?? s.find((e) => e.getAttribute(W) === this.category) ?? s[0] ?? null);
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
	showChosen(e) {
		let t = this.railToggle?.firstElementChild ?? null;
		t !== null && t.textContent !== e && (t.textContent = e);
	}
	railEntry(e) {
		let t = document.createElement("button"), n = document.createElement("span"), r = document.createElement("span");
		return t.type = "button", t.className = "ui-graph__picker-category", t.setAttribute("role", "treeitem"), t.setAttribute(W, e.category), n.className = "ui-graph__picker-fold", n.setAttribute("aria-hidden", "true"), e.folds && (n.setAttribute(Lo, ""), this.icons.apply(n, "ne-chevron-right")), t.append(n, r), t;
	}
	showRailEntry(e, t) {
		let n = e.lastElementChild;
		e.setAttribute("aria-selected", String(t.category === this.category)), e.setAttribute("aria-level", String(t.depth + 1)), e.style.setProperty(Ro, String(t.depth)), t.folds && e.setAttribute("aria-expanded", String(this.unfolded.has(t.category))), n !== null && n.textContent !== t.caption && (n.textContent = t.caption);
	}
	rails(e) {
		let t = e.target instanceof Element ? e.target : null, n = t === null ? null : t.closest(`[${W}]`);
		if (t === null || n === null) return;
		let r = n.getAttribute(W) ?? q;
		t.closest(`[${Lo}]`) === null ? (n.hasAttribute("aria-expanded") && this.toggle(r, r !== this.category || void 0), this.category = r, this.railStop = r, this.showRail(!1), this.drawRail(), this.draw(e.detail === 0)) : (this.toggle(r), this.drawRail()), e.detail > 0 && this.search.focus({ preventScroll: !0 });
	}
	railKey(e) {
		let t = e.target instanceof Element ? e.target.closest(`[${W}]`) : null;
		if (t === null || e.defaultPrevented || !this.shortcuts.isPlainKey(e)) return;
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
	draw(e) {
		this.drawnTerms = this.search.value;
		let t = this.search.value.trim().toLowerCase(), n = this.entries().filter((e) => this.chosen(e) && (t.length === 0 || Go(e, t)));
		this.list.replaceChildren(), this.empty.hidden = n.length > 0;
		for (let e of n) {
			let t = document.createElement("button");
			t.type = "button", t.className = K, t.tabIndex = -1, t.id = this.ids.ensureId(t, `${this.list.id}-entry`), t.setAttribute("role", "option"), t.setAttribute(Io, e.key);
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
		this.setCurrent(this.list.querySelector(`.${K}`), !e);
	}
	setCurrent(e, t = !1) {
		for (let n of this.list.querySelectorAll(`.${K}`)) {
			let r = n === e;
			n.classList.toggle(Vo, r), n.classList.toggle(Ho, r && t), n.setAttribute("aria-selected", String(r));
		}
		e === null ? this.search.removeAttribute("aria-activedescendant") : this.search.setAttribute("aria-activedescendant", e.id);
	}
	chosen(e) {
		if (this.category === q) return !0;
		let t = Wo(e);
		return t === this.category || t.startsWith(this.category + G);
	}
	key(e) {
		if (this.shortcuts.isComposing(e)) return;
		if (e.key === "Enter") {
			e.preventDefault(), this.take(this.list.querySelector(`.${Vo}`));
			return;
		}
		if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
		let t = [...this.list.querySelectorAll(`.${K}`)], n = this.roving.target({
			key: e.key,
			items: t,
			current: t.find((e) => e.classList.contains(Vo)) ?? null,
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
		t !== null && !t.classList.contains(Vo) && this.setCurrent(t, !0);
	}
	take(e) {
		let t = e?.getAttribute(Io), n = t == null ? void 0 : this.entries().find((e) => e.key === t);
		n !== void 0 && (this.close(), this.choose(n));
	}
};
function Wo(e) {
	return (e.category ?? "").split(G).map((e) => e.trim()).filter((e) => e.length > 0).join(G);
}
function Go(e, t) {
	return e.title.toLowerCase().includes(t) || (e.description ?? "").toLowerCase().includes(t) || (e.category ?? "").toLowerCase().includes(t) || e.key.toLowerCase().includes(t);
}
//#endregion
//#region src/nodes/nodes-picker-binding.ts
var Ko = class {
	services;
	picker;
	loose = null;
	constructor(e, t) {
		let n = e.context;
		this.services = e;
		let r = t.filter((e) => e.hidden !== !0);
		this.picker = Uo.create(e.root, () => r, n.strings, n.dom, n.icons, n.roving, n.focus, n.shortcuts, (e) => this.addNode(e));
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
		let r = n?.at ?? this.services.pointerScene(), i = Ai(e, r.x, r.y), a = this.services.snapPlace(i.id, i), o = this.services.documentState.document;
		i.x = a.x, i.y = a.y, o.nodes.push(i), n !== null && o.nodes.some((e) => e.id === n.fromNode) && this.wire(o, n, i, e), this.services.selection.selectOnly(i.id), this.services.documentState.edited();
	}
	wire(e, t, n, r) {
		let i = r.inputs.find((e) => e.hasPin !== !1 && Ki(e, n, r) && ki(t.fromType, e.type));
		i !== void 0 && e.edges.push({
			id: T("e"),
			fromNode: t.fromNode,
			fromPin: t.fromPin,
			toNode: n.id,
			toPin: i.name,
			points: []
		});
	}
}, qo = "graph.run", Jo = "graph.run-all", Yo = "run-stop", Xo = "ui-graph--running", Zo = class {
	services;
	once;
	all;
	stop;
	asked = !1;
	running = !1;
	constructor(e) {
		this.services = e, this.once = e.root.querySelector("[data-ui-graph-run-once]"), this.all = e.root.querySelector("[data-ui-graph-run-all]"), this.stop = e.root.querySelector("[data-ui-graph-run-stop]"), this.once?.addEventListener("click", () => this.start(qo)), this.all?.addEventListener("click", () => this.start(Jo)), this.stop?.addEventListener("click", () => e.root.dispatchEvent(new CustomEvent(Yo, { bubbles: !0 }))), this.draw();
	}
	setRunning(e) {
		this.running = e, this.asked = !1, this.draw();
	}
	saveCompleted(e) {
		!this.asked || e !== qo && e !== Jo || (this.asked = !1, this.draw());
	}
	start(e) {
		this.asked || this.running || (this.asked = !0, this.draw(), this.services.documentState.requestSave(e));
	}
	draw() {
		let e = this.asked || this.running, t = this.services.context.states;
		this.once !== null && t.setDisabled(this.once, e), this.all !== null && t.setDisabled(this.all, e), this.stop !== null && t.setDisabled(this.stop, !this.running), this.services.root.classList.toggle(Xo, e);
	}
}, Qo = "image-upload", $o = "image/*", es = class {
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
		n.type = "file", n.accept = $o, n.addEventListener("change", () => {
			let r = n.files?.[0];
			r !== void 0 && this.context.uploads.accepts($o, r) && this.uploadImage(e, t, r);
		}), n.click();
	}
	async uploadImage(e, t, n) {
		this.markUpload(e, t, 0);
		try {
			let r = await this.context.uploads.uploadAsync([n], (n) => this.markUpload(e, t, n));
			this.announce(e, t, r.selectionId, n.name);
		} catch {
			this.editorOf(e, t)?.setAttribute(Ca, this.context.strings.text("ui.graph.upload-failed"));
		}
	}
	announce(e, t, n, r) {
		this.root.dispatchEvent(new CustomEvent(Qo, {
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
		r?.setAttribute(Ca, re(this.context, r, n));
	}
	editorOf(e, t) {
		return this.nodeElements.get(e)?.querySelector(`[data-ui-graph-value="${CSS.escape(t)}"]`) ?? null;
	}
}, ts = ".ui-graph__row", ns = "ui-graph__pin--aimed", rs = class {
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
		let n = e.getAttribute(B);
		if (e.getAttribute("data-ui-graph-pin-dir") === "out") return {
			fromNode: t,
			fromPin: n,
			fromType: e.getAttribute("data-ui-graph-pin-type") ?? "any",
			detached: null
		};
		let r = Gi(this.document, t, n).at(-1);
		if (r === void 0) return null;
		this.document.edges = this.document.edges.filter((e) => e.id !== r.id);
		let i = {
			fromNode: r.fromNode,
			fromPin: r.fromPin,
			fromType: R(this.document, this.types, r.fromNode, r.fromPin),
			detached: r
		};
		return this.services.draw(), i;
	}
	offerDropTargets(e, t) {
		Ln(this.services.root);
		for (let n of this.services.nodeLayer.querySelectorAll(`[${B}]`)) {
			let r = n.getAttribute("data-ui-graph-pin-dir") === "in" && n.closest("[data-ui-graph-node]")?.getAttribute("data-ui-graph-node") !== e && ki(t, n.getAttribute("data-ui-graph-pin-type") ?? "any");
			n.setAttribute(m, r ? "yes" : "no");
		}
		for (let e of this.services.nodeLayer.querySelectorAll(ts)) {
			let t = e.querySelector(`[${B}][${_a}="in"]`);
			e.setAttribute(m, t?.getAttribute("data-ui-graph-drop") === "yes" ? "yes" : "no");
		}
	}
	aimAt(e) {
		let t = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-ui-graph-pin][data-ui-graph-drop=\"yes\"]") ?? null;
		zn(this.services.nodeLayer, t, (e, t) => e.classList.toggle(ns, t));
	}
	clearDropTargets() {
		Rn(this.services.root, this.services.nodeLayer, (e) => e.classList.remove(ns));
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
		if (t.detached !== null && t.detached.toNode === i && t.detached.toPin === a) this.cancelConnection(t);
		else if (i === t.fromNode || !ki(t.fromType, o)) t.detached !== null && (this.document.edges.push(t.detached), this.services.draw());
		else {
			if (this.inputPin(i, a)?.multiple === !0) {
				if (this.document.edges.some((e) => e.toNode === i && e.toPin === a && e.fromNode === t.fromNode && e.fromPin === t.fromPin)) {
					t.detached !== null && this.document.edges.push(t.detached), this.services.draw();
					return;
				}
			} else this.document.edges = this.document.edges.filter((e) => e.toNode !== i || e.toPin !== a);
			this.document.edges.push({
				id: T("e"),
				fromNode: t.fromNode,
				fromPin: t.fromPin,
				toNode: i,
				toPin: a,
				points: []
			}), Ni(this.document, i, a), this.services.documentState.edited();
		}
	}
	inputPin(e, t) {
		let n = this.document.nodes.find((t) => t.id === e);
		return L(n === void 0 ? void 0 : this.types.get(n.type), t, !1);
	}
}, is = ".ui-graph__editor", as = "[data-ui-graph-log], [data-ui-graph-run], .ui-graph__run-panel", os = "data-ui-graph-catalog", ss = "graph.reroute", cs = 30, ls = 12, us = "graph:add-parameter", ds = "graph:remove-parameter", fs = "graph:reset-pin", ps = "graph:disable", ms = "graph:reset-values", hs = {
	name: "nodes",
	readDocument: wi,
	create: (e) => new gs(e)
}, gs = class {
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
	fittedOnce = !1;
	clipboard = null;
	pinTarget = null;
	constructor(e) {
		let t = _s(e.root.getAttribute(os));
		this.services = e, this.seriesColors = e.context.colors.count(e.root);
		for (let e of t) {
			this.types.set(e.key, e);
			for (let t of [...e.inputs, ...e.outputs]) t.typeTitle !== null && t.typeTitle !== void 0 && this.typeTitles.set(ys(t.type), t.typeTitle);
		}
		this.pickerBinding = new Ko(e, t), this.wiring = new rs(e, {
			pinPoint: (e, t, n) => this.pinPoint(e, t, n),
			pinColor: (e) => this.pinColor(e),
			dropOnNothing: (e) => this.pickerBinding.openFor(e)
		}, this.types), this.log = new _o(e, this.types), this.upload = new es(e), this.runPanel = new Zo(e), this.parameters = new ko(e, {
			types: this.types,
			setValue: (e, t, n) => this.setValue(e, t, n, !0),
			readValue: (t, n) => io(t, e.context.values.read(n)),
			show: (e) => this.log.goToNode(e),
			cloneEditor: (t) => S(e.root, t)
		}), this.log.setLogOpen(e.context.store.read(e.root, "log") === "open"), this.log.drawRun(), e.root.addEventListener(_.menuOpeningEvent, (e) => this.pinMenuOpening(e));
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
		return za(t, this.types.get(t.type), {
			words: n.strings,
			names: n.names,
			states: n.states,
			typeTitles: this.typeTitles,
			icons: n.icons,
			readOnly: this.services.settings.readOnly,
			pinColor: (e) => this.pinColor(e),
			outputType: (e, t) => R(this.document, this.types, e, t),
			feedTitle: (e, t) => this.feedTitle(e, t, /* @__PURE__ */ new Set()),
			isConnected: (e, t, n) => n === "in" ? Wi(this.document, e, t) !== void 0 : this.document.edges.some((n) => n.fromNode === e && n.fromPin === t),
			onValueChanged: (e, t, n) => this.setValue(e, t, n),
			onPickImage: (e, t) => this.upload.pickImage(e, t),
			onImageUploaded: (e, t, n, r) => this.upload.announce(e, t, n, r),
			tooltips: n.tooltips,
			number: (e, t) => this.log.formatNumber(e, t),
			date: (e, t) => this.log.formatDate(e, t),
			temporal: n.temporal,
			urls: n.urls,
			cloneEditor: (e) => S(this.services.root, e),
			setProperty: (e, t, r) => n.properties.set(e, t, r),
			readValue: (e) => n.values.read(e)
		});
	}
	wordsChanged() {
		this.log.wordsChanged();
	}
	itemsDrawn(e) {
		this.log.reapplyToRedrawnNodes(e), this.services.settings.snapping && Dt(this.services.nodeElements.values(), this.services.settings.gridSize), this.parameters.draw(), this.fitFirstDraw();
	}
	parametersArrived() {
		this.parameters.draw();
	}
	fitFirstDraw() {
		this.fittedOnce || this.document.nodes.length === 0 || (this.fittedOnce = !0, this.services.view.fitSheet());
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
		let t = Se(this.document.edges.flatMap((t) => {
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
		return this.pinColor(R(this.document, this.types, t.fromNode, t.fromPin));
	}
	pinPoint(e, t, n) {
		let r = this.services.nodeElements.get(e)?.querySelector(`[${B}="${CSS.escape(t)}"][${_a}="${n}"]`);
		return r == null ? null : this.services.centerOf(r);
	}
	feedTitle(e, t, n) {
		let r = Wi(this.document, e, t);
		if (r === void 0 || n.has(r.fromNode)) return null;
		n.add(e);
		let i = this.document.nodes.find((e) => e.id === r.fromNode), a = i === void 0 ? void 0 : this.types.get(i.type), o = a?.compact === !0 ? a.inputs[0] : void 0;
		return o === void 0 ? L(a, r.fromPin, !0)?.title ?? null : this.feedTitle(r.fromNode, o.name, n);
	}
	pinColor(e) {
		return e === "any" ? "var(--ui-text-muted)" : this.services.context.colors.color(({
			image: 1,
			array: 2,
			number: 3,
			boolean: 4,
			text: 5,
			date: 8,
			time: 8,
			datetime: 8
		}[e] ?? vs(e) + 1) - 1, this.seriesColors);
	}
	setValue(e, t, n, r = !1) {
		let i = this.document.nodes.find((t) => t.id === e);
		i !== void 0 && (i.values[t] = n, r ? this.services.documentState.edited(!this.showCommitted(e, t, n)) : (this.parameters.showValue(e, t, n), this.services.documentState.edited(this.types.get(i.type)?.inputs.some((e) => e.visibleWhen === t) === !0)));
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
			} else i(this.document), this.services.documentState.edited();
		}
	}
	showCommitted(e, t, n) {
		let r = this.document.nodes.find((t) => t.id === e), i = r === void 0 ? void 0 : this.types.get(r.type), a = this.services.nodeElements.get(e)?.querySelector(`[${xa}="${CSS.escape(t)}"] > *`);
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
		return e.closest(is) !== null && e.closest("[data-ui-graph-head]") === null;
	}
	isPanel(e) {
		return e.closest(as) !== null;
	}
	pointerDown(e, t) {
		let n = t.closest(`[${B}]`);
		return n === null || this.services.settings.readOnly ? !1 : this.wiring.beginConnect(n) ?? !0;
	}
	chrome(e) {
		if (e.closest("[data-ui-graph-log-toggle]") !== null) return this.log.setLogOpen(!this.log.isLogOpen(), !0), !0;
		if (e.closest("[data-ui-graph-log-clear]") !== null) return this.log.clearLog(), !0;
		let t = e.closest(`[${fo}]`);
		return t !== null && (this.log.goToNode(t.getAttribute(fo)), !0);
	}
	backgroundDoubleClick() {
		this.pickerBinding.open();
	}
	escape() {
		this.pickerBinding.close();
	}
	copy(e) {
		this.clipboard = Xi(this.document, e);
	}
	paste() {
		if (this.clipboard === null) return null;
		let e = this.services.settings.gridSize * 2, t = Zi(this.clipboard, e, e);
		return this.document.nodes.push(...t.nodes), this.document.edges.push(...t.edges), this.clipboard = Xi(this.document, new Set(t.nodes.map((e) => e.id))), t.nodes.map((e) => e.id);
	}
	duplicate(e) {
		let t = this.services.settings.gridSize * 2, n = Zi(Xi(this.document, e), t, t);
		return n.nodes.length === 0 ? null : (this.document.nodes.push(...n.nodes), this.document.edges.push(...n.edges), n.nodes.map((e) => e.id));
	}
	canDuplicate(e) {
		return this.document.nodes.some((t) => t.id === e);
	}
	disconnect(e) {
		return Vi(this.document, e);
	}
	canDisconnect(e) {
		return Bi(this.document, e);
	}
	remove(e, t) {
		let n = this.document;
		return n.nodes = n.nodes.filter((t) => !e.has(t.id)), n.edges = n.edges.filter((n) => !t.has(n.id) && !e.has(n.fromNode) && !e.has(n.toNode)), this.parameters.forget(e), !0;
	}
	arrange(e, t) {
		let n = this.services.settings;
		return gi(this.document, {
			sizes: e,
			only: t,
			pinOffset: (e, t, n) => this.pinOffset(e, t, n),
			gridSize: n.snapping ? n.gridSize : 0
		});
	}
	levelTops(e, t) {
		let n = [];
		for (let r of this.document.edges) {
			let i = r.fromNode === e;
			if (!i && r.toNode !== e) continue;
			let a = this.document.nodes.find((e) => e.id === (i ? r.toNode : r.fromNode));
			if (a === void 0 || a.id === e || t.has(a.id)) continue;
			let o = i ? this.pinOffset(e, r.fromPin, "out") : this.pinOffset(e, r.toPin, "in"), s = i ? this.pinOffset(a.id, r.toPin, "in") : this.pinOffset(a.id, r.fromPin, "out");
			o !== null && s !== null && n.push(a.y + s - o);
		}
		return n;
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
			case ps: return t?.kind === "node" ? this.toggleEnabled(t.id) : t?.kind === "group" && this.toggleGroupEnabled(t.id), !0;
			case ms: return t?.kind === "node" && this.resetValues(t.id), !0;
			case us:
			case ds: return this.pinTarget !== null && this.parameters.toggle(this.pinTarget.node, this.pinTarget.pin), !0;
			case fs: return this.resetPin(), !0;
			case "graph:delete-edge": return t?.kind === "edge" && !this.services.settings.readOnly && (this.document.edges = this.document.edges.filter((e) => e.id !== t.id), this.services.documentState.edited()), !0;
			default: return !1;
		}
	}
	addReroute(e) {
		let t = e === null ? null : this.document.edges.find((t) => t.id === e), n = this.types.get(ss), r = n?.inputs[0], i = n?.outputs[0];
		if (this.services.settings.readOnly || t === void 0 || n === void 0 || r === void 0 || i === void 0) return;
		let a = this.services.pointerScene(), o = Ai(n, a.x - cs, a.y - ls), s = this.services.snapPlace(o.id, o);
		o.x = s.x, o.y = s.y, this.document.nodes.push(o), t !== null && (this.document.edges = [
			...this.document.edges.filter((e) => e.id !== t.id),
			{
				id: T("e"),
				fromNode: t.fromNode,
				fromPin: t.fromPin,
				toNode: o.id,
				toPin: r.name,
				points: []
			},
			{
				id: T("e"),
				fromNode: o.id,
				fromPin: i.name,
				toNode: t.toNode,
				toPin: t.toPin,
				points: []
			}
		]), this.services.selection.selectOnly(o.id), this.services.documentState.edited();
	}
	syncMenus(e, t) {
		for (let t of [
			"graph:add-node",
			"graph:add-reroute",
			"graph:delete-edge",
			"graph:reset-state"
		]) j(this.services, t, e);
		let n = t?.kind === "node" ? t.id : null, r = t?.kind === "group" ? this.groupNodes(t.id) : null;
		M(this.services, "graph:reset-state", n !== null && this.statePins(n).length > 0), j(this.services, ps, e && (r === null || r.length > 0)), Yt(this.services, ps, r === null ? n !== null && this.document.nodes.find((e) => e.id === n)?.enabled === !1 : r.length > 0 && r.every((e) => e.enabled === !1)), j(this.services, ms, e && n !== null && Ri(this.document, this.types, n)), this.syncPinMenu();
	}
	pinMenuOpening(e) {
		let t = this.services.context.names.contextMenu, n = e.target instanceof Element ? e.target.closest(`[${t}]`) : null, r = e instanceof CustomEvent ? e.detail?.target ?? null : null;
		if (n?.getAttribute(t) !== "graph-pin-menu" || !(r instanceof Element) || this.services.context.states.isInert(this.services.root)) return;
		let i = r.closest(`[${Ea}]`), a = i?.closest("[data-ui-graph-node]")?.getAttribute("data-ui-graph-node") ?? null;
		this.pinTarget = i === null || a === null ? null : {
			node: a,
			pin: i.getAttribute("data-ui-graph-pin-menu") ?? "",
			direction: i.getAttribute("data-ui-graph-pin-menu-dir") === "out" ? "out" : "in"
		}, this.syncPinMenu();
	}
	syncPinMenu() {
		let e = this.services, t = this.pinTarget, n = !this.services.settings.readOnly, r = t !== null && t.direction === "in" && this.parameters.allows(t.node, t.pin), i = r && this.parameters.has(t.node, t.pin);
		M(e, us, r && !i), M(e, ds, i), j(e, us, n), j(e, ds, n), j(e, fs, n && t !== null && Pi(this.document, this.types, t.node, t.pin, t.direction));
	}
	resetPin() {
		let e = this.pinTarget;
		!this.services.settings.readOnly && e !== null && Pi(this.document, this.types, e.node, e.pin, e.direction) && (Ii(this.document, this.types, e.node, e.pin, e.direction), this.services.documentState.edited());
	}
	resetState(e) {
		let t = this.document.nodes.find((t) => t.id === e), n = this.statePins(e);
		if (!(this.services.settings.readOnly || t === void 0 || n.length === 0)) {
			for (let e of n) t.values[e.name] = e.defaultValue ?? null;
			this.services.documentState.edited();
		}
	}
	toggleEnabled(e) {
		let t = this.menuNodes(e);
		this.services.settings.readOnly || t.length === 0 || this.setEnabled(t, t[0].enabled === !1);
	}
	setEnabled(e, t) {
		for (let n of e) n.enabled = t, t || this.log.forgetNode(n.id);
		this.services.documentState.edited();
	}
	toggleGroupEnabled(e) {
		let t = this.groupNodes(e);
		this.services.settings.readOnly || t.length === 0 || this.setEnabled(t, t.every((e) => e.enabled === !1));
	}
	groupNodes(e) {
		let t = this.document.groups.find((t) => t.id === e);
		return t === void 0 ? [] : wt(t, this.document.nodes, (e) => this.services.nodeRect(e));
	}
	resetValues(e) {
		let t = this.menuNodes(e).filter((e) => Ri(this.document, this.types, e.id));
		if (!(this.services.settings.readOnly || t.length === 0)) {
			for (let e of t) zi(this.document, this.types, e.id);
			this.services.documentState.edited();
		}
	}
	menuNodes(e) {
		let t = this.document.nodes.find((t) => t.id === e);
		return t === void 0 ? [] : [t, ...this.document.nodes.filter((e) => e !== t && this.services.selection.has(e.id))];
	}
	statePins(e) {
		let t = this.document.nodes.find((t) => t.id === e);
		return t === void 0 ? [] : this.types.get(t.type)?.inputs.filter((e) => e.state === !0) ?? [];
	}
};
function _s(e) {
	let t = C(e);
	return Array.isArray(t) ? t : [];
}
function vs(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t = t * 31 + e.charCodeAt(n) >>> 0;
	return t;
}
function ys(e) {
	return e.startsWith("array:") ? ys(e.slice(6)) : e;
}
//#endregion
//#region src/production/craft-view.ts
var bs = f.slice(1);
function xs(e, t) {
	let n = e.readCulture(t);
	return (t) => e.format(Math.round(t * 1e3) / 1e3, null, n);
}
function Ss(e, t, n) {
	let r = ie("ui-graph__node ui-graph__craft", t.id, e, t.color, n.conflict), i = document.createElement("span"), a = document.createElement("span");
	return i.className = `${bs} ui-graph__craft-name`, i.textContent = t.title ?? n.word, a.className = "ui-graph__craft-time", a.textContent = n.note ?? J(t.time, n.number), r.append(i, a), n.connectable && Un(r), oe(r, t.tooltip ?? n.tooltips.escape(Cs(t, n.resource, n.number)), n.tooltips), r;
}
function Cs(e, t, n) {
	let r = (e) => e.map((e) => `${ws(e.amount, t(e.resource)?.unit ?? null, n)} ${t(e.resource)?.title ?? e.resource}`).join(" + ");
	return `${r(e.ingredients) || "—"} → ${r(e.products) || "—"}`;
}
function J(e, t) {
	return `${t(e)} s`;
}
function ws(e, t, n) {
	return t === null ? `×${n(e)}` : `×${n(e)} ${t}`;
}
function Ts(e, t, n, r) {
	return `${ws(e, t, r)} · ${J(n, r)}`;
}
function Es(e, t) {
	let n = e.trim().replace("×", "").trim(), r = Number(t === "," ? n.replace(",", ".") : n.replaceAll(",", ""));
	return Number.isFinite(r) && r > 0 ? r : null;
}
//#endregion
//#region src/production/model.ts
function Ds() {
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
function Os(e) {
	let t = e;
	if (typeof t != "object" || !t) return Ds();
	let n = t.draft;
	return {
		nodes: (t.nodes ?? []).map(pe),
		edges: (t.edges ?? []).map(me),
		groups: (t.groups ?? []).map(_e),
		draft: {
			resources: (n?.resources ?? []).flatMap((e) => {
				let t = js(e);
				return t === null ? [] : [{
					...Ls(t),
					...he(e)
				}];
			}),
			crafts: (n?.crafts ?? []).flatMap((e) => {
				let t = Ms(e);
				return t === null ? [] : [{
					...Rs(t),
					...he(e)
				}];
			}),
			removed: (n?.removed ?? []).map((e) => String(e))
		},
		plan: ks(t.plan),
		key: de(t)
	};
}
function ks(e) {
	let t = e ?? {}, n = String(t.period ?? "").toLowerCase(), r = String(t.objective ?? "").toLowerCase();
	return {
		targets: Ns(t.targets),
		period: n === "minute" ? "Minute" : n === "hour" ? "Hour" : "Once",
		objective: r === "leasttime" ? "LeastTime" : r === "leastcost" ? "LeastCost" : "LeastRaw",
		bought: Array.isArray(t.bought) ? t.bought.map((e) => String(e)) : []
	};
}
function As(e) {
	if (typeof e != "object" || !e) return null;
	let t = e.kind;
	return t === "Craft" || t === "craft" || t === 1 ? Ms(e) : t === "Resource" || t === "resource" || t === 0 ? js(e) : null;
}
function js(e) {
	let t = e;
	return typeof t.id != "string" || t.id.length === 0 ? null : {
		kind: "resource",
		id: t.id,
		title: w(t.title),
		icon: w(t.icon),
		color: w(t.color),
		tooltip: w(t.tooltip),
		image: w(t.image),
		category: w(t.category),
		unit: w(t.unit),
		cost: typeof t.cost == "number" && Number.isFinite(t.cost) ? t.cost : null
	};
}
function Ms(e) {
	let t = e;
	return typeof t.id != "string" || t.id.length === 0 ? null : {
		kind: "craft",
		id: t.id,
		title: w(t.title),
		icon: w(t.icon),
		color: w(t.color),
		tooltip: w(t.tooltip),
		ingredients: Ns(t.ingredients),
		products: Ns(t.products),
		time: Ps(t.time)
	};
}
function Ns(e) {
	return Array.isArray(e) ? e.flatMap((e) => {
		let t = e;
		return typeof t == "object" && t && typeof t.resource == "string" ? [{
			resource: t.resource,
			amount: Number(t.amount) || 0
		}] : [];
	}) : [];
}
function Ps(e) {
	if (typeof e == "number") return Number.isFinite(e) ? e : 0;
	if (typeof e != "string") return 0;
	let t = /^(-)?(?:(\d+)\.)?(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(e.trim());
	if (t === null) return 0;
	let n = Number(t[2] ?? 0) * 86400 + Number(t[3]) * 3600 + Number(t[4]) * 60 + Number(t[5]);
	return t[1] === "-" ? -n : n;
}
function Fs(e) {
	let t = Math.round(Math.max(0, e) * 1e7), n = Math.floor(t / 864e9), r = t - n * 86400 * 1e7, i = Math.floor(r / 36e9), a = Math.floor(r % 36e9 / 6e8), o = Math.floor(r % 6e8 / 1e7), s = r % 1e7, c = `${Is(i)}:${Is(a)}:${Is(o)}${s === 0 ? "" : `.${String(s).padStart(7, "0")}`}`;
	return n > 0 ? `${n}.${c}` : c;
}
function Is(e) {
	return String(e).padStart(2, "0");
}
function Ls(e) {
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
function Rs(e) {
	return {
		id: e.id,
		title: e.title,
		icon: e.icon,
		color: e.color,
		tooltip: e.tooltip,
		ingredients: e.ingredients.map((e) => ({ ...e })),
		products: e.products.map((e) => ({ ...e })),
		time: Fs(e.time),
		created: !1,
		baseline: null
	};
}
function zs(e, t) {
	let n = [...t.resources, ...t.crafts], r = new Set(t.crafts);
	return er(e, n, t.removed, (e) => r.has(e) ? Ms(e) : js(e));
}
function Bs(e, t) {
	let n = e.ingredients.filter((e) => !t.has(e.resource)), r = e.products.filter((e) => !t.has(e.resource)), i = n.length !== e.ingredients.length;
	return !i && r.length === e.products.length ? null : {
		ingredients: n,
		products: r,
		goes: n.length === 0 && (i || r.length === 0)
	};
}
var Vs = {
	read: As,
	overlay: (e, t) => zs(e, t.draft),
	lists: (e) => [e.draft.resources, e.draft.crafts],
	listOf: (e, t) => Hs(t) ? e.draft.crafts : e.draft.resources,
	toEntry: (e) => e.kind === "craft" ? Rs(e) : Ls(e),
	prefix: (e) => Hs(e) ? "craft" : "resource",
	rekey: Us
};
function Hs(e) {
	return "ingredients" in e;
}
function Us(e, t, n) {
	let r = (e) => e === t ? n : e, i = /* @__PURE__ */ new Map();
	for (let a of e.draft.crafts) {
		let e = a.id === n ? t : a.id;
		if (e !== a.id || a.ingredients.some((e) => e.resource === t) || a.products.some((e) => e.resource === t)) {
			for (let t of a.ingredients) i.set(Gs(e, t.resource), Gs(a.id, r(t.resource)));
			for (let t of a.products) i.set(Y(e, t.resource), Y(a.id, r(t.resource)));
			a.ingredients = a.ingredients.map((e) => ({
				...e,
				resource: r(e.resource)
			})), a.products = a.products.map((e) => ({
				...e,
				resource: r(e.resource)
			}));
		}
	}
	for (let t of e.edges) t.id = i.get(t.id) ?? t.id;
	let a = e.plan;
	e.plan = {
		...a,
		targets: a.targets.map((e) => ({
			...e,
			resource: r(e.resource)
		})),
		bought: (a.bought ?? []).map(r)
	};
}
function Ws(e) {
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
				id: Gs(e.id, t.resource),
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
		} else {
			for (let t of n) i.push({
				id: Gs(e.id, t.resource),
				from: t.resource,
				to: e.id,
				craft: e.id,
				resource: t.resource,
				role: "ingredient",
				amount: t.amount
			});
			for (let t of o) i.push({
				id: Y(e.id, t.resource),
				from: e.id,
				to: t.resource,
				craft: e.id,
				resource: t.resource,
				role: "product",
				amount: t.amount
			});
		}
	}
	for (let [e, t] of r) {
		if (t.length !== 1) continue;
		let n = t[0], r = n.products.find((t) => t.resource === e).amount;
		o.set(e, {
			craft: n.id,
			amount: r,
			time: n.time,
			edge: Y(n.id, e)
		}), a.has(n.id) || s.add(Y(n.id, e));
	}
	return {
		edges: i,
		collapsed: a,
		outputs: o,
		quiet: s
	};
}
function Gs(e, t) {
	return `${e}<${t}`;
}
function Y(e, t) {
	return `${e}>${t}`;
}
//#endregion
//#region src/production/production-editing.ts
var Ks = "graph-link-menu", qs = class {
	services;
	number;
	decimalSeparator;
	entries;
	host;
	constructor(e, t, n) {
		this.services = e, this.entries = t, this.host = n, this.number = xs(e.context.numbers, e.root), this.decimalSeparator = e.context.numbers.readCulture(e.root).decimalSeparator;
	}
	get document() {
		return this.services.documentState.document;
	}
	craftOf(e) {
		let t = this.entries.item(e)?.kind === "craft" ? this.entries.draftOf(e) : null;
		return t === null ? null : t;
	}
	addResource() {
		let e = this.services.context.strings.text("ui.graph.new-resource");
		this.entries.add("resource", (t) => ({
			id: t,
			title: e,
			icon: null,
			color: null,
			tooltip: null,
			image: null,
			category: null,
			unit: null,
			cost: null,
			created: !0,
			baseline: null
		}));
	}
	removeEntries(e) {
		let t = new Set([...e].filter((e) => this.entries.item(e)?.kind === "resource"));
		if (this.entries.remove(e), t.size === 0) return;
		this.dropResources(t);
		let n = this.document.plan, r = n.bought ?? [];
		(n.targets.some((e) => t.has(e.resource)) || r.some((e) => t.has(e))) && (this.document.plan = {
			...n,
			targets: n.targets.filter((e) => !t.has(e.resource)),
			bought: r.filter((e) => !t.has(e))
		});
	}
	dropResources(e) {
		let t = /* @__PURE__ */ new Set();
		for (let n of this.entries.items) {
			if (n.kind !== "craft" || !this.entries.stands(n.id) || Bs(n, e) === null) continue;
			let r = this.craftOf(n.id), i = Bs(r, e);
			i !== null && (i.goes ? t.add(r.id) : (r.ingredients = i.ingredients, r.products = i.products));
		}
		t.size > 0 && this.removeEntries(t);
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
		return Wn(this.services, e, {
			canLink: (e, t) => this.canLink(e, t),
			link: (e, t, n) => this.link(e, t, n)
		});
	}
	asked = null;
	canLink(e, t) {
		let n = this.entries.item(e), r = this.entries.item(t);
		return n === void 0 || r === void 0 ? !1 : n.kind === "resource" ? r.kind === "resource" || !r.ingredients.some((t) => t.resource === e) : r.kind === "resource" && !n.products.some((e) => e.resource === t);
	}
	link(e, t, n) {
		if (!this.canLink(e, t)) return;
		let r = this.entries.item(e), i = this.entries.item(t);
		if (r.kind === "resource" && i.kind === "resource") {
			let r = this.soleRecipe(e, t);
			if (r !== null) {
				this.asked = {
					from: e,
					to: t,
					craft: r
				}, Jt(this.services, Ks, n.clientX, n.clientY);
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
		let n = this.entries.items.filter((e) => e.kind === "craft" && e.products.some((e) => e.resource === t));
		return n.length === 1 && this.host.collapsed(n[0].id) && !n[0].ingredients.some((t) => t.resource === e) ? n[0].id : null;
	}
	addRecipe(e, t) {
		this.document.draft.crafts.push({
			id: this.entries.freeKey("craft"),
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
			time: Fs(1),
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
		let n = this.host.edge(e), r = Kn(this.services, e);
		if (n === void 0 || r === null) return;
		let i = t === "in" ? n.role !== "product" : n.role === "product", a = t === "in" ? n.resource : n.product ?? n.resource, o = t === "in" ? n.amount : n.output ?? n.amount;
		qn(this.services, r, this.number(o), (e) => {
			let t = Es(e, this.decimalSeparator), r = t === null ? null : this.craftOf(n.craft);
			if (t === null || r === null) return;
			let o = (e) => e.map((e) => e.resource === a ? {
				...e,
				amount: t
			} : e);
			i ? r.ingredients = o(r.ingredients) : r.products = o(r.products), this.services.documentState.edited();
		});
	}
	editTime(e) {
		let t = this.entries.item(e), n = this.host.collapsed(e) ? null : this.services.nodeRect(e), r = this.host.craftEdge(e), i = n === null ? r === void 0 ? null : Kn(this.services, r) : {
			x: n.x + n.width / 2,
			y: n.y + n.height / 2
		};
		i !== null && t?.kind === "craft" && qn(this.services, i, this.number(t.time), (t) => {
			let n = Es(t, this.decimalSeparator), r = n === null ? null : this.craftOf(e);
			n !== null && r !== null && Ps(r.time) !== n && (r.time = Fs(n), this.services.documentState.edited());
		});
	}
}, X = 1e-9, Js = 1e-12;
function Ys(e) {
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
		if (!Xs(o, s, f, i, (e) => d[e] < -1e-9)) return "unsettled";
		let e = 0;
		for (let t = 0; t < n; t++) s[t] >= i && (e += o[t][a]);
		if (e > 1e-7 * c) return "infeasible";
		ec(o, s, f, i);
	}
	if (!Xs(o, s, f, i, (e) => l[e] < -1e-9) || !Xs(o, s, f, i, (e) => Math.abs(l[e]) <= X && u[e] < -1e-9)) return "unsettled";
	let p = Array(t).fill(0);
	for (let e = 0; e < n; e++) s[e] < t && (p[s[e]] = Math.max(0, o[e][a]));
	return p;
}
function Xs(e, t, n, r, i) {
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
		Zs(e, t, n, s, o);
	}
	return !1;
}
function Zs(e, t, n, r, i) {
	let a = e[r], o = a[i];
	for (let e = 0; e < a.length; e++) a[e] = $s(a[e] / o);
	a[i] = 1;
	for (let t = 0; t < e.length; t++) t !== r && Qs(e[t], a, i);
	for (let e of n) Qs(e, a, i);
	t[r] = i;
}
function Qs(e, t, n) {
	let r = e[n];
	if (r !== 0) {
		for (let n = 0; n < e.length; n++) e[n] = $s(e[n] - r * t[n]);
		e[n] = 0;
	}
}
function $s(e) {
	return Math.abs(e) < Js ? 0 : e;
}
function ec(e, t, n, r) {
	let i = e[0].length - 1;
	for (let a = 0; a < e.length; a++) if (!(t[a] < r)) {
		e[a][i] = 0;
		for (let i = 0; i < r; i++) if (Math.abs(e[a][i]) > X) {
			Zs(e, t, n, a, i);
			break;
		}
	}
}
//#endregion
//#region src/production/plan.ts
var Z = 1e-9, tc = 922337203685.4775, nc = 2147483647;
function rc(e) {
	return e.source ? e.consumed + e.target : 0;
}
function ic(e) {
	return e === "Minute" ? 60 : e === "Hour" ? 3600 : null;
}
function ac(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let t of e) t.kind === "resource" && !n.has(t.id) && n.set(t.id, t);
	let r = e.filter((e) => e.kind === "craft"), i = new Set(t.bought ?? []), a = /* @__PURE__ */ new Map();
	for (let e of r) for (let t of uc(e.products, n)) {
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
		for (let e of uc(t.ingredients, n)) s.has(e.resource) || (s.add(e.resource), l.push(e.resource));
	}
	let u = r.filter((e) => c.has(e)), d = [...n.keys()].filter((e) => s.has(e) && a.has(e)), f = d.map((e) => u.map((t) => dc(t.products, e) - dc(t.ingredients, e))), p = d.map((e) => o.get(e) ?? 0), m = t.objective === "LeastCost", h = u.map((e) => cc(e, n, a, !1)), g = m ? u.map((e) => cc(e, n, a, !0)) : h, _ = u.map((e) => Math.max(0, e.time)), v = t.objective === "LeastTime" ? Ys({
		rows: f,
		atLeast: p,
		cost: _,
		tieCost: h
	}) : Ys({
		rows: f,
		atLeast: p,
		cost: g,
		tieCost: _
	});
	return Array.isArray(v) ? sc(n, a, o, u, (t.period === "Once" ? oc(f, p, v) : null) ?? v, ic(t.period)) : {
		status: v === "infeasible" ? "Infeasible" : "Unsettled",
		crafts: [],
		resources: [],
		time: 0,
		raw: 0,
		cost: 0
	};
}
function oc(e, t, n) {
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
function sc(e, t, n, r, i, a) {
	let o = [], s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), l = 0;
	for (let t = 0; t < r.length; t++) {
		let n = r[t], u = i[t];
		if (u <= Z) continue;
		let d = u * Math.max(0, n.time);
		o.push({
			craft: n.id,
			runs: u,
			time: Math.min(d, tc),
			workers: a === null ? null : Math.min(Math.ceil(d / a - Z), nc)
		}), l += d;
		for (let t of uc(n.products, e)) s.set(t.resource, (s.get(t.resource) ?? 0) + u * t.amount);
		for (let t of uc(n.ingredients, e)) c.set(t.resource, (c.get(t.resource) ?? 0) + u * t.amount);
	}
	let u = [], d = 0, f = 0;
	for (let r of e.values()) {
		if (!n.has(r.id) && !s.has(r.id) && !c.has(r.id)) continue;
		let e = !t.has(r.id), i = n.get(r.id) ?? 0, a = s.get(r.id) ?? 0, o = c.get(r.id) ?? 0;
		e && (d += o + i, f += (o + i) * lc(r)), u.push({
			resource: r.id,
			source: e,
			target: i,
			produced: a,
			consumed: o,
			surplus: e ? 0 : fc(a - o - i)
		});
	}
	return {
		status: "Solved",
		crafts: o,
		resources: u,
		time: Math.min(l, tc),
		raw: d,
		cost: f
	};
}
function cc(e, t, n, r) {
	let i = 0;
	for (let a of uc(e.ingredients, t)) n.has(a.resource) || (i += a.amount * (r ? lc(t.get(a.resource)) : 1));
	return i;
}
function lc(e) {
	return e.cost !== null && Number.isFinite(e.cost) && e.cost >= 0 ? e.cost : 1;
}
function uc(e, t) {
	return e.filter((e) => t.has(e.resource) && e.amount > 0);
}
function dc(e, t) {
	let n = 0;
	for (let r of e) r.resource === t && r.amount > 0 && (n += r.amount);
	return n;
}
function fc(e) {
	return Math.abs(e) < 1e-7 ? 0 : e;
}
//#endregion
//#region src/production/plan-view.ts
function pc(e, t) {
	return {
		plan: e,
		period: t,
		crafts: new Map(e.crafts.map((e) => [e.craft, e])),
		resources: new Map(e.resources.map((e) => [e.resource, e]))
	};
}
function mc(e, t) {
	return e.filter((e) => e.kind === "craft" ? t.crafts.has(e.id) : t.resources.has(e.id));
}
function hc(e, t) {
	return e === "Minute" ? t.text("ui.graph.per-minute") : e === "Hour" ? t.text("ui.graph.per-hour") : "";
}
function gc(e, t, n) {
	return ws(e, t, n);
}
function _c(e, t, n, r) {
	let i = t === void 0 ? null : vc(t);
	return i !== null && Math.abs(i - e) < 1e-6 ? null : gc(e, n, r);
}
function vc(e) {
	return e.source ? rc(e) : e.produced;
}
function yc(e, t, n) {
	return e.workers === null ? J(e.time, n) : t.format("ui.graph.plan-at-once", { count: n(e.workers) });
}
function bc(e, t, n, r, i) {
	let a = gc(vc(e), t, i);
	return n === void 0 ? a : `${a} · ${yc(n, r, i)}`;
}
function xc(e, t, n) {
	return `×${n(e.runs)} · ${yc(e, t, n)}`;
}
//#endregion
//#region src/production/plan-panel.ts
var Sc = "[data-ui-graph-plan]", Cc = "[data-ui-graph-plan-targets]", wc = "[data-ui-graph-plan-add]", Tc = "data-ui-graph-plan-remove", Ec = "[data-ui-graph-plan-message]", Dc = "[data-ui-graph-plan-totals]", Oc = "data-ui-graph-plan-rate", kc = "plan", Ac = {
	infeasible: "ui.graph.plan-infeasible",
	unsettled: "ui.graph.plan-unsettled"
}, jc = class {
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
		this.services = e, this.host = t, this.number = xs(e.context.numbers, e.root), this.panel = e.root.querySelector(Sc), this.period = this.field("[data-ui-graph-plan-period]"), this.objective = this.field("[data-ui-graph-plan-objective]"), this.period?.addEventListener("change", () => this.choose()), this.objective?.addEventListener("change", () => this.choose()), this.fold = new Ft(e.context.store, e.root, this.panel, kc);
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
		if (e.closest(wc) !== null) return this.host.pick(), !0;
		let t = e.closest(`[${Tc}]`), n = t?.getAttribute(Tc);
		return t === null || n == null ? !1 : (this.removeTarget(n, t), !0);
	}
	removeTarget(e, t) {
		let n = this.host.request().targets.findIndex((t) => t.resource === e), r = document.activeElement, i = r === null || r === document.body || (t.closest(`${Cc} > *`) ?? t).contains(r);
		this.host.target(e, null), i && requestAnimationFrame(() => {
			let e = this.panel?.querySelector(Cc) ?? null;
			this.panel === null || document.activeElement !== null && document.activeElement !== document.body || Nt(e?.children[n]?.querySelector(`[${Tc}]`) ?? null, this.panel.querySelector(`[${_.collapseToggle}]`), this.services.context.focus);
		});
	}
	draw(e) {
		if (this.panel === null || e === this.drawnKey) return;
		this.drawnKey = e;
		let t = this.host.request(), n = this.host.reading(), r = this.services.settings.readOnly, i = this.services.context.properties;
		this.period !== null && (i.set(this.period, "Value", t.period), i.set(this.period, "IsReadOnly", r)), this.objective !== null && (i.set(this.objective, "Value", t.objective), i.set(this.objective, "IsReadOnly", r));
		let a = this.field(wc);
		a !== null && i.set(a, "Enabled", !r), this.panel.toggleAttribute(Oc, t.period !== "Once");
		for (let e of this.panel.querySelectorAll("[data-ui-graph-plan-counted]")) e.setAttribute("data-ui-graph-plan-counted", hc(t.period, this.services.context.strings));
		this.drawTargets(t, r), this.drawMessage(t, n), this.drawTables(n);
	}
	wordsChanged() {
		let e = this.drawnKey;
		this.drawnKey = "", this.targetsKey = "", this.draw(e);
	}
	drawTargets(e, t) {
		let n = this.panel.querySelector(Cc);
		if (n === null) return;
		let r = JSON.stringify([t, e.targets.map((e) => {
			let t = this.host.resource(e.resource);
			return [
				e.resource,
				t?.title,
				t?.image ?? t?.icon
			];
		})]);
		if (r === this.targetsKey) for (let t of e.targets) this.showAmount(t.resource, t.amount);
		else this.targetsKey = r, this.amounts.clear(), n.replaceChildren(...e.targets.map((e) => this.targetRow(e.resource, e.amount, t)));
	}
	showAmount(e, t) {
		let n = this.amounts.get(e);
		n !== void 0 && !n.contains(document.activeElement) && this.services.context.properties.set(n, "Value", t);
	}
	targetRow(e, t, n) {
		let r = this.host.resource(e), i = document.createElement("div"), a = this.nameOf(e, r?.title ?? e, r?.image ?? r?.icon ?? null), o = S(this.services.root, "graph-plan-amount"), s = S(this.services.root, "graph-plan-remove"), c = this.services.context.properties;
		return i.className = "ui-graph__plan-target", i.append(a), o !== null && (c.set(o, "Value", t), c.set(o, "IsReadOnly", n), o.addEventListener("change", () => this.setAmount(e, o, this.services.context.values.read(o))), this.amounts.set(e, o), i.append(o)), s !== null && (s.setAttribute(Tc, e), c.set(s, "Enabled", !n), i.append(s)), i;
	}
	setAmount(e, t, n) {
		if (typeof n != "number" && String(n ?? "").trim().length === 0) {
			this.removeTarget(e, t);
			return;
		}
		let r = typeof n == "number" ? n : this.services.context.numbers.parseInvariant(String(n)), i = r !== null && r > 0 ? r : null;
		if (i === null) {
			let n = this.host.request().targets.find((t) => t.resource === e);
			n !== void 0 && this.services.context.properties.set(t, "Value", n.amount);
		} else this.host.target(e, i);
	}
	drawMessage(e, t) {
		let n = this.services.context.strings, r = this.panel.querySelector(Ec), i = this.panel.querySelector(Dc);
		if (r !== null) {
			r.hidden = t !== null;
			let i = e.targets.length > 0 ? this.host.failure() : null;
			r.toggleAttribute("data-ui-graph-plan-failed", i !== null), r.textContent = t === null ? n.text(i === null ? "ui.graph.plan-empty" : Ac[i]) : "";
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
			t.source ? n.push(Mc(t.resource, a, `${this.number(rc(t))}${i}`)) : r.push(Mc(t.resource, a, `${this.number(t.produced)}${i}`, `${this.number(t.consumed)}${i}`, t.surplus > 0 ? `${this.number(t.surplus)}${i}` : "—"));
		}
		for (let n of e?.plan.crafts ?? []) {
			let e = this.host.craft(n.craft), r = e?.products[0] === void 0 ? void 0 : this.host.resource(e.products[0].resource), a = this.nameOf(n.craft, e?.title ?? t.text("ui.graph.recipe"), e?.icon ?? r?.image ?? r?.icon ?? null);
			i.push(Mc(n.craft, a, this.number(n.runs), J(n.time, this.number), n.workers === null ? "—" : this.number(n.workers)));
		}
		this.fill("raw", n), this.fill("resources", r), this.fill("crafts", i);
	}
	fill(e, t) {
		let n = this.panel.querySelector(`[data-ui-graph-plan-section="${e}"]`), r = this.panel.querySelector(`[data-ui-graph-plan-rows="${e}"]`);
		n !== null && r !== null && (n.hidden = t.length === 0, r.replaceChildren(...t));
	}
	nameOf(e, t, n) {
		let r = document.createElement("button"), i = document.createElement("span");
		if (r.type = "button", r.className = "ui-graph__plan-name", r.setAttribute("data-ui-graph-plan-item", e), r.setAttribute(this.services.context.names.tooltip, this.services.context.tooltips.escape(t)), n !== null) {
			let e = document.createElement("span");
			e.className = "ui-graph__plan-icon", e.setAttribute("aria-hidden", "true"), this.services.context.icons.apply(e, n), r.append(e);
		}
		return i.textContent = t, r.append(i), r;
	}
};
function Mc(e, t, ...n) {
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
var Nc = 32, Pc = 84, Fc = "graph:add-node", Ic = "graph:amount", Lc = "graph:output", Rc = "graph:craft-time", zc = "graph:delete-edge", Bc = "graph:target", Vc = "graph:bought", Hc = "data-ui-graph-target", Uc = {
	name: "production",
	readDocument: Os,
	create: (e) => new Wc(e)
}, Wc = class extends pr {
	number;
	decimalSeparator;
	collection;
	editing;
	sheet;
	panel;
	picker;
	collapsed = /* @__PURE__ */ new Set();
	drawn = [];
	outputs = /* @__PURE__ */ new Map();
	quiet = /* @__PURE__ */ new Set();
	reading = null;
	failure = null;
	constructor(e) {
		super(e), this.number = xs(e.context.numbers, e.root), this.decimalSeparator = e.context.numbers.readCulture(e.root).decimalSeparator, this.collection = new ur(e, Vs, (e, t) => this.sheet.placeAt(e, t)), this.editing = new qs(e, this.collection, {
			collapsed: (e) => this.collapsed.has(e),
			craftEdge: (e) => this.links.find((t) => t.craft === e)?.id,
			edge: (e) => this.linkById.get(e)
		}), this.sheet = new li(e, {
			nodeIds: () => this.drawn.map((e) => e.id),
			links: () => this.links,
			layoutKey: () => this.reading === null ? this.shape : `${this.shape}|${this.drawn.map((e) => e.id).join(",")}`,
			nodeBox: (e, t, n, r) => this.shape === "icon" ? pi(t, n, r) : {
				width: t,
				height: n
			},
			spreadsEnds: (e) => this.shape === "card" && this.collection.item(e)?.kind !== "craft",
			footRoom: (e) => this.shape === "icon" && this.collection.item(e)?.kind !== "craft" ? 38 : 0
		}, {
			nodeGap: Nc,
			layerGap: Pc
		}), this.panel = new jc(e, {
			request: () => this.document.plan,
			reading: () => this.reading,
			failure: () => this.failure,
			resource: (e) => this.resource(e),
			craft: (e) => {
				let t = this.collection.item(e);
				return t?.kind === "craft" ? t : void 0;
			},
			change: (e) => this.changePlan(e),
			target: (e, t) => this.setTarget(e, t),
			pick: () => this.picker?.open(),
			show: (e) => this.show(e)
		}), this.picker = Uo.create(e.root, () => this.targetChoices(), e.context.strings, e.context.dom, e.context.icons, e.context.roving, e.context.focus, e.context.shortcuts, (e) => this.setTarget(e.key, 1)), this.refresh();
	}
	targetChoices() {
		let e = new Set(this.document.plan.targets.map((e) => e.resource));
		return this.collection.items.flatMap((t) => t.kind === "resource" && !e.has(t.id) ? [{
			key: t.id,
			title: t.title ?? t.id,
			category: t.category,
			icon: t.image ?? t.icon
		}] : []);
	}
	get planning() {
		return this.services.root.getAttribute(mn) === "plan";
	}
	get editable() {
		return !this.planning && !this.services.settings.readOnly && this.services.root.hasAttribute("data-ui-graph-edit-structure");
	}
	get document() {
		return this.services.documentState.document;
	}
	get shape() {
		return wr(this.services.root.getAttribute("data-ui-graph-node-shape")) ?? "icon";
	}
	refresh() {
		let e = this.planning;
		if (!this.collection.refresh(`${e}|${this.services.settings.readOnly}`)) return;
		let t = this.collection.items, n = e ? ac(t, this.document.plan) : null;
		this.reading = n?.status === "Solved" ? pc(n, this.document.plan.period) : null, this.failure = n?.status === "Infeasible" ? "infeasible" : n?.status === "Unsettled" ? "unsettled" : null;
		let r = this.reading === null ? e ? [] : t : mc(t, this.reading), i = Ws(r);
		this.links = i.edges, this.collapsed = i.collapsed, this.outputs = i.outputs, this.quiet = i.quiet, this.drawn = r.filter((e) => !this.collapsed.has(e.id)), this.linkById = new Map(this.links.map((e) => [e.id, e])), this.sheet.structureChanged(), this.panel.draw(this.collection.key);
	}
	resource(e) {
		let t = this.collection.item(e);
		return t?.kind === "resource" ? t : void 0;
	}
	renderItem(e) {
		let t = this.collection.item(e.id), n = this.collection.conflict(e.id), r = this.services.context.strings;
		if (t?.kind === "craft") {
			let i = this.reading?.crafts.get(t.id);
			return Ss(e, t, {
				tooltips: this.services.context.tooltips,
				word: r.text("ui.graph.recipe"),
				connectable: this.editable,
				conflict: n,
				note: i === void 0 ? null : xc(i, r, this.number),
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
		}, a = this.outputs.get(i.id), o = this.reading?.resources.get(i.id), s = o !== void 0 && this.reading !== null ? bc(o, i.unit ?? null, a !== void 0 && this.collapsed.has(a.craft) ? this.reading.crafts.get(a.craft) : void 0, r, this.number) : a === void 0 ? null : Ts(a.amount, i.unit ?? null, a.time, this.number), c = Yn(e, {
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
			urls: this.services.context.urls,
			shape: this.shape,
			connectable: this.editable,
			conflict: n
		});
		return this.planning && this.document.plan.targets.some((e) => e.resource === i.id) && c.setAttribute(Hc, ""), c;
	}
	wordsChanged() {
		this.panel.wordsChanged();
	}
	edgeEnds(e) {
		let t = this.linkById.get(e.id), n = t === void 0 ? null : this.sheet.ends(t);
		return t === void 0 || n === null ? null : {
			...n,
			arrow: !0,
			conflict: t.role === "recipe" && this.collection.conflict(t.craft) !== null,
			label: this.quiet.has(t.id) ? null : this.amountOf(t)
		};
	}
	amountOf(e) {
		let t = this.resource(e.resource)?.unit ?? null, n = this.reading?.crafts.get(e.craft);
		return n === void 0 || this.reading === null ? ws(e.amount, t, this.number) : e.role === "product" ? gc(n.runs * e.amount, t, this.number) : _c(n.runs * e.amount, this.reading.resources.get(e.resource), t, this.number);
	}
	isPanel(e) {
		return this.panel.contains(e);
	}
	chrome(e) {
		return this.panel.press(e);
	}
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
		qn(this.services, {
			x: t.x + t.width / 2,
			y: t.y + t.height / 2
		}, n === void 0 ? "" : this.number(n.amount), (t) => {
			let n = Es(t, this.decimalSeparator);
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
	duplicate(e) {
		let t = [...e].filter((e) => this.canDuplicate(e)), n = t.length === 0 ? [] : this.collection.duplicate(t, this.services.settings.gridSize * 2, () => {});
		return n.length === 0 ? null : n;
	}
	canDuplicate(e) {
		return this.editable && this.resource(e) !== void 0;
	}
	disconnect(e) {
		let t = new Set([...e].filter((e) => this.canDisconnect(e))), n = this.links.filter((e) => t.has(e.from) || t.has(e.to));
		return this.editing.removeEdges(new Set(n.map((e) => e.id))), n.length > 0;
	}
	canDisconnect(e) {
		return this.editable && this.resource(e) !== void 0 && this.links.some((t) => t.from === e || t.to === e);
	}
	remove(e, t) {
		return this.editable ? (this.editing.removeEdges(t), this.editing.removeEntries(e), !0) : !1;
	}
	runCommand(e, t) {
		let n = e === Fc || e === Ic || e === Lc || e === Rc || e === zc;
		if (e === "graph:link-ingredient" || e === "graph:link-recipe") return this.editable && this.editing.answerLink(e === "graph:link-ingredient"), !0;
		if (this.collection.answerConflict(e, this.conflictOf(t))) return !0;
		if (e === Vc) {
			if (this.planning && t?.kind === "node" && this.isMade(t.id)) {
				let e = this.document.plan, n = e.bought ?? [];
				this.changePlan({
					...e,
					bought: n.includes(t.id) ? n.filter((e) => e !== t.id) : [...n, t.id]
				});
			}
			return !0;
		}
		if (e === Bc) return this.planning && t?.kind === "node" && this.editTarget(t.id), !0;
		if (!n || !this.editable) return n;
		switch (e) {
			case Fc:
				this.editing.addResource();
				break;
			case Ic:
				t?.kind === "edge" && this.editing.editAmount(t.id);
				break;
			case Lc:
				t?.kind === "edge" && this.editing.editOutput(t.id);
				break;
			case Rc:
				t !== null && this.editing.editTime(t.kind === "node" ? t.id : this.linkById.get(t.id)?.craft ?? "");
				break;
			default: t?.kind === "edge" && (this.editing.removeEdges(/* @__PURE__ */ new Set([t.id])), this.services.documentState.edited());
		}
		return !0;
	}
	isMade(e) {
		return this.collection.items.some((t) => t.kind === "craft" && t.products.some((t) => t.resource === e && t.amount > 0));
	}
	conflictOf(e) {
		let t = e?.kind === "node" ? e.id : e?.kind === "edge" ? this.linkById.get(e.id)?.craft ?? null : null;
		return t !== null && this.collection.conflict(t) !== null ? t : null;
	}
	syncMenus(e, t) {
		let n = e && this.editable;
		this.collection.showConflictAnswers(e && this.conflictOf(t) !== null);
		let r = t?.kind === "node" && this.collection.item(t.id)?.kind === "craft", i = t?.kind === "edge" && this.linkById.get(t.id)?.role === "recipe";
		for (let e of [
			Fc,
			Ic,
			zc
		]) j(this.services, e, n);
		let a = this.planning && t?.kind === "node" && this.resource(t.id) !== void 0, o = a && this.isMade(t.id);
		M(this.services, Bc, a), M(this.services, Vc, o), j(this.services, Bc, e && a), j(this.services, Vc, e && o), Yt(this.services, Vc, o && (this.document.plan.bought ?? []).includes(t.id)), j(this.services, Lc, n && i), j(this.services, Rc, n && (r || i));
	}
}, Gc = "graph.set-node-status", Kc = "graph.set-node-display", qc = "graph.set-node-value", Jc = "graph.add-node-log", Yc = "graph.set-run-progress", Xc = "graph.set-running";
function Zc(e, t) {
	e.registerEvent("node-click", { dynamicParameters: (e) => [e.domEvent.detail?.nodeId ?? ""] }), e.registerEvent(Qo, { dynamicParameters: (e) => [...e.domEvent.detail?.keys ?? []] });
	let n = (e, n) => {
		let r = An(e, n);
		return r === null ? null : t()?.kindOf(r, gs) ?? null;
	}, r = (e, t) => {
		let r = e.effect, i = n(e, r);
		i !== null && r.nodeId !== void 0 && t(i, r.nodeId, r);
	};
	e.registerEffect({
		kind: Gc,
		handler: (e) => r(e, (e, t, n) => e.setStatus(t, n.state ?? "Idle", typeof n.progress == "number" ? n.progress : null, n.message ?? null))
	}), e.registerEffect({
		kind: Kc,
		handler: (e) => r(e, (e, t, n) => e.setDisplay(t, n.pinName ?? "", n.value))
	}), e.registerEffect({
		kind: qc,
		handler: (e) => r(e, (e, t, n) => e.setPinValue(t, n.pinName ?? "", n.value, n.committed === !0))
	}), e.registerEffect({
		kind: Jc,
		handler: (e) => r(e, (e, t, n) => e.addLog(t, String(n.level ?? "Info"), n.message ?? null))
	}), e.registerEffect({
		kind: Yc,
		handler: (e) => {
			let t = e.effect;
			n(e, t)?.setRunProgress(Number(t.completed) || 0, Number(t.total) || 0);
		}
	}), e.registerEffect({
		kind: Xc,
		handler: (e) => {
			let t = e.effect;
			n(e, t)?.setRunning(t.running === !0);
		}
	}), e.registerEvent(Yo, {}), e.registerEngine((e) => {
		e.observeComponents(e.root, `[${vo}]`, { childList: !0 }, (n) => {
			for (let r of n) {
				let n = Number(r.getAttribute(vo)), i = Number.isInteger(n) && n > 0 ? e.dom.findComponent(n, []) : null;
				i !== null && t()?.kindOf(i, gs)?.parametersArrived();
			}
		});
	});
}
//#endregion
//#region src/graph.ts
var Q = Fn(), Qc = [
	hs,
	mi,
	Uc
], $ = null;
Q.registerEngine((e) => {
	$ = new kn(e, Qc);
}), Q.registerEvent("save", {
	settlesValue: !0,
	submitsForm: !0,
	dynamicParameters: (e) => [e.domEvent.detail?.reason ?? ""],
	completed: (e) => $?.saveCompleted(e.component, e.success, e.domEvent.detail?.id, e.domEvent.detail?.reason ?? "")
}), Q.registerEvent("menu-entry", { dynamicParameters: (e) => [...e.domEvent.detail?.keys ?? []] }), Q.registerValueReader({
	kind: Dn,
	read: (e) => C(e.getAttribute(t))
}), Q.registerDomOperation({
	kind: Dn,
	handler: (e) => e.target.setAttribute(t, JSON.stringify(e.value ?? null))
}), Q.registerConverter("graph-edge-shape", (e) => String(e ?? "Orthogonal").toLowerCase()), Q.registerConverter("graph-rem", (e) => typeof e == "number" && e > 0 ? `${e}rem` : ""), Q.registerConverter("graph-direction", (e) => {
	let t = String(e ?? "");
	return t === "TopToBottom" ? "down" : t === "RightToLeft" ? "left" : t === "BottomToTop" ? "up" : "right";
}), Q.registerConverter("graph-node-shape", (e) => String(e ?? "") === "Icon" ? "icon" : "card"), Q.registerConverter("graph-production-mode", (e) => String(e ?? "") === "Plan" ? "plan" : "constructor"), Q.registerConverter("graph-corner-top-left", (e) => $c(e, "topLeft")), Q.registerConverter("graph-corner-top-right", (e) => $c(e, "topRight")), Q.registerConverter("graph-corner-bottom-right", (e) => $c(e, "bottomRight")), Q.registerConverter("graph-corner-bottom-left", (e) => $c(e, "bottomLeft")), Q.registerEffect({
	kind: On,
	handler: (e) => {
		let t = e.effect, n = An(e, t);
		n !== null && $?.requestSave(n, typeof t.reason == "string" ? t.reason : "");
	}
}), Zc(Q, () => $), Q.registerCollectionSink({
	kind: "layered",
	handler: (e) => $?.kindOf(e.component, hi)?.applyChange(e)
}), Q.registerCollectionSink({
	kind: "production",
	handler: (e) => $?.kindOf(e.component, Wc)?.applyChange(e)
});
function $c(e, t) {
	if (typeof e != "object" || !e) return "";
	let n = e[t];
	return `${typeof n == "number" ? n : 0}px`;
}
//#endregion
