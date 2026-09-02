import type R2UploaderPlugin from "../../main";
import { buildObjectKey, resolvePublicUrl, wrapFileDependingOnType } from "../../uploader";
import { getStorageDestination } from "../migrate";
import type { R2UploaderSettings } from "../types";

export interface OutcomePreviewResult {
	objectKey: string;
	url: string;
	markdown: string;
}

const EXAMPLE_BASENAME = "my-note";

/**
 * Read-only preview of what the current settings would produce for a
 * pasted image, right now. Reuses the exact same `buildObjectKey` /
 * `resolvePublicUrl` functions the real upload path uses — this file must
 * never re-implement that logic, only call it, so the preview can't drift
 * from actual upload behavior.
 */
export function computeOutcomePreview(
	settings: R2UploaderSettings,
	opts?: { basename?: string; now?: Date },
): OutcomePreviewResult {
	const basename = opts?.basename ?? EXAMPLE_BASENAME;
	const now = opts?.now ?? new Date();
	const seq = settings.uploadSeq ?? 0;
	const ext = settings.convertToWebP ? "webp" : "png";
	const destination = getStorageDestination(settings);
	const folder = destination === "local" ? settings.localUploadFolder : settings.folder;
	const objectKey = buildObjectKey(folder, basename, seq, ext, now);

	if (destination === "local") {
		return { objectKey, url: objectKey, markdown: wrapFileDependingOnType(objectKey, "image", "") };
	}

	const url = resolvePublicUrl(settings, objectKey);
	return { objectKey, url, markdown: wrapFileDependingOnType(url, "image", "") };
}

export function renderOutcomePreview(containerEl: HTMLElement, plugin: R2UploaderPlugin): void {
	const wrap = containerEl.createDiv({ cls: "r2-outcome-preview" });
	wrap.createEl("p", { text: "Outcome preview", cls: "r2-outcome-heading" });

	const render = () => {
		wrap.querySelectorAll(".r2-outcome-row").forEach((el) => el.remove());
		const result = computeOutcomePreview(plugin.settings);

		const keyRow = wrap.createDiv({ cls: "r2-outcome-row" });
		keyRow.createEl("span", { text: "Object key", cls: "r2-outcome-label" });
		keyRow.createEl("code", { text: result.objectKey, cls: "r2-outcome-value" });

		const linkRow = wrap.createDiv({ cls: "r2-outcome-row" });
		linkRow.createEl("span", { text: "Inserted link", cls: "r2-outcome-label" });
		linkRow.createEl("code", { text: result.markdown, cls: "r2-outcome-value r2-outcome-value-wrap" });
	};

	render();
}
