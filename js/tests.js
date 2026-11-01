/* ============================================================
   DRAM Factory Tycoon — tests.js
   Lightweight automated self-tests, runnable at startup and from
   the Diagnostics button. Every check is evidence-backed.
   ============================================================ */
(function () {
  'use strict';

  var DRAM = window.DRAM;
  var GM = DRAM.CONFIG.GRAPH_MODEL;
  var CFG = DRAM.CONFIG.SIM;

  function approx(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol); }

  /* Frontier lookup: given a conventional output, find the frontier
     HBM output at the same allocation. */
  function frontierHbmAtConv(state, convTarget) {
    var lo = 0, hi = CFG.totalTokens, mid, i;
    for (i = 0; i < 60; i++) {
      mid = (lo + hi) / 2;
      if (DRAM.Econ.convUnits(mid, state) < convTarget) lo = mid; else hi = mid;
    }
    return DRAM.Econ.hbmUnits(CFG.totalTokens - mid, state);
  }

  function classifyPoint(state, conv, hbm) {
    var fh = frontierHbmAtConv(state, conv);
    if (approx(hbm, fh, 0.5)) return 'on';
    return hbm < fh ? 'inside' : 'outside';
  }

  /* Count the brief's body prose, excluding headings, the inquiry
     questions, the reference list and the closing footnote. */
  function countBriefBodyWords(brief) {
    var words = 0, i;
    var blocks = brief.querySelectorAll('p');
    for (i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.classList.contains('brief-foot')) continue;
      if (b.classList.contains('brief-meta')) continue;
      if (b.classList.contains('brief-question')) continue;
      var t = (b.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) words += t.split(' ').length;
    }
    return words;
  }

  function svgPathsOk(svg) {
    var paths = svg.querySelectorAll('path');
    if (!paths.length) return { ok: false, detail: 'no paths' };
    for (var i = 0; i < paths.length; i++) {
      var d = paths[i].getAttribute('d') || '';
      if (d.indexOf('NaN') !== -1 || d.indexOf('Infinity') !== -1) return { ok: false, detail: 'invalid coordinate in path' };
      var nums = d.match(/-?\d+(\.\d+)?/g) || [];
      for (var j = 0; j < nums.length; j++) {
        if (!isFinite(parseFloat(nums[j]))) return { ok: false, detail: 'non-finite coordinate' };
      }
    }
    return { ok: true, detail: paths.length + ' path(s)' };
  }

  function run(options) {
    options = options || {};
    var results = [];
    function check(name, fn) {
      var res;
      try { res = fn(); }
      catch (e) { results.push({ name: name, pass: false, detail: 'threw: ' + (e && e.message ? e.message : e) }); return; }
      if (res && res.ok === false) results.push({ name: name, pass: false, detail: res.detail || '' });
      else results.push({ name: name, pass: true, detail: (res && res.detail) || '' });
    }

    /* ---- 1. base equilibrium is positive and finite ---- */
    check('1. Linear supply-demand intersection returns positive finite Q and P', function () {
      var e = DRAM.Graphs.eq(GM.dram.demand, GM.dram.supply1);
      if (!isFinite(e.Q) || !isFinite(e.P) || e.Q <= 0 || e.P <= 0) return { ok: false, detail: 'Q=' + e.Q + ' P=' + e.P };
      return { detail: 'Q*=' + e.Q.toFixed(2) + ', P*=' + e.P.toFixed(2) };
    });

    /* ---- 2. leftward supply shift raises price, lowers quantity ---- */
    check('2. A leftward supply shift raises equilibrium price and lowers equilibrium quantity', function () {
      var e1 = DRAM.Graphs.eq(GM.dram.demand, GM.dram.supply1);
      var e2 = DRAM.Graphs.eq(GM.dram.demand, GM.dram.supply2);
      if (!(e2.P > e1.P && e2.Q < e1.Q)) return { ok: false, detail: 'P1=' + e1.P + ' P2=' + e2.P + ' Q1=' + e1.Q + ' Q2=' + e2.Q };
      return { detail: 'P ' + e1.P.toFixed(1) + '→' + e2.P.toFixed(1) + ', Q ' + e1.Q.toFixed(1) + '→' + e2.Q.toFixed(1) };
    });

    /* ---- 3. producer subsidy raises equilibrium quantity ---- */
    check('3. A positive producer subsidy increases the equilibrium quantity', function () {
      var s = GM.dram.subsidy;
      var e1 = DRAM.Graphs.eq(GM.dram.demand, GM.dram.supply1);
      var e2 = DRAM.Graphs.eq(GM.dram.demand, { a: GM.dram.supply1.a, b: GM.dram.supply1.b, sshift: -s });
      if (!(e2.Q > e1.Q)) return { ok: false, detail: 'Q1=' + e1.Q + ' Q2=' + e2.Q };
      return { detail: 'Q ' + e1.Q.toFixed(1) + '→' + e2.Q.toFixed(2) };
    });

    /* ---- 4. producer subsidy wedge is exactly the subsidy ---- */
    check('4. Producer subsidy wedge: producer price exceeds buyer price by exactly the subsidy', function () {
      var s = GM.dram.subsidy;
      var e2 = DRAM.Graphs.eq(GM.dram.demand, { a: GM.dram.supply1.a, b: GM.dram.supply1.b, sshift: -s });
      var pc = e2.P, pp = pc + s;
      if (!approx(pp - pc, s, 1e-9)) return { ok: false, detail: 'wedge=' + (pp - pc) };
      return { detail: 'wedge = ' + (pp - pc).toFixed(6) + ' = s' };
    });

    /* ---- 5. buyer price after a producer subsidy is below the original price ---- */
    check('5. Buyer price after a producer subsidy is below the original equilibrium price', function () {
      var s = GM.dram.subsidy;
      var e1 = DRAM.Graphs.eq(GM.dram.demand, GM.dram.supply1);
      var e2 = DRAM.Graphs.eq(GM.dram.demand, { a: GM.dram.supply1.a, b: GM.dram.supply1.b, sshift: -s });
      if (!(e2.P < e1.P)) return { ok: false, detail: 'Pc=' + e2.P.toFixed(2) + ' P1=' + e1.P };
      return { detail: 'P1=' + e1.P + ' → Pc=' + e2.P.toFixed(2) + ', Pp=' + (e2.P + s).toFixed(2) };
    });

    /* ---- 6. consumer subsidy raises equilibrium quantity ---- */
    check('6. A positive consumer subsidy increases the equilibrium quantity', function () {
      var s = GM.pc.voucher;
      var e1 = DRAM.Graphs.eq(GM.pc.demand, GM.pc.supply1);
      var e2 = DRAM.Graphs.eq({ a: GM.pc.demand.a, b: GM.pc.demand.b, dshift: s }, GM.pc.supply1);
      if (!(e2.Q > e1.Q)) return { ok: false, detail: 'Q1=' + e1.Q + ' Q2=' + e2.Q };
      return { detail: 'Q ' + e1.Q.toFixed(1) + '→' + e2.Q.toFixed(2) };
    });

    /* ---- 7. consumer subsidy wedge is exactly the subsidy ---- */
    check('7. Consumer subsidy wedge: seller price exceeds buyer out-of-pocket price by exactly the subsidy', function () {
      var s = GM.pc.voucher;
      var e2 = DRAM.Graphs.eq({ a: GM.pc.demand.a, b: GM.pc.demand.b, dshift: s }, GM.pc.supply1);
      var pp = e2.P, pc = pp - s;
      if (!approx(pp - pc, s, 1e-9)) return { ok: false, detail: 'wedge=' + (pp - pc) };
      return { detail: 'wedge = ' + (pp - pc).toFixed(6) + ' = s' };
    });

    /* ---- 8. higher PC input cost shifts PC supply left/up ---- */
    check('8. A higher PC input cost shifts PC supply left/up (higher price, lower quantity)', function () {
      var e1 = DRAM.Graphs.eq(GM.pc.demand, GM.pc.supply1);
      var e2 = DRAM.Graphs.eq(GM.pc.demand, GM.pc.supply2);
      if (!(e2.P > e1.P && e2.Q < e1.Q)) return { ok: false, detail: 'P1=' + e1.P + ' P2=' + e2.P };
      /* and the live simulation links the DRAM price to the PC supply intercept */
      var st = DRAM.Econ.createState();
      var before = DRAM.Econ.pcSupplyIntercept(st);
      st.prices.dram = st.prices.dram + 10;
      var after = DRAM.Econ.pcSupplyIntercept(st);
      if (!(after > before)) return { ok: false, detail: 'PC supply intercept did not respond to the DRAM price' };
      return { detail: 'PC price ' + e1.P + '→' + e2.P.toFixed(1) + '; live intercept ' + before.toFixed(1) + '→' + after.toFixed(1) };
    });

    /* ---- 9. long-run supply curve is flatter (more elastic) ---- */
    check('9. The long-run supply curve is flatter than the short-run curve (inverse-curve representation)', function () {
      if (!(GM.dram.supplyLong.b < GM.dram.supply1.b)) return { ok: false, detail: 'b_long=' + GM.dram.supplyLong.b + ' b_short=' + GM.dram.supply1.b };
      return { detail: 'b_short=' + GM.dram.supply1.b + ' > b_long=' + GM.dram.supplyLong.b };
    });

    /* ---- 10. PPC points classify as on / inside / outside ---- */
    check('10. PPC points are classified correctly as on, inside or outside the frontier', function () {
      var st = DRAM.Econ.createState();
      var fh = frontierHbmAtConv(st, 0);
      var on = classifyPoint(st, 0, fh);
      var inside = classifyPoint(st, 0, fh - 8);
      var outside = classifyPoint(st, 0, fh + 8);
      if (on !== 'on' || inside !== 'inside' || outside !== 'outside') {
        return { ok: false, detail: 'got ' + on + '/' + inside + '/' + outside };
      }
      /* the frontier must also be bowed outward (above the straight chord) */
      var mid = DRAM.Econ.convUnits(50, st), midH = DRAM.Econ.hbmUnits(50, st);
      var chord = (DRAM.Econ.convUnits(0, st) + DRAM.Econ.convUnits(100, st)) / 2;
      if (!(mid > chord)) return { ok: false, detail: 'frontier is not bowed outward' };
      return { detail: 'on / inside / outside verified; bowed-out frontier confirmed' };
    });

    /* ---- 11. allocations never exceed capacity ---- */
    check('11. Resource allocations never exceed total available capacity', function () {
      var st = DRAM.Econ.createState();
      var i, a;
      for (i = 0; i <= 100; i += 5) {
        for (a = 0; a <= 100; a += 10) {
          st.allocConv = i; st.utilization = a;
          var e = DRAM.Econ.effectiveAllocations(st);
          if (e.convTokens + e.hbmTokens > CFG.totalTokens + 1e-9) return { ok: false, detail: 'over-allocated at ' + i + '/' + a };
          if (e.convTokens < 0 || e.hbmTokens < 0) return { ok: false, detail: 'negative allocation' };
          if (e.idleTokens < -1e-9) return { ok: false, detail: 'negative idle tokens' };
        }
      }
      return { detail: 'swept 21×11 allocation/utilisation combinations' };
    });

    /* ---- 12. all five graphs render with valid coordinates ---- */
    var expectedCurves = { g1: 2, g2: 3, g3: 3, g4: 5, g5: 3 };
    check('12. All five graphs render without missing curves or invalid coordinates', function () {
      var out = [];
      for (var i = 0; i < DRAM.Graphs.ids.length; i++) {
        var id = DRAM.Graphs.ids[i];
        var svg = DRAM.Graphs.builders[id]();
        if (!svg || svg.tagName.toLowerCase() !== 'svg') return { ok: false, detail: id + ' did not render' };
        var p = svgPathsOk(svg);
        if (!p.ok) return { ok: false, detail: id + ': ' + p.detail };
        var meta = svg.__meta || {};
        if ((meta.curveCount || 0) < expectedCurves[id]) return { ok: false, detail: id + ' missing curves' };
        var texts = svg.querySelectorAll('text');
        if (!texts.length) return { ok: false, detail: id + ' has no labels' };
        out.push(id + ':' + (meta.curveCount || 0) + 'c');
      }
      return { detail: out.join(' ') };
    });

    /* ---- 13. axis titles and curve labels are present ---- */
    check('13. All graph axis titles and curve labels are present', function () {
      for (var i = 0; i < DRAM.Graphs.ids.length; i++) {
        var id = DRAM.Graphs.ids[i];
        var svg = DRAM.Graphs.builders[id]();
        var meta = svg.__meta || {};
        var text = svg.textContent || '';
        if (!meta.xLabel || text.indexOf(meta.xLabel) === -1) return { ok: false, detail: id + ' missing x-axis label' };
        if (!meta.yLabel || text.indexOf(meta.yLabel) === -1) return { ok: false, detail: id + ' missing y-axis label' };
        if (!meta.title || text.indexOf(meta.title) === -1) return { ok: false, detail: id + ' missing title' };
      }
      return { detail: 'title + both axis labels present on all five' };
    });

    /* ---- 14. all five graphs are reachable from the gallery ---- */
    check('14. The five graphs are accessible from the Graph Gallery', function () {
      var tabs = document.querySelectorAll('#graph-tabs .tabbtn');
      if (tabs.length < 5) return { ok: false, detail: 'only ' + tabs.length + ' gallery tabs' };
      var seen = {}, i;
      for (i = 0; i < tabs.length; i++) seen[tabs[i].getAttribute('data-graph')] = true;
      for (i = 0; i < DRAM.Graphs.ids.length; i++) {
        if (!seen[DRAM.Graphs.ids[i]]) return { ok: false, detail: 'no tab for ' + DRAM.Graphs.ids[i] };
      }
      return { detail: tabs.length + ' gallery tabs wired' };
    });

    /* ---- 15. reset restores the initial state ---- */
    check('15. Reset restores the initial player and economic state', function () {
      var st = DRAM.Econ.createState();
      DRAM.Econ.runCycle(st);
      st.allocConv = 5; st.credits = -100; st.policy = 'A';
      var fresh = DRAM.Econ.createState();
      if (fresh.period !== 1 || fresh.credits !== CFG.startCredits || fresh.history.length !== 0 ||
        fresh.allocConv !== 60 || fresh.policy !== null) {
        return { ok: false, detail: 'fresh state is not the documented initial state' };
      }
      if (options.allowUI) {
        DRAM.UI.resetGame(false);
        var s2 = DRAM.UI.state();
        if (s2.period !== 1 || s2.credits !== CFG.startCredits || s2.history.length !== 0 || s2.policy !== null) {
          return { ok: false, detail: 'UI reset did not restore the initial state' };
        }
      }
      return { detail: 'fresh state verified' + (options.allowUI ? ' + live UI reset verified' : '') };
    });

    /* ---- 16. every visible button is wired and labelled ---- */
    check('16. All visible buttons have working handlers (wired + text-labelled)', function () {
      var buttons = document.querySelectorAll('button');
      if (!buttons.length) return { ok: false, detail: 'no buttons found' };
      var unlabeled = [], unwired = [];
      for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i];
        var text = (b.textContent || '').trim();
        var label = b.getAttribute('aria-label') || '';
        if (!text && !label) unlabeled.push(b.id || b.className || 'button');
        var wired = !!(b.id || b.getAttribute('data-action') || b.getAttribute('data-screen') ||
          b.getAttribute('data-graph') || b.getAttribute('data-project') ||
          b.getAttribute('data-opt') || b.getAttribute('name') || b.getAttribute('data-q') !== null);
        if (!wired) unwired.push(b.id || b.className || 'button');
      }
      if (unlabeled.length) return { ok: false, detail: 'unlabelled: ' + unlabeled.slice(0, 3).join(', ') };
      if (unwired.length) return { ok: false, detail: 'unwired: ' + unwired.slice(0, 3).join(', ') };
      return { detail: buttons.length + ' buttons checked' };
    });

    /* ---- 17. no unhandled JavaScript errors ---- */
    check('17. No screen produces unhandled JavaScript errors', function () {
      var errs = window.DRAM_ERRORS || [];
      if (errs.length) return { ok: false, detail: errs.length + ' error(s): ' + errs[0] };
      return { detail: 'no uncaught errors recorded since load' };
    });

    /* ---- 18. (extra) the policy brief contains every required section ---- */
    check('18. The Policy Brief has all eight required sections, stays near the target length and prints to two A4 pages', function () {
      var brief = document.getElementById('brief-article');
      if (!brief) return { ok: false, detail: 'brief not found' };
      var required = ['Executive Summary', 'Introduction', 'Methodology',
        'Research, Data, Summaries, and Conclusions', 'Analysis of Content',
        'Recommendations', 'Measurement', 'References'];
      var text = brief.textContent || '';
      for (var i = 0; i < required.length; i++) {
        if (text.indexOf(required[i]) === -1) return { ok: false, detail: 'missing heading: ' + required[i] };
      }
      var words = countBriefBodyWords(brief);
      if (words < 1250) return { ok: false, detail: 'brief body is only ' + words + ' words' };
      if (words > 1700) return { ok: false, detail: 'brief body is ' + words + ' words (too long for two pages)' };
      var est = (DRAM.UI && DRAM.UI.estimatePrintPages) ? DRAM.UI.estimatePrintPages() : null;
      if (est && est.pages > 2) {
        return { ok: false, detail: 'brief prints to ' + est.pages + ' A4 pages (measured ' + est.heightMm + ' mm); it must be at most 2' };
      }
      return { detail: words + ' body words (target 1,400-1,500)' + (est ? '; prints to ' + est.pages + ' A4 page(s), ' + est.heightMm + ' mm' : '') };
    });

    /* ---- 19. (extra) the seven claims and three inquiry questions are present ---- */
    check('19. All seven claims and the three inquiry questions are stated', function () {
      var brief = document.getElementById('brief-article');
      if (!brief) return { ok: false, detail: 'brief not found' };
      var text = brief.textContent || '';
      var claims = ['Claim 1', 'Claim 2', 'Claim 3', 'Claim 4', 'Claim 5', 'Claim 6', 'Claim 7'];
      for (var i = 0; i < claims.length; i++) {
        if (text.indexOf(claims[i]) === -1) return { ok: false, detail: 'missing ' + claims[i] };
      }
      if (text.indexOf('Overarching inquiry question') === -1) return { ok: false, detail: 'missing overarching question' };
      if (text.indexOf('Market 1 (conventional DRAM)') === -1) return { ok: false, detail: 'missing Market 1 question' };
      if (text.indexOf('Market 2 (PCs and laptops)') === -1) return { ok: false, detail: 'missing Market 2 question' };
      return { detail: '7 claims + 3 inquiry questions found' };
    });

    /* ---- 20. (extra) the simulation never produces invalid numbers ---- */
    check('20. The simulation produces no NaN, Infinity or negative capacity values', function () {
      var st = DRAM.Econ.createState();
      var i;
      for (i = 0; i < 6; i++) {
        st.allocConv = [0, 25, 50, 75, 100, 50][i % 6];
        st.utilization = 100;
        DRAM.Econ.runCycle(st);
        var m = st.market;
        var vals = [m.dram.qDemand, m.dram.qSupply, m.dram.shortage, m.dram.capacity, m.dram.price,
          m.pc.qDemand, m.pc.shipments, m.pc.price, m.pc.deferred, m.hbm.shortfall, st.credits];
        for (var j = 0; j < vals.length; j++) {
          if (typeof vals[j] !== 'number' || !isFinite(vals[j])) return { ok: false, detail: 'invalid value: ' + vals[j] };
        }
        if (m.dram.capacity < 0 || m.pc.qDemand < 0) return { ok: false, detail: 'negative capacity/demand' };
      }
      return { detail: '6 cycles across 6 allocations, all values finite' };
    });

    /* ---- 21. (extra) every station can be walked to from the start ---- */
    check('21. The factory map lets the player walk to every workstation', function () {
      if (!DRAM.Game || !DRAM.Game.reachability) return { ok: false, detail: 'reachability check unavailable' };
      var r = DRAM.Game.reachability();
      if (!r.ok) return { ok: false, detail: 'unreachable station(s): ' + r.unreachable.join(', ') };
      return { detail: 'all 6 workstations reachable from the start tile (' + r.start[0] + ',' + r.start[1] + ')' };
    });

    /* ---- 22. (extra) the allocation console never exceeds capacity ---- */
    check('22. The allocation console slider cannot over-allocate resources', function () {
      var st = DRAM.Econ.createState();
      var i;
      for (i = 0; i <= 100; i += 4) {
        st.allocConv = i;
        var a = DRAM.Econ.effectiveAllocations(st);
        if (a.allocConv + a.allocHbm !== CFG.totalTokens) {
          return { ok: false, detail: 'allocations do not sum to capacity at ' + i };
        }
      }
      return { detail: 'allocations sum to exactly 100 tokens at every slider position' };
    });

    /* ---- 23. (extra) every graph contains its required content ---- */
    check('23. Every graph contains its title, axes and required annotations', function () {
      var expected = {
        g1: ['Allocating Scarce Production Resources', 'Current PPC', 'New PPC', 'Opportunity cost',
          'Conventional DRAM output index', 'HBM output index', 'your allocation'],
        g2: ['Global Conventional DRAM Market', 'P1 = 60.0', 'P2 = 80.0', 'Q1 = 100', 'Q2 = 75',
          'shortage at P1 (Qd > Qs)', 'supply constrained', 'E1', 'E2'],
        g3: ['Targeted Producer Incentive', 'Pc = 54.7 (buyers pay)', 'Pp = 62.7 (producers receive)',
          'P1 = 60.0', 'Q1 = 100', 'Q2 = 106.7', 's = Pp − Pc = 8', 'eligible incremental units',
          'NOT s × the whole market Q2'],
        g4: ['PC/Laptop Market', 'P1 = 100.0', 'P2 = 108.3', 'Q1 = 100', 'Q2 = 83.3',
          'shortage at P1 (Qd > Qs)', 'DRAM input cost rises',
          'D-mainstream (flatter = more elastic)', 'D-urgent (steeper = less elastic)',
          'compared at the same point (P = 100, Q = 100)'],
        g5: ['Targeted PC Voucher', 'Pp = 106.7 (sellers receive)', 'Pc = 91.7 (eligible buyer pays)',
          'P1 = 100.0', 'Q1 = 100', 'Q2 = 116.7', 's = Pp − Pc = 15', 'eligible redemptions']
      };
      var ids = DRAM.Graphs.ids;
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        /* Graph 1 also renders the player's allocation marker when a
           game state is supplied, so pass one in. */
        var svg = (id === 'g1')
          ? DRAM.Graphs.graph1({ state: DRAM.Econ.createState() })
          : DRAM.Graphs.builders[id]();
        var text = svg.textContent || '';
        var need = expected[id];
        for (var j = 0; j < need.length; j++) {
          if (text.indexOf(need[j]) === -1) {
            return { ok: false, detail: id + ' is missing the text "' + need[j] + '"' };
          }
        }
      }
      return { detail: 'all five graphs contain their titles, axes, equilibria, wedges and required notes' };
    });

    /* ---- 24. (extra) the PC segment curves are ordered correctly ---- */
    check('24. PC segment demand: mainstream is flatter (more elastic), urgent is steeper (less elastic), both through (Q=100, P=100)', function () {
      var m = GM.pc.demandMainstream, u = GM.pc.demandUrgent;
      if (!(m.b < u.b)) return { ok: false, detail: 'mainstream b=' + m.b + ' is not smaller than urgent b=' + u.b };
      var mp = m.a - m.b * 100, up = u.a - u.b * 100;
      if (Math.abs(mp - 100) > 1e-9 || Math.abs(up - 100) > 1e-9) {
        return { ok: false, detail: 'segment curves do not both pass through (100,100): ' + mp + ', ' + up };
      }
      /* |elasticity| = P / (bQ) at the common comparison point */
      var em = 100 / (m.b * 100), eu = 100 / (u.b * 100);
      if (!(em > eu)) return { ok: false, detail: 'elasticity order wrong: ' + em + ' vs ' + eu };
      return { detail: 'mainstream b=' + m.b + ' (|e|=' + em.toFixed(2) + ') is flatter and more elastic than urgent b=' + u.b + ' (|e|=' + eu.toFixed(2) + '); both pass (100,100)' };
    });

    /* ---- 25. (extra) the LIVE simulation PC elasticity parameters ---- */
    check('25. Live PC simulation: mainstream demand is more price-elastic than urgent demand, with baseline quantities 70 / 30 / 100', function () {
      var C = CFG.pc;
      var P = C.basePrice;
      var st = DRAM.Econ.createState();
      var dem = DRAM.Econ.pcDemandAt(st, P);

      /* 1. both segments must be positive at the baseline price */
      if (!(dem.mainstream > 0 && dem.urgent > 0)) {
        return { ok: false, detail: 'non-positive baseline demand: ' + dem.mainstream + ' / ' + dem.urgent };
      }
      /* 2-4. the baseline quantities and total must be preserved */
      if (!approx(dem.mainstream, 70, 0.05)) {
        return { ok: false, detail: 'baseline mainstream quantity is ' + dem.mainstream.toFixed(3) + ', expected ~70' };
      }
      if (!approx(dem.urgent, 30, 0.05)) {
        return { ok: false, detail: 'baseline urgent quantity is ' + dem.urgent.toFixed(3) + ', expected ~30' };
      }
      if (!approx(dem.total, 100, 0.1)) {
        return { ok: false, detail: 'baseline total PC demand is ' + dem.total.toFixed(3) + ', expected ~100' };
      }
      /* 5. absolute PED = P / (slope * Q), from the live parameters and the
            live demand function. These are illustrative model elasticities,
            not measured real-world coefficients. */
      var pedMainstream = P / (C.mainstreamSlope * dem.mainstream);
      var pedUrgent = P / (C.urgentSlope * dem.urgent);
      if (!(pedMainstream > pedUrgent)) {
        return { ok: false, detail: 'live parameters are reversed: mainstream |PED| ' + pedMainstream.toFixed(2) +
          ' is not above urgent |PED| ' + pedUrgent.toFixed(2) };
      }
      /* the ordering must also hold away from the baseline price */
      var P2 = P + 10;
      var d2 = DRAM.Econ.pcDemandAt(st, P2);
      var pedM2 = P2 / (C.mainstreamSlope * d2.mainstream);
      var pedU2 = P2 / (C.urgentSlope * d2.urgent);
      if (!(pedM2 > pedU2)) {
        return { ok: false, detail: 'ordering breaks away from the baseline price' };
      }
      return { detail: 'live model: mainstream ' + dem.mainstream.toFixed(1) + ' units (|PED| ' + pedMainstream.toFixed(2) +
        '), urgent ' + dem.urgent.toFixed(1) + ' units (|PED| ' + pedUrgent.toFixed(2) + '), total ' + dem.total.toFixed(1) +
        ' — mainstream is the more elastic segment' };
    });

    /* ---- 26. (extra) modal action buttons are actually wired ---- */
    check('26. Modal [data-action] buttons are wired (delegated handler responds)', function () {
      var body = document.getElementById('modal-body');
      if (!body) return { ok: false, detail: 'modal body not found' };
      var prev = document.querySelector('.screen:not([hidden])');
      var prevId = prev ? prev.id : 'screen-title';
      var btn = document.createElement('button');
      btn.setAttribute('data-action', 'go-glossary');
      btn.textContent = 'self-test';
      body.appendChild(btn);
      btn.click();
      var responded = !document.getElementById('screen-glossary').hidden;
      body.removeChild(btn);
      /* restore whatever screen was showing before the test */
      try { DRAM.UI.showScreen(prevId.replace('screen-', '')); } catch (e) { /* ignore */ }
      if (!responded) return { ok: false, detail: 'a [data-action] click did not trigger its handler' };
      return { detail: 'delegated [data-action] handler responded; previous screen restored' };
    });

    /* ---- 27. (extra) the graph gallery re-renders with the live allocation ---- */
    check('27. Graph Gallery re-renders on entry, so Graph 1 shows the player\'s live allocation marker', function () {
      var state = DRAM.UI.state();
      var stage = document.getElementById('graph-stage');
      if (!stage || !state) return { ok: false, detail: 'graph stage or state unavailable' };

      var prevScreenEl = document.querySelector('.screen:not([hidden])');
      var prevScreen = prevScreenEl ? prevScreenEl.id.replace('screen-', '') : 'title';
      var prevAlloc = state.allocConv;

      /* the player marker is the small filled circle in Graph 1 */
      function markerX() {
        var c = stage.querySelector('circle[r="2.6"]');
        return c ? parseFloat(c.getAttribute('cx')) : null;
      }

      DRAM.UI.showScreen('graphs');
      var before = markerX();

      /* move the allocation and re-enter the gallery */
      state.allocConv = (prevAlloc > 50) ? 20 : 80;
      DRAM.UI.showScreen('game');
      DRAM.UI.showScreen('graphs');
      var after = markerX();

      state.allocConv = prevAlloc;
      DRAM.UI.showScreen(prevScreen);

      if (before === null || after === null) {
        return { ok: false, detail: 'could not read the Graph 1 player marker' };
      }
      if (before === after) {
        return { ok: false, detail: 'the gallery marker did not move when the allocation changed (stale render)' };
      }
      return { detail: 'marker moved with the live allocation (x ' + before.toFixed(1) + ' -> ' + after.toFixed(1) + ')' };
    });

    /* ---- 28. (extra) the toast notification cannot swallow clicks ---- */
    check('28. The toast notification is non-interactive so it cannot cover a button', function () {
      var toast = document.getElementById('toast');
      if (!toast) return { ok: false, detail: 'toast element not found' };
      var pe = window.getComputedStyle(toast).pointerEvents;
      if (pe && pe !== 'none') {
        return { ok: false, detail: 'toast has pointer-events:' + pe + ' and can swallow clicks on buttons beneath it' };
      }
      return { detail: 'toast has pointer-events:' + (pe || 'none') + ' and cannot intercept clicks' };
    });

    var passed = 0;
    for (var k = 0; k < results.length; k++) if (results[k].pass) passed++;
    var summary = { total: results.length, passed: passed, results: results };
    try {
      if (window.console && console.log) {
        console.log('%cDRAM Factory Tycoon self-tests: ' + passed + '/' + results.length + ' passed',
          'color:' + (passed === results.length ? '#3aa76d' : '#d9a441') + ';font-weight:bold');
        results.forEach(function (r) {
          console.log((r.pass ? 'PASS' : 'FAIL') + ' — ' + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
        });
      }
    } catch (e) { /* console unavailable */ }
    return summary;
  }

  DRAM.Tests = { run: run };
})();
