export async function onRequestPost(context) {
	const { request, env } = context;

	const GITHUB_TOKEN = env.GITHUB_TOKEN;
	const GITHUB_REPO = env.GITHUB_REPO;
	const GITHUB_USER = env.GITHUB_USER;
	const BRANCH = "dev";
	const FILE_PATH = "src/plugins-data.json";

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
		const contentToPush = JSON.stringify(newPluginsData, null, 4);

		const getFileResponse = await fetch(
			`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
					Authorization: `token ${GITHUB_TOKEN}`,
					"User-Agent": GITHUB_USER,
				},
			},
		);

		if (!getFileResponse.ok) {
			throw new Error("Could not fetch current file SHA from GitHub.");
		}

		const fileData = await getFileResponse.json();
		const currentSha = fileData.sha;

		const updateResponse = await fetch(
			`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
			{
				method: "PUT",
				headers: {
					Accept: "application/vnd.github.v3+json",
					Authorization: `token ${GITHUB_TOKEN}`,
					"User-Agent": GITHUB_USER,
				},
				body: JSON.stringify({
					message: "📝 Update plugins-data.json from Admin UI",
					content: (() => {
						const encoder = new TextEncoder();
						const utf8Bytes = encoder.encode(contentToPush);
						let binaryString = "";
						for (let i = 0; i < utf8Bytes.length; i++) {
							binaryString += String.fromCharCode(utf8Bytes[i]);
						}
						return btoa(binaryString);
					})(),
					sha: currentSha,
					branch: BRANCH,
					committer: {
						name: "Admin UI Bot",
						email: "actions@github.com",
					},
				}),
			},
		);

		if (!updateResponse.ok) {
			const errorText = await updateResponse.text();
			console.error("GitHub API Error:", errorText);
			throw new Error(`GitHub API update failed: ${updateResponse.statusText}`);
		}

		return new Response(
			JSON.stringify({
				message: "Changes committed successfully to the dev branch!",
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
