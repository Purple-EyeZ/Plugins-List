import fuzzysort from "fuzzysort";
import * as ui from "./next-plugins-ui.js";
import { initSearch, normalizeText } from "./search.js";
import "./shared.js";

const reposContainer = document.getElementById("repos-container");
const hideDuplicatesToggle = document.getElementById(
	"hide-builtin-plugins",
);
let renderedRepoItems = [];
let officialDivider = null;
let thirdPartyDivider = null;
let hideDuplicates = hideDuplicatesToggle ? hideDuplicatesToggle.checked : true;

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

function updateRepoCounts() {
	for (const item of renderedRepoItems) {
		if (item.repo.official) continue;
		const countBadge = item.element.querySelector(".repo-count-badge");
		const total = item.plugins.length;
		const duplicates = item.pluginElements.filter((p) => p.isDuplicate).length;
		const visibleCount = hideDuplicates ? total - duplicates : total;
		const dupText = duplicates > 0 ? ` (${duplicates} built-in)` : "";
		if (countBadge) {
			countBadge.textContent = `${visibleCount} plugin${visibleCount === 1 ? "" : "s"}${dupText}`;
		}
		if (item.emptyNotice) {
			item.emptyNotice.style.display =
				hideDuplicates && total > 0 && visibleCount === 0 ? "" : "none";
		}
	}
}

function resetFilter() {
	for (const item of renderedRepoItems) {
		item.element.style.display = "";
		for (const p of item.pluginElements) {
			p.element.style.display = hideDuplicates && p.isDuplicate ? "none" : "";
		}
	}
	if (officialDivider) officialDivider.style.display = "";
	if (thirdPartyDivider) thirdPartyDivider.style.display = "";
	updateRepoCounts();
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
			if (hideDuplicates && p.isDuplicate) continue;
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
		if (item.emptyNotice) item.emptyNotice.style.display = "none";
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
					if (hideDuplicates && p.isDuplicate) continue;
					p.element.style.display = "";
				}
				visibleRepos.add(item);
			}
		}
	}

	if (officialDivider) {
		const hasOfficial = renderedRepoItems.some(
			(i) => i.repo.official && visibleRepos.has(i),
		);
		officialDivider.style.display = hasOfficial ? "" : "none";
	}
	if (thirdPartyDivider) {
		const hasThirdParty = renderedRepoItems.some(
			(i) => !i.repo.official && visibleRepos.has(i),
		);
		thirdPartyDivider.style.display = hasThirdParty ? "" : "none";
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

		repoConfigs.sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0));

		const loadedRepos = await Promise.all(
			repoConfigs.map((repo) => fetchRepoData(repo)),
		);

		const officialPluginIds = new Set();
		for (const repo of loadedRepos) {
			if (repo.official && repo.data?.plugins) {
				for (const id of Object.keys(repo.data.plugins)) {
					officialPluginIds.add(id);
				}
			}
		}

		const rendered = ui.renderRepos(
			reposContainer,
			loadedRepos,
			officialPluginIds,
		);
		renderedRepoItems = rendered.renderedRepos;
		officialDivider = rendered.officialDivider;
		thirdPartyDivider = rendered.thirdPartyDivider;

		if (hideDuplicatesToggle) {
			hideDuplicatesToggle.addEventListener("change", (e) => {
				hideDuplicates = e.target.checked;
				if (search.getCurrentValue()) {
					search.applyCurrentFilter();
				} else {
					resetFilter();
				}
			});
		}

		resetFilter();
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
