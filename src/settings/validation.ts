import { getProviderPreset, getStorageDestination, getStorageProvider, providerLabel } from "./migrate";
import type { R2UploaderSettings } from "./types";

export interface MissingField {
	key: string;
	label: string;
}

export interface StorageValidationResult {
	valid: boolean;
	missingFields: MissingField[];
	/** Human-readable summary of what's missing, ready to show the user as-is. */
	message?: string;
}

/**
 * Single source of truth for "is the Storage configuration complete enough
 * to attempt a connection". Provider-aware: only requires an endpoint URL
 * for providers whose preset says they need one (R2/MinIO/Backblaze/other),
 * never AWS. Pure and side-effect free so it can back the status row, the
 * "Test connection" preflight, and unit tests without drift between them.
 */
export function validateStorageConfiguration(settings: R2UploaderSettings): StorageValidationResult {
	if (getStorageDestination(settings) === "local") {
		if (!settings.localUploadFolder) {
			return {
				valid: false,
				missingFields: [{ key: "localUploadFolder", label: "Folder" }],
				message: "Configuration incomplete: Folder is required for local vault storage.",
			};
		}
		return { valid: true, missingFields: [] };
	}

	const provider = getStorageProvider(settings);
	const preset = getProviderPreset(provider);
	const missing: MissingField[] = [];

	if (!settings.bucket) missing.push({ key: "bucket", label: "Bucket" });
	if (preset.requiresCustomEndpoint && !settings.customEndpoint) {
		missing.push({ key: "customEndpoint", label: "Endpoint URL" });
	}
	if (!settings.region) missing.push({ key: "region", label: "Region" });
	if (!settings.accessKey) missing.push({ key: "accessKey", label: "Access key ID" });
	if (!settings.secretKey) missing.push({ key: "secretKey", label: "Secret access key" });

	if (missing.length === 0) return { valid: true, missingFields: [] };

	const fieldList = missing.map((m) => m.label).join(", ");
	const verb = missing.length === 1 ? "is" : "are";
	return {
		valid: false,
		missingFields: missing,
		message: `Configuration incomplete: ${fieldList} ${verb} required for ${providerLabel(provider)}.`,
	};
}
