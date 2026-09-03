import { describe, it, expect } from "vitest";
import { computeOutcomePreview } from "../src/settings/components/OutcomePreview";
import { buildObjectKey, resolvePublicUrl } from "../src/uploader";
import { DEFAULT_SETTINGS } from "../src/settings/defaults";
import type { R2UploaderSettings } from "../src/settings/types";

const base: R2UploaderSettings = { ...DEFAULT_SETTINGS };

describe("computeOutcomePreview — same source of truth as the real upload path", () => {
	it("S3 destination: object key and URL match buildObjectKey/resolvePublicUrl directly", () => {
		const now = new Date("2026-09-02T11:30:15");
		const s: R2UploaderSettings = {
			...base,
			storageDestination: "s3",
			bucket: "blog-assets",
			folder: "blog/${basename}",
			useCustomImageUrl: true,
			customImageUrl: "https://assets.example.com/",
			convertToWebP: true,
			uploadSeq: 42,
		};

		const preview = computeOutcomePreview(s, { basename: "my-note", now });
		const expectedKey = buildObjectKey(s.folder, "my-note", 42, "webp", now);
		const expectedUrl = resolvePublicUrl(s, expectedKey);

		expect(preview.objectKey).toBe(expectedKey);
		expect(preview.url).toBe(expectedUrl);
		expect(preview.markdown).toBe(`![image](${expectedUrl})`);
	});

	it("uses .png extension when WebP conversion is disabled", () => {
		const s: R2UploaderSettings = { ...base, convertToWebP: false };
		const preview = computeOutcomePreview(s, { now: new Date("2026-01-01T00:00:00") });
		expect(preview.objectKey.endsWith(".png")).toBe(true);
	});

	it("R2 destination without a custom public URL: preview never leaks the S3 API endpoint into the inserted link", () => {
		const s: R2UploaderSettings = {
			...base,
			storageProvider: "cloudflare-r2",
			bucket: "blog-assets",
			useCustomEndpoint: true,
			customEndpoint: "https://abc123.r2.cloudflarestorage.com/",
		};
		const preview = computeOutcomePreview(s, { basename: "my-note", now: new Date("2026-09-02T11:30:15") });
		expect(preview.url).not.toContain("r2.cloudflarestorage.com");
		expect(preview.url).toBe(resolvePublicUrl(s, preview.objectKey));
	});

	it("local destination: previews a vault-relative path, not a public URL", () => {
		const s: R2UploaderSettings = {
			...base,
			storageDestination: "local",
			localUploadFolder: "attachments/uploads",
			convertToWebP: true,
			uploadSeq: 3,
		};
		const now = new Date("2026-09-02T11:30:15");
		const preview = computeOutcomePreview(s, { basename: "my-note", now });
		const expectedKey = buildObjectKey(s.localUploadFolder, "my-note", 3, "webp", now);

		expect(preview.objectKey).toBe(expectedKey);
		expect(preview.url).toBe(expectedKey);
		expect(preview.markdown).toBe(`![image](${expectedKey})`);
	});
});
