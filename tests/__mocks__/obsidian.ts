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
 *  of the surface used under src/settings/** to render without throwing. */
class SettingComponent {
	inputEl = new FakeEl("input");
	buttonEl = new FakeEl("button");
	value: any;
	onChange(_fn: Function) { return this; }
	setValue(v: any) { this.value = v; return this; }
	setPlaceholder(_p: string) { return this; }
	setDisabled(_d: boolean) { return this; }
	setDynamicTooltip() { return this; }
	setLimits(_a: any, _b: any, _c: any) { return this; }
	setTooltip(_t: string) { return this; }
	setIcon(_i: string) { return this; }
	setCta() { return this; }
	setButtonText(_t: string) { return this; }
	setTransform(_fn: Function) { return this; }
	addOption(_v: string, _l: string) { return this; }
	addOptions(_o: Record<string, string>) { return this; }
	onClick(_fn: Function) { return this; }
}

export class Setting {
	el: FakeEl;
	nameEl = new FakeEl("div");
	descEl = new FakeEl("div");
	controlEl = new FakeEl("div");
	settingEl: FakeEl;
	constructor(containerEl: FakeEl) {
		this.el = containerEl.createDiv({ cls: "setting-item" });
		this.settingEl = this.el;
	}
	setName(_n: string) { return this; }
	setDesc(_d: any) { return this; }
	setHeading() { return this; }
	setClass(c: string) { this.el.addClass(c); return this; }
	addText(cb: (c: SettingComponent) => void) { cb(new SettingComponent()); return this; }
	addTextArea(cb: (c: SettingComponent) => void) { cb(new SettingComponent()); return this; }
	addToggle(cb: (c: SettingComponent) => void) { cb(new SettingComponent()); return this; }
	addButton(cb: (c: SettingComponent) => void) { cb(new SettingComponent()); return this; }
	addExtraButton(cb: (c: SettingComponent) => void) { cb(new SettingComponent()); return this; }
	addDropdown(cb: (c: SettingComponent) => void) { cb(new SettingComponent()); return this; }
	addSlider(cb: (c: SettingComponent) => void) { cb(new SettingComponent()); return this; }
	addColorPicker(cb: (c: SettingComponent) => void) { cb(new SettingComponent()); return this; }
	then(cb: (s: Setting) => void) { cb(this); return this; }
}
