import type R2UploaderPlugin from "../../main";
import { createSection } from "../components/SettingSection";
import { FieldBuilder } from "../components/fields";

/**
 * Advanced — "Are there advanced compatibility/debug settings?"
 * Only genuinely uncommon/technical settings that don't belong elsewhere.
 */
export function renderAdvancedSection(containerEl: HTMLElement, plugin: R2UploaderPlugin): void {
	const section = createSection(containerEl, "6. Advanced", false, "settings-2");
	const fields = new FieldBuilder(plugin);

	fields.toggle(section, "Bypass local CORS check", "Enable if you encounter CORS issues testing uploads from within Obsidian.", "bypassCors");
	fields.toggle(section, "Debug logging", "Print detailed logs to the developer console (Cmd/Ctrl+Opt/Shift+I). Disable when not needed.", "debugMode");
}
