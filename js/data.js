/* ============================================================
   DRAM Factory Tycoon — data.js
   Central configuration, evidence bank, glossary, quiz.
   ------------------------------------------------------------
   IMPORTANT ECONOMIC INTEGRITY NOTE
   Every number in CONFIG.SIM and CONFIG.GRAPH_MODEL is a FICTIONAL
   ILLUSTRATIVE PARAMETER chosen for teaching. They are NOT observed
   DRAM industry prices, output levels, costs, market shares or
   measured price-elasticity coefficients. The real-world evidence
   (with dates and links) lives in DRAM.SOURCES.
   ============================================================ */
(function () {
  'use strict';

  var DRAM = window.DRAM || (window.DRAM = {});

  /* ---------------------------------------------------------------
     1. SIMULATION CONFIGURATION  (all values = illustrative assumptions)
     --------------------------------------------------------------- */
  DRAM.CONFIG = {
    SIM: {
      /* --- Shared productive resources (the scarce pool) --- */
      totalTokens: 100,            // ASSUMPTION: illustrative shared capacity units
      maxPeriods: 8,               // ASSUMPTION: length of the scenario in periods
      startCredits: 400,           // ASSUMPTION: fictional starting cash balance

      /* --- Conversion of tokens into output (fictional) ---
         convUnits(a) = convPerToken * a * (1 - convDiminish * a / totalTokens)
         The diminishing term makes opportunity cost rise as you push
         a plant further toward one product, which produces a bowed-out
         production possibilities frontier.                     [ASSUMPTION] */
      convPerToken: 2.0,           // ASSUMPTION
      convDiminish: 0.35,          // ASSUMPTION
      hbmDiminish: 0.10,           // ASSUMPTION: diminishing returns on HBM output
      hbmYieldBoost: 1.0,          // modified by "process improvement" projects
      hbmTokenCost: 1.5,           // modified by "HBM capacity" projects

      /* --- Money (fictional credits) --- */
      operatingCostPerToken: 3.0,  // ASSUMPTION: fictional credits per token per cycle
      overheadPerCycle: 30,        // ASSUMPTION: fictional fixed plant overhead
      convRevenueFactor: 0.045,    // ASSUMPTION: credits per (price index point x unit)
      hbmRevenueFactor: 0.10,      // ASSUMPTION: HBM carries a higher value per unit

      /* --- Market 1: conventional DRAM --- */
      dram: {
        demandInterceptBase: 120,  // ASSUMPTION
        pcDemandLink: 0.2,         // ASSUMPTION: DRAM demand intercept rises with PC demand
        demandSlope: 0.8,          // ASSUMPTION: |b_d| in P = a_d - b_d Q
        supplyIntercept: 20,       // ASSUMPTION: |a_s| in P = a_s + b_s Q
        supplySlope: 0.4,          // ASSUMPTION: |b_s| (short run: relatively inelastic)
        baseIndustryCapacity: 55,  // ASSUMPTION: conventional capacity available from all other suppliers
        capacityPerConvUnit: 0.40, // ASSUMPTION: how much market capacity one player output unit adds
        basePrice: 60,             // ASSUMPTION: starting conventional DRAM price index
        priceFloor: 35,
        priceCeiling: 200,
        priceAdjustSpeed: 0.55,    // ASSUMPTION: how fast the market price moves toward its target
        longRunSupplySlope: 0.15,  // ASSUMPTION: flatter long-run supply curve
        longRunSupplyIntercept: 25 // ASSUMPTION
      },

      /* --- Market 2: PCs and laptops ---
         IMPORTANT — how these parameters work (they are the LIVE simulation
         parameters, not the Graph 4 teaching curves).

         The engine solves each buyer segment directly for quantity:
             Q_i(P) = (intercept_i - P) / slope_i
         so dQ/dP = -1/slope_i and the absolute price elasticity of demand is
             |PED_i| = P / (slope_i * Q_i)

         Therefore a SMALLER slope means a LARGER quantity response to a
         price change, i.e. the MORE price-elastic segment. A larger slope
         is the LESS elastic segment. (Equivalently, the inverse-demand
         curve P = intercept - slope*Q is flatter for the smaller slope.)

         The values below are illustrative fictional model properties — NOT
         measured real-world PED coefficients. They are chosen so that the
         baseline price index of 100 still produces the same quantities as
         the original model: mainstream 70, urgent 30, total 100 — while
         making mainstream buyers relatively MORE elastic than urgent-need
         buyers, which is the ordering Graph 4 depicts.

         Graph 4 (GRAPH_MODEL.pc) draws the same relationship in inverse
         form with different intercepts so that both curves cross at the
         common comparison point (P = 100, Q = 100). The slope, and
         therefore the relative elasticity ordering, is identical in both. */
      pc: {
        mainstreamIntercept: 121,  // ASSUMPTION: Q_main = (121 - P) / 0.3  ->  70 units at P = 100
        mainstreamSlope: 0.3,      // ASSUMPTION: smaller slope = MORE price-elastic (|PED| ~ 4.76 at P = 100)
        urgentIntercept: 130,      // ASSUMPTION: Q_urgent = (130 - P) / 1.0  ->  30 units at P = 100
        urgentSlope: 1.0,          // ASSUMPTION: larger slope = LESS price-elastic (|PED| ~ 3.33 at P = 100)
        supplyInterceptBase: 60,   // ASSUMPTION
        inputCostLink: 0.5,        // ASSUMPTION: PC supply intercept rises per DRAM price index point above base
        shortageSupplyLink: 0.10,  // ASSUMPTION: PC supply intercept rises per unit of DRAM shortage
        supplySlope: 0.4,          // ASSUMPTION
        capacityBase: 108,         // ASSUMPTION: industry PC assembly capacity
        capacityShortageLink: 0.30,// ASSUMPTION: DRAM scarcity cuts achievable PC output
        basePrice: 100,            // ASSUMPTION: PC price index
        priceFloor: 60,
        priceCeiling: 220,
        priceAdjustSpeed: 0.5,     // ASSUMPTION
        deferralThreshold: 104,    // ASSUMPTION: PC price index above which mainstream buyers defer
        deferralRate: 0.12         // ASSUMPTION: share of mainstream demand deferred per index point
      },

      /* --- HBM / server memory segment (separate product market) --- */
      hbm: {
        demandBase: 42,            // ASSUMPTION: server orders per period
        demandGrowth: 0.05,        // ASSUMPTION: server-memory demand growth per period
        priceBase: 120,            // ASSUMPTION: HBM price index
        priceGrowth: 0.06,         // ASSUMPTION: HBM contract price momentum per period
        priceCeiling: 260
      },

      /* --- Long-run investment projects (capacity is NEVER instant) --- */
      projects: [
        {
          id: 'fab', name: 'New conventional DRAM fab',
          cost: 150, delay: 3, effect: 'capacity',
          capacityGain: 35,
          blurb: 'Adds conventional DRAM market capacity — but a fab is a construction project, and it must be qualified before it ships.',
          tradeOff: 'Largest capital outlay, longest delay, and the highest risk of excess capacity if conventional demand falls.'
        },
        {
          id: 'yield', name: 'Process / yield improvement',
          cost: 80, delay: 2, effect: 'yield',
          yieldGain: 0.12,
          blurb: 'Improves yields and process efficiency on existing tools, lifting conventional output from the same tokens.',
          tradeOff: 'Cheaper and quicker than a fab, but it cannot lift the total capacity ceiling; it only raises output per token.'
        },
        {
          id: 'hbmcap', name: 'HBM capacity & tooling',
          cost: 130, delay: 3, effect: 'hbmCost',
          tokenCostReduction: 0.12,
          blurb: 'Dedicated HBM tooling lowers the shared tokens needed per HBM unit, easing the tension between the two products.',
          tradeOff: 'Relieves the allocation squeeze but adds capital commitments into the same HBM segment that is already prioritised.'
        },
        {
          id: 'pack', name: 'Advanced packaging expansion',
          cost: 95, delay: 2, effect: 'hbmYield',
          yieldGain: 0.15,
          blurb: 'Expands advanced stacking and packaging capacity, which is a distinct constraint from DRAM wafer capacity.',
          tradeOff: 'Improves HBM output per token but does nothing for conventional DRAM supply — the actual bottleneck in this scenario.'
        }
      ],

      /* --- Policy instruments adopted after the Policy Office stage --- */
      policy: {
        A: {
          id: 'A', name: 'Targeted conventional DRAM producer incentive',
          capacityPerPeriod: 8, capacityCap: 24, creditCostPerPeriod: 40,
          note: 'A milestone-conditioned per-unit credit for ADDITIONAL conventional output from verified new or expanded capacity.'
        },
        B: {
          id: 'B', name: 'Targeted PC consumer voucher',
          demandInterceptBoost: 2, dramDemandBoost: 3, creditCostPerPeriod: 30,
          note: 'A small, time-limited voucher for eligible students and lower-income households with a verified need.'
        }
      },

      /* --- Scoring weights (five competing objectives) --- */
      scoreWeights: { supply: 1, finance: 1, resilience: 1, hbm: 1, fiscal: 1 }
    },

    /* ---------------------------------------------------------------
       2. GRAPH MODEL PARAMETERS (index-based conceptual diagrams)
       All curves use inverse forms:
         Demand : P = a_d - b_d * Q
         Supply : P = a_s + b_s * Q
       Equilibrium: Q* = (a_d - a_s) / (b_d + b_s);  P* = a_d - b_d * Q*
       --------------------------------------------------------------- */
    GRAPH_MODEL: {
      dram: {
        demand:  { a: 140, b: 0.8 },   // ASSUMPTION: P = 140 - 0.8Q
        supply1: { a: 20,  b: 0.4 },   // ASSUMPTION: short-run supply S1
        supply2: { a: 50,  b: 0.4 },   // ASSUMPTION: constrained supply S2 (shifted left/up)
        supplyLong: { a: 20, b: 0.15 },// ASSUMPTION: flatter long-run supply
        subsidy: 8                     // ASSUMPTION: illustrative credit per eligible unit
      },
      pc: {
        demand:  { a: 150, b: 0.5 },   // ASSUMPTION: aggregate PC demand, P = 150 - 0.5Q
        /* Segment demand curves for Graph 4, drawn in INVERSE form
           P = a - bQ, where a SMALLER b is the FLATTER and therefore the
           MORE price-elastic curve. These intercepts are chosen so both
           curves cross at the common comparison point (P = 100, Q = 100);
           the slopes — and hence the relative elasticity ordering — are
           the same as the live simulation parameters in CONFIG.SIM.pc.
           Illustrative teaching curves, not measured elasticities. */
        demandMainstream: { a: 130, b: 0.3 }, // ASSUMPTION: flatter curve = MORE price-elastic
        demandUrgent:    { a: 200, b: 1.0 }, // ASSUMPTION: steeper curve = LESS price-elastic
        supply1: { a: 60, b: 0.4 },   // ASSUMPTION: PC supply before DRAM cost increase
        supply2: { a: 75, b: 0.4 },   // ASSUMPTION: PC supply after DRAM input-cost increase
        voucher: 15                   // ASSUMPTION: illustrative voucher value
      },
      ppc: {
        maxConv: 130,   // ASSUMPTION: conventional output index at full allocation
        maxHbm: 53.3,   // ASSUMPTION: HBM output index at full allocation
        outerGain: 0.22 // ASSUMPTION: outward shift from additional capacity / technology
      },
      evidence: {
        gartner: { q3_2025: 71.301, q3_2026: 55.351, change: -22.4 }
      }
    },

    /* ---------------------------------------------------------------
       3. PERIOD LABELS
       --------------------------------------------------------------- */
    PERIODS: [
      'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027',
      'Q3 2027', 'Q4 2027', 'Q1 2028', 'Q2 2028'
    ]
  };

  /* ---------------------------------------------------------------
     4. VERIFIED EVIDENCE BANK  (real sources; dates as published)
     --------------------------------------------------------------- */
  DRAM.SOURCES = [
    {
      id: 'micron',
      org: 'Micron Technology, Inc.',
      date: 'September 3, 2026',
      title: 'Annual Report on Form 10-K for the fiscal year ended September 3, 2026',
      url: 'https://www.sec.gov/Archives/edgar/data/723125/000072312526000023/mu-20260903.htm',
      kind: 'actual',
      kindLabel: 'Reported outcome (company projections disclosed in filing)',
      findings: [
        'HBM requires more wafers and more cleanroom space to produce the same number of bits as conventional DRAM on the same technology node.',
        'Demand changes can create supply-allocation decisions, and the company may be unable to increase supply sufficiently to meet demand.',
        'First Idaho fab: first DRAM wafer output projected for mid-2027. Second Idaho fab: initial wafer output expected by late 2028. First New York fab: initial wafer output expected in 2030.'
      ],
      limitation: 'The fab dates are company projections, not guaranteed completion dates. HBM and conventional DRAM are distinct products with different manufacturing and packaging requirements, and the filing does not establish that every HBM wafer directly displaces a conventional DRAM wafer.',
      relevance: 'Primary company evidence for resource intensity and for the long construction and qualification lead times that make conventional DRAM supply slow to respond — the core of the scarcity diagnosis and the reason a capacity-side policy is the recommended response.'
    },
    {
      id: 'trendforce-sep7',
      org: 'TrendForce',
      date: 'September 7, 2026',
      title: 'DRAM Industry Revenue Rises 59.5% QoQ in 2Q26 as Supply Expansion Continues to Lag Demand Growth, Says TrendForce',
      url: 'https://www.trendforce.com/presscenter/news/20260907-13219.html',
      kind: 'forecast',
      kindLabel: 'Forecast (price projection) + reported industry observations',
      findings: [
        'Supplier inventories were reported at historic lows.',
        'Additional supply was mainly allocated to server use.',
        'DRAM bit shipments grew only modestly.',
        'Conventional DRAM contract prices were projected to rise 13–18% quarter-on-quarter in Q3 2026.'
      ],
      limitation: 'A forecast is not an observed result. Revenue growth of 59.5% QoQ reflects price and mix, not a matching increase in physical output; inventory "historic lows" is a qualitative characterisation.',
      relevance: 'Evidence for the conventional DRAM market: low inventories plus server-biased allocation explain why a shortage persists and why conventional contract prices keep rising.'
    },
    {
      id: 'trendforce-sep30',
      org: 'TrendForce',
      date: 'September 30, 2026',
      title: 'AI Server Demand Sustains Memory Contract Price Increases in 4Q26, While Consumer-Side Pressure Persists',
      url: 'https://www.trendforce.com/presscenter/news/20260930-13258.html',
      kind: 'forecast',
      kindLabel: 'Forecast (price projection)',
      findings: [
        'Conventional DRAM contract prices were projected to grow 10–15% quarter-on-quarter in Q4 2026.',
        'Continued undersupply was attributed to suppliers prioritising advanced-process capacity for high-performance server products.'
      ],
      limitation: 'This is a forecast for Q4 2026, not confirmed final data. It describes the conventional DRAM market and should not be read as a measure of consumer PC demand.',
      relevance: 'Supports the claim that the shortage persists into the next period and that the cause is allocation priority — the opportunity-cost decision shown on the PPC.'
    },
    {
      id: 'counterpoint',
      org: 'Counterpoint Research',
      date: 'September 2, 2026',
      title: 'Global DRAM and HBM Market Share: Quarterly',
      url: 'https://counterpointresearch.com/cn/insights/global-dram-and-hbm-market-share',
      kind: 'actual',
      kindLabel: 'Reported estimate',
      findings: [
        'Q2 2026 global DRAM revenue shares: Samsung 38%, SK hynix 25%, Micron 24%.',
        'The three largest suppliers combined hold approximately 87% of the global DRAM market.'
      ],
      limitation: 'These are revenue market shares, not physical unit-output shares, and they cover the overall DRAM market rather than conventional DDR4/DDR5 exclusively. Concentration supports discussion of oligopoly; it does not prove collusion, price-fixing or deliberate restriction of supply.',
      relevance: 'Establishes the concentrated supplier structure behind the Market 1 supply curve and justifies the emphasis on long-run capacity and resilience policy.'
    },
    {
      id: 'gartner',
      org: 'Gartner, Inc.',
      date: 'October 12, 2026',
      title: 'Gartner Says Worldwide PC Shipments Declined 22.4% in Third Quarter of 2026 As Component Cost Inflation Raised ASPs',
      url: 'https://www.gartner.com/en/newsroom/press-releases/2026-10-12-gartner-says-worldwide-pc-shipments-declined-22-point-4-percent-in-third-quarter-of-2026-as-component-cost-inflation-raised-asps',
      kind: 'prelim',
      kindLabel: 'Preliminary channel estimate',
      findings: [
        'Preliminary worldwide Q3 2026 PC shipments: approximately 55.4 million units (55.351 million).',
        'Q3 2025 comparison: approximately 71.3 million units (71.301 million).',
        'Year-on-year change: down 22.4%.',
        'Gartner links the decline to higher component costs, including memory and storage, higher PC prices, scarce-component allocation, product-mix shifts and limited replacement demand.'
      ],
      limitation: 'Shipments are not the same as final retail purchases or quantity demanded. The year-on-year change cannot be attributed to DRAM alone, and it is not a numerical PED calculation.',
      relevance: 'Market 2 evidence: quantifies the downstream consequence of DRAM cost inflation and supports the segmented demand analysis (urgent buyers versus buyers who can delay).'
    },
    {
      id: 'omdia',
      org: 'Omdia',
      date: 'October 9, 2026',
      title: 'Global PC shipments fall 21% in 3Q26 as pull-forward demand subsides',
      url: 'https://omdia.tech.informa.com/pr/2026/oct/global-pc-shipments-fall-21percent-in-3q26-as-pull-forward-demand-subsides',
      kind: 'actual',
      kindLabel: 'Reported estimate',
      findings: [
        'Omdia estimated 58.1 million worldwide desktop, notebook and workstation shipments in Q3 2026, down 21.2% year-on-year.',
        'First-half pull-forward purchasing ahead of anticipated price increases helped explain the Q3 decline.',
        'Omdia reports that the COMBINED DRAM and SSD cost share in PCs has risen sharply from a typical level of around 15% to nearly 40%, with price increases more than fourfold (Ben Yeh, Principal Analyst, Omdia, October 9, 2026). This is a combined figure for DRAM and SSDs, not a DRAM-only figure.',
        'Omdia notes that vendors and their ODM partners began scaling back production in 3Q26 while channel partners continued working through elevated inventory levels.'
      ],
      limitation: 'Omdia and Gartner use different coverage and definitions, so their totals must not be combined into a single chart. Pull-forward demand shows that shipment movements have causes other than price.',
      relevance: 'Independent corroboration of the PC market contraction, and a caution against reading any single quarter as a clean elasticity measurement.'
    },
    {
      id: 'gao',
      org: 'U.S. Government Accountability Office',
      date: 'August 6, 2026',
      title: 'Semiconductors: Commerce Needs Plan to Meet CHIPS for America R&D Requirements (GAO-26-109121)',
      url: 'https://www.gao.gov/products/gao-26-109121',
      kind: 'actual',
      kindLabel: 'Reported audit finding',
      findings: [
        'As of April 2026, awardees had completed all required milestones by their due dates, but some milestones had fallen behind anticipated schedules.',
        'Commerce had disbursed $13.1 billion to awardees — approximately 42 percent of direct funding. (The Highlights page cites $31.5 billion in direct funding; the detailed report body cites $31.2 billion, so this project quotes only the disbursed amount and the approximate share.)',
        'As of July 15, 2026, Commerce had funded 49 projects across 24 companies, having awarded nine new projects since July 2025.',
        'The report recommends that Commerce plan how to meet its statutory advanced-microelectronics R&D requirements.'
      ],
      limitation: 'The Highlights and the detailed report body state slightly different direct-funding totals, so this project deliberately does not repeat a denominator. The report concerns R&D programmes and award administration, not the DRAM market itself, and it does not indicate that awardees missed contractual deadlines.',
      relevance: 'Evaluates implementation, expenditure and oversight of large semiconductor incentive programmes. It supports staged, milestone-conditioned, transparently reported support, and shows that some milestones slip behind anticipated schedules — the administrative risk any new programme would also face.'
    }
  ];

  /* ---------------------------------------------------------------
     5. THE SEVEN CLAIMS
     --------------------------------------------------------------- */
  DRAM.CLAIMS = [
    { n: 1, title: 'Scarcity claim', text: 'Conventional DRAM is scarce and the shortage is not clearing quickly, because supply is capacity-constrained and slow to respond — not because prices are "wrong".', sources: ['micron', 'trendforce-sep7'], graph: 'Graph 1 & 2', question: 'Overarching' },
    { n: 2, title: 'DRAM market relevance claim', text: 'The conventional DRAM market is upstream of the products consumers buy; its contract prices feed directly into device costs.', sources: ['micron', 'trendforce-sep30'], graph: 'Graph 1 & 2', question: 'Market 1' },
    { n: 3, title: 'PC market relevance claim', text: 'Higher DRAM costs raise PC prices and reduce PC shipments, with several causes besides DRAM alone.', sources: ['gartner', 'omdia'], graph: 'Graph 4', question: 'Market 2' },
    { n: 4, title: 'DRAM supply and elasticity claim', text: 'Short-run PES is relatively inelastic; long-run PES is relatively more elastic, so the shortage persists in the short run and can be eased only with time.', sources: ['micron', 'trendforce-sep7'], graph: 'Graph 2', question: 'Market 1' },
    { n: 5, title: 'PC input-cost and PED claim', text: 'A DRAM cost increase shifts PC supply left/up, and the quantity demanded falls by different amounts for different buyers.', sources: ['gartner', 'omdia'], graph: 'Graph 4', question: 'Market 2' },
    { n: 6, title: 'DRAM intervention claim', text: 'A targeted, milestone-conditioned producer incentive addresses the binding constraint, but short-run inelasticity means producers capture much of the benefit, and fiscal and excess-capacity risks are real.', sources: ['micron', 'gao'], graph: 'Graph 3', question: 'Market 1' },
    { n: 7, title: 'PC intervention claim', text: 'A targeted PC voucher improves access for eligible households but raises derived demand for DRAM and can intensify the upstream shortage while supply is constrained.', sources: ['gartner', 'omdia'], graph: 'Graph 5', question: 'Market 2' }
  ];

  /* ---------------------------------------------------------------
     6. GLOSSARY (25 terms)
     --------------------------------------------------------------- */
  DRAM.GLOSSARY = [
    ['Scarcity', 'The fundamental economic problem: resources are finite while wants are effectively unlimited. In this scenario it comes from finite cleanroom capacity, specialised labour, capital and time.'],
    ['Shortage', 'A market outcome in which quantity demanded exceeds quantity supplied at the prevailing price. Unlike scarcity, a shortage can be resolved by a price adjustment that reduces demand and increases supply.'],
    ['Opportunity cost', 'The value of the best alternative forgone. Allocating scarce tokens to HBM means giving up some conventional DRAM output — and the reverse.'],
    ['Trade-off', 'The choice between two desirable but incompatible options, such as AI/server performance versus consumer-electronics affordability.'],
    ['PPC (Production Possibilities Curve)', 'A diagram showing the maximum attainable combinations of two outputs given resources and technology. Points on the curve are productively efficient, points inside are inefficient, points outside are unattainable.'],
    ['Factors of production', 'Land (sites, silicon, water, electricity), labour (engineers, technicians, operators), capital (fabs, cleanrooms, tools) and entrepreneurship (investment and product-strategy decisions). Constrained factors cap output.'],
    ['Absolute advantage', 'Producing more of a good with the same resources. In the hypothetical teaching example, Factory A has an absolute advantage in both DRAM and HBM.'],
    ['Comparative advantage', 'The lowest opportunity cost of producing a good. Specialising according to comparative advantage and trading raises combined output.'],
    ['Market system', 'Allocation by prices, costs and expected returns. Global DRAM production is primarily market-based, with government influencing investment through policy and incentives.'],
    ['Central planning', 'Allocation by a central authority. It can coordinate long-horizon investment, but faces information, coordination and incentive difficulties — and no system dominates in every circumstance.'],
    ['Supply', 'The quantity sellers offer at each price. Conventional DRAM supply is limited by wafer capacity, cleanroom space, yields, capital, skilled labour and allocation priorities.'],
    ['Demand', 'The quantity buyers wish to buy at each price. Conventional DRAM demand is derived from demand for PCs, servers and other devices.'],
    ['Equilibrium', 'The price and quantity at which quantity demanded equals quantity supplied, so there is no tendency for the price to change.'],
    ['Disequilibrium', 'A situation where quantity demanded does not equal quantity supplied at the prevailing price — a shortage (Qd > Qs) or a surplus (Qs > Qd) — which creates pressure for the price to change.'],
    ['Consumer surplus', 'The difference between what buyers pay and what they would be willing to pay. Higher DRAM and PC prices with lower quantities reduce consumer surplus, all else equal.'],
    ['Producer surplus', 'The difference between what sellers receive and their marginal cost. Its direction after a price rise is ambiguous: higher prices may be offset by lower sales volumes, higher costs and a changed product mix.'],
    ['PES (Price Elasticity of Supply)', 'PES = % change in quantity supplied / % change in price. Relatively inelastic in the short run for DRAM because installed capacity cannot change quickly; relatively more elastic in the long run as capacity, yields and processes adjust.'],
    ['PED (Price Elasticity of Demand)', 'PED = % change in quantity demanded / % change in price. PC demand differs by buyer: those who can delay, upgrade later or buy used are more responsive than those with urgent needs.'],
    ['Derived demand', 'Demand for an input that arises from demand for the finished good. PC demand creates derived demand for DRAM, so a PC voucher can add pressure to the memory market.'],
    ['Oligopoly', 'A market dominated by a few large firms. The top three DRAM suppliers hold roughly 87% of global DRAM revenue; concentration does not by itself prove collusion.'],
    ['Subsidy', 'A payment to producers (per unit or as a tax credit) or to consumers (a voucher) that lowers the price paid or received relative to the market price.'],
    ['Incidence', 'Who actually bears the burden of a tax or subsidy. With relatively inelastic short-run supply, producers capture much of a per-unit producer subsidy; with a consumer voucher, producers may capture part through higher prices.'],
    ['Deadweight loss', 'The loss of total surplus caused by a policy that distorts the market — for example, subsidising output beyond its social value, or support that keeps inefficient capacity alive.'],
    ['Externality', 'A cost or benefit falling on third parties. Supply-chain resilience and digital access for education are candidate positive externalities that must be real and large enough to justify public spending.'],
    ['Marginal cost / marginal benefit', 'The cost of one more unit and the benefit of one more unit. Firms invest when expected marginal benefit exceeds marginal cost; government should support a programme only when expected marginal social benefit exceeds marginal social cost.']
  ];

  /* ---------------------------------------------------------------
     7. KNOWLEDGE CHECK (8 reasoning questions)
     --------------------------------------------------------------- */
  DRAM.QUIZ = [
    {
      q: 'The conventional DRAM price index rises sharply in Q3 2026 while total DRAM bit shipments grew only modestly. Which statement best explains this?',
      options: [
        'Bit shipments fell, so the price increase is a pure demand story.',
        'Revenue growth of 59.5% QoQ mostly reflected price and product mix rather than a matching increase in physical output — supply was still constrained.',
        'The price rise proves suppliers colluded to restrict output.',
        'Quantity supplied is always perfectly inelastic, so price can do all the adjusting.'
      ],
      correct: 1,
      explanation: 'Revenue = price x quantity. If revenue grew far faster than bit shipments, the extra revenue came mostly from price and mix. That is the signature of a supply-constrained market: quantity barely moves, price moves a lot. It also rules out a demand-only story, and concentration alone does not establish collusion.'
    },
    {
      q: 'Your plant can either produce 100 units of conventional DRAM or 40 units of HBM from the same shared tokens. Which concept does the decision to give up the 100 conventional units illustrate?',
      options: [
        'Absolute advantage',
        'Consumer surplus',
        'Opportunity cost',
        'Comparative advantage'
      ],
      correct: 2,
      explanation: 'The 100 conventional units are the best alternative forgone when you choose HBM — that is the opportunity cost of the decision, and it is the reason the production possibilities frontier is bowed outward. Comparative advantage (D) is about which good each party should specialise in after comparing opportunity costs across producers; absolute advantage (A) is about producing more with the same resources.'
    },
    {
      q: 'A new DRAM fab breaks ground today. Micron projects first wafer output from its first Idaho fab in mid-2027 and its second in late 2028. Why does this matter for short-run supply elasticity?',
      options: [
        'Because fabs can be re-tooled quickly if prices fall.',
        'Because installed capacity, qualified processes and trained crews cannot be created quickly, so short-run quantity supplied responds only slightly to price.',
        'Because long-run supply is more inelastic than short-run supply.',
        'Because wafer starts are entirely independent of price.'
      ],
      correct: 1,
      explanation: 'Short-run supply is bounded by the capacity already installed and qualified. A capacity decision made today only produces output years later, so short-run PES is relatively inelastic: demand or allocation shocks move price a long way and quantity only a little. In the long run, firms can expand capacity, improve yields and migrate processes, so the long-run supply curve is flatter.'
    },
    {
      q: 'DDR5 contract prices rise. Which is the correct immediate effect on the PC market, all else equal?',
      options: [
        'PC supply shifts right, because a costlier input raises the value of a PC.',
        'PC demand shifts right, because more expensive memory signals better quality.',
        'PC supply shifts left/up, raising PC prices and reducing the quantity of PCs sold.',
        'Nothing changes, because DRAM is a small share of PC cost.'
      ],
      correct: 2,
      explanation: 'DRAM is an input into PCs. A higher input price raises marginal cost, so the law of supply shifts PC supply leftward/upward: PC prices rise and the quantity demanded falls. Choice (A) confuses cost with value; (B) invents a demand shift; (D) is false — DRAM is one of the largest BOM components, which is why Gartner linked the 2026 shipment decline partly to component cost inflation.'
    },
    {
      q: 'In the hypothetical teaching example, Factory A can make 10 conventional batches or 5 HBM batches, and Factory B can make 6 or 2. Which factory has the comparative advantage in conventional DRAM?',
      options: [
        'Factory A, because it has an absolute advantage in both goods.',
        'Factory B, because its opportunity cost of one conventional batch is 1/3 of an HBM batch versus 1/2 for Factory A.',
        'Factory A, because it produces more HBM batches.',
        'Neither, because the example contains no scarcity.'
      ],
      correct: 1,
      explanation: 'Factory A has the absolute advantage in both goods, but comparative advantage depends on opportunity cost. Factory A: 1 conventional batch costs 5/10 = 1/2 HBM batch. Factory B: 1 conventional batch costs 2/6 = 1/3 HBM batch. Factory B has the lower opportunity cost in conventional DRAM, so Factory B has the comparative advantage there while Factory A has it in HBM. This fictional example teaches the calculation; it is not supplier productivity data.'
    },
    {
      q: 'A per-unit producer subsidy of 8 index points is paid to DRAM makers on additional output from new capacity. With inelastic short-run supply, what is the most likely outcome?',
      options: [
        'Buyers pay 8 points less and producers receive exactly the original price.',
        'Producers capture a large share of the subsidy; buyers pay less than the original price, and the quantity increase is modest.',
        'The market price is unchanged because a subsidy cannot move a supply curve.',
        'The quantity increase is large, because subsidies always make supply perfectly elastic.'
      ],
      correct: 1,
      explanation: 'A subsidy creates a wedge: the buyer price falls while the producer-received price rises by the subsidy amount. With a steep supply curve, most of the wedge is captured by producers, so the extra output is modest and the fiscal cost per incremental bit is high. Over time, if capacity actually responds, the supply curve flattens, quantity rises more and pass-through to buyers improves.'
    },
    {
      q: 'Why might a broad PC purchase subsidy make the memory shortage worse?',
      options: [
        'Because subsidies always increase the price of every input.',
        'Because the money used for the subsidy comes out of DRAM producers\' budgets.',
        'Because PCs are a complement to DRAM: boosting PC demand creates derived demand for memory, while upstream supply stays constrained.',
        'Because a PC subsidy reduces the price of DRAM.'
      ],
      correct: 2,
      explanation: 'DRAM demand is derived from device demand. A voucher raises the number of PCs people want, which raises demand for the DRAM inside them, while the binding constraint — wafer and cleanroom capacity — cannot respond quickly. The subsidy therefore competes for the same scarce bits and can push DRAM prices higher, hurting exactly the buyers it was meant to help.'
    },
    {
      q: 'A government wants to support new DRAM capacity. Why is a milestone-conditioned grant or tax credit safer than paying a bonus on every unit produced?',
      options: [
        'Because bonuses on every unit create no fiscal cost.',
        'Because milestones link payments to construction, qualification and genuinely additional output, reducing the risk of paying for output that would have happened anyway and of excess capacity.',
        'Because milestone conditions remove the time lag before capacity is productive.',
        'Because tax credits guarantee that no project ever fails.'
      ],
      correct: 1,
      explanation: 'An unconditional per-unit bonus can pay for output that was already planned, subsidise the incumbent producer\'s normal business, and — if demand falls — keep uneconomic capacity alive, creating deadweight loss. Staged milestone payments, transparent reporting, clawbacks and a sunset clause align the public money with additional, verified output. They do not remove the construction and qualification lag: the delay is physical, not administrative.'
    }
  ];

  /* ---------------------------------------------------------------
     8. WORKSTATIONS (map metadata + teaching purpose)
     --------------------------------------------------------------- */
  DRAM.STATIONS = [
    { id: 'allocation', name: 'Production Allocation Console', short: 'Allocation Console', tileX: 1, tileY: 1, w: 4, h: 3, color: '#3fa7d6',
      purpose: 'Split a finite pool of shared production resources between conventional DRAM and HBM.' },
    { id: 'production', name: 'Production Floor', short: 'Production Floor', tileX: 9, tileY: 4, w: 4, h: 4, color: '#f0a63c',
      purpose: 'Run a production cycle and see inventory, orders, prices and shortages respond.' },
    { id: 'market', name: 'Market Exchange', short: 'Market Exchange', tileX: 19, tileY: 1, w: 4, h: 3, color: '#9ad46f',
      purpose: 'Inspect both markets: prices, quantities, shortage, and consumer and producer surplus.' },
    { id: 'rnd', name: 'R&D and Capacity Expansion', short: 'R&D Lab', tileX: 1, tileY: 10, w: 4, h: 3, color: '#c89bf0',
      purpose: 'Commit capital to capacity, yields, HBM tooling or packaging — with realistic delays.' },
    { id: 'policy', name: 'Policy Office', short: 'Policy Office', tileX: 19, tileY: 10, w: 4, h: 3, color: '#f28ca6',
      purpose: 'Compare the two interventions and make a recommendation.' },
    { id: 'archive', name: 'Research Archive', short: 'Research Archive', tileX: 16, tileY: 5, w: 3, h: 3, color: '#8fb6d6',
      purpose: 'The full Policy Brief, evidence cards, definitions and the knowledge check.' }
  ];

})();
