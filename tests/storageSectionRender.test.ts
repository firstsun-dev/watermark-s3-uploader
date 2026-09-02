import { describe, it, expect } from "vitest";
import { renderStorageSection } from "../src/settings/sections/StorageSection";
import { applyProviderDefaults } from "../src/settings/migrate";
import { DEFAULT_SETTINGS } from "../src/settings/defaults";
import type { R2UploaderSettings, StorageProvider } from "../src/settings/types";
import type R2UploaderPlugin from "../src/main";
import { FakeEl } from "./__mocks__/dom-shim";

function pluginForProvider(provider: StorageProvider, extra: Partial<R2UploaderSettings> = {}): R2UploaderPlugin {
	const patch = applyProviderDefaults(DEFAULT_SETTINGS, provider);
	const settings = { ...DEFAULT_SETTINGS, ...patch, ...extra } as R2UploaderSettings;
	return {
		settings,
		s3: undefined,
		lastConnectionResult: null,
		createS3Client: () => {},
		saveSettings: async () => {},
		app: {},
	} as unknown as R2UploaderPlugin;
}

/** Every `.text` in the render tree, in document order — enough to assert
 *  a field's name/desc appears (or doesn't) without depending on Setting
 *  internals beyond what the obsidian mock records. */
function allText(el: FakeEl): string[] {
	const out: string[] = [];
	if (el.text) out.push(el.text);
	el.children.forEach((c) => out.push(...allText(c)));
	return out;
}

/** Renders the Storage section for `provider` into a fresh FakeEl container. */
function render(provider: StorageProvider, extra: Partial<R2UploaderSettings> = {}): FakeEl {
	const container = new FakeEl("div");
	const plugin = pluginForProvider(provider, extra);
	renderStorageSection(container as unknown as HTMLElement, plugin, () => {});
	return container;
}

/** The "Advanced" disclosure is a distinct `<details class="r2-advanced">`
 *  subtree — fields elsewhere in the container are in the main form. */
function advancedSubtree(container: FakeEl): FakeEl | undefined {
	return container.querySelectorAll(".r2-advanced")[0];
}

describe("StorageSection — provider-aware field placement", () => {
	it("Cloudflare R2: Endpoint URL is required and lives in the main form, not under Advanced", () => {
		const container = render("cloudflare-r2");
		const advanced = advancedSubtree(container);

		const mainText = allText(container).join(" | ");
		expect(mainText).toContain("Endpoint URL *");

		if (advanced) {
			expect(allText(advanced).join(" | ")).not.toContain("Endpoint URL");
		}
	});

	it("Cloudflare R2: no 'Custom endpoint' toggle is exposed anywhere", () => {
		const container = render("cloudflare-r2");
		expect(allText(container).join(" | ")).not.toContain("Custom endpoint");
	});

	it("Cloudflare R2: Region is shown as a disabled, provider-derived field, not a normal editable one", () => {
		const container = render("cloudflare-r2");
		const regionRow = container
			.querySelectorAll(".setting-item")
			.find((row) => allText(row).some((t) => t === "Region"));
		expect(regionRow).toBeDefined();
		const input = regionRow!.querySelectorAll("input")[0];
		expect(input?.disabled).toBe(true);
		expect(input?.value).toBe("auto");
	});

	it("Cloudflare R2: Force path-style URLs stays under Advanced (optional compatibility override)", () => {
		const container = render("cloudflare-r2");
		const advanced = advancedSubtree(container);
		expect(advanced).toBeDefined();
		expect(allText(advanced!).join(" | ")).toContain("Force path-style URLs");
	});

	it("AWS S3: Bucket, Region, and credentials are required in the main form; no Endpoint URL field appears there", () => {
		const container = render("aws-s3");
		const mainText = allText(container).join(" | ");
		expect(mainText).toContain("Bucket *");
		expect(mainText).toContain("Region *");
		expect(mainText).toContain("Access key ID *");
		expect(mainText).toContain("Secret access key *");
		expect(mainText).not.toContain("Endpoint URL *");
	});

	it("AWS S3: the 'Custom endpoint' toggle is available under Advanced, since it's genuinely optional for AWS", () => {
		const container = render("aws-s3");
		const advanced = advancedSubtree(container);
		expect(advanced).toBeDefined();
		expect(allText(advanced!).join(" | ")).toContain("Custom endpoint");
	});

	it("MinIO: Endpoint URL is required in the main form, not under Advanced", () => {
		const container = render("minio");
		const advanced = advancedSubtree(container);
		const mainText = allText(container).join(" | ");
		expect(mainText).toContain("Endpoint URL *");
		if (advanced) {
			expect(allText(advanced).join(" | ")).not.toContain("Endpoint URL");
		}
	});

	it("MinIO: no 'Custom endpoint' toggle is exposed — the provider always requires an endpoint", () => {
		const container = render("minio");
		expect(allText(container).join(" | ")).not.toContain("Custom endpoint");
	});

	it("MinIO: Region remains an editable field, unlike R2's fixed 'auto'", () => {
		const container = render("minio");
		const regionRow = container
			.querySelectorAll(".setting-item")
			.find((row) => allText(row).some((t) => t.startsWith("Region")));
		expect(regionRow).toBeDefined();
		const input = regionRow!.querySelectorAll("input")[0];
		expect(input?.disabled).toBe(false);
	});
});
