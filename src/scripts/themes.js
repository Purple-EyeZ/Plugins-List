import { initSearch } from "./search.js";
import * as ui from "./themes-ui.js";
import "./shared.js";
import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-zoom.css";

// --- State & DOM Elements ---
let allThemes = [];
const activeTags = new Set();

const DEFAULT_SORT = "newest";
let currentSort = DEFAULT_SORT;

const themesContainer = document.getElementById("themes-container");
const sortSelect = document.getElementById("sort-select");
const filterButton = document.getElementById("filter-button");
const filterDrawer = document.getElementById("filter-drawer");
const tagFiltersContainer = document.getElementById("tag-filters");
const noResultsMessage = document.getElementById("no-results-message");
const clearFiltersButton = document.getElementById("clear-filters-button");

const PRIORITY_TAGS = ["amoled", "dark", "themes plus", "light"];

// --- Init Search ---
const search = initSearch({
	containerId: "themes-container",
	itemClass: "theme-card",
	searchKeys: ["name", "authors", "description", "tags"],
	priorityKey: "name",
	subtextMessage: (count) =>
		`Found ${count} matching theme${count === 1 ? "" : "s"}`,
	renderFunction: rerender,
	displayStyle: "flex",
});

function sortThemes(themes) {
	switch (currentSort) {
		case "alphabetical":
			return [...themes].sort((a, b) => a.name.localeCompare(b.name));
		case "oldest":
			return themes;
		default:
			return [...themes].reverse();
	}
}

function filterThemes(themes) {
	if (activeTags.size === 0) {
		return themes;
	}
	return themes.filter((theme) => {
		const themeTags = new Set((theme.tags || []).map((t) => t.toLowerCase()));
		return [...activeTags].every((activeTag) => themeTags.has(activeTag));
	});
}

function rerender(isFromClear = false) {
	if (!themesContainer) return;

	const filteredThemes = filterThemes(allThemes);
	const sortedThemes = sortThemes(filteredThemes);

	ui.renderThemes(themesContainer, sortedThemes);

	noResultsMessage.style.display = sortedThemes.length === 0 ? "flex" : "none";

	const renderedElements = Array.from(
		themesContainer.getElementsByClassName("theme-card"),
	);
	search.prepareSearchableData(sortedThemes, renderedElements);

	if (!isFromClear) {
		search.filterItems(search.getCurrentValue());
	}
}

async function init() {
	currentSort = sortSelect ? sortSelect.value : DEFAULT_SORT;

	try {
		const response = await fetch("/themes-data.json");
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		allThemes = await response.json();

		initFilters();
		rerender();
		search.initSearchFromURL();
	} catch (error) {
		console.error("Error loading themes data:", error);
		if (themesContainer) {
			themesContainer.innerHTML =
				'<div class="error-message">Failed to load themes. Please try again later.</div>';
		}
	}
}

function initFilters() {
	const allTags = new Set(
		allThemes.flatMap((theme) =>
			(theme.tags || []).map((t) => t.toLowerCase()),
		),
	);

	const sortedTags = [...allTags].sort((a, b) => {
		const aIndex = PRIORITY_TAGS.indexOf(a);
		const bIndex = PRIORITY_TAGS.indexOf(b);

		if (aIndex !== -1 && bIndex !== -1) {
			return aIndex - bIndex;
		}
		if (aIndex !== -1) {
			return -1;
		}
		if (bIndex !== -1) {
			return 1;
		}
		return a.localeCompare(b);
	});

	for (const tag of sortedTags) {
		const label = document.createElement("label");
		label.className = "filter-checkbox";
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.value = tag;
		checkbox.addEventListener("change", (e) => {
			if (e.target.checked) {
				activeTags.add(tag);
			} else {
				activeTags.delete(tag);
			}
			rerender();
		});

		label.appendChild(checkbox);
		label.append(tag.charAt(0).toUpperCase() + tag.slice(1));
		tagFiltersContainer.appendChild(label);
	}
}

function initEventListeners() {
	if (sortSelect) {
		sortSelect.addEventListener("change", (e) => {
			currentSort = e.target.value;
			rerender();
		});
	}

	if (filterButton) {
		filterButton.addEventListener("click", () => {
			filterDrawer.classList.toggle("open");
		});
	}

	if (clearFiltersButton) {
		clearFiltersButton.addEventListener("click", () => {
			activeTags.clear();
			tagFiltersContainer
				.querySelectorAll('input[type="checkbox"]')
				.forEach((cb) => {
					cb.checked = false;
				});
			rerender();
		});
	}
}

// Start
init();
initEventListeners();
