import { App, PluginSettingTab, Setting } from "obsidian";
import type R2UploaderPlugin from "../main";
import { renderSettingsNavigation, type SettingsNavTab } from "./components/SettingsNavigation";
import { renderStatusRow } from "./components/StatusRow";
import { renderAdvancedSection } from "./sections/AdvancedSection";
import { renderImageOptimizationSection } from "./sections/ImageOptimizationSection";
import { renderLinksSection } from "./sections/LinksSection";
import { renderStorageSection } from "./sections/StorageSection";
import { renderUploadBehaviorSection } from "./sections/UploadBehaviorSection";
import { renderWatermarkSection } from "./sections/WatermarkSection";

type TabId = "storage" | "links" | "upload-behavior" | "image-optimization" | "watermark" | "advanced";

const TABS: SettingsNavTab<TabId>[] = [
	{ id: "storage", label: "Storage", icon: "database" },
	{ id: "links", label: "Links", icon: "link" },
	{ id: "upload-behavior", label: "Upload behavior", icon: "upload" },
	{ id: "image-optimization", label: "Image optimization", icon: "image" },
	{ id: "watermark", label: "Watermark", icon: "stamp" },
	{ id: "advanced", label: "Advanced", icon: "settings-2" },
];

/**
 * Thin composition shell:
 *   SettingsTab
 *   ├── SettingsNavigation
 *   └── active section only
 *
 * Navigation state is local to this instance (not persisted — reopening
 * settings always starts on Storage). Only the active tab's section is ever
 * mounted; switching tabs re-renders just the content pane, and a separate
 * `refreshStatus()` re-renders just the status row — neither touches the
 * nav, and structural changes never redraw the whole tab, so per-keystroke
 * updates (handled by each section's own preview `refresh()`) never lose
 * input focus.
 */
export class R2UploaderSettingTab extends PluginSettingTab {
	plugin: R2UploaderPlugin;
	private activeTab: TabId = "storage";
	private statusEl: HTMLElement;
	private navEl: HTMLElement;
	private contentEl: HTMLElement;

	constructor(app: App, plugin: R2UploaderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("r2-settings");

		new Setting(containerEl).setName("Paste to S3").setHeading();
		this.statusEl = containerEl.createDiv();
		this.refreshStatus();

		const layout = containerEl.createDiv({ cls: "r2-layout" });
		this.navEl = layout.createDiv();
		this.contentEl = layout.createDiv({ cls: "r2-content" });

		this.renderNav();
		this.renderActiveSection();
	}

	private renderNav(): void {
		renderSettingsNavigation(this.navEl, TABS, this.activeTab, (id) => {
			this.activeTab = id;
			this.renderNav();
			this.renderActiveSection();
		});
	}

	private renderActiveSection(): void {
		this.contentEl.empty();
		const redraw = () => this.renderActiveSection();
		const refreshStatus = () => this.refreshStatus();

		switch (this.activeTab) {
			case "storage":
				renderStorageSection(this.contentEl, this.plugin, redraw, refreshStatus);
				break;
			case "links":
				renderLinksSection(this.contentEl, this.plugin, redraw);
				break;
			case "upload-behavior":
				renderUploadBehaviorSection(this.contentEl, this.plugin);
				break;
			case "image-optimization":
				renderImageOptimizationSection(this.contentEl, this.plugin);
				break;
			case "watermark":
				renderWatermarkSection(this.contentEl, this.plugin);
				break;
			case "advanced":
				renderAdvancedSection(this.contentEl, this.plugin);
				break;
		}
	}

	private refreshStatus(): void {
		this.statusEl.empty();
		renderStatusRow(this.statusEl, this.plugin);
	}
}
