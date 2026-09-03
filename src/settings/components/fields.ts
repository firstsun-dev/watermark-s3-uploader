import { Setting, TextComponent, setIcon } from "obsidian";
import type R2UploaderPlugin from "../../main";
import type { R2UploaderSettings } from "../types";

/** Adds a "show/hide" eye icon to a text input and starts it masked. */
export const wrapTextWithPasswordHide = (text: TextComponent): TextComponent | undefined => {
	const hider = text.inputEl.insertAdjacentElement("beforebegin", createSpan());
	if (!hider) return;
	setIcon(hider as HTMLElement, "eye-off");
	hider.addEventListener("click", () => {
		const isText = text.inputEl.getAttribute("type") === "text";
		setIcon(hider as HTMLElement, isText ? "eye-off" : "eye");
		text.inputEl.setAttribute("type", isText ? "password" : "text");
		text.inputEl.focus();
	});
	text.inputEl.setAttribute("type", "password");
	return text;
};

/** Shows/hides a group of Settings together, e.g. for progressive disclosure. */
export function toggleSettingsVisibility(settings: Setting[], show: boolean): void {
	settings.forEach((s) => s.settingEl.toggleClass("is-hidden", !show));
}

/** Bound helper for building simple text/toggle settings against plugin.settings,
 *  auto-persisting on change and re-rendering the watermark preview if requested. */
export class FieldBuilder {
	constructor(
		private plugin: R2UploaderPlugin,
		private onSaved?: () => void,
	) {}

	private async persist(): Promise<void> {
		await this.plugin.saveSettings();
		this.onSaved?.();
	}

	string(
		container: HTMLElement,
		name: string,
		desc: string,
		placeholder: string,
		key: keyof R2UploaderSettings,
		opts?: { password?: boolean; onChanged?: () => void },
	): Setting {
		return new Setting(container)
			.setName(name)
			.setDesc(desc)
			.addText((text) => {
				if (opts?.password) wrapTextWithPasswordHide(text);
				text.setPlaceholder(placeholder)
					.setValue(String(this.plugin.settings[key]))
					.onChange(async (v) => {
						(this.plugin.settings[key] as string) = v.trim();
						opts?.onChanged?.();
						await this.persist();
					});
			});
	}

	toggle(
		container: HTMLElement,
		name: string,
		desc: string,
		key: keyof R2UploaderSettings,
		onChanged?: (v: boolean) => void,
	): Setting {
		return new Setting(container)
			.setName(name)
			.setDesc(desc)
			.addToggle((t) => t.setValue(!!this.plugin.settings[key])
				.onChange(async (v) => {
					(this.plugin.settings[key] as boolean) = v;
					onChanged?.(v);
					await this.persist();
				}));
	}
}
