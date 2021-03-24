<p align="center">
  <h1 align="center">Haruspex</h1>
  <p align="center">
    Exploration of x86-64 ISA using speculative execution.
  </p>
</p>

Haruspex is a project attempting to explore and audit the x86-64 instruction set by (ab)using speculative execution and certain low-level performance counters Intel CPUs provide to identify undocumented opcodes and general properties of each instruction.

- `/analysis` contains the Node.js server responsible for reducing the dataset and serving it as an interactive table, which you can find live at haruspex.can.ac.
- `/kernel` contains the code responsible for producing this data, note that it is in "pseudo-code" format due to some of the dependencies and parts of the toolchain I used to build it that I cannot share, but should be pretty easy to translate it to work in your OS.
- `/raw-data` contains the raw data produced by this code on a i7 6850k test machine.

# License

Haruspex is licensed under the GNU General Public License v3.
