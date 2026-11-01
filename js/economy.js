/* ============================================================
   DRAM Factory Tycoon — economy.js
   The economic simulation engine.
   ------------------------------------------------------------
   INTEGRITY NOTE: every coefficient below is a FICTIONAL
   ILLUSTRATIVE PARAMETER for teaching (see data.js CONFIG).
   No value here is an observed DRAM industry statistic and no
   value is a measured price-elasticity coefficient.
   ============================================================ */
(function () {
  'use strict';

  var DRAM = window.DRAM;
  var CFG = DRAM.CONFIG.SIM;
  var PERIODS = DRAM.CONFIG.PERIODS;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function num(v, fallback) {
    return (typeof v === 'number' && isFinite(v)) ? v : fallback;
  }

  /* ---------------------------------------------------------------
     OUTPUT FUNCTIONS — shared tokens -> product output index
     convUnits(a): diminishing returns as the plant is pushed toward
     one product (models the complexity of running a split plant).
     This is what bends the PPC outward.
     --------------------------------------------------------------- */
  function convUnits(tokens, state) {
    tokens = clamp(num(tokens, 0), 0, CFG.totalTokens);
    var eff = 1 + (state.yieldBoost || 0);
    return CFG.convPerToken * tokens * (1 - CFG.convDiminish * tokens / CFG.totalTokens) * eff;
  }

  function hbmUnits(tokens, state) {
    tokens = clamp(num(tokens, 0), 0, CFG.totalTokens);
    var cost = Math.max(0.2, state.hbmTokenCost || CFG.hbmTokenCost);
    return (tokens / cost) * (1 - CFG.hbmDiminish * tokens / CFG.totalTokens) * (1 + (state.hbmYieldBoost || 0));
  }

  /* Marginal opportunity cost of shifting one token from conventional
     to HBM (fictional, computed from the same functions the PPC uses). */
  function opportunityCost(state, convTokens) {
    var a = clamp(convTokens, 0, CFG.totalTokens);
    var d = 1;
    var before = { c: convUnits(a, state), h: hbmUnits(CFG.totalTokens - a, state) };
    var after = { c: convUnits(a - d, state), h: hbmUnits(CFG.totalTokens - (a - d), state) };
    return {
      convLost: before.c - after.c,
      hbmGained: after.h - before.h
    };
  }

  /* PPC frontier points (frontier = 100% utilisation). */
  function ppcFrontier(state, steps) {
    steps = steps || 40;
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var a = CFG.totalTokens * i / steps;
      pts.push({ alloc: a, conv: convUnits(a, state), hbm: hbmUnits(CFG.totalTokens - a, state) });
    }
    return pts;
  }

  /* ---------------------------------------------------------------
     STATE
     --------------------------------------------------------------- */
  function createState() {
    return {
      started: false,
      period: 1,                     // 1-based index into PERIODS
      credits: CFG.startCredits,
      allocConv: 60,                 // shared tokens to conventional DRAM
      utilization: 100,              // % of allocated tokens actually run
      yieldBoost: 0,                 // from process-improvement projects
      hbmYieldBoost: 0,              // from packaging projects
      hbmTokenCost: CFG.hbmTokenCost,
      capacityBonus: 0,              // market capacity added by projects + policy A
      projects: [],
      policy: null,                  // 'A' | 'B' | 'both'
      policyPeriod: null,
      policyNote: '',
      prices: { dram: CFG.dram.basePrice, pc: CFG.pc.basePrice, hbm: CFG.hbm.priceBase },
      market: {
        dram: { qDemand: 0, qSupply: 0, price: CFG.dram.basePrice, shortage: 0, surplus: 0, capacity: 0, targetPrice: 0 },
        pc: { qDemand: 0, qSupply: 0, price: CFG.pc.basePrice, mainstream: 0, urgent: 0, deferred: 0, shipments: 0, targetPrice: 0 },
        hbm: { qDemand: 0, qSupply: 0, price: CFG.hbm.priceBase, shortfall: 0 }
      },
      lastConvOutput: 0,
      lastHbmOutput: 0,
      history: [],
      totals: {
        revenue: 0, costs: 0, shortageSum: 0, cycles: 0,
        hbmSold: 0, hbmDemand: 0, convSold: 0, convProduced: 0,
        unsold: 0, deficit: false, pcFillSum: 0, pcDemandSum: 0,
        creditsSpentOnInvestment: 0, fiscalCost: 0
      },
      stages: { allocation: false, cycle: false, market: false, invest: false, policy: false },
      visited: { brief: false, graphs: false, evidence: false, glossary: false, quiz: false, archive: false },
      finalScore: null,
      completed: false
    };
  }

  /* Initialise the first period's market values so the UI has numbers
     before the player runs the first production cycle. The plant's
     current plan is treated as the output already on the books, so the
     opening shortage reflects the allocation the player is looking at. */
  function initMarkets(state) {
    var a = effectiveAllocations(state);
    state.lastConvOutput = convUnits(a.convTokens, state);
    state.lastHbmOutput = hbmUnits(a.hbmTokens, state);
    updateHbmMarket(state);
    updateDramMarket(state);
    updatePcMarket(state);
    /* Re-run the DRAM market now that PC demand is known: the demand
       intercept for DRAM depends on the quantity of PCs demanded. */
    updateDramMarket(state);
    updatePcMarket(state);
    return state;
  }

  /* ---------------------------------------------------------------
     MARKET 1 — CONVENTIONAL DRAM
     Demand:  P = a_d - b_d Q   (a_d shifts with PC demand)
     Supply:  P = a_s + b_s Q   (short run: relatively inelastic)
     Capacity ceiling: available conventional capacity (industry base
     + this plant's contribution + invested capacity).
     --------------------------------------------------------------- */
  function dramDemandIntercept(state) {
    return CFG.dram.demandInterceptBase
      + CFG.dram.pcDemandLink * state.market.pc.qDemand
      + (state.policy ? (state.policy === 'B' ? CFG.policy.B.dramDemandBoost : 0) : 0)
      + (state.policy === 'both' ? CFG.policy.B.dramDemandBoost : 0);
  }

  function dramCapacity(state) {
    return CFG.dram.baseIndustryCapacity
      + CFG.dram.capacityPerConvUnit * state.lastConvOutput
      + state.capacityBonus;
  }

  function updateDramMarket(state) {
    var D = CFG.dram;
    var AD = dramDemandIntercept(state);
    var AS = D.supplyIntercept, BS = D.supplySlope, BD = D.demandSlope;
    var cap = dramCapacity(state);
    var P = state.prices.dram;

    var qDemand = Math.max(0, (AD - P) / BD);
    var qSupplyCurve = Math.max(0, (P - AS) / BS);
    var qSupply = Math.min(qSupplyCurve, cap);

    var shortage = Math.max(0, qDemand - qSupply);
    var surplus = Math.max(0, qSupply - qDemand);

    // Target price: capacity-constrained case clears where demand = capacity.
    var qStar = (AD - AS) / (BD + BS);
    var pStar = AD - BD * qStar;
    var binding = cap < qStar;
    var target = binding ? (AD - BD * cap) : pStar;
    target = clamp(target, D.priceFloor, D.priceCeiling);

    var newP = clamp(P + D.priceAdjustSpeed * (target - P), D.priceFloor, D.priceCeiling);

    state.market.dram = {
      qDemand: qDemand, qSupply: qSupply, price: newP,
      shortage: shortage, surplus: surplus, capacity: cap,
      targetPrice: target, qStar: qStar, binding: binding,
      qDemandAtTarget: Math.max(0, (AD - target) / BD)
    };
    state.prices.dram = newP;
    return state.market.dram;
  }

  /* ---------------------------------------------------------------
     MARKET 2 — PCs AND LAPTOPS
     Two demand segments (mainstream vs urgent) + supply that shifts
     with DRAM input cost and with DRAM availability.
     --------------------------------------------------------------- */
  function pcDemandAt(state, P) {
    var C = CFG.pc;
    var boost = 0;
    if (state.policy === 'B' || state.policy === 'both') boost = CFG.policy.B.demandInterceptBoost;
    var qm = Math.max(0, (C.mainstreamIntercept + boost - P) / C.mainstreamSlope);
    var qu = Math.max(0, (C.urgentIntercept + boost - P) / C.urgentSlope);
    return { mainstream: qm, urgent: qu, total: qm + qu };
  }

  function pcSupplyIntercept(state) {
    var C = CFG.pc;
    return C.supplyInterceptBase
      + C.inputCostLink * (state.prices.dram - C.basePrice)
      + C.shortageSupplyLink * state.market.dram.shortage;
  }

  function pcCapacity(state) {
    return Math.max(0, CFG.pc.capacityBase - CFG.pc.capacityShortageLink * state.market.dram.shortage);
  }

  function pcSupplyAt(state, P) {
    var as = pcSupplyIntercept(state);
    var bs = CFG.pc.supplySlope;
    return Math.min(Math.max(0, (P - as) / bs), pcCapacity(state));
  }

  function updatePcMarket(state) {
    var C = CFG.pc;
    var P = state.prices.pc;
    var lo = C.priceFloor, hi = C.priceCeiling, i, mid;
    for (i = 0; i < 80; i++) {
      mid = (lo + hi) / 2;
      if (pcDemandAt(state, mid).total > pcSupplyAt(state, mid)) lo = mid; else hi = mid;
    }
    var target = (lo + hi) / 2;
    var newP = clamp(P + C.priceAdjustSpeed * (target - P), C.priceFloor, C.priceCeiling);

    var dem = pcDemandAt(state, newP);
    var sup = pcSupplyAt(state, newP);
    var deferred = Math.min(dem.mainstream, Math.max(0, (newP - C.deferralThreshold)) * C.deferralRate * dem.mainstream);

    state.market.pc = {
      qDemand: dem.total, qSupply: sup, price: newP,
      mainstream: dem.mainstream, urgent: dem.urgent,
      deferred: deferred, shipments: sup, targetPrice: target
    };
    state.prices.pc = newP;
    return state.market.pc;
  }

  /* ---------------------------------------------------------------
     HBM / SERVER MEMORY SEGMENT (a distinct, related product market)
     --------------------------------------------------------------- */
  function updateHbmMarket(state) {
    var H = CFG.hbm;
    var idx = state.period - 1;
    var demand = H.demandBase * Math.pow(1 + H.demandGrowth, idx);
    var price = Math.min(H.priceCeiling, H.priceBase * Math.pow(1 + H.priceGrowth, idx));
    state.market.hbm = {
      qDemand: demand, qSupply: 0, price: price,
      shortfall: Math.max(0, demand - state.lastHbmOutput)
    };
    state.prices.hbm = price;
    return state.market.hbm;
  }

  /* ---------------------------------------------------------------
     PRODUCTION CYCLE
     --------------------------------------------------------------- */
  function effectiveAllocations(state) {
    var util = clamp(num(state.utilization, 100), 0, 100) / 100;
    var allocConv = clamp(num(state.allocConv, 0), 0, CFG.totalTokens);
    var allocHbm = Math.max(0, CFG.totalTokens - allocConv);
    return {
      convTokens: allocConv * util,
      hbmTokens: allocHbm * util,
      idleTokens: CFG.totalTokens - allocConv * util - allocHbm * util,
      allocConv: allocConv, allocHbm: allocHbm, util: util
    };
  }

  function runCycle(state) {
    if (state.completed) return null;
    if (state.period > CFG.maxPeriods) { state.completed = true; return null; }

    /* This period's HBM (server) demand and contract price. */
    updateHbmMarket(state);

    var a = effectiveAllocations(state);
    var convOut = convUnits(a.convTokens, state);
    var hbmOut = hbmUnits(a.hbmTokens, state);

    /* --- Sales: the plant can only sell what the market wants --- */
    var dramDem = Math.max(0, (dramDemandIntercept(state) - state.prices.dram) / CFG.dram.demandSlope);
    var convSold = Math.min(convOut, dramDem);
    var hbmSold = Math.min(hbmOut, state.market.hbm.qDemand);

    var revenue = convSold * state.prices.dram * CFG.convRevenueFactor
      + hbmSold * state.prices.hbm * CFG.hbmRevenueFactor;
    var operating = a.convTokens * CFG.operatingCostPerToken + a.hbmTokens * CFG.operatingCostPerToken;
    var costs = operating + CFG.overheadPerCycle;

    var unsold = Math.max(0, convOut - convSold);

    state.credits += revenue - costs;
    if (state.credits < 0) state.totals.deficit = true;

    /* --- Policy instruments (adopted from the Policy Office) --- */
    var fiscalThisPeriod = 0;
    if (state.policy === 'A' || state.policy === 'both') {
      var pA = CFG.policy.A;
      state.capacityBonus = Math.min(pA.capacityCap, state.capacityBonus + pA.capacityPerPeriod);
      fiscalThisPeriod += pA.creditCostPerPeriod;
    }
    if (state.policy === 'B' || state.policy === 'both') {
      fiscalThisPeriod += CFG.policy.B.creditCostPerPeriod;
    }
    state.credits -= fiscalThisPeriod;
    state.totals.fiscalCost += fiscalThisPeriod;
    if (state.credits < 0) state.totals.deficit = true;

    state.lastConvOutput = convOut;
    state.lastHbmOutput = hbmOut;
    state.market.hbm.qSupply = hbmSold;
    state.market.hbm.shortfall = Math.max(0, state.market.hbm.qDemand - hbmSold);

    /* --- Market update with the new capacity and prices --- */
    updateDramMarket(state);
    updatePcMarket(state);

    /* --- Record the period --- */
    var rec = {
      period: state.period,
      label: PERIODS[state.period - 1] || ('Period ' + state.period),
      allocConv: a.allocConv, allocHbm: a.allocHbm, util: a.util,
      idleTokens: a.idleTokens,
      convOutput: convOut, hbmOutput: hbmOut,
      convSold: convSold, hbmSold: hbmSold, unsold: unsold,
      priceDram: state.prices.dram, pricePc: state.prices.pc, priceHbm: state.prices.hbm,
      shortage: state.market.dram.shortage,
      surplus: state.market.dram.surplus,
      pcDemand: state.market.pc.qDemand, pcShipments: state.market.pc.shipments,
      pcDeferred: state.market.pc.deferred,
      hbmDemand: state.market.hbm.qDemand, hbmShortfall: state.market.hbm.shortfall,
      revenue: revenue, costs: costs + fiscalThisPeriod, fiscal: fiscalThisPeriod,
      credits: state.credits
    };
    state.history.push(rec);
    state.totals.revenue += revenue;
    state.totals.costs += costs + fiscalThisPeriod;
    state.totals.shortageSum += state.market.dram.shortage;
    state.totals.cycles += 1;
    state.totals.hbmSold += hbmSold;
    state.totals.hbmDemand += state.market.hbm.qDemand;
    state.totals.convSold += convSold;
    state.totals.convProduced += convOut;
    state.totals.unsold += unsold;
    state.totals.pcFillSum += state.market.pc.shipments;
    state.totals.pcDemandSum += state.market.pc.qDemand;

    state.stages.cycle = true;

    if (state.period >= CFG.maxPeriods) state.completed = true;
    else state.period += 1;

    return rec;
  }

  /* ---------------------------------------------------------------
     INVESTMENT — capacity never arrives instantly
     --------------------------------------------------------------- */
  function commitProject(state, projectId) {
    if (state.completed) return { ok: false, message: 'The scenario has ended.' };
    for (var i = 0; i < state.projects.length; i++) {
      if (state.projects[i].id === projectId && !state.projects[i].done) {
        return { ok: false, message: 'That project is already under way.' };
      }
    }
    var p = null;
    for (var j = 0; j < CFG.projects.length; j++) if (CFG.projects[j].id === projectId) p = CFG.projects[j];
    if (!p) return { ok: false, message: 'Unknown project.' };
    if (state.credits < p.cost) {
      return { ok: false, message: 'Not enough credits: this project costs ' + p.cost + ' credits and you have ' + Math.floor(state.credits) + '.' };
    }
    state.credits -= p.cost;
    state.totals.creditsSpentOnInvestment += p.cost;
    state.projects.push({
      id: p.id, name: p.name, cost: p.cost, delay: p.delay,
      startPeriod: state.period, completePeriod: state.period + p.delay, done: false
    });
    state.stages.invest = true;
    return { ok: true, message: 'Committed: ' + p.name + '. It becomes productive in ' + p.delay + ' periods (' + (PERIODS[state.period + p.delay - 1] || 'later') + ').' };
  }

  function checkProjects(state) {
    var completedNow = [];
    for (var i = 0; i < state.projects.length; i++) {
      var pr = state.projects[i];
      if (!pr.done && state.period >= pr.completePeriod) {
        pr.done = true;
        completedNow.push(pr);
        applyProjectEffect(state, pr.id);
      }
    }
    return completedNow;
  }

  function applyProjectEffect(state, id) {
    for (var i = 0; i < CFG.projects.length; i++) {
      var p = CFG.projects[i];
      if (p.id !== id) continue;
      if (p.effect === 'capacity') {
        state.capacityBonus += p.capacityGain;
      } else if (p.effect === 'yield') {
        state.yieldBoost = (state.yieldBoost || 0) + p.yieldGain;
      } else if (p.effect === 'hbmCost') {
        state.hbmTokenCost = Math.max(0.6, state.hbmTokenCost * (1 - p.tokenCostReduction));
      } else if (p.effect === 'hbmYield') {
        state.hbmYieldBoost = (state.hbmYieldBoost || 0) + p.yieldGain;
      }
    }
  }

  /* ---------------------------------------------------------------
     FINAL SCORING — five competing objectives, not just profit
     --------------------------------------------------------------- */
  function computeScore(state) {
    var T = state.totals;
    var cycles = Math.max(1, T.cycles);
    var avgShortage = T.shortageSum / cycles;
    var finalShortage = state.market.dram.shortage;
    var pcPriceUp = Math.max(0, state.prices.pc - CFG.pc.basePrice);
    var capacityProjects = state.projects.filter(function (p) { return p.done && (p.id === 'fab' || p.id === 'yield'); }).length;
    var allProjects = state.projects.filter(function (p) { return p.done; }).length;
    var hbmFill = T.hbmDemand > 0 ? (T.hbmSold / T.hbmDemand) : 1;
    var pcFill = T.pcDemandSum > 0 ? Math.min(1, T.pcFillSum / T.pcDemandSum) : 1;
    var unsoldShare = T.convProduced > 0 ? (T.unsold / T.convProduced) : 0;
    var committed = state.projects.length;
    var completed = state.projects.filter(function (p) { return p.done; }).length;

    var sSupply = 100 - 1.5 * avgShortage - 2.0 * finalShortage - 1.0 * pcPriceUp + 5 * Math.min(2, capacityProjects);

    var sFinance = 45 + (state.credits - CFG.startCredits) / 14;
    if (T.deficit) sFinance -= 20;
    if (unsoldShare > 0.25) sFinance -= 10;

    var sResilience = 25 + 18 * allProjects + 10 * Math.min(1, allProjects >= 2 ? 1 : 0)
      + 10 * (state.lastConvOutput > 0 && state.lastHbmOutput > 0 ? 1 : 0)
      + 5 * (capacityProjects > 0 ? 1 : 0);

    var sHbm = 100 * hbmFill;

    var sFiscal = 30;
    if (state.policy === 'A') sFiscal = 90;
    else if (state.policy === 'both') sFiscal = 78;
    else if (state.policy === 'B') sFiscal = 42;
    if (state.policy && state.visited.brief) sFiscal += 5;
    if (state.policy && state.visited.evidence) sFiscal += 5;
    if (state.policy === 'B' || state.policy === 'both') sFiscal -= 6; // derived-demand risk noted in debrief

    sSupply = clamp(Math.round(sSupply), 0, 100);
    sFinance = clamp(Math.round(sFinance), 0, 100);
    sResilience = clamp(Math.round(sResilience), 0, 100);
    sHbm = clamp(Math.round(sHbm), 0, 100);
    sFiscal = clamp(Math.round(sFiscal), 0, 100);

    var w = CFG.scoreWeights;
    var total = (sSupply * w.supply + sFinance * w.finance + sResilience * w.resilience
      + sHbm * w.hbm + sFiscal * w.fiscal)
      / (w.supply + w.finance + w.resilience + w.hbm + w.fiscal);
    total = Math.round(total);

    var grade = total >= 85 ? 'A' : (total >= 75 ? 'B' : (total >= 65 ? 'C' : (total >= 55 ? 'D' : 'E')));

    var commentary = [];
    if (avgShortage > 10) commentary.push('Conventional DRAM shortages persisted in every period: the allocation you chose could not keep up with derived demand.');
    else if (finalShortage > 3) commentary.push('The shortage narrowed but did not disappear; with inelastic short-run supply, closing the remaining gap needs time, not just price.');
    else commentary.push('You kept conventional DRAM supply broadly adequate — the constraint was managed rather than ignored.');
    if (hbmFill < 0.75) commentary.push('Server and HBM customers went short in many periods. Server buyers can pay more, so they compete away consumer supply — the allocation trade-off in action.');
    else commentary.push('You served the HBM and server segment adequately, avoiding contractual penalties.');
    if (T.deficit) commentary.push('Your books went into deficit at some point. In this industry a shortfall is expensive: capacity commitments and customer relationships do not wait for prices.');
    if (unsoldShare > 0.2) commentary.push('A significant share of your conventional output went unsold — extra output has no value unless the market wants it.');
    if (committed === 0) commentary.push('You never committed capital to future capacity. That protects today\'s cash but leaves the shortage exposed to the next demand shift.');
    else if (completed === 0) commentary.push('You committed ' + committed + ' capital project' + (committed === 1 ? '' : 's') + ', but none had finished construction and qualification by the end of the scenario — which is the whole point: capacity is a long-horizon decision.');
    else commentary.push('You committed ' + committed + ' capital project' + (committed === 1 ? '' : 's') + ', of which ' + completed + ' became productive in time to add capacity in this scenario.');
    if (state.policy === 'B') commentary.push('You recommended a consumer voucher. It helps eligible households, but because demand for PCs is derived demand for DRAM, it adds pressure to the upstream bottleneck that has not been relieved.');
    if (state.policy === 'A') commentary.push('You recommended an upstream producer incentive — the intervention that actually targets the binding constraint, though it transfers cost to taxpayers and risks excess capacity.');
    if (state.policy === 'both') commentary.push('You recommended both measures. A broad purchase subsidy should not run while upstream supply is constrained; a narrow access voucher is defensible, a broad one is not.');
    if (!state.policy) commentary.push('You made no policy recommendation. Scarcity is a political issue, and the absence of a decision is itself a decision: it leaves the allocation entirely to market prices.');

    return {
      dimensions: [
        { key: 'supply', name: 'Conventional supply & consumer access', value: sSupply,
          note: 'Average shortage ' + avgShortage.toFixed(1) + ' units/period; final shortage ' + finalShortage.toFixed(1) + '; PC price index ' + state.prices.pc.toFixed(0) + ' (base ' + CFG.pc.basePrice + ').' },
        { key: 'finance', name: 'Financial sustainability', value: sFinance,
          note: 'Closing balance ' + Math.round(state.credits) + ' credits (start ' + CFG.startCredits + '); revenue ' + Math.round(T.revenue) + ' minus operating costs ' + Math.round(T.costs) + ' and investment ' + Math.round(T.creditsSpentOnInvestment) + '; ' + Math.round(unsoldShare * 100) + '% of conventional output unsold.' },
        { key: 'resilience', name: 'Long-run production resilience', value: sResilience,
          note: committed + ' project(s) committed, ' + completed + ' completed and productive' + (capacityProjects ? ' (including ' + capacityProjects + ' conventional-capacity project(s))' : '') + '. Capacity expands only after construction and qualification.' },
        { key: 'hbm', name: 'Server / HBM customer fulfilment', value: sHbm,
          note: 'HBM order fill rate ' + Math.round(hbmFill * 100) + '% of server orders filled; PC demand met ' + Math.round(pcFill * 100) + '%.' },
        { key: 'fiscal', name: 'Fiscal & environmental responsibility', value: sFiscal,
          note: state.policy ? ('Policy chosen: ' + policyName(state.policy) + '. Public cost of the instrument is borne by taxpayers and cannot be assumed free; the brief also monitors energy, water and employment effects.')
            : ('No policy adopted. Any recommendation would have required weighing taxpayer cost, deadweight loss and the risk of excess capacity.') }
      ],
      total: total,
      grade: grade,
      commentary: commentary,
      metrics: {
        avgShortage: avgShortage, finalShortage: finalShortage, hbmFill: hbmFill,
        pcFill: pcFill, unsoldShare: unsoldShare, pcPrice: state.prices.pc,
        dramPrice: state.prices.dram, credits: state.credits, cycles: T.cycles
      }
    };
  }

  function policyName(code) {
    if (code === 'A') return CFG.policy.A.name;
    if (code === 'B') return CFG.policy.B.name;
    return 'Both measures (upstream incentive + narrow access voucher)';
  }

  /* ---------------------------------------------------------------
     HELPER: consumer / producer surplus logic (qualitative, index-based)
     --------------------------------------------------------------- */
  function surplusSummary(state) {
    var P = state.prices.dram;
    var base = CFG.dram.basePrice;
    var delta = P - base;
    var consumerText = delta > 0
      ? 'Higher conventional DRAM prices and lower traded quantity reduce consumer surplus in Market 1, all else equal.'
      : (delta < 0 ? 'Lower conventional DRAM prices and higher traded quantity raise consumer surplus in Market 1, all else equal.'
                    : 'Consumer surplus in Market 1 is unchanged from the base price.');
    var producerText = 'Producer surplus is ambiguous: the higher price is partly offset by lower sales volumes, higher costs and a product mix shifting toward HBM, which earns more per unit.';
    return { consumer: consumerText, producer: producerText };
  }

  DRAM.Econ = {
    clamp: clamp,
    convUnits: convUnits,
    hbmUnits: hbmUnits,
    opportunityCost: opportunityCost,
    ppcFrontier: ppcFrontier,
    effectiveAllocations: effectiveAllocations,
    createState: createState,
    initMarkets: initMarkets,
    runCycle: runCycle,
    updateDramMarket: updateDramMarket,
    updatePcMarket: updatePcMarket,
    updateHbmMarket: updateHbmMarket,
    commitProject: commitProject,
    checkProjects: checkProjects,
    computeScore: computeScore,
    policyName: policyName,
    surplusSummary: surplusSummary,
    dramCapacity: dramCapacity,
    dramDemandIntercept: dramDemandIntercept,
    pcSupplyIntercept: pcSupplyIntercept,
    pcDemandAt: pcDemandAt,
    pcCapacity: pcCapacity,
    effectiveHbmCost: function (state) { return state.hbmTokenCost; }
  };
})();
