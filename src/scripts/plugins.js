import { showPopup, showToast } from "./shared.js";

let pluginsData = [];

function analyzePluginChanges(currentPlugins) {
	const previousStateJSON = localStorage.getItem("previousPluginsState");

	if (!previousStateJSON) {
		localStorage.setItem(
			"previousPluginsState",
			JSON.stringify(currentPlugins),
		);
		return null;
	}

	const previousPlugins = JSON.parse(previousStateJSON);
	const previousPluginsMap = new Map(previousPlugins.map((p) => [p.name, p]));

	const changes = {
		updated: [],
		added: [],
	};

	for (const currentPlugin of currentPlugins) {
		const previousPlugin = previousPluginsMap.get(currentPlugin.name);

		if (previousPlugin) {
			if (previousPlugin.status !== currentPlugin.status) {
				changes.updated.push({
					name: currentPlugin.name,
					oldStatus: previousPlugin.status,
					newStatus: currentPlugin.status,
				});
			}
			previousPluginsMap.delete(currentPlugin.name);
		} else {
			changes.added.push(currentPlugin);
		}
	}

	localStorage.setItem("previousPluginsState", JSON.stringify(currentPlugins));

	return changes;
}

function showChangesPopup(changes) {
	if (
		!changes ||
		(changes.updated.length === 0 && changes.added.length === 0)
	) {
		return;
	}

	const getStatusEmoji = (status) => {
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
	};

	let changesHtml = "";

	let isFirstSection = true;

	if (changes.updated.length > 0) {
		changesHtml +=
			'<h4 style="margin-top: 0px; margin-bottom: 5px;">🔃 Status changes:</h4>';
		changesHtml += changes.updated
			.map(
				(change) =>
					`${change.name}: ${getStatusEmoji(change.oldStatus)} ${change.oldStatus} → ${getStatusEmoji(change.newStatus)} ${change.newStatus}`,
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
			.map(
				(plugin) =>
					`${plugin.name} (${getStatusEmoji(plugin.status)} ${plugin.status})`,
			)
			.join("<br>");
	}

	showPopup({
		title: "Plugin Changes Detected",
		message: "Here is a summary of plugin changes since your last visit:",
		infoBox: changesHtml,
		primaryButton: {
			text: "Got it!",
			action: () => hidePopup(),
		},
		secondaryButton: null,
	});
}

const featuredPluginContainer = document.getElementById(
	"featured-plugin-container",
);

function createFeaturedPluginCard(plugin) {
	const template = document.getElementById("featured-plugin-template");

	if (!template) {
		console.error("Featured plugin template not found!");
		return null;
	}

	const cardFragment = template.content.cloneNode(true);
	const cardElement = cardFragment.querySelector(".featured-plugin-card");

	if (!cardElement) {
		console.error("Root .featured-plugin-card not found in template!");
		return null;
	}

	const nameElement = cardElement.querySelector(".featured-plugin-name");
	if (nameElement) nameElement.textContent = plugin.name;

	const authorsElement = cardElement.querySelector(".featured-plugin-author");
	if (authorsElement)
		authorsElement.textContent = `By: ${plugin.authors.join(", ")}`;

	const descriptionElement = cardElement.querySelector(
		".featured-plugin-description",
	);
	if (descriptionElement) descriptionElement.textContent = plugin.description;

	const copyButton = cardElement.querySelector(".featured-copy-button");
	if (copyButton) {
		copyButton.addEventListener("click", (event) => {
			event.stopPropagation();
			copyToClipboard(plugin.installUrl);
			showToast(`Link for ${plugin.name} copied to clipboard!`);
		});
	}

	cardElement.addEventListener("click", () => {
		cardElement.classList.toggle("expanded");
	});

	return cardElement;
}

function renderFeaturedPlugin(pluginData) {
	if (featuredPluginContainer) {
		featuredPluginContainer.innerHTML = "";

		if (pluginData) {
			const featuredCard = createFeaturedPluginCard(pluginData);
			if (featuredCard) {
				featuredPluginContainer.appendChild(featuredCard);
			}
		}
	}
}

fetch("plugins-data.json")
	.then((response) => response.json())
	.then((data) => {
		pluginsData = data;

		const featuredPlugin = pluginsData.find((p) => p.name === "Plugins List");
		renderFeaturedPlugin(featuredPlugin);

		const changes = analyzePluginChanges(data);

		if (changes && (changes.updated.length > 0 || changes.added.length > 0)) {
			showChangesPopup(changes);
		}

		if (pluginsContainer) {
			renderPlugins();
		}
	})
	.catch((error) => {
		console.error("Error loading plugins data:", error);
	});

const pluginsContainer = document.getElementById("plugins-container");
const sortSelect = document.getElementById("sort-select");
const showBrokenToggle = document.getElementById("show-broken");

function createPluginCard(plugin) {
	const card = document.createElement("div");
	card.className = "card plugin-card";

	let statusClass = "";
	switch (plugin.status) {
		case "working":
			statusClass = "status-badge--working";
			break;
		case "warning":
			statusClass = "status-badge--warning";
			break;
		case "broken":
			statusClass = "status-badge--broken";
			break;
	}

	const authorsList = plugin.authors.join(", ");

	card.innerHTML = `
    <div class="plugin-header">
        <h3 class="plugin-name card__title">${plugin.name}</h3>
        <span class="status-badge ${statusClass}">${plugin.status}</span>
    </div>
    <div class="plugin-author card__author">By: ${authorsList}</div>
    <div class="plugin-description card__description">${plugin.description}</div>
    <div class="plugin-buttons">
        <button class="btn btn--secondary source-button" data-url="${plugin.sourceUrl}">Source Code</button>
        <button class="btn btn--primary plugin-copy-button" data-status="${plugin.status}" data-url="${plugin.installUrl}" data-warning="${plugin.warningMessage || ""}">Copy Link</button>
    </div>
`;

	const sourceButton = card.querySelector(".source-button");
	const copyButton = card.querySelector(".plugin-copy-button");

	sourceButton.addEventListener("click", () => {
		window.open(plugin.sourceUrl, "_blank");
	});

	copyButton.addEventListener("click", () => {
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
				secondaryButton: {
					text: "Cancel",
					action: () => hidePopup(),
				},
			});
		}
	});

	return card;
}

function copyToClipboard(text) {
	navigator.clipboard.writeText(text).catch((err) => {
		console.error("Failed to copy: ", err);
	});
}

// Render plugins with current filters
window.renderPlugins = function renderPlugins() {
	if (!pluginsContainer) {
		return;
	}
	pluginsContainer.innerHTML = "";

	let filteredPlugins = [...pluginsData];

	if (showBrokenToggle && !showBrokenToggle.checked) {
		filteredPlugins = filteredPlugins.filter(
			(plugin) => plugin.status !== "broken",
		);
	}

	// Sort plugins
	if (sortSelect) {
		switch (sortSelect.value) {
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
	}

	for (const plugin of filteredPlugins) {
		const card = createPluginCard(plugin);
		pluginsContainer.appendChild(card);
	}
};

// Event listeners for filters
if (sortSelect) {
	sortSelect.addEventListener("change", renderPlugins);
}
if (showBrokenToggle) {
	showBrokenToggle.addEventListener("change", renderPlugins);
}

// Initial render
document.addEventListener("DOMContentLoaded", renderPlugins);
