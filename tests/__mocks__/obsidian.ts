// Minimal stub so uploader.ts / settings.ts can be imported (and, for
// Setting/PluginSettingTab, actually rendered against a fake DOM) in the
// test environment.
import { FakeEl } from "./dom-shim";

export const requestUrl = () => Promise.resolve({ headers: {}, status: 200, arrayBuffer: new ArrayBuffer(0) });
export type RequestUrlParam = unknown;
export class Notice { constructor(_msg: string) {} }
export class Plugin {}
export class TextComponent {}
export const setIcon = () => {};
export class TFile {}
export class MarkdownView {}
export class Editor {}

export class PluginSettingTab {
	app: any;
	plugin: any;
	containerEl: FakeEl;
	constructor(app: any, plugin: any) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = new FakeEl("div");
	}
}

/** Chainable stand-in for Obsidian's Setting/*Component API — just enough
 *  of the surface used under src/settings/** to render without throwing.
 *  `inputEl`/`buttonEl` are real (attached) FakeEl nodes so tests can query
 *  the rendered tree for value/disabled state, not just presence of text. */
class SettingComponent {
	inputEl: FakeEl;
	buttonEl: FakeEl;
	value: any;
	constructor(el: FakeEl) {
		this.inputEl = el;
		this.buttonEl = el;
	}
	onChange(_fn: Function) { return this; }
	setValue(v: any) { this.value = v; this.inputEl.value = v; return this; }
	setPlaceholder(p: string) { this.inputEl.placeholder = p; return this; }
	setDisabled(d: boolean) { this.inputEl.disabled = d; return this; }
	setDynamicTooltip() { return this; }
	setLimits(_a: any, _b: any, _c: any) { return this; }
	setTooltip(_t: string) { return this; }
	setIcon(_i: string) { return this; }
	setCta() { return this; }
	setButtonText(t: string) { this.buttonEl.setText(t); return this; }
	setTransform(_fn: Function) { return this; }
	addOption(_v: string, _l: string) { return this; }
	addOptions(_o: Record<string, string>) { return this; }
	onClick(fn: Function) { this.buttonEl.addEventListener("click", fn); return this; }
}

export class Setting {
	el: FakeEl;
	nameEl: FakeEl;
	descEl: FakeEl;
	controlEl: FakeEl;
	settingEl: FakeEl;
	constructor(containerEl: FakeEl) {
		this.el = containerEl.createDiv({ cls: "setting-item" });
		this.settingEl = this.el;
		this.nameEl = this.el.createDiv({ cls: "setting-item-name" });
		this.descEl = this.el.createDiv({ cls: "setting-item-description" });
		this.controlEl = this.el.createDiv({ cls: "setting-item-control" });
	}
	setName(n: string) { this.nameEl.setText(n); return this; }
	setDesc(d: any) { this.descEl.setText(typeof d === "string" ? d : ""); return this; }
	setHeading() { return this; }
	setClass(c: string) { this.el.addClass(c); return this; }
	private addComponent(tag: string, cb: (c: SettingComponent) => void): this {
		const el = this.controlEl.createEl(tag);
		cb(new SettingComponent(el));
		return this;
	}
	addText(cb: (c: SettingComponent) => void) { return this.addComponent("input", cb); }
	addTextArea(cb: (c: SettingComponent) => void) { return this.addComponent("textarea", cb); }
	addToggle(cb: (c: SettingComponent) => void) { return this.addComponent("input", cb); }
	addButton(cb: (c: SettingComponent) => void) { return this.addComponent("button", cb); }
	addExtraButton(cb: (c: SettingComponent) => void) { return this.addComponent("button", cb); }
	addDropdown(cb: (c: SettingComponent) => void) { return this.addComponent("select", cb); }
	addSlider(cb: (c: SettingComponent) => void) { return this.addComponent("input", cb); }
	addColorPicker(cb: (c: SettingComponent) => void) { return this.addComponent("input", cb); }
	then(cb: (s: Setting) => void) { cb(this); return this; }
}
