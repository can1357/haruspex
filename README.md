<p align="center">
  <img width="256" heigth="256" src="https://haruspex.can.ac/static/logo.svg">
   <h1 align="center" style="border-bottom: none">Haruspex</h1>
   <h4 align="center">/həˈrʌspeks/</h4>
   <h6 align="center">A religious official in ancient Rome who predicted the future or interpreted the meaning of events by examining the insides of birds or animals that had been sacrificed.</h6>
   <p align="center">
    Exploration of x86-64 ISA using speculative execution.
   </p>
   <h1></h1>
</p>

Haruspex is a project attempting to explore and audit the x86-64 instruction set by (ab)using speculative execution and certain low-level performance counters Intel CPUs provide mainly for the identification of undocumented opcodes and deducing the pipeline properties of each instruction. You can find the article explaining the methodology [here](https://blog.can.ac/2021/03/22/speculating-x86-64-isa-with-one-weird-trick/).

- `/analysis` contains the Node.js server responsible for reducing the dataset and serving it as an interactive table, which you can find live at [haruspex.can.ac](https://haruspex.can.ac)
  .
- `/kernel` contains the code responsible for producing this data, note that it is essentially "pseudo-code" due to some of the dependencies and parts of the toolchain I used to build it I cannot share, but should be pretty easy to translate it to work in your OS.
- `/raw-data` contains the raw data from certain processors.

# Thanks to

- @JustasMasiulis for helping with the web components.
- @H4vC for the name.

# License

Haruspex is licensed under the GNU General Public License v3.
