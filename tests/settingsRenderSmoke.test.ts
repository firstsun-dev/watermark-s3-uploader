import { describe, it, expect } from "vitest";
import { R2UploaderSettingTab } from "../src/settings/SettingsTab";
import { migrateSettings } from "../src/settings/migrate";
import type R2UploaderPlugin from "../src/main";
import { FakeEl } from "./__mocks__/dom-shim";

/**
 * Regression coverage for: a malformed/legacy persisted `storageProvider`
 * (etc.) used to make `renderStatusRow` throw, and because `display()` ran
 * status *before* nav/content, the whole settings page rendered as nothing
 * but the "Paste to S3" heading. This asserts the full render pipeline —
 * migration -> SettingsTab.display() -> every tab — never throws, and that
 * the Storage page (the default tab) actually produces content even when
 * the status row's own inputs are broken.
 */
function fakePlugin(rawPersisted: unknown): R2UploaderPlugin {
	const settings = migrateSettings(rawPersisted);
	return {
		settings,
		s3: undefined,
		lastConnectionResult: null,
		saveSettings: async () => {},
		app: {},
	} as unknown as R2UploaderPlugin;
}

function render(plugin: R2UploaderPlugin): FakeEl {
	const tab = new R2UploaderSettingTab({} as any, plugin);
	tab.display();
	return (tab as unknown as { containerEl: FakeEl }).containerEl;
}

describe("settings render smoke test", () => {
	it("renders storage/links/upload/image/watermark/advanced without throwing for a fresh install", () => {
		const plugin = fakePlugin(null);
		expect(() => render(plugin)).not.toThrow();
	});

	it("renders without throwing given legacy persisted data with an invalid/unknown storageProvider", () => {
		const legacy = {
			storageProvider: "r2", // legacy/invalid — not a current StorageProvider value
			accessKey: "AKIA...",
			secretKey: "shh",
			bucket: "my-bucket",
			useCustomEndpoint: true,
			customEndpoint: "https://abc123.r2.cloudflarestorage.com/",
		};
		expect(() => render(fakePlugin(legacy))).not.toThrow();
	});

	it("the Storage page (default tab) still renders real content when the status row's own data is broken", () => {
		const legacy = { storageProvider: "totally-bogus-value" };
		const containerEl = render(fakePlugin(legacy));

		// The layout (nav + content) must exist as siblings of the status row,
		// not be blocked by it.
		const layout = containerEl.children.find((c) => c.cls.has("r2-layout"));
		expect(layout).toBeDefined();
		const contentEl = layout!.children.find((c) => c.cls.has("r2-content"));
		expect(contentEl).toBeDefined();
		expect(contentEl!.children.length).toBeGreaterThan(0);
	});
});
