export async function onRequestPost(context) {
	const { request, env } = context;

	const GITHUB_TOKEN = env.GITHUB_TOKEN;
	const GITHUB_REPO = env.GITHUB_REPO;
	const GITHUB_USER = env.GITHUB_USER;

	if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_USER) {
		return new Response(
			JSON.stringify({
				message: "Server configuration error: Missing environment variables.",
			}),
			{ status: 500 },
		);
	}

	try {
		const newPluginsData = await request.json();

		const dispatchResponse = await fetch(
			`https://api.github.com/repos/${GITHUB_REPO}/dispatches`,
			{
				method: "POST",
				headers: {
					Accept: "application/vnd.github.v3+json",
					Authorization: `token ${GITHUB_TOKEN}`,
					"User-Agent": GITHUB_USER,
				},
				body: JSON.stringify({
					event_type: "update-plugins-json",
					client_payload: {
						plugins: Buffer.from(
							JSON.stringify(newPluginsData, null, 4),
						).toString("base64"),
					},
				}),
			},
		);

		if (!dispatchResponse.ok) {
			const errorText = await dispatchResponse.text();
			console.error("GitHub API Error:", errorText);
			throw new Error(
				`GitHub API dispatch failed: ${dispatchResponse.statusText}`,
			);
		}

		return new Response(
			JSON.stringify({
				message:
					"Update request sent successfully. The commit will appear on the dev branch shortly.",
			}),
			{ status: 200 },
		);
	} catch (error) {
		console.error("Function Error:", error);
		return new Response(
			JSON.stringify({ message: `An error occurred: ${error.message}` }),
			{ status: 500 },
		);
	}
}
