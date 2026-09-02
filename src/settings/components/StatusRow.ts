import { HeadBucketCommand } from "@aws-sdk/client-s3";
import type R2UploaderPlugin from "../../main";
import { resolvePublicBaseUrl } from "../../uploader";
import { getProviderPreset, getPublicUrlMode, getStorageDestination, getStorageProvider } from "../migrate";

const PROVIDER_LABELS: Record<string, string> = {
	"cloudflare-r2": "Cloudflare R2",
	"aws-s3": "AWS S3",
	"minio": "MinIO",
	"backblaze-b2": "Backblaze B2",
	"other": "S3-compatible storage",
};

export function providerLabel(provider: string): string {
	return PROVIDER_LABELS[provider] ?? "S3-compatible storage";
}

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
 */
export function isConfigurationComplete(plugin: R2UploaderPlugin): boolean {
	const s = plugin.settings;
	if (getStorageDestination(s) === "local") {
		return !!s.localUploadFolder;
	}
	if (!(s.accessKey && s.secretKey && s.bucket && s.region)) return false;

	const preset = getProviderPreset(getStorageProvider(s));
	if (preset.requiresCustomEndpoint && !(s.useCustomEndpoint && s.customEndpoint)) return false;
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
