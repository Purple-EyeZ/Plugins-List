import * as api from "./admin-api.js";
import * as ui from "./admin-ui.js";
import { initSearch } from "./search.js";
import { hidePopup, showToast } from "./shared.js";

// --- State & DOM Elements ---

let plugins = [];
let originalPlugins = [];
let currentFilter = "all";

const pluginsList = document.getElementById("plugins-list");
const addPluginForm = document.getElementById("add-plugin-form");
const newPluginUrlInput = document.getElementById("new-plugin-url");
const saveChangesButton = document.getElementById("save-changes");
const checkPluginsButton = document.getElementById("check-plugins");
const filterButtons = {
	all: document.getElementById("filter-all"),
	broken: document.getElementById("filter-broken"),
	warning: document.getElementById("filter-warning"),
};
const counterElements = {
	total: document.getElementById("total-count"),
	working: document.getElementById("working-count"),
	warning: document.getElementById("warning-count"),
	broken: document.getElementById("broken-count"),
};

// --- Init Search ---
const search = initSearch({
	containerId: "plugins-list",
	itemClass: "admin-plugin-item",
	searchKeys: ["name", "authors", "description", "warningMessage"],
	priorityKey: "name",
	subtextMessage: (count) =>
		`Found ${count} matching plugin${count === 1 ? "" : "s"}`,
	renderFunction: rerender,
	displayStyle: "block",
});

// --- Utils ---

function generateChanges(original, current) {
	const changes = {
		added: [],
		deleted: [],
		modified: [],
	};

	const originalMap = new Map(original.map((p) => [p.installUrl, p]));
	const currentMap = new Map(current.map((p) => [p.installUrl, p]));

	// Detect added and modified plugins
	for (const [installUrl, currentPlugin] of currentMap.entries()) {
		const originalPlugin = originalMap.get(installUrl);
		if (!originalPlugin) {
			changes.added.push(currentPlugin);
		} else {
			const modifiedFields = [];
			for (const key in currentPlugin) {
				const originalValue = JSON.stringify(originalPlugin[key]);
				const currentValue = JSON.stringify(currentPlugin[key]);
				if (originalValue !== currentValue) {
					modifiedFields.push({
						field: key,
						oldValue: originalPlugin[key],
						newValue: currentPlugin[key],
					});
				}
			}
			if (modifiedFields.length > 0) {
				changes.modified.push({
					plugin: currentPlugin,
					fields: modifiedFields,
				});
			}
		}
	}

	// Detect deleted plugins
	for (const [installUrl, originalPlugin] of originalMap.entries()) {
		if (!currentMap.has(installUrl)) {
			changes.deleted.push(originalPlugin);
		}
	}

	return changes;
}

function generateSourceUrl(installUrl) {
	installUrl = installUrl.replace(/\/$/, "");

	// Extract from proxy URLs
	if (installUrl.includes("/proxy/")) {
		const actualUrl = installUrl.split("/proxy/")[1];
		if (actualUrl) {
			const githubIoMatch = actualUrl.match(/([^.]+)\.github\.io\/([^/]+)/);
			if (githubIoMatch) {
				const [, username, repo] = githubIoMatch;
				return `https://github.com/${username}/${repo}`;
			}

			const rawMatch = actualUrl.match(
				/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/,
			);
			if (rawMatch) {
				const [, username, repo] = rawMatch;
				return `https://github.com/${username}/${repo}`;
			}
		}
	}

	// Direct URL patterns
	if (installUrl.includes("github.io")) {
		const match = installUrl.match(/https?:\/\/([^.]+)\.github\.io\/([^/]+)/);
		if (match) {
			const [, username, repo] = match;
			return `https://github.com/${username}/${repo}`;
		}
	}

	if (installUrl.includes("raw.githubusercontent.com")) {
		const match = installUrl.match(
			/https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/,
		);
		if (match) {
			const [, username, repo] = match;
			return `https://github.com/${username}/${repo}`;
		}
	}

	return installUrl;
}

// --- Render Function ---

function rerender(isFromClear = false) {
	const { renderedPlugins, renderedElements } = ui.renderPluginsList(
		pluginsList,
		plugins,
		currentFilter,
		{
			onPluginUpdate,
			onPluginDelete,
			onPluginEdit,
		},
	);
	search.prepareSearchableData(renderedPlugins, renderedElements);

	const counts = {
		total: plugins.length,
		working: plugins.filter((p) => p.status === "working").length,
		warning: plugins.filter((p) => p.status === "warning").length,
		broken: plugins.filter((p) => p.status === "broken").length,
	};
	ui.updateCounters(
		counterElements.total,
		counterElements.working,
		counterElements.warning,
		counterElements.broken,
		counts,
	);

	if (!isFromClear) {
		search.filterItems(search.getCurrentValue());
	}
}

// --- UI Event Handlers ---

function onPluginUpdate(plugin, field, value) {
	plugin[field] = value;

	if (field === "status") {
		rerender();
	}
}

function onPluginDelete(pluginToDelete) {
	if (confirm(`Delete plugin "${pluginToDelete.name}"?`)) {
		plugins = plugins.filter((p) => p !== pluginToDelete);
		rerender();
	}
}

function onPluginEdit(plugin) {
	const refetchHandler = async (pluginToRefetch, field) => {
		const success = await api.refetchPluginField(
			pluginToRefetch,
			field,
			generateSourceUrl,
		);
		if (success) rerender();
		return success;
	};

	ui.showPluginDetailsPopup(
		plugin,
		(updatedPlugin) => {
			const index = plugins.indexOf(plugin);
			if (index !== -1) {
				plugins[index] = { ...plugins[index], ...updatedPlugin };
			}
			rerender();
			showToast("Plugin details updated!");
		},
		refetchHandler,
	);
}

// --- DOM Event Listeners ---

addPluginForm.addEventListener("submit", async (e) => {
	e.preventDefault();
	const url = newPluginUrlInput.value.trim();
	if (!url) return;

	try {
		const newPlugin = await api.createPluginFromUrl(url, generateSourceUrl);
		plugins.push(newPlugin);
		rerender();
		newPluginUrlInput.value = "";
		showToast("Plugin added successfully!");
	} catch (error) {
		showToast(`Error adding plugin: ${error.message}`);
	}
});

saveChangesButton.addEventListener("click", async () => {
	const changes = generateChanges(originalPlugins, plugins);
	const hasChanges =
		changes.added.length > 0 ||
		changes.deleted.length > 0 ||
		changes.modified.length > 0;

	if (!hasChanges) {
		showToast("No changes to save.");
		return;
	}

	const showReview = () => {
		const currentChanges = generateChanges(originalPlugins, plugins);
		ui.showChangesReviewPopup(
			currentChanges,
			async () => {
				try {
					const result = await api.savePlugins(plugins);
					showToast(result.message || "Changes saved successfully!");
					originalPlugins = JSON.parse(JSON.stringify(plugins));
				} catch (error) {
					showToast(`Error saving changes: ${error.message}`);
				}
			},
			(installUrl, field) => {
				const originalPlugin = originalPlugins.find(
					(p) => p.installUrl === installUrl,
				);
				const pluginToUpdate = plugins.find((p) => p.installUrl === installUrl);

				if (pluginToUpdate && originalPlugin) {
					pluginToUpdate[field] = originalPlugin[field];
					rerender();
					hidePopup();
					showReview();
					showToast(`Reverted change for ${pluginToUpdate.name}'s ${field}.`);
				}
			},
		);
	};

	showReview();
});

checkPluginsButton.addEventListener("click", async () => {
	console.group("Updating plugin manifests...");
	const { updatedCount, failedCount } = await api.updateAllManifests(plugins);
	console.log("\nUpdate summary:");
	console.log(`✅ Successfully updated: ${updatedCount} plugins`);
	console.log(`❌ Failed to update: ${failedCount} plugins`);
	console.groupEnd();
	rerender();
	showToast(`Updated ${updatedCount} plugins (${failedCount} failed)`);
});

Object.entries(filterButtons).forEach(([filterName, button]) => {
	button.addEventListener("click", () => {
		currentFilter = filterName;
		Object.values(filterButtons).forEach((btn) => {
			btn.classList.remove("active");
		});
		button.classList.add("active");
		rerender();
	});
});

// --- Init ---

async function init() {
	try {
		originalPlugins = await api.fetchPlugins();
		plugins = JSON.parse(JSON.stringify(originalPlugins));
		filterButtons.all.classList.add("active");
		rerender();
		search.initSearchFromURL();
	} catch (error) {
		showToast(`Error loading plugins: ${error.message}`);
	}
}

init();
