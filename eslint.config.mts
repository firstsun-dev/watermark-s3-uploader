import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		rules: {
			// cosmetic / large-scale fixes deferred
			"obsidianmd/ui/sentence-case": "warn",
			"obsidianmd/settings-tab/no-manual-html-headings": "warn",
			"obsidianmd/no-static-styles-assignment": "warn",
			"obsidianmd/no-unsupported-api": "warn",
			// console.log is gated behind debugMode flag
			"no-console": "off",
			"obsidianmd/rule-custom-message": "off",
			// TypeScript strict rules — require deeper typing work
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-assignment": "warn",
			"@typescript-eslint/no-unsafe-call": "warn",
			"@typescript-eslint/no-unsafe-return": "warn",
			"@typescript-eslint/no-unsafe-member-access": "warn",
			"@typescript-eslint/restrict-template-expressions": "warn",
			"@typescript-eslint/no-base-to-string": "warn",
			"@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
		},
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		".claude/**",
		"coverage/**",
	]),
);
