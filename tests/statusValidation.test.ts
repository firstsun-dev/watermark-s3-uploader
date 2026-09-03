import { describe, it, expect } from "vitest";
import { isConfigurationComplete } from "../src/settings/components/StatusRow";
import { DEFAULT_SETTINGS } from "../src/settings/defaults";
import type { R2UploaderSettings } from "../src/settings/types";
import type R2UploaderPlugin from "../src/main";

function pluginWith(settings: Partial<R2UploaderSettings>): R2UploaderPlugin {
	return { settings: { ...DEFAULT_SETTINGS, ...settings } } as unknown as R2UploaderPlugin;
}

describe("isConfigurationComplete — provider-aware validation", () => {
	it("is not complete just because accessKey/secretKey/bucket/region are populated for a provider that needs more", () => {
		const plugin = pluginWith({
			storageProvider: "cloudflare-r2",
			accessKey: "a",
			secretKey: "b",
			bucket: "bucket",
			region: "auto",
		});
		expect(isConfigurationComplete(plugin)).toBe(false);
	});

	it("AWS S3 is complete with just credentials/bucket/region — automatic public URL is supported", () => {
		const plugin = pluginWith({
			storageProvider: "aws-s3",
			accessKey: "a",
			secretKey: "b",
			bucket: "bucket",
			region: "us-east-1",
		});
		expect(isConfigurationComplete(plugin)).toBe(true);
	});

	it("Cloudflare R2 is not complete until a custom endpoint AND a custom public URL are both set", () => {
		const withEndpointOnly = pluginWith({
			storageProvider: "cloudflare-r2",
			accessKey: "a",
			secretKey: "b",
			bucket: "bucket",
			region: "auto",
			useCustomEndpoint: true,
			customEndpoint: "https://abc123.r2.cloudflarestorage.com/",
		});
		expect(isConfigurationComplete(withEndpointOnly)).toBe(false);

		const complete = pluginWith({
			storageProvider: "cloudflare-r2",
			accessKey: "a",
			secretKey: "b",
			bucket: "bucket",
			region: "auto",
			useCustomEndpoint: true,
			customEndpoint: "https://abc123.r2.cloudflarestorage.com/",
			publicUrlMode: "custom",
			useCustomImageUrl: true,
			customImageUrl: "https://assets.example.com/",
		});
		expect(isConfigurationComplete(complete)).toBe(true);
	});

	it("local destination only needs a folder configured", () => {
		const plugin = pluginWith({ storageDestination: "local", localUploadFolder: "attachments/uploads" });
		expect(isConfigurationComplete(plugin)).toBe(true);

		const incomplete = pluginWith({ storageDestination: "local", localUploadFolder: "" });
		expect(isConfigurationComplete(incomplete)).toBe(false);
	});
});
