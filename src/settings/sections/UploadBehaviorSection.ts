import { Setting } from "obsidian";
import type R2UploaderPlugin from "../../main";
import { createSection, createSubheading } from "../components/SettingSection";
import { FieldBuilder } from "../components/fields";
import { isAutoUploadOnCreateEnabled, setAutoUploadOnCreateEnabled } from "../migrate";

/**
 * Upload behavior — "What actions trigger an upload?"
 * Separates triggers, optional file types, exclusions, and a pointer to
 * frontmatter overrides — the old "Upload settings" section mixed all of
 * these together with destination config.
 */
export function renderUploadBehaviorSection(containerEl: HTMLElement, plugin: R2UploaderPlugin): void {
	const section = createSection(containerEl, "Upload behavior", "upload");
	const fields = new FieldBuilder(plugin);

	createSubheading(section, "Triggers");
	new Setting(section).setName("Paste images").setDesc("Upload images pasted into the editor.").addToggle((t) => t.setValue(true).setDisabled(true));
	fields.toggle(section, "Drag & drop", "Also upload images dropped into the editor.", "uploadOnDrag");
	new Setting(section)
		.setName("Automatically upload new attachments")
		.setDesc("Uploads newly created image attachments (e.g. Added by sync) to configured storage and replaces the local attachment with the remote link.")
		.addToggle((t) => t.setValue(isAutoUploadOnCreateEnabled(plugin.settings))
			.onChange(async (v) => {
				setAutoUploadOnCreateEnabled(plugin.settings, v);
				await plugin.saveSettings();
			}));

	createSubheading(section, "Additional file types");
	fields.toggle(section, "Video", "", "uploadVideo");
	fields.toggle(section, "Audio", "", "uploadAudio");
	fields.toggle(section, "PDF", "", "uploadPdf");

	createSubheading(section, "Exclusions");
	fields.string(section, "Ignore pattern", "Glob patterns to skip, comma-separated.", "Private/*, **/drafts/**", "ignorePattern");

	createSubheading(section, "Per-note overrides");
	const overrideDesc = section.createEl("p", { cls: "setting-item-description r2-frontmatter-note" });
	overrideDesc.appendText("Some upload settings can be overridden per note using frontmatter (e.g. ");
	const properties = ["localUpload", "uploadFolder", "uploadVideo", "uploadAudio", "uploadPdf", "uploadOnDrag"];
	properties.forEach((prop, i) => {
		const code = overrideDesc.createEl("code");
		code.setText(prop);
		if (i < properties.length - 1) overrideDesc.appendText(", ");
	});
	overrideDesc.appendText("). Global defaults above apply unless a note's frontmatter sets its own value.");
}
