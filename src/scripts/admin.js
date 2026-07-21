import * as api from "./admin-api.js";
import * as ui from "./admin-ui.js";
import { initSearch } from "./search.js";
import { hidePopup, showToast } from "./shared.js";

// --- State & DOM Elements ---

let currentTab = "plugins";
let pendingFiles = [];

let plugins = [];
let originalPlugins = [];
let currentFilter = "all";

let themes = [];
let originalThemes = [];

const pluginsSection = document.getElementById("plugins-section");
const themesSection = document.getElementById("themes-section");

const pluginsList = document.getElementById("plugins-list");
const addPluginForm = document.getElementById("add-plugin-form");
const newPluginUrlInput = document.getElementById("new-plugin-url");
const savePluginsButton = document.getElementById("save-plugins-changes");
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

const themesList = document.getElementById("themes-list");
const addThemeForm = document.getElementById("add-theme-form");
const newThemeUrlInput = document.getElementById("new-theme-url");
const saveThemesButton = document.getElementById("save-themes-changes");
const checkThemesButton = document.getElementById("check-themes");
const themesTotalCount = document.getElementById("themes-total-count");

const tabPlugins = document.getElementById("tab-plugins");
const tabThemes = document.getElementById("tab-themes");

// --- Init Search ---
let search = initSearch({
	containerId: "plugins-list",
	itemClass: "admin-plugin-item",
	searchKeys: ["name", "authors", "description", "warningMessage"],
	priorityKey: "name",
	subtextMessage: (count) =>
		`Found ${count} matching plugin${count === 1 ? "" : "s"}`,
	renderFunction: rerenderPlugins,
	displayStyle: "block",
});

function updateSearchConfig() {
	if (currentTab === "plugins") {
		search = initSearch({
			containerId: "plugins-list",
			itemClass: "admin-plugin-item",
			searchKeys: ["name", "authors", "description", "warningMessage"],
			priorityKey: "name",
			subtextMessage: (count) =>
				`Found ${count} matching plugin${count === 1 ? "" : "s"}`,
			renderFunction: rerenderPlugins,
			displayStyle: "block",
		});
		rerenderPlugins();
	} else if (currentTab === "themes") {
		search = initSearch({
			containerId: "themes-list",
			itemClass: "admin-theme-item",
			searchKeys: ["name", "authors", "description", "tags"],
			priorityKey: "name",
			subtextMessage: (count) =>
				`Found ${count} matching theme${count === 1 ? "" : "s"}`,
			renderFunction: rerenderThemes,
			displayStyle: "block",
		});
		rerenderThemes();
	}
}

// --- Tabs Logic ---
tabPlugins.addEventListener("click", (e) => {
	e.preventDefault();
	if (currentTab === "plugins") return;
	currentTab = "plugins";
	tabPlugins.classList.add("active");
	tabThemes.classList.remove("active");
	pluginsSection.style.display = "block";
	themesSection.style.display = "none";
	updateSearchConfig();
});

tabThemes.addEventListener("click", (e) => {
	e.preventDefault();
	if (currentTab === "themes") return;
	currentTab = "themes";
	tabThemes.classList.add("active");
	tabPlugins.classList.remove("active");
	pluginsSection.style.display = "none";
	themesSection.style.display = "block";
	updateSearchConfig();
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

// --- Render Functions ---

function rerenderPlugins(isFromClear = false) {
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

	if (currentTab === "plugins") {
		search.prepareSearchableData(renderedPlugins, renderedElements);
	}

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

	if (!isFromClear && currentTab === "plugins") {
		search.applyCurrentFilter();
	}
}

function rerenderThemes(isFromClear = false) {
	const { renderedThemes, renderedElements } = ui.renderThemesList(
		themesList,
		themes,
		{
			onThemeDelete,
			onThemeEdit,
		},
	);

	if (currentTab === "themes") {
		search.prepareSearchableData(renderedThemes, renderedElements);
	}

	themesTotalCount.textContent = themes.length;

	if (!isFromClear && currentTab === "themes") {
		search.applyCurrentFilter();
	}
}

// --- UI Event Handlers ---

function onPluginUpdate(plugin, field, value) {
	plugin[field] = value;

	if (field === "status") {
		rerenderPlugins();
	}
}

function onPluginDelete(pluginToDelete) {
	if (confirm(`Delete plugin "${pluginToDelete.name}"?`)) {
		plugins = plugins.filter((p) => p !== pluginToDelete);
		rerenderPlugins();
	}
}

function onPluginEdit(plugin) {
	const refetchHandler = async (pluginToRefetch, field) => {
		const success = await api.refetchPluginField(
			pluginToRefetch,
			field,
			generateSourceUrl,
		);
		if (success) rerenderPlugins();
		return success;
	};

	ui.showDetailsPopup(
		plugin,
		(updatedPlugin) => {
			const index = plugins.indexOf(plugin);
			if (index !== -1) {
				plugins[index] = { ...plugins[index], ...updatedPlugin };
			}
			rerenderPlugins();
			showToast("Plugin details updated!");
		},
		refetchHandler,
		false,
	);
}

function onThemeImageUpload(theme, file) {
	if (!file) return;

	const reader = new FileReader();
	reader.onload = (event) => {
		const base64Content = event.target.result.split(",")[1];
		const filePath = `src/assets/Themes_preview/${file.name.replace(/\s+/g, "_")}`;

		theme.images.push(
			`https://raw.githubusercontent.com/Purple-EyeZ/Plugins-List/refs/heads/dev/${filePath}`,
		);

		pendingFiles.push({
			path: filePath,
			content: base64Content,
			encoding: "base64",
		});

		rerenderThemes();
		showToast("Image preview added locally! Will be uploaded on save.");
	};
	reader.readAsDataURL(file);
}

function onThemeDelete(themeToDelete) {
	if (confirm(`Delete theme "${themeToDelete.name}"?`)) {
		themes = themes.filter((t) => t !== themeToDelete);
		rerenderThemes();
	}
}

function onThemeEdit(theme) {
	const refetchHandler = async (themeToRefetch, field) => {
		try {
			if (field === "sourceUrl") {
				themeToRefetch.sourceUrl = generateSourceUrl(themeToRefetch.installUrl);
				return true;
			}
			const response = await fetch(themeToRefetch.installUrl);
			if (!response.ok) return false;
			const manifest = await response.json();

			switch (field) {
				case "name":
					themeToRefetch.name = manifest.name;
					break;
				case "description":
					themeToRefetch.description = manifest.description;
					break;
				case "authors":
					themeToRefetch.authors = manifest.authors?.map(
						(author) => author.name,
					) || ["Unknown"];
					break;
				default:
					return false;
			}
			return true;
		} catch (_error) {
			return false;
		}
	};

	ui.showDetailsPopup(
		theme,
		(updatedTheme) => {
			const processedImages = [];
			updatedTheme.images.forEach((img) => {
				if (typeof img === "string") {
					processedImages.push(img);
				} else if (img.isNew) {
					const filePath = `src/assets/Themes_preview/${img.name.replace(/\s+/g, "_")}`;
					processedImages.push(
						`https://raw.githubusercontent.com/Purple-EyeZ/Plugins-List/refs/heads/dev/${filePath}`,
					);

					pendingFiles.push({
						path: filePath,
						content: img.base64,
						encoding: "base64",
					});
				}
			});
			updatedTheme.images = processedImages;

			const index = themes.indexOf(theme);
			if (index !== -1) {
				themes[index] = { ...themes[index], ...updatedTheme };
			}
			rerenderThemes();
			showToast("Theme details updated!");
		},
		refetchHandler,
		true,
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
		rerenderPlugins();
		newPluginUrlInput.value = "";
		showToast("Plugin added successfully!");
	} catch (error) {
		showToast(`Error adding plugin: ${error.message}`);
	}
});

addThemeForm.addEventListener("submit", async (e) => {
	e.preventDefault();
	const url = newThemeUrlInput.value.trim();
	if (!url) return;

	try {
		const newTheme = await api.createThemeFromUrl(url, generateSourceUrl);
		themes.push(newTheme);
		rerenderThemes();
		newThemeUrlInput.value = "";
		showToast("Theme added successfully!");
	} catch (error) {
		showToast(`Error adding theme: ${error.message}`);
	}
});

savePluginsButton.addEventListener("click", async () => {
	const changes = generateChanges(originalPlugins, plugins);
	const hasChanges =
		changes.added.length > 0 ||
		changes.deleted.length > 0 ||
		changes.modified.length > 0;

	const themePreviewPrefix = "src/assets/Themes_preview/";
	const pluginPendingFiles = pendingFiles.filter(
		(f) => !f.path.startsWith(themePreviewPrefix),
	);

	if (!hasChanges && pluginPendingFiles.length === 0) {
		showToast("No plugins changes to save.");
		return;
	}

	const showReview = () => {
		const currentChanges = generateChanges(originalPlugins, plugins);
		ui.showChangesReviewPopup(
			currentChanges,
			async () => {
				try {
					const filesToCommit = [
						...pluginPendingFiles,
						{
							path: "src/plugins-data.json",
							content: JSON.stringify(plugins, null, 4),
							encoding: "utf-8",
						},
					];
					const result = await api.commitFiles(
						"📝 Update plugins from Admin UI",
						filesToCommit,
					);
					showToast(result.message || "Changes saved successfully!");
					originalPlugins = JSON.parse(JSON.stringify(plugins));
					pendingFiles = pendingFiles.filter((f) =>
						f.path.startsWith(themePreviewPrefix),
					);
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
					rerenderPlugins();
					hidePopup();
					showReview();
					showToast(`Reverted change for ${pluginToUpdate.name}'s ${field}.`);
				}
			},
			"Plugins",
		);
	};

	showReview();
});

saveThemesButton.addEventListener("click", async () => {
	const changes = generateChanges(originalThemes, themes);
	const hasChanges =
		changes.added.length > 0 ||
		changes.deleted.length > 0 ||
		changes.modified.length > 0;

	const themePreviewPrefix = "src/assets/Themes_preview/";
	const themePendingFiles = pendingFiles.filter((f) =>
		f.path.startsWith(themePreviewPrefix),
	);

	if (!hasChanges && themePendingFiles.length === 0) {
		showToast("No themes changes to save.");
		return;
	}

	const showReview = () => {
		const currentChanges = generateChanges(originalThemes, themes);
		ui.showChangesReviewPopup(
			currentChanges,
			async () => {
				try {
					const filesToCommit = [
						...themePendingFiles,
						{
							path: "src/themes-data.json",
							content: JSON.stringify(themes, null, 4),
							encoding: "utf-8",
						},
					];
					const result = await api.commitFiles(
						"🎨 Update themes from Admin UI",
						filesToCommit,
					);
					showToast(result.message || "Changes saved successfully!");
					originalThemes = JSON.parse(JSON.stringify(themes));
					pendingFiles = pendingFiles.filter(
						(f) => !f.path.startsWith(themePreviewPrefix),
					);
				} catch (error) {
					showToast(`Error saving changes: ${error.message}`);
				}
			},
			(installUrl, field) => {
				const originalTheme = originalThemes.find(
					(p) => p.installUrl === installUrl,
				);
				const themeToUpdate = themes.find((p) => p.installUrl === installUrl);

				if (themeToUpdate && originalTheme) {
					themeToUpdate[field] = originalTheme[field];
					rerenderThemes();
					hidePopup();
					showReview();
					showToast(`Reverted change for ${themeToUpdate.name}'s ${field}.`);
				}
			},
			"Themes",
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
	rerenderPlugins();
	showToast(`Updated ${updatedCount} plugins (${failedCount} failed)`);
});

checkThemesButton.addEventListener("click", async () => {
	console.group("Updating theme manifests...");
	const { updatedCount, failedCount } =
		await api.updateAllThemesManifests(themes);
	console.log("\nUpdate summary:");
	console.log(`✅ Successfully updated: ${updatedCount} themes`);
	console.log(`❌ Failed to update: ${failedCount} themes`);
	console.groupEnd();
	rerenderThemes();
	showToast(`Updated ${updatedCount} themes (${failedCount} failed)`);
});

Object.entries(filterButtons).forEach(([filterName, button]) => {
	button.addEventListener("click", () => {
		currentFilter = filterName;
		Object.values(filterButtons).forEach((btn) => {
			btn.classList.remove("active");
		});
		button.classList.add("active");
		rerenderPlugins();
	});
});

// --- Init ---

async function init() {
	try {
		const [loadedPlugins, loadedThemes] = await Promise.all([
			api.fetchPlugins(),
			api.fetchThemes(),
		]);
		originalPlugins = loadedPlugins;
		plugins = JSON.parse(JSON.stringify(originalPlugins));

		originalThemes = loadedThemes;
		themes = JSON.parse(JSON.stringify(originalThemes));

		filterButtons.all.classList.add("active");
		search.initSearchFromURL();
		rerenderPlugins();
		rerenderThemes();
	} catch (error) {
		showToast(`Error loading data: ${error.message}`);
	}
}

init();
