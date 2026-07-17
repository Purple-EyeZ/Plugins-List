import { hidePopup, showPopup, showToast } from "./shared.js";

/**
 * Creates a simple list section for the review popup.
 * @param {string} title - The title of the section.
 * @param {Array<object>} plugins - The list of plugins to display.
 * @returns {HTMLElement|null} - The created DOM element or null if the list is empty.
 */
function createSimpleChangeList(title, plugins) {
	if (!plugins || plugins.length === 0) return null;
	const section = document.createElement("div");
	const pluginListHtml = plugins.map((p) => `<li>${p.name}</li>`).join("");
	section.innerHTML = `<h4>${title}</h4><ul>${pluginListHtml}</ul>`;
	return section;
}

/**
 * Shows a popup to review changes before saving.
 * @param {object} changes - Object containing added, deleted, and modified plugins/themes.
 * @param {function} onConfirm - Callback to execute on confirmation.
 * @param {function} onRevert - Callback to revert a change.
 */
export function showChangesReviewPopup(
	changes,
	onConfirm,
	onRevert,
	itemType = "Plugins",
) {
	const reviewTemplate = document.getElementById("review-changes-template");
	const changesContainer = document.createElement("div");

	// Added & Deleted Plugins
	const addedSection = createSimpleChangeList(
		`🚀 Added ${itemType}:`,
		changes.added,
	);
	if (addedSection) changesContainer.appendChild(addedSection);

	const deletedSection = createSimpleChangeList(
		`🗑️ Deleted ${itemType}:`,
		changes.deleted,
	);
	if (deletedSection) changesContainer.appendChild(deletedSection);

	// Modified Plugins
	if (changes.modified.length > 0) {
		const modifiedTitle = document.createElement("h4");
		modifiedTitle.innerHTML = `✏️ Modified ${itemType}:`;
		changesContainer.appendChild(modifiedTitle);

		changes.modified.forEach(({ plugin, fields }) => {
			const item = reviewTemplate.content.cloneNode(true);
			const fieldsList = item.querySelector(".field-changes-list");

			item.querySelector(".review-plugin-name").textContent = plugin.name;

			fields.forEach(({ field, oldValue, newValue }) => {
				const fieldContainer = document.createElement("div");
				fieldContainer.className = "field-change";

				const header = document.createElement("div");
				header.className = "field-change-header";

				const fieldName = document.createElement("span");
				fieldName.className = "field-name";
				fieldName.textContent = field;

				const revertButton = document.createElement("button");
				revertButton.className = "btn btn--small btn--danger revert-change";
				revertButton.textContent = "Revert";
				revertButton.dataset.url = plugin.installUrl;
				revertButton.dataset.field = field;

				header.appendChild(fieldName);
				header.appendChild(revertButton);

				const diffContainer = document.createElement("div");
				diffContainer.className = "diff-container";

				const oldValueBox = document.createElement("div");
				oldValueBox.className = "diff-view old-value";
				oldValueBox.textContent =
					typeof oldValue === "string"
						? oldValue
						: JSON.stringify(oldValue, null, 2);

				const newValueBox = document.createElement("div");
				newValueBox.className = "diff-view new-value";
				newValueBox.textContent =
					typeof newValue === "string"
						? newValue
						: JSON.stringify(newValue, null, 2);

				diffContainer.appendChild(oldValueBox);
				diffContainer.appendChild(newValueBox);
				fieldContainer.appendChild(header);
				fieldContainer.appendChild(diffContainer);
				fieldsList.appendChild(fieldContainer);
			});

			changesContainer.appendChild(item);
		});
	}

	const fullContent = document.createElement("div");
	const messageEl = document.createElement("p");
	messageEl.className = "popup-message";
	messageEl.textContent =
		"The following changes will be committed to the dev branch:";

	fullContent.appendChild(messageEl);
	fullContent.appendChild(changesContainer);

	fullContent.addEventListener("click", (e) => {
		if (e.target.classList.contains("revert-change")) {
			const installUrl = e.target.dataset.url;
			const field = e.target.dataset.field;
			onRevert(installUrl, field);
		}
	});

	showPopup({
		title: "Review Changes",
		contentElement: fullContent,
		primaryButton: {
			text: "Confirm & Save",
			action: () => {
				onConfirm();
				hidePopup();
			},
		},
		secondaryButton: { text: "Cancel", action: hidePopup },
		closeOnOutsideClick: true,
	});
}

/**
 * Updates the plugin count displays in the header.
 */
export function updateCounters(
	totalEl,
	workingEl,
	warningEl,
	brokenEl,
	counts,
) {
	totalEl.textContent = counts.total;
	workingEl.textContent = counts.working;
	warningEl.textContent = counts.warning;
	brokenEl.textContent = counts.broken;
}

/**
 * Creates the DOM element for a single plugin card.
 */
function createPluginElement(plugin, handlers) {
	const template = document.getElementById("admin-plugin-template");
	if (!template) return null;

	const card = template.content
		.cloneNode(true)
		.querySelector(".admin-plugin-item");

	card.querySelector(".plugin-name").textContent =
		plugin.name || "Unnamed Plugin";
	card.querySelector(".status-select").value = plugin.status;
	card.querySelector(".warning-message").value = plugin.warningMessage || "";

	card
		.querySelector(".status-select")
		.addEventListener("change", (e) => handlers.onStatusChange(e.target.value));
	card
		.querySelector(".warning-message")
		.addEventListener("input", (e) => handlers.onWarningChange(e.target.value));
	card
		.querySelector(".delete-plugin")
		.addEventListener("click", handlers.onDelete);
	card.querySelector(".edit-plugin").addEventListener("click", handlers.onEdit);

	return card;
}

/**
 * Creates the DOM element for a single theme card.
 */
function createThemeElement(theme, handlers) {
	const template = document.getElementById("admin-theme-template");
	if (!template) return null;

	const card = template.content
		.cloneNode(true)
		.querySelector(".admin-theme-item");

	card.querySelector(".theme-name").textContent = theme.name || "Unnamed Theme";
	card.querySelector(".theme-authors").textContent = (
		theme.authors || ["Unknown"]
	).join(", ");

	card
		.querySelector(".delete-theme")
		.addEventListener("click", handlers.onDelete);
	card.querySelector(".edit-theme").addEventListener("click", handlers.onEdit);

	return card;
}

/**
 * Renders the entire list of plugins into the container.
 */
export function renderPluginsList(container, plugins, currentFilter, handlers) {
	container.innerHTML = "";

	let filteredPlugins = plugins;
	if (currentFilter !== "all") {
		filteredPlugins = plugins.filter((p) => p.status === currentFilter);
	}

	const renderedElements = [];
	for (const plugin of filteredPlugins) {
		const pluginHandlers = {
			onStatusChange: (newStatus) =>
				handlers.onPluginUpdate(plugin, "status", newStatus),
			onWarningChange: (newMessage) =>
				handlers.onPluginUpdate(plugin, "warningMessage", newMessage),
			onDelete: () => handlers.onPluginDelete(plugin),
			onEdit: () => handlers.onPluginEdit(plugin),
		};
		const element = createPluginElement(plugin, pluginHandlers);
		if (!element) continue;
		renderedElements.push(element);
		container.appendChild(element);
	}

	return { renderedPlugins: filteredPlugins, renderedElements };
}

/**
 * Renders the entire list of themes into the container.
 */
export function renderThemesList(container, themes, handlers) {
	container.innerHTML = "";
	const renderedElements = [];
	for (const theme of themes) {
		const themeHandlers = {
			onDelete: () => handlers.onThemeDelete(theme),
			onEdit: () => handlers.onThemeEdit(theme),
		};
		const element = createThemeElement(theme, themeHandlers);
		if (!element) continue;
		renderedElements.push(element);
		container.appendChild(element);
	}

	return { renderedThemes: themes, renderedElements };
}

/**
 * Shows popup form for editing details. (Generic, used by plugins and themes)
 */
export function showDetailsPopup(
	item,
	onSave,
	refetchFieldApi,
	isTheme = false,
) {
	const template = document.getElementById("edit-popup-template");
	if (!template) return;

	const content = template.content.cloneNode(true);
	const form = content.querySelector(".plugin-details-form");
	const inputRefs = {};

	const fields = [
		{ id: "name", label: "Name", value: item.name, type: "input" },
		{
			id: "description",
			label: "Description",
			value: item.description,
			type: "textarea",
		},
		{
			id: "authors",
			label: "Authors",
			value: item.authors?.join(", "),
			type: "input",
		},
		{
			id: "installUrl",
			label: isTheme ? "Theme JSON URL" : "Install URL",
			value: item.installUrl,
			type: "input",
			noRefetch: true,
		},
		{
			id: "sourceUrl",
			label: "Source URL",
			value: item.sourceUrl,
			type: "input",
		},
	];

	if (isTheme) {
		fields.push({
			id: "tags",
			label: "Tags",
			value: item.tags?.join(", "),
			type: "input",
			noRefetch: true,
		});
	}

	for (const field of fields) {
		const formGroup = document.createElement("div");
		formGroup.className = "form-group";

		const label = document.createElement("label");
		label.textContent = `${field.label}:`;

		const inputContainer = document.createElement("div");
		inputContainer.className = "input-with-button";

		const isTextarea = field.type === "textarea";
		const inputElement = document.createElement(
			isTextarea ? "textarea" : "input",
		);

		if (!isTextarea) {
			inputElement.type = "text";
		}

		inputElement.id = `item-${field.id}`;
		inputElement.className = "form-control";
		inputElement.value = field.value || "";

		inputRefs[field.id] = inputElement;

		inputContainer.appendChild(inputElement);

		if (!field.noRefetch) {
			const refetchButton = document.createElement("button");
			refetchButton.className = "btn btn--secondary admin-button refetch-field";
			refetchButton.dataset.field = field.id;
			refetchButton.innerHTML = `<span class="material-symbols-rounded">refresh</span>`;
			inputContainer.appendChild(refetchButton);
		}

		formGroup.appendChild(label);
		formGroup.appendChild(inputContainer);
		form.appendChild(formGroup);
	}

	let currentImages = [];
	if (isTheme) {
		currentImages = Array.isArray(item.images) ? [...item.images] : [];

		const imagesContainer = document.createElement("div");
		imagesContainer.className = "form-group";
		imagesContainer.innerHTML = `
            <label>Images (Previews):</label>
            <div class="theme-images-list" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;"></div>
            <input type="file" class="form-control" accept="image/png, image/jpeg, image/webp" multiple />
        `;
		form.appendChild(imagesContainer);

		const listDiv = imagesContainer.querySelector(".theme-images-list");
		const fileInput = imagesContainer.querySelector("input[type='file']");

		const renderImages = () => {
			listDiv.innerHTML = "";
			currentImages.forEach((imgObj, idx) => {
				const wrapper = document.createElement("div");
				wrapper.style.position = "relative";

				const img = document.createElement("img");
				img.style.width = "100px";
				img.style.height = "75px";
				img.style.objectFit = "cover";
				img.style.borderRadius = "4px";
				img.src =
					typeof imgObj === "string"
						? imgObj
						: `data:${imgObj.mime || "image/png"};base64,${imgObj.base64}`;

				const delBtn = document.createElement("button");
				delBtn.textContent = "×";
				delBtn.className = "btn btn--danger";
				delBtn.style.position = "absolute";
				delBtn.style.top = "2px";
				delBtn.style.right = "2px";
				delBtn.style.padding = "0 5px";
				delBtn.style.fontSize = "12px";
				delBtn.onclick = (e) => {
					e.preventDefault();
					currentImages.splice(idx, 1);
					renderImages();
				};

				wrapper.appendChild(img);
				wrapper.appendChild(delBtn);
				listDiv.appendChild(wrapper);
			});
		};
		renderImages();

		fileInput.addEventListener("change", (e) => {
			const files = Array.from(e.target.files);
			if (!files.length) return;

			files.forEach((file) => {
				const reader = new FileReader();
				reader.onload = (event) => {
					const base64Content = event.target.result.split(",")[1];
					currentImages.push({
						isNew: true,
						name: file.name,
						base64: base64Content,
						mime: file.type,
					});
					renderImages();
				};
				reader.readAsDataURL(file);
			});
			fileInput.value = "";
		});
	}

	for (const button of content.querySelectorAll(".refetch-field")) {
		button.addEventListener("click", async () => {
			const field = button.dataset.field;
			const success = await refetchFieldApi(item, field);

			if (success) {
				if (field === "authors") {
					inputRefs.authors.value = item.authors.join(", ");
				} else {
					inputRefs[field].value = item[field];
				}
				showToast(`${field} updated successfully!`);
			} else {
				showToast(`Failed to update ${field}`);
			}
		});
	}

	showPopup({
		title: `Edit: ${item.name}`,
		contentElement: content,
		primaryButton: {
			text: "Save",
			action: () => {
				const updatedItem = {
					name: inputRefs.name.value,
					description: inputRefs.description.value,
					authors: inputRefs.authors.value
						.split(",")
						.map((a) => a.trim())
						.filter(Boolean),
					installUrl: inputRefs.installUrl.value,
					sourceUrl: inputRefs.sourceUrl.value,
				};
				if (isTheme) {
					updatedItem.tags = inputRefs.tags.value
						.split(",")
						.map((a) => a.trim())
						.filter(Boolean);
					updatedItem.images = currentImages;
				}
				onSave(updatedItem);
				hidePopup();
			},
		},
		closeOnOutsideClick: true,
	});
}
