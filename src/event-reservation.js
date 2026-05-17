const DEFAULT_BATCH_DELAY = 1000;
const EVENT_NAME = "event-reservation-change";

export function renderEventReservationSection(options = {}) {
	const {
		events = [],
		title = "Event reservations",
		emptyTitle = "No events available",
		emptyMessage = "Check back soon for updated event details.",
		sectionId = "event-reservations",
		listLabel = "Available event reservations",
		includeStyles = true,
	} = options;
	const items = Array.isArray(events) ? events : [];

	return `${includeStyles ? renderDefaultStyles() : ""}<section class="section event-reservation-section" id="${escapeAttribute(sectionId)}">
	<div class="section-heading event-reservation-heading">
		<h2>${escapeHtml(title)}</h2>
	</div>
	<div class="event-reservation-list" aria-label="${escapeAttribute(listLabel)}">
		${items.map(renderReservationItem).join("") || renderEmptyState(emptyTitle, emptyMessage)}
	</div>
</section>`;
}

export function attachEventReservationHandlers(container, options = {}) {
	if (!container?.addEventListener) {
		throw new TypeError("A DOM container is required.");
	}

	const {
		batchDelay = DEFAULT_BATCH_DELAY,
		eventName = EVENT_NAME,
		onChange,
	} = options;
	const pendingChanges = new Map();
	let timer = null;

	function handleClick(event) {
		const button = event.target?.closest?.("[data-event-reservation-button]");
		if (!button || !container.contains(button)) return;

		const item = button.closest("[data-event-reservation-item]");
		if (!item) return;

		const participantId = item.dataset.participantId || "";
		const eventId = item.dataset.eventId || "";
		const originalValue = item.dataset.originalReservation === "true";
		const oldValue = item.dataset.currentReservation === "true";
		const newValue = !oldValue;
		const feedback = item.querySelector("[data-event-reservation-feedback]");

		item.dataset.currentReservation = String(newValue);
		item.dataset.reservationState = newValue ? "reserved" : "open";
		item.dataset.reservationPending = "true";
		button.textContent = newValue ? "Cancel reservation" : "Reserve a spot";
		button.setAttribute("aria-pressed", String(newValue));
		button.dataset.reservationState = newValue ? "reserved" : "open";
		if (feedback) {
			feedback.textContent = newValue ? "Reserved. Saving..." : "Reservation canceled. Saving...";
		}

		const changeKey = `${participantId}\u0000${eventId}`;
		if (newValue === originalValue) {
			pendingChanges.delete(changeKey);
		} else {
			pendingChanges.set(changeKey, {
				participantId,
				eventId,
				oldValue: originalValue,
				newValue,
			});
		}

		scheduleDispatch();
	}

	function scheduleDispatch() {
		if (timer) clearTimeout(timer);
		timer = setTimeout(dispatchChanges, normalizeDelay(batchDelay));
	}

	function dispatchChanges() {
		timer = null;
		const changes = Array.from(pendingChanges.values());
		pendingChanges.clear();
		if (!changes.length) return;
		for (const change of changes) {
			updateFeedbackAfterDispatch(change);
		}

		const detail = { changes };
		if (typeof onChange === "function") {
			onChange(detail);
		}
		container.dispatchEvent(new CustomEvent(eventName, {
			bubbles: true,
			detail,
		}));
	}

	container.addEventListener("click", handleClick);

	return {
		destroy() {
			container.removeEventListener("click", handleClick);
			if (timer) clearTimeout(timer);
			timer = null;
			pendingChanges.clear();
		},
		flush: dispatchChanges,
	};

	function updateFeedbackAfterDispatch(change) {
		const item = Array.from(container.querySelectorAll("[data-event-reservation-item]"))
			.find((candidate) =>
				candidate.dataset.eventId === change.eventId
				&& candidate.dataset.participantId === change.participantId);
		if (!item) return;

		item.dataset.reservationPending = "false";
		const feedback = item.querySelector("[data-event-reservation-feedback]");
		if (feedback) {
			feedback.textContent = change.newValue ? "Reserved" : "Not reserved";
		}
	}
}

function renderReservationItem(event, index) {
	const eventId = event?.id ?? "";
	const participantId = event?.participantId ?? "";
	const title = event?.title || `Event ${index + 1}`;
	const hasReservation = Boolean(event?.hasReservation);
	const buttonLabel = hasReservation ? "Cancel reservation" : "Reserve a spot";
	const reservationState = hasReservation ? "reserved" : "open";
	const statusLabel = hasReservation ? "Reserved" : "Not reserved";

	return `<article class="event-reservation-item" data-event-reservation-item data-event-id="${escapeAttribute(eventId)}" data-participant-id="${escapeAttribute(participantId)}" data-original-reservation="${hasReservation}" data-current-reservation="${hasReservation}" data-reservation-state="${reservationState}" data-reservation-pending="false">
			<h3>${escapeHtml(title)}</h3>
			<div class="event-reservation-action">
				<button class="event-reservation-button" type="button" data-event-reservation-button data-reservation-state="${reservationState}" aria-pressed="${hasReservation}">
				${buttonLabel}
				</button>
				<span class="event-reservation-feedback" data-event-reservation-feedback aria-live="polite">${statusLabel}</span>
			</div>
		</article>`;
}

function renderEmptyState(title, message) {
	return `<article class="panel empty-event-reservation-panel">
			<h3>${escapeHtml(title)}</h3>
			<p>${escapeHtml(message)}</p>
		</article>`;
}

function normalizeDelay(value) {
	const delay = Number(value);
	return Number.isFinite(delay) && delay >= 0 ? delay : DEFAULT_BATCH_DELAY;
}

function renderDefaultStyles() {
	return `<style>
.event-reservation-list {
	display: grid;
	gap: 0.75rem;
}

.event-reservation-item {
	align-items: center;
	border: 1px solid #d4d4d8;
	border-radius: 0.5rem;
	display: grid;
	gap: 0.75rem;
	grid-template-columns: minmax(0, 1fr) auto;
	padding: 1rem;
}

.event-reservation-item h3 {
	font-size: 1rem;
	line-height: 1.35;
	margin: 0;
}

.event-reservation-action {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	justify-content: flex-end;
}

.event-reservation-button {
	border: 2px solid #14532d;
	border-radius: 0.5rem;
	box-shadow: 0 2px 0 #052e16;
	cursor: pointer;
	font: inherit;
	font-weight: 700;
	min-height: 2.75rem;
	padding: 0.65rem 1rem;
	transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease, transform 120ms ease;
}

.event-reservation-button[data-reservation-state="open"] {
	background: #16a34a;
	color: #ffffff;
}

.event-reservation-button[data-reservation-state="reserved"] {
	background: #ffffff;
	border-color: #b91c1c;
	box-shadow: 0 2px 0 #7f1d1d;
	color: #b91c1c;
}

.event-reservation-button:hover {
	filter: brightness(0.96);
}

.event-reservation-button:active {
	box-shadow: 0 0 0 #000000;
	transform: translateY(2px);
}

.event-reservation-button:focus-visible {
	outline: 3px solid #facc15;
	outline-offset: 3px;
}

.event-reservation-item[data-reservation-pending="true"] .event-reservation-button {
	box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.45);
	transform: translateY(1px);
}

.event-reservation-feedback {
	color: #52525b;
	font-size: 0.875rem;
	font-weight: 700;
	min-width: 7.5rem;
}

.event-reservation-item[data-reservation-pending="true"] .event-reservation-feedback {
	color: #854d0e;
}

@media (max-width: 540px) {
	.event-reservation-item {
		align-items: stretch;
		grid-template-columns: 1fr;
	}

	.event-reservation-action {
		justify-content: flex-start;
	}
}
</style>`;
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
	return escapeHtml(value).replaceAll(" ", "-");
}
