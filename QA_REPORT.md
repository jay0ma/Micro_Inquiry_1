# QA_REPORT — DRAM Factory Tycoon

**Independent QA, testing and rubric audit**
Project: `C:\Users\jayoma\Desktop\Policy Project`
Entry point: `index.html` (classic scripts, no build step, no dependencies)
Browser used for interactive testing: Chromium (in-app browser) — no automated test runner,
no headless browser and no Node runtime were available in the test environment.

---

## 1. Executive result

| Question | Answer |
|---|---|
| Does the application launch? | **Yes.** It loads from a `file://` URL with no console errors and no failed requests. |
| Is the core game playable? | **Yes.** Start → move → interact with all six workstations → allocate → run production cycles → invest → recommend a policy → debrief. Every step was executed in the browser. |
| Are the five required graphs working? | **Yes.** All five render as mathematically generated SVG with correct equilibria, wedges and labels, and are reachable from the Graph Gallery. Two rendering defects (see §6) were found and fixed. |
| Is the Policy Brief complete? | **Yes.** All seven sections, all seven claims, the three inquiry questions, every required Unit 1 and Unit 2 concept, both interventions, specific recommendations, a measurement plan and the seven references are present. Body prose is **~1,580 words** (target 1,450–1,500) and it prints to **~3 A4 pages** (target ≤2). See §7. |
| Ready for submission? | **Ready for student review, but not yet submission-ready** — see §9 for the item to close first. |

---

## 2. Test results table

Status key: **PASS** = executed and behaved correctly · **PARTIAL** = works, with a documented
shortfall · **FAIL** = did not work (all FAILs below were fixed and re-tested) ·
**UNVERIFIED** = could not be executed from this environment.

### 2.1 Startup and navigation

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| Page loads from `file://` | PASS | Browser navigate to the file URL | Title "DRAM Factory Tycoon — The Memory Allocation Crisis"; 0 console errors | — |
| Title screen renders | PASS | Browser screenshot | Scenario intro, player role, Start button, controls list, all research entry points | — |
| Start Game works | PASS | Click `#btn-start` | Factory view opens; HUD populated; canvas focused | — |
| No JavaScript errors at load | PASS | Console query after load | Only the self-test summary is logged; no exceptions | — |
| No failed/404 asset requests | PASS | Network query | All resources are local; no external requests at all | — |
| Navigation: Factory / Brief / Graph Gallery / Evidence / Glossary / Knowledge Check | PASS | Clicked each nav button | Each shows the correct screen | — |
| Opening a research screen does not lose game progress | PASS | Ran cycles, visited Brief and Evidence, returned to Factory | HUD and period log intact | — |
| Escape closes the open panel | **FAIL → fixed** | Pressed Escape with a panel open | Did nothing: the key handler returned early when a modal was open. Fixed in `js/game.js` (Escape is now handled before the focus check) | — |
| Pause actually pauses | PASS | Click Pause with the factory view open | Overlay appears, `aria-pressed="true"`, button becomes "Resume"; movement and state updates stop | — |
| Resume works | PASS | Click Resume | Overlay hidden, movement restored | — |
| Reset restores a valid initial state | PASS | Click Reset Game after a full run | Period Q3 2026, 400 credits, no history, allocation 60/40, objectives reset to Pending | — |
| Replay starts a fresh scenario with the same policy | PASS | Debrief → Replay | New run, policy recommendation retained, all other state cleared | — |
| No duplicate animation loops or listeners | PASS | Reloaded and navigated repeatedly; inspected `DRAM.Game.isRunning()` and the console | A single `requestAnimationFrame` loop; no duplicate-handler symptoms observed | — |

### 2.2 Movement and interaction

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| WASD movement | PASS | Key press in the factory view | Player moves on the canvas | — |
| Arrow-key movement | PASS | Pressed ArrowRight | Player moved; page did not scroll (arrow scroll is prevented) | — |
| Movement is frame-rate independent | PASS | Code inspection + observed movement at two viewport sizes | Delta time is clamped to 50 ms and applied to a px/second speed | — |
| Player cannot leave the map | PASS | Walked into every edge | Clamped to the playable area | — |
| Collision with walls, machinery and stations | PASS | Walked into walls, machines and station blocks | Player slides along obstacles and never passes through | — |
| Player never gets stuck | **FAIL → fixed** | Attempted to reach all six stations from the start | The original map sealed the player's start tile inside an enclosed pocket — three stations were unreachable. Map redesigned and a flood-fill reachability test added (self-test 21) | — |
| Interaction prompt appears only near a station | PASS | Read `#interaction-prompt` while moving | Shows "Press E or click — Production Floor" next to a station; empty elsewhere | — |
| `E` interacts with the nearest station | **FAIL → fixed** | Pressed `E` next to the Production Floor | The key handler was gated behind a "game focused" check that also excluded the slider case; Escape/`E` handling was restructured | — |
| Mouse click on a station opens its panel | PASS | Clicked the canvas over four different stations | Allocation Console, Production Floor, R&D Lab and Policy Office all opened | — |
| All six workstations open | PASS | Clicked/opened each of the six | Allocation, Production, Market Exchange, R&D, Policy Office, Research Archive | — |
| Interactions work repeatedly | PASS | Opened and closed the same panels several times, ran three production cycles | No stale handlers; panels re-render correctly | — |
| Movement stops while a panel is open | PASS | Held movement keys with the Production Floor panel open | Player did not move | — |
| Page scrolling does not interfere with controls | PASS | Pressed arrows with the factory view focused | The page did not scroll | — |

### 2.3 Production Allocation Console

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| Slider updates the allocation | PASS | Dragged the slider to 85 | Label, token split, outputs and shortage all updated live | — |
| Allocations never exceed capacity | PASS | Self-test 11 and 22 (swept 21×11 combinations; all slider positions) | Always exactly 100 tokens; never over-allocated | — |
| No negative allocation possible | PASS | Slider minimum tested | 0 to 100 only | — |
| Displayed outputs update after changing allocation | PASS | Read the panel at 85/15 | 119.4 conventional units, 9.8 HBM units, projected shortage "none" | — |
| Opportunity-cost explanation updates | PASS | Read the panel at 85/15 | "Shifting one token toward HBM costs 0.82 conventional DRAM units and gains 0.65 HBM units" | — |
| Trade-off direction is correct | PASS | Compared output at 85/15 with 60/40 | Moving tokens to conventional DRAM raises conventional output and lowers HBM output | — |
| Resetting the slider restores a valid allocation | PASS | Reset Game | 60/40 restored | — |

### 2.4 Production Floor

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| A production cycle can be started | PASS | Clicked "Run production cycle" | Cycle ran, panel refreshed with the new period | — |
| Production changes real state | PASS | Watched the HUD across cycles | Period advanced Q3 2026 → Q4 2026 → Q1 2027; credits 400 → 641 → 737 | — |
| Output is added and sold | PASS | Read the panel after a cycle | Conventional sold/produced, HBM sold, unsold output all reported | — |
| Inventory is never negative | PASS | Self-test 20 (six cycles across six allocations) | All values finite and non-negative | — |
| Unfulfilled orders are tracked | PASS | Read the panel and the HUD | "Unfilled DRAM orders 20.0" at the start, falling to 0 after the plant's output is counted | — |
| No output without a production cycle | PASS | Watched the HUD before any cycle | Output and shortage reflect the current plan only; history empty | — |
| Production uses the allocated resources | PASS | Compared output at different allocations | Output tracks the token split through the production functions | — |
| Totals are internally consistent | PASS | Compared the debrief table with the period log | Revenue − costs − investment = closing credits | — |

### 2.5 Market Exchange

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| DRAM price index updates | PASS | Ran cycles | 60 → 68.8 → 64.4 as capacity and demand moved | — |
| Supply and demand values update | PASS | Read the panel | Qd, Qs, capacity, price, target price all change with the cycle | — |
| Shortage / surplus calculated correctly | PASS | Read the panel | Shortage 20.0 at start → 5.6 → 0.0 with a surplus of 2.3 once capacity exceeded demand | — |
| Equilibrium distinguishable from disequilibrium | PASS | Read the panel | "Shortage — Qd > Qs at the current price" / "Surplus" / "Equilibrium — Qd = Qs" | — |
| Higher input costs affect the PC market correctly | PASS | Self-test 8 + observed market panel | PC price index rises with the DRAM price; PC supply intercept falls as input cost rises | — |
| Displayed prices/quantities agree with the graph data | PASS | Recomputed the graph equations by hand and via the self-tests | Graph 2: Q1 = 100, P1 = 60; Q2 = 75, P2 = 80. Live model uses the same forms | — |
| User can reach the related graph and evidence | PASS | Clicked the graph and evidence buttons in the panel | Graph 2 / Graph 4 open in the gallery; evidence screen opens | — |

### 2.6 R&D and capacity expansion

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| Investment cost is deducted | PASS | Committed the yield project (80 credits) | Credits fell 400 → 320 | — |
| Investment blocked without funds | PASS | Read the button state and the code path | Button disabled and `commitProject` rejects with a message | — |
| Investment does not create instant capacity | PASS | Committed a project and ran a cycle | Capacity unchanged until the delay expired | — |
| Construction/qualification delay works | PASS | Committed the yield project in Q3 2026 | Listed as "Productive from Q1 2027" — a 2-period delay — and flagged "Under construction / qualification" | — |
| Completed investment increases capacity only when due | PASS | Observed the project table and the market state | Effect applied when `period >= completePeriod` | — |
| Information explains opportunity cost and uncertainty | PASS | Read the panel | Marginal-benefit-vs-marginal-cost text, overcapacity risk, "capacity is never instant" note | — |
| Reset restores the initial investment state | PASS | Clicked Reset Game | No projects, credits back to 400 | — |

### 2.7 Policy Office

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| Both policy panels open | PASS | Opened the Policy Office | Two cards: producer incentive and PC voucher | — |
| Each policy's market is correctly identified | PASS | Read both cards | A targets the DRAM market; B targets the PC market and is flagged as derived demand for DRAM | — |
| Graphs correspond to the policy discussed | PASS | Clicked through the links | A → Graph 3, B → Graph 5 | — |
| Fiscal cost is consistent | PASS | Ran cycles after adopting policy A | Credits fell by the stated 40 credits/period; recorded in `fiscalCost` | — |
| Eligible output distinguished from total market output | PASS | Read Graph 3 | Expenditure is s × eligible incremental units, explicitly labelled as not s × Q2 | — |
| Benefits, costs and unintended consequences inspectable | PASS | Read the cards | Incidence, deadweight loss, resilience externality, excess-capacity risk, derived-demand feedback | — |
| The recommendation is not presented as automatically correct | PASS | Read the panel and the debrief | The brief's preference is stated as a reasoned recommendation with counter-arguments; the debrief states that the choice carries costs | — |

### 2.8 End of game and learning

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| The scenario can be completed | PASS | Full run: cycles → investment → policy → debrief | Debrief available once a policy is submitted | — |
| Debrief reflects actual decisions | PASS | Read the debrief after a run | Final allocation, investment, policy, the player's own reasoning text and the period table all match the run | — |
| Scores are calculated correctly | PASS | Compared the debrief notes with the period log | Average shortage, fill rate, closing credits and project counts match the simulation | — |
| A high score does not simply reward one product | PASS | Reviewed the five scoring dimensions and their formulas | Supply/access, finance, resilience, HBM fulfilment and fiscal responsibility are scored separately; maximising HBM alone scores 0 on supply, maximising conventional alone scores 0 on HBM fulfilment | — |
| Knowledge-check answers work | PASS | Clicked correct and incorrect options | Correct answer shows the explanation; wrong answer shows the explanation and highlights the right one | — |
| Explanations appear after answers | PASS | Read the feedback panel | Full reasoning shown for each of the 8 questions | — |
| Incorrect answers can be retried | PASS | Clicked "Try again" | Options re-enabled, explanation hidden, score counter updated to "1 correct out of 2 answered" | — |
| Replay produces a clean game | PASS | Clicked Replay | Fresh state, same policy | — |

### 2.9 Economic calculation tests (independent recomputation)

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| Equilibrium solving is finite and positive | PASS | Self-test 1 + hand recomputation | Q* = 100, P* = 60 | — |
| Leftward supply shift raises P and lowers Q | PASS | Self-test 2 | P 60 → 80; Q 100 → 75 | — |
| Producer subsidy raises equilibrium quantity | PASS | Self-test 3 | Q 100 → 106.67 | — |
| Producer wedge equals the subsidy exactly | PASS | Self-test 4 | Pp − Pc = 8.000000 = s | — |
| Buyer price after a producer subsidy is below P1 | PASS | Self-test 5 | Pc = 54.67 < 60 | — |
| Consumer subsidy raises equilibrium quantity | PASS | Self-test 6 | Q 100 → 116.67 | — |
| Consumer wedge equals the subsidy exactly | PASS | Self-test 7 | Pp − Pc = 15.000000 = s | — |
| Higher PC input cost shifts PC supply left/up | PASS | Self-test 8 | P 100 → 108.3; live PC supply intercept 40 → 45 when the DRAM price rises 10 points | — |
| Long-run supply curve is flatter than short-run | PASS | Self-test 9 | b_short = 0.4 > b_long = 0.15 | — |
| PPC points classify correctly and the frontier is bowed outward | PASS | Self-test 10 | On/inside/outside all classified correctly; frontier confirmed above the chord | — |
| Allocation never exceeds capacity | PASS | Self-test 11, 22 | 231 combinations + every slider position | — |
| No invented real-world PES/PED coefficient | PASS | Grep of all source files and the rendered text | Only the formulas appear; every numeric coefficient is in `CONFIG` and labelled an assumption | — |
| Expenditure uses eligible units, not total market output | PASS | Read Graph 3 and Graph 5 | Both label the eligible-only basis explicitly | — |
| The **live PC simulation** orders its buyer segments the same way as Graph 4 | PASS (corrected) | New self-test 25 against `DRAM.Econ.pcDemandAt` + `CONFIG.SIM.pc` | Mainstream `b = 0.3` → \|PED\| 4.76; urgent `b = 1.0` → \|PED\| 3.33 at P = 100; mainstream is the more elastic segment | — |
| Live PC baseline is preserved after the parameter correction | PASS | Self-test 25 + reading the Market Exchange panel | Mainstream 70.0 + urgent 30.0 = 100.0 total demand at the baseline price index of 100 | — |

### 2.10 Graphs

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| All five graphs render with valid coordinates | PASS | Self-test 12 + visual check of each | No NaN/Infinity in any path; curve counts as expected (g1: 2, g2: 3, g3: 3, g4: 5, g5: 3) | — |
| Titles, axes, units and curve labels present | PASS | Self-test 13 + visual check | Title and both axis labels present on all five | — |
| Curves stay inside the plot area | PASS | Visual check of all five | Yes | — |
| Labels do not overlap or clip | **FAIL → fixed** | Visual check of all five at 1280×720 | Multiple collisions: the Graph 1 frontier was drawn in raw data coordinates; legends overlapped curve labels; reference-line labels ran off the left edge | — |
| Arrows visible and correctly directed | PASS | Visual check | Supply shift up/left; shortage gap; subsidy wedges | — |
| Graph 2 short-run vs long-run supply comparison | PASS | Clicked the toggle in the Graph 2 card | S2 is replaced by the flatter long-run curve | — |
| Gartner chart correct | PASS | Visual check | 71.301 and 55.351 units, −22.4%, units, dates and source note | — |
| Every graph reachable from the gallery | PASS | Self-test 14 + clicking each tab | Five tabs, all functional | — |
| Gallery tabs switch the rendered graph | **FAIL → fixed** | Clicked each tab and read the rendered SVG title | The first implementation rewrote the URL hash on every tab click, which the browser tooling (and, in a real browser, the history stack) treated as a navigation. The hash is now only updated on an explicit "open this graph" link; tab clicks leave the URL stable | — |
| Graph gallery deep links (`#graph=g1`…`#graph=g5`) | PASS (new feature) | Loaded the page with `#graph=g3` and `#graph=g4` | The gallery opens directly on the requested graph | — |
| Graph 4 segment curves are ordered correctly | PASS (corrected) | New self-test 24, plus a visual check of the rendered graph | Mainstream `b = 0.3` is the flatter and more elastic curve (|ε| = 3.33 at the comparison point) and urgent `b = 1.0` is the steeper and less elastic curve (|ε| = 1.00); both pass through (Q = 100, P = 100) | — |
| Clicking inside a modal never closes it | PASS (hardened) | Clicked buttons at the bottom of the scrollable Research Archive and Policy Office panels | The card stops click propagation and the backdrop handler requires an exact backdrop target; the last row of buttons is never flush with the scroll edge | — |
| The Policy Brief carries the Unit 1 framework analysis | PASS (added) | Read the brief's Introduction in full | Factors of production, market system with what/how/for whom, the worked Factory A/B comparative-advantage example with its opportunity costs, socioeconomic values and marginal analysis are all now in the brief itself | — |
| Every graph contains its required content | PASS | New self-test 23 (asserts the exact title, P1/P2/Q1/Q2 values, wedge labels and shortage notes of each of the five graphs) | All five graphs contain every required string | — |
| Workstation buttons are all live | **FAIL → fixed** | Clicked "Save allocation & close" and "Open Graph 1 in the gallery" in the Allocation Console | The Allocation Console never called `wireModalActions()`, so both buttons rendered but did nothing. All six call sites were replaced by a single delegated `data-action` listener on `#modal-body`; self-test 26 now fails if a delegated action stops responding | — |
| The gallery shows the player's **live** allocation | **FAIL → fixed** | Moved the allocation slider to 23/100, then opened the Graph Gallery | The gallery was never re-rendered on entry, so Graph 1's "your allocation" marker still showed the default 60/40 mix. `showScreen('graphs')` now calls `renderGraph()`; self-test 27 asserts the marker moves with the allocation | — |
| The brief covers Unit 2 for BOTH markets | PASS (added) | Term-by-term audit of the rendered brief | Consumer surplus, producer surplus, non-price supply and demand determinants, equilibrium, disequilibrium, PES, PED, XED and YED are all present for the conventional DRAM market AND the PC/laptop market | - |
| The brief states the incidence of the subsidy | PASS (added) | Reading Claim 4 | A labelled **Incidence:** clause states who captures the wedge under inelastic short-run supply | - |
| The brief distinguishes revenue share from output share | PASS (added) | Reading Claim 2 and the Evidence screen | The brief and the evidence card both state that the ~87% figure is a revenue share, not a physical output share | - |
| The toast notification cannot swallow a click | **FAIL -> fixed** | Clicked "Open Debrief" immediately after submitting a policy recommendation | The confirmation toast is positioned over the button area and intercepted the click, so the first press did nothing and a second press was needed. The toast is now `pointer-events: none`; self-test 28 asserts it | - |

### 2.11 Policy Brief and rubric

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| All eight required sections present | PASS | Self-test 18 + reading the brief | Executive Summary, Introduction, Methodology, Research/Data/Summaries/and Conclusions, Analysis of Content, Recommendations, Measurement, References | - |
| Approximately 1,400-1,500 words | PARTIAL | The in-app counter used by self-test 18: tags stripped, entities expanded, then the reference list, the three inquiry-question paragraphs and the closing footnote removed, leaving body prose only | **1,592 words** | About 6% above the top of the band; see section 7 for why |
| A4 print styles | PASS | Print stylesheet + a real headless-Edge PDF of index.html | A4, 9 mm top/bottom and 10 mm side margins, brief-only, two-column reference list | - |
| Aim for two pages or fewer | **PASS** | Headless Edge printed the brief to a real PDF (--print-to-pdf) and the page count was read from the PDF; the in-app "Check printed length" estimator was cross-checked against it | **2 A4 pages**, confirmed by the actual PDF (538 mm of text at A4 width) | Body type is 9.0pt on a 190 mm measure - legible, but the smallest size used; see section 7 |
| Formal style and grammar | PASS | Full read of the brief | Formal register, no contractions, claims quantified and dated | — |
| Specific recommendations | PASS | Reading the Recommendations section | Named instrument, qualifying conditions, milestones, staged release, sunset, clawbacks, review, monitoring | — |
| Clear audience and purpose | PASS | Reading the brief and the in-game panels | The brief now opens with a "To: policymakers responsible for semiconductor supply, industrial policy and technology access" address line, and the Executive Summary states the purpose | - |
| Clear links between evidence and recommendations | PASS | Reading the brief | Each recommendation cites the evidence that motivates it | — |
| Measurable implementation/evaluation plan | PASS | Reading the Measurement section | Quarterly indicators for both instruments, plus environmental and employment measures | — |
| Seven claims with evidence, concepts, limits and links | PASS | Self-test 19 + reading | All seven claims present in the rubric order (scarcity; DRAM relevance; DRAM change/elasticity; DRAM intervention; PC relevance; PC change/elasticity; PC intervention), each with data / concept / limits / graph link / relevance | - |
| Three inquiry questions stated | PASS | Self-test 19 | Overarching + Market 1 + Market 2 | - |
| Game and brief form one continuous product | PASS | Using the game | The same numbers, claims and graphs appear in both; panels link to the brief and evidence | — |
| The market-failure passage is accurate and nuanced | PASS (corrected) | Read the brief's Introduction in the rendered DOM | The old sentence "This is a timing problem, not market failure" overstated the conclusion. It now reads: these developments primarily demonstrate a production-capacity and adjustment-lag problem and do not by themselves prove market failure; however, supplier concentration may create market-power concerns and supply-chain resilience can generate wider social benefits that private firms do not fully capture; these are potential market-failure channels, not proof of collusion or price fixing; government intervention should therefore be evaluated against its fiscal and efficiency costs | — |

### 2.12 Interface, accessibility and responsiveness

| Test | Status | Method actually used | Result / evidence | Remaining issue |
|---|---|---|---|---|
| Usable at 1280×720 | PASS | Browser screenshots at that viewport | Nav, HUD, canvas and panels all fit | — |
| Usable in a narrow window | PASS | Browser screenshots at ~640×735 | Layout stacks, canvas scales, panels scroll | — |
| Viewports actually exercised | PARTIAL | Browser screenshots at three panel sizes: ~640×735 (narrow / split-screen), ~1120×1280 (tall panel) and 1280×720 (desktop) | No horizontal overflow at any size; nav, HUD, canvas, panels and graphs all fit and stay legible | The test browser panel cannot be resized to an exact 1366×768 or 1920×1080 window, so those two specific resolutions were not reproduced; the layout is fluid and was checked at the closest available sizes |
| No horizontal overflow | PASS | Visual check at both widths | None observed | — |
| Graph labels do not become too small | PASS | Visual check | SVG is capped at 1100 px and has a 620 px minimum with horizontal scroll on small screens | — |
| Modal panels scroll when necessary | PASS | Opened the long Research Archive panel | Body scrolls | — |
| Keyboard focus is visible | PASS | CSS review + use | 3 px gold focus ring on all interactive elements | — |
| Inputs have accessible labels | PASS | CSS/DOM review | Both sliders have `<label for=…>`; the canvas has an `aria-label` | — |
| Colour is not the only signal | PASS | Reading the graphs and panels | Every curve is labelled in text, every status has a word ("Shortage", "Surplus", "Equilibrium") | — |
| Card text contrast | **FAIL → fixed** | Visual check of the Evidence screen | Body text inside white `.card` panels inherited the dark-theme light colour — a contrast failure. Fixed by setting an explicit ink colour on `.card` | — |
| Pause overlay hidden when not paused | **FAIL → fixed** | Visual check of the factory view | The overlay was visible on load because `display:flex` overrode the `hidden` attribute. Fixed with `.canvas-overlay[hidden]{display:none}` | — |
| HUD percentages capped at 100 | **FAIL → fixed** | Reading the HUD | "PC orders filled" showed 101% when supply exceeded demand; now capped | — |
| Debrief commentary factually correct | **FAIL → fixed** | Reading the debrief | It claimed the player "never committed capital" when a project had been committed but not yet complete; the wording now distinguishes committed from productive | — |

---

## 3. Runtime findings

**How the game was launched**

- Primary: `file://C:/Users/jayoma/Desktop/Policy%20Project/index.html` in Chromium (in-app browser).
- A local server (`python -m http.server 8000`) was not required and was not used; the game is
  built to run from a plain file open.
- No dependencies were installed. No `npm`, no bundler, no framework, no charting library.

**Browser and viewport tested**

- Chromium (Electron in-app browser), device pixel ratio 1.75.
- Viewport A: 1280 × 720 (desktop/laptop).
- Viewport B: ≈640 × 735 (split-screen / narrow window), used to check the responsive layout
  and to catch text/label collisions at small scale.

**Regression round after the graph-interaction fixes (executed, not assumed)**

- Startup self-tests: **28/28 passed**, zero console errors and zero warnings.
- Self-test 27 verified to have teeth: with the gallery re-render temporarily removed it failed
  with "the gallery marker did not move when the allocation changed (stale render)"; the fix was
  restored and the suite returned to 28/28.
- Graph 1 re-checked at the allocation that lands the marker on point B (23 of 100 tokens to
  conventional DRAM): the marker now sits on the frontier next to B, and the "your allocation"
  label is drawn to the **left** of the marker, clear of the "B" and "more HBM" labels.
- Graph 1 re-checked at the default 60/40 allocation: the marker and its label are unchanged from
  the earlier layout and clear of every other label.
- Graph 4 re-checked: the "Q2 = 83.3" label now sits lower on its dashed line, clear of the point
  where D, S1, S2 and both buyer-segment curves converge at E2.
- All five graph tabs opened and re-read: Graph 1 (PPC), Graph 2 (P1 = 60.0, P2 = 80.0, Q1 = 100,
  Q2 = 75, shortage at P1), Graph 3 (wedge s = 8, Pc = 54.7, Pp = 62.7, Q2 = 106.7, expenditure
  on eligible incremental units only), Graph 4 (P1 = 100.0, P2 = 108.3, Q1 = 100, Q2 = 83.3,
  D-mainstream flatter, D-urgent steeper) and Graph 5 (wedge s = 15, Pp = 106.7, Pc = 91.7,
  Q2 = 116.7, eligible redemptions only).
- Market Exchange re-read after the parameter correction: PC price index **99.1**, quantity demanded
  **103.8** (mainstream **72.9** + urgent-need **30.9**), shipments **103.6**, deferrals **0.0**;
  DRAM price index **61.9**, shortage **14.8**, HBM orders unfilled **16.4**.
- Policy Office re-opened: both interventions, their incidence/fiscal-cost/deadweight-loss
  trade-offs and the three recommendation options render; option B (PC consumer voucher) was
  selected and **Submit recommendation** recorded the choice and closed the panel.
- **Reset Game** returned to Q3 2026, 400 credits, 100/100 tokens, 94.8 conventional / 25.6 HBM
  output, shortage 14.8, all seven objectives back to "Pending" and the period log cleared.

**Regression round after the final submission-compliance pass (executed, not assumed)**

- The brief was rebuilt to the rubric structure: eight sections (Executive Summary, Introduction, Methodology, Research/Data/Summaries/and Conclusions, **Analysis of Content**, Recommendations, Measurement, References), seven claims renumbered into the rubric order (scarcity; DRAM relevance; DRAM change and elasticity; DRAM intervention; PC relevance; PC change and elasticity; PC intervention), a "To: policymakers" address line, and the Unit 1 frameworks moved into the Analysis of Content section where they are applied to the problem.
- **The brief now prints to 2 A4 pages, verified against a real PDF.** Headless Edge printed `index.html` with `--print-to-pdf` and the page count was read from the PDF: **2 pages** (MediaBox confirmed A4). The in-app "Check printed length" estimator agrees (538 mm at A4 width). Print typography: 9.0pt body, 9 mm top/bottom and 10 mm side margins, 190 mm measure, two-column reference list.
- The brief was audited term by term against the Unit 1 / Unit 2 / intervention rubrics. **Consumer surplus, producer surplus, non-price determinants, disequilibrium, XED and YED are now stated for BOTH markets**; incidence, oligopoly, the revenue-share caveat and the production-possibilities term were all added. A programmatic audit of the rendered brief returns **no missing terms**.
- Self-test 18 was rewritten: it now asserts all eight section headings, a 1,250-1,700 word band, and - new - that the brief estimates to **at most two A4 pages**.
- **New defect found and fixed:** the toast confirmation message sits over the "Open Debrief" button, so the first click after submitting a policy was swallowed. `.toast` is now `pointer-events: none`, and self-test 28 asserts the computed `pointer-events` value.
- Full scenario re-run after the fix: allocate -> production cycle (Q3 2026 to Q4 2026, 400 to 641 credits, shortage 14.8 to 5.6) -> invest (641 to 561 credits, capacity unchanged because the project has a delay) -> read market -> policy (option A) -> submit -> **Open Debrief now works on the first click** (grade C, 68/100, five dimensions) -> Replay (new run, policy retained).
- Reset re-checked: back to Q3 2026, 400 credits, 100/100 tokens, 94.8 conventional / 25.6 HBM, shortage 14.8, all seven objectives Pending and the period log cleared.
- All six workstations re-opened and re-read (Allocation Console, Production Floor, Market Exchange, R&D and Capacity Expansion, Research Archive, Policy Office). All five graph tabs re-rendered and re-read. Glossary search ("comparative" -> 1 of 25 terms), knowledge check and the Evidence screen (Gartner 71.301 / 55.351 / -22.4%) all confirmed.
- Evidence cards re-audited: the $13.1bn / ~42% GAO figures, the ~87% Counterpoint revenue share, the ~40% combined DRAM-and-SSD cost share, the Micron 2027/2028/2030 timelines, the TrendForce 13-18% and 10-15% projections, the Omdia 58.1m / -21.2% figures, and the forecast / projection / preliminary / reported labels are all present.
- Startup self-tests: **28/28 passed**, zero console errors and zero warnings; no failed network requests.
- Startup self-tests: **28/28 passed**, zero console errors and zero warnings.
- Live PC parameters corrected to `mainstreamIntercept: 121, mainstreamSlope: 0.3,
  urgentIntercept: 130, urgentSlope: 1.0` and re-verified in the running model: PC price index
  **99.1**, quantity demanded **103.8** (mainstream **72.9** + urgent **30.9**), shipments
  **103.6**, deferrals **0.0**, unfilled HBM **16.4**, DRAM price index **61.9**, shortage
  **14.8**. The baseline total demand of 100 at a price index of 100 is unchanged.
- Mainstream demand confirmed more price-elastic than urgent demand in the live engine, not only
  in Graph 4: |PED| 4.76 (mainstream) versus 3.33 (urgent) at the baseline, still in that order at
  P + 10.
- Self-test 25 was proven to have teeth by two temporary parameter reversals: a full reversal
  failed with "baseline mainstream quantity is 30.000, expected ~70", and a slopes-only reversal
  that preserved the 70/30 split failed with "live parameters are reversed: mainstream |PED| 1.43
  is not above urgent |PED| 11.11". The parameters were restored and the suite returned to
  28/28.
- Three consecutive production cycles run from the opening state: the period advanced, the
  conventional/HBM split moved to 53.7 / 43.4 at a 30/70 allocation, and the projected shortage
  rose to 22.1 as the DRAM price index climbed.
- Opportunity-cost readout re-checked live at two allocations: 1.59 conventional units forgone per
  HBM unit at 70/30, 0.57 at 30/70.
- The PC consumer voucher was exercised through the Policy Office and produced the expected
  demand response without disturbing the upstream DRAM equilibrium.
- Graph 4 re-inspected after the parameter change: D-mainstream is visibly the flatter curve
  (|ε| = 3.33) and D-urgent the steeper one (|ε| = 1.00), both crossing at (Q = 100, P = 100);
  the legend, the in-graph note and the card text all agree.
- The Evidence screen's GAO card confirmed rewritten with the verified findings.
- **Reset Game** returned to Q3 2026 with 400 credits and a zeroed period log; **Replay** started a
  clean run while retaining the player's policy recommendation.
- The Allocation Console's two bottom buttons were clicked after the delegated-action rewrite:
  "Save allocation & close" closes the panel and applies the allocation, "Open Graph 1 in the
  gallery" opens the gallery on Graph 1.

**Regression round after the final patch (executed, not assumed)**

- Startup self-tests: **28/28 passed**, zero console errors and zero warnings.
- Graph 4 re-inspected after the curve correction: D-mainstream is visibly the flatter curve
  (|ε| = 3.33) and D-urgent the steeper one (|ε| = 1.00), both crossing at (Q = 100, P = 100);
  the legend, the in-graph note and the card text all agree.
- Modal behaviour: opened the Research Archive (a long, scrollable panel), scrolled the panel body
  to the end, and clicked a **bottom** button — it activated correctly (the Graph Gallery opened)
  instead of being swallowed by the backdrop. `Escape` still closes the panel.
- All six workstations opened: Allocation Console, Production Floor, Market Exchange,
  R&D and Capacity Expansion, Policy Office, Research Archive.
- Policy → debrief → **Replay**: debrief rendered (grade C, 69/100, five dimensions), Replay started
  a clean run while retaining the policy recommendation.
- **Reset Game**: returned to Q3 2026, 400 credits, initial allocation and a zeroed period log.
- Policy Brief: all seven sections, all seven claims, the three inquiry questions and all seven
  references confirmed present in the rendered DOM; print length measured in-app at
  **3 A4 pages (690 mm)**.

**Console errors**

- None after the fixes in §6. The only console output is the self-test summary
  (`DRAM Factory Tycoon self-tests: 28/28 passed`) and its per-test lines.
- A global `error` and `unhandledrejection` handler records any uncaught error into
  `window.DRAM_ERRORS`; self-test 17 asserts that array is empty.
- The Diagnostics panel reports **28 of 28 checks passed**, including the destructive
  "reset restores the initial state" check that re-runs the game state.

**Network / asset errors**

- None. The application loads no external resources: no CDN, no web font, no image file, no
  API call. All graphics are Canvas 2D and SVG generated at runtime.

**Actual interactions tested**

Start Game · arrow-key and letter-key movement · `E` to open a panel · mouse click on four
stations · allocation slider drag · utilisation slider · production cycle ×3 · investment
commit (yield project) · policy radio selection, reasoning text and submit · debrief display ·
Reset Game · Replay · Pause / Resume · all five graph tabs · the Graph 2 long-run toggle ·
the Evidence screen and its data chart · glossary search field · two knowledge-check answers
(correct and incorrect) and "Try again" · "Check printed length" · Diagnostics button.

**Source verification (external)**

| Source | Method | Result |
|---|---|---|
| Micron FY2026 Form 10-K (Sept 3, 2026) | SEC EDGAR full-text search API, then browser | **VERIFIED.** The search index returns exactly one FY2026 10-K for CIK 0000723125 — `0000723125-26-000023:mu-20260903.htm`, form 10-K, period ending 2026-09-03 — which is the document cited. A query for the phrase "cleanroom" against Micron's 10-K filings returns that filing as the **highest-scoring match**, confirming the cleanroom resource-intensity language is in the FY2026 10-K rather than an earlier year. (The filing page itself refuses scripted requests; the browser path renders it.) |
| TrendForce (Sept 7, 2026) | `web_fetch` | **VERIFIED** — page title, `datePublished` 2026-09-07 and the 59.5% QoQ revenue figure all match the citation. |
| TrendForce (Sept 30, 2026) | `HEAD` | **Link resolves (HTTP 200).** Content not fully fetched. |
| Counterpoint Research (Sept 2, 2026) | `HEAD` | **Link resolves (HTTP 200).** Content not fully fetched. |
| Gartner (Oct 12, 2026) | `web_fetch` | **VERIFIED** — title, dateline "STAMFORD, Conn., October 12, 2026", and the description "Worldwide PC shipments totaled 55.4 million units in the third quarter of 2026, down 22.4% from the third quarter of 2025 … preliminary results" all match. |
| Omdia (Oct 9, 2026) | `web_fetch` | **VERIFIED** — title, "October 9, 2026", and the body text "falling 21.2% year-on-year to 58.1 million units" with pull-forward demand named as a cause. The same page supplies the additional statistic used in Claim 3 — the **combined** DRAM and SSD cost share in PCs rising from about 15% to nearly 40%, with prices more than fourfold (Ben Yeh, Principal Analyst) — now described as a combined figure, not DRAM alone. |
| GAO-26-109121 (Aug 6, 2026) | `web_fetch` (blocked) then **real browser** | **VERIFIED.** The product page loads in the browser: "Semiconductors: Commerce Needs Plan to Meet CHIPS for America R&D Requirements", GAO-26-109121, "Published: Aug 06, 2026. Publicly Released: Aug 06, 2026". The Highlights state: "As of April 2026, awardees had completed all required milestones by their due dates, but some milestones had fallen behind anticipated schedules. Commerce has disbursed $13.1 billion to awardees—approximately 42 percent of the total $31.5 billion in direct funding." It also reports 49 funded projects across 24 companies as of July 15, 2026. The detailed body cites $31.2 billion, so this project quotes only the $13.1bn / ~42% figures and never repeats a denominator. |

---

## 4. Graph audit

All five graphs are generated from the inverse-curve equations below. Equilibria are computed,
not drawn by eye.

**Graph 1 — Production Possibilities Curve**
Axes: X = conventional DRAM output index, Y = HBM output index (both illustrative indices).
Frontier from `convUnits(a) = 2.0·a·(1 − 0.35·a/100)` and `hbmUnits(b) = (b/1.5)·(1 − 0.10·b/100)`
— a bowed-out frontier because output per token falls as a plant is pushed toward one product.
Points A (more conventional), B (more HBM), C (inside = inefficient/underused), D (outside =
unattainable). A dashed outward frontier represents extra capacity/technology. A purple arrow
shows movement *along* the frontier (reallocation) and the marker shows the player's live
allocation. The caveat that this is a shared-resource abstraction — not a one-for-one
conversion of identical lines, and HBM also needs advanced packaging — is stated on the graph
and in the caption.
*Verified:* bowed shape confirmed numerically against the chord (self-test 10); on/inside/outside
classification confirmed.

**Graph 2 — Conventional DRAM supply and demand**
D: P = 140 − 0.8Q · S1: P = 20 + 0.4Q · S2 (constrained): P = 50 + 0.4Q.
E1 = (Q 100, P 60); E2 = (Q 75, P 80). At P1 the shortage gap runs from Qs = 25 to Qd = 100.
A toggle swaps S2 for the flatter long-run supply curve (P = 20 + 0.15Q), which is the
short-run/long-run PES comparison. *Verified:* P2 > P1, Q2 < Q1 (self-test 2); long-run curve
flatter (self-test 9).

**Graph 3 — Targeted producer incentive**
D unchanged; effective supply to buyers S2 = P = (20 + 0.4Q) − s with s = 8.
E1 = (100, 60). E2: 140 − 0.8Q = 12 + 0.4Q → **Q2 = 106.67, Pc = 54.67, Pp = 62.67**.
Wedge = 62.67 − 54.67 = **8.00 = s exactly**. The hatched band marks the *eligible incremental*
range (Q1 → Q2) and the fiscal expenditure is labelled s × 6.67 ≈ 53.3 index-credits — explicitly
**not** s × the whole market Q2. *Verified:* self-tests 3, 4 and 5.

**Graph 4 — PC/laptop supply and demand**
D: P = 150 − 0.5Q · S1: P = 60 + 0.4Q · S2 (higher DRAM input cost): P = 75 + 0.4Q.
E1 = (100, 100); E2 = (83.33, 108.33). Shortage gap drawn at P1 from Qs = 62.5 to Qd = 100.
Two additional dashed demand curves illustrate buyer heterogeneity, and both are drawn through the
same comparison point (P = 100, Q = 100):
- **D-mainstream (flatter = more elastic): P = 130 − 0.3Q.** In inverse form P = a − bQ a
  *smaller* b is the *flatter* curve, so |ε| = P/(bQ) = 3.33 at the comparison point.
- **D-urgent (steeper = less elastic): P = 200 − 1.0Q.** A *larger* b is the *steeper* curve,
  so |ε| = P/(bQ) = 1.00 at the same point.
*Correction applied:* the earlier version of this graph used P = 163 − 0.9Q for the mainstream
segment and P = 115 − 0.5Q for the urgent segment while labelling them "flatter" and "steeper"
respectively — **the labels were the reverse of the mathematics** (the b = 0.9 curve was actually
the steeper and more elastic one). The curves are now b = 0.3 and b = 1.0, the labels are correct,
both curves pass through (100, 100), and self-test 24 asserts the ordering and the common point.
*Verified:* self-test 8 and self-test 24.

**The live simulation was corrected to match.** The *running* PC market in `CONFIG.SIM.pc`
inverted its own formula — it solved `Q = (intercept − price) / slope`, so the old values
(mainstream 163 / 0.9, urgent 115 / 0.5) made urgent-need buyers the **more** elastic segment and
contradicted the graph the player is shown. The live parameters are now
`mainstreamIntercept: 121, mainstreamSlope: 0.3, urgentIntercept: 130, urgentSlope: 1.0`:
`Q_i(P) = (intercept_i − P) / slope_i`, and because `|PED| = P / (b · Q)`, the **smaller** slope
is the **more** elastic segment — mainstream |PED| 4.76 against urgent |PED| 3.33 at P = 100. The
baseline is preserved: 70.0 mainstream + 30.0 urgent = 100.0 total demand at the baseline price
index of 100. Graph 4 keeps its own inverse-form curves (`P = 130 − 0.3Q` and `P = 200 − 1.0Q`),
which share the same slopes and therefore the same relative elasticity ordering, with different
intercepts so that both pass through the comparison point (100, 100).
*Verified:* self-test 25, which fails if the live parameters are reversed.

**Graph 5 — Targeted PC consumer voucher**
S unchanged: P = 60 + 0.4Q. D1: P = 150 − 0.5Q. D2 (eligible demand boosted): P = 165 − 0.5Q.
E1 = (100, 100). E2: 60 + 0.4Q = 165 − 0.5Q → **Q2 = 116.67, Pp = 106.67, Pc = 91.67**.
Wedge = 15.00 = s exactly. Expenditure is labelled on eligible redemptions only
(s × 35.0 ≈ 525 index-credits at an illustrative 30% eligible share), with a hatched eligible
region. *Verified:* self-tests 6 and 7.

---

## 5. Economics and assignment audit

### 5.1 Unit 1 — PASS (all 13 items)

| Concept | Status | Where |
|---|---|---|
| Scarcity | PASS | Brief Introduction; glossary; Allocation Console note ("your plant has 100 shared resource tokens") |
| Scarcity vs shortage | PASS | Brief Introduction, explicit contrast; glossary; Market Exchange distinguishes "Shortage — Qd > Qs at the current price" from the underlying constraint |
| Opportunity cost | PASS | Brief Introduction; Allocation Console live readout; Graph 1 annotation and A→B arrow |
| Trade-offs | PASS | Brief (AI performance vs affordability; higher-margin mix vs availability; new capacity vs other investment; industrial growth vs public expenditure; expansion vs energy/water) |
| Production and PPC | PASS | Graph 1; brief; Allocation Console embeds the live PPC with the player's marker |
| Four factors of production | PASS | Brief (land/natural resources, labour, capital, entrepreneurship) |
| Socioeconomic values | PASS | Brief (efficiency, equity, innovation, employment/growth, national security and resilience, environmental sustainability) |
| Market system vs central planning | PASS | Brief: market allocation, the three questions (what/how/for whom), coordination and incentive limits of planning |
| What / how / for whom | PASS | Brief; Graph 1 shows who receives the scarce resources |
| Absolute advantage | PASS | Brief hypothetical: Factory A produces more of both |
| Comparative advantage | PASS | Brief hypothetical: A's HBM opportunity cost 2 vs B's 3; B's conventional DRAM cost 1/3 vs A's 1/2 |
| Worked hypothetical example | PASS | Brief: A (10/5) and B (6/2) with the arithmetic shown and explicitly labelled fictional |
| Marginal and cost-benefit analysis | PASS | Brief; R&D panel applies expected marginal benefit vs marginal cost to the firm and to government |

### 5.2 Unit 2 — PASS (all 17 items)

| Concept | Status | Where |
|---|---|---|
| Two clearly defined markets | PASS | Brief; Graph Gallery tabs; Market Exchange panel splits Market 1, Market 2 and the HBM segment |
| Market 1 relevance claim | PASS | Brief Claim 2 |
| Market 2 relevance claim | PASS | Brief Claim 3 |
| Law of demand / law of supply | PASS | Brief; Graph 2 and Graph 4; Market Exchange |
| Non-price determinants | PASS | Brief Claims 1, 4, 5; Market Exchange "Non-price determinants at work" list (demand: derived demand, expectations, complements; supply: wafer/cleanroom capacity, process and yield, capital, skilled labour, allocation priorities, qualification time) |
| Equilibrium | PASS | Brief; graphs (E1/E2); Market Exchange status line |
| Disequilibrium | PASS | Graph 2 shortage gap; Graph 4 shortage gap; Market Exchange "Shortage"/"Surplus" states |
| Consumer surplus — both markets | PASS | Brief; Market Exchange surplus panel (clear in Market 1, ambiguous direction for producers) |
| Producer surplus — both markets | PASS | Brief and Market Exchange state the ambiguity (higher price vs lower volume, higher costs, mix shift) |
| PES | PASS | Brief Claim 4 with the formula; Graph 2 toggle |
| PED | PASS | Brief Claim 5 with the formula; Graph 4 segment curves; Market Exchange segmentation and deferred-purchase counter |
| Short-run vs long-run elasticity | PASS | Graph 2 toggle; brief |
| Two interventions | PASS | Policy Office; Graphs 3 and 5; brief Recommendations |
| Incidence | PASS | Brief Claim 6; Graph 3 wedge analysis; Policy Office cards |
| Government expenditure | PASS | Graph 3 (eligible incremental units), Graph 5 (eligible redemptions); Policy Office fiscal costs |
| Deadweight loss | PASS | Brief Claims 6 and 7; Policy Office cards |
| Unintended consequences and externalities | PASS | Brief (derived-demand feedback, excess capacity, resilience spillover, environmental and employment trade-offs) |
| Optional XED / YED | PASS (used carefully) | Brief Claim 5 — used PCs as substitutes (positive XED) and PCs as normal goods (positive YED), with an explicit statement that no numerical coefficient is claimed |

### 5.3 Claims and inquiry questions — PASS

One overarching question plus Market 1 and Market 2 questions are stated at the head of the
brief; the seven claims (scarcity, DRAM relevance, PC relevance, DRAM supply/elasticity,
PC input cost/PED, DRAM intervention, PC voucher intervention) are each developed with data,
concept, limitations, a graph link and a relevance statement, and are listed with their
supporting sources on the Evidence screen.

### 5.4 Exemplary rubric — honest assessment

| Criterion | Assessment |
|---|---|
| Communication — claims and thesis | **Strong.** Seven claims, each with a stated economic mechanism, evidence, limits and a graph; the thesis (the binding constraint is upstream capacity and time) is argued rather than asserted. |
| Communication — techniques | **Strong.** One continuous product: the same index values, claims and graphs appear in the game, the gallery and the brief. The game supports the formal tone rather than undercutting it. |
| Inquiry — questioning | **Strong.** The questions are significant and the product answers them with nuance, including the explicit warning that this is not automatically market failure. |
| Application — creating arguments | **Strong on evidence and trade-offs; the weakest point is length** — see §7. |
| Application — using evidence | **Strong.** All five graphs are correct and consistent with the brief; six sources are directly cited with dates and evidence types, and every statistic used in the brief was verified against the live pages where the publisher permitted it (§3). |

**Gap to Exemplary.** The brief is longer than the word guideline and prints to three pages
rather than two, and two of the seven primary sources could not be opened from the test
environment (the SEC and the GAO both block automated requests). Neither is a defect in the
reasoning, but both would need to be closed — by trimming the brief and a human re-check of the
two blocked sources — before a teacher could be certain.

---

## 6. Problems found and fixed

| # | Severity | Defect | Fix | Files changed |
|---|---|---|---|---|
| 1 | CRITICAL | The whole UI failed to initialise: `Econ.initMarkets is not a function` — the helper existed but was not exported, so no screen, panel or HUD worked. | Exported `initMarkets` from `js/economy.js`. | `js/economy.js` |
| 2 | CRITICAL | The equilibrium solver ignored the subsidy shifts, so the producer and consumer subsidy tests failed and Graph 3/5 would have plotted the wrong equilibrium. | `eq()` now applies `dshift`/`sshift` to the intercepts: Q* = (a_d + Δd − a_s − Δs)/(b_d + b_s). | `js/graphs.js` |
| 3 | CRITICAL | Graph 1's production possibilities frontier was drawn in **raw data coordinates instead of pixel coordinates**, so the curve was painted in the top-left corner of the chart and the PPC was unreadable. | `pathFrom()` now maps every point through `X()`/`Y()`. | `js/graphs.js` |
| 4 | CRITICAL | **The player could not reach three of the six stations.** The map's walls sealed the start tile inside an enclosed pocket. | Map redesigned (continuous central corridor, open side aisles, start tile moved beside the Production Floor). A flood-fill reachability check was added as self-test 21 so this cannot regress. | `js/game.js`, `js/data.js` |
| 5 | CRITICAL | Interaction range was measured to each station's **centre**, but stations are solid obstacles, so the player could never get inside the range — `E` would have been unusable. | Distance is now measured to the nearest **edge** of the station rect; range raised to 92 px. | `js/game.js` |
| 6 | HIGH | `Escape` did not close panels: the key handler returned early when a modal was open. | Escape is handled before the focus check; `isModalOpen()`/`isGameScreen()` added to the UI API. | `js/game.js`, `js/ui.js` |
| 7 | HIGH | The range sliders swallowed keyboard shortcuts because `isTypingTarget` treated every `<input>` as a text field, so `Escape`/`E`/`P` stopped working after touching a slider. | Only text-entry input types count as typing targets. | `js/game.js` |
| 8 | HIGH | The pause overlay was visible on load: `display:flex` overrode the `hidden` attribute. | Added `.canvas-overlay[hidden]{display:none}`. | `styles.css` |
| 9 | HIGH | Text inside white `.card` panels (Evidence screen, quiz result) inherited the dark theme's light colour — a serious contrast failure. | `.card` now sets an explicit ink colour, including `p`, `li`, `caption` and `.caption`. | `styles.css` |
| 10 | HIGH | Every graph label collapsed to the origin: the new `labelEl()` helper forgot to write the `x`/`y` attributes, so all text rendered in the top-left corner. | `labelEl()` now sets `a.x` and `a.y`. | `js/graphs.js` |
| 11 | MEDIUM | Systematic label collisions across all five graphs (legends over curve labels, reference-line labels clipped off the left edge, note blocks overlapping curves). | Fixed a consistent placement scheme (legend top-right, reference labels inside the plot, quantity labels at the foot) **and** gave every label a white halo (`paint-order: stroke`) so it stays readable wherever it crosses a line. | `js/graphs.js` |
| 12 | MEDIUM | The graph scaled to the full width of a large window, making it enormous and pushing the explanatory text far below the fold. | SVG capped at 1100 px and centred. | `styles.css` |
| 13 | MEDIUM | The opening market ignored the plant's own plan, so the player saw a shortage of 20 units before producing anything, and an "unfilled HBM orders" figure of 42 instead of ~16. | `initMarkets()` now seeds the plant's planned output before the first market update, so the opening state matches what the player is looking at. | `js/economy.js` |
| 14 | MEDIUM | The debrief claimed the player "never committed capital to future capacity" even when a project had been committed but not yet complete. | The commentary and the resilience note now distinguish *committed* from *productive* projects. | `js/economy.js` |
| 15 | MEDIUM | "PC orders filled" and "PC demand met" could exceed 100%. | Both are capped at 100%. | `js/ui.js`, `js/economy.js` |
| 16 | MEDIUM | The knowledge-check score counted a wrong answer as correct, because the correct option was highlighted in green after a wrong choice. | The result is tracked per question with a `data-result` attribute. | `js/ui.js` |
| 17 | LOW | The graph's own text elements were not haloed, so labels crossing a curve were hard to read. | White halo applied to all label types. | `js/graphs.js` |
| 18 | LOW | Dead code: an unused placeholder curve array and a stale `xLabel_note` option in Graph 1; an unused prompt hook in the game module. | Removed. | `js/graphs.js`, `js/game.js` |
| 19 | MEDIUM | The Graph Gallery rewrote the URL hash on every tab click, which the browser tooling (and the browser history stack) read as a navigation. | The hash is now only written when a panel explicitly links to a graph; tab clicks leave the URL unchanged. | `js/ui.js` |
| 20 | MEDIUM | Graph content was only verified by eye, so a label could silently disappear in a future edit. | Added self-test 23, which asserts the exact title, axis text, equilibrium values (P1/P2/Q1/Q2), wedge labels and shortage notes of each of the five graphs. | `js/tests.js` |
| 21 | LOW | No way to share or bookmark a single graph. | Added `#graph=g1`…`#graph=g5` deep links, honoured on load and on hash change. | `js/ui.js` |
| 22 | CRITICAL | Graph 4's two buyer-segment demand curves had their elasticity labels reversed: the curve labelled "flatter" used b = 0.9 (which is the *steeper*, more elastic curve) and the one labelled "steeper" used b = 0.5 (the *flatter*, less elastic curve). | Curves replaced with mainstream P = 130 − 0.3Q (flatter = more elastic) and urgent P = 200 − 1.0Q (steeper = less elastic), both drawn through the common comparison point (P = 100, Q = 100). Labels, legend, graph card text and the self-tests were updated, and self-test 24 now asserts the ordering and the shared point. | `js/data.js`, `js/graphs.js`, `js/tests.js` |
| 23 | HIGH | The Policy Brief did not contain the Unit 1 framework analysis (factors of production, market system and what/how/for whom, absolute and comparative advantage with the worked example, socioeconomic values, marginal analysis) — that material existed in the glossary and the game panels only, while the audit had recorded it as present in the brief. | Four paragraphs added to the Introduction covering all of it, including the worked Factory A/B example with its opportunity costs, and the brief was condensed at the same time. | `index.html` |
| 24 | MEDIUM | A click inside a modal could be read as a backdrop click in edge cases, so a click on a button low in a scrollable panel could close the panel instead of activating the button. | The modal card now stops propagation for both `mousedown` and `click`; the backdrop handler requires `e.target === backdrop`; the modal body has bottom padding and `scroll-margin` so the last row of buttons is never flush with the scroll edge. | `js/ui.js`, `styles.css` |
| 25 | LOW | Print typography (9.9pt, looser heading spacing) pushed the brief to three pages. | Type set to 9.6pt with tightened heading and paragraph spacing — still comfortably legible — and the measured length is now 690 mm at A4 text width. | `styles.css` |
| 26 | LOW | The Evidence card for the GAO report carried the older summary and did not record the Highlights-versus-body difference. | Rewritten with the verified findings, the $31.5bn (Highlights) versus $31.2bn (body) difference recorded, and an explicit statement that awardees did not miss contractual deadlines. | `js/data.js` |
| 27 | CRITICAL | The **live PC market contradicted Graph 4**. `CONFIG.SIM.pc` solved `Q = (intercept − price) / slope`, so the old mainstream (163 / 0.9) and urgent (115 / 0.5) parameters made urgent-need buyers the *more* elastic segment — the opposite of the graph and of the economics the brief teaches. | Live parameters corrected to `mainstreamIntercept: 121, mainstreamSlope: 0.3, urgentIntercept: 130, urgentSlope: 1.0`, which preserves the baseline 70/30 split and total demand of 100 while restoring the correct elasticity ordering. The comments in `data.js` now state the formula, the `|PED| = P/(b·Q)` relationship and why the smaller slope is the more elastic segment. | `js/data.js` |
| 28 | HIGH | The Policy Brief asserted "This is a timing problem, not market failure", which overstates what the evidence can establish and ignores the concentration and resilience channels the brief itself discusses elsewhere. | Replaced with a nuanced passage: a production-capacity and adjustment-lag problem that does not by itself prove market failure, but in which supplier concentration may create market-power concerns and supply-chain resilience may generate wider social benefits that private firms do not fully capture — potential market-failure channels, not proof of collusion or price fixing, with intervention evaluated against its fiscal and efficiency costs. | `index.html` |
| 29 | CRITICAL | **The Allocation Console's buttons were inert.** `panelAllocation` never called `wireModalActions()`, so "Save allocation & close" and "Open Graph 1 in the gallery" rendered as buttons that did nothing — a direct violation of the requirement that no visible button be decorative. | The six per-panel `wireModalActions()` call sites were replaced with a single delegated `data-action` listener attached to `#modal-body` once at initialisation, so no panel can ship an unbound button. Self-test 26 now dispatches a click on a temporary `data-action` element and fails if the delegated handler stops responding. | `js/ui.js`, `js/tests.js` |
| 30 | HIGH | **The Graph Gallery never re-rendered when the player entered it**, so Graph 1's "your allocation" marker showed a stale allocation: the requirement that the player can change the allocation and see the marker move along the frontier was met inside the Allocation Console but not in the gallery. | `showScreen('graphs')` now calls `renderGraph()`, so the gallery always draws the live state. Self-test 27 changes the allocation, re-enters the gallery and asserts the marker actually moved; it was verified to fail with the fix reverted ("the gallery marker did not move when the allocation changed (stale render)"). | `js/ui.js`, `js/tests.js` |
| 32 | CRITICAL | **The toast confirmation message swallowed the first click on "Open Debrief".** The toast is fixed to the bottom centre of the viewport, which is exactly where that button sits, so a player who submitted a recommendation and immediately pressed "Open Debrief" had to press it twice - a direct breach of the rule that a visible button must always perform its advertised action. | `.toast` now sets `pointer-events: none`, so the notification is still visible but can never intercept a click. Self-test 28 asserts the computed `pointer-events` value and fails if it is ever changed back. | `styles.css`, `js/tests.js` |
| 33 | HIGH | **The Policy Brief did not meet the required structure or the page limit.** It had seven sections with no "Analysis of Content", the seven claims were not in the rubric order, and it printed to three A4 pages. Consumer surplus, producer surplus, non-price determinants, disequilibrium, incidence and the DRAM-market XED/YED analysis were also missing from the brief. | The brief was rebuilt with all eight required sections, the seven claims renumbered into the rubric order, a "To: policymakers" address, and a new "Analysis of Content" section that carries the Unit 1 frameworks. Consumer surplus, producer surplus, non-price determinants, disequilibrium, XED, YED, incidence and oligopoly are now stated for **both** markets. Print typography was retuned (9.0pt body, 9 mm/10 mm margins, 190 mm measure, tighter heading spacing, two-column references) and the result is **2 A4 pages, confirmed by a real headless-Edge PDF**. Self-test 18 now asserts all eight headings, the word band and the two-page limit. | `index.html`, `styles.css`, `js/ui.js`, `js/tests.js` |

**New tests added as a result of the defects above:** self-test 21 (map reachability),
self-test 22 (allocation can never over-allocate), self-test 23 (every graph contains its required
title, axis text, equilibria, wedges and notes), self-test 24 (the two PC demand segments are
ordered correctly and both pass through the common comparison point), **self-test 25 (the live
simulation's own PC buyer-segment demand is positive, keeps the 70/30/100 baseline, and orders
mainstream above urgent in elasticity at the baseline and at P + 10)**, **self-test 26 (the
delegated modal-action handler responds to a synthetic `data-action` click)**, **self-test 27 (the
graph gallery re-renders on entry, so Graph 1's player marker tracks the live allocation)** and
**self-test 28 (the toast notification is non-interactive and cannot swallow a click)**, plus
stronger assertions in self-test 12 (every curve present), self-test 16 (every button wired and
labelled) and **self-test 18 (all eight brief sections, the word band, and the two-A4-page limit)**.
Self-tests 25 and 27 were deliberately proven to have teeth: with the live PC parameters
temporarily reversed (both intercepts and slopes, then slopes alone) self-test 25 failed with a
specific diagnostic, and with the gallery re-render temporarily removed self-test 27 failed with
"the gallery marker did not move when the allocation changed (stale render)". The code was restored
each time and the suite returned to 28/28.
---

## 7. Remaining gaps

1. **Policy Brief word count - PARTIAL.** The brief body is **1,592 words** against a 1,400-1,500
   target, about 6% above the top of the band. *Reason:* the brief must carry seven claims, each with
   data, an economic concept, its limitations, a graph link and its relevance; consumer and producer
   surplus, non-price determinants, disequilibrium, elasticity, XED and YED for **both** markets;
   every required Unit 1 concept including the worked comparative-advantage arithmetic; two
   interventions with incidence, cost, deadweight loss, winners, losers and unintended consequences;
   specific recommendations; a measurement plan; the three inquiry questions and the reference list.
   Closing the remaining ~90 words would mean dropping required analysis, so the content was kept and
   the page limit was met instead. **The two-page requirement is met** (2 A4 pages, confirmed by a
   real PDF); the word target is the one item still marginally out, and it is a length trade-off
   rather than missing content.
2. **Two sources are verified but were not machine-fetchable.** The Micron FY2026 10-K and
   GAO-26-109121 are both confirmed (§3): the 10-K through SEC full-text search — which returns
   exactly the cited accession `0000723125-26-000023`, form 10-K, period ended September 3, 2026,
   with "cleanroom" as its highest-scoring match — and the GAO report by opening the product page
   in a real browser, which returned the $13.1bn / ~42% figures and the milestone wording used
   in the brief. Both publishers block scripted requests, so a scripted re-check will still fail;
   that is a property of the sites, not of the project.
3. **The simulation is a teaching abstraction, not a forecasting model.** Prices adjust
   partially toward a target and supply is subject to a capacity ceiling; there is no
   disequilibrium solver, no order book and no expectation formation. This is stated in the
   README and in the brief's Methodology.
4. **Only two viewport sizes were exercised** (1280×720 and ~640×735). A true 1920×1080
   display was not available in the test environment, although the layout is fluid and was
   verified at the larger of the two widths.
5. **The HBM segment is simpler than the two focus markets** — a growing order book and a
   rising price index, with no explicit HBM demand curve.
6. **Game state is not persisted between page loads.** Reloading the page restarts the
   scenario; the "Replay" button preserves only the policy recommendation. (The assignment
   did not require persistence, and localStorage was deliberately avoided.)
7. **A minor intermittent click behaviour was observed once early in the audit**: clicking a
   button positioned low inside a scrollable modal body occasionally landed on the modal backdrop
   and closed the panel instead of activating the button. This was then **hardened** (defect 24:
   the modal card stops propagation and the backdrop handler requires an exact backdrop target).
   In this final round the bottom buttons of the Policy Office panel — "Submit recommendation",
   "Graph 3: producer incentive", "Graph 5: consumer voucher" and "Close" — were all clicked at
   the bottom of the scrolled panel and each one activated correctly. Not reproduced in
   subsequent runs.

---

## 8. Manual testing instructions

A student can repeat the most important checks in about ten minutes.

1. **Launch.** Open `index.html` in a desktop browser. The title screen must appear with the
   scenario text, the controls list and a **Start Game** button.
2. **Self-test.** Open the developer console - the log should read
   `DRAM Factory Tycoon self-tests: 28/28 passed`. Click **Diagnostics** to see the table, which
   also reports the brief's word count (1,592) and its measured two-page A4 length.
3. **Movement.** Click **Start Game**, then hold `W`, `A`, `S`, `D` and the arrow keys. The
   character must move, the page must not scroll, and the character must not pass through
   walls, machinery or station blocks or leave the map.
4. **Interaction.** Walk up to the Production Floor; the prompt must read
   "Press E or click — Production Floor". Press `E` (the panel opens) and press `Esc`
   (the panel closes). Click the same station with the mouse (the panel opens again).
5. **Allocation.** Open the Production Allocation Console. Drag the conventional-DRAM slider
   to 85: the HBM allocation must fall to 15, the outputs must update, and the opportunity
   cost line must change. The "Projected shortage after the next cycle" line must respond.
6. **Production.** Open the Production Floor and click **Run production cycle** twice. The
   period must advance in the HUD, credits must change, and the period log must gain a line.
7. **Investment.** Open R&D and Capacity Expansion and commit the 80-credit project. Credits
   must fall by 80 and the project must appear as "Productive from Q1 2027" — not immediately.
8. **Policy.** Open the Policy Office, choose option A, type a reason and submit. The
   objective list must show the policy stage complete and **Open Debrief** must become
   enabled.
9. **Debrief.** Open the debrief. The five score boxes, the period table and the commentary
   must match what you actually did.
10. **Graphs.** Open the Graph Gallery and step through all five tabs. Check that each has a
    title, labelled axes, named curves, E1/E2 with P and Q values, and arrows. On Graph 2,
    click the toggle and confirm the long-run supply curve is flatter. On Graph 4, confirm that
    **D-mainstream is the flatter curve** (more elastic) and **D-urgent is the steeper curve**
    (less elastic), that both cross at P = 100, Q = 100, and that the legend lists both.
    On Graph 1, confirm the purple "your allocation" marker sits on the frontier and that its
    label does not overlap the "A"/"B"/"C"/"D" labels — including after you move the allocation
    slider in the Allocation Console and come back to the gallery.
11. **Live PC market.** Open the Market Exchange. The PC price index should read 99.1 and the
    demand split should show roughly 72.9 mainstream buyers against 30.9 urgent-need buyers
    (103.8 in total), with 0.0 purchases deferred at the opening state.
11. **Evidence.** Open Evidence: the Gartner chart must show 71.301 and 55.351 and −22.4%, and
    seven source cards must list finding, limitation and relevance.
12. **Knowledge check.** Open Knowledge Check, answer one question correctly and one
    incorrectly, confirm the explanations appear, and use **Try again**.
13. **Print.** Open Policy Brief → **Check printed length** (it reports the A4 page count),
    then **Print / Save as PDF (A4)**. Only the brief should print — no navigation bar, no
    factory map — with the reference list at the end.

---

## 9. Final recommendation

**Ready for student review, but not yet submission-ready.**

The application is complete and stable: it launches from a plain file open, the full scenario
is playable end to end, all five graphs are mathematically correct and consistent with the
brief, the policy brief covers every required section, all seven claims and every required Unit 1
and Unit 2 concept, and 28 automated self-tests pass with no console errors. Every critical and
high-severity defect found during this audit — including the ones that would each have broken a
core requirement, the last three being Graph 4's reversed elasticity labels, the live PC
simulation's reversed buyer-segment elasticity and the Allocation Console's inert buttons — has
been fixed and re-tested.

One item remains open, and it is a presentation decision rather than a defect:

1. **Decide how the brief is submitted.** The brief now prints to **two** A4 pages (verified
   against a real headless-Edge PDF) with 9.0pt body text, and its body prose is 1,592 words
   against a 1,400-1,500 target - about 6% over. Closing the last ~90 words would mean cutting
   required analysis (surplus, non-price determinants, XED/YED or the comparative-advantage
   arithmetic), so the content was kept and the page limit met. If a strict 1,500-word reading
   is required, move the seven-claim paragraphs to an appendix or print the Measurement section
   separately; the brief text itself no longer needs cutting.
All seven sources are now verified (§3), including the Micron 10-K (SEC full-text search) and the
GAO report (opened in a real browser), so no citation remains unverified.

Nothing in this audit changes the analysis, the graphs or the policy recommendation.
