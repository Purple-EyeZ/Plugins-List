import { hidePopup, showPopup, showToast } from "./shared.js";

// --- Utils ---

function copyToClipboard(text) {
	navigator.clipboard.writeText(text).catch((err) => {
		console.error("Failed to copy: ", err);
	});
}

function getStatusEmoji(status) {
	switch (status) {
		case "working":
			return "✅";
		case "warning":
			return "⚠️";
		case "broken":
			return "❌";
		default:
			return "";
	}
}

// --- Plugin cards creation ---

function createFeaturedPluginCard(plugin) {
	const template = document.getElementById("featured-plugin-template");
	if (!template) return null;

	const cardFragment = template.content.cloneNode(true);
	const cardElement = cardFragment.querySelector(".featured-plugin-card");
	if (!cardElement) return null;

	cardElement.querySelector(".featured-plugin-name").textContent = plugin.name;
	cardElement.querySelector(".featured-plugin-author").textContent =
		`By: ${plugin.authors.join(", ")}`;
	cardElement.querySelector(".featured-plugin-description").textContent =
		plugin.description;

	const copyButton = cardElement.querySelector(".featured-copy-button");
	copyButton.addEventListener("click", (event) => {
		event.stopPropagation();
		copyToClipboard(plugin.installUrl);
		showToast(`Link for ${plugin.name} copied to clipboard!`);
	});

	cardElement.addEventListener("click", () => {
		cardElement.classList.toggle("expanded");
	});

	return cardElement;
}

function createPluginCard(plugin) {
	const template = document.getElementById("plugin-card-template");
	if (!template) return null;

	const card = template.content.cloneNode(true).querySelector(".plugin-card");

	const statusClasses = {
		working: "status-badge--working",
		warning: "status-badge--warning",
		broken: "status-badge--broken",
	};

	card.querySelector(".plugin-name").textContent = plugin.name;
	card.querySelector(".plugin-author").textContent =
		`By: ${plugin.authors.join(", ")}`;
	card.querySelector(".plugin-description").textContent = plugin.description;

	const statusBadge = card.querySelector(".status-badge");
	statusBadge.textContent = plugin.status;
	statusBadge.className = "status-badge";
	if (statusClasses[plugin.status]) {
		statusBadge.classList.add(statusClasses[plugin.status]);
	}

	card.querySelector(".source-button").addEventListener("click", () => {
		window.open(plugin.sourceUrl, "_blank");
	});

	card.querySelector(".plugin-copy-button").addEventListener("click", () => {
		if (plugin.status === "working") {
			copyToClipboard(plugin.installUrl);
			showToast(`Link for ${plugin.name} copied to clipboard!`);
		} else {
			const statusMessage =
				plugin.status === "broken"
					? "Installing broken plugins may crash your client or cause unexpected behavior."
					: "This plugin may not work as expected.";
			showPopup({
				title: "Warning!",
				message: statusMessage,
				infoBox: plugin.warningMessage || "",
				primaryButton: {
					text: "Copy Anyway",
					action: () => {
						copyToClipboard(plugin.installUrl);
						showToast(`Link for ${plugin.name} copied to clipboard!`);
						hidePopup();
					},
				},
				secondaryButton: { text: "Cancel", action: () => hidePopup() },
			});
		}
	});

	return card;
}

// --- Main rendering and UI logic ---

export function renderPlugins(container, plugins, sortOrder, showBroken) {
	container.innerHTML = "";

	const filteredPlugins = showBroken
		? [...plugins]
		: plugins.filter((p) => p.status !== "broken");

	switch (sortOrder) {
		case "default":
			filteredPlugins.sort((a, b) => {
				if (a.status === "broken" && b.status !== "broken") return 1;
				if (a.status !== "broken" && b.status === "broken") return -1;
				return a.name.localeCompare(b.name);
			});
			break;
		case "broken-first":
			filteredPlugins.sort((a, b) => {
				if (a.status === "broken" && b.status !== "broken") return -1;
				if (a.status !== "broken" && b.status === "broken") return 1;
				return a.name.localeCompare(b.name);
			});
			break;
		case "alphabetical":
			filteredPlugins.sort((a, b) => a.name.localeCompare(b.name));
			break;
	}

	const renderedElements = [];
	for (const plugin of filteredPlugins) {
		const card = createPluginCard(plugin);
		renderedElements.push(card);
		container.appendChild(card);
	}

	return { renderedPlugins: filteredPlugins, renderedElements };
}

export function renderFeaturedPlugin(container, plugin) {
	if (container) {
		container.innerHTML = "";
		if (plugin) {
			const featuredCard = createFeaturedPluginCard(plugin);
			if (featuredCard) {
				container.appendChild(featuredCard);
			}
		}
	}
}

/**
 * Shows popup summarizing plugin changes since last visit.
 */
export function showChangesPopup(changes) {
	if (
		!changes ||
		(changes.updated.length === 0 && changes.added.length === 0)
	) {
		return;
	}

	let changesHtml = "";
	let isFirstSection = true;

	if (changes.updated.length > 0) {
		changesHtml +=
			'<h4 style="margin-top: 0px; margin-bottom: 5px;">🔃 Status changes:</h4>';
		changesHtml += changes.updated
			.map(
				(c) =>
					`${c.name}: ${getStatusEmoji(c.oldStatus)} ${c.oldStatus} → ${getStatusEmoji(c.newStatus)} ${c.newStatus}`,
			)
			.join("<br>");
		isFirstSection = false;
	}

	if (changes.added.length > 0) {
		const style = isFirstSection
			? 'style="margin-top: 0px; margin-bottom: 5px;"'
			: 'style="margin-top: 25px; margin-bottom: 5px;"';
		changesHtml += `<h4 ${style}>🚀 Added:</h4>`;
		changesHtml += changes.added
			.map((p) => `${p.name} (${getStatusEmoji(p.status)} ${p.status})`)
			.join("<br>");
	}

	showPopup({
		title: "Plugin Changes Detected",
		message: "Here is a summary of plugin changes since your last visit:",
		infoBox: changesHtml,
		primaryButton: { text: "Got it!", action: () => hidePopup() },
		secondaryButton: null,
	});
}
