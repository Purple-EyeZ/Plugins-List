import { filterPlugins, initSearchFromURL, searchState } from "./search.js";
import { showPopup, showToast } from "./shared.js";

const GITHUB_REPO = "Purple-EyeZ/Plugins-List";
const API_DATA_PATH = `https://api.github.com/repos/${GITHUB_REPO}/contents/src/plugins-data.json?ref=dev`;

let plugins = [];
let currentFilter = "all";

const pluginsList = document.getElementById("plugins-list");
const addPluginForm = document.getElementById("add-plugin-form");
const newPluginUrlInput = document.getElementById("new-plugin-url");
const saveChangesButton = document.getElementById("save-changes");
const checkPluginsButton = document.getElementById("check-plugins");
const filterAllButton = document.getElementById("filter-all");
const filterBrokenButton = document.getElementById("filter-broken");
const filterWarningButton = document.getElementById("filter-warning");
const totalCountElement = document.getElementById("total-count");
const workingCountElement = document.getElementById("working-count");
const warningCountElement = document.getElementById("warning-count");
const brokenCountElement = document.getElementById("broken-count");

async function loadPlugins() {
	try {
		const response = await fetch(API_DATA_PATH);
		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || "Failed to fetch from GitHub API");
		}

		const content = atob(data.content);
		plugins = JSON.parse(content);

		updatePluginsList();
		updateCounters();
		initSearchFromURL();
	} catch (error) {
		showToast(`Error loading plugins: ${error.message}`);
	}
}

function generateSourceUrl(installUrl) {
	installUrl = installUrl.replace(/\/$/, "");

	if (installUrl.includes("/proxy/")) {
		const actualUrl = installUrl.split("/proxy/")[1];
		if (actualUrl) {
			// Handle github.io URLs behind proxy
			const githubIoMatch = actualUrl.match(/([^.]+)\.github\.io\/([^/]+)/);
			if (githubIoMatch) {
				const [, username, repo] = githubIoMatch;
				return `https://github.com/${username}/${repo}`;
			}

			// Handle raw.githubusercontent.com URLs behind proxy
			const rawMatch = actualUrl.match(
				/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/,
			);
			if (rawMatch) {
				const [, username, repo] = rawMatch;
				return `https://github.com/${username}/${repo}`;
			}
		}
	}

	// github.io URLs
	if (installUrl.includes("github.io")) {
		const match = installUrl.match(/https?:\/\/([^.]+)\.github\.io\/([^/]+)/);
		if (match) {
			const [, username, repo] = match;
			return `https://github.com/${username}/${repo}`;
		}
	}

	// raw.githubusercontent.com URLs
	if (installUrl.includes("raw.githubusercontent.com")) {
		const match = installUrl.match(
			/https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/,
		);
		if (match) {
			const [, username, repo] = match;
			return `https://github.com/${username}/${repo}`;
		}
	}

	return installUrl;
}

async function updatePluginManifests() {
	console.group("Updating plugin manifests...");
	let updatedCount = 0;
	let failedCount = 0;
	const totalPlugins = plugins.length;
	let fetchedCount = 0;

	for (const plugin of plugins) {
		try {
			const installUrl = plugin.installUrl;
			const manifestUrl = installUrl.endsWith("/")
				? `${installUrl}manifest.json`
				: `${installUrl}/manifest.json`;

			console.log(
				`Fetching manifest for ${plugin.name}... (${++fetchedCount}/${totalPlugins})`,
			);
			const response = await fetch(manifestUrl);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const manifest = await response.json();

			// Check for changes
			const changes = [];
			if (manifest.name !== plugin.name) {
				changes.push(`name: ${plugin.name} -> ${manifest.name}`);
				plugin.name = manifest.name;
			}
			if (manifest.description !== plugin.description) {
				changes.push("description updated");
				plugin.description = manifest.description;
			}

			const newAuthors = manifest.authors?.map((author) => author.name) || [
				"Unknown",
			];
			if (JSON.stringify(newAuthors) !== JSON.stringify(plugin.authors)) {
				changes.push(`authors: [${plugin.authors}] -> [${newAuthors}]`);
				plugin.authors = newAuthors;
			}

			if (changes.length > 0) {
				console.log(`✅ ${plugin.name}: Updated! Changes:`, changes);
				updatedCount++;
			} else {
				console.log(`ℹ️ ${plugin.name}: No changes needed`);
			}
		} catch (error) {
			console.error(`❌ Error updating ${plugin.name}:`, error.message);
			failedCount++;
		}
	}

	console.log("\nUpdate summary:");
	console.log(`ℹ️ Processed: ${fetchedCount}/${totalPlugins} plugins`);
	console.log(`✅ Successfully updated: ${updatedCount} plugins`);
	console.log(`❌ Failed to update: ${failedCount} plugins`);
	console.groupEnd();

	updatePluginsList();
	showToast(`Updated ${updatedCount} plugins (${failedCount} failed)`);
}

// Update the counters
function updateCounters() {
	const working = plugins.filter((p) => p.status === "working").length;
	const warning = plugins.filter((p) => p.status === "warning").length;
	const broken = plugins.filter((p) => p.status === "broken").length;

	totalCountElement.textContent = plugins.length;
	workingCountElement.textContent = working;
	warningCountElement.textContent = warning;
	brokenCountElement.textContent = broken;
}

// Create plugin element
function createPluginElement(plugin) {
	const div = document.createElement("div");
	div.className = "card admin-plugin-item";

	div.innerHTML = `
        <div class="plugin-info">
            <span class="plugin-info-label">Name:</span>
            <span>${plugin.name || "Unnamed Plugin"}</span>
            
            <span class="plugin-info-label">Status:</span>
            <select class="status-select">
                <option value="working" ${plugin.status === "working" ? "selected" : ""}>Working</option>
                <option value="warning" ${plugin.status === "warning" ? "selected" : ""}>Warning</option>
                <option value="broken" ${plugin.status === "broken" ? "selected" : ""}>Broken</option>
            </select>
            
            <span class="plugin-info-label">Message:</span>
            <textarea class="form-control warning-message">${plugin.warningMessage || ""}</textarea>
        </div>
        <div class="plugin-action-buttons">
            <button class="btn btn--danger admin-button delete-plugin">Delete</button>
            <button class="btn btn--secondary admin-button edit-plugin">
                <span class="material-symbols-rounded">edit</span> Edit Details
            </button>
        </div>
    `;

	div.querySelector(".status-select").addEventListener("change", (e) => {
		plugin.status = e.target.value;
		updateCounters();
	});

	div.querySelector(".warning-message").addEventListener("input", (e) => {
		plugin.warningMessage = e.target.value;
	});

	div.querySelector(".delete-plugin").addEventListener("click", () => {
		if (confirm(`Delete plugin "${plugin.name}"?`)) {
			plugins = plugins.filter((p) => p !== plugin);
			updatePluginsList();
			updateCounters();
		}
	});

	div.querySelector(".edit-plugin").addEventListener("click", () => {
		showPluginDetailsPopup(plugin);
	});

	return div;
}

async function updateSingleField(plugin, field, value) {
	try {
		const manifestUrl = plugin.installUrl.endsWith("/")
			? `${plugin.installUrl}manifest.json`
			: `${plugin.installUrl}/manifest.json`;
		const response = await fetch(manifestUrl);
		const manifest = await response.json();

		switch (field) {
			case "name":
				plugin.name = manifest.name;
				break;
			case "description":
				plugin.description = manifest.description;
				break;
			case "authors":
				plugin.authors = manifest.authors?.map((author) => author.name) || [
					"Unknown",
				];
				break;
			case "sourceUrl":
				plugin.sourceUrl = generateSourceUrl(plugin.installUrl);
				break;
			default:
				return false;
		}
		return true;
	} catch (error) {
		console.error(`Error updating ${field}:`, error);
		return false;
	}
}

function showPluginDetailsPopup(plugin) {
	const popupContent = `
        <div class="plugin-details-form">
            <div class="form-group">
                <label>Name:</label>
                <div class="input-with-button">
                    <input type="text" id="plugin-name" class="form-control" value="${plugin.name || ""}" />
                    <button class="btn btn--secondary admin-button refetch-field" data-field="name">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Description:</label>
                <div class="input-with-button">
                    <textarea id="plugin-description" class="form-control">${plugin.description || ""}</textarea>
                    <button class="btn btn--secondary admin-button refetch-field" data-field="description">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Authors:</label>
                <div class="input-with-button">
                    <input type="text" id="plugin-authors" class="form-control" value="${plugin.authors?.join(", ") || ""}" />
                    <button class="btn btn--secondary admin-button refetch-field" data-field="authors">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Install URL:</label>
                <input type="text" id="plugin-install-url" class="form-control" value="${plugin.installUrl || ""}" />
            </div>
            <div class="form-group">
                <label>Source URL:</label>
                <div class="input-with-button">
                    <input type="text" id="plugin-source-url" class="form-control" value="${plugin.sourceUrl || ""}" />
                    <button class="btn btn--secondary admin-button refetch-field" data-field="sourceUrl">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
        </div>
    `;

	showPopup({
		title: `Edit Plugin: ${plugin.name}`,
		message: popupContent,
		primaryButton: {
			text: "Save",
			action: () => {
				plugin.name = document.getElementById("plugin-name").value;
				plugin.description =
					document.getElementById("plugin-description").value;
				plugin.authors = document
					.getElementById("plugin-authors")
					.value.split(",")
					.map((a) => a.trim());
				plugin.installUrl = document.getElementById("plugin-install-url").value;
				plugin.sourceUrl = document.getElementById("plugin-source-url").value;

				updatePluginsList();
				hidePopup();
				showToast("Plugin details updated!");
			},
		},
		closeOnOutsideClick: true,
	});

	for (const button of document.querySelectorAll(".refetch-field")) {
		button.addEventListener("click", async () => {
			const field = button.dataset.field;
			const success = await updateSingleField(plugin, field);

			if (success) {
				if (field === "authors") {
					document.getElementById("plugin-authors").value =
						plugin.authors.join(", ");
				} else if (field === "sourceUrl") {
					document.getElementById("plugin-source-url").value = plugin.sourceUrl;
				} else {
					document.getElementById(`plugin-${field}`).value = plugin[field];
				}
				showToast(`${field} updated successfully!`);
			} else {
				showToast(`Failed to update ${field}`);
			}
		});
	}
}

// Update the plugins list
function updatePluginsList() {
	pluginsList.innerHTML = "";

	let filteredPlugins = plugins;
	if (currentFilter !== "all") {
		filteredPlugins = plugins.filter((p) => p.status === currentFilter);
	}

	for (const plugin of filteredPlugins) {
		pluginsList.appendChild(createPluginElement(plugin));
	}

	filterPlugins(searchState.currentValue);
}

// Save changes
async function saveChanges() {
	try {
		const jsonString = JSON.stringify(plugins, null, 4);

		const response = await fetch("/api/save-plugins", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: jsonString,
		});

		if (!response.ok) {
			throw new Error(`Save failed: ${response.statusText}`);
		}

		const result = await response.json();
		showToast(result.message || "Changes saved successfully!");
	} catch (error) {
		showToast(`Error saving changes: ${error.message}`);
	}
}

// Event Listeners
addPluginForm.addEventListener("submit", async (e) => {
	e.preventDefault();
	const url = newPluginUrlInput.value.trim();

	try {
		const manifestUrl = url.endsWith("/")
			? `${url}manifest.json`
			: `${url}/manifest.json`;
		const response = await fetch(manifestUrl);
		const manifest = await response.json();

		const newPlugin = {
			name: manifest.name,
			description: manifest.description,
			authors: manifest.authors?.map((author) => author.name) || ["Unknown"],
			status: "working",
			sourceUrl: generateSourceUrl(url),
			installUrl: url,
			warningMessage: "",
		};

		plugins.push(newPlugin);
		updatePluginsList();
		updateCounters();
		newPluginUrlInput.value = "";
		showToast("Plugin added successfully!");
	} catch (error) {
		showToast(`Error adding plugin: ${error.message}`);
	}
});

saveChangesButton.addEventListener("click", saveChanges);

checkPluginsButton.addEventListener("click", updatePluginManifests);

filterAllButton.classList.add("active");

filterAllButton.addEventListener("click", () => {
	currentFilter = "all";
	updatePluginsList();
	for (const btn of document.querySelectorAll(".admin-button")) {
		btn.classList.remove("active");
	}
	filterAllButton.classList.add("active");
});

filterBrokenButton.addEventListener("click", () => {
	currentFilter = "broken";
	updatePluginsList();
	for (const btn of document.querySelectorAll(".admin-button")) {
		btn.classList.remove("active");
	}
	filterBrokenButton.classList.add("active");
});

filterWarningButton.addEventListener("click", () => {
	currentFilter = "warning";
	updatePluginsList();
	for (const btn of document.querySelectorAll(".admin-button"))
		btn.classList.remove("active");
	filterWarningButton.classList.add("active");
});

// Init
loadPlugins();
