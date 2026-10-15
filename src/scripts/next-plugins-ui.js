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

function createPluginCard(plugin) {
	const template = document.getElementById("repo-plugin-card-template");
	if (!template) return null;

	const card = template.content
		.cloneNode(true)
		.querySelector(".repo-plugin-card");
	if (!card) return null;

	card.querySelector(".plugin-name").textContent = plugin.name;
	card.querySelector(".plugin-author").textContent = `By: ${plugin.author}`;
	card.querySelector(".plugin-description").textContent = plugin.description;

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

export function createRepoCard(repo) {
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
		countBadge.textContent = `${plugins.length} plugin${plugins.length === 1 ? "" : "s"}`;
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
		copyBtn.addEventListener("click", () => {
			copyToClipboard(repo.url);
			showToast(`Link for ${repoName} copied to clipboard!`);
		});
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
			const pluginCard = createPluginCard(plugin);
			if (pluginCard) {
				pluginsContainer.appendChild(pluginCard);
				pluginElements.push({ plugin, element: pluginCard });
			}
		}
	}

	return {
		element: card,
		repo,
		plugins,
		pluginElements,
	};
}

export function renderRepos(container, repos) {
	container.innerHTML = "";
	const renderedRepos = [];

	for (const repo of repos) {
		const rendered = createRepoCard(repo);
		if (rendered) {
			container.appendChild(rendered.element);
			renderedRepos.push(rendered);
		}
	}

	return renderedRepos;
}
