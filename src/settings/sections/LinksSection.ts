import { Setting } from "obsidian";
import type R2UploaderPlugin from "../../main";
import { renderOutcomePreview, type OutcomePreviewHandle } from "../components/OutcomePreview";
import { createAdvancedDisclosure, createSection } from "../components/SettingSection";
import { FieldBuilder } from "../components/fields";
import { getPublicUrlMode, getStorageDestination, getStorageProvider, providerCanAutoPublicUrl, providerLabel } from "../migrate";
import type { PublicUrlMode } from "../types";

/**
 * Links — "What URL/link will be inserted into the note?"
 * Kept separate from Storage: storage is where the object is uploaded,
 * Links is what URL gets written into the note.
 */
export function renderLinksSection(
	containerEl: HTMLElement,
	plugin: R2UploaderPlugin,
	redraw: () => void,
): void {
	const section = createSection(containerEl, "Links", "link");
	const fields = new FieldBuilder(plugin);

	if (getStorageDestination(plugin.settings) === "local") {
		section.createEl("p", {
			text: "Local vault folder is selected as the storage destination, so uploads link to a vault-relative path rather than a public URL.",
			cls: "setting-item-description",
		});
		renderOutcomePreview(section, plugin);
		return;
	}

	const canAutoPublicUrl = providerCanAutoPublicUrl(getStorageProvider(plugin.settings));

	new Setting(section)
		.setName("Public URL")
		.setDesc(canAutoPublicUrl
			? "How the URL inserted into your note is derived."
			: `${providerLabel(getStorageProvider(plugin.settings))} does not support an automatically-derived public URL — a custom domain is required.`)
		.addDropdown((d) => {
			d.addOption("auto", "Automatic / provider default")
				.addOption("custom", "Custom domain / CDN")
				.setValue(getPublicUrlMode(plugin.settings))
				.setDisabled(!canAutoPublicUrl)
				.onChange(async (v: string) => {
					plugin.settings.publicUrlMode = v as PublicUrlMode;
					plugin.settings.useCustomImageUrl = v === "custom";
					plugin.createS3Client();
					await plugin.saveSettings();
					redraw();
				});
		});

	let preview: OutcomePreviewHandle | undefined;

	if (getPublicUrlMode(plugin.settings) === "custom") {
		const baseUrlSetting = new Setting(section)
			.setName("Base URL")
			.setDesc("Public base URL for uploaded objects, e.g. Your CDN or custom domain.")
			.addText((text) =>
				text.setPlaceholder("HTTPS://assets.example.com/")
					.setValue(plugin.settings.customImageUrl)
					.onChange(async (v) => {
						let normalized = v;
						if (normalized && !/^https?:\/\//.test(normalized)) normalized = "https://" + normalized;
						if (normalized) normalized = normalized.replace(/([^/])$/, "$1/");
						plugin.settings.customImageUrl = normalized.trim();
						plugin.createS3Client();
						await plugin.saveSettings();
						preview?.refresh();
					}));
		baseUrlSetting.settingEl.addClass("r2-full-width-row");
	}

	preview = renderOutcomePreview(section, plugin);

	const advanced = createAdvancedDisclosure(section);
	fields.string(advanced, "Query string key", "", "E.g. v", "queryStringKey", { onChanged: () => preview?.refresh() });
	fields.string(advanced, "Query string value", "", "E.g. 1", "queryStringValue", { onChanged: () => preview?.refresh() });
}
