import { Setting } from "obsidian";
import type R2UploaderPlugin from "../../main";
import { createSection } from "../components/SettingSection";
import { FieldBuilder, toggleSettingsVisibility } from "../components/fields";

/**
 * Image optimization — "What happens to the image before upload?"
 * Runtime processing order (see pasteHandler.ts#processFile): WebP
 * conversion, then compression, then watermark. This section documents
 * WebP + compression; Watermark has its own top-level section per the IA.
 */
export function renderImageOptimizationSection(containerEl: HTMLElement, plugin: R2UploaderPlugin): void {
	const section = createSection(containerEl, "Image optimization", "image");
	const fields = new FieldBuilder(plugin);

	fields.toggle(section, "Convert to WebP", "Convert images to WebP before uploading (applied first). Filename becomes .webp.", "convertToWebP");

	new Setting(section)
		.setName("Webp quality")
		.setDesc("0.1 (small file) — 1.0 (best quality). Default: 0.85")
		.addSlider((s) => s.setDynamicTooltip().setLimits(0.1, 1.0, 0.05)
			.setValue(plugin.settings.webpQuality)
			.onChange(async (v) => { plugin.settings.webpQuality = v; await plugin.saveSettings(); }));

	const compressionSettings: Setting[] = [];
	fields.toggle(section, "Compress large images", "Applied after WebP conversion, before watermarking.", "enableImageCompression", (v) => {
		toggleSettingsVisibility(compressionSettings, v);
	});

	compressionSettings.push(
		new Setting(section)
			.setName("Maximum size (mb)")
			.addText((text) =>
				text.setPlaceholder("1").setValue(plugin.settings.maxImageCompressionSize.toString())
					.onChange(async (v) => {
						const n = parseFloat(v);
						if (!isNaN(n) && n > 0) { plugin.settings.maxImageCompressionSize = n; await plugin.saveSettings(); }
					})),

		new Setting(section)
			.setName("Compression quality")
			.addSlider((s) => s.setDynamicTooltip().setLimits(0.0, 1.0, 0.05)
				.setValue(plugin.settings.imageCompressionQuality)
				.onChange(async (v) => { plugin.settings.imageCompressionQuality = v; await plugin.saveSettings(); })),

		new Setting(section)
			.setName("Maximum width / height (px)")
			.addText((text) =>
				text.setPlaceholder("4096").setValue(plugin.settings.maxImageWidthOrHeight.toString())
					.onChange(async (v) => {
						const n = parseInt(v);
						if (!isNaN(n) && n > 0) { plugin.settings.maxImageWidthOrHeight = n; await plugin.saveSettings(); }
					})),
	);

	toggleSettingsVisibility(compressionSettings, plugin.settings.enableImageCompression);
}
