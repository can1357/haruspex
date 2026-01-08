#!/usr/bin/env bun
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "./dataset";

const datasetDir = process.argv[2] || join(import.meta.dirname, "../data/");
const outputDir = process.argv[3] || join(import.meta.dirname, "../public");

console.log(`Processing datasets from: ${datasetDir}`);
console.log(`Output directory: ${outputDir}`);

const entries = readdirSync(datasetDir)
   .filter((f) => f.startsWith("isa-") && f.endsWith(".json"))
   .map((f) => ({
      name: f.slice(4, -5),
      path: join(datasetDir, f),
   }));

if (entries.length === 0) {
   console.error("No isa-*.json files found");
   process.exit(1);
}

const datasetList: { id: string; brand: string }[] = [];

for (const { name, path } of entries) {
   console.log(`  Processing ${name}...`);
   const data = load(path);
   writeFileSync(join(outputDir, `dataset-${name}.json`), JSON.stringify(data));
   datasetList.push({ id: name, brand: data.brand });
}

writeFileSync(join(outputDir, "datasets.json"), JSON.stringify(datasetList, null, 2));

console.log(`\nGenerated ${entries.length} datasets + datasets.json`);
