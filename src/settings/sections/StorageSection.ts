import { Notice, Setting } from "obsidian";
import type R2UploaderPlugin from "../../main";
import { createAdvancedDisclosure, createSection } from "../components/SettingSection";
import { FieldBuilder } from "../components/fields";
import { testS3Connection } from "../components/StatusRow";
import { applyProviderDefaults, getStorageDestination, getStorageProvider } from "../migrate";
import type { StorageDestination, StorageProvider } from "../types";

const TEST_RESULT_TIMEOUT = 3000;

const PROVIDERS: { value: StorageProvider; label: string }[] = [
	{ value: "cloudflare-r2", label: "Cloudflare R2" },
	{ value: "aws-s3", label: "AWS S3" },
	{ value: "minio", label: "MinIO" },
	{ value: "backblaze-b2", label: "Backblaze B2" },
	{ value: "other", label: "Other S3-compatible" },
];

/**
 * Storage — "Where will my files be stored?"
 * Destination choice (S3-compatible vs local vault folder), provider preset,
 * bucket/folder/credentials, connection test, and protocol-level advanced
 * fields (endpoint/region/force-path-style).
 *
 * `redraw` fully re-renders the settings tab — used after structural changes
 * (destination/provider) so prefilled defaults become visible immediately.
 */
export function renderStorageSection(
	containerEl: HTMLElement,
	plugin: R2UploaderPlugin,
	redraw: () => void,
): void {
	const section = createSection(containerEl, "1. Storage", true, "database");
	const fields = new FieldBuilder(plugin);
	const destination = getStorageDestination(plugin.settings);

	new Setting(section)
		.setName("Storage destination")
		.setDesc("Where uploaded files are sent.")
		.addDropdown((d) =>
			d.addOption("s3", "S3-compatible storage")
				.addOption("local", "Local vault folder")
				.setValue(destination)
				.onChange(async (v: string) => {
					plugin.settings.storageDestination = v as StorageDestination;
					plugin.settings.localUpload = v === "local";
					plugin.createS3Client();
					await plugin.saveSettings();
					redraw();
				}));

	if (destination === "local") {
		fields.string(section, "Folder", "Vault-relative folder to copy uploaded files into.", "attachments/uploads", "localUploadFolder");
		return;
	}

	new Setting(section)
		.setName("Provider")
		.setDesc("Supplies sensible defaults — you can still change everything below.")
		.addDropdown((d) => {
			PROVIDERS.forEach((p) => { d.addOption(p.value, p.label); });
			d.setValue(getStorageProvider(plugin.settings))
				.onChange(async (v: string) => {
					const patch = applyProviderDefaults(plugin.settings, v as StorageProvider);
					Object.assign(plugin.settings, patch);
					plugin.createS3Client();
					await plugin.saveSettings();
					redraw();
				});
		});

	fields.string(section, "Bucket", "", "Bucket name", "bucket", { onChanged: () => plugin.createS3Client() });
	fields.string(section, "Folder", "Supports ${year}, ${month}, ${day}, ${basename}", "blog/${basename}", "folder");

	new Setting(section).setName("Credentials").setHeading();
	fields.string(section, "Access key ID", "", "Access key", "accessKey", { password: true, onChanged: () => plugin.createS3Client() });
	fields.string(section, "Secret access key", "", "Secret key", "secretKey", { password: true, onChanged: () => plugin.createS3Client() });

	// ── Test connection: after the required fields — configure → test → see result ──
	const statusEl = section.createDiv({ cls: "r2-connection-status" });
	new Setting(section)
		.setName("Test connection")
		.setDesc("Verify bucket access using the credentials above.")
		.addButton((btn) => btn
			.setButtonText("Test connection")
			.setCta()
			.onClick(async () => {
				btn.setButtonText("Testing…").setDisabled(true);
				const result = await testS3Connection(plugin);
				if (result.ok) {
					statusEl.setText(`✓ Connected to ${plugin.settings.bucket}`);
					statusEl.className = "r2-connection-status r2-success";
					new Notice("Connection successful!");
				} else {
					statusEl.setText(`✗ ${result.message}`);
					statusEl.className = "r2-connection-status r2-error";
					new Notice("Connection failed: " + result.message);
				}
				activeWindow.setTimeout(() => btn.setButtonText("Test connection").setDisabled(false), TEST_RESULT_TIMEOUT);
			}));

	// ── Advanced: protocol-level fields, hidden unless needed ────────────────
	const advanced = createAdvancedDisclosure(section);
	fields.string(advanced, "Region", '"auto" for Cloudflare R2', "auto", "region", { onChanged: () => plugin.createS3Client() });

	new Setting(advanced)
		.setName("Custom endpoint")
		.setDesc("Required for cloudflare r2 and most non-aws providers.")
		.addToggle((t) => t.setValue(plugin.settings.useCustomEndpoint)
			.onChange(async (v) => {
				plugin.settings.useCustomEndpoint = v;
				plugin.createS3Client();
				await plugin.saveSettings();
			}));

	new Setting(advanced)
		.setName("Endpoint URL")
		.addText((text) =>
			text.setPlaceholder("HTTPS://xxxx.r2.cloudflarestorage.com/")
				.setValue(plugin.settings.customEndpoint)
				.onChange(async (v) => {
					let normalized = v;
					if (normalized && !/^https?:\/\//.test(normalized)) normalized = "https://" + normalized;
					if (normalized) normalized = normalized.replace(/([^/])$/, "$1/");
					plugin.settings.customEndpoint = normalized.trim();
					plugin.createS3Client();
					await plugin.saveSettings();
				}));

	fields.toggle(advanced, "Force path-style URLs", 'Use "endpoint/bucket/file" instead of "bucket.endpoint/file".', "forcePathStyle", () => plugin.createS3Client());
}
