import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectPath = __dirname;
const srcPath = path.join(projectPath, "src");
const pluginsFilePath = path.join(srcPath, "plugins-data.json");

const server = http.createServer(async (req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");

	if (req.method === "OPTIONS") {
		res.writeHead(200);
		res.end();
		return;
	}

	if (req.method === "GET" && !req.url.startsWith("/save")) {
		const pathname = req.url.split("?")[0];
		const requestedPath = pathname === "/" ? "/index.html" : pathname;
		const safePath = path
			.normalize(requestedPath)
			.replace(/^(\.\.[\/\\])+/, "");
		const filePath = path.join(srcPath, safePath);

		if (path.extname(filePath) === ".js") {
			try {
				const result = await esbuild.build({
					entryPoints: [filePath],
					bundle: true,
					write: false,
					format: "esm",
					sourcemap: "inline",
					target: "es2015",
				});
				res.writeHead(200, { "Content-Type": "text/javascript" });
				res.end(result.outputFiles[0].text);
			} catch (err) {
				console.error(`❌ esbuild error for ${filePath}:`, err);
				res.writeHead(500, { "Content-Type": "text/plain" });
				res.end("esbuild compilation failed");
			}
			return;
		}

		fs.readFile(filePath, (err, data) => {
			if (err) {
				console.log(`❌ File not found: ${filePath}`);
				res.writeHead(404);
				res.end("File not found");
				return;
			}

			const ext = path.extname(filePath);
			let contentType = "text/html";

			if (ext === ".css") contentType = "text/css";
			else if (ext === ".json") contentType = "application/json";
			else if (ext === ".png") contentType = "image/png";
			else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
			else if (ext === ".svg") contentType = "image/svg+xml";

			res.writeHead(200, { "Content-Type": contentType });
			res.end(data);
		});
	} else if (req.method === "POST" && req.url === "/save-plugins") {
		let body = "";

		req.on("data", (chunk) => {
			body += chunk.toString();
		});

		req.on("end", () => {
			try {
				JSON.parse(body);

				fs.writeFile(pluginsFilePath, body, (err) => {
					if (err) {
						console.error("❌ Write error:", err);
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								success: false,
								message: `Write error: ${err.message}`,
							}),
						);
						return;
					}

					console.log(`✅ Successfully saved to ${pluginsFilePath}`);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							success: true,
							message: "✅ JSON file saved successfully",
						}),
					);
				});
			} catch (e) {
				console.error("❌ Invalid JSON:", e);
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						success: false,
						message: `Invalid JSON: ${e.message}`,
					}),
				);
			}
		});
	} else {
		res.writeHead(404);
		res.end("Endpoint not found");
	}
});

const PORT = 3000;
server.listen(PORT, () => {
	console.log(`✅ Server started on http://localhost:${PORT}`);
	console.log(
		`ℹ️  Admin page accessible at http://localhost:${PORT}/Admin/index.html`,
	);
	console.log(`ℹ️  Changes will be saved to ${pluginsFilePath}`);
});
