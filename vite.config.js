import { resolve } from "node:path";
import { defineConfig } from "vite";
import htmlMinifier from "vite-plugin-html-minifier";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
	root: "src",
	plugins: [
		htmlMinifier(),

		viteStaticCopy({
			targets: [
				{
					src: "plugins-data.json",
					dest: ".",
					transform(content) {
						return JSON.stringify(JSON.parse(content.toString()));
					},
				},
			],
		}),
	],
	build: {
		outDir: "../dist",
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: resolve(__dirname, "src/index.html"),
				about: resolve(__dirname, "src/About/index.html"),
				admin: resolve(__dirname, "src/Admin/index.html"),
			},
		},
	},
	server: {
		port: 3000,
		host: true,
	},
});
