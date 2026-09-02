import { describe, it, expect } from "vitest";
import {
	migrateSettings,
	applyProviderDefaults,
	isAutoUploadOnCreateEnabled,
	setAutoUploadOnCreateEnabled,
	getStorageDestination,
	getStorageProvider,
	getPublicUrlMode,
} from "../src/settings/migrate";
import { DEFAULT_SETTINGS } from "../src/settings/defaults";
import type { R2UploaderSettings } from "../src/settings/types";

describe("migrateSettings — backward compatibility", () => {
	it("derives storageDestination=local from legacy localUpload=true", () => {
		const legacy = { localUpload: true, localUploadFolder: "attachments" };
		const migrated = migrateSettings(legacy);
		expect(migrated.storageDestination).toBe("local");
	});

	it("derives storageDestination=s3 when localUpload is absent (pre-existing S3 install)", () => {
		const legacy = { accessKey: "AKIA...", secretKey: "shh", bucket: "my-bucket", region: "us-east-1" };
		const migrated = migrateSettings(legacy);
		expect(migrated.storageDestination).toBe("s3");
		// existing credentials must survive untouched
		expect(migrated.accessKey).toBe("AKIA...");
		expect(migrated.secretKey).toBe("shh");
		expect(migrated.bucket).toBe("my-bucket");
	});

	it("derives storageProvider=cloudflare-r2 from an existing r2 custom endpoint", () => {
		const legacy = { useCustomEndpoint: true, customEndpoint: "https://abc123.r2.cloudflarestorage.com/" };
		const migrated = migrateSettings(legacy);
		expect(migrated.storageProvider).toBe("cloudflare-r2");
	});

	it("derives storageProvider=aws-s3 when no custom endpoint was ever configured", () => {
		const migrated = migrateSettings({ useCustomEndpoint: false, region: "us-east-1" });
		expect(migrated.storageProvider).toBe("aws-s3");
	});

	it("derives storageProvider=other for an unrecognized custom endpoint (e.g. MinIO/self-hosted)", () => {
		const migrated = migrateSettings({ useCustomEndpoint: true, customEndpoint: "https://minio.internal.example/" });
		expect(migrated.storageProvider).toBe("other");
	});

	it("derives publicUrlMode=custom from legacy useCustomImageUrl=true and preserves the URL", () => {
		const migrated = migrateSettings({ useCustomImageUrl: true, customImageUrl: "https://cdn.example.com/" });
		expect(migrated.publicUrlMode).toBe("custom");
		expect(migrated.customImageUrl).toBe("https://cdn.example.com/");
	});

	it("never overwrites an explicitly persisted new field, even if it looks inconsistent with legacy fields", () => {
		const migrated = migrateSettings({ localUpload: true, storageDestination: "s3" });
		expect(migrated.storageDestination).toBe("s3");
	});

	it("fills in every default field for a totally empty/null persisted object (fresh install)", () => {
		const migrated = migrateSettings(null);
		expect(migrated.storageDestination).toBe("s3");
		expect(migrated.storageProvider).toBe("aws-s3");
		expect(migrated.webpQuality).toBe(DEFAULT_SETTINGS.webpQuality);
	});

	it("is idempotent — migrating an already-migrated object is a no-op", () => {
		const once = migrateSettings({ localUpload: true });
		const twice = migrateSettings(once);
		expect(twice).toEqual(once);
	});
});

describe("accessors — safe even before migration has run", () => {
	it("getStorageDestination falls back to legacy localUpload when storageDestination is absent", () => {
		const s = { ...DEFAULT_SETTINGS, storageDestination: undefined, localUpload: true } as R2UploaderSettings;
		expect(getStorageDestination(s)).toBe("local");
	});

	it("getStorageProvider falls back to legacy endpoint fields when storageProvider is absent", () => {
		const s = {
			...DEFAULT_SETTINGS,
			storageProvider: undefined,
			useCustomEndpoint: true,
			customEndpoint: "https://x.r2.cloudflarestorage.com/",
		} as R2UploaderSettings;
		expect(getStorageProvider(s)).toBe("cloudflare-r2");
	});

	it("getPublicUrlMode falls back to legacy useCustomImageUrl when publicUrlMode is absent", () => {
		const s = { ...DEFAULT_SETTINGS, publicUrlMode: undefined, useCustomImageUrl: true } as R2UploaderSettings;
		expect(getPublicUrlMode(s)).toBe("custom");
	});
});

describe("applyProviderDefaults — provider selection never destroys manual config", () => {
	it("prefills region and enables custom endpoint for a completely blank Cloudflare R2 setup", () => {
		const s = { ...DEFAULT_SETTINGS };
		const patch = applyProviderDefaults(s, "cloudflare-r2");
		expect(patch.region).toBe("auto");
		expect(patch.useCustomEndpoint).toBe(true);
	});

	it("does not overwrite a manually configured region when switching provider", () => {
		const s = { ...DEFAULT_SETTINGS, region: "eu-west-2" };
		const patch = applyProviderDefaults(s, "cloudflare-r2");
		expect(patch.region).toBeUndefined();
	});

	it("does not overwrite a manually configured custom endpoint when switching provider", () => {
		const s = { ...DEFAULT_SETTINGS, customEndpoint: "https://my-existing-endpoint.example/" };
		const patch = applyProviderDefaults(s, "minio");
		expect(patch.useCustomEndpoint).toBeUndefined();
	});

	it("never auto-disables a manually toggled-on useCustomEndpoint, even with no URL typed yet", () => {
		// User flipped "Custom endpoint" on in Advanced but hasn't typed a URL,
		// then switches to a provider that doesn't require a custom endpoint.
		const s = { ...DEFAULT_SETTINGS, useCustomEndpoint: true, customEndpoint: "" };
		const patch = applyProviderDefaults(s, "aws-s3");
		expect(patch.useCustomEndpoint).toBeUndefined();
	});

	it("still turns useCustomEndpoint on for a provider that requires it when nothing has been set yet", () => {
		const s = { ...DEFAULT_SETTINGS, useCustomEndpoint: false, customEndpoint: "" };
		const patch = applyProviderDefaults(s, "cloudflare-r2");
		expect(patch.useCustomEndpoint).toBe(true);
	});

	it("does not touch forcePathStyle if the user already turned it on", () => {
		const s = { ...DEFAULT_SETTINGS, forcePathStyle: true };
		const patch = applyProviderDefaults(s, "aws-s3");
		expect(patch.forcePathStyle).toBeUndefined();
	});

	it("leaves bucket/credentials untouched (applyProviderDefaults never mentions them)", () => {
		const s = { ...DEFAULT_SETTINGS, bucket: "keep-me", accessKey: "keep-key" };
		const patch = applyProviderDefaults(s, "backblaze-b2");
		expect(patch).not.toHaveProperty("bucket");
		expect(patch).not.toHaveProperty("accessKey");
	});
});

describe("positive UI mapping for the legacy negative-boolean field", () => {
	it("isAutoUploadOnCreateEnabled inverts disableAutoUploadOnCreate", () => {
		expect(isAutoUploadOnCreateEnabled({ ...DEFAULT_SETTINGS, disableAutoUploadOnCreate: false })).toBe(true);
		expect(isAutoUploadOnCreateEnabled({ ...DEFAULT_SETTINGS, disableAutoUploadOnCreate: true })).toBe(false);
	});

	it("setAutoUploadOnCreateEnabled round-trips through the legacy field", () => {
		const s = { ...DEFAULT_SETTINGS, disableAutoUploadOnCreate: false };
		setAutoUploadOnCreateEnabled(s, false);
		expect(s.disableAutoUploadOnCreate).toBe(true);
		setAutoUploadOnCreateEnabled(s, true);
		expect(s.disableAutoUploadOnCreate).toBe(false);
	});
});
