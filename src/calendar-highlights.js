export function renderCalendarHighlightsSection(options = {}) {
	const {
		events = [],
		currentIndex = 0,
		title = "Troop calendar highlights",
		eyebrow = "Upcoming Events",
		rangeLabel = "",
		emptyTitle = "No events in this window",
		emptyMessage = "Check back soon for updated troop calendar details.",
		sectionId = "upcoming-events",
		cardRenderer = defaultCardRenderer,
	} = options;
	const items = Array.isArray(events) ? events : [];
	const safeCurrentIndex = clampIndex(currentIndex, items.length);

	return `<section class="section upcoming-events-section" id="${escapeAttribute(sectionId)}">
	<div class="section-heading centered-events-heading">
		<div>
			<p class="eyebrow">${escapeHtml(eyebrow)}</p>
			<h2>${escapeHtml(title)}</h2>
		</div>
		<p class="section-copy">${escapeHtml(rangeLabel)}</p>
	</div>
	<div class="upcoming-scroller-shell">
		<button class="event-scroll-button previous" type="button" data-event-scroll="-1" aria-label="Browse earlier events">&#8249;</button>
		<div class="upcoming-event-scroller" data-upcoming-scroller>
			${items.map((event, index) => cardRenderer(event, index, safeCurrentIndex)).join("") || renderEmptyState(emptyTitle, emptyMessage)}
		</div>
		<button class="event-scroll-button next" type="button" data-event-scroll="1" aria-label="Browse later events">&#8250;</button>
	</div>
	${renderDots(items.length, safeCurrentIndex)}
</section>`;
}

function renderEmptyState(title, message) {
	return `<article class="panel empty-events-panel">
	<div class="panel-heading">
		<h3>${escapeHtml(title)}</h3>
		<p>${escapeHtml(message)}</p>
	</div>
</article>`;
}

function renderDots(count, currentIndex) {
	if (!count) return "";

	const dots = Array.from(
		{ length: count },
		(_, index) => `		<span class="event-scroll-dot${index === currentIndex ? " is-active" : ""}">
		</span>`,
	).join("");

	return `<div class="event-scroll-dots" aria-label="Event position">
${dots}
	</div>`;
}

function defaultCardRenderer(event, index, currentIndex) {
	const title = escapeHtml(event?.title || `Event ${index + 1}`);
	const isCurrent = index === currentIndex;
	return `<article class="event-card landing-event-card${isCurrent ? " is-current" : ""}" data-upcoming-card="${index}"${isCurrent ? " data-upcoming-current" : ""}>
	<div class="event-content landing-event-content">
		<h3>${title}</h3>
	</div>
</article>`;
}

function clampIndex(value, count) {
	if (!count) return 0;
	const index = Number.isFinite(Number(value)) ? Number(value) : 0;
	return Math.min(Math.max(0, index), count - 1);
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
