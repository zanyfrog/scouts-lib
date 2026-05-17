import test from "node:test";
import assert from "node:assert/strict";
import { attachEventReservationHandlers, renderEventReservationSection } from "../src/event-reservation.js";

test("renders event reservation buttons from provided events", () => {
	const html = renderEventReservationSection({
		events: [
			{ id: "campout-1", participantId: "scout-1", title: "Spring Campout", hasReservation: false },
			{ id: "service-1", participantId: "adult-1", title: "Service Day", hasReservation: true },
		],
	});

	assert.match(html, /Spring Campout/);
	assert.match(html, /Service Day/);
	assert.match(html, /Reserve a spot/);
	assert.match(html, /Cancel reservation/);
	assert.match(html, /data-reservation-state="open"/);
	assert.match(html, /data-reservation-state="reserved"/);
	assert.match(html, /data-event-reservation-feedback/);
	assert.match(html, /event-reservation-button/);
	assert.match(html, /data-event-id="campout-1"/);
	assert.match(html, /data-participant-id="adult-1"/);
});

test("renders an empty state when events are not provided", () => {
	const html = renderEventReservationSection({
		emptyTitle: "Nothing open",
		emptyMessage: "Try again later.",
	});

	assert.match(html, /Nothing open/);
	assert.match(html, /Try again later\./);
	assert.doesNotMatch(html, /data-event-reservation-button/);
});

test("escapes event content and attributes", () => {
	const html = renderEventReservationSection({
		events: [
			{
				id: "event <1>",
				participantId: "scout & 1",
				title: "<Campout>",
				hasReservation: false,
			},
		],
	});

	assert.match(html, /&lt;Campout&gt;/);
	assert.match(html, /data-event-id="event-&lt;1&gt;"/);
	assert.match(html, /data-participant-id="scout-&amp;-1"/);
});

test("batches reservation changes and updates button state immediately", () => {
	const container = createContainer(`
		<section>
			<article data-event-reservation-item data-event-id="event-1" data-participant-id="scout-1" data-original-reservation="false" data-current-reservation="false">
				<button type="button" data-event-reservation-button aria-pressed="false">Reserve a spot</button>
			</article>
			<article data-event-reservation-item data-event-id="event-2" data-participant-id="scout-1" data-original-reservation="true" data-current-reservation="true">
				<button type="button" data-event-reservation-button aria-pressed="true">Cancel reservation</button>
			</article>
		</section>
	`);
	const details = [];
	const handler = attachEventReservationHandlers(container, {
		onChange: (detail) => details.push(detail),
	});

	const buttons = container.querySelectorAll("[data-event-reservation-button]");
	buttons[0].click();
	buttons[1].click();
	handler.flush();

	assert.equal(buttons[0].textContent, "Cancel reservation");
	assert.equal(buttons[0].getAttribute("aria-pressed"), "true");
	assert.equal(buttons[0].dataset.reservationState, "reserved");
	assert.equal(buttons[1].textContent, "Reserve a spot");
	assert.equal(buttons[1].getAttribute("aria-pressed"), "false");
	assert.equal(buttons[1].dataset.reservationState, "open");
	assert.deepEqual(details, [
		{
			changes: [
				{ participantId: "scout-1", eventId: "event-1", oldValue: false, newValue: true },
				{ participantId: "scout-1", eventId: "event-2", oldValue: true, newValue: false },
			],
		},
	]);

	handler.destroy();
});

test("shows pending feedback immediately and clears it after dispatch", () => {
	const container = createContainer(`
		<section>
			<article data-event-reservation-item data-event-id="event-1" data-participant-id="scout-1" data-original-reservation="false" data-current-reservation="false" data-reservation-state="open" data-reservation-pending="false">
				<button type="button" data-event-reservation-button data-reservation-state="open" aria-pressed="false">Reserve a spot</button>
				<span data-event-reservation-feedback aria-live="polite">Not reserved</span>
			</article>
		</section>
	`);
	const handler = attachEventReservationHandlers(container);
	const item = container.querySelector("[data-event-reservation-item]");
	const button = container.querySelector("[data-event-reservation-button]");
	const feedback = container.querySelector("[data-event-reservation-feedback]");

	button.click();

	assert.equal(item.dataset.reservationPending, "true");
	assert.equal(item.dataset.reservationState, "reserved");
	assert.equal(feedback.textContent, "Reserved. Saving...");

	handler.flush();

	assert.equal(item.dataset.reservationPending, "false");
	assert.equal(feedback.textContent, "Reserved");

	handler.destroy();
});

test("removes a pending change when the user toggles back to the original value", () => {
	const container = createContainer(`
		<section>
			<article data-event-reservation-item data-event-id="event-1" data-participant-id="scout-1" data-original-reservation="false" data-current-reservation="false">
				<button type="button" data-event-reservation-button aria-pressed="false">Reserve a spot</button>
			</article>
		</section>
	`);
	const details = [];
	const handler = attachEventReservationHandlers(container, {
		onChange: (detail) => details.push(detail),
	});
	const button = container.querySelector("[data-event-reservation-button]");

	button.click();
	button.click();
	handler.flush();

	assert.deepEqual(details, []);
	assert.equal(button.textContent, "Reserve a spot");
	assert.equal(button.getAttribute("aria-pressed"), "false");

	handler.destroy();
});

function createContainer(html) {
	const listeners = new Map();
	const container = new Element("div");
	container.innerHTML = html;
	container.addEventListener = (type, listener) => {
		listeners.set(type, listener);
	};
	container.removeEventListener = (type, listener) => {
		if (listeners.get(type) === listener) listeners.delete(type);
	};
	container.dispatchEvent = () => true;
	container._dispatchClick = (target) => {
		listeners.get("click")?.({ target });
	};
	return container;
}

class Element {
	constructor(tagName, attributes = {}, parent = null) {
		this.tagName = tagName;
		this.attributes = new Map(Object.entries(attributes));
		this.children = [];
		this.parent = parent;
		this.dataset = datasetFromAttributes(attributes);
		this._textContent = "";
	}

	set innerHTML(html) {
		this.children = parseElements(html, this);
	}

	get textContent() {
		return this._textContent;
	}

	set textContent(value) {
		this._textContent = String(value);
	}

	setAttribute(name, value) {
		this.attributes.set(name, String(value));
	}

	getAttribute(name) {
		return this.attributes.get(name) ?? null;
	}

	contains(element) {
		for (let current = element; current; current = current.parent) {
			if (current === this) return true;
		}
		return false;
	}

	closest(selector) {
		for (let current = this; current; current = current.parent) {
			if (matchesSelector(current, selector)) return current;
		}
		return null;
	}

	querySelector(selector) {
		return this.querySelectorAll(selector)[0] ?? null;
	}

	querySelectorAll(selector) {
		const matches = [];
		walk(this, (element) => {
			if (element !== this && matchesSelector(element, selector)) matches.push(element);
		});
		return matches;
	}

	click() {
		let root = this;
		while (root.parent) root = root.parent;
		root._dispatchClick?.(this);
	}
}

function parseElements(html, parent) {
	const root = [];
	const stack = [parent];
	const pattern = /<(\/)?([a-z0-9-]+)([^>]*)>|([^<]+)/gi;
	let match;

	while ((match = pattern.exec(html))) {
		if (match[4]) {
			const text = match[4].trim();
			if (text) stack.at(-1).textContent = text;
			continue;
		}
		if (match[1]) {
			stack.pop();
			continue;
		}

		const element = new Element(match[2].toLowerCase(), parseAttributes(match[3]), stack.at(-1));
		stack.at(-1).children.push(element);
		if (stack.length === 1) root.push(element);
		if (!match[3].endsWith("/")) stack.push(element);
	}

	return root;
}

function parseAttributes(source) {
	const attributes = {};
	const pattern = /([a-z0-9-:]+)(?:="([^"]*)")?/gi;
	let match;
	while ((match = pattern.exec(source))) {
		attributes[match[1]] = match[2] ?? "";
	}
	return attributes;
}

function matchesSelector(element, selector) {
	const attribute = selector.match(/^\[([^\]]+)\]$/)?.[1];
	return attribute ? element.attributes.has(attribute) : false;
}

function datasetFromAttributes(attributes) {
	return Object.fromEntries(
		Object.entries(attributes)
			.filter(([name]) => name.startsWith("data-"))
			.map(([name, value]) => [toDatasetKey(name), value]),
	);
}

function toDatasetKey(name) {
	return name
		.slice(5)
		.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function walk(element, visitor) {
	visitor(element);
	for (const child of element.children) {
		walk(child, visitor);
	}
}
