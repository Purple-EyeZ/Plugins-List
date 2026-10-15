let cachedAllowedBases = null;

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
};

export async function onRequestGet(context) {
	const { request, env, waitUntil } = context;
	const reqUrl = new URL(request.url);
	const targetUrlStr = reqUrl.searchParams.get("url");

	if (!targetUrlStr) {
		return Response.json(
			{ error: "Missing 'url' parameter" },
			{ status: 400, headers: CORS_HEADERS },
		);
	}

	let targetUrl;
	try {
		targetUrl = new URL(targetUrlStr);
		if (!["http:", "https:"].includes(targetUrl.protocol)) {
			throw new Error("Invalid protocol");
		}
		const decodedPath = decodeURIComponent(targetUrl.pathname);
		const segments = decodedPath.split("/");
		if (segments.some((seg) => seg === ".." || seg === ".")) {
			throw new Error("Path traversal detected");
		}
	} catch {
		return Response.json(
			{ error: "Invalid 'url' parameter" },
			{ status: 400, headers: CORS_HEADERS },
		);
	}

	if (!cachedAllowedBases) {
		try {
			const assetUrl = new URL("/next-repos-data.json", request.url);
			const reposRes = env?.ASSETS
				? await env.ASSETS.fetch(assetUrl)
				: await fetch(assetUrl);
			if (reposRes.ok) {
				const repos = await reposRes.json();
				cachedAllowedBases = repos.map((r) =>
					new URL(r.url).href.replace(/\/$/, ""),
				);
			}
		} catch (err) {
			console.error("Failed to load allowed repositories:", err);
		}
	}

	const allowedBases = cachedAllowedBases || [];
	const isAllowed = allowedBases.some(
		(base) => targetUrl.href === base || targetUrl.href.startsWith(`${base}/`),
	);

	if (!isAllowed) {
		return Response.json(
			{ error: "Repository not allowed" },
			{ status: 403, headers: CORS_HEADERS },
		);
	}

	const cache = typeof caches !== "undefined" ? caches.default : null;
	const cacheKey = new Request(
		`${reqUrl.origin}${reqUrl.pathname}?url=${encodeURIComponent(targetUrl.href)}`,
		{ method: "GET" },
	);

	if (cache) {
		try {
			const cachedResponse = await cache.match(cacheKey);
			if (cachedResponse) {
				return cachedResponse;
			}
		} catch (err) {
			console.warn("Cache match error:", err);
		}
	}

	try {
		const res = await fetch(targetUrl.href, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
				Accept: "application/json, text/plain, */*",
			},
			cf: {
				cacheTtl: 600,
				cacheEverything: true,
			},
		});

		if (!res.ok) {
			return Response.json(
				{ error: `Remote HTTP ${res.status}` },
				{ status: res.status, headers: CORS_HEADERS },
			);
		}

		const data = await res.json();

		const response = Response.json(data, {
			headers: {
				...CORS_HEADERS,
				"Cache-Control": "public, max-age=300, s-maxage=600",
			},
		});

		if (cache && waitUntil) {
			waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
		}

		return response;
	} catch (err) {
		return Response.json(
			{ error: err.message || "Failed to fetch remote repository" },
			{ status: 502, headers: CORS_HEADERS },
		);
	}
}
