import { isFixedSearchFocused } from "./search.js";

// --- DOM Elements ---
const fixedBanner = document.querySelector(".fixed-banner");
const backToTopButton = document.getElementById("backToTopButton");
const menuButton = document.getElementById("menuButton");
const dropdownMenu = document.getElementById("dropdownMenu");

// --- Toast & Popup ---

/**
 * Shows a temporary toast message.
 * @param {string} message The message to display.
 */
let toastTimeoutId;
export function showToast(message) {
	const toast = document.getElementById("toast");
	if (!toast) return;

	clearTimeout(toastTimeoutId);

	toast.textContent = message;
	toast.classList.add("show");
	toastTimeoutId = setTimeout(() => toast.classList.remove("show"), 2500);
}

/**
 * Shows a modal popup with customizable content and buttons.
 * @param {Object} options Popup configuration.
 * @param {string} options.title Popup title.
 * @param {string} [options.message] Text message (ignored if contentElement provided).
 * @param {HTMLElement} [options.contentElement] Custom DOM element for content.
 * @param {string} [options.infoBox] Additional info text.
 * @param {Object} [options.primaryButton] Primary button config.
 * @param {Object} [options.secondaryButton] Secondary button config.
 * @param {boolean} [options.closeOnOutsideClick] Whether to close when clicking outside.
 */
export function showPopup({
	title,
	message,
	contentElement,
	infoBox = null,
	primaryButton = { text: "OK", action: () => hidePopup() },
	secondaryButton = { text: "Cancel", action: () => hidePopup() },
	closeOnOutsideClick = true,
}) {
	let popup = document.getElementById("custom-popup");
	if (!popup) {
		popup = document.createElement("div");
		popup.id = "custom-popup";
		popup.classList.add("popup-container");
		document.body.appendChild(popup);
	}

	popup.innerHTML = `
        <div class="card popup-content">
            <div class="popup-title">${title}</div>
            <div class="popup-main-content"></div> 
            <div class="popup-buttons">
                ${secondaryButton ? `<button class="btn btn--secondary popup-secondary-button" id="popup-secondary-btn">${secondaryButton.text}</button>` : ""}
                <button class="btn btn--primary popup-primary-button" id="popup-primary-btn">${primaryButton.text}</button>
            </div>
        </div>
    `;

	const mainContent = popup.querySelector(".popup-main-content");

	if (contentElement) {
		mainContent.appendChild(contentElement);
	} else {
		let contentHTML = `<div class="popup-message">${message}</div>`;
		if (infoBox) {
			contentHTML += `<div class="popup-info-box">${infoBox.replace(/\n/g, "<br>")}</div>`;
		}
		mainContent.innerHTML = contentHTML;
	}

	popup.querySelector("#popup-primary-btn").addEventListener("click", (e) => {
		e.stopPropagation();
		primaryButton.action();
	});

	if (secondaryButton) {
		popup
			.querySelector("#popup-secondary-btn")
			.addEventListener("click", (e) => {
				e.stopPropagation();
				secondaryButton.action();
			});
	}

	if (closeOnOutsideClick) {
		popup.querySelector(".popup-content").addEventListener("click", (e) => {
			e.stopPropagation();
		});

		popup.addEventListener("click", () => {
			hidePopup();
		});
	}

	popup.style.display = "flex";
}

export function hidePopup() {
	const popup = document.getElementById("custom-popup");
	if (popup) {
		popup.style.display = "none";
	}
}

export function escapeHTML(str) {
	if (typeof str !== "string") return "";
	const escaped = str.replace(/[&<>"']/g, (match) => {
		switch (match) {
			case "&":
				return "&amp;";
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case '"':
				return "&quot;";
			case "'":
				return "&#39;";
			default:
				return match;
		}
	});
	return escaped.replace(/\n/g, "<br>");
}

// --- Feature Init ---

function handleScroll() {
	if (fixedBanner) {
		const scrollThreshold = 5;
		const shouldBeVisible =
			window.scrollY > scrollThreshold || isFixedSearchFocused();
		fixedBanner.classList.toggle("show", shouldBeVisible);
		fixedBanner.classList.toggle("hide", !shouldBeVisible);
	}

	if (backToTopButton) {
		backToTopButton.classList.toggle("show", window.scrollY > 300);
	}
}

function initDropdownMenu() {
	if (!menuButton || !dropdownMenu) return;

	const handleClickOutside = (event) => {
		if (
			event.target !== menuButton &&
			!menuButton.contains(event.target) &&
			!dropdownMenu.contains(event.target)
		) {
			dropdownMenu.classList.remove("visible");
			window.removeEventListener("click", handleClickOutside);
		}
	};

	menuButton.addEventListener("click", () => {
		const isVisible = dropdownMenu.classList.toggle("visible");
		if (isVisible) {
			window.addEventListener("click", handleClickOutside);
		} else {
			window.removeEventListener("click", handleClickOutside);
		}
	});
}

function showMigrationPopup() {
	const currentUrl = window.location.href.toLowerCase();
	if (currentUrl.includes("purple-eyez.github.io/plugins-list")) {
		showPopup({
			title: "Migration Notice",
			message: "This website is moving to a new address!",
			primaryButton: {
				text: "Take Me There",
				action: () => {
					window.location.href = "https://plugins-list.pages.dev/";
				},
			},
			secondaryButton: null,
			closeOnOutsideClick: false,
		});
	}
}

// --- Global Init ---

document.addEventListener("DOMContentLoaded", () => {
	showMigrationPopup();
	initDropdownMenu();

	if (backToTopButton) {
		backToTopButton.addEventListener("click", () => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
	}
	handleScroll();
	window.addEventListener("scroll", handleScroll);
});
