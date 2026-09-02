import { setIcon } from "obsidian";

export interface SettingsNavTab<TId extends string = string> {
	id: TId;
	label: string;
	icon: string;
}

/**
 * Left-hand navigation on wide panes, horizontally-scrollable top tabs on
 * narrow ones (see styles.css `.r2-nav`) — the DOM/behavior is identical,
 * only the CSS layout changes at the breakpoint. Re-rendered in place on
 * every tab switch; it never affects which section is mounted beyond
 * invoking `onSelect`.
 */
export function renderSettingsNavigation<TId extends string>(
	containerEl: HTMLElement,
	tabs: SettingsNavTab<TId>[],
	activeId: TId,
	onSelect: (id: TId) => void,
): void {
	containerEl.empty();
	containerEl.addClass("r2-nav");

	for (const tab of tabs) {
		const item = containerEl.createDiv({
			cls: `r2-nav-item${tab.id === activeId ? " is-active" : ""}`,
		});
		const iconEl = item.createSpan({ cls: "r2-nav-icon" });
		setIcon(iconEl, tab.icon);
		item.createSpan({ text: tab.label, cls: "r2-nav-label" });
		item.addEventListener("click", () => onSelect(tab.id));
	}
}
