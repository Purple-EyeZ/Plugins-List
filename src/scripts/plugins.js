import * as ui from "./plugins-ui.js";
import {
	filterPlugins,
	initSearchFromURL,
	invalidateSearchCache,
	prepareSearchableData,
	searchState,
} from "./search.js";

// --- State & DOM Elements ---

let allPlugins = [];
let currentSort = "default";
let showBroken = true;

const pluginsContainer = document.getElementById("plugins-container");
const featuredPluginContainer = document.getElementById(
	"featured-plugin-container",
);
const sortSelect = document.getElementById("sort-select");
const showBrokenToggle = document.getElementById("show-broken");

// --- Data Logic ---

/**
 * Compares current plugins with a version stored in localStorage
 * to detect what has changed since the user's last visit.
 * @param {Array<object>} currentPlugins The newly fetched list of plugins.
 * @returns {object|null} An object with 'updated' and 'added' arrays, or null.
 */
function analyzePluginChanges(currentPlugins) {
	const previousStateJSON = localStorage.getItem("previousPluginsState");
	const currentStateJSON = JSON.stringify(currentPlugins);

	localStorage.setItem("previousPluginsState", currentStateJSON);

	if (!previousStateJSON) return null;

	const previousPlugins = JSON.parse(previousStateJSON);
	const previousPluginsMap = new Map(previousPlugins.map((p) => [p.name, p]));

	const changes = { updated: [], added: [] };

	for (const plugin of currentPlugins) {
		const prevPlugin = previousPluginsMap.get(plugin.name);
		if (prevPlugin) {
			if (prevPlugin.status !== plugin.status) {
				changes.updated.push({
					name: plugin.name,
					oldStatus: prevPlugin.status,
					newStatus: plugin.status,
				});
			}
		} else {
			changes.added.push(plugin);
		}
	}
	return changes;
}

// --- Render ---

function rerender() {
	if (!pluginsContainer) return;

	invalidateSearchCache();
	const { renderedPlugins, renderedElements } = ui.renderPlugins(
		pluginsContainer,
		allPlugins,
		currentSort,
		showBroken,
	);

	prepareSearchableData(renderedPlugins, renderedElements);
	filterPlugins(searchState.currentValue);
}

// --- Initialization ---

async function init() {
	currentSort = sortSelect ? sortSelect.value : "default";
	showBroken = showBrokenToggle ? showBrokenToggle.checked : true;

	try {
		const response = await fetch("/plugins-data.json");
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		allPlugins = await response.json();

		const featuredPlugin = allPlugins.find((p) => p.name === "Plugins List");
		ui.renderFeaturedPlugin(featuredPluginContainer, featuredPlugin);

		const changes = analyzePluginChanges(allPlugins);
		ui.showChangesPopup(changes);

		rerender();
		initSearchFromURL();
	} catch (error) {
		console.error("Error loading plugins data:", error);
		if (pluginsContainer) {
			pluginsContainer.innerHTML =
				'<div class="error-message">Failed to load plugins. Please try again later.</div>';
		}
	}
}

// --- Event Listeners ---

function initEventListeners() {
	if (sortSelect) {
		sortSelect.addEventListener("change", (e) => {
			currentSort = e.target.value;
			rerender();
		});
	}
	if (showBrokenToggle) {
		showBrokenToggle.addEventListener("change", (e) => {
			showBroken = e.target.checked;
			rerender();
		});
	}
}

// Start
window.renderPlugins = rerender;
init();
initEventListeners();
