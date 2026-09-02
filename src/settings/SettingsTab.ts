import { App, PluginSettingTab, Setting } from "obsidian";
import type R2UploaderPlugin from "../main";
import { renderStatusRow } from "./components/StatusRow";
import { renderAdvancedSection } from "./sections/AdvancedSection";
import { renderImageOptimizationSection } from "./sections/ImageOptimizationSection";
import { renderLinksSection } from "./sections/LinksSection";
import { renderStorageSection } from "./sections/StorageSection";
import { renderUploadBehaviorSection } from "./sections/UploadBehaviorSection";
import { renderWatermarkSection } from "./sections/WatermarkSection";

/**
 * Composes the settings page from independent sections, ordered around the
 * user's mental model rather than implementation concepts:
 *   Storage → Links → Upload behavior → Image optimization → Watermark → Advanced
 * Each section owns its own fields/business logic; this class only composes.
 */
export class R2UploaderSettingTab extends PluginSettingTab {
	plugin: R2UploaderPlugin;

	constructor(app: App, plugin: R2UploaderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("r2-settings");

		new Setting(containerEl).setName("Uploader").setHeading();
		renderStatusRow(containerEl, this.plugin);

		const redraw = () => this.display();

		renderStorageSection(containerEl, this.plugin, redraw);
		renderLinksSection(containerEl, this.plugin, redraw);
		renderUploadBehaviorSection(containerEl, this.plugin);
		renderImageOptimizationSection(containerEl, this.plugin);
		renderWatermarkSection(containerEl, this.plugin);
		renderAdvancedSection(containerEl, this.plugin);
	}
}
