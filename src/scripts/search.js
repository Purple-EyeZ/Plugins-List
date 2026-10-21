import fuzzysort from "fuzzysort";

const DEBOUNCE = 150;

let searchableItems = [];
let config = {};
let elements = {};
const searchState = { currentValue: "" };

export const isFixedSearchFocused = () =>
	document.activeElement === elements.fixedSearchBar;

export function normalizeText(text) {
	if (!text) return "";
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function createSearchableItem(item, keys, extra = {}) {
	const prepared = { ...extra };
	for (const key of keys) {
		const value = item ? item[key] : "";
		prepared[key] = Array.isArray(value)
			? normalizeText(value.join(" "))
			: normalizeText(value);
	}
	return prepared;
}

export function sortSearchResults(results, query, priorityKey) {
	if (!priorityKey || !query || !results || results.length === 0)
		return results;
	const normalizedQuery = normalizeText(query);
	return results.sort((a, b) => {
		const aPriorityResult = fuzzysort.single(
			normalizedQuery,
			a.obj[priorityKey],
		);
		const bPriorityResult = fuzzysort.single(
			normalizedQuery,
			b.obj[priorityKey],
		);

		const aHasPriorityMatch = aPriorityResult !== null;
		const bHasPriorityMatch = bPriorityResult !== null;

		if (aHasPriorityMatch && !bHasPriorityMatch) return -1;
		if (!aHasPriorityMatch && bHasPriorityMatch) return 1;
		if (aHasPriorityMatch && bHasPriorityMatch) {
			return bPriorityResult.score - aPriorityResult.score;
		}
		return b.score - a.score;
	});
}

export function fuzzySearch(query, targets, options = {}) {
	const normalizedQuery = normalizeText(query);
	if (!normalizedQuery || !targets || targets.length === 0) return [];

	const { keys, priorityKey, threshold } = options;
	const fuzzysortOptions = {};
	if (keys) fuzzysortOptions.keys = keys;
	if (threshold !== undefined) fuzzysortOptions.threshold = threshold;

	const results = fuzzysort.go(normalizedQuery, targets, fuzzysortOptions);

	if (priorityKey) {
		sortSearchResults(results, normalizedQuery, priorityKey);
	}

	return results;
}

export function fuzzyMatch(query, target) {
	if (!query || !target) return null;
	return fuzzysort.single(normalizeText(query), normalizeText(target));
}

function prepareSearchableData(itemsData, itemElements) {
	const elementMap = new Map(itemElements.map((el, i) => [i, el]));

	searchableItems = itemsData.map((item, index) =>
		createSearchableItem(item, config.searchKeys, {
			element: elementMap.get(index),
		}),
	);
}

function filterItems(query) {
	const allItemsInDom = Array.from(
		elements.container.getElementsByClassName(config.itemClass),
	);
	const normalizedQuery = normalizeText(query);

	if (!normalizedQuery) {
		allItemsInDom.forEach((el) => {
			el.style.display = config.displayStyle || "flex";
		});
		updateSearchSubtext("", allItemsInDom.length);
		return;
	}

	const results = fuzzySearch(normalizedQuery, searchableItems, {
		keys: config.searchKeys,
		priorityKey: config.priorityKey || config.searchKeys[0],
		threshold: config.threshold,
	});

	allItemsInDom.forEach((el) => {
		el.style.display = "none";
	});

	const visibleElements = [];
	for (const result of results) {
		const { element } = result.obj;
		element.style.display = config.displayStyle || "flex";
		elements.container.appendChild(element);
		visibleElements.push(element);
	}

	updateSearchSubtext(query, visibleElements.length);
}

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
		updateSearchSubtext("", 0);
	}
	window.history.replaceState({}, "", url);
}

function updateSearchSubtext(query, count) {
	if (!elements.subtext) return;
	if (!query) {
		elements.subtext.textContent = "";
		elements.subtext.classList.remove("visible");
		return;
	}
	elements.subtext.textContent = config.subtextMessage(count);
	elements.subtext.classList.add("visible");
}

function toggleClearButton(inputElement, value) {
	if (!inputElement) return;
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

function runFilter(query) {
	if (typeof config.filterFunction === "function") {
		config.filterFunction(query);
	} else {
		filterItems(query);
	}
}

const debouncedFilter = debounce(runFilter, DEBOUNCE);

function addSearchFunctionality() {
	const handleSearchInput = (e) => {
		const value = e.target.value;
		updateSearchState(value);

		if (value === "") {
			debouncedFilter.cancel();
			if (typeof config.renderFunction === "function") {
				config.renderFunction(true);
			}
		} else {
			debouncedFilter(value);
		}
	};

	for (const bar of [elements.searchBar, elements.fixedSearchBar]) {
		if (bar) {
			bar.addEventListener("input", handleSearchInput);
		}
	}

	const clearSearch = (input) => {
		updateSearchState("");
		if (typeof config.renderFunction === "function") {
			config.renderFunction(true);
		}
		if (input) {
			input.focus();
		}
	};

	for (const { button, input } of [
		{ button: elements.clearButton, input: elements.searchBar },
		{ button: elements.clearButtonFixed, input: elements.fixedSearchBar },
	]) {
		if (button) {
			button.addEventListener("click", () => clearSearch(input));
		}
	}
}

function addFixedSearchButtonEvents() {
	const { searchButton, fixedSearchBar, clearButtonFixed } = elements;
	if (!searchButton || !fixedSearchBar) return;

	searchButton.addEventListener("click", () => {
		const isHidden = !fixedSearchBar.classList.contains("show");
		fixedSearchBar.classList.toggle("hidden", !isHidden);
		fixedSearchBar.classList.toggle("show", isHidden);

		if (isHidden) {
			fixedSearchBar.focus();
			if (clearButtonFixed)
				toggleClearButton(fixedSearchBar, fixedSearchBar.value);
		} else {
			if (clearButtonFixed) clearButtonFixed.style.display = "none";
		}
	});
}

function initSearchFromURL() {
	const urlParams = new URLSearchParams(window.location.search);
	const searchQuery = urlParams.get("q");
	if (searchQuery) {
		updateSearchState(searchQuery);
		runFilter(searchQuery);
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

// --- Public API ---
let isInitialized = false;

export function initSearch(userConfig) {
	config = userConfig;
	elements = {
		searchBar: document.getElementById("search-bar"),
		fixedSearchBar: document.getElementById("fixedSearchBar"),
		clearButton: document.getElementById("clearSearch"),
		clearButtonFixed: document.getElementById("clearFixedSearch"),
		searchButton: document.getElementById("searchButton"),
		container: config.containerId
			? document.getElementById(config.containerId)
			: null,
		subtext: document.getElementById("searchSubtext"),
	};

	if (!isInitialized) {
		addSearchFunctionality();
		addFixedSearchButtonEvents();
		isInitialized = true;
	}

	return {
		prepareSearchableData,
		filterItems: (query) => {
			updateSearchState(query);
			runFilter(query);
		},
		applyCurrentFilter: () => {
			runFilter(searchState.currentValue);
		},
		initSearchFromURL,
		getCurrentValue: () => searchState.currentValue,
		updateSubtext: (message) => {
			if (!elements.subtext) return;
			if (!message) {
				elements.subtext.textContent = "";
				elements.subtext.classList.remove("visible");
				return;
			}
			elements.subtext.textContent = message;
			elements.subtext.classList.add("visible");
		},
	};
}
