import { HeadBucketCommand } from "@aws-sdk/client-s3";
import type R2UploaderPlugin from "../../main";
import { resolvePublicBaseUrl } from "../../uploader";
import { getProviderPreset, getPublicUrlMode, getStorageDestination, getStorageProvider, providerLabel } from "../migrate";
import { validateStorageConfiguration } from "../validation";

/** Shared connection test, used by both the top status row and the Storage
 *  section's own "Test connection" button — one implementation, one source
 *  of truth for what "connected" means. */
export async function testS3Connection(plugin: R2UploaderPlugin): Promise<{ ok: boolean; message: string }> {
	try {
		const client = plugin.s3;
		if (!client) throw new Error("S3 client not initialized");
		await client.send(new HeadBucketCommand({ Bucket: plugin.settings.bucket }));
		return { ok: true, message: "Connected" };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return { ok: false, message };
	}
}

/**
 * Provider-aware: "configured" requires more than non-empty
 * accessKey/secretKey/bucket/region — a provider that requires a custom
 * endpoint isn't configured until that endpoint is set, and a provider that
 * can't auto-derive a public URL isn't configured until a custom public URL
 * is set either. This is what keeps the status honest instead of showing
 * "✓ Ready" for a contradictory/incomplete setup.
 *
 * Delegates the storage-field checks (bucket/endpoint/region/credentials) to
 * {@link validateStorageConfiguration} — the same helper the Storage
 * section's "Test connection" preflight uses — so the two never drift apart.
 */
export function isConfigurationComplete(plugin: R2UploaderPlugin): boolean {
	const s = plugin.settings;
	if (!validateStorageConfiguration(s).valid) return false;
	if (getStorageDestination(s) === "local") return true;

	const preset = getProviderPreset(getStorageProvider(s));
	if (!preset.canAutoPublicUrl && !(getPublicUrlMode(s) === "custom" && s.customImageUrl)) return false;

	return true;
}

export function renderStatusRow(containerEl: HTMLElement, plugin: R2UploaderPlugin): void {
	const wrap = containerEl.createDiv({ cls: "r2-status-row" });
	const s = plugin.settings;
	const destination = getStorageDestination(s);
	const configured = isConfigurationComplete(plugin);
	const result = plugin.lastConnectionResult;

	const headline = wrap.createDiv({ cls: "r2-status-headline" });
	if (!configured) {
		headline.createSpan({ cls: "r2-status-badge r2-status-warn", text: "⚠ Not configured" });
	} else if (destination === "local") {
		headline.createSpan({ cls: "r2-status-badge r2-status-ok", text: "✓ Ready" });
	} else if (!result) {
		headline.createSpan({ cls: "r2-status-badge r2-status-neutral", text: "○ Configured — connection not tested" });
	} else if (result.ok) {
		headline.createSpan({ cls: "r2-status-badge r2-status-ok", text: "✓ Connected" });
	} else {
		headline.createSpan({ cls: "r2-status-badge r2-status-error", text: "✗ Connection failed" });
	}

	const detail = wrap.createDiv({ cls: "r2-status-detail" });
	if (destination === "local") {
		detail.createSpan({ text: `Local vault folder · ${s.localUploadFolder || "(not set)"}` });
	} else {
		detail.createSpan({ text: `${providerLabel(getStorageProvider(s))} · ${s.bucket || "(no bucket)"}` });
		const publicUrl = resolvePublicBaseUrl(s);
		if (publicUrl) {
			const urlLine = wrap.createDiv({ cls: "r2-status-url" });
			urlLine.setText(publicUrl);
		}
	}
}
