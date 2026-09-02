import { HeadBucketCommand } from "@aws-sdk/client-s3";
import type R2UploaderPlugin from "../../main";
import { getStorageDestination, getStorageProvider } from "../migrate";

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

function isConfigured(plugin: R2UploaderPlugin): boolean {
	const s = plugin.settings;
	if (getStorageDestination(s) === "local") {
		return !!s.localUploadFolder;
	}
	return !!(s.accessKey && s.secretKey && s.bucket && s.region);
}

export function renderStatusRow(containerEl: HTMLElement, plugin: R2UploaderPlugin): void {
	const wrap = containerEl.createDiv({ cls: "r2-status-row" });
	const s = plugin.settings;
	const destination = getStorageDestination(s);
	const configured = isConfigured(plugin);

	const headline = wrap.createDiv({ cls: "r2-status-headline" });
	headline.createSpan({
		cls: configured ? "r2-status-badge r2-status-ok" : "r2-status-badge r2-status-warn",
		text: configured ? "✓ Ready" : "⚠ Not configured",
	});

	const detail = wrap.createDiv({ cls: "r2-status-detail" });
	if (destination === "local") {
		detail.createSpan({ text: `Local vault folder · ${s.localUploadFolder || "(not set)"}` });
	} else {
		detail.createSpan({ text: `${providerLabel(getStorageProvider(s))} · ${s.bucket || "(no bucket)"}` });
		if (s.imageUrlPath) {
			const urlLine = wrap.createDiv({ cls: "r2-status-url" });
			urlLine.setText(s.imageUrlPath);
		}
	}
}
