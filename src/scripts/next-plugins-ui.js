import { showToast } from "./shared.js";

function copyToClipboard(text) {
	navigator.clipboard.writeText(text).catch((err) => {
		console.error("Failed to copy:", err);
	});
}

export function cleanAuthor(author) {
	if (!author || typeof author !== "string") return "Unknown";
	return (
		author
			.replace(/<[^>]+>/g, "")
			.replace(/\([^)]+\)/g, "")
			.replace(/\s+/g, " ")
			.trim() || "Unknown"
	);
}

export function parseRepoPlugins(rawPlugins) {
	if (!rawPlugins || typeof rawPlugins !== "object") return [];

	return Object.entries(rawPlugins).map(([id, plugin]) => {
		const latestVersion =
			plugin.channels?.latest || Object.keys(plugin.versions || {})[0] || "";
		const versionData = plugin.versions?.[latestVersion] || {};
		const discordDep = versionData.dependencies?.discord?.version;
		const discordVersion = discordDep && discordDep !== "*" ? discordDep : null;

		return {
			id,
			name: plugin.name || id,
			description: plugin.description || "",
			author: cleanAuthor(plugin.author),
			icon: plugin.icon || null,
			version: latestVersion,
			discordVersion,
		};
	});
}

function createPluginCard(plugin, isDuplicate = false) {
	const template = document.getElementById("repo-plugin-card-template");
	if (!template) return null;

	const card = template.content
		.cloneNode(true)
		.querySelector(".repo-plugin-card");
	if (!card) return null;

	card.querySelector(".plugin-name").textContent = plugin.name;
	card.querySelector(".plugin-author").textContent = `By: ${plugin.author}`;
	card.querySelector(".plugin-description").textContent = plugin.description;

	const duplicateBadge = card.querySelector(".plugin-duplicate-badge");
	if (duplicateBadge) {
		if (isDuplicate) {
			duplicateBadge.style.display = "inline-flex";
			duplicateBadge.title = "Included in the official repository";
		} else {
			duplicateBadge.remove();
		}
	}

	const versionBadge = card.querySelector(".plugin-version-badge");
	if (versionBadge && plugin.version) {
		versionBadge.textContent = `v${plugin.version}`;
	} else if (versionBadge) {
		versionBadge.remove();
	}

	const discordBadge = card.querySelector(".discord-version-badge");
	if (discordBadge && plugin.discordVersion) {
		discordBadge.textContent = `${plugin.discordVersion}`;
		discordBadge.style.display = "inline-flex";
	} else if (discordBadge) {
		discordBadge.remove();
	}

	return card;
}

export function createRepoCard(repo, officialPluginIds = new Set()) {
	const template = document.getElementById("repo-card-template");
	if (!template) return null;

	const card = template.content.cloneNode(true).querySelector(".repo-card");
	if (!card) return null;

	const repoName = repo.data?.name || repo.url;
	const repoDesc = repo.data?.description || "";
	const plugins = parseRepoPlugins(repo.data?.plugins);

	card.querySelector(".repo-name").textContent = repoName;

	const countBadge = card.querySelector(".repo-count-badge");
	if (countBadge) {
		const duplicates = plugins.filter(
			(p) => !repo.official && officialPluginIds.has(p.id),
		).length;
		const dupText =
			!repo.official && duplicates > 0 ? ` (${duplicates} built-in)` : "";
		countBadge.textContent = `${plugins.length} plugin${plugins.length === 1 ? "" : "s"}${dupText}`;
	}

	const descEl = card.querySelector(".repo-description");
	if (descEl) {
		if (repoDesc) {
			descEl.textContent = repoDesc;
		} else {
			descEl.remove();
		}
	}

	const copyBtn = card.querySelector(".repo-copy-button");
	if (copyBtn) {
		if (repo.official) {
			const badge = document.createElement("span");
			badge.className = "repo-builtin-badge";
			badge.innerHTML =
				'<span class="material-symbols-rounded">check</span>Built-in';
			badge.title = "Included by default in Revenge Next";
			copyBtn.replaceWith(badge);
		} else {
			copyBtn.addEventListener("click", () => {
				copyToClipboard(repo.url);
				showToast(`Link for ${repoName} copied to clipboard!`);
			});
		}
	}

	const sourceBtn = card.querySelector(".repo-source-button");
	if (sourceBtn) {
		if (repo.sourceUrl) {
			sourceBtn.addEventListener("click", () => {
				window.open(repo.sourceUrl, "_blank", "noopener,noreferrer");
			});
		} else {
			sourceBtn.remove();
		}
	}

	const pluginsContainer = card.querySelector(".repo-plugins-container");
	const pluginElements = [];

	let emptyNotice = null;
	if (!repo.official) {
		emptyNotice = document.createElement("div");
		emptyNotice.className = "card__author repo-empty-notice";
		emptyNotice.style.display = "none";
		emptyNotice.textContent =
			"All plugins from this repo are in the official repository.";
		pluginsContainer.appendChild(emptyNotice);
	}

	if (repo.error) {
		const errDiv = document.createElement("div");
		errDiv.className = "error-message";
		errDiv.textContent = `Failed to load repository: ${repo.error}`;
		pluginsContainer.appendChild(errDiv);
	} else if (plugins.length === 0) {
		const emptyDiv = document.createElement("div");
		emptyDiv.className = "card__author";
		emptyDiv.textContent = "No plugins found in this repository.";
		pluginsContainer.appendChild(emptyDiv);
	} else {
		for (const plugin of plugins) {
			const isDuplicate = !repo.official && officialPluginIds.has(plugin.id);
			const pluginCard = createPluginCard(plugin, isDuplicate);
			if (pluginCard) {
				pluginsContainer.appendChild(pluginCard);
				pluginElements.push({ plugin, element: pluginCard, isDuplicate });
			}
		}
	}

	return {
		element: card,
		pluginsContainer,
		repo,
		plugins,
		pluginElements,
		emptyNotice,
	};
}

function createSectionDivider(title) {
	const divider = document.createElement("div");
	divider.className = "repo-section-divider";
	const heading = document.createElement("h2");
	heading.textContent = title;
	divider.appendChild(heading);
	return divider;
}

export function renderRepos(container, repos, officialPluginIds = new Set()) {
	container.innerHTML = "";
	const renderedRepos = [];

	const officialRepos = repos.filter((r) => r.official);
	const thirdPartyRepos = repos.filter((r) => !r.official);

	let officialDivider = null;
	if (officialRepos.length > 0) {
		officialDivider = createSectionDivider("Official Repository");
		container.appendChild(officialDivider);
		for (const repo of officialRepos) {
			const rendered = createRepoCard(repo, officialPluginIds);
			if (rendered) {
				container.appendChild(rendered.element);
				renderedRepos.push(rendered);
			}
		}
	}

	let thirdPartyDivider = null;
	if (thirdPartyRepos.length > 0) {
		thirdPartyDivider = createSectionDivider("Third-Party Repositories");
		container.appendChild(thirdPartyDivider);
		for (const repo of thirdPartyRepos) {
			const rendered = createRepoCard(repo, officialPluginIds);
			if (rendered) {
				container.appendChild(rendered.element);
				renderedRepos.push(rendered);
			}
		}
	}

	return {
		renderedRepos,
		officialDivider,
		thirdPartyDivider,
	};
}
