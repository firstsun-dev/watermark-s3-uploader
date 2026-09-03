import { describe, it, expect, vi } from "vitest";
import { detectFileType, pasteHandler } from "../src/pasteHandler";
import { DEFAULT_SETTINGS } from "../src/settings/defaults";
import type { R2UploaderSettings } from "../src/settings/types";

describe("detectFileType", () => {
	it("detects image", () => {
		const file = { type: "image/png" } as File;
		expect(detectFileType(file, { uploadVideo: true, uploadAudio: true, uploadPdf: true })).toBe("image");
	});

	it("detects video", () => {
		const file = { type: "video/mp4" } as File;
		expect(detectFileType(file, { uploadVideo: true, uploadAudio: true, uploadPdf: true })).toBe("video");
	});

	it("detects audio", () => {
		const file = { type: "audio/mpeg" } as File;
		expect(detectFileType(file, { uploadVideo: true, uploadAudio: true, uploadPdf: true })).toBe("audio");
	});

	it("detects pdf", () => {
		const file = { type: "application/pdf" } as File;
		expect(detectFileType(file, { uploadVideo: true, uploadAudio: true, uploadPdf: true })).toBe("pdf");
	});

	it("returns empty for unknown", () => {
		const file = { type: "text/plain" } as File;
		expect(detectFileType(file, { uploadVideo: true, uploadAudio: true, uploadPdf: true })).toBe("");
	});
});

describe("pasteHandler ignore behavior", () => {
	const settings: R2UploaderSettings = { ...DEFAULT_SETTINGS, ignorePattern: "Private/**" };

	function makeDeps(overrides: { notePath: string; sourceFilePath?: string }) {
		const saveSettings = vi.fn().mockResolvedValue(undefined);
		const transaction = vi.fn();
		const editor = { getCursor: () => ({ line: 0, ch: 0 }), transaction } as unknown as Parameters<typeof pasteHandler>[1];
		const readBinary = vi.fn().mockResolvedValue(new ArrayBuffer(0));
		const writeBinary = vi.fn().mockResolvedValue(undefined);
		const getActiveFile = () => ({ name: "foo.md", basename: "foo", path: overrides.notePath });
		const getFrontmatter = () => ({});
		const log = vi.fn();
		const directFile = { name: "image.png", type: "image/png", arrayBuffer: async () => new ArrayBuffer(0) } as unknown as File;

		return { saveSettings, transaction, editor, readBinary, writeBinary, getActiveFile, getFrontmatter, log, directFile, sourceFilePath: overrides.sourceFilePath };
	}

	it("ignored paste/drop (note path match) does not process/upload the file", async () => {
		const deps = makeDeps({ notePath: "Private/foo.md" });

		await pasteHandler(
			null,
			deps.editor,
			settings,
			undefined as never,
			deps.readBinary,
			deps.writeBinary,
			null,
			deps.getActiveFile,
			deps.getFrontmatter,
			undefined,
			deps.log,
			deps.saveSettings,
			deps.directFile,
		);

		expect(deps.saveSettings).not.toHaveBeenCalled();
		expect(deps.transaction).not.toHaveBeenCalled();
	});

	it("ignored paste/drop (source file path match) does not process/upload the file", async () => {
		const deps = makeDeps({ notePath: "Notes/foo.md", sourceFilePath: "Private/image.png" });

		await pasteHandler(
			null,
			deps.editor,
			settings,
			undefined as never,
			deps.readBinary,
			deps.writeBinary,
			null,
			deps.getActiveFile,
			deps.getFrontmatter,
			deps.sourceFilePath,
			deps.log,
			deps.saveSettings,
			deps.directFile,
		);

		expect(deps.saveSettings).not.toHaveBeenCalled();
		expect(deps.transaction).not.toHaveBeenCalled();
	});

	it("non-ignored paste/drop proceeds to upload", async () => {
		const deps = makeDeps({ notePath: "Notes/foo.md" });

		await pasteHandler(
			null,
			deps.editor,
			settings,
			undefined as never,
			deps.readBinary,
			deps.writeBinary,
			null,
			deps.getActiveFile,
			deps.getFrontmatter,
			undefined,
			deps.log,
			deps.saveSettings,
			deps.directFile,
		);

		expect(deps.saveSettings).toHaveBeenCalled();
	});
});
