import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		coverage: {
			reporter: ["text", "lcov", "html"],
			exclude: ["node_modules/**", "tests/**"],
		},
	},
	resolve: {
		alias: {
			obsidian: new URL("./tests/__mocks__/obsidian.ts", import.meta.url).pathname,
		},
	},
});
