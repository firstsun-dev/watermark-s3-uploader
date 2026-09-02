import { setIcon } from "obsidian";

/** A top-level, collapsible settings section ("1. Storage", "2. Links", ...). */
export function createSection(
	parent: HTMLElement,
	label: string,
	open = false,
	icon?: string,
): HTMLElement {
	const details = parent.createEl("details", { cls: "r2-section" });
	if (open) details.setAttribute("open", "");
	const summary = details.createEl("summary", { cls: "r2-section-summary" });
	if (icon) {
		const iconEl = summary.createSpan({ cls: "r2-section-icon" });
		setIcon(iconEl, icon);
	}
	summary.createSpan({ text: label, cls: "r2-section-title" });
	return details;
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
