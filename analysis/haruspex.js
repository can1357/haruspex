const dataset = require("./dataset");
const yargs = require("yargs");
const compression = require("compression");
const path = require("path");
const express = require("express");
const fs = require("fs");
const staticPath = __dirname + "/public";

// Parse the arguments.
//
const argv = yargs
	.command("process", "Produces a reduced data-set given raw data.", {
		dataset: {
			description: "path to the dataset, will be written over with the processed dataset",
			alias: "f",
			type: "string",
		},
	})
	.command("start", "Starts the interactive server.", {
		dataset: {
			description: "path to the dataset directory",
			alias: "f",
			type: "string",
		},
		port: {
			description: "port number, defaults to 80",
			alias: "p",
			type: "number",
		},
	})
	.help()
	.alias("help", "h").argv;

// If requested to process a dataset:
//
if (argv._.includes("process")) {
	fs.writeFileSync(argv.file, JSON.stringify(dataset.load(argv.dataset, true)));
}

// If not requested to start the server, return.
//
if (!argv._.includes("start")) {
	return;
}

// Discover all datasets.
//
const datasetdir = argv.dataset || __dirname + "/../raw-data/";
const datasetEntries = fs
	.readdirSync(datasetdir)
	.filter((k) => k.startsWith("isa-") && k.endsWith(".json"))
	.map((e) => ({ name: e.substr(4, e.length - 9), path: path.join(datasetdir, e) }));

// Process and save all datasets to the static data path.
//
const datasetList = [];
for (const { name, path } of datasetEntries) {
	const data = dataset.load(path);
	fs.writeFileSync(staticPath + `/dataset-${name}.json`, JSON.stringify(data));
	datasetList.push({ id: name, brand: data.brand });
}

// Declare the endpoints.
//
const app = express();
app.use(compression());
app.use("/static", express.static(staticPath));
app.get("/", (req, res) => {
	res.sendFile(staticPath + "/index.html");
});
app.get("/datasets.json", (req, res) => {
	res.send(JSON.stringify(datasetList));
});
app.get("/chip/:chip", (req, res) => {
	res.redirect("/chip/" + req.params.chip + "/grid/");
});
app.get("/chip/:chip/list", (req, res) => {
	res.sendFile(staticPath + "/list.html");
});
app.get("/chip/:chip/grid/:sub?", (req, res) => {
	res.sendFile(staticPath + "/grid.html");
});

// Start listening.
//
const port = argv.port || 80;
app.listen(port, () => {
	console.log(`Listening at http://localhost:${port}`);
});
