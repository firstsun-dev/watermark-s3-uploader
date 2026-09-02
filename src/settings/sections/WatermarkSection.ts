import { Setting } from "obsidian";
import type R2UploaderPlugin from "../../main";
import { paintCheckerboard, paintLogoWatermark, paintTextWatermark, resolvePosition } from "../../watermark";
import { createAdvancedDisclosure, createSection, createSubheading } from "../components/SettingSection";
import { toggleSettingsVisibility } from "../components/fields";
import type { R2UploaderSettings, WatermarkPosition } from "../types";

const DEFAULT_CANVAS_WIDTH = 1920;
const DEFAULT_CANVAS_HEIGHT = 1080;
const PADDING_FACTOR = 0.015;

type WatermarkMode = "off" | "text" | "logo" | "both";

function modeFor(s: R2UploaderSettings): WatermarkMode {
	if (s.watermarkEnabled && s.watermarkLogoEnabled) return "both";
	if (s.watermarkLogoEnabled) return "logo";
	if (s.watermarkEnabled) return "text";
	return "off";
}

function applyMode(s: R2UploaderSettings, mode: WatermarkMode): void {
	s.watermarkEnabled = mode === "text" || mode === "both";
	s.watermarkLogoEnabled = mode === "logo" || mode === "both";
}

/**
 * Watermark — "Should a watermark be applied?"
 * Leads with the on/off + mode decision and the live preview; preview-tool
 * settings (background/resolution) are demoted to a secondary "Preview
 * options" disclosure so they don't outweigh the watermark configuration.
 */
export function renderWatermarkSection(containerEl: HTMLElement, plugin: R2UploaderPlugin): void {
	const section = createSection(containerEl, "5. Watermark", false, "stamp");

	let previewCanvas: HTMLCanvasElement | null = null;

	async function renderPreview(): Promise<void> {
		const canvas = previewCanvas;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const s = plugin.settings;
		const resMap: Record<string, [number, number]> = {
			"720p": [1280, 720],
			"1080p": [1920, 1080],
			"4k": [3840, 2160],
		};
		let W: number, H: number;
		if (s.previewResolution === "custom") {
			const parts = s.previewResolutionCustom.toLowerCase().split(/[x×,\s]+/);
			W = parseInt(parts[0]) || DEFAULT_CANVAS_WIDTH;
			H = parseInt(parts[1]) || DEFAULT_CANVAS_HEIGHT;
		} else {
			[W, H] = resMap[s.previewResolution] ?? [DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT];
		}
		canvas.width = W;
		canvas.height = H;
		ctx.setTransform(1, 0, 0, 1, 0, 0);

		const bg = s.previewBackground;
		if (bg === "checker") {
			paintCheckerboard(ctx, W, H);
		} else if (bg === "white") {
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, W, H);
		} else if (bg === "black") {
			ctx.fillStyle = "#000000";
			ctx.fillRect(0, 0, W, H);
		} else {
			ctx.fillStyle = s.previewBackgroundColor || "#888888";
			ctx.fillRect(0, 0, W, H);
		}

		if (s.watermarkLogoEnabled && s.watermarkLogoPath) {
			try {
				const logoData = await plugin.app.vault.adapter.readBinary(s.watermarkLogoPath);
				await paintLogoWatermark(ctx, W, H, s, logoData);
			} catch {
				const logoW = Math.round((W * s.watermarkLogoSize) / 100);
				const logoH = Math.round(logoW * 0.4);
				const padding = Math.round(W * PADDING_FACTOR);
				const { x, y } = resolvePosition(s.watermarkLogoPosition, W, H, logoW, logoH, padding, s.watermarkLogoOffsetX, s.watermarkLogoOffsetY);
				ctx.save();
				ctx.globalAlpha = s.watermarkLogoOpacity * 0.4;
				ctx.fillStyle = "#888";
				ctx.fillRect(x, y - logoH, logoW, logoH);
				ctx.fillStyle = "#fff";
				ctx.font = `${Math.round(logoH * 0.4)}px Arial`;
				ctx.textAlign = "center";
				ctx.fillText("LOGO", x + logoW / 2, y - logoH / 2 + Math.round(logoH * 0.15));
				ctx.restore();
			}
		}

		paintTextWatermark(ctx, W, H, s);
	}

	function refreshPreview(): void {
		renderPreview().catch((e) => {
			if (plugin.settings.debugMode) console.debug("[R2Uploader] Preview render failed:", e);
		});
	}

	// ── Mode decision ─────────────────────────────────────────────────────
	const textSettings: Setting[] = [];
	const logoSettings: Setting[] = [];

	new Setting(section)
		.setName("Watermark")
		.setDesc("Overlay text, a logo, or both onto uploaded images.")
		.addDropdown((d) =>
			d.addOption("off", "Off")
				.addOption("text", "Text")
				.addOption("logo", "Logo")
				.addOption("both", "Both")
				.setValue(modeFor(plugin.settings))
				.onChange(async (v: string) => {
					applyMode(plugin.settings, v as WatermarkMode);
					toggleSettingsVisibility(textSettings, plugin.settings.watermarkEnabled);
					toggleSettingsVisibility(logoSettings, plugin.settings.watermarkLogoEnabled);
					await plugin.saveSettings();
					refreshPreview();
				}));

	// ── Live preview ──────────────────────────────────────────────────────
	const previewWrap = section.createDiv({ cls: "r2-preview-wrap" });
	previewCanvas = previewWrap.createEl("canvas", { cls: "r2-preview-canvas" });
	previewWrap.createEl("p", { text: "Live preview", cls: "r2-preview-label" });
	refreshPreview();

	// ── Text controls ─────────────────────────────────────────────────────
	createSubheading(section, "Text watermark");
	textSettings.push(
		new Setting(section).setName("Text").addText((text) =>
			text.setPlaceholder("© firstsun.org")
				.setValue(plugin.settings.watermarkText)
				.onChange(async (v) => { plugin.settings.watermarkText = v; await plugin.saveSettings(); refreshPreview(); })),

		new Setting(section).setName("Font family").setDesc('E.g. "arial", "georgia", "monospace"').addText((text) =>
			text.setPlaceholder("Arial")
				.setValue(plugin.settings.watermarkFontFamily)
				.onChange(async (v) => { plugin.settings.watermarkFontFamily = v || "Arial"; await plugin.saveSettings(); refreshPreview(); })),

		new Setting(section).setName("Font size (px)").setDesc("0 = auto (2% of image width)").addSlider((s) =>
			s.setDynamicTooltip().setLimits(0, 120, 2)
				.setValue(plugin.settings.watermarkFontSize)
				.onChange(async (v) => { plugin.settings.watermarkFontSize = v; await plugin.saveSettings(); refreshPreview(); })),

		new Setting(section).setName("Style")
			.addToggle((t) => t.setValue(plugin.settings.watermarkBold)
				.onChange(async (v) => { plugin.settings.watermarkBold = v; await plugin.saveSettings(); refreshPreview(); }))
			.addExtraButton((b) => b.setTooltip("Bold").setIcon("bold"))
			.addToggle((t) => t.setValue(plugin.settings.watermarkItalic)
				.onChange(async (v) => { plugin.settings.watermarkItalic = v; await plugin.saveSettings(); refreshPreview(); }))
			.addExtraButton((b) => b.setTooltip("Italic").setIcon("italic")),

		new Setting(section).setName("Color").setDesc('CSS color, e.g. "rgba(255,255,255,0.85)" or "#ffffff"').addText((text) =>
			text.setPlaceholder("Rgba(255,255,255,0.85)")
				.setValue(plugin.settings.watermarkColor)
				.onChange(async (v) => { plugin.settings.watermarkColor = v; await plugin.saveSettings(); refreshPreview(); })),

		positionSetting(section, "Position", plugin.settings.watermarkPosition, async (v) => {
			plugin.settings.watermarkPosition = v; await plugin.saveSettings(); refreshPreview();
		}),

		new Setting(section).setName("Offset X").setDesc("Horizontal nudge (% of image width, negative = left)").addSlider((s) =>
			s.setDynamicTooltip().setLimits(-30, 30, 1)
				.setValue(plugin.settings.watermarkOffsetX)
				.onChange(async (v) => { plugin.settings.watermarkOffsetX = v; await plugin.saveSettings(); refreshPreview(); })),

		new Setting(section).setName("Offset y").setDesc("Vertical nudge (% of image height, negative = up)").addSlider((s) =>
			s.setDynamicTooltip().setLimits(-30, 30, 1)
				.setValue(plugin.settings.watermarkOffsetY)
				.onChange(async (v) => { plugin.settings.watermarkOffsetY = v; await plugin.saveSettings(); refreshPreview(); })),
	);

	// ── Logo controls ─────────────────────────────────────────────────────
	createSubheading(section, "Logo watermark");
	logoSettings.push(
		new Setting(section).setName("Logo path (vault-relative)").setDesc('e.g. "_assets/logo-wm.png"').addText((text) => {
			text.setPlaceholder("_assets/logo-wm.png")
				.setValue(plugin.settings.watermarkLogoPath)
				.onChange(async (v) => {
					const trimmed = v.trim();
					plugin.settings.watermarkLogoPath = trimmed;
					await plugin.saveSettings();
					refreshPreview();
					const setting = text.inputEl.closest(".setting-item");
					const descEl = setting?.querySelector(".setting-item-description") as HTMLElement | null;
					if (!descEl) return;
					if (!trimmed) {
						descEl.textContent = 'e.g. "_assets/logo-wm.png"';
						descEl.removeClass("r2-success", "r2-error");
						return;
					}
					const exists = await plugin.app.vault.adapter.exists(trimmed);
					descEl.textContent = exists ? "✓ File found" : "⚠ File not found in vault";
					descEl.toggleClass("r2-success", exists);
					descEl.toggleClass("r2-error", !exists);
				});
		}),

		new Setting(section).setName("Logo size (% of image width)").addSlider((s) =>
			s.setDynamicTooltip().setLimits(1, 50, 1)
				.setValue(plugin.settings.watermarkLogoSize)
				.onChange(async (v) => { plugin.settings.watermarkLogoSize = v; await plugin.saveSettings(); refreshPreview(); })),

		new Setting(section).setName("Logo opacity").addSlider((s) =>
			s.setDynamicTooltip().setLimits(0.0, 1.0, 0.05)
				.setValue(plugin.settings.watermarkLogoOpacity)
				.onChange(async (v) => { plugin.settings.watermarkLogoOpacity = v; await plugin.saveSettings(); refreshPreview(); })),

		positionSetting(section, "Position", plugin.settings.watermarkLogoPosition, async (v) => {
			plugin.settings.watermarkLogoPosition = v; await plugin.saveSettings(); refreshPreview();
		}),

		new Setting(section).setName("Offset X").setDesc("Horizontal nudge (% of image width)").addSlider((s) =>
			s.setDynamicTooltip().setLimits(-30, 30, 1)
				.setValue(plugin.settings.watermarkLogoOffsetX)
				.onChange(async (v) => { plugin.settings.watermarkLogoOffsetX = v; await plugin.saveSettings(); refreshPreview(); })),

		new Setting(section).setName("Offset y").setDesc("Vertical nudge (% of image height)").addSlider((s) =>
			s.setDynamicTooltip().setLimits(-30, 30, 1)
				.setValue(plugin.settings.watermarkLogoOffsetY)
				.onChange(async (v) => { plugin.settings.watermarkLogoOffsetY = v; await plugin.saveSettings(); refreshPreview(); })),
	);

	toggleSettingsVisibility(textSettings, plugin.settings.watermarkEnabled);
	toggleSettingsVisibility(logoSettings, plugin.settings.watermarkLogoEnabled);

	// ── Preview options: preview-tool settings, not primary watermark config ──
	const previewOptions = createAdvancedDisclosure(section, "Preview options");

	const customColorSetting = new Setting(previewOptions).setName("Background color");
	new Setting(previewOptions)
		.setName("Background")
		.addDropdown((d) =>
			d.addOptions({ checker: "Checkered", white: "White", black: "Black", custom: "Custom color" })
				.setValue(plugin.settings.previewBackground)
				.onChange(async (v: string) => {
					plugin.settings.previewBackground = v as R2UploaderSettings["previewBackground"];
					await plugin.saveSettings();
					customColorSetting.settingEl.toggleClass("is-hidden", v !== "custom");
					refreshPreview();
				}));
	if (customColorSetting.addColorPicker) {
		customColorSetting.addColorPicker((cp) =>
			cp.setValue(plugin.settings.previewBackgroundColor)
				.onChange(async (v) => { plugin.settings.previewBackgroundColor = v; await plugin.saveSettings(); refreshPreview(); }));
	}
	customColorSetting.settingEl.toggleClass("is-hidden", plugin.settings.previewBackground !== "custom");

	const customResSetting = new Setting(previewOptions).setName("Custom resolution").setDesc('Width × height in pixels, e.g. "2560x1440"');
	new Setting(previewOptions)
		.setName("Preview resolution")
		.setDesc("Canvas resolution for the watermark preview. Higher = more accurate proportions.")
		.addDropdown((d) =>
			d.addOptions({ "720p": "720p (1280×720)", "1080p": "1080p (1920×1080)", "4k": "4k (3840×2160)", "custom": "Custom…" })
				.setValue(plugin.settings.previewResolution)
				.onChange(async (v: string) => {
					plugin.settings.previewResolution = v as R2UploaderSettings["previewResolution"];
					await plugin.saveSettings();
					customResSetting.settingEl.toggleClass("is-hidden", v !== "custom");
					refreshPreview();
				}));
	customResSetting.addText((t) =>
		t.setPlaceholder("1920X1080")
			.setValue(plugin.settings.previewResolutionCustom)
			.onChange(async (v) => { plugin.settings.previewResolutionCustom = v.trim(); await plugin.saveSettings(); refreshPreview(); }));
	customResSetting.settingEl.toggleClass("is-hidden", plugin.settings.previewResolution !== "custom");
}

function positionSetting(
	container: HTMLElement,
	name: string,
	value: WatermarkPosition,
	onChange: (v: WatermarkPosition) => void | Promise<void>,
): Setting {
	return new Setting(container)
		.setName(name)
		.addDropdown((d) =>
			d.addOption("bottom-right", "Bottom right")
				.addOption("bottom-left", "Bottom left")
				.addOption("bottom-center", "Bottom center")
				.addOption("center", "Center")
				.setValue(value)
				.onChange((v) => onChange(v as WatermarkPosition)));
}
