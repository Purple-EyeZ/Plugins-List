import fuzzysort from "fuzzysort";

const DEBOUNCE = 150;

// --- State & DOM Elements ---
export const searchState = {
	currentValue: "",
	wasCleared: false,
};

const elements = {
	searchBar: document.getElementById("search-bar"),
	fixedSearchBar: document.getElementById("fixedSearchBar"),
	clearButton: document.getElementById("clearSearch"),
	clearButtonFixed: document.getElementById("clearFixedSearch"),
	searchButton: document.getElementById("searchButton"),
	container:
		document.getElementById("plugins-container") ||
		document.getElementById("plugins-list"),
	featuredPluginContainer: document.getElementById("featured-plugin-container"),
};

// --- Search Data ---
let searchablePlugins = [];

/**
 * Builds the search cache from raw plugin data and DOM elements.
 * @param {Array<object>} pluginsData The raw array of plugin objects.
 * @param {Array<HTMLElement>} pluginElements The array of corresponding DOM elements.
 */
export function prepareSearchableData(pluginsData, pluginElements) {
	const elementMap = new Map(pluginElements.map((el, i) => [i, el]));

	searchablePlugins = pluginsData.map((plugin, index) => {
		return {
			element: elementMap.get(index),
			name: normalizeText(plugin.name),
			description: normalizeText(plugin.description),
			author: normalizeText(plugin.authors?.join(", ")),
			warningMessage: normalizeText(plugin.warningMessage),
		};
	});
}

/**
 * Explicitly invalidates the search cache. Should be called before a rerender.
 */
export function invalidateSearchCache() {
	searchablePlugins = [];
}

// --- Search Logic ---

function normalizeText(text) {
	if (!text) return "";
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function filterPlugins(query) {
	const isAdminPage = elements.container.id === "plugins-list";
	const itemsSelector = isAdminPage ? "admin-plugin-item" : "plugin-card";
	const allItemsInDom = Array.from(
		elements.container.getElementsByClassName(itemsSelector),
	);

	const normalizedQuery = normalizeText(query);

	if (!normalizedQuery) {
		for (const { element } of searchablePlugins) {
			element.style.display = isAdminPage ? "block" : "flex";
		}
		if (isAdminPage) {
			for (const item of allItemsInDom) {
				elements.container.appendChild(item);
			}
		}
		updateSearchSubtext("", allItemsInDom.length);
		return;
	}

	const keys = isAdminPage
		? ["name", "warningMessage"]
		: ["name", "author", "description"];

	const results = fuzzysort.go(normalizedQuery, searchablePlugins, {
		keys: keys,
	});

	// Sort results: name matches first, then by score
	results.sort((a, b) => {
		const aNameResult = fuzzysort.single(normalizedQuery, a.obj.name);
		const bNameResult = fuzzysort.single(normalizedQuery, b.obj.name);

		const aHasNameMatch = aNameResult !== null;
		const bHasNameMatch = bNameResult !== null;

		if (aHasNameMatch && !bHasNameMatch) return -1;
		if (!aHasNameMatch && bHasNameMatch) return 1;

		if (aHasNameMatch && bHasNameMatch) {
			return bNameResult.score - aNameResult.score;
		}

		return b.score - a.score;
	});

	for (const { element } of searchablePlugins) {
		element.style.display = "none";
	}

	const visibleItems = [];
	for (const result of results) {
		const { element } = result.obj;
		element.style.display = isAdminPage ? "block" : "flex";
		elements.container.appendChild(element);
		visibleItems.push(element);
	}

	updateSearchSubtext(query, visibleItems.length);
}

// --- UI Sync & Event Handlers ---

function updateSearchState(value) {
	searchState.currentValue = value;

	for (const bar of [elements.searchBar, elements.fixedSearchBar]) {
		if (bar) {
			bar.value = value;
			toggleClearButton(bar, value);
		}
	}

	const url = new URL(window.location);
	if (value) {
		url.searchParams.set("q", value);
	} else {
		url.searchParams.delete("q");
	}
	window.history.replaceState({}, "", url);

	handleFeaturedPluginVisibility(value);
}

function updateSearchSubtext(query, cardsOrCount) {
	const subtext = document.getElementById("searchSubtext");
	if (!subtext) return;

	if (!query) {
		subtext.textContent = "";
		subtext.classList.remove("visible");
		return;
	}

	const count =
		typeof cardsOrCount === "number"
			? cardsOrCount
			: cardsOrCount.filter((card) => card.style.display !== "none").length;

	const message = `Found ${count} matching plugin${count === 1 ? "" : "s"}`;
	subtext.textContent = message;
	subtext.classList.add("visible");
}

function handleFeaturedPluginVisibility(query) {
	if (elements.featuredPluginContainer) {
		const featuredCard = elements.featuredPluginContainer.querySelector(
			".featured-plugin-card",
		);
		if (featuredCard) {
			if (query && query.trim() !== "") {
				if (featuredCard.classList.contains("expanded")) {
					featuredCard.classList.remove("expanded");
				}
			}
		}
	}
}

function debounce(func, wait) {
	let timeout;
	const debounced = (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
	debounced.cancel = () => {
		clearTimeout(timeout);
	};
	return debounced;
}

function addSearchFunctionality() {
	const { searchBar, fixedSearchBar, clearButton, clearButtonFixed } = elements;

	const handleSearchInput = (e) => {
		const value = e.target.value;
		searchState.wasCleared = false;
		updateSearchState(value);

		const isAdminPage = elements.container.id === "plugins-list";
		if (value === "" && !isAdminPage) {
			debouncedFilter.cancel();
			window.renderPlugins();
		} else {
			debouncedFilter(value);
		}
	};

	for (const bar of [searchBar, fixedSearchBar]) {
		if (bar) {
			bar.addEventListener("input", handleSearchInput);
		}
	}

	const clearSearch = (input) => {
		searchState.wasCleared = true;
		updateSearchState("");

		const isAdminPage = elements.container.id === "plugins-list";
		if (!isAdminPage && window.renderPlugins) {
			window.renderPlugins();
		} else {
			filterPlugins("");
		}

		if (input) {
			input.focus();
		}
	};

	for (const { button, input } of [
		{ button: clearButton, input: searchBar },
		{ button: clearButtonFixed, input: fixedSearchBar },
	]) {
		if (button) {
			button.addEventListener("click", () => clearSearch(input));
		}
	}
}

function toggleClearButton(inputElement, value) {
	const clearButton =
		elements[
			inputElement.id === "search-bar" ? "clearButton" : "clearButtonFixed"
		];
	if (!clearButton) return;

	const shouldShow =
		value.length > 0 &&
		(inputElement.id !== "fixedSearchBar" ||
			inputElement.classList.contains("show"));

	clearButton.style.display = shouldShow ? "block" : "none";
}

function addSearchButtonEvent() {
	const { searchButton, fixedSearchBar, clearButtonFixed } = elements;

	searchButton?.addEventListener("click", () => {
		const isHidden = fixedSearchBar.classList.contains("hidden");
		fixedSearchBar.classList.toggle("hidden", !isHidden);
		fixedSearchBar.classList.toggle("show", isHidden);

		if (isHidden) {
			fixedSearchBar.focus();
			clearButtonFixed.style.display =
				fixedSearchBar.value.length > 0 ? "block" : "none";
		} else {
			clearButtonFixed.style.display = "none";
		}
	});
}

// --- Public Functions ---

export const isFixedSearchFocused = () =>
	document.activeElement === elements.fixedSearchBar;

export function initSearchFromURL() {
	const urlParams = new URLSearchParams(window.location.search);
	const searchQuery = urlParams.get("q");

	if (searchQuery) {
		updateSearchState(searchQuery);
		filterPlugins(searchQuery);
	}
}

const debouncedFilter = debounce(filterPlugins, DEBOUNCE);

// --- Init ---

document.addEventListener("DOMContentLoaded", () => {
	addSearchFunctionality();
	addSearchButtonEvent();
});
