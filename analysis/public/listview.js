let { instructions } = await (await fetch("/dataset.json")).json();
instructions = Object.values(instructions);

const keys = Object.keys(instructions[0]);
instructions = instructions.map((v) => Object.values(v));

function dataListener(x0, y0, x1, y1) {
  return {
    num_rows: instructions.length,
    num_columns: keys.length,
    data: instructions
      .slice(x0, x1)
      .map((v) => Object.values(v))
      .slice(y0, y1),
    column_headers: keys,
  };
}
