const CONSTANTS = {
	ANIMATION: {
		DEBOUNCE: 150,
	},
};

const searchState = {
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
};

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
function filterPlugins(query) {
	const isAdminPage = elements.container.id === "plugins-list";
	const items = Array.from(
		elements.container.getElementsByClassName(
			isAdminPage ? "admin-plugin-item" : "plugin-card",
		),
	);
	const normalizedQuery = normalizeText(query);

	if (!normalizedQuery) {
		for (const item of items) {
			item.style.display = isAdminPage ? "block" : "flex";
		}
		updateSearchSubtext("", items);
		if (!isAdminPage) {
			window.renderPlugins?.();
		}
		return;
	}

	if (isAdminPage) {
		let visibleCount = 0;
		for (const item of items) {
			const name = normalizeText(
				item.querySelector(".plugin-info span:nth-child(2)")?.textContent,
			);
			const warningMessage = item.querySelector(".warning-message")?.value;

			const matches =
				name?.includes(normalizedQuery) ||
				(warningMessage &&
					normalizeText(warningMessage).includes(normalizedQuery));

			item.style.display = matches ? "block" : "none";
			if (matches) visibleCount++;
		}
		updateSearchSubtext(query, visibleCount);
	} else {
		const scoredItems = items.map((card) => {
			const name = normalizeText(
				card.querySelector(".plugin-name").textContent,
			);
			const description = normalizeText(
				card.querySelector(".plugin-description").textContent,
			);
			const author = normalizeText(
				card.querySelector(".plugin-author").textContent,
			);

			let score = 0;
			if (name.includes(normalizedQuery)) score += 100;
			if (author.includes(normalizedQuery)) score += 50;
			if (description.includes(normalizedQuery)) score += 25;
			if (name.startsWith(normalizedQuery)) score += 50;

			return { card, score, hasMatch: score > 0 };
		});

		scoredItems.sort((a, b) => b.score - a.score);

		for (const { card, hasMatch } of scoredItems) {
			card.style.display = hasMatch ? "flex" : "none";
			if (hasMatch) {
				elements.container.appendChild(card);
			}
		}

		updateSearchSubtext(
			query,
			scoredItems.filter((i) => i.hasMatch).map((i) => i.card),
		);
	}
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

function addSearchFunctionality() {
	const { searchBar, fixedSearchBar, clearButton, clearButtonFixed } = elements;

	const handleSearchInput = (e) => {
		const value = e.target.value;
		searchState.currentValue = value;
		searchState.wasCleared = false;
		debouncedFilter(value);
		toggleClearButton(e.target, value);

		const otherBar = e.target === searchBar ? fixedSearchBar : searchBar;
		otherBar.value = value;
		toggleClearButton(otherBar, value);
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
			bar.value = "";
			toggleClearButton(bar, "");
		}
		filterPlugins("");
		input.focus();
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

const debouncedFilter = debounce(filterPlugins, CONSTANTS.ANIMATION.DEBOUNCE);

// Initialize search
document.addEventListener("DOMContentLoaded", () => {
	addSearchFunctionality();
	addSearchButtonEvent();
});
