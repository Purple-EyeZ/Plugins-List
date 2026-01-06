import lightGallery from "lightgallery";
import lgZoom from "lightgallery/plugins/zoom";
import { escapeHTML, showToast } from "./shared.js";

const TAG_COLORS = {
	dark: "#313244",
	light: "#eff1f5",
	amoled: "#000000",
	red: "#d20f39",
	green: "#3ab81e",
	blue: "#1e66f5",
	cyan: "#1aa1a8",
	pink: "#ea76cb",
	purple: "#8839ef",
	brown: "#946e48",
	grey: "#7f849c",
	orange: "#f8620c",
	yellow: "#e4d72c",
};

/** Populates the tags section of a theme card. */
function populateTags(tagsContainer, tags) {
	if (!tagsContainer || !tags || tags.length === 0) return;

	const fragment = new DocumentFragment();
	tags.forEach((tag) => {
		const tagElement = document.createElement("span");
		tagElement.className = "theme-tag";
		const color = TAG_COLORS[tag.toLowerCase()];

		if (color) {
			const colorDot = document.createElement("span");
			colorDot.className = "tag-color-dot";
			colorDot.style.backgroundColor = color;
			tagElement.appendChild(colorDot);
		}

		tagElement.append(tag.charAt(0).toUpperCase() + tag.slice(1));
		fragment.appendChild(tagElement);
	});
	tagsContainer.appendChild(fragment);
}

/** Populates the gallery section of a theme card. */
function populateGallery(galleryContainer, theme) {
	if (!galleryContainer || !theme.images || theme.images.length === 0) {
		if (galleryContainer) galleryContainer.style.display = "none";
		return;
	}

	theme.images.forEach((imageUrl, index) => {
		const link = document.createElement("a");
		link.href = imageUrl;
		link.dataset.src = imageUrl;

		if (index === 0) {
			const imageEl = document.createElement("img");
			imageEl.className = "theme-preview-image";
			imageEl.src = imageUrl;
			imageEl.alt = `${theme.name} preview`;
			imageEl.loading = "lazy";

			imageEl.onload = () => {
				galleryContainer.style.backgroundImage = `url(${imageEl.src})`;
				const containerAspectRatio = 16 / 9;
				const imageAspectRatio = imageEl.naturalWidth / imageEl.naturalHeight;
				imageEl.style.objectFit =
					imageAspectRatio < containerAspectRatio ? "contain" : "cover";
			};
			link.appendChild(imageEl);
		}
		galleryContainer.appendChild(link);
	});

	if (theme.images.length > 1) {
		const indicator = document.createElement("span");
		indicator.className = "image-count-indicator";
		indicator.textContent = `+${theme.images.length - 1}`;
		galleryContainer.appendChild(indicator);
	}

	lightGallery(galleryContainer, {
		selector: "a",
		plugins: [lgZoom],
		speed: 500,
		download: false,
	});
}

function createThemeCard(template, theme) {
	const card = template.content.cloneNode(true).firstElementChild;

	const elements = {
		title: card.querySelector(".plugin-name"),
		author: card.querySelector(".plugin-author"),
		description: card.querySelector(".plugin-description"),
		sourceButton: card.querySelector(".source-button"),
		copyButton: card.querySelector(".theme-copy-button"),
		galleryContainer: card.querySelector(".theme-gallery-container"),
		tagsContainer: card.querySelector(".theme-tags-container"),
	};

	elements.title.textContent = theme.name;
	elements.author.textContent = `By: ${theme.authors.join(", ")}`;
	elements.description.innerHTML = escapeHTML(theme.description);

	populateTags(elements.tagsContainer, theme.tags);
	populateGallery(elements.galleryContainer, theme);

	if (elements.sourceButton) {
		if (theme.sourceUrl) {
			elements.sourceButton.onclick = () =>
				window.open(theme.sourceUrl, "_blank");
		} else {
			elements.sourceButton.style.display = "none";
		}
	}
	if (elements.copyButton && theme.installUrl) {
		elements.copyButton.onclick = () => {
			navigator.clipboard.writeText(theme.installUrl);
			showToast("Link copied to clipboard!");
		};
	}

	return card;
}

export function renderThemes(container, themes) {
	if (!container) return;
	const template = document.getElementById("theme-card-template");
	if (!template) return;

	const fragment = new DocumentFragment();
	themes.forEach((theme) => {
		fragment.appendChild(createThemeCard(template, theme));
	});

	container.replaceChildren(fragment);
}
