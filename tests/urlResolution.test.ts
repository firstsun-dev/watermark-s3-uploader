import { describe, it, expect } from "vitest";
import {
	resolvePublicBaseUrl,
	appendQueryString,
	resolvePublicUrl,
	buildObjectKey,
	resolveFolder,
} from "../src/uploader";
import { DEFAULT_SETTINGS } from "../src/settings/defaults";
import type { R2UploaderSettings } from "../src/settings/types";

const base: R2UploaderSettings = { ...DEFAULT_SETTINGS };

describe("resolvePublicBaseUrl", () => {
	it("AWS-style default (no custom endpoint, virtual-hosted style)", () => {
		const s: R2UploaderSettings = { ...base, bucket: "my-bucket", region: "us-east-1" };
		expect(resolvePublicBaseUrl(s)).toBe("https://my-bucket.s3.us-east-1.amazonaws.com/");
	});

	it("custom/Cloudflare endpoint, virtual-hosted style", () => {
		const s: R2UploaderSettings = {
			...base,
			bucket: "blog-assets",
			useCustomEndpoint: true,
			customEndpoint: "https://abc123.r2.cloudflarestorage.com/",
		};
		expect(resolvePublicBaseUrl(s)).toBe("https://blog-assets.abc123.r2.cloudflarestorage.com/");
	});

	it("custom endpoint with forcePathStyle", () => {
		const s: R2UploaderSettings = {
			...base,
			bucket: "blog-assets",
			useCustomEndpoint: true,
			customEndpoint: "https://minio.internal/",
			forcePathStyle: true,
		};
		expect(resolvePublicBaseUrl(s)).toBe("https://minio.internal/blog-assets/");
	});

	it("custom CDN/public URL overrides everything else", () => {
		const s: R2UploaderSettings = {
			...base,
			bucket: "blog-assets",
			useCustomEndpoint: true,
			customEndpoint: "https://abc123.r2.cloudflarestorage.com/",
			useCustomImageUrl: true,
			customImageUrl: "https://assets.example.com/",
		};
		expect(resolvePublicBaseUrl(s)).toBe("https://assets.example.com/");
	});
});

describe("appendQueryString", () => {
	it("appends key=value when both are set", () => {
		expect(appendQueryString("https://assets.example.com/a.webp", "v", "1"))
			.toBe("https://assets.example.com/a.webp?v=1");
	});

	it("leaves the URL untouched when key or value is missing", () => {
		expect(appendQueryString("https://assets.example.com/a.webp", "", "1")).toBe("https://assets.example.com/a.webp");
		expect(appendQueryString("https://assets.example.com/a.webp", "v", "")).toBe("https://assets.example.com/a.webp");
	});
});

describe("resolvePublicUrl", () => {
	it("combines base URL, key, and query string", () => {
		const s: R2UploaderSettings = {
			...base,
			bucket: "blog-assets",
			useCustomImageUrl: true,
			customImageUrl: "https://assets.example.com/",
			queryStringKey: "v",
			queryStringValue: "1",
		};
		expect(resolvePublicUrl(s, "blog/my-note/0042_20260902113015.webp"))
			.toBe("https://assets.example.com/blog/my-note/0042_20260902113015.webp?v=1");
	});
});

describe("buildObjectKey", () => {
	it("combines resolved folder and generated filename", () => {
		const now = new Date("2026-09-02T11:30:15");
		const key = buildObjectKey("blog/${basename}", "my-note", 42, "webp", now);
		expect(key).toBe(`${resolveFolder("blog/${basename}", "my-note", now)}/0042_20260902113015.webp`);
		expect(key).toBe("blog/my-note/0042_20260902113015.webp");
	});

	it("omits the folder segment when folder resolves empty", () => {
		const now = new Date("2026-09-02T11:30:15");
		const key = buildObjectKey("", "my-note", 0, "png", now);
		expect(key).toBe("0000_20260902113015.png");
	});
});
