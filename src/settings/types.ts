export interface PasteFunction {
	(
		this: HTMLElement,
		event: ClipboardEvent | DragEvent,
		editor: import("obsidian").Editor,
	): void;
}

export type WatermarkPosition =
	| "bottom-right"
	| "bottom-left"
	| "bottom-center"
	| "center";

/** Where uploaded files end up. Derived from the legacy `localUpload` boolean when absent. */
export type StorageDestination = "s3" | "local";

/** S3-compatible provider preset, used to supply sensible defaults. Purely a UX aid — does
 *  not change how the S3 client talks to the endpoint. */
export type StorageProvider =
	| "cloudflare-r2"
	| "aws-s3"
	| "minio"
	| "backblaze-b2"
	| "other";

/** How the public URL inserted into the note is derived. Derived from the legacy
 *  `useCustomImageUrl` boolean when absent. */
export type PublicUrlMode = "auto" | "custom";

export interface R2UploaderSettings {
	accessKey: string;
	secretKey: string;
	region: string;
	bucket: string;
	folder: string;
	imageUrlPath: string;
	uploadOnDrag: boolean;
	localUpload: boolean;
	localUploadFolder: string;
	useCustomEndpoint: boolean;
	customEndpoint: string;
	forcePathStyle: boolean;
	useCustomImageUrl: boolean;
	customImageUrl: string;
	uploadVideo: boolean;
	uploadAudio: boolean;
	uploadPdf: boolean;
	bypassCors: boolean;
	queryStringValue: string;
	queryStringKey: string;
	enableImageCompression: boolean;
	maxImageCompressionSize: number;
	imageCompressionQuality: number;
	maxImageWidthOrHeight: number;
	ignorePattern: string;
	disableAutoUploadOnCreate: boolean;
	// WebP conversion
	convertToWebP: boolean;
	webpQuality: number;
	// Watermark — text
	watermarkEnabled: boolean;
	watermarkText: string;
	watermarkFont: string;
	watermarkFontFamily: string;
	watermarkFontSize: number;
	watermarkBold: boolean;
	watermarkItalic: boolean;
	watermarkColor: string;
	watermarkPosition: WatermarkPosition;
	watermarkOffsetX: number;
	watermarkOffsetY: number;
	// Watermark — logo image
	watermarkLogoEnabled: boolean;
	watermarkLogoPath: string;
	watermarkLogoSize: number;
	watermarkLogoOpacity: number;
	watermarkLogoPosition: WatermarkPosition;
	watermarkLogoOffsetX: number;
	watermarkLogoOffsetY: number;
	// Preview background
	previewBackground: "checker" | "white" | "black" | "custom";
	previewBackgroundColor: string;
	// Preview resolution
	previewResolution: "720p" | "1080p" | "4k" | "custom";
	previewResolutionCustom: string;
	// Debug
	debugMode: boolean;
	// Upload sequence counter
	uploadSeq: number;

	// ── New in the settings UX overhaul (optional: absent on pre-existing installs
	//    until migrated — see migrate.ts). Kept optional so legacy persisted data,
	//    and any object literal built before migration, remains valid. ──────────
	storageDestination?: StorageDestination;
	storageProvider?: StorageProvider;
	publicUrlMode?: PublicUrlMode;
}
