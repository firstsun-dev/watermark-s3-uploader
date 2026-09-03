import { describe, it, expect, vi } from "vitest";
import R2UploaderPlugin from "../src/main";
import { DEFAULT_SETTINGS } from "../src/settings/defaults";
import type { R2UploaderSettings } from "../src/settings/types";
import type { TFile } from "obsidian";

// handleFileCreate is a private method invoked from vault "create" events.
// We exercise it directly via prototype.call against a minimal fake plugin
// instance, since constructing a full Obsidian Plugin/App is out of scope
// for these unit tests.
function makeFakePlugin(opts: {
	settings: R2UploaderSettings;
	activeNotePath: string | undefined;
}) {
	const trashFile = vi.fn().mockResolvedValue(undefined);
	const readBinary = vi.fn().mockResolvedValue(new ArrayBuffer(0));
	const runPasteHandler = vi.fn().mockResolvedValue(undefined);
	const editor = {
		getValue: () => "",
		offsetToPos: () => ({ line: 0, ch: 0 }),
		replaceRange: vi.fn(),
	};
	const activeView = opts.activeNotePath === undefined
		? null
		: { file: { path: opts.activeNotePath }, editor };

	const fakePlugin = {
		settings: opts.settings,
		app: {
			workspace: { getActiveViewOfType: () => activeView },
			vault: {
				readBinary,
				getConfig: () => false,
			},
			fileManager: { trashFile },
		},
		runPasteHandler,
		log: vi.fn(),
	};

	return { fakePlugin, trashFile, readBinary, runPasteHandler };
}

async function callHandleFileCreate(fakePlugin: unknown, file: TFile) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (R2UploaderPlugin.prototype as any).handleFileCreate.call(fakePlugin, file);
}

describe("auto-upload-on-create ignore behavior", () => {
	it("skips auto-upload when the created attachment path matches the ignore pattern", async () => {
		const settings: R2UploaderSettings = { ...DEFAULT_SETTINGS, ignorePattern: "Private/**" };
		const { fakePlugin, trashFile, readBinary, runPasteHandler } = makeFakePlugin({
			settings,
			activeNotePath: "Notes/foo.md",
		});
		const file = { path: "Private/image.png", name: "image.png", extension: "png" } as unknown as TFile;

		await callHandleFileCreate(fakePlugin, file);

		expect(readBinary).not.toHaveBeenCalled();
		expect(runPasteHandler).not.toHaveBeenCalled();
		expect(trashFile).not.toHaveBeenCalled();
	});

	// Regression test for the exact reported failure: ignore behavior must not
	// depend on which note happens to be active.
	it("regression: active note Notes/foo.md must not shield a created Private/image.png from Private/** ignore", async () => {
		const settings: R2UploaderSettings = { ...DEFAULT_SETTINGS, ignorePattern: "Private/**" };
		const { fakePlugin, trashFile, readBinary, runPasteHandler } = makeFakePlugin({
			settings,
			activeNotePath: "Notes/foo.md",
		});
		const file = { path: "Private/image.png", name: "image.png", extension: "png" } as unknown as TFile;

		await callHandleFileCreate(fakePlugin, file);

		expect(readBinary).not.toHaveBeenCalled();
		expect(runPasteHandler).not.toHaveBeenCalled();
		expect(trashFile).not.toHaveBeenCalled();
	});

	it("skips auto-upload when the active note path matches the ignore pattern", async () => {
		const settings: R2UploaderSettings = { ...DEFAULT_SETTINGS, ignorePattern: "Private/**" };
		const { fakePlugin, trashFile, readBinary, runPasteHandler } = makeFakePlugin({
			settings,
			activeNotePath: "Private/foo.md",
		});
		const file = { path: "Attachments/image.png", name: "image.png", extension: "png" } as unknown as TFile;

		await callHandleFileCreate(fakePlugin, file);

		expect(readBinary).not.toHaveBeenCalled();
		expect(runPasteHandler).not.toHaveBeenCalled();
		expect(trashFile).not.toHaveBeenCalled();
	});

	it("proceeds with auto-upload when neither path matches", async () => {
		vi.stubGlobal("activeWindow", { setTimeout: (fn: () => void) => fn() });
		try {
			const settings: R2UploaderSettings = { ...DEFAULT_SETTINGS, ignorePattern: "Private/**" };
			const { fakePlugin, readBinary, runPasteHandler } = makeFakePlugin({
				settings,
				activeNotePath: "Notes/foo.md",
			});
			const file = { path: "Attachments/image.png", name: "image.png", extension: "png" } as unknown as TFile;

			await callHandleFileCreate(fakePlugin, file);

			expect(readBinary).toHaveBeenCalledWith(file);
			expect(runPasteHandler).toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
