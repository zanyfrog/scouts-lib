const DEFAULT_NAME = "leadershipPositions";

export function normalizeLeadershipPositions(value, options = []) {
	const allowed = new Set(options.filter(Boolean));
	const values = Array.isArray(value)
		? value
		: String(value || "")
				.split(/[;,|]/)
				.map((item) => item.trim());
	return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))]
		.filter((item) => !allowed.size || allowed.has(item));
}

export function renderLeadershipPositionField(options = {}) {
	const {
		positions = [],
		selected = [],
		name = DEFAULT_NAME,
		label = "Leadership position",
		emptyLabel = "Not assigned",
		disabled = false,
	} = options;
	const selectablePositions = positions.filter(Boolean);
	const selectedValues = new Set(
		normalizeLeadershipPositions(selected, selectablePositions),
	);
	const disabledAttribute = disabled ? " disabled" : "";
	const summary = renderLeadershipSummary(selectedValues, emptyLabel);
	return `<details class="leadership-position-combobox" data-leadership-position-field>
<summary class="leadership-position-summary">
<span class="leadership-position-summary-label">${escapeHtml(label)}</span>
<span class="leadership-position-summary-values" data-leadership-position-summary>${summary}</span>
<span class="leadership-position-summary-action" aria-hidden="true">Edit</span>
</summary>
<fieldset class="leadership-position-field">
<legend>${escapeHtml(label)}</legend>
<div class="leadership-position-options">
<label class="leadership-position-option leadership-position-empty">
<input type="checkbox" data-leadership-position-empty name="${escapeAttribute(name)}" value=""${selectedValues.size ? "" : " checked"}${disabledAttribute} />
<span>${escapeHtml(emptyLabel)}</span>
</label>
${selectablePositions
		.map(
			(position) => `<label class="leadership-position-option">
<input type="checkbox" data-leadership-position-option name="${escapeAttribute(name)}" value="${escapeAttribute(position)}"${selectedValues.has(position) ? " checked" : ""}${disabledAttribute} />
<span>${escapeHtml(position)}</span>
</label>`,
		)
		.join("")}
</div>
</fieldset>
</details>`;
}

export function collectLeadershipPositionValues(container, name = DEFAULT_NAME) {
	if (!container?.querySelectorAll) return [];
	return [...container.querySelectorAll(`input[name="${cssEscape(name)}"][data-leadership-position-option]:checked`)]
		.map((input) => input.value)
		.filter(Boolean);
}

export function attachLeadershipPositionFieldHandlers(container) {
	if (!container?.addEventListener) {
		throw new TypeError("A DOM container is required.");
	}

	function handleChange(event) {
		const input = event.target?.closest?.(
			"[data-leadership-position-empty], [data-leadership-position-option]",
		);
		if (!input || !container.contains(input)) return;

		const field = input.closest("[data-leadership-position-field]");
		if (!field) return;
		const empty = field.querySelector("[data-leadership-position-empty]");
		const options = [...field.querySelectorAll("[data-leadership-position-option]")];

		if (input.matches("[data-leadership-position-empty]") && input.checked) {
			options.forEach((option) => {
				option.checked = false;
			});
			updateLeadershipSummary(field);
			return;
		}

		if (input.matches("[data-leadership-position-option]") && input.checked && empty) {
			empty.checked = false;
			updateLeadershipSummary(field);
			return;
		}

		if (empty && !options.some((option) => option.checked)) {
			empty.checked = true;
		}
		updateLeadershipSummary(field);
	}

	container.addEventListener("change", handleChange);
	return {
		destroy() {
			container.removeEventListener("change", handleChange);
		},
	};
}

function renderLeadershipSummary(selectedValues, emptyLabel) {
	const values = [...selectedValues];
	if (!values.length) {
		return `<span class="leadership-position-placeholder">${escapeHtml(emptyLabel)}</span>`;
	}
	return values
		.map(
			(value) =>
				`<span class="leadership-position-chip">${escapeHtml(value)}</span>`,
		)
		.join("");
}

function updateLeadershipSummary(field) {
	const summary = field.querySelector("[data-leadership-position-summary]");
	if (!summary) return;
	const emptyLabel =
		field.querySelector("[data-leadership-position-empty] + span")?.textContent ||
		"Not assigned";
	const selected = [
		...field.querySelectorAll("[data-leadership-position-option]:checked"),
	].map((input) => input.value);
	summary.innerHTML = renderLeadershipSummary(new Set(selected), emptyLabel);
}

function escapeHtml(value) {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
	return escapeHtml(value);
}

function cssEscape(value) {
	return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
