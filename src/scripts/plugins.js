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

fetch("plugins-data.json")
	.then((response) => response.json())
	.then((data) => {
		pluginsData = data;

		const changes = analyzePluginChanges(data);

		if (changes && (changes.updated.length > 0 || changes.added.length > 0)) {
			showChangesPopup(changes);
		}

		renderPlugins();
	})
	.catch((error) => {
		console.error("Error loading plugins data:", error);
	});

const pluginsContainer = document.getElementById("plugins-container");
const sortSelect = document.getElementById("sort-select");
const showBrokenToggle = document.getElementById("show-broken");

function createPluginCard(plugin) {
	const card = document.createElement("div");
	card.className = "plugin-card";

	let statusClass = "";
	switch (plugin.status) {
		case "working":
			statusClass = "status-working";
			break;
		case "warning":
			statusClass = "status-warning";
			break;
		case "broken":
			statusClass = "status-broken";
			break;
	}

	const authorsList = plugin.authors.join(", ");

	card.innerHTML = `
    <div class="plugin-header">
        <h3 class="plugin-name">${plugin.name}</h3>
        <span class="plugin-status ${statusClass}">${plugin.status}</span>
    </div>
    <div class="plugin-author">By: ${authorsList}</div>
    <div class="plugin-description">${plugin.description}</div>
    <div class="plugin-buttons">
        <button class="plugin-button source-button" data-url="${plugin.sourceUrl}">Source Code</button>
        <button class="plugin-button plugin-copy-button" data-status="${plugin.status}" data-url="${plugin.installUrl}" data-warning="${plugin.warningMessage || ""}">Copy Link</button>
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

			const titleMessage =
				plugin.status === "broken"
					? "This plugin is broken"
					: "This plugin is partially broken";

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

// Function to copy to clipboard
function copyToClipboard(text) {
	navigator.clipboard.writeText(text).catch((err) => {
		console.error("Failed to copy: ", err);
	});
}

// Render plugins with current filters
window.renderPlugins = function renderPlugins() {
	pluginsContainer.innerHTML = "";

	let filteredPlugins = [...pluginsData];

	if (!showBrokenToggle.checked) {
		filteredPlugins = filteredPlugins.filter(
			(plugin) => plugin.status !== "broken",
		);
	}

	// Sort plugins
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

	for (const plugin of filteredPlugins) {
		const card = createPluginCard(plugin);
		pluginsContainer.appendChild(card);
	}
};

// Event listeners for filters
sortSelect.addEventListener("change", renderPlugins);
showBrokenToggle.addEventListener("change", renderPlugins);

// Initial render
document.addEventListener("DOMContentLoaded", renderPlugins);
