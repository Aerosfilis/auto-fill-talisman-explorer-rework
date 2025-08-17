{
/////////////////////
// Const variables //
/////////////////////

const possible_slots = ["①", "①①", "②", "②①", "③", "W①", "W①①", "W①①①"]
const skills_all = DATA.groups.flatMap((group) => group.skills);

DATA.records.map((record) => {
	record.g1 = DATA.groups[record.g1];
	record.g2 = DATA.groups[record.g2];
	record.g3 = DATA.groups[record.g3] || {};
	record.skill_names = record.g1.skills.concat(
		record.g2.name !== record.g1.name ? record.g2.skills : []).concat(
		record.g3.name && record.g3.name !== record.g1.name && record.g3.name !== record.g2.name ? record.g3.skills : []).map((skill) => skill.name);
});

var skills_grouped = {};
for (const skill of skills_all) {
	if (skills_grouped.hasOwnProperty(skill.name)) {
		if (!skills_grouped[skill.name].includes(skill.level))
			skills_grouped[skill.name].push(skill.level);
	} else
		skills_grouped[skill.name] = [skill.level];
}
const skills_grouped_sorted = Object.entries(skills_grouped).sort((a, b) => a[0].localeCompare(b[0], "en", {sensitivity: "base"}));
const skill_names = skills_grouped_sorted.flatMap((skill) => skill[0]);



//////////
// Main //
//////////

document.addEventListener("DOMContentLoaded", function () {
	populateSelectors();
	renderSlotChecks();
	document.getElementById("clearBtn").addEventListener("click", clearAll);
	document.getElementById("runBtn").addEventListener("click", search_talismans);
});


/////////////////////
// Setup Selectors //
/////////////////////

function populateSelectors() {
	const __selector_ids = [
		["skillA", "levelA"],
		["skillB", "levelB"],
		["skillC", "levelC"]
	]

	for (const selector of __selector_ids) {
		makeOptions(document.getElementById(selector[0]), skill_names, "— (choose a skill)");
			refreshLevelOptions(
			document.getElementById(selector[0]),
			document.getElementById(selector[1]),
		); 
		document
			.getElementById(selector[0])
			.addEventListener("change", () =>
				refreshLevelOptions(
					document.getElementById(selector[0]),
					document.getElementById(selector[1]),
				),
			);
	}
}

function renderSlotChecks() {
	const slot_check = document.getElementById("slotChecks");
	slot_check.innerHTML = "";

	for (const slots of possible_slots) {
		const label = document.createElement("label");
		const check_box = document.createElement("input");
		check_box.type = "checkbox";
		check_box.value = slots;
		const span = document.createElement("span");
		span.textContent = slots;

		label.appendChild(check_box);
		label.appendChild(span);
		slot_check.appendChild(label);
	}
}



///////////////
// Clear All //
///////////////

function clearAll() {
	for (const id of [
		"skillA",
		"skillB",
		"skillC",
		"levelA",
		"levelB",
		"levelC",
	]) {
		const el = document.getElementById(id);
		if (el) el.value = "";
	}
	document.querySelector("#aggTable tbody").innerHTML = "";
	document.querySelector("#detailTable tbody").innerHTML = "";
	document.getElementById("summary").textContent = "";
	document
		.querySelectorAll('#slotChecks input[type="checkbox"]')
		.forEach((cb) => (cb.checked = false));
}



//////////////////////
// Search Talismans //
//////////////////////

function search_talismans() {
	const skills_requested = readSelection();
	const slot_filter = getSelectedSlots();
	const t0 = performance.now();

	var matching_talismans = [];
	var aggregated_talismans = [];
	for (const record of DATA.records) {
		if (skills_requested.filter((skill) => record.skill_names.includes(skill.name)).length === 0
			|| (slot_filter.length > 0 && slot_filter.filter((slots) => !record.slots.includes(slots)).length !== 0)) continue;

		// Loops through all 3 possible skills on the charm, removing from the list of requested one if there's a match
		for (const skill_1 of record.g1.skills) {
			const requested_left = skills_requested.filter((skill) => skill.name !== skill_1.name || skill.level > skill_1.level);
			for (const skill_2 of record.g2.skills) {

				// Stops here if the charm can't have a 3rd skill and check tha all requested skills have been assigned
				if ((!record.g3.skills && requested_left.filter((skill) => skill.name !== skill_2.name || skill.level > skill_2.level).length === 0)
						&& skill_1.name !== skill_2.name ){

					// loops over possible deco slots and check if all skills requested were assigned
					for (const slot of record.slots)
						if (slot_filter.length === 0 || slot_filter.includes(slot)) {

							const talisman = {rarity: record.rarity, skills: [skill_1, skill_2, {}], slot: slot}
							matching_talismans.push(talisman);
							aggregated_talismans = aggregate(aggregated_talismans, talisman, skills_requested);
						}
				
				} else if (record.g3.skills) {
					const requested_left_last = requested_left.filter((skill) => skill.name !== skill_2.name || skill.level > skill_2.level);
					for (const skill_3 of record.g3.skills) {

						// similar loop for deco slots but with 3 skills instead of 2 + check for assigned requested skills
						for (const slot of record.slots)
							if ((requested_left_last.filter((skill) => skill.name !== skill_3.name || skill.level > skill_3.level).length === 0)
									&& skill_1.name !== skill_2.name && skill_1.name !== skill_3.name && skill_2.name !== skill_3.name
									&& (slot_filter.length === 0 || slot_filter.includes(slot))) {

								const talisman = {rarity: record.rarity, skills: [skill_1, skill_2, skill_3], slot: slot};
								matching_talismans.push(talisman);
								aggregated_talismans = aggregate(aggregated_talismans, talisman, skills_requested);
							}
					}
				}
			}
		}
	}
	
	document.getElementById("summary").textContent = `Search Complete (${(performance.now() - t0).toFixed(2)}ms) Total possible talismans: ${matching_talismans.length}`;

	render_aggregated(aggregated_talismans.reverse(), skills_requested);
	render_sample(matching_talismans);
}

function aggregate(aggregated_talismans, matched_talisman, skills_requested) {
	var existing_index = -1;
	for (const aggregated_idx in aggregated_talismans) {
		const talisman = aggregated_talismans[aggregated_idx];
		if (talisman.rarity === matched_talisman.rarity && talisman.slot === matched_talisman.slot) {
			existing_index = aggregated_idx;
			break;
		}
	}
	
	var matching_skill = skills_requested.map((skill) => matched_talisman.skills.find((_skill) => _skill.name === skill.name));
	if (existing_index === -1)
		aggregated_talismans.push({rarity: matched_talisman.rarity, slot: matched_talisman.slot, skills: matching_skill, amount: 1});
	else {
		aggregated_talismans[existing_index].amount++;
		aggregated_talismans[existing_index].skills.map((skill, idx) => matching_skill[idx].level < skill.level ? matching_skill[idx] : skill.level);
	}
	return aggregated_talismans;
}

function render_aggregated(aggregated_talismans, skills_requested) {
	const skills = skills_requested.map((skill) => `${skill.name} ${skill.level}+`).join(" | ");

	const tbody = document.querySelector("#aggTable tbody");
	tbody.innerHTML = aggregated_talismans.map((talisman) =>
		`<tr><td><span class="pill">${talisman.rarity}</span></td>
		<td>${skills}</td>
		<td>${talisman.slot}</td>
		<td>${talisman.amount}</td></tr>`
	).join("");

}

function render_sample(talismans) {
	max_rows = document.getElementById("limit").value;
	const tbody = document.querySelector("#detailTable tbody");
	tbody.innerHTML = "";
	for (const talisman of talismans.slice(0, max_rows)) {
		var skills_text = ""
		for (const skill of talisman.skills) {
			if (!skill.name)
				skills_text += `<td> - </td>`;
			else
				skills_text += `<td>${skill.name} +${skill.level}</td>`;
		}
		tbody.innerHTML +=
			`<tr><td><span class="pill">${talisman.rarity}</span></td>
			<td>${talisman.slot}</td>
			${skills_text}</tr>`;
	}
}



///////////////
// Utilities //
///////////////

function baseName(raw) {
	if (!raw) return "";
	const i = raw.indexOf(" +");
	return (i === -1 ? raw : raw.slice(0, i)).trim();
}

function getSelectedSlots() {
	const out = [];
	document
		.querySelectorAll('#slotChecks input[type="checkbox"]')
		.forEach((check_box) => {
			if (check_box.checked) out.push(check_box.value);
		});
	return out;
}

function makeOptions(selector, items, first) {
	selector.innerHTML = "";
	if (first !== undefined) {
		const option_element = document.createElement("option");
		option_element.value = "";
		option_element.textContent = first;
		selector.appendChild(option_element);
	}
	for (const item of items) {
		const option_element = document.createElement("option");
		option_element.value = item;
		option_element.textContent = item;
		selector.appendChild(option_element);
	}
}

function readSelection() {
	const skill_A = document.getElementById("skillA").value;
	const skill_B = document.getElementById("skillB").value;
	const skill_C = document.getElementById("skillC").value;
	const level_A = document.getElementById("levelA").value;
	const level_B = document.getElementById("levelB").value;
	const level_C = document.getElementById("levelC").value;
	var skills_requested = [{}, {}, {}];
	if (skill_A) skills_requested[0] = { name: skill_A, level: level_A ? parseInt(level_A) : 0 };
	if (skill_B) skills_requested[1] = { name: skill_B, level: level_B ? parseInt(level_B) : 0 };
	if (skill_C) skills_requested[2] = { name: skill_C, level: level_C ? parseInt(level_C) : 0 };
	skills_requested = skills_requested.sort((a, b) => {
		if (!a.name) return 1;
		if (!b.name) return -1;
		return a.name.localeCompare(b.name, "en", {sensitivity: "base"})
	}).filter((skill) => skill.hasOwnProperty("name"));
	return skills_requested;
}

function refreshLevelOptions(skill_selector, level_selector) {
	const levels = skills_grouped_sorted.filter((skill) => skill[0] === skill_selector.value).flat()[1] || [];
	makeOptions(
		level_selector,
		levels,
	);
}

function skillsInGroup(g) {
	if (!DATA.groups[g]) return [];
	return DATA.groups[g].skills || [];
}




}