const GITHUB_REPO = "Purple-EyeZ/Plugins-List";

/**
 * Fetches generic JSON data from the GitHub repo.
 * @param {string} path The file path to fetch (e.g. 'src/plugins-data.json')
 * @returns {Promise<Array>} A promise that resolves to the array of items.
 */
export async function fetchJsonData(path) {
	const API_DATA_PATH = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=dev`;
	const response = await fetch(API_DATA_PATH);
	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || `Failed to fetch ${path} from GitHub API`);
	}

	const binaryString = atob(data.content);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	const content = new TextDecoder("utf-8").decode(bytes);

	return JSON.parse(content);
}

/**
 * Fetches the main plugins list from the GitHub repo.
 * @returns {Promise<Array>} A promise that resolves to the array of plugins.
 */
export async function fetchPlugins() {
	return fetchJsonData("src/plugins-data.json");
}

/**
 * Fetches the themes list from the GitHub repo.
 * @returns {Promise<Array>} A promise that resolves to the array of themes.
 */
export async function fetchThemes() {
	return fetchJsonData("src/themes-data.json");
}

/**
 * Saves generic files to the backend using the commit endpoint.
 * @param {string} message The commit message.
 * @param {Array} files Array of file objects {path, content, encoding}.
 * @returns {Promise<object>} The result from the save API.
 */
export async function commitFiles(message, files) {
	const payload = { message, files };
	const response = await fetch("/api/admin/commit", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`Commit failed: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Fetches plugin manifest from install URL.
 * @param {string} installUrl The base URL of the plugin.
 * @returns {Promise<object>} The parsed manifest JSON.
 */
export async function fetchManifest(installUrl) {
	const manifestUrl = installUrl.endsWith("/")
		? `${installUrl}manifest.json`
		: `${installUrl}/manifest.json`;
	const response = await fetch(manifestUrl);
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	return response.json();
}

/**
 * Fetches a plugin's manifest to update a specific field in the plugin object.
 * @param {object} plugin The plugin object to update.
 * @param {string} field The field to update ('name', 'description', 'authors', 'sourceUrl').
 * @param {function} generateSourceUrlFn A function to generate the source URL.
 * @returns {Promise<boolean>} A promise that resolves to true if successful, false otherwise.
 */
export async function refetchPluginField(plugin, field, generateSourceUrlFn) {
	try {
		if (field === "sourceUrl") {
			plugin.sourceUrl = generateSourceUrlFn(plugin.installUrl);
			return true;
		}

		const manifest = await fetchManifest(plugin.installUrl);
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
			default:
				return false;
		}
		return true;
	} catch (error) {
		console.error(`Error updating ${field}:`, error);
		return false;
	}
}

/**
 * Fetches a plugin's manifest and creates a new plugin object.
 * @param {string} url The install URL of the new plugin.
 * @param {function} generateSourceUrlFn A function to generate the source URL.
 * @returns {Promise<object>} A promise that resolves to a new plugin object.
 */
export async function createPluginFromUrl(url, generateSourceUrlFn) {
	const manifest = await fetchManifest(url);
	return {
		name: manifest.name,
		description: manifest.description,
		authors: manifest.authors?.map((author) => author.name) || ["Unknown"],
		status: "working",
		sourceUrl: generateSourceUrlFn(url),
		installUrl: url,
		warningMessage: "",
	};
}

/**
 * Fetches a theme's JSON and creates a new theme object.
 * @param {string} url The URL of the theme JSON.
 * @param {function} generateSourceUrlFn A function to generate the source URL.
 * @returns {Promise<object>} A promise that resolves to a new theme object.
 */
export async function createThemeFromUrl(url, generateSourceUrlFn) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	const manifest = await response.json();
	return {
		name: manifest.name,
		description: manifest.description,
		authors: manifest.authors?.map((author) => author.name) || ["Unknown"],
		sourceUrl: generateSourceUrlFn(url),
		installUrl: url,
		images: [],
		tags: [],
	};
}

/**
 * Updates all themes with latest manifest data.
 * @param {Array} themes Array of theme objects
 * @returns {Promise<{updatedCount: number, failedCount: number}>} Update results
 */
export async function updateAllThemesManifests(themes) {
	let updatedCount = 0;
	let failedCount = 0;

	const updatePromises = themes.map(async (theme) => {
		try {
			const response = await fetch(theme.installUrl);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const manifest = await response.json();
			const newAuthors = manifest.authors?.map((author) => author.name) || [
				"Unknown",
			];

			const changes = [];
			const oldName = theme.name;

			if (manifest.name && manifest.name !== theme.name) {
				changes.push(`  - Name: "${theme.name}" → "${manifest.name}"`);
				theme.name = manifest.name;
			}
			if (manifest.description && manifest.description !== theme.description) {
				changes.push(`  - Description updated.`);
				theme.description = manifest.description;
			}
			if (JSON.stringify(newAuthors) !== JSON.stringify(theme.authors)) {
				changes.push(
					`  - Authors: "${theme.authors.join(", ")}" → "${newAuthors.join(", ")}"`,
				);
				theme.authors = newAuthors;
			}

			if (changes.length > 0) {
				console.groupCollapsed(`🔄 Changes found for: ${oldName}`);
				changes.forEach((change) => {
					console.log(change);
				});
				console.groupEnd();
				updatedCount++;
			}
		} catch (error) {
			console.error(`❌ Error updating ${theme.name}:`, error.message);
			failedCount++;
		}
	});

	await Promise.all(updatePromises);
	return { updatedCount, failedCount };
}

/**
 * @param {Array} plugins Array of plugin objects
 * @returns {Promise<{updatedCount: number, failedCount: number}>} Update results
 */
export async function updateAllManifests(plugins) {
	let updatedCount = 0;
	let failedCount = 0;

	const updatePromises = plugins.map(async (plugin) => {
		try {
			const manifest = await fetchManifest(plugin.installUrl);
			const newAuthors = manifest.authors?.map((author) => author.name) || [
				"Unknown",
			];

			const changes = [];
			const oldName = plugin.name;

			if (manifest.name && manifest.name !== plugin.name) {
				changes.push(`  - Name: "${plugin.name}" → "${manifest.name}"`);
				plugin.name = manifest.name;
			}
			if (manifest.description && manifest.description !== plugin.description) {
				changes.push(`  - Description updated.`);
				plugin.description = manifest.description;
			}
			if (JSON.stringify(newAuthors) !== JSON.stringify(plugin.authors)) {
				changes.push(
					`  - Authors: "${plugin.authors.join(", ")}" → "${newAuthors.join(", ")}"`,
				);
				plugin.authors = newAuthors;
			}

			if (changes.length > 0) {
				console.groupCollapsed(`🔄 Changes found for: ${oldName}`);
				changes.forEach((change) => {
					console.log(change);
				});
				console.groupEnd();
				updatedCount++;
			}
		} catch (error) {
			console.error(`❌ Error updating ${plugin.name}:`, error.message);
			failedCount++;
		}
	});

	await Promise.all(updatePromises);
	return { updatedCount, failedCount };
}
