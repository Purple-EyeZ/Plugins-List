const container = document.getElementById("diffs-container");
const loader = document.getElementById("loader");

/**
 * Formats minified code using Prettier to make it readable.
 * @param {string} code - The minified source code.
 * @returns {string} - The formatted code.
 */
const formatCode = (code) => {
	try {
		return prettier.format(code, {
			parser: "babel",
			plugins: prettierPlugins,
			printWidth: 80,
			semi: true,
			tabWidth: 2,
		});
	} catch (e) {
		console.warn("Formatting failed, falling back to raw code:", e);
		return code;
	}
};

/**
 * Renders a single diff entry card.
 * @param {Object} entry - The history entry including oldCode and newCode.
 */
function renderDiffEntry(entry) {
	const card = document.createElement("div");
	card.className = "diff-card";

	const date = new Date(entry.date).toLocaleString([], {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	card.innerHTML = `
        <div class="diff-header">
            <span class="diff-plugin-name">${entry.pluginName}</span>
            <span class="diff-date">${date}</span>
        </div>
        <div class="diff-content" id="diff-content-${Date.parse(entry.date)}"></div>
    `;
	container.appendChild(card);

	setTimeout(() => {
		const oldPretty = formatCode(entry.oldCode);
		const newPretty = formatCode(entry.newCode);

		const patch = Diff.createTwoFilesPatch(
			"Old Version",
			"New Version",
			oldPretty,
			newPretty,
		);

		const targetElement = card.querySelector(".diff-content");
		const ui = new Diff2HtmlUI(targetElement, patch, {
			drawFileList: false,
			matching: "lines",
			outputFormat: "line-by-line",
			colorScheme: "dark",
		});
		ui.draw();
	}, 10);
}

/**
 * Main function to load and display data.
 */
async function loadDiffs() {
	try {
		const resp = await fetch("/api/diff-history");

		if (!resp.ok) {
			throw new Error(`API Error: ${resp.status}`);
		}

		const history = await resp.json();

		loader.style.display = "none";

		if (!history || history.length === 0) {
			container.innerHTML = `
                <div class="no-results-message" style="display:flex; flex-direction:column; align-items:center;">
                    <span class="material-symbols-rounded" style="font-size: 3rem; margin-bottom: 10px;">check_circle</span>
                    <p>No changes detected recently.</p>
                </div>
            `;
			return;
		}

		for (const entry of history) {
			renderDiffEntry(entry);
		}
	} catch (e) {
		console.error(e);
		loader.innerHTML = `<span style="color: var(--color-danger);">Error loading tracker history.</span>`;
	}
}

document.addEventListener("DOMContentLoaded", loadDiffs);
