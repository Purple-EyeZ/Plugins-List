import fuzzysort from "fuzzysort";

const DEBOUNCE = 150;

let searchableItems = [];
let config = {};
let elements = {};
const searchState = { currentValue: "" };

export const isFixedSearchFocused = () =>
	document.activeElement === elements.fixedSearchBar;

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

function prepareSearchableData(itemsData, itemElements) {
	const elementMap = new Map(itemElements.map((el, i) => [i, el]));

	searchableItems = itemsData.map((item, index) => {
		const prepared = { element: elementMap.get(index) };
		for (const key of config.searchKeys) {
			const value = item[key];
			prepared[key] = Array.isArray(value)
				? normalizeText(value.join(" "))
				: normalizeText(value);
		}
		return prepared;
	});
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

	const results = fuzzysort.go(normalizedQuery, searchableItems, {
		keys: config.searchKeys,
	});

	const priorityKey = config.priorityKey || config.searchKeys[0];
	results.sort((a, b) => {
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
		if (!bHasPriorityMatch && aHasPriorityMatch) return 1;
		if (aHasPriorityMatch && bHasPriorityMatch) {
			return bPriorityResult.score - aPriorityResult.score;
		}
		return b.score - a.score;
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

const debouncedFilter = debounce(filterItems, DEBOUNCE);

function addSearchFunctionality() {
	const handleSearchInput = (e) => {
		const value = e.target.value;
		updateSearchState(value);

		if (value === "") {
			debouncedFilter.cancel();
			config.renderFunction(true);
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
		config.renderFunction(true);
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
		filterItems(searchQuery);
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

export function initSearch(userConfig) {
	config = userConfig;
	elements = {
		searchBar: document.getElementById("search-bar"),
		fixedSearchBar: document.getElementById("fixedSearchBar"),
		clearButton: document.getElementById("clearSearch"),
		clearButtonFixed: document.getElementById("clearFixedSearch"),
		searchButton: document.getElementById("searchButton"),
		container: document.getElementById(config.containerId),
		subtext: document.getElementById("searchSubtext"),
	};

	addSearchFunctionality();
	addFixedSearchButtonEvents();

	return {
		prepareSearchableData,
		filterItems: (query) => {
			updateSearchState(query);
			filterItems(query);
		},
		initSearchFromURL,
		getCurrentValue: () => searchState.currentValue,
	};
}
