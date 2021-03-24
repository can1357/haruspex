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

function parse(rawData) {
	// Read and parse the JSON.
	//
	const { nopBaseline, faultBaseline, data } = JSON.parse(rawData);

	// Parse the entries slightly.
	//
	const instructions = {};
	for (const entry of data) {
		entry.opcode = Buffer.from(entry.opcode).toString("hex");
		entry.mits = entry.uops[0] | 0;
		entry.ms = entry.uops[2] | 0;
		delete entry.uops;

		if (entry.ms < nopBaseline.ms) {
			entry.branch = true;
			entry.serializing = entry.mits <= faultBaseline.mits;
		} else if (entry.mits <= faultBaseline.mits) {
			entry.branch = null;
			entry.serializing = true;
		} else {
			entry.branch = false;
			entry.serializing = false;
		}
		entry.speculationFence = entry.outOfOrder == 0;
		instructions[entry.opcode] = entry;
	}

	// Purge reduntant prefixes.
	//
	const propertyMatch = (i1, i2) => {
		return (
			i2.ms == i1.ms &&
			i2.outOfOrder == i1.outOfOrder &&
			i2.iclass == i1.iclass &&
			i2.category == i1.category &&
			i2.extension == i1.extension &&
			i2.cpl == i1.cpl &&
			i2.valid == i1.valid
		);
	};
	var prefixPurgeCounter = 0;
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
						if (i1.mits != i2.mits + 1) {
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

	// Purge redundant suffixes.
	//
	var suffixPurgeCounter = 0;
	for (const k1 of Object.keys(instructions)) {
		// Skip if already deleted or not relevant.
		//
		const i1 = instructions[k1];
		if (!i1 || k1.length <= 2 || !i1.valid) {
			continue;
		}

		// Find maching entries:
		//
		for (const k2 of Object.keys(instructions)) {
			// If it is matching except the last byte:
			//
			if (k2.startsWith(k1.substr(0, k1.length - 2)) && k2 != k1) {
				// If it has matching properties ignoring the length, erase it
				//
				const i2 = instructions[k2];
				if (propertyMatch(i1, i2)) {
					suffixPurgeCounter++;
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
		nopBaseline,
		faultBaseline,
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
