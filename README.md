# Paste to S3

An Obsidian plugin that intercepts image paste/drop events, optionally converts to WebP, applies a canvas-based watermark, uploads to Cloudflare R2 (or any S3-compatible storage), and inserts the resulting URL as a markdown image link.

## Features

- **Auto-upload on paste/drag** — images are uploaded immediately without manual steps.
- **WebP conversion** — convert images to WebP before upload for smaller file sizes with configurable quality.
- **Image compression** — reduce file size with configurable quality, max dimensions, and file size limits.
- **Text watermark** — overlay custom text with configurable font family, size, color, bold/italic, position, and fine-tuned offsets.
- **Logo watermark** — overlay a local image from your vault as a watermark with configurable size, opacity, position, and offsets.
- **Live watermark preview** — see exactly how the watermark will look with customizable preview background and resolution.
- **S3 / R2 compatibility** — works with Cloudflare R2, AWS S3, MinIO, Backblaze B2, and any S3-compatible service.
- **Local mode** — optionally copy files to a local vault folder instead of uploading.
- **Video / Audio / PDF support** — optionally upload non-image files as well.
- **Ignore patterns** — skip uploads for specific notes matching glob patterns (e.g. `Private/*`).
- **Connection tester** — verify your S3/R2 credentials directly from the settings tab.

## Installation

### Manual

1. Download the latest release assets: `main.js`, `manifest.json`, `styles.css`.
2. Copy them to `<vault>/.obsidian/plugins/watermark-bucket-uploader/`.
3. Enable the plugin in **Settings → Community plugins**.

## Configuration

Go to **Settings → Paste to S3** to configure your storage. The settings page is organized around six questions, in order:

1. **Storage** — Where will my files be stored?
2. **Links** — What URL gets inserted into the note?
3. **Upload behavior** — What actions trigger an upload?
4. **Image optimization** — What happens to the image before upload?
5. **Watermark** — Should a watermark be applied?
6. **Advanced** — Compatibility and debug settings.

### 1. Storage

Choose a **storage destination**:

- **S3-compatible storage** — pick a **provider** (Cloudflare R2, AWS S3, MinIO, Backblaze B2, or Other) to prefill sensible defaults (e.g. Cloudflare R2 implies region `auto` and a custom endpoint), then fill in **Bucket**, **Folder** (supports `${year}`, `${month}`, `${day}`, `${basename}`), and **Credentials** (Access key ID / Secret access key). Use **Test connection** to verify access. Protocol-level fields (Region, Endpoint URL, Force path-style) live under **Advanced**.
- **Local vault folder** — copy uploaded files into a vault-relative folder instead of uploading them.

### 2. Links

Separate from Storage: Storage is *where the object is uploaded*, Links is *what URL gets written into the note*.

- **Public URL**: **Automatic / provider default** (derived from your storage settings) or **Custom domain / CDN** (set a **Base URL**, e.g. `https://assets.example.com/`).
- An **outcome preview** shows the exact object key and markdown link your current settings would produce.
- **Query string** options (e.g. `?v=1` for cache-busting) live under **Advanced**.

### 3. Upload behavior

- **Triggers**: Paste images (always on), Drag & drop, and **Automatically upload new attachments** — this uploads newly created image attachments (e.g. added by sync) to configured storage *and replaces the local attachment with the remote link*.
- **Additional file types**: Video, Audio, PDF (images are always supported).
- **Exclusions**: glob patterns to skip uploads for matching notes (e.g. `Private/*, **/drafts/**`).
- **Per-note overrides**: some settings (`localUpload`, `uploadFolder`, `uploadVideo`, `uploadAudio`, `uploadPdf`, `uploadOnDrag`) can be overridden per note via frontmatter; global defaults apply unless a note sets its own value.

### 4. Image optimization

Processing order for pasted/dropped images (see `src/pasteHandler.ts#processFile`): **WebP conversion → compression → watermark**.

- **Convert to WebP** (with quality slider).
- **Compress large images** (maximum size, quality, maximum width/height) — applied after WebP conversion.

### 5. Watermark

Pick a mode — **Off / Text / Logo / Both** — then configure only what's enabled. A **live preview** always shows the current result. Preview-only settings (background, resolution) live under a secondary **Preview options** disclosure so they don't outweigh the watermark configuration itself.

Fields: Text, Font family, Font size (0 = auto), Style (bold/italic), Color, Logo path (vault-relative, e.g. `_assets/logo.png`), Logo size, Logo opacity, Position (bottom right/left/center, center), Offset X/Y.

![Watermark settings live preview](assets/watermark-settings-preview.png)

### 6. Advanced

- **Bypass local CORS check**: enable if you encounter CORS issues testing uploads from within Obsidian.
- **Debug logging**: print detailed logs to the developer console.

### Cloudflare R2 quick setup

1. Create a bucket in the Cloudflare R2 dashboard.
2. Generate an API token with **Object Read & Write** permissions.
3. In **Storage**, choose provider **Cloudflare R2** (this prefills Region = `auto` and enables a custom endpoint) and set the **Endpoint URL** to `https://<account-id>.r2.cloudflarestorage.com`.
4. In **Links**, set **Public URL** to **Custom domain / CDN** and enter your public bucket domain (or R2 dev domain) as the **Base URL**.

## Usage

- **Paste** an image (`Ctrl/Cmd+V`) in any note — the plugin intercepts it, processes, uploads, and inserts `![](url)`.
- **Drag and drop** an image onto the editor (ensure "Drag & drop" is enabled under Upload behavior).
- **Command Palette** → `Upload image` to manually select and upload a file.
- **Automatically upload new attachments** — if enabled, any image file added to your vault (e.g. via sync) is uploaded to configured storage and the local attachment is replaced with the remote link.

## Development

1. Install dependencies: `npm install`
2. Start development mode with hot-reload: `npm run dev`
3. Build for production: `npm run build`
4. Run tests: `npm test`
5. Lint code: `npm run lint`

## License

MIT
