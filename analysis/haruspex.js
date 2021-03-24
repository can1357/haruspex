const dataset = require("./dataset");
const yargs = require("yargs");
const path = require("path");
const express = require("express");
const fs = require("fs");

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
			description: "path to the dataset",
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

// If requested to process a data:
//
if (argv._.includes("process")) {
	fs.writeFileSync(argv.file, JSON.stringify(dataset.load(argv.dataset, true)));
}

// If not requested to start the server, return.
//
if (!argv._.includes("start")) {
	return;
}

const data = dataset.load(argv.dataset || __dirname + "/../raw-data/isa.json");

const app = express();
app.use("/static", express.static(__dirname + "/public"));

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/public/index.html");
});
app.get("/browse/:sub?", (req, res) => {
	res.sendFile(__dirname + "/public/index.html");
});

const datasetResult = JSON.stringify(data);
app.get("/dataset.json", (req, res) => {
	res.send(datasetResult);
});

const port = argv.port || 80;
app.listen(port, () => {
	console.log(`Listening at http://localhost:${port}`);
});
