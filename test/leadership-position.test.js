import test from "node:test";
import assert from "node:assert/strict";
import {
	normalizeLeadershipPositions,
	renderLeadershipPositionField,
} from "../src/leadership-position.js";

test("normalizes leadership positions from legacy delimited strings", () => {
	assert.deepEqual(
		normalizeLeadershipPositions("Scribe; Quartermaster; Scribe", [
			"Scribe",
			"Quartermaster",
		]),
		["Scribe", "Quartermaster"],
	);
});

test("renders checked options for multiple leadership positions", () => {
	const html = renderLeadershipPositionField({
		positions: ["Scribe", "Quartermaster"],
		selected: ["Scribe", "Quartermaster"],
		name: "scoutLeadership",
	});

	assert.match(html, /name="scoutLeadership"/);
	assert.match(html, /value="Scribe" checked/);
	assert.match(html, /value="Quartermaster" checked/);
	assert.doesNotMatch(html, /data-leadership-position-empty[^>]+ checked/);
});

test("renders a compact summary with selected chips and hidden checklist inputs", () => {
	const html = renderLeadershipPositionField({
		positions: ["Scribe", "Quartermaster", "Historian"],
		selected: ["Scribe", "Historian"],
		name: "scoutLeadership",
	});

	assert.match(html, /<details class="leadership-position-combobox"/);
	assert.match(html, /class="leadership-position-summary"/);
	assert.match(html, /class="leadership-position-chip">Scribe<\/span>/);
	assert.match(html, /class="leadership-position-chip">Historian<\/span>/);
	assert.match(html, /data-leadership-position-option name="scoutLeadership" value="Quartermaster"/);
});

test("renders not assigned in the compact summary when no roles are selected", () => {
	const html = renderLeadershipPositionField({
		positions: ["Scribe"],
		selected: [],
	});

	assert.match(html, /leadership-position-placeholder">Not assigned<\/span>/);
	assert.match(html, /data-leadership-position-empty[^>]+ checked/);
});
