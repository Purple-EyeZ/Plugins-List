export async function onRequestPost(context) {
	const { request, env } = context;

	const GITHUB_TOKEN = env.GITHUB_TOKEN;
	const GITHUB_REPO = env.GITHUB_REPO;
	const GITHUB_USER = env.GITHUB_USER;
	const BRANCH = "dev";

	if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_USER) {
		return new Response(
			JSON.stringify({
				message: "Server configuration error: Missing environment variables.",
			}),
			{ status: 500 },
		);
	}

	try {
		const payload = await request.json();
		const commitMessage = payload.message || "📝 Update from Admin UI";
		const filesToCommit = Array.isArray(payload.files) ? payload.files : [];

		if (filesToCommit.length === 0) {
			return new Response(JSON.stringify({ message: "No files to commit." }), {
				status: 400,
			});
		}

		const allowedPrefixes = [
			"src/plugins-data.json",
			"src/themes-data.json",
			"src/assets/Themes_preview/",
		];
		const allowedEncodings = new Set(["utf-8", "base64"]);

		for (const file of filesToCommit) {
			if (
				!file ||
				typeof file.path !== "string" ||
				typeof file.content !== "string"
			) {
				return new Response(
					JSON.stringify({ message: "Invalid file payload." }),
					{ status: 400 },
				);
			}

			const hasPathTraversal = file.path
				.split("/")
				.some((seg) => seg === ".." || seg === ".");
			if (
				hasPathTraversal ||
				file.path.startsWith("/") ||
				file.path.includes("\\")
			) {
				return new Response(
					JSON.stringify({ message: `Invalid file path: ${file.path}` }),
					{ status: 400 },
				);
			}

			const allowed = allowedPrefixes.some((p) =>
				p.endsWith("/") ? file.path.startsWith(p) : file.path === p,
			);
			if (!allowed) {
				return new Response(
					JSON.stringify({ message: `Disallowed file path: ${file.path}` }),
					{ status: 403 },
				);
			}

			file.encoding = (file.encoding || "utf-8").toLowerCase();
			if (!allowedEncodings.has(file.encoding)) {
				return new Response(
					JSON.stringify({ message: `Unsupported encoding for ${file.path}` }),
					{ status: 400 },
				);
			}
		}

		// Get the latest commit SHA for the branch to get the tree SHA
		const refResponse = await fetch(
			`https://api.github.com/repos/${GITHUB_REPO}/git/ref/heads/${BRANCH}`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
					Authorization: `token ${GITHUB_TOKEN}`,
					"User-Agent": GITHUB_USER,
				},
			},
		);

		if (!refResponse.ok) throw new Error("Could not fetch branch reference.");
		const refData = await refResponse.json();
		const baseCommitSha = refData.object.sha;

		// Fetch the commit so we can get its tree SHA for base_tree
		const baseCommitResponse = await fetch(
			`https://api.github.com/repos/${GITHUB_REPO}/git/commits/${baseCommitSha}`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
					Authorization: `token ${GITHUB_TOKEN}`,
					"User-Agent": GITHUB_USER,
				},
			},
		);

		if (!baseCommitResponse.ok)
			throw new Error("Could not fetch base commit data.");

		const baseCommitData = await baseCommitResponse.json();
		const baseTreeSha = baseCommitData.tree.sha;

		// Create blobs for each file
		const treeItems = await Promise.all(
			filesToCommit.map(async (file) => {
				const blobResponse = await fetch(
					`https://api.github.com/repos/${GITHUB_REPO}/git/blobs`,
					{
						method: "POST",
						headers: {
							Accept: "application/vnd.github.v3+json",
							Authorization: `token ${GITHUB_TOKEN}`,
							"User-Agent": GITHUB_USER,
						},
						body: JSON.stringify({
							content: file.content,
							encoding: file.encoding || "utf-8",
						}),
					},
				);

				if (!blobResponse.ok) {
					const err = await blobResponse.text();
					throw new Error(`Failed to create blob for ${file.path}: ${err}`);
				}

				const blobData = await blobResponse.json();

				return {
					path: file.path,
					mode: "100644",
					type: "blob",
					sha: blobData.sha,
				};
			}),
		);

		// Create a new tree
		const treeResponse = await fetch(
			`https://api.github.com/repos/${GITHUB_REPO}/git/trees`,
			{
				method: "POST",
				headers: {
					Accept: "application/vnd.github.v3+json",
					Authorization: `token ${GITHUB_TOKEN}`,
					"User-Agent": GITHUB_USER,
				},
				body: JSON.stringify({
					base_tree: baseTreeSha,
					tree: treeItems,
				}),
			},
		);

		if (!treeResponse.ok) throw new Error("Failed to create tree.");
		const newTreeData = await treeResponse.json();

		// Create a new commit
		const commitResponse = await fetch(
			`https://api.github.com/repos/${GITHUB_REPO}/git/commits`,
			{
				method: "POST",
				headers: {
					Accept: "application/vnd.github.v3+json",
					Authorization: `token ${GITHUB_TOKEN}`,
					"User-Agent": GITHUB_USER,
				},
				body: JSON.stringify({
					message: commitMessage,
					tree: newTreeData.sha,
					parents: [baseCommitSha],
				}),
			},
		);

		if (!commitResponse.ok) throw new Error("Failed to create commit.");
		const newCommitData = await commitResponse.json();

		// Update the branch reference
		const updateRefResponse = await fetch(
			`https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${BRANCH}`,
			{
				method: "PATCH",
				headers: {
					Accept: "application/vnd.github.v3+json",
					Authorization: `token ${GITHUB_TOKEN}`,
					"User-Agent": GITHUB_USER,
				},
				body: JSON.stringify({
					sha: newCommitData.sha,
				}),
			},
		);

		if (!updateRefResponse.ok)
			throw new Error("Failed to update branch reference.");

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
