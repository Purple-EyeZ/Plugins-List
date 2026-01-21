export async function onRequestPost(context) {
	const { request, env } = context;

	const authHeader = request.headers.get("Authorization");
	if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
		return new Response("Unauthorized", { status: 401 });
	}

	const pluginsResp = await fetch(
		"https://plugins-list.pages.dev/plugins-data.json",
	);
	const plugins = await pluginsResp.json();

	const BATCH_SIZE = 20;

	let startIndex = 0;
	const storedIndex = await env.PLUGIN_TRACKER.get("batch_index");
	if (storedIndex) {
		startIndex = parseInt(storedIndex, 10);
		if (Number.isNaN(startIndex)) startIndex = 0;
	}

	const endIndex = startIndex + BATCH_SIZE;

	const pluginsToProcess = plugins.slice(startIndex, endIndex);

	let nextIndex = endIndex;
	if (nextIndex >= plugins.length) {
		nextIndex = 0;
	}
	await env.PLUGIN_TRACKER.put("batch_index", nextIndex.toString());

	const updates = [];
	const failedManifests = [];
	const failedCode = [];
	let successCount = 0;
	const logDate = new Date().toISOString();

	for (const plugin of pluginsToProcess) {
		if (!plugin.installUrl) {
			console.log(`Skipping ${plugin.name} (no installUrl)`);
			continue;
		}

		try {
			let baseUrl = plugin.installUrl;
			if (!baseUrl.endsWith("/")) baseUrl += "/";

			const manifestUrl = `${baseUrl}manifest.json`;
			const manifestResp = await fetch(manifestUrl);

			if (!manifestResp.ok) {
				console.log(`No manifest for ${plugin.name}`);
				failedManifests.push(plugin.name);
				continue;
			}

			const manifest = await manifestResp.json();

			const mainFile = manifest.main || "index.js";
			const jsUrl = `${baseUrl}${mainFile}`;

			const codeResp = await fetch(`${jsUrl}?t=${Date.now()}`);
			if (!codeResp.ok) {
				failedCode.push(plugin.name);
				continue;
			}

			const currentCode = await codeResp.text();

			const pluginKey = `code:${plugin.name}`;

			const storedCode = await env.PLUGIN_TRACKER.get(pluginKey);

			if (storedCode === null) {
				await env.PLUGIN_TRACKER.put(pluginKey, currentCode);
			} else if (storedCode !== currentCode) {
				const diffEntry = {
					pluginName: plugin.name,
					date: logDate,
					oldCode: storedCode,
					newCode: currentCode,
				};

				const diffKey = `diff:${Date.now()}:${plugin.name}`;
				await env.PLUGIN_TRACKER.put(diffKey, JSON.stringify(diffEntry));

				await env.PLUGIN_TRACKER.put(pluginKey, currentCode);

				updates.push(plugin.name);
			}
			successCount++;
		} catch (err) {
			console.error(`Error on ${plugin.name}:`, err);
		}
	}

	return new Response(
		JSON.stringify({
			success: true,
			batchStart: startIndex,
			batchEnd: endIndex,
			nextBatchStart: nextIndex,
			processedInBatch: successCount,
			updated: updates,
			failedManifests: failedManifests,
			failedCode: failedCode,
			totalPluginsInList: plugins.length,
		}),
		{
			headers: { "Content-Type": "application/json" },
		},
	);
}
