import fuzzysort from "fuzzysort";
import * as ui from "./next-plugins-ui.js";
import { initSearch, normalizeText } from "./search.js";
import "./shared.js";

const reposContainer = document.getElementById("repos-container");
let renderedRepoItems = [];

const search = initSearch({
	containerId: "repos-container",
	filterFunction: filterReposAndPlugins,
	renderFunction: resetFilter,
});

function getRepoIndexUrl(rawUrl) {
	if (rawUrl.endsWith(".json")) return rawUrl;
	return rawUrl.endsWith("/") ? `${rawUrl}index.json` : `${rawUrl}/index.json`;
}

async function fetchRepoData(repo) {
	const indexUrl = getRepoIndexUrl(repo.url);

	try {
		const res = await fetch(indexUrl);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return { ...repo, data: await res.json() };
	} catch {
		try {
			const proxyUrl = `/api/proxy-repo?url=${encodeURIComponent(indexUrl)}`;
			const res = await fetch(proxyUrl);
			if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
			return { ...repo, data: await res.json() };
		} catch (err) {
			return { ...repo, error: err.message || "Failed to fetch repository" };
		}
	}
}

function resetFilter() {
	for (const item of renderedRepoItems) {
		item.element.style.display = "";
		for (const p of item.pluginElements) {
			p.element.style.display = "";
		}
	}
	search.updateSubtext("");
}

function filterReposAndPlugins(query) {
	const normalizedQuery = normalizeText(query);

	if (!normalizedQuery) {
		resetFilter();
		return;
	}

	const pluginEntries = [];
	for (const item of renderedRepoItems) {
		for (const p of item.pluginElements) {
			pluginEntries.push({
				repoItem: item,
				pluginElement: p.element,
				name: normalizeText(p.plugin.name),
				author: normalizeText(p.plugin.author),
				description: normalizeText(p.plugin.description),
				repoName: normalizeText(item.repo.data?.name || ""),
			});
		}
	}

	const results = fuzzysort.go(normalizedQuery, pluginEntries, {
		keys: ["name", "author", "description", "repoName"],
		threshold: 0.35,
	});

	for (const item of renderedRepoItems) {
		item.element.style.display = "none";
		for (const p of item.pluginElements) {
			p.element.style.display = "none";
		}
	}

	const visibleRepos = new Set();
	for (const res of results) {
		res.obj.pluginElement.style.display = "";
		res.obj.repoItem.element.style.display = "";
		visibleRepos.add(res.obj.repoItem);
	}

	for (const item of renderedRepoItems) {
		if (!visibleRepos.has(item)) {
			const repoNameMatch = fuzzysort.single(
				normalizedQuery,
				normalizeText(item.repo.data?.name || ""),
			);
			const repoDescMatch = fuzzysort.single(
				normalizedQuery,
				normalizeText(item.repo.data?.description || ""),
			);
			if (
				(repoNameMatch && repoNameMatch.score > 0.4) ||
				(repoDescMatch && repoDescMatch.score > 0.4)
			) {
				item.element.style.display = "";
				for (const p of item.pluginElements) {
					p.element.style.display = "";
				}
				visibleRepos.add(item);
			}
		}
	}

	const totalMatchedPlugins = results.length;
	const totalMatchedRepos = visibleRepos.size;

	search.updateSubtext(
		`Found ${totalMatchedPlugins} matching plugin${totalMatchedPlugins === 1 ? "" : "s"} across ${totalMatchedRepos} repo${totalMatchedRepos === 1 ? "" : "s"}`,
	);
}

async function init() {
	try {
		const response = await fetch("/next-repos-data.json");
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const repoConfigs = await response.json();

		const loadedRepos = await Promise.all(
			repoConfigs.map((repo) => fetchRepoData(repo)),
		);

		renderedRepoItems = ui.renderRepos(reposContainer, loadedRepos);

		search.initSearchFromURL();
	} catch (error) {
		console.error("Error loading Next repositories:", error);
		if (reposContainer) {
			reposContainer.innerHTML =
				'<div class="error-message">Failed to load Next repositories. Please try again later.</div>';
		}
	}
}

init();
