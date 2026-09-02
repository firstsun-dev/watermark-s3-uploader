import { Notice, Setting } from "obsidian";
import type R2UploaderPlugin from "../../main";
import { createAdvancedDisclosure, createSection } from "../components/SettingSection";
import { FieldBuilder } from "../components/fields";
import { testS3Connection } from "../components/StatusRow";
import { applyProviderDefaults, getProviderPreset, getStorageDestination, getStorageProvider } from "../migrate";
import { validateStorageConfiguration } from "../validation";
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
	refreshStatus: () => void = redraw,
): void {
	const section = createSection(containerEl, "Storage", "database");
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
					refreshStatus();
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
					refreshStatus();
				});
		});

	const provider = getStorageProvider(plugin.settings);
	const preset = getProviderPreset(provider);

	fields.string(section, "Bucket *", "", "Bucket name", "bucket", { onChanged: () => { plugin.createS3Client(); refreshStatus(); } });
	fields.string(section, "Folder", "Supports ${year}, ${month}, ${day}, ${basename}", "blog/${basename}", "folder");

	// ── Connection: only the fields this provider actually needs to reach the
	//    right host — an R2/MinIO/Backblaze/other endpoint is required here,
	//    never tucked under Advanced, since the connection can't work without it. ──
	new Setting(section).setName("Connection").setHeading();

	if (preset.requiresCustomEndpoint) {
		const endpointSetting = new Setting(section)
			.setName("Endpoint URL *")
			.setDesc(`Required for ${providerHint(provider)}.`)
			.addText((text) =>
				text.setPlaceholder("HTTPS://<account-id>.r2.cloudflarestorage.com/")
					.setValue(plugin.settings.customEndpoint)
					.onChange(async (v) => {
						let normalized = v;
						if (normalized && !/^https?:\/\//.test(normalized)) normalized = "https://" + normalized;
						if (normalized) normalized = normalized.replace(/([^/])$/, "$1/");
						plugin.settings.customEndpoint = normalized.trim();
						plugin.settings.useCustomEndpoint = true;
						plugin.createS3Client();
						await plugin.saveSettings();
						refreshStatus();
					}));
		endpointSetting.settingEl.addClass("r2-full-width-row");
	}

	if (provider === "cloudflare-r2") {
		// R2 has exactly one region ("auto") — showing it as an editable field
		// would invite a value that breaks the connection for no reason.
		new Setting(section)
			.setName("Region")
			.setDesc(`Set automatically for ${providerHint(provider)}.`)
			.addText((text) => text.setValue(plugin.settings.region || "auto").setDisabled(true));
	} else {
		fields.string(section, "Region *", "", preset.region || "us-east-1", "region", { onChanged: () => { plugin.createS3Client(); refreshStatus(); } });
	}

	new Setting(section).setName("Credentials").setHeading();
	fields.string(section, "Access key ID *", "", "Access key", "accessKey", { password: true, onChanged: () => { plugin.createS3Client(); refreshStatus(); } });
	fields.string(section, "Secret access key *", "", "Secret key", "secretKey", { password: true, onChanged: () => { plugin.createS3Client(); refreshStatus(); } });

	// ── Test connection: local validation first, so a missing required field
	//    never surfaces as a raw SDK/network error ──────────────────────────
	const statusEl = section.createDiv({ cls: "r2-connection-status" });
	new Setting(section)
		.setName("Test connection")
		.setDesc("Verify bucket access using the credentials above.")
		.addButton((btn) => btn
			.setButtonText("Test connection")
			.setCta()
			.onClick(async () => {
				const validation = validateStorageConfiguration(plugin.settings);
				if (!validation.valid) {
					statusEl.setText(`✗ ${validation.message}`);
					statusEl.className = "r2-connection-status r2-error";
					new Notice(validation.message ?? "Configuration incomplete");
					return;
				}

				btn.setButtonText("Testing…").setDisabled(true);
				const result = await testS3Connection(plugin);
				plugin.lastConnectionResult = result;
				if (result.ok) {
					statusEl.setText(`✓ Connected to ${plugin.settings.bucket}`);
					statusEl.className = "r2-connection-status r2-success";
					new Notice("Connection successful!");
				} else {
					statusEl.setText(`✗ ${result.message}`);
					statusEl.className = "r2-connection-status r2-error";
					new Notice("Connection failed: " + result.message);
				}
				refreshStatus();
				activeWindow.setTimeout(() => btn.setButtonText("Test connection").setDisabled(false), TEST_RESULT_TIMEOUT);
			}));

	// ── Advanced: optional protocol overrides only — never a field the
	//    selected provider actually requires to work ────────────────────────
	const advanced = createAdvancedDisclosure(section);

	if (!preset.requiresCustomEndpoint) {
		// Only providers like AWS S3, where a custom endpoint is genuinely
		// optional, expose the toggle at all — R2/MinIO/Backblaze/other always
		// need one, so their endpoint field lives in the main form above with
		// no redundant on/off decision.
		new Setting(advanced)
			.setName("Custom endpoint")
			.setDesc("Override the provider default endpoint to point at a different S3-compatible service.")
			.addToggle((t) => t.setValue(plugin.settings.useCustomEndpoint)
				.onChange(async (v) => {
					plugin.settings.useCustomEndpoint = v;
					plugin.createS3Client();
					await plugin.saveSettings();
					refreshStatus();
					redraw();
				}));

		if (plugin.settings.useCustomEndpoint) {
			const endpointSetting = new Setting(advanced)
				.setName("Endpoint URL")
				.addText((text) =>
					text.setPlaceholder("HTTPS://s3.example.com/")
						.setValue(plugin.settings.customEndpoint)
						.onChange(async (v) => {
							let normalized = v;
							if (normalized && !/^https?:\/\//.test(normalized)) normalized = "https://" + normalized;
							if (normalized) normalized = normalized.replace(/([^/])$/, "$1/");
							plugin.settings.customEndpoint = normalized.trim();
							plugin.createS3Client();
							await plugin.saveSettings();
							refreshStatus();
						}));
			endpointSetting.settingEl.addClass("r2-full-width-row");
		}
	}

	fields.toggle(advanced, "Force path-style URLs", 'Use "endpoint/bucket/file" instead of "bucket.endpoint/file".', "forcePathStyle", () => { plugin.createS3Client(); refreshStatus(); });
}

function providerHint(provider: StorageProvider): string {
	switch (provider) {
		case "cloudflare-r2": return "Cloudflare R2";
		case "minio": return "MinIO";
		case "backblaze-b2": return "Backblaze B2";
		default: return "this S3-compatible provider";
	}
}
