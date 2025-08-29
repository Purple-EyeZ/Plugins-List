import fuzzysort from "fuzzysort";

const DEBOUNCE = 150;

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

let searchablePlugins = [];

function debounce(func, wait) {
	let timeout;
	return (...args) => {
		clearTimeout(timeout);
		return new Promise((resolve) => {
			timeout = setTimeout(() => resolve(func(...args)), wait);
		});
	};
}

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

// Filter plugins based on search query
export function filterPlugins(query) {
	const isAdminPage = elements.container.id === "plugins-list";
	const itemsSelector = isAdminPage ? "admin-plugin-item" : "plugin-card";
	const allItemsInDom = Array.from(
		elements.container.getElementsByClassName(itemsSelector),
	);

	const isCacheInvalid =
		searchablePlugins.length === 0 ||
		searchablePlugins.length !== allItemsInDom.length ||
		(searchablePlugins.length > 0 && !searchablePlugins[0].element.isConnected);

	if (isCacheInvalid) {
		searchablePlugins = allItemsInDom.map((item) => {
			const data = { element: item };
			if (isAdminPage) {
				data.name = normalizeText(
					item.querySelector(".plugin-info span:nth-child(2)")?.textContent,
				);
				data.warningMessage = item.querySelector(".warning-message")?.value;
			} else {
				data.name = normalizeText(
					item.querySelector(".plugin-name")?.textContent,
				);
				data.description = normalizeText(
					item.querySelector(".plugin-description")?.textContent,
				);
				data.author = normalizeText(
					item.querySelector(".plugin-author")?.textContent,
				);
			}
			return data;
		});
	}

	const normalizedQuery = normalizeText(query);

	if (!normalizedQuery) {
		for (const { element } of searchablePlugins) {
			element.style.display = isAdminPage ? "block" : "flex";
		}
		if (!isAdminPage) {
			window.renderPlugins?.();
		} else {
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

function addSearchFunctionality() {
	const { searchBar, fixedSearchBar, clearButton, clearButtonFixed } = elements;

	const handleSearchInput = (e) => {
		const value = e.target.value;
		searchState.currentValue = value;
		searchState.wasCleared = false;
		debouncedFilter(value);
		toggleClearButton(e.target, value);

		const otherBar = e.target === searchBar ? fixedSearchBar : searchBar;
		if (otherBar) {
			otherBar.value = value;
			toggleClearButton(otherBar, value);
		}
		handleFeaturedPluginVisibility(value);

		const url = new URL(window.location);
		if (value) {
			url.searchParams.set("q", value);
		} else {
			url.searchParams.delete("q");
		}
		window.history.replaceState({}, "", url);
	};

	for (const bar of [searchBar, fixedSearchBar]) {
		if (bar) {
			bar.addEventListener("input", handleSearchInput);
		}
	}

	const clearSearch = (input) => {
		searchState.currentValue = "";
		searchState.wasCleared = true;
		for (const bar of [searchBar, fixedSearchBar]) {
			if (bar) {
				bar.value = "";
				toggleClearButton(bar, "");
			}
		}
		filterPlugins("");
		handleFeaturedPluginVisibility("");
		if (input) {
			input.focus();
		}

		const url = new URL(window.location);
		url.searchParams.delete("q");
		window.history.replaceState({}, "", url);
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

// Detects whether the user has clicked on the fixed search bar
const fixedSearchBar = document.getElementById("fixedSearchBar");
if (fixedSearchBar) {
	fixedSearchBar.addEventListener("focus", () => {
		fixedSearchBar.dataset.isFocused = "true";
	});

	fixedSearchBar.addEventListener("blur", () => {
		fixedSearchBar.dataset.isFocused = "false";
	});
}

export const isFixedSearchFocused = () =>
	document.getElementById("fixedSearchBar")?.dataset.isFocused === "true";

export function initSearchFromURL() {
	const urlParams = new URLSearchParams(window.location.search);
	const searchQuery = urlParams.get("q");

	if (searchQuery) {
		const { searchBar, fixedSearchBar } = elements;
		searchState.currentValue = searchQuery;

		if (searchBar) {
			searchBar.value = searchQuery;
			toggleClearButton(searchBar, searchQuery);
		}
		if (fixedSearchBar) {
			fixedSearchBar.value = searchQuery;
			toggleClearButton(fixedSearchBar, searchQuery);
		}
		filterPlugins(searchQuery);
		handleFeaturedPluginVisibility(searchQuery);
	}
}

const debouncedFilter = debounce(filterPlugins, DEBOUNCE);

// Initialize search
document.addEventListener("DOMContentLoaded", () => {
	addSearchFunctionality();
	addSearchButtonEvent();
});
