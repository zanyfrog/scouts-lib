import test from "node:test";
import assert from "node:assert/strict";
import { renderCalendarHighlightsSection } from "../src/calendar-highlights.js";

test("renders provided events with the supplied card renderer", () => {
	const html = renderCalendarHighlightsSection({
		events: [{ title: "First" }, { title: "Second" }],
		currentIndex: 1,
		cardRenderer: (event, index, currentIndex) =>
			`<article data-upcoming-card="${index}"${index === currentIndex ? " data-upcoming-current" : ""}>${event.title}</article>`,
	});

	assert.match(html, /Troop calendar highlights/);
	assert.match(html, /First/);
	assert.match(html, /Second/);
	assert.match(html, /data-upcoming-current/);
	assert.match(html, /event-scroll-dot is-active/);
});

test("renders empty state when no events are provided", () => {
	const html = renderCalendarHighlightsSection({
		events: [],
		emptyTitle: "Nothing here",
		emptyMessage: "Try another list.",
	});

	assert.match(html, /Nothing here/);
	assert.match(html, /Try another list\./);
	assert.doesNotMatch(html, /event-scroll-dots/);
});

test("supports custom section labels", () => {
	const html = renderCalendarHighlightsSection({
		events: [{ title: "Campout" }],
		title: "Custom highlights",
		eyebrow: "Calendar",
		rangeLabel: "May 1 - May 31, 2026",
		sectionId: "custom-events",
	});

	assert.match(html, /id="custom-events"/);
	assert.match(html, /Custom highlights/);
	assert.match(html, /Calendar/);
	assert.match(html, /May 1 - May 31, 2026/);
});
