import { describe, it, expect } from "vitest";
import { validateStorageConfiguration } from "../src/settings/validation";
import { isConfigurationComplete } from "../src/settings/components/StatusRow";
import { applyProviderDefaults, getProviderPreset, migrateSettings } from "../src/settings/migrate";
import { DEFAULT_SETTINGS } from "../src/settings/defaults";
import type { R2UploaderSettings } from "../src/settings/types";
import type R2UploaderPlugin from "../src/main";

function settingsWith(patch: Partial<R2UploaderSettings>): R2UploaderSettings {
	return { ...DEFAULT_SETTINGS, ...patch };
}

describe("validateStorageConfiguration — provider-aware required fields", () => {
	it("Cloudflare R2 requires an endpoint URL", () => {
		const s = settingsWith({
			storageProvider: "cloudflare-r2",
			region: "auto",
			bucket: "bucket",
			accessKey: "a",
			secretKey: "b",
			customEndpoint: "",
		});
		const result = validateStorageConfiguration(s);
		expect(result.valid).toBe(false);
		expect(result.missingFields.map((f) => f.key)).toContain("customEndpoint");
		expect(result.message).toContain("Endpoint URL");
		expect(result.message).toContain("Cloudflare R2");
	});

	it("Cloudflare R2 region resolves to 'auto' via the provider preset — the field is provider-derived, not user-editable", () => {
		expect(getProviderPreset("cloudflare-r2").region).toBe("auto");
		const patch = applyProviderDefaults(DEFAULT_SETTINGS, "cloudflare-r2");
		expect(patch.region).toBe("auto");
	});

	it("Cloudflare R2 is valid once bucket/endpoint/region/credentials are all present — no useCustomEndpoint=false state is ever required", () => {
		const s = settingsWith({
			storageProvider: "cloudflare-r2",
			region: "auto",
			bucket: "bucket",
			accessKey: "a",
			secretKey: "b",
			customEndpoint: "https://abc123.r2.cloudflarestorage.com/",
			useCustomEndpoint: false, // deliberately left off — must not matter anymore
		});
		expect(validateStorageConfiguration(s)).toEqual({ valid: true, missingFields: [] });
	});

	it("AWS S3 does not require a custom endpoint", () => {
		const s = settingsWith({
			storageProvider: "aws-s3",
			region: "us-east-1",
			bucket: "bucket",
			accessKey: "a",
			secretKey: "b",
			customEndpoint: "",
		});
		expect(validateStorageConfiguration(s)).toEqual({ valid: true, missingFields: [] });
	});

	it("MinIO requires an endpoint URL", () => {
		const s = settingsWith({
			storageProvider: "minio",
			region: "us-east-1",
			bucket: "bucket",
			accessKey: "a",
			secretKey: "b",
			customEndpoint: "",
		});
		const result = validateStorageConfiguration(s);
		expect(result.valid).toBe(false);
		expect(result.missingFields.map((f) => f.key)).toContain("customEndpoint");
	});

	it("returns every missing field, not just the first one", () => {
		const s = settingsWith({ storageProvider: "cloudflare-r2" });
		const result = validateStorageConfiguration(s);
		expect(result.valid).toBe(false);
		const keys = result.missingFields.map((f) => f.key);
		expect(keys).toEqual(expect.arrayContaining(["bucket", "customEndpoint", "accessKey", "secretKey"]));
	});

	it("an existing migrated R2 configuration (pre-dating this UI change) still validates as complete, credentials and endpoint intact", () => {
		const legacyPersisted = {
			storageProvider: "cloudflare-r2",
			useCustomEndpoint: true,
			customEndpoint: "https://abc123.r2.cloudflarestorage.com/",
			region: "auto",
			bucket: "my-bucket",
			accessKey: "AKIA...",
			secretKey: "shh",
		};
		const migrated = migrateSettings(legacyPersisted);
		expect(migrated.customEndpoint).toBe("https://abc123.r2.cloudflarestorage.com/");
		expect(migrated.bucket).toBe("my-bucket");
		expect(migrated.accessKey).toBe("AKIA...");
		expect(validateStorageConfiguration(migrated)).toEqual({ valid: true, missingFields: [] });
	});

	it("local destination only requires a folder", () => {
		expect(validateStorageConfiguration(settingsWith({ storageDestination: "local", localUploadFolder: "" })).valid).toBe(false);
		expect(validateStorageConfiguration(settingsWith({ storageDestination: "local", localUploadFolder: "attachments" })).valid).toBe(true);
	});
});

describe("status/config validation reuses the same rules as connection-test validation", () => {
	function pluginWith(settings: Partial<R2UploaderSettings>): R2UploaderPlugin {
		return { settings: settingsWith(settings) } as unknown as R2UploaderPlugin;
	}

	it("isConfigurationComplete agrees with validateStorageConfiguration for the storage-field checks", () => {
		const incomplete = settingsWith({ storageProvider: "cloudflare-r2", region: "auto", bucket: "bucket", accessKey: "a", secretKey: "b" });
		expect(validateStorageConfiguration(incomplete).valid).toBe(false);
		expect(isConfigurationComplete(pluginWith(incomplete))).toBe(false);

		const complete = settingsWith({
			storageProvider: "aws-s3",
			region: "us-east-1",
			bucket: "bucket",
			accessKey: "a",
			secretKey: "b",
		});
		expect(validateStorageConfiguration(complete).valid).toBe(true);
		expect(isConfigurationComplete(pluginWith(complete))).toBe(true);
	});
});
