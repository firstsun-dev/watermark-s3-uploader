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

describe("applyProviderDefaults — coherent runtime state, user-owned fields untouched", () => {
	it("prefills region and enables custom endpoint for a completely blank Cloudflare R2 setup", () => {
		const s = { ...DEFAULT_SETTINGS };
		const patch = applyProviderDefaults(s, "cloudflare-r2");
		expect(patch.region).toBe("auto");
		expect(patch.useCustomEndpoint).toBe(true);
	});

	it("region/endpoint semantics are provider-owned: switching overwrites a stale manual region rather than leaving it stuck on the old provider's value", () => {
		const s = { ...DEFAULT_SETTINGS, region: "eu-west-2" };
		const patch = applyProviderDefaults(s, "cloudflare-r2");
		expect(patch.region).toBe("auto");
	});

	it("clears a custom endpoint that belonged to a different provider rather than carrying a stale, incompatible host over", () => {
		const s = { ...DEFAULT_SETTINGS, useCustomEndpoint: true, customEndpoint: "https://my-existing-endpoint.example/" };
		const patch = applyProviderDefaults(s, "minio");
		expect(patch.useCustomEndpoint).toBe(true);
		expect(patch.customEndpoint).toBe("");
	});

	it("switching to a provider that doesn't require a custom endpoint forces useCustomEndpoint off, even if it was manually toggled on for a different provider", () => {
		const s = { ...DEFAULT_SETTINGS, useCustomEndpoint: true, customEndpoint: "" };
		const patch = applyProviderDefaults(s, "aws-s3");
		expect(patch.useCustomEndpoint).toBe(false);
	});

	it("still turns useCustomEndpoint on for a provider that requires it when nothing has been set yet", () => {
		const s = { ...DEFAULT_SETTINGS, useCustomEndpoint: false, customEndpoint: "" };
		const patch = applyProviderDefaults(s, "cloudflare-r2");
		expect(patch.useCustomEndpoint).toBe(true);
	});

	it("forcePathStyle is provider-owned: switching to AWS always resets it to AWS's default (false), even if it was on for a previous provider", () => {
		const s = { ...DEFAULT_SETTINGS, forcePathStyle: true };
		const patch = applyProviderDefaults(s, "aws-s3");
		expect(patch.forcePathStyle).toBe(false);
	});

	it("leaves bucket/credentials/custom public URL untouched (applyProviderDefaults never mentions them)", () => {
		const s = { ...DEFAULT_SETTINGS, bucket: "keep-me", accessKey: "keep-key", customImageUrl: "https://cdn.example.com/" };
		const patch = applyProviderDefaults(s, "backblaze-b2");
		expect(patch).not.toHaveProperty("bucket");
		expect(patch).not.toHaveProperty("accessKey");
		expect(patch).not.toHaveProperty("folder");
		expect(patch).not.toHaveProperty("secretKey");
		expect(patch).not.toHaveProperty("customImageUrl");
	});

	it("forces publicUrlMode to custom when switching to a provider that can't auto-derive a public URL", () => {
		const s = { ...DEFAULT_SETTINGS, publicUrlMode: "auto" as const, useCustomImageUrl: false };
		const patch = applyProviderDefaults(s, "cloudflare-r2");
		expect(patch.publicUrlMode).toBe("custom");
		expect(patch.useCustomImageUrl).toBe(true);
	});

	it("does not force publicUrlMode away from auto when switching to AWS S3 (which supports an automatic public URL)", () => {
		const s = { ...DEFAULT_SETTINGS, publicUrlMode: "auto" as const, useCustomImageUrl: false };
		const patch = applyProviderDefaults(s, "aws-s3");
		expect(patch.publicUrlMode).toBeUndefined();
	});

	describe("provider transitions produce a coherent effective configuration", () => {
		it("fresh → AWS: no custom endpoint, automatic public URL stays available", () => {
			const patch = applyProviderDefaults(DEFAULT_SETTINGS, "aws-s3");
			expect(patch).toMatchObject({ storageProvider: "aws-s3", region: "us-east-1", useCustomEndpoint: false, customEndpoint: "", forcePathStyle: false });
			expect(patch.publicUrlMode).toBeUndefined();
		});

		it("fresh → R2: custom endpoint required, auto public URL not available so publicUrlMode is forced to custom", () => {
			const patch = applyProviderDefaults(DEFAULT_SETTINGS, "cloudflare-r2");
			expect(patch).toMatchObject({ storageProvider: "cloudflare-r2", region: "auto", useCustomEndpoint: true, customEndpoint: "", forcePathStyle: false, publicUrlMode: "custom", useCustomImageUrl: true });
		});

		it("AWS → R2: no leftover AWS endpoint state, R2 semantics fully applied", () => {
			const aws = { ...DEFAULT_SETTINGS, ...applyProviderDefaults(DEFAULT_SETTINGS, "aws-s3") };
			const patch = applyProviderDefaults(aws, "cloudflare-r2");
			expect(patch).toMatchObject({ storageProvider: "cloudflare-r2", region: "auto", useCustomEndpoint: true, customEndpoint: "" });
		});

		it("R2 → AWS: the R2 endpoint is cleared and useCustomEndpoint is turned off — never AWS-in-the-UI while runtime still points at the R2 host", () => {
			const r2 = { ...DEFAULT_SETTINGS, ...applyProviderDefaults(DEFAULT_SETTINGS, "cloudflare-r2"), customEndpoint: "https://abc123.r2.cloudflarestorage.com/" };
			const patch = applyProviderDefaults(r2, "aws-s3");
			expect(patch.storageProvider).toBe("aws-s3");
			expect(patch.useCustomEndpoint).toBe(false);
			expect(patch.customEndpoint).toBe("");
			expect(patch.region).toBe("us-east-1");
		});

		it("R2 → MinIO: the R2-specific endpoint host is cleared (invalid for MinIO), but custom-endpoint requirement and path-style stay coherent for MinIO", () => {
			const r2 = { ...DEFAULT_SETTINGS, ...applyProviderDefaults(DEFAULT_SETTINGS, "cloudflare-r2"), customEndpoint: "https://abc123.r2.cloudflarestorage.com/" };
			const patch = applyProviderDefaults(r2, "minio");
			expect(patch.storageProvider).toBe("minio");
			expect(patch.useCustomEndpoint).toBe(true);
			expect(patch.customEndpoint).toBe("");
			expect(patch.forcePathStyle).toBe(true);
		});

		it("MinIO → AWS: custom endpoint and path-style are both turned off", () => {
			const minio = { ...DEFAULT_SETTINGS, ...applyProviderDefaults(DEFAULT_SETTINGS, "minio"), customEndpoint: "https://minio.internal.example/" };
			const patch = applyProviderDefaults(minio, "aws-s3");
			expect(patch.storageProvider).toBe("aws-s3");
			expect(patch.useCustomEndpoint).toBe(false);
			expect(patch.customEndpoint).toBe("");
			expect(patch.forcePathStyle).toBe(false);
		});
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
