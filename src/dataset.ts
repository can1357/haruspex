import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

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

interface RawEntry {
   opcode: number[];
   uops: [number, number, number];
   outOfOrder: number;
   compatMode: boolean;
   valid: boolean;
   decLength: number;
   iclass: string;
   category: string;
   extension: string;
   cpl: number;
   decoding: string;
}

interface RawDataset {
   brand: string;
   nopBaseline: { mits: number; ms: number };
   faultBaseline: { mits: number; ms: number };
   nopUops: number;
   data: RawEntry[];
}

export interface Instruction {
   opcode: string;
   decoding: string;
   outOfOrder: number;
   compatMode: boolean;
   valid: boolean;
   decLength: number;
   iclass: string;
   category: string;
   extension: string;
   cpl: number;
   mits: number;
   ms: number;
   branch: boolean;
   serializing: boolean | null;
   speculationFence: boolean;
}

export interface Dataset {
   brand: string;
   instructions: Record<string, Instruction>;
   prefixPurgeCounter: number;
   suffixPurgeCounter: number;
   nopUops: number;
}

function hexb(v: number): string {
   return v <= 0xf ? `0${v.toString(16)}` : v.toString(16);
}

function parse(rawData: string): Dataset {
   const { nopBaseline: _, brand, faultBaseline, data, nopUops } = JSON.parse(rawData) as RawDataset;

   const instructions: Record<string, Instruction> = {};

   for (const entry of data) {
      const opcode = Buffer.from(entry.opcode).toString("hex");
      const mits = entry.uops[0] - faultBaseline.mits;
      const ms = entry.uops[2] - faultBaseline.ms;

      const isBranch = ms < 0 || mits < 0 || entry.category.includes("_BR") || entry.category.includes("CALL_");

      const instruction: Instruction = {
         opcode,
         decoding: entry.decoding,
         outOfOrder: entry.outOfOrder,
         compatMode: entry.compatMode,
         valid: entry.valid,
         decLength: entry.decLength,
         iclass: entry.iclass,
         category: entry.category,
         extension: entry.extension,
         cpl: entry.cpl,
         mits: isBranch ? 0 : mits,
         ms: isBranch ? 0 : ms,
         branch: isBranch,
         serializing: isBranch ? null : mits === 0,
         speculationFence: entry.outOfOrder < 4,
      };

      instructions[opcode] = instruction;
   }

   const propertyMatch = (i1: Instruction, i2: Instruction): boolean =>
      i2.ms === i1.ms &&
      i2.iclass === i1.iclass &&
      i2.category === i1.category &&
      i2.extension === i1.extension &&
      i2.cpl === i1.cpl &&
      i2.valid === i1.valid;

   // Purge redundant suffixes
   let suffixPurgeCounter = 0;
   const keysSorted = Object.keys(instructions).sort((a, b) => a.length - b.length);

   for (const key of keysSorted) {
      const evaluate = (k1: string, ki1: string): boolean => {
         const i1 = instructions[ki1];
         if (!i1) return false;

         const matches: string[] = [];
         for (let n = 0; n <= 0xff; n++) {
            const k2 = k1 + hexb(n);
            const i2 = instructions[k2];
            if (i2 && propertyMatch(i1, i2)) {
               matches.push(k2);
            }
         }

         if (matches.length < 256) return false;

         let success = false;
         for (const k2 of matches) {
            if (k2 !== ki1) {
               delete instructions[k2];
               suffixPurgeCounter++;
               success = true;
            }
         }
         return success;
      };

      if (evaluate(key, key) || key.length > 2) {
         evaluate(key.slice(0, -2), key);
      }
   }

   // Purge redundant prefixes
   let prefixPurgeCounter = 0;

   for (const k1 of Object.keys(instructions)) {
      const i1 = instructions[k1];
      if (!i1) continue;

      for (const pfx of prefixList) {
         const k2 = pfx + k1;
         const i2 = instructions[k2];

         if (i2 && propertyMatch(i1, i2)) {
            if (i1.mits !== i2.mits) {
               if (i1.mits !== i2.mits + nopUops) continue;
            } else if (i1.mits > faultBaseline.mits) {
               continue;
            }

            prefixPurgeCounter++;
            delete instructions[k2];
         }
      }
   }

   return { brand, instructions, prefixPurgeCounter, suffixPurgeCounter, nopUops };
}

export function load(path: string, noCache = false): Dataset {
   if (noCache) {
      return parse(readFileSync(path, "utf-8"));
   }

   const data = readFileSync(path);
   const hash = createHash("sha256").update(data).digest("hex").slice(0, 8);
   const cacheName = `${path}.cache${hash}`;

   if (existsSync(cacheName)) {
      try {
         return JSON.parse(readFileSync(cacheName, "utf-8"));
      } catch {
         console.warn(`Error parsing cache entry ${cacheName}`);
      }
   }

   const parsed = parse(data.toString());
   writeFileSync(cacheName, JSON.stringify(parsed));
   return parsed;
}
