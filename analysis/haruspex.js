const dataset = require("./dataset");
const yargs = require("yargs");
const compression = require("compression");
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

// Write the dataset to static path.
//
const staticPath = __dirname + "/public";
const data = dataset.load(argv.dataset || __dirname + "/../raw-data/isa.json");
fs.writeFileSync(staticPath + "/dataset.json", JSON.stringify(data));

// Declare the endpoints.
//
const app = express();
app.use(compression());
app.use("/static", express.static(staticPath));
app.get("/", (req, res) => {
	res.sendFile(staticPath + "/index.html");
});
app.get("/list", (req, res) => {
	res.sendFile(staticPath + "/list.html");
});
app.get("/browse/:sub?", (req, res) => {
	res.sendFile(staticPath + "/index.html");
});

// Start listening.
//
const port = argv.port || 80;
app.listen(port, () => {
	console.log(`Listening at http://localhost:${port}`);
});
