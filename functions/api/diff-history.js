export async function onRequest(context) {
	const { env } = context;

	const list = await env.PLUGIN_TRACKER.list({ prefix: "diff:" });

	const recentKeys = list.keys.slice(-20).reverse();

	const history = await Promise.all(
		recentKeys.map((key) => env.PLUGIN_TRACKER.get(key.name, { type: "json" })),
	);

	const validHistory = history.filter((item) => item !== null);

	return new Response(JSON.stringify(validHistory), {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "public, max-age=600",
		},
	});
}
