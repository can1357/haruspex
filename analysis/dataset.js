const fs = require("fs");
const crypto = require("crypto");

const prefixList = [
	"2e",
	"36",
	"3e",
	"26",
	"40",
	"41",
	"42",
	"43",
	"44",
	"45",
	"46",
	"47",
	"48",
	"49",
	"4a",
	"4b",
	"4c",
	"4d",
	"4e",
	"4f",
	"64",
	"65",
	"66",
	"67",
	"9b",
	"f0",
	"f2",
	"f3",
];

function hexb(v) {
	return v <= 0xf ? "0" + v.toString(16) : v.toString(16);
}

function parse(rawData) {
	// Read and parse the JSON.
	//
	const { nopBaseline, faultBaseline, data, nopUops } = JSON.parse(rawData);

	// Parse the entries slightly.
	//
	const instructions = {};
	for (const entry of data) {
		entry.opcode = Buffer.from(entry.opcode).toString("hex");
		entry.mits = entry.uops[0] - faultBaseline.mits;
		entry.ms = entry.uops[2] - faultBaseline.ms;
		delete entry.uops;

		if (
			entry.ms < 0 ||
			entry.mits < 0 ||
			entry.category.includes("_BR") ||
			entry.category.includes("CALL_")
		) {
			entry.branch = true;
			entry.serializing = null;
			entry.ms = 0;
			entry.mits = 0;
		} else {
			entry.branch = false;
			entry.serializing = entry.mits == 0;
		}
		entry.speculationFence = entry.outOfOrder == 0;
		instructions[entry.opcode] = entry;
	}

	const propertyMatch = (i1, i2) => {
		return (
			i2.ms == i1.ms &&
			i2.iclass == i1.iclass &&
			i2.category == i1.category &&
			i2.extension == i1.extension &&
			i2.cpl == i1.cpl &&
			i2.valid == i1.valid
		);
	};

	// Purge redundant suffixes.
	//
	let suffixPurgeCounter = 0;
	const keysSorted = Object.keys(instructions).sort(function (a, b) {
		return a.length - b.length;
	});
	for (const key of keysSorted) {
		const evaluate = (k1, ki1) => {
			const i1 = instructions[ki1];
			if (!i1) {
				return;
			}

			let matches = [];
			for (let n = 0; n <= 0xff; n++) {
				const k2 = k1 + hexb(n);
				const i2 = instructions[k2];
				if (i2 && propertyMatch(i1, i2)) {
					matches.push(k2);
				}
			}

			if (matches.length < 256) {
				return false;
			}

			let success = false;
			for (const k2 of matches) {
				if (k2 != ki1) {
					delete instructions[k2];
					suffixPurgeCounter++;
					success = true;
				}
			}
			return success;
		};
		if (evaluate(key, key) || key.length > 2) {
			evaluate(key.substr(0, key.length - 2), key);
		}
	}

	// Purge redundant prefixes.
	//
	let prefixPurgeCounter = 0;
	for (const k1 of Object.keys(instructions)) {
		// Skip if already deleted.
		//
		const i1 = instructions[k1];
		if (!i1) {
			continue;
		}

		// Iterate each prefix (apart from 0f):
		//
		for (const pfx of prefixList) {
			// If the instruction exists:
			//
			const k2 = pfx + k1;
			if (k2 in instructions) {
				// If the instruction has matching properties as the derived from parent, delete the entry.
				//
				const i2 = instructions[k2];
				if (propertyMatch(i1, i2)) {
					// MITS#1 == MITS#2 can indicate same instruction if instruction halts.
					// Otherwise MITS#1 has to be one more than MITS#2 since it should execute one more NOP.
					//
					if (i1.mits != i2.mits) {
						if (i1.mits != i2.mits + nopUops) {
							continue;
						}
					} else if (i1.mits > faultBaseline.mits) {
						continue;
					}

					prefixPurgeCounter++;
					delete instructions[k2];
				}
			}
		}
	}

	// Return the parsed entry.
	//
	return {
		instructions,
		prefixPurgeCounter,
		suffixPurgeCounter,
		nopUops,
	};
}

function load(path, noCache = false) {
	// Skip the body if no-caching is requested.
	//
	if (noCache) {
		return parse(fs.readFileSync(path));
	}

	// Read the data and weakly hash the input.
	//
	const data = fs.readFileSync(path);
	const sha256 = crypto.createHash("sha256");
	sha256.update(data);
	const hash = sha256.digest().toString("hex").substr(0, 8);

	// See if there is a cached instance, if so return without parsing.
	//
	const cacheName = path + ".cache" + hash;
	if (fs.existsSync(cacheName)) {
		try {
			return JSON.parse(fs.readFileSync(cacheName));
		} catch (ex) {
			console.warn(`Error parsing cache entry ${cacheName}`);
		}
	}

	// Parse the data, write the cache entry, return the result.
	//
	const parsed = parse(data);
	fs.writeFileSync(cacheName, JSON.stringify(parsed));
	return parsed;
}

module.exports = {
	parse,
	load,
};
