# DRAM Factory Tycoon — The Memory Allocation Crisis

An AP Microeconomics **Unit 1 + Unit 2 combined inquiry** presented as a playable, top-down
2D factory-management simulation, with a full evidence-based **Policy Brief**, five
mathematically generated economic graphs, a research archive and a knowledge check.

- **Game:** `index.html` + `styles.css` + `js/` (vanilla JavaScript, no build step, no dependencies)
- **Subject:** the 2026 scarcity of conventional DRAM (DDR4/DDR5) used in PCs and laptops
- **Markets modelled:** Market 1 = global conventional DRAM; Market 2 = global PCs and laptops;
  plus a separate HBM / server-memory product segment
- **Assessment artefact:** a print-ready A4 Policy Brief with seven evidence-backed claims,
  a specific recommendation and a measurement plan

---

## 1. How to run it

**Option A — direct file open (no server needed):**

1. Open the project folder.
2. Double-click `index.html`, or drag it into a modern desktop browser (Chrome, Edge, Firefox, Safari).

The game is built to work from a `file://` URL: all scripts are classic (non-module) scripts
loaded in dependency order, there are no external assets, no fonts to download, no network calls
and no build step.

**Option B — local static server (if your browser restricts `file://`):**

```powershell
cd "C:\Users\jayoma\Desktop\Policy Project"
python -m http.server 8000
```

Then open <http://localhost:8000/>.

**No dependencies are installed and nothing is downloaded at runtime.** All graphics are drawn
with the Canvas 2D API and SVG; all fonts are system fonts.

---

## 2. Controls

| Input | Action |
|---|---|
| `W` `A` `S` `D` or arrow keys | Move the plant manager |
| `E` | Interact with the nearest workstation (opens its panel) |
| Mouse click on a workstation | Open that workstation's panel |
| `Esc` | Close the open panel |
| `P` or the **Pause** button | Pause / resume the simulation |
| **Reset Game** | Start the scenario again from the initial state |
| **Replay** (in the debrief) | Start a fresh run with the same policy recommendation |

Arrow keys and space are prevented from scrolling the page while the factory view is active.
Movement is frame-rate independent (`requestAnimationFrame` with a clamped delta time), and the
player cannot leave the map or walk through walls, machinery or workstations.

---

## 3. What the scenario asks you to do

The scenario runs over up to 8 quarterly periods (Q3 2026 – Q2 2028).

1. **Understand the constraint** — the plant has a finite pool of shared resource tokens.
2. **Allocate them** between conventional DRAM and HBM on the Production Allocation Console,
   and watch the opportunity cost, the production possibilities frontier and the projected
   shortage update live.
3. **Run production cycles** on the Production Floor. Output is sold into two markets; unsold
   output earns nothing but still costs money.
4. **Read both markets** at the Market Exchange: DRAM price index, shortage/surplus, PC price
   index, shipments, deferred purchases, HBM order fill rate, and consumer/producer surplus.
5. **Invest for the long run** at R&D and Capacity Expansion. Nothing arrives instantly: every
   project has a construction-and-qualification delay, and each carries an opportunity cost.
6. **Recommend a policy** at the Policy Office: an upstream producer incentive, a downstream PC
   voucher, or both — with the trade-offs of each on screen.
7. **Debrief**: a five-dimension score (supply and consumer access, financial sustainability,
   long-run resilience, server/HBM fulfilment, fiscal and environmental responsibility), a
   period-by-period record of your decisions, and commentary on the trade-offs you made.

No single move maximises every objective. Allocating everything to conventional DRAM solves the
consumer shortage but abandons server customers; allocating everything to HBM maximises profit
while deepening the shortage; doing nothing about capacity leaves the next demand shock exposed.

---

## 4. Project structure

```
Policy Project/
├── index.html          semantic shell: title screen, factory view, Policy Brief,
│                       Graph Gallery, Evidence, Glossary, Knowledge Check, Debrief,
│                       modal panel container, toast region
├── styles.css          industrial theme, responsive layout, accessible focus states,
│                        print stylesheet (A4, brief-only)
├── js/
│   ├── data.js         CENTRAL CONFIGURATION (all simulation parameters), the seven
│   │                   verified sources, the seven claims, the 25-term glossary,
│   │                   the 8-question knowledge check, workstation map metadata
│   ├── economy.js      the simulation engine: output functions, the two linked markets,
│   │                   capacity ceilings, price adjustment, investment with delays,
│   │                   policy instruments and the five-dimension score
│   ├── graphs.js       SVG generation for the five economic models plus the Gartner
│   │                   two-bar evidence chart
│   ├── game.js         canvas factory floor: map, collision, movement loop, interaction
│   ├── ui.js           screens, workstation panels, HUD, navigation, debrief rendering
│   ├── tests.js        the automated self-test suite (28 checks)
│   └── main.js         bootstrap, global error capture, startup test run
├── README.md           this file
└── QA_REPORT.md        independent QA audit: tests run, defects found and fixed,
                        remaining gaps, manual test steps, final recommendation
```

**Architecture notes**

- Everything lives under one global namespace, `window.DRAM` (`DRAM.CONFIG`, `DRAM.Econ`,
  `DRAM.Graphs`, `DRAM.Game`, `DRAM.UI`, `DRAM.Tests`). No other globals are created and
  nothing pollutes `window`.
- Game-state updates (`DRAM.Econ`) are kept separate from rendering (`DRAM.UI`, `DRAM.Game`).
- Every economic parameter is defined **once** in `js/data.js` and referenced from there.
- The five graphs are generated from the same inverse-curve equations the self-tests verify,
  so the drawings and the assertions cannot drift apart.

---

## 5. Economic model and its caveats

**Read this before quoting any number from the game.**

- **Every quantity, price, cost, conversion factor, construction delay and demand-response
  coefficient in the factory simulation is a fictional illustrative parameter**, marked as such
  in `js/data.js`. They are not observed DRAM industry data, not company financials, and not
  measured price-elasticity coefficients.
- The five graphs use **illustrative index values** on a 0–100 / 0–140 style scale. They are
  conceptual teaching diagrams, not empirical data plots.
- The real-world evidence lives in the Policy Brief and the Evidence screen, where every figure
  is attributed, dated and labelled as a forecast, a projection, a preliminary estimate or a
  reported outcome.
- The shared-resource model is deliberately simplified: HBM needs more shared tokens per unit
  in this model (a labelled assumption), and HBM also requires advanced stacking and packaging
  capacity that ordinary DRAM production does not. **HBM and conventional DRAM are not treated
  as identical or interchangeable production**, and no real conversion ratio is claimed from the
  Micron filing.
- Conventional DRAM, HBM and PCs are modelled as **three distinct but linked product markets**;
  HBM demand is never treated as consumer DDR4/DDR5 demand.
- **No numerical PES or PED coefficient is asserted anywhere**, in the game or in the brief.
  Elasticity is discussed qualitatively (short run vs long run; buyer groups; time horizons),
  with the formulas shown.
- The plant in the game is a **stylised stand-in for an industry-wide allocation decision**,
  not a model of one company's economics.

---

## 6. Testing performed

- **28 automated self-tests** run on every page load and can be re-run from the
  **Diagnostics** button (top right). They cover the required economics checks: equilibrium
  solving, the leftward supply shift, both subsidy wedges (producer and consumer) computed
  against the subsidy exactly, the PC input-cost shift, short-run vs long-run supply slope,
  PPC on/inside/outside classification, allocation never exceeding capacity, all five graphs
  rendering without invalid coordinates, axis and curve labels present, gallery accessibility,
  reset behaviour, button wiring, map reachability, the exact content of every graph, the
  ordering of the two PC demand segments, the **live simulation's PC buyer-segment elasticity
  ordering** (so the running model cannot contradict Graph 4), **delegated modal actions**
  (so no workstation button can ship inert), **the graph gallery re-rendering with the player's
  live allocation** (so Graph 1's marker is never stale), **the toast notification being
  non-interactive** (so it cannot swallow a click), **the brief having all eight required
  sections and printing to at most two A4 pages**, and absence of uncaught errors.
- **Manual browser testing** was performed in Chromium (in-app browser) at a 1280×720 viewport
  and at a ~640×735 split-screen viewport: title screen, Start Game, WASD and arrow movement,
  `E` interaction, mouse-click interaction on every workstation, the allocation slider, production
  cycles, an investment with its delay, the policy recommendation flow, the debrief, the graph
  gallery (all five graphs, plus the live "your allocation" marker tracking the Allocation
  Console slider), the live PC market figures, the evidence chart, the glossary, the knowledge
  check (including a wrong answer and retry), and the print-length estimator.
- **Source verification**: the TrendForce (September 7), Gartner (October 12) and Omdia
  (October 9) pages were fetched directly and their titles, dates and quoted figures confirmed
  against the citations. The GAO report was opened in a real browser, and the Micron FY2026 10-K
  was confirmed through SEC full-text search (both publishers block scripted requests). See
  `QA_REPORT.md` §3 for the evidence behind every source.
- **Print testing**: the Policy Brief prints as an A4 document with only the brief visible
  (no navigation, no factory map) and a two-column reference list. The page count was verified
  against a **real PDF** produced by headless Edge (`--print-to-pdf`), not only an estimate: the
  brief is **2 A4 pages** (538 mm of text at A4 width). The app also has a **"Check printed
  length"** button that measures the brief at A4 text width and reports the estimated page
  count; the two agree.
---

## 7. Printing the Policy Brief

1. Open **Policy Brief** in the top navigation.
2. Click **Print / Save as PDF (A4)**.
3. Choose A4 as the paper size; margins are already set by the print stylesheet.

Only the brief is printed: the navigation bar, the factory view, the graph gallery and every
other screen are excluded by the print stylesheet. Citations and the reference list are kept
in two columns so the brief stays compact.

---

## 8. Known limitations

- The brief is **1,592 words of body prose** (headings, the three inquiry questions and the
  reference list excluded), about 6% above the 1,400-1,500 target, and it prints to **two A4
  pages** - verified against a real PDF, not an estimate. The remaining overshoot is a content
  trade-off: the brief carries seven claims with data, concept, limitations, graph link and
  relevance; consumer and producer surplus, non-price determinants, disequilibrium, elasticity,
  XED and YED for **both** markets; every required Unit 1 concept with the worked
  comparative-advantage arithmetic; two interventions with incidence, cost, deadweight loss,
  winners, losers and unintended consequences; specific recommendations; and a measurement plan.
  Type is 9.0pt on a 190 mm measure - legible, but the smallest size used.
- The factory simulation is a teaching abstraction, not a forecasting model. It uses partial
  price adjustment and a capacity ceiling rather than a full disequilibrium solver.
- The SEC and gao.gov hosts block scripted requests, so the Micron 10-K was confirmed through SEC
  full-text search (accession 0000723125-26-000023, period ended September 3, 2026; "cleanroom"
  is its highest-scoring match) and the GAO report was opened in a real browser. The details
  are recorded in `QA_REPORT.md` §3.
- The HBM market is modelled as a simple order-book with growing demand and a rising price
  index; it is deliberately simpler than the two markets the assignment focuses on.
