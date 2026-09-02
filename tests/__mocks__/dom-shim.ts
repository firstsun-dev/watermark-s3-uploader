// Minimal DOM shim replicating the subset of Obsidian's HTMLElement
// extensions + native DOM methods actually used by src/settings/**, so
// settings-tab render smoke tests can run in vitest's node environment
// without a real browser/DOM.
export class FakeEl {
	tag: string;
	cls = new Set<string>();
	children: FakeEl[] = [];
	text = "";
	attrs: Record<string, string> = {};
	listeners: Record<string, Function[]> = {};
	value = "";
	type = "text";
	placeholder = "";
	disabled = false;
	parentEl: FakeEl | null = null;

	constructor(tag = "div") {
		this.tag = tag;
	}

	createDiv(opts?: any) {
		return this._create("div", opts);
	}
	createSpan(opts?: any) {
		return this._create("span", opts);
	}
	createEl(tag: string, opts?: any) {
		return this._create(tag, opts);
	}

	private _create(tag: string, opts?: any) {
		const el = new FakeEl(tag);
		el.parentEl = this;
		el._applyOpts(opts);
		this.children.push(el);
		return el;
	}

	_applyOpts(opts?: any) {
		if (typeof opts === "string") this.text = opts;
		if (opts?.text) this.text = opts.text;
		if (opts?.cls) {
			const classes = Array.isArray(opts.cls) ? opts.cls : String(opts.cls).split(" ");
			classes.filter(Boolean).forEach((c: string) => this.cls.add(c));
		}
		if (opts?.attr) Object.assign(this.attrs, opts.attr);
		if (opts?.type) this.type = opts.type;
		if (opts?.value !== undefined) this.value = opts.value;
		if (opts?.placeholder) this.placeholder = opts.placeholder;
		return this;
	}

	empty() {
		this.children = [];
	}
	addClass(...c: string[]) {
		c.forEach((x) => this.cls.add(x));
	}
	removeClass(...c: string[]) {
		c.forEach((x) => this.cls.delete(x));
	}
	toggleClass(c: string, on: boolean) {
		on ? this.cls.add(c) : this.cls.delete(c);
	}
	setText(t: string) {
		this.text = t;
	}
	appendText(t: string) {
		this.text += t;
	}
	addEventListener(evt: string, fn: Function) {
		(this.listeners[evt] ??= []).push(fn);
	}
	click() {
		(this.listeners["click"] ?? []).forEach((f) => f());
	}
	focus() {}
	select() {}
	getAttribute(k: string) {
		return this.attrs[k];
	}
	setAttribute(k: string, v: string) {
		this.attrs[k] = v;
	}
	remove() {
		if (this.parentEl) {
			const idx = this.parentEl.children.indexOf(this);
			if (idx >= 0) this.parentEl.children.splice(idx, 1);
			this.parentEl = null;
		}
	}
	insertAdjacentElement(_pos: string, el: FakeEl) {
		if (this.parentEl) {
			const idx = this.parentEl.children.indexOf(this);
			this.parentEl.children.splice(idx, 0, el);
			el.parentEl = this.parentEl;
		}
		return el;
	}
	/** Supports either a class selector (".foo") or a bare tag name ("input"). */
	querySelectorAll(sel: string): FakeEl[] {
		const isClass = sel.startsWith(".");
		const needle = sel.replace(/^\./, "");
		const out: FakeEl[] = [];
		const walk = (el: FakeEl) => {
			for (const c of el.children) {
				if (isClass ? c.cls.has(needle) : c.tag === needle) out.push(c);
				walk(c);
			}
		};
		walk(this);
		return out;
	}
}

// Obsidian injects createDiv/createSpan/createEl as globals too (used
// directly, not via an element instance, in a couple of places).
(globalThis as any).createSpan = (opts?: any) => new FakeEl("span")._applyOpts(opts);
(globalThis as any).createDiv = (opts?: any) => new FakeEl("div")._applyOpts(opts);
(globalThis as any).createEl = (tag: string, opts?: any) => new FakeEl(tag)._applyOpts(opts);
