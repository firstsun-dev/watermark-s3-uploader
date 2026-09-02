import { setIcon } from "obsidian";

/**
 * A top-level settings page ("Storage", "Links", ...). Only one of these is
 * ever mounted at a time — the settings tab renders whichever page is
 * active in its navigation, so this is a plain container with a heading,
 * never a collapsible `<details>` accordion.
 */
export function createSection(
	parent: HTMLElement,
	label: string,
	icon?: string,
): HTMLElement {
	const page = parent.createDiv({ cls: "r2-page" });
	const heading = page.createDiv({ cls: "r2-page-heading" });
	if (icon) {
		const iconEl = heading.createSpan({ cls: "r2-page-icon" });
		setIcon(iconEl, icon);
	}
	heading.createEl("h3", { text: label, cls: "r2-page-title" });
	return page;
}

/** A secondary "Advanced ▸" disclosure nested inside a section, for
 *  protocol-level / uncommon fields that shouldn't compete with primary
 *  fields for attention. */
export function createAdvancedDisclosure(parent: HTMLElement, label = "Advanced"): HTMLElement {
	const details = parent.createEl("details", { cls: "r2-advanced" });
	const summary = details.createEl("summary", { cls: "r2-advanced-summary" });
	summary.createSpan({ text: label });
	return details;
}

export function createSubheading(parent: HTMLElement, label: string): void {
	parent.createEl("p", { text: label, cls: "r2-subsection-heading" });
}
