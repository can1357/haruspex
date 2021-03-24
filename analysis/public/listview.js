//prettier-ignore
const header = [
    { key: "opcode",           title: "Opcode",            detail: "Sample byte array" },
    { key: "decoding",         title: "Decoding",          detail: "Disassembly of the sample according to XED" },
    { key: "valid",            title: "Recognized",        detail: "Expected to execute on the processor or not" },
    { key: "serializing",      title: "Serializing",       detail: "Enforces ordering of the pipeline, if not also a speculative fence, means only applicable to the memory accesses" },
    { key: "speculationFence", title: "Speculation Fence", detail: "Halts speculative execution" },
    { key: "iclass",           title: "Class",             detail: "Instruction class according to XED" },
    { key: "category",         title: "Category",          detail: "Instruction category according to XED" },
    { key: "extension",        title: "Extension",         detail: "Extension set according to XED" },
    { key: "cpl",              title: "CPL",               detail: "Privilege level this instruction runs at according to XED" },
    { key: "decLength",        title: "Length",            detail: "Full instruction length according to XED" },
    { key: "outOfOrder",       title: "Div cycles",        detail: "Cycles spent during out-of-order execution of the division." },
    { key: "mits",             title: "µOps (MITS)",       detail: "# of µOps decoded by the micro-instruction translation engine" },
    { key: "ms",               title: "µOps (MS)",         detail: "# of µOps decoded by the microcode sequencer" },
];

const data = (async () => {
	return Object.values((await (await fetch("/static/dataset.json")).json()).instructions);
})();

document.addEventListener("WebComponentsReady", async () => {
	const el = document.getElementsByTagName("perspective-viewer")[0];
	const worker = perspective.worker();
	const table = worker.table(await data, { index: "opcode" });
	await el.load(table);
	el.toggleConfig();
});
