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
// Field ownership: accessKey/secretKey/bucket/folder/customImageUrl are
// user-owned and applyProviderDefaults never touches them. region,
// useCustomEndpoint, forcePathStyle, and whether an automatic public URL is
// even possible are provider/runtime-owned semantics — switching providers
// sets these deterministically so the effective configuration can never
// claim one provider (e.g. "AWS S3") while runtime state still points at
// another provider's endpoint (e.g. an R2 host).

interface ProviderPreset {
	/** Region to use for this provider. "" means the provider has no fixed
	 *  default (e.g. a self-hosted MinIO) — the user must supply one. */
	region: string;
	requiresCustomEndpoint: boolean;
	forcePathStyle: boolean;
	/** Whether a public object URL can be safely derived without the user
	 *  supplying one explicitly. Only true for AWS S3's virtual-hosted
	 *  `https://s3.<region>.amazonaws.com` addressing — an S3 *API* endpoint
	 *  (R2, MinIO, Backblaze, generic "other") is never a public URL. */
	canAutoPublicUrl: boolean;
}

const PROVIDER_PRESETS: Record<StorageProvider, ProviderPreset> = {
	"aws-s3": { region: "us-east-1", requiresCustomEndpoint: false, forcePathStyle: false, canAutoPublicUrl: true },
	"cloudflare-r2": { region: "auto", requiresCustomEndpoint: true, forcePathStyle: false, canAutoPublicUrl: false },
	"minio": { region: "us-east-1", requiresCustomEndpoint: true, forcePathStyle: true, canAutoPublicUrl: false },
	"backblaze-b2": { region: "us-west-004", requiresCustomEndpoint: true, forcePathStyle: false, canAutoPublicUrl: false },
	"other": { region: "us-east-1", requiresCustomEndpoint: true, forcePathStyle: true, canAutoPublicUrl: false },
};

export function getProviderPreset(provider: StorageProvider): ProviderPreset {
	return PROVIDER_PRESETS[provider];
}

export function providerCanAutoPublicUrl(provider: StorageProvider): boolean {
	return PROVIDER_PRESETS[provider].canAutoPublicUrl;
}

/** Whether a previously-typed endpoint URL still plausibly belongs to
 *  `provider` — used only to decide whether to keep it across a provider
 *  switch. Providers without a recognizable hostname pattern (MinIO,
 *  Backblaze host aside, "other") never match, since a stale endpoint from a
 *  different provider is worse than an empty field the user must refill. */
function endpointMatchesProvider(endpoint: string, provider: StorageProvider): boolean {
	const e = (endpoint ?? "").toLowerCase();
	if (!e) return false;
	if (provider === "cloudflare-r2") return e.includes("r2.cloudflarestorage.com");
	if (provider === "backblaze-b2") return e.includes("backblazeb2.com");
	return false;
}

/**
 * Returns the fields that change when the user picks `provider`, given the
 * current settings. Always leaves accessKey/secretKey/bucket/folder/
 * customImageUrl untouched (never mentioned in the patch). Deterministically
 * sets region/useCustomEndpoint/forcePathStyle/customEndpoint to a coherent
 * state for the new provider — these are provider-owned, not user
 * preferences, so switching providers always overwrites them rather than
 * only filling in blanks (the previous "never touch if already set" logic is
 * exactly what let the UI say "AWS S3" while runtime kept talking to an R2
 * endpoint). Also forces publicUrlMode to "custom" when the new provider
 * can't support an automatically-derived public URL, so an R2/MinIO/other
 * API endpoint can never leak out as an inserted image link.
 */
export function applyProviderDefaults(
	settings: R2UploaderSettings,
	provider: StorageProvider,
): Partial<R2UploaderSettings> {
	const preset = PROVIDER_PRESETS[provider];
	const patch: Partial<R2UploaderSettings> = {
		storageProvider: provider,
		region: preset.region,
		useCustomEndpoint: preset.requiresCustomEndpoint,
		forcePathStyle: preset.forcePathStyle,
		customEndpoint: endpointMatchesProvider(settings.customEndpoint, provider) ? settings.customEndpoint : "",
	};

	if (!preset.canAutoPublicUrl && getPublicUrlMode(settings) === "auto") {
		patch.publicUrlMode = "custom";
		patch.useCustomImageUrl = true;
	}

	return patch;
}
