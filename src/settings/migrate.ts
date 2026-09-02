import { DEFAULT_SETTINGS } from "./defaults";
import { R2UploaderSettings, StorageDestination, StorageProvider } from "./types";

/**
 * Merge persisted data with defaults, then derive the new UX-only fields
 * (storageDestination / storageProvider / publicUrlMode) from legacy fields
 * when they are not already present. Never overwrites a field that is
 * already present in the persisted data — this is the only migration
 * required since no legacy field is renamed or removed.
 */
export function migrateSettings(raw: unknown): R2UploaderSettings {
	const data = (raw ?? {}) as Partial<R2UploaderSettings>;
	const merged = Object.assign({}, DEFAULT_SETTINGS, data);

	if (data.storageDestination === undefined) {
		merged.storageDestination = deriveStorageDestination(data);
	}
	if (data.storageProvider === undefined) {
		merged.storageProvider = deriveStorageProvider(data);
	}
	if (data.publicUrlMode === undefined) {
		merged.publicUrlMode = derivePublicUrlMode(data);
	}

	return merged;
}

export function deriveStorageDestination(data: Partial<R2UploaderSettings>): StorageDestination {
	return data.localUpload ? "local" : "s3";
}

export function derivePublicUrlMode(data: Partial<R2UploaderSettings>): "auto" | "custom" {
	return data.useCustomImageUrl ? "custom" : "auto";
}

export function deriveStorageProvider(data: Partial<R2UploaderSettings>): StorageProvider {
	const endpoint = (data.customEndpoint ?? "").toLowerCase();
	if (data.useCustomEndpoint && endpoint.includes("r2.cloudflarestorage.com")) return "cloudflare-r2";
	if (data.useCustomEndpoint && endpoint.includes("backblazeb2.com")) return "backblaze-b2";
	if (!data.useCustomEndpoint) return "aws-s3";
	return "other";
}

// ── Positive UI mapping for the legacy negative-boolean persisted field ────
// Persisted field stays `disableAutoUploadOnCreate` for backward compatibility
// (existing installs keep working without a data migration); the UI only
// ever shows the positive phrasing "Automatically upload new attachments".

export function isAutoUploadOnCreateEnabled(settings: R2UploaderSettings): boolean {
	return !settings.disableAutoUploadOnCreate;
}

export function setAutoUploadOnCreateEnabled(settings: R2UploaderSettings, enabled: boolean): void {
	settings.disableAutoUploadOnCreate = !enabled;
}

// ── Storage destination accessors (safe even before migrateSettings runs) ──

export function getStorageDestination(settings: R2UploaderSettings): StorageDestination {
	return settings.storageDestination ?? deriveStorageDestination(settings);
}

export function getStorageProvider(settings: R2UploaderSettings): StorageProvider {
	return settings.storageProvider ?? deriveStorageProvider(settings);
}

export function getPublicUrlMode(settings: R2UploaderSettings): "auto" | "custom" {
	return settings.publicUrlMode ?? derivePublicUrlMode(settings);
}

// ── Provider presets ─────────────────────────────────────────────────────
// Applied only to fields the user has not already customized, so switching
// providers never clobbers manually entered credentials/endpoints/regions.

interface ProviderPreset {
	region?: string;
	requiresCustomEndpoint?: boolean;
	forcePathStyle?: boolean;
}

const PROVIDER_PRESETS: Record<StorageProvider, ProviderPreset> = {
	"cloudflare-r2": { region: "auto", requiresCustomEndpoint: true, forcePathStyle: false },
	"aws-s3": { region: "us-east-1", requiresCustomEndpoint: false },
	"minio": { requiresCustomEndpoint: true, forcePathStyle: true },
	"backblaze-b2": { region: "us-west-004", requiresCustomEndpoint: true, forcePathStyle: false },
	"other": {},
};

/**
 * Returns only the fields that should change when the user picks `provider`,
 * given the current settings. Never touches a field the user has already
 * filled in (non-empty region/customEndpoint), and never touches
 * forcePathStyle unless it's still at its default (false).
 */
export function applyProviderDefaults(
	settings: R2UploaderSettings,
	provider: StorageProvider,
): Partial<R2UploaderSettings> {
	const preset = PROVIDER_PRESETS[provider];
	const patch: Partial<R2UploaderSettings> = { storageProvider: provider };

	if (preset.region !== undefined && !settings.region) {
		patch.region = preset.region;
	}
	if (preset.requiresCustomEndpoint !== undefined && !settings.customEndpoint) {
		patch.useCustomEndpoint = preset.requiresCustomEndpoint;
	}
	if (preset.forcePathStyle !== undefined && !settings.forcePathStyle) {
		patch.forcePathStyle = preset.forcePathStyle;
	}

	return patch;
}
