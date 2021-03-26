// Write the chip table.
//
async function writeTable() {
	const datasets = await (await fetch(`/datasets.json`)).json();
	console.log(datasets);

	const el = document.getElementById("chip-table");
	for (const { id, brand } of datasets) {
		el.innerHTML += `<a class="menu-item" href="/chip/${id}">${brand}</a>`;
	}
}
writeTable();
