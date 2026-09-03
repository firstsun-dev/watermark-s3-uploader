import { minimatch } from "minimatch";

export interface IgnorePatternContext {
	/** Vault-relative path of the active/relevant Markdown note, if any. */
	notePath?: string;
	/** Vault-relative path of the source/attachment file being uploaded, if any. */
	filePath?: string;
}

/**
 * Checks whether an upload should be ignored: true if any available path in
 * `context` (note path and/or source file path) matches any pattern in the
 * comma-separated glob list `pattern`.
 *
 * - Patterns are comma-separated, trimmed, and empty entries are ignored.
 * - Both `context.notePath` and `context.filePath` are vault-relative paths
 *   (never a generated storage object key) and are checked independently —
 *   a match on either is enough to ignore.
 * - Matching uses minimatch with default options, which is case-sensitive.
 */
export function matchesIgnorePattern(pattern: string | undefined | null, context: IgnorePatternContext): boolean {
	if (!pattern?.trim()) return false;
	const patterns = pattern.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
	if (patterns.length === 0) return false;

	const paths = [context.notePath, context.filePath].filter((p): p is string => !!p);
	if (paths.length === 0) return false;

	return patterns.some((p) => paths.some((path) => minimatch(path, p)));
}
