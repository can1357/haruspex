// Prefix list.
//
const prefixList = [
	"2e",
	"36",
	"3e",
	"26",
	"64",
	"65",
	"66",
	"67",
	//"9b",
	"f0",
	"f2",
	"f3",
];

// %02x-like hex byte conversion.
//
function hexb(v) {
	return v <= 0xf ? "0" + v.toString(16) : v.toString(16);
}

// Build the opcode table.
//
const tbl = document.getElementById("opcode-table");
const opcodes = [];
for (let n = 0; n <= 0xf; n++) {
	// Create the row entry.
	//
	const row = document.createElement("tr");
	row.id = "row-" + n;
	row.classList = "op-tr";

	// Create the actual items:
	//
	for (let i = 0; i <= 0xf; i++) {
		const opcode = i | (n << 4);
		const opcodeHex = hexb(opcode);

		// Create and push the element.
		//
		const item = document.createElement("td");
		item.id = "op-" + opcodeHex;
		opcodes.push(item);
		row.appendChild(item);
	}
	tbl.appendChild(row);
}

// Request the dataset.
//
let dataset = null;
async function getDataset() {
	if (dataset) {
		return dataset;
	}
	dataset = await (await fetch("/static/dataset.json")).json();
	return dataset;
}

async function visitTable(hexBase) {
	const { instructions } = await getDataset();

	window.history.replaceState(null, "Haruspex - " + hexBase, "/browse/" + hexBase);

	const header = document.getElementById("crumbs");
	if (hexBase.length) {
		header.innerHTML = "";

		for (let i = 0; i < hexBase.length; i += 2) {
			header.insertAdjacentHTML(
				"beforeend",
				`<li class="breadcrumb-item op-button"><a>${hexBase.substr(i, 2)}</a></li>`
			);

			header.lastChild.onclick = () => {
				visitTable(hexBase.substr(0, i));
			};
		}
	} else {
		header.innerHTML = `<span class="path-divider">/</span>`;
	}

	// Iterate every opcode.
	//
	const optbl = Object.keys(instructions).filter((k) => k.startsWith(hexBase));
	for (let i = 0; i <= 0xff; i++) {
		// Convert the full and partial opcode to hex.
		//
		const subHex = hexb(i);

		// Filter the table by the opcode.
		//
		const list = optbl.filter(
			(k) => k[hexBase.length] === subHex[0] && k[hexBase.length + 1] === subHex[1]
		);
		const udList = list.filter((k) => !instructions[k].valid);

		// Reset the table entry.
		//
		const item = opcodes[i];
		item.classList = "border op-td align-middle text-center";
		while (item.firstChild) {
			item.removeChild(item.firstChild);
		}

		// Add the opcode text.
		//
		const div = document.createElement("div");
		div.id = "op-text-" + subHex;
		div.classList = "op-text";
		div.innerText = subHex;
		item.appendChild(div);

		// Add the counter / opcode.
		//
		if (list.length == 1) {
			let decoding = instructions[list[0]].decoding;
			const space = decoding.indexOf(" ");
			if (space != -1) {
				decoding = decoding.substr(0, space);
			}
			if (decoding.length > 8) {
				decoding = decoding.substr(0, 6) + "..";
			}

			item.innerHTML += "<div class='op-entry'>" + decoding.toUpperCase() + "</div>";
		} else {
			item.innerHTML += "<div class='op-counter'>" + list.length + "</div>";
		}

		// Set the classes.
		//
		if (list.length !== 0) {
			if (hexBase === "" && prefixList.includes(hexb(i))) {
				item.classList += " color-text-link";
			} else if (list.length !== 0) {
				item.classList +=
					list.length == 1 ? " color-text-primary" : " color-text-warning";
			}
			if (udList.length !== 0) {
				item.classList += " op-undocumented";
			}

			item.classList += " op-button";
			item.onclick = () => {
				visitTable(hexBase + subHex);
			};
		} else {
			item.classList += " color-text-tertiary color-bg-tertiary";
			item.onclick = () => {};
		}
	}
}

// Build the table with the original location.
//
const browseBaseUrl = "browse/";
const browseOffset = window.location.href.indexOf(browseBaseUrl);
let hexBase = "";
if (browseOffset != -1) {
	const suffix = window.location.href.substr(browseOffset + browseBaseUrl.length);
	for (let base = parseInt(suffix, 16); !isNaN(base) && base !== 0; base >>= 8) {
		const digit = base & 0xff;
		hexBase = hexb(digit) + hexBase;
	}
}
visitTable(hexBase);
