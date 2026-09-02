import { describe, it, expect } from "vitest";
import { matchesIgnorePattern } from "../src/ignorePattern";

describe("matchesIgnorePattern", () => {
	it("matches a note path against the pattern", () => {
		expect(matchesIgnorePattern("Private/**", { notePath: "Private/foo.md" })).toBe(true);
	});

	it("matches a nested note path against the pattern", () => {
		expect(matchesIgnorePattern("Private/**", { notePath: "Private/nested/deep/foo.md" })).toBe(true);
	});

	it("matches an attachment/file path against the pattern", () => {
		expect(matchesIgnorePattern("Private/**", { filePath: "Private/image.png" })).toBe(true);
	});

	it("matches when the active note does not match but the created attachment does", () => {
		expect(matchesIgnorePattern("Private/**", { notePath: "Notes/foo.md", filePath: "Private/image.png" })).toBe(true);
	});

	it("matches when the created attachment does not match but the active note does", () => {
		expect(matchesIgnorePattern("Private/**", { notePath: "Private/foo.md", filePath: "Attachments/image.png" })).toBe(true);
	});

	it("returns false when neither path matches", () => {
		expect(matchesIgnorePattern("Private/**", { notePath: "Notes/foo.md", filePath: "Attachments/image.png" })).toBe(false);
	});

	it("supports comma-separated patterns", () => {
		expect(matchesIgnorePattern("Archive/**, Private/**", { filePath: "Private/image.png" })).toBe(true);
		expect(matchesIgnorePattern("Archive/**, Private/**", { notePath: "Archive/old.md" })).toBe(true);
	});

	it("trims whitespace around patterns", () => {
		expect(matchesIgnorePattern("  Private/**  ,  Archive/** ", { filePath: "Private/image.png" })).toBe(true);
	});

	it("ignores empty entries produced by trailing/stray commas", () => {
		expect(matchesIgnorePattern("Private/**, , ,", { filePath: "Private/image.png" })).toBe(true);
		expect(matchesIgnorePattern(",  ,", { filePath: "Private/image.png" })).toBe(false);
	});

	it("returns false for an empty or blank pattern", () => {
		expect(matchesIgnorePattern("", { notePath: "Private/foo.md", filePath: "Private/image.png" })).toBe(false);
		expect(matchesIgnorePattern("   ", { notePath: "Private/foo.md" })).toBe(false);
		expect(matchesIgnorePattern(undefined, { notePath: "Private/foo.md" })).toBe(false);
		expect(matchesIgnorePattern(null, { notePath: "Private/foo.md" })).toBe(false);
	});

	it("returns false when no context paths are available", () => {
		expect(matchesIgnorePattern("Private/**", {})).toBe(false);
	});

	it("supports a clipboard/paste context that only has a notePath", () => {
		expect(matchesIgnorePattern("Private/**", { notePath: "Private/foo.md", filePath: undefined })).toBe(true);
		expect(matchesIgnorePattern("Private/**", { notePath: "Notes/foo.md", filePath: undefined })).toBe(false);
	});

	it("supports an auto-upload/create context that only has a filePath", () => {
		expect(matchesIgnorePattern("Private/**", { filePath: "Private/image.png" })).toBe(true);
	});

	it("regression: active note Notes/foo.md does not shield a created Private/** attachment", () => {
		expect(matchesIgnorePattern("Private/**", { notePath: "Notes/foo.md", filePath: "Private/image.png" })).toBe(true);
	});

	it("never matches against a generated S3 object key", () => {
		// The object key would look nothing like a vault path (e.g. date-based folders,
		// sequence numbers); matching only ever considers notePath/filePath.
		expect(matchesIgnorePattern("Private/**", { notePath: "Notes/foo.md", filePath: "2026/09/02-1.png" })).toBe(false);
	});
});
