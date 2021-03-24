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
const datasetPromise = new Promise((res, rej) => {
	$.getJSON("/dataset.json", function (data) {
		res(data);
	});
});

async function visitTable(hexBase) {
	// Wait for the dataset to load.
	//
	const { instructions } = await datasetPromise;

	const header = document.getElementById("opcode-table-prev");
	if (hexBase.length) {
		header.innerHTML = "Viewing " + hexBase + "* ";

		const button = document.createElement("span");
		button.onclick = () => {
			visitTable(hexBase.substr(0, hexBase.length - 2));
		};
		button.classList = "op-tbl-prev-button";
		button.innerText = "(Back)";
		header.appendChild(button);
	} else {
		header.innerHTML = "Viewing all entries.";
	}

	// Iterate every opcode.
	//
	const scopeTable = Object.keys(instructions).filter((k) => k.startsWith(hexBase));
	for (let i = 0; i <= 0xff; i++) {
		// Convert the full and partial opcode to hex.
		//
		const subHex = hexb(i);

		// Filter the table by the opcode.
		//
		const list = scopeTable.filter((k) => k.substr(hexBase.length, 2) === subHex);
		const udList = list.filter((k) => !instructions[k].valid);

		// Reset the table entry.
		//
		const item = opcodes[i];
		item.classList = "op-td align-middle text-center";
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
				item.classList += " op-prefix";
			} else if (list.length !== 0) {
				item.classList += list.length == 1 ? " op-active" : " op-group";
			}
			if (udList.length !== 0) {
				item.classList += " op-undocumented";
			}
			item.onclick = () => {
				visitTable(hexBase + subHex);
			};
		} else {
			item.classList += " op-inactive";
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
