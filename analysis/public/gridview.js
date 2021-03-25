//prettier-ignore
const data_schema = [
    { key: "opcode",           title: "Opcode",            detail: "Sample byte array" },
    { key: "decLength",        title: "Length",            detail: "Full instruction length according to XED" },
    { key: "decoding",         title: "Decoding",          detail: "Disassembly of the sample according to XED" },
    { key: "valid",            title: "Recognized",        detail: "Expected to execute on the processor or not" },
    { key: "iclass",           title: "Class",             detail: "Instruction class according to XED" },
    { key: "category",         title: "Category",          detail: "Instruction category according to XED" },
    { key: "extension",        title: "Extension",         detail: "Extension set according to XED" },
    { key: "cpl",              title: "CPL",               detail: "Privilege level this instruction runs at according to XED" },
    { key: "outOfOrder",       title: "Div cycles",        detail: "Cycles spent during out-of-order execution of the division." },
    { key: "mits",             title: "µOps (MITE)",       detail: "# of µOps decoded by the micro-instruction translation engine" },
    { key: "ms",               title: "µOps (MS)",         detail: "# of µOps decoded by the microcode sequencer" },
    { key: "serializing",      title: "Serializing",       detail: "Enforces ordering of the pipeline, if not also a speculative fence, means only applicable to the memory accesses" },
    { key: "speculationFence", title: "Speculation Fence", detail: "Halts speculative execution" },
];

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

function eventIntersects(event, elem) {
	if (!elem) return false;

	const rect = elem.getBoundingClientRect();
	return (
		event.clientX >= rect.left &&
		event.clientX < rect.right &&
		event.clientY >= rect.top &&
		event.clientY < rect.bottom
	);
}

let activePopover;
function checkPopoverForClose(event) {
	if (
		!event ||
		(activePopover &&
			!eventIntersects(event, activePopover) &&
			!eventIntersects(event, activePopover.getElementsByClassName("Popover-message")[0]))
	) {
		const popovers = document.getElementsByClassName("Popover");
		for (let i = 0; i < popovers.length; i += 1)
			popovers[i].parentNode.removeChild(popovers[i]);
	}
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
		if (udList.length !== 0) {
			item.classList += " op-undocumented";
		}

		if (list.length !== 0) {
			if (hexBase === "" && prefixList.includes(hexb(i))) {
				item.classList += " color-text-link";
			} else {
				item.classList +=
					list.length == 1 ? " color-text-primary" : " color-text-warning";
			}

			item.classList += " op-button";
			item.onclick = () => {
				checkPopoverForClose();

				if (list.length > 1) {
					activePopover = null;
					visitTable(hexBase + subHex);
				} else {
					const instr = instructions[list[0]];
					const items = data_schema
						.map(
							({ key, title, desc }) =>
								`<li><strong>${title}</strong> = <code>${instr[key]}</code></li>`
						)
						.join("");

					item.insertAdjacentHTML(
						"beforeend",
						`<div class="Popover right-0 left-0 ml-2 mt-1">
							<div class="Popover-message Popover-message--top-left Popover-message--large text-left p-4 mt-2 mx-auto Box box-shadow-large">
								<h4 class="mb-2 d-flex flex-justify-between flex-items-center">
									<span>Instruction details</span>
									<button class="btn mr-2" type="button" id="${instr.opcode}">
										<svg class="octicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path></svg>
							  		</button>
								</h4>
								<ul>
									${items}
								</ul>

							</div>
						</div>`
					);

					activePopover = item;
					document.getElementById(instr.opcode).addEventListener("click", (event) => {
						checkPopoverForClose();
						event.stopPropagation();
					});
				}
			};
		} else {
			item.classList += " color-text-tertiary color-bg-tertiary";
			item.onclick = () => {};
		}
	}
}

document.addEventListener("click", (event) => {
	checkPopoverForClose(event);
});

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
