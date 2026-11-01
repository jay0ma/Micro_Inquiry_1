/* ============================================================
   DRAM Factory Tycoon — ui.js
   Screens, workstation panels, HUD, navigation, debrief.
   ============================================================ */
(function () {
  'use strict';

  var DRAM = window.DRAM;
  var CFG = DRAM.CONFIG.SIM;
  var PERIODS = DRAM.CONFIG.PERIODS;
  var Econ = DRAM.Econ;
  var Graphs = DRAM.Graphs;

  var state = Econ.createState();
  Econ.initMarkets(state);

  var currentScreen = 'title';
  var modalOpen = false;
  var paused = false;
  var currentGraph = 'g1';
  var showLongRun = false;
  var lastPromptText = '';

  /* ---------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(v) { return Math.round(v); }
  function fmt(v, d) { return (isFinite(v) ? Number(v).toFixed(d === undefined ? 1 : d) : '—'); }
  function periodLabel() { return PERIODS[Math.min(state.period, PERIODS.length) - 1] || 'Period ' + state.period; }

  function toast(msg) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 3600);
  }

  /* ---------------------------------------------------------------
     SCREEN NAVIGATION
     --------------------------------------------------------------- */
  function showScreen(name) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      var active = screens[i].id === 'screen-' + name;
      screens[i].hidden = !active;
      screens[i].classList.toggle('is-active', active);
    }
    currentScreen = name;
    window.scrollTo(0, 0);

    var navs = document.querySelectorAll('.mainnav .navbtn[data-screen]');
    for (var j = 0; j < navs.length; j++) {
      navs[j].classList.toggle('is-active', navs[j].getAttribute('data-screen') === name);
    }

    if (name === 'game') {
      state.visited.game = true;
      DRAM.Game.start();
      DRAM.Game.clearKeys();
      updateHUD();
      var c = $('game-canvas'); if (c) c.focus();
    } else {
      DRAM.Game.clearKeys();
      if (name === 'brief') state.visited.brief = true;
      if (name === 'evidence') state.visited.evidence = true;
      if (name === 'graphs') state.visited.graphs = true;
      if (name === 'glossary') state.visited.glossary = true;
      if (name === 'quiz') state.visited.quiz = true;
      if (name === 'debrief') renderDebrief();
      /* Re-render the gallery on entry: Graph 1 carries the player's live
         allocation marker, which changes when the player moves the slider
         in the Allocation Console. Without this the marker would be stale. */
      if (name === 'graphs') renderGraph();
    }
    updateHUD();
  }

  /* ---------------------------------------------------------------
     MODAL
     --------------------------------------------------------------- */
  function openModal(title, html, onOpen) {
    var m = $('modal');
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = html;
    m.hidden = false;
    modalOpen = true;
    DRAM.Game.clearKeys();
    if (onOpen) onOpen($('modal-body'));
    var close = $('modal-close');
    if (close) close.focus();
  }

  function closeModal() {
    var m = $('modal');
    if (!m || m.hidden) return;
    m.hidden = true;
    $('modal-body').innerHTML = '';
    modalOpen = false;
    var c = $('game-canvas');
    if (c && currentScreen === 'game') c.focus();
  }

  function isGameFocused() { return currentScreen === 'game' && !modalOpen && !paused; }
  function isGameScreen() { return currentScreen === 'game'; }
  function isModalOpen() { return modalOpen; }
  function blocksMovement() { return modalOpen || paused || currentScreen !== 'game'; }
  function togglePause() {
    paused = !paused;
    var b = $('btn-pause');
    if (b) { b.setAttribute('aria-pressed', paused ? 'true' : 'false'); b.textContent = paused ? 'Resume' : 'Pause'; }
    var ov = $('canvas-overlay');
    if (ov) {
      if (paused) {
        $('overlay-title').textContent = 'Paused';
        $('overlay-text').textContent = 'The simulation is stopped. No production, no market updates, no time passes until you resume.';
        ov.hidden = false;
      } else { ov.hidden = true; }
    }
    if (!paused) { var c = $('game-canvas'); if (c) c.focus(); }
  }

  /* ---------------------------------------------------------------
     HUD
     --------------------------------------------------------------- */
  function updateHUD() {
    var m = state.market;
    var alloc = Econ.effectiveAllocations(state);
    setText('hud-period', periodLabel());
    setText('hud-credits', money(state.credits) + ' cr');
    setText('hud-capacity', Math.round(CFG.totalTokens - alloc.idleTokens) + ' / ' + CFG.totalTokens + ' tokens');
    setText('hud-conv', fmt(Econ.convUnits(alloc.convTokens, state), 1) + ' units');
    setText('hud-hbm', fmt(Econ.hbmUnits(alloc.hbmTokens, state), 1) + ' units');
    setText('hud-shortage', fmt(m.dram.shortage, 1) + ' units' + (m.dram.surplus > 0.05 ? ' (surplus ' + fmt(m.dram.surplus, 1) + ')' : ''));
    var fill = m.pc.qDemand > 0 ? Math.min(100, (m.pc.shipments / m.pc.qDemand * 100)) : 100;
    setText('hud-pcfill', fmt(fill, 0) + '%');

    var shortEl = $('hud-shortage');
    if (shortEl) {
      shortEl.className = 'hud-value ' + (m.dram.shortage > 5 ? 'is-bad' : (m.dram.shortage > 0.5 ? 'is-warn' : 'is-ok'));
    }
    var creditEl = $('hud-credits');
    if (creditEl) creditEl.className = 'hud-value ' + (state.credits < 0 ? 'is-bad' : '');

    updateStages();
    updatePeriodLog();
    var db = $('btn-debrief');
    if (db) db.disabled = !(state.stages.policy);
  }

  function setText(id, txt) {
    var e = $(id);
    if (e && e.textContent !== txt) e.textContent = txt;
  }

  function updateStages() {
    var map = {
      1: state.stages.allocation,
      2: state.stages.allocation,
      3: state.stages.cycle,
      4: state.stages.market,
      5: state.stages.invest,
      6: state.stages.policy,
      7: state.stages.policy
    };
    var items = document.querySelectorAll('#stage-list li');
    for (var i = 0; i < items.length; i++) {
      var n = parseInt(items[i].getAttribute('data-stage'), 10);
      var done = !!map[n];
      items[i].classList.toggle('is-done', done);
      var st = items[i].querySelector('.stage-status');
      if (st) st.textContent = done ? 'Done' : 'Pending';
    }
  }

  function updatePeriodLog() {
    var ul = $('period-log');
    if (!ul) return;
    if (!state.history.length) { ul.innerHTML = '<li class="muted">No production cycles yet.</li>'; return; }
    var html = '';
    for (var i = state.history.length - 1; i >= 0; i--) {
      var r = state.history[i];
      html += '<li><span class="t">' + esc(r.label) + '</span> — DRAM price ' + fmt(r.priceDram, 0)
        + ' · shortage ' + fmt(r.shortage, 1)
        + ' · ' + (r.shortage > 0.5 ? '<span class="t-warn">unfilled orders</span>' : '<span class="t-good">supply OK</span>')
        + ' · ' + money(r.credits) + ' cr</li>';
    }
    ul.innerHTML = html;
  }

  /* ---------------------------------------------------------------
     INTERACTION PROMPT
     --------------------------------------------------------------- */
  function updatePrompt() {
    var p = $('interaction-prompt');
    if (!p) return;
    var st = (currentScreen === 'game' && !modalOpen && !paused) ? DRAM.Game.nearestStation() : null;
    var txt = st ? ('Press E or click — ' + st.name) : '';
    if (txt !== lastPromptText) {
      p.textContent = txt;
      lastPromptText = txt;
    }
  }

  /* ============================================================
     STATION PANELS
     ============================================================ */

  /* ---- 1. PRODUCTION ALLOCATION CONSOLE ---- */
  function panelAllocation() {
    state.stages.allocation = true;
    var alloc = Econ.effectiveAllocations(state);
    var oc = Econ.opportunityCost(state, state.allocConv);
    var cap = Econ.dramCapacity(state);

    var html =
      '<p class="note"><strong>The constraint:</strong> your plant has ' + CFG.totalTokens + ' shared resource tokens ' +
      '(<em>illustrative simulation units</em>). Every token you give to HBM is a token not used for conventional DRAM. ' +
      'Suppliers across the industry face the same tension, which is why the global market tilts toward HBM.</p>' +
      '<div class="panel-grid">' +
      '<div class="card"><h4>Conventional DRAM allocation</h4>' +
      '<div class="slider-row">' +
      '<label for="alloc-conv">Tokens to conventional DRAM: <strong id="alloc-conv-v">' + Math.round(alloc.allocConv) + '</strong> of ' + CFG.totalTokens + '</label>' +
      '<input type="range" id="alloc-conv" min="0" max="' + CFG.totalTokens + '" step="1" value="' + Math.round(state.allocConv) + '">' +
      '<div class="scale-legend"><span>0 (all HBM)</span><span>100 (all conventional)</span></div>' +
      '</div>' +
      '<div class="slider-row">' +
      '<label for="alloc-util">Plant utilisation: <strong id="alloc-util-v">' + Math.round(alloc.util * 100) + '%</strong> of allocated tokens actually run</label>' +
      '<input type="range" id="alloc-util" min="0" max="100" step="5" value="' + Math.round(state.utilization) + '">' +
      '<div class="scale-legend"><span>0% (idle capacity)</span><span>100% (full utilisation)</span></div>' +
      '</div></div>' +
      '<div class="card"><h4>Resulting plan</h4>' +
      '<table class="data-table"><caption>Expected output for the next production cycle</caption><thead><tr><th>Item</th><th>Value</th></tr></thead><tbody>' +
      '<tr><td>Tokens to conventional DRAM</td><td id="al-conv-tok">—</td></tr>' +
      '<tr><td>Tokens to HBM</td><td id="al-hbm-tok">—</td></tr>' +
      '<tr><td>Idle tokens (unused capacity)</td><td id="al-idle">—</td></tr>' +
      '<tr><td>Conventional DRAM output (index)</td><td id="al-conv-out">—</td></tr>' +
      '<tr><td>HBM output (index)</td><td id="al-hbm-out">—</td></tr>' +
      '<tr><td>Conventional market capacity (index)</td><td id="al-cap">—</td></tr>' +
      '<tr><td>Conventional DRAM price index now</td><td id="al-price">—</td></tr>' +
      '<tr><td>Current shortage / surplus (index units)</td><td id="al-short">—</td></tr>' +
      '<tr><td><strong>Projected shortage after the next cycle</strong></td><td id="al-proj">—</td></tr>' +
      '</tbody></table></div>' +
      '</div>' +
      '<div class="card"><h4>Opportunity cost of the last decision</h4>' +
      '<p id="al-oc">—</p>' +
      '<p class="tiny">Moving one token from conventional DRAM to HBM in this simplified model changes output by the amounts shown. ' +
      'The trade-off is not one-for-one: HBM needs more shared resources per unit (illustrative factor ' + CFG.hbmTokenCost + ' tokens per unit) and carries ' +
      'advanced stacking and packaging requirements that ordinary DRAM production does not. <strong>Opportunity cost is the value of the best alternative forgone — here, consumer memory that never gets made.</strong></p></div>' +
      '<div class="card"><h4>Production possibilities frontier</h4>' +
      '<div id="alloc-ppc" class="graph-stage"></div>' +
      '<p class="caption">Your allocation appears as the purple marker. Point C on the frontier would be an idle plant (inefficient); ' +
      'point D would be unattainable without new capacity, technology or capital.</p></div>' +
      '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="close-panel">Save allocation &amp; close</button>' +
      '<button type="button" class="btn" data-action="open-graph" data-graph="g1">Open Graph 1 in the gallery</button></div>';

    openModal('Production Allocation Console', html, function (body) {
      var s1 = body.querySelector('#alloc-conv');
      var s2 = body.querySelector('#alloc-util');
      function refresh() {
        state.allocConv = parseInt(s1.value, 10);
        state.utilization = parseInt(s2.value, 10);
        var a = Econ.effectiveAllocations(state);
        var o = Econ.opportunityCost(state, state.allocConv);
        body.querySelector('#alloc-conv-v').textContent = Math.round(a.allocConv);
        body.querySelector('#alloc-util-v').textContent = Math.round(a.util * 100);
        body.querySelector('#al-conv-tok').textContent = fmt(a.convTokens, 1);
        body.querySelector('#al-hbm-tok').textContent = fmt(a.hbmTokens, 1);
        body.querySelector('#al-idle').textContent = fmt(a.idleTokens, 1);
        body.querySelector('#al-conv-out').textContent = fmt(Econ.convUnits(a.convTokens, state), 1) + ' units';
        body.querySelector('#al-hbm-out').textContent = fmt(Econ.hbmUnits(a.hbmTokens, state), 1) + ' units';
        body.querySelector('#al-cap').textContent = fmt(Econ.dramCapacity(state), 1);
        body.querySelector('#al-price').textContent = fmt(state.prices.dram, 1);
        body.querySelector('#al-short').textContent = fmt(state.market.dram.shortage, 1) + ' shortage' +
          (state.market.dram.surplus > 0.05 ? (' / ' + fmt(state.market.dram.surplus, 1) + ' surplus') : '');
        /* Projected shortage once the plant actually runs this allocation. */
        var projCap = CFG.dram.baseIndustryCapacity
          + CFG.dram.capacityPerConvUnit * Econ.convUnits(a.convTokens, state)
          + state.capacityBonus;
        var projAD = Econ.dramDemandIntercept(state);
        var projQd = Math.max(0, (projAD - state.prices.dram) / CFG.dram.demandSlope);
        var projQs = Math.min(Math.max(0, (state.prices.dram - CFG.dram.supplyIntercept) / CFG.dram.supplySlope), projCap);
        var projShort = projQd - projQs;
        body.querySelector('#al-proj').textContent = projShort > 0.05
          ? fmt(projShort, 1) + ' units of unfilled orders'
          : 'none — supply would cover demand at the current price';
        body.querySelector('#al-oc').innerHTML =
          'Shifting one token toward HBM costs <strong>' + fmt(o.convLost, 2) +
          '</strong> conventional DRAM units and gains <strong>' + fmt(o.hbmGained, 2) + '</strong> HBM units. ' +
          'Every token moved this way is one token fewer for the PC market.';
        var holder = body.querySelector('#alloc-ppc');
        if (holder) {
          holder.innerHTML = '';
          holder.appendChild(Graphs.graph1({ state: state }));
        }
        updateHUD();
      }
      s1.addEventListener('input', refresh);
      s2.addEventListener('input', refresh);
      refresh();
    });
  }

  /* ---- 2. PRODUCTION FLOOR ---- */
  function panelProduction() {
    var alloc = Econ.effectiveAllocations(state);
    var convOut = Econ.convUnits(alloc.convTokens, state);
    var hbmOut = Econ.hbmUnits(alloc.hbmTokens, state);
    var m = state.market;
    var last = state.history.length ? state.history[state.history.length - 1] : null;
    var projected = Math.min(convOut, m.dram.qDemand);
    var unfilled = Math.max(0, m.dram.qDemand - m.dram.qSupply);

    var html =
      '<p class="note"><strong>How the cycle works (all values are illustrative simulation assumptions):</strong> the plant runs on the tokens you allocated, ' +
      'produces conventional DRAM and HBM, and sells what the market will buy at the current price index. Unsold output earns nothing but still costs money. ' +
      'Running a cycle advances the scenario by one period and re-prices both markets.</p>' +
      '<div class="kpi-row">' +
      '<div class="kpi"><span class="k">Current period</span><span class="v">' + periodLabel() + '</span></div>' +
      '<div class="kpi"><span class="k">Conventional output</span><span class="v">' + fmt(convOut, 1) + '</span></div>' +
      '<div class="kpi"><span class="k">HBM output</span><span class="v">' + fmt(hbmOut, 1) + '</span></div>' +
      '<div class="kpi ' + (unfilled > 1 ? 'is-bad' : 'is-good') + '"><span class="k">Unfilled DRAM orders</span><span class="v">' + fmt(unfilled, 1) + '</span></div>' +
      '<div class="kpi ' + (m.hbm.shortfall > 1 ? 'is-warn' : 'is-good') + '"><span class="k">Unfilled HBM orders</span><span class="v">' + fmt(m.hbm.shortfall, 1) + '</span></div>' +
      '</div>' +
      '<div class="panel-grid">' +
      '<div class="card"><h4>Conventional DRAM (Market 1)</h4>' +
      '<table class="data-table"><thead><tr><th>Item</th><th>Value</th></tr></thead><tbody>' +
      '<tr><td>Quantity demanded (index)</td><td>' + fmt(m.dram.qDemand, 1) + '</td></tr>' +
      '<tr><td>Quantity supplied (index)</td><td>' + fmt(m.dram.qSupply, 1) + '</td></tr>' +
      '<tr><td>Available capacity (index)</td><td>' + fmt(m.dram.capacity, 1) + '</td></tr>' +
      '<tr><td>Price index (base 60)</td><td>' + fmt(state.prices.dram, 1) + '</td></tr>' +
      '<tr><td>Shortage (+)/surplus (−)</td><td class="' + (m.dram.shortage > 0.5 ? 't-bad' : 't-good') + '">' + fmt(m.dram.shortage, 1) + '</td></tr>' +
      '<tr><td>Your output this cycle</td><td>' + fmt(convOut, 1) + '</td></tr>' +
      '<tr><td>Expected sales</td><td>' + fmt(projected, 1) + '</td></tr>' +
      '</tbody></table></div>' +
      '<div class="card"><h4>HBM / server memory (separate segment)</h4>' +
      '<table class="data-table"><thead><tr><th>Item</th><th>Value</th></tr></thead><tbody>' +
      '<tr><td>Server orders this period (index)</td><td>' + fmt(m.hbm.qDemand, 1) + '</td></tr>' +
      '<tr><td>Your HBM output</td><td>' + fmt(hbmOut, 1) + '</td></tr>' +
      '<tr><td>Unfilled orders</td><td class="' + (m.hbm.shortfall > 0.5 ? 't-warn' : 't-good') + '">' + fmt(m.hbm.shortfall, 1) + '</td></tr>' +
      '<tr><td>HBM price index (base 120)</td><td>' + fmt(state.prices.hbm, 1) + '</td></tr>' +
      '<tr><td>Expected HBM sales</td><td>' + fmt(Math.min(hbmOut, m.hbm.qDemand), 1) + '</td></tr>' +
      '</tbody></table>' +
      '<p class="tiny">HBM demand is <em>not</em> consumer DDR4/DDR5 demand. It is a related product segment that competes for the same shared resources — which is exactly the tension the Policy Office has to resolve.</p></div>' +
      '</div>' +
      (last ? '<div class="card"><h4>Last cycle: ' + esc(last.label) + '</h4>' +
        '<table class="data-table"><thead><tr><th>Outcome</th><th>Value</th></tr></thead><tbody>' +
        '<tr><td>Conventional sold / produced</td><td>' + fmt(last.convSold, 1) + ' / ' + fmt(last.convOutput, 1) + '</td></tr>' +
        '<tr><td>HBM sold / ordered</td><td>' + fmt(last.hbmSold, 1) + ' / ' + fmt(last.hbmDemand, 1) + '</td></tr>' +
        '<tr><td>Unsold conventional output</td><td>' + fmt(last.unsold, 1) + '</td></tr>' +
        '<tr><td>DRAM price index</td><td>' + fmt(last.priceDram, 1) + '</td></tr>' +
        '<tr><td>PC price index</td><td>' + fmt(last.pricePc, 1) + '</td></tr>' +
        '<tr><td>PC shipments / demand</td><td>' + fmt(last.pcShipments, 1) + ' / ' + fmt(last.pcDemand, 1) + '</td></tr>' +
        '<tr><td>PC purchases deferred by price-sensitive buyers</td><td>' + fmt(last.pcDeferred, 1) + '</td></tr>' +
        '<tr><td>Revenue / costs / closing credits</td><td>' + money(last.revenue) + ' / ' + money(last.costs) + ' / ' + money(last.credits) + '</td></tr>' +
        '</tbody></table>' +
        '<p class="tiny">A shortage at the previous price means orders go unfilled; the price then rises, which reduces quantity demanded and chases the shortage away. ' +
        'With inelastic short-run supply, the price does most of the adjusting.</p></div>' : '') +
      '<div class="form-actions">' +
      '<button type="button" class="btn btn-primary" data-action="run-cycle"' + (state.completed ? ' disabled' : '') + '>Run production cycle (' + periodLabel() + ')</button>' +
      '<button type="button" class="btn" data-action="open-graph" data-graph="g2">Graph 2: DRAM market</button>' +
      '<button type="button" class="btn" data-action="close-panel">Close</button></div>';

    openModal('Production Floor', html);
  }

  /* ---- 3. MARKET EXCHANGE ---- */
  function panelMarket() {
    state.stages.market = true;
    var m = state.market;
    var ss = Econ.surplusSummary(state);
    var html =
      '<p class="note">Two linked markets plus a third, related segment. <strong>Market 1</strong> is conventional DRAM (DDR4/DDR5). ' +
      '<strong>Market 2</strong> is PCs and laptops, which use DRAM as an input. <strong>HBM</strong> is a separate product segment for server and AI workloads.</p>' +
      '<div class="kpi-row">' +
      '<div class="kpi ' + (m.dram.shortage > 1 ? 'is-bad' : 'is-good') + '"><span class="k">DRAM price index</span><span class="v">' + fmt(state.prices.dram, 1) + '</span></div>' +
      '<div class="kpi ' + (m.dram.shortage > 1 ? 'is-bad' : 'is-good') + '"><span class="k">DRAM shortage</span><span class="v">' + fmt(m.dram.shortage, 1) + '</span></div>' +
      '<div class="kpi ' + (state.prices.pc > CFG.pc.basePrice + 4 ? 'is-warn' : 'is-good') + '"><span class="k">PC price index</span><span class="v">' + fmt(state.prices.pc, 1) + '</span></div>' +
      '<div class="kpi"><span class="k">PC demand met</span><span class="v">' + fmt(m.pc.qDemand > 0 ? Math.min(100, m.pc.shipments / m.pc.qDemand * 100) : 100, 0) + '%</span></div>' +
      '<div class="kpi"><span class="k">Buyers deferring purchase</span><span class="v">' + fmt(m.pc.deferred, 1) + '</span></div>' +
      '<div class="kpi"><span class="k">HBM orders unfilled</span><span class="v">' + fmt(m.hbm.shortfall, 1) + '</span></div>' +
      '</div>' +
      '<div class="panel-grid">' +
      '<div class="card"><h4>Market 1 — conventional DRAM</h4>' +
      '<table class="data-table"><thead><tr><th>Item</th><th>Value</th></tr></thead><tbody>' +
      '<tr><td>Quantity demanded (index)</td><td>' + fmt(m.dram.qDemand, 1) + '</td></tr>' +
      '<tr><td>Quantity supplied (index)</td><td>' + fmt(m.dram.qSupply, 1) + '</td></tr>' +
      '<tr><td>Available capacity (index)</td><td>' + fmt(m.dram.capacity, 1) + '</td></tr>' +
      '<tr><td>Price index</td><td>' + fmt(state.prices.dram, 1) + '</td></tr>' +
      '<tr><td>Equilibrium status</td><td>' + (m.dram.shortage > 0.05 ? '<span class="t-bad">Shortage — Qd &gt; Qs at the current price</span>'
        : (m.dram.surplus > 0.05 ? '<span class="t-warn">Surplus — Qs &gt; Qd at the current price</span>' : '<span class="t-good">Equilibrium — Qd = Qs</span>')) + '</td></tr>' +
      '<tr><td>Price target as capacity responds</td><td>' + fmt(m.dram.targetPrice, 1) + '</td></tr>' +
      '</tbody></table>' +
      '<p class="tiny"><strong>PES = % change in quantity supplied / % change in price.</strong> Short-run PES is relatively inelastic: installed cleanroom capacity and qualified processes cannot change quickly. ' +
      'Long-run PES is relatively more elastic as capacity, yields and processes adjust. No numerical coefficient is used in this simulation.</p></div>' +
      '<div class="card"><h4>Market 2 — PCs and laptops</h4>' +
      '<table class="data-table"><thead><tr><th>Item</th><th>Value</th></tr></thead><tbody>' +
      '<tr><td>Price index</td><td>' + fmt(state.prices.pc, 1) + ' (base ' + CFG.pc.basePrice + ')</td></tr>' +
      '<tr><td>Quantity demanded (index)</td><td>' + fmt(m.pc.qDemand, 1) + '</td></tr>' +
      '<tr><td>of which mainstream buyers</td><td>' + fmt(m.pc.mainstream, 1) + '</td></tr>' +
      '<tr><td>of which urgent-need buyers</td><td>' + fmt(m.pc.urgent, 1) + '</td></tr>' +
      '<tr><td>Shipments / supply (index)</td><td>' + fmt(m.pc.shipments, 1) + '</td></tr>' +
      '<tr><td>Purchases deferred by price-sensitive buyers</td><td>' + fmt(m.pc.deferred, 1) + '</td></tr>' +
      '</tbody></table>' +
      '<p class="tiny"><strong>PED = % change in quantity demanded / % change in price.</strong> Mainstream buyers can delay, extend a device\'s life, or buy used/refurbished or lower-memory models, so they are more price-responsive. ' +
      'Buyers with urgent school or work needs are less responsive. This is a qualitative illustration, not an empirical elasticity estimate.</p></div>' +
      '</div>' +
      '<div class="card"><h4>Surplus: who gains, who loses?</h4>' +
      '<p><strong>Consumer surplus (Market 1).</strong> ' + esc(ss.consumer) + '</p>' +
      '<p><strong>Producer surplus (Market 1).</strong> ' + esc(ss.producer) + '</p>' +
      '<p><strong>Consumer surplus (Market 2).</strong> Higher PC prices and lower quantities reduce consumer surplus, all else equal.</p>' +
      '<p><strong>Producer surplus (Market 2).</strong> Ambiguous: PC makers receive a higher price per unit but sell fewer units and face higher DRAM input costs.</p></div>' +
      '<div class="card"><h4>Non-price determinants at work</h4>' +
      '<ul><li><strong>Demand (DRAM):</strong> derived demand from PCs, servers and other devices; expectations and stockpiling; complementary products and technology cycles.</li>' +
      '<li><strong>Supply (DRAM):</strong> wafer and cleanroom capacity; process technology and yield; capital investment; skilled labour and equipment; product-allocation priorities; construction and qualification time.</li>' +
      '<li><strong>Demand (PCs):</strong> derived demand from the PC market; replacement cycles; income (normal good); substitutes such as used and refurbished PCs.</li>' +
      '<li><strong>Supply (PCs):</strong> DRAM and other component costs; assembly capacity; component availability.</li></ul></div>' +
      '<div class="form-actions">' +
      '<button type="button" class="btn" data-action="open-graph" data-graph="g2">Graph 2: DRAM supply &amp; demand</button>' +
      '<button type="button" class="btn" data-action="open-graph" data-graph="g4">Graph 4: PC market</button>' +
      '<button type="button" class="btn" data-action="go-evidence">Evidence &amp; sources</button>' +
      '<button type="button" class="btn" data-action="close-panel">Close</button></div>';

    openModal('Market Exchange', html);
  }

  /* ---- 4. R&D AND CAPACITY EXPANSION ---- */
  function panelRnd() {
    var html = '<p class="note"><strong>Capacity is never instant.</strong> A fab is a construction project; a process change must be qualified; ' +
      'a customer only buys qualified output. Every project below has a delay before it becomes productive — and a risk that demand falls before it does.</p>';

    html += '<div class="panel-grid">';
    for (var i = 0; i < CFG.projects.length; i++) {
      var p = CFG.projects[i];
      var affordable = state.credits >= p.cost;
      html += '<div class="card"><h4>' + esc(p.name) + '</h4>' +
        '<table class="data-table"><tbody>' +
        '<tr><td>Capital cost</td><td>' + p.cost + ' credits</td></tr>' +
        '<tr><td>Periods before it is productive</td><td>' + p.delay + '</td></tr>' +
        '<tr><td>Effect</td><td>' + effectText(p) + '</td></tr>' +
        '</tbody></table>' +
        '<p>' + esc(p.blurb) + '</p>' +
        '<p class="tiny"><strong>Trade-off:</strong> ' + esc(p.tradeOff) + '</p>' +
        '<button type="button" class="btn btn-block" data-action="commit" data-project="' + p.id + '"' + (affordable ? '' : ' disabled') + '>' +
        (affordable ? 'Commit ' + p.cost + ' credits' : 'Not enough credits') + '</button></div>';
    }
    html += '</div>';

    html += '<div class="card"><h4>Marginal analysis: should you invest?</h4>' +
      '<p>A firm invests when the expected marginal benefit of the extra output exceeds its marginal cost: capital expenditure, operating cost, the opportunity cost of the capital and of the tokens it locks up, the expected demand and return, the construction and qualification delay, and the risk that a downturn leaves it with capacity nobody wants. ' +
      'Government faces the same test: support is justified only when the expected marginal social benefit — including any genuine supply-chain resilience spillover — exceeds the marginal social cost to taxpayers.</p>' +
      '<p class="tiny">In this simulation the prices, costs and delays are illustrative teaching parameters, not company financials or industry benchmarks.</p></div>';

    if (state.projects.length) {
      html += '<div class="card"><h4>Projects in progress</h4><table class="data-table"><thead><tr><th>Project</th><th>Cost</th><th>Started</th><th>Productive from</th><th>Status</th></tr></thead><tbody>';
      for (var j = 0; j < state.projects.length; j++) {
        var pr = state.projects[j];
        html += '<tr><td>' + esc(pr.name) + '</td><td>' + pr.cost + '</td><td>' + esc(PERIODS[pr.startPeriod - 1] || pr.startPeriod) + '</td>' +
          '<td>' + esc(PERIODS[pr.completePeriod - 1] || pr.completePeriod) + '</td>' +
          '<td class="' + (pr.done ? 't-good' : 't-warn') + '">' + (pr.done ? 'Productive' : 'Under construction / qualification') + '</td></tr>';
      }
      html += '</tbody></table></div>';
    }

    html += '<div class="form-actions">' +
      '<button type="button" class="btn" data-action="open-graph" data-graph="g1">Graph 1: PPC and the outward shift</button>' +
      '<button type="button" class="btn" data-action="open-graph" data-graph="g3">Graph 3: producer incentive</button>' +
      '<button type="button" class="btn" data-action="close-panel">Close</button></div>';

    openModal('R&D and Capacity Expansion', html);
  }

  function effectText(p) {
    if (p.effect === 'capacity') return '+' + p.capacityGain + ' conventional DRAM capacity (index)';
    if (p.effect === 'yield') return '+' + Math.round(p.yieldGain * 100) + '% conventional output per token';
    if (p.effect === 'hbmCost') return 'HBM uses ' + Math.round(p.tokenCostReduction * 100) + '% fewer shared tokens per unit';
    if (p.effect === 'hbmYield') return '+' + Math.round(p.yieldGain * 100) + '% HBM output per token (packaging capacity)';
    return '';
  }

  /* ---- 5. POLICY OFFICE ---- */
  function panelPolicy() {
    var A = CFG.policy.A, B = CFG.policy.B;
    var html =
      '<p class="note"><strong>Both interventions are available; neither is free.</strong> Compare them on incidence, fiscal cost, opportunity cost, ' +
      'deadweight loss, benefit incidence and the risk that public money buys capacity nobody needs.</p>' +
      '<div class="panel-grid">' +
      '<div class="card"><h4>Intervention A — ' + esc(A.name) + '</h4>' +
      '<p><strong>Design:</strong> ' + esc(A.note) + '</p>' +
      '<ul><li>Tie payment to <strong>additional</strong> output from verified new or expanded capacity — not to existing output.</li>' +
      '<li>Release support in stages after construction, equipment installation, qualification and shipment milestones.</li>' +
      '<li>Transparent reporting, annual review, three-year sunset, and clawbacks if milestones are missed.</li>' +
      '<li>Consider milestone-based investment grants or tax credits where they reduce fixed cost better than a per-unit bonus.</li></ul>' +
      '<p><strong>Effects in this model:</strong> conventional capacity rises by ' + A.capacityPerPeriod + ' index units per period (capped at ' + A.capacityCap + '), at a public cost of ' + A.creditCostPerPeriod + ' credits per period.</p>' +
      '<p class="tiny"><strong>Incidence:</strong> with relatively inelastic short-run supply, producers capture much of the benefit; over time, as capacity responds, pass-through to buyers improves. ' +
      '<strong>Risks:</strong> taxpayer cost and opportunity cost, deadweight loss if output is pushed beyond its social value, excess capacity if demand falls, and a long implementation lag — the measure cannot create fab capacity instantly.</p></div>' +
      '<div class="card"><h4>Intervention B — ' + esc(B.name) + '</h4>' +
      '<p><strong>Design:</strong> ' + esc(B.note) + ' Ideally usable toward refurbished devices or repairs, which consume fewer new DRAM bits.</p>' +
      '<ul><li>Eligibility based on a genuine need for computer access (students, lower-income households).</li>' +
      '<li>Small, temporary, and reviewed annually.</li>' +
      '<li>Track recipient out-of-pocket prices, device capability, redemption and administrative costs, and retailer pass-through.</li></ul>' +
      '<p><strong>Effects in this model:</strong> raises demand for PCs (and therefore derived demand for DRAM) by ' + B.dramDemandBoost + ' index units of DRAM demand, at a public cost of ' + B.creditCostPerPeriod + ' credits per period.</p>' +
      '<p class="tiny"><strong>Trade-off:</strong> eligible households gain access and there is a possible positive externality from digital access and education, but producers may capture part of the voucher through higher prices, ' +
      'non-eligible buyers may face higher market prices, and — critically — a purchase subsidy adds derived demand for DRAM while upstream supply is still constrained.</p></div>' +
      '</div>' +
      '<div class="card"><h4>Your recommendation</h4>' +
      '<p>The brief recommends prioritising <strong>Intervention A</strong> because the binding constraint is upstream physical capacity and time, and then keeping consumer assistance narrow for access needs. ' +
      'A broad PC subsidy is not recommended while conventional DRAM supply is constrained.</p>' +
      '<div class="form-actions">' +
      '<label><input type="radio" name="policy-choice" value="A"' + (state.policy === 'A' ? ' checked' : '') + '> A — Targeted conventional DRAM producer incentive</label><br>' +
      '<label><input type="radio" name="policy-choice" value="B"' + (state.policy === 'B' ? ' checked' : '') + '> B — Targeted PC consumer voucher</label><br>' +
      '<label><input type="radio" name="policy-choice" value="both"' + (state.policy === 'both' ? ' checked' : '') + '> Both — upstream incentive plus a narrow access voucher</label>' +
      '</div>' +
      '<label for="policy-note" style="display:block;margin-top:.6rem;font-weight:700;">Your reasoning (2–3 sentences; shown in the debrief)</label>' +
      '<textarea id="policy-note" placeholder="Why is this the right trade-off, and what would you monitor?">' + esc(state.policyNote || '') + '</textarea>' +
      '<div class="form-actions">' +
      '<button type="button" class="btn btn-primary" data-action="submit-policy">Submit recommendation</button>' +
      '<button type="button" class="btn" data-action="open-graph" data-graph="g3">Graph 3: producer incentive</button>' +
      '<button type="button" class="btn" data-action="open-graph" data-graph="g5">Graph 5: consumer voucher</button>' +
      '<button type="button" class="btn" data-action="close-panel">Close</button></div></div>';

    openModal('Policy Office', html);
  }

  /* ---- 6. RESEARCH ARCHIVE ---- */
  function panelArchive() {
    var html = '<p>Everything a reviewer needs is here — the research is not hidden behind the gameplay.</p>' +
      '<div class="panel-grid">' +
      '<div class="card"><h4>Policy Brief</h4><p>The full brief: executive summary, introduction, methodology, seven claims, recommendations, measurement plan and references (approx. 1,400 words, A4-printable).</p>' +
      '<button type="button" class="btn btn-block" data-action="go-brief">Open the Policy Brief</button></div>' +
      '<div class="card"><h4>Evidence bank</h4><p>Seven verified sources with organisation, date, finding, limitation and relevance — plus the Gartner shipment chart.</p>' +
      '<button type="button" class="btn btn-block" data-action="go-evidence">Open Evidence &amp; Sources</button></div>' +
      '<div class="card"><h4>Graph gallery</h4><p>The five economic models, generated mathematically: PPC, DRAM market, producer incentive, PC market, consumer voucher.</p>' +
      '<button type="button" class="btn btn-block" data-action="go-graphs">Open Graph Gallery</button></div>' +
      '<div class="card"><h4>Glossary &amp; knowledge check</h4><p>25 definitions tied to the scenario, and eight reasoning questions with explanations.</p>' +
      '<button type="button" class="btn btn-block" data-action="go-glossary">Open Glossary</button> ' +
      '<button type="button" class="btn btn-block" data-action="go-quiz">Open Knowledge Check</button></div>' +
      '</div>' +
      '<div class="card"><h4>Source list</h4><ol class="references" style="font-size:.86rem;">';
    for (var i = 0; i < DRAM.SOURCES.length; i++) {
      var s = DRAM.SOURCES[i];
      html += '<li>' + esc(s.org) + ', <em>' + esc(s.title) + '</em>, ' + esc(s.date) + '. <a href="' + s.url + '" target="_blank" rel="noopener">' + s.url + '</a></li>';
    }
    html += '</ol></div>' +
      '<div class="form-actions"><button type="button" class="btn" data-action="close-panel">Close</button></div>';

    openModal('Research Archive', html);
  }

  /* ---------------------------------------------------------------
     MODAL ACTION WIRING — one delegated listener on the modal body.
     Delegation (rather than per-panel binding) guarantees that every
     [data-action] button works, including buttons added by a panel
     that forgets to call a setup function, and it cannot create
     duplicate listeners when a panel is re-rendered.
     --------------------------------------------------------------- */
  function handleModalAction(el, e) {
    var action = el.getAttribute('data-action');
    if (action === 'close-panel') { closeModal(); }
    else if (action === 'open-graph') { closeModal(); showScreen('graphs'); linkToGraph(el.getAttribute('data-graph')); }
    else if (action === 'go-brief') { closeModal(); showScreen('brief'); }
    else if (action === 'go-evidence') { closeModal(); showScreen('evidence'); }
    else if (action === 'go-graphs') { closeModal(); showScreen('graphs'); }
    else if (action === 'go-glossary') { closeModal(); showScreen('glossary'); }
    else if (action === 'go-quiz') { closeModal(); showScreen('quiz'); }
    else if (action === 'run-cycle') { doRunCycle(); }
    else if (action === 'commit') { doCommit(el.getAttribute('data-project')); }
    else if (action === 'submit-policy') { doSubmitPolicy(); }
  }

  function doRunCycle() {
    var completed = Econ.checkProjects(state);
    var rec = Econ.runCycle(state);
    if (!rec) { toast('The scenario has ended. Open the debrief.'); updateHUD(); return; }
    for (var i = 0; i < completed.length; i++) {
      toast('Project complete: ' + completed[i].name + ' is now productive.');
    }
    updateHUD();
    panelProduction();
    toast('Cycle complete — ' + rec.label + '.');
  }

  function doCommit(id) {
    var res = Econ.commitProject(state, id);
    toast(res.message);
    updateHUD();
    if (res.ok) panelRnd();
  }

  function doSubmitPolicy() {
    var body = $('modal-body');
    var checked = body.querySelector('input[name="policy-choice"]:checked');
    if (!checked) { toast('Choose one of the three options first.'); return; }
    state.policy = checked.value;
    var note = body.querySelector('#policy-note');
    state.policyNote = note ? note.value : '';
    state.stages.policy = true;
    updateHUD();
    closeModal();
    toast('Recommendation recorded: ' + Econ.policyName(state.policy));
  }

  /* ---------------------------------------------------------------
     GRAPH GALLERY
     --------------------------------------------------------------- */
  function selectGraph(id) {
    currentGraph = id;
    var tabs = document.querySelectorAll('#graph-tabs .tabbtn');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('is-active', tabs[i].getAttribute('data-graph') === id);
    }
    renderGraph();
  }

  /* Deep link: the gallery can be shared or bookmarked per graph.
     Called explicitly when a panel links to a graph (not on every
     tab click, so the URL stays stable while browsing). */
  function linkToGraph(id) {
    selectGraph(id);
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#graph=' + id);
      }
    } catch (e) { /* ignore */ }
  }

  /* Honour a #graph=gN deep link on load and on hash change. */
  function applyHash() {
    var m = /#graph=(g[1-5])/.exec(window.location.hash || '');
    if (!m) return;
    if (currentScreen !== 'graphs') showScreen('graphs');
    if (currentGraph !== m[1]) selectGraph(m[1]);
  }

  function renderGraph() {
    var stage = $('graph-stage'), card = $('graph-card');
    if (!stage || !card) return;
    stage.innerHTML = '';
    card.innerHTML = '';

    var svg;
    if (currentGraph === 'g1') svg = Graphs.graph1({ state: state });
    else if (currentGraph === 'g2') svg = Graphs.graph2({ showLongRun: showLongRun });
    else if (currentGraph === 'g3') svg = Graphs.graph3();
    else if (currentGraph === 'g4') svg = Graphs.graph4();
    else svg = Graphs.graph5();
    stage.appendChild(svg);

    var txt = DRAM.GRAPH_TEXT[currentGraph];
    var html = '<h3>' + esc(txt.title) + '</h3>' +
      '<p><strong>What it shows:</strong> ' + esc(txt.purpose) + '</p>' +
      '<h4>Why the curve moves this way</h4><p>' + esc(txt.cause) + '</p>' +
      '<h4>Elasticity</h4><p>' + esc(txt.elasticity) + '</p>' +
      '<h4>Consumer and producer surplus</h4><p>' + esc(txt.surplus) + '</p>';
    if (txt.tech) html += '<h4>Notes on the model</h4><p>' + esc(txt.tech) + '</p>';
    if (txt.caveat) html += '<h4>Important caveat</h4><p>' + esc(txt.caveat) + '</p>';
    html += '<p class="caption">' + esc(txt.cite) + '</p>';

    if (currentGraph === 'g2') {
      html += '<div class="graph-toggle"><button type="button" class="btn" id="btn-longrun">' +
        (showLongRun ? 'Show the constrained supply curve (S2)' : 'Show the long-run supply curve (toggle)') + '</button></div>';
    }
    if (currentGraph === 'g1') {
      html += '<p class="caption">Your current allocation is shown as the purple marker on the frontier. Move it in the Production Allocation Console.</p>';
    }
    card.innerHTML = html;

    var lr = $('btn-longrun');
    if (lr) {
      lr.addEventListener('click', function () { showLongRun = !showLongRun; renderGraph(); });
    }
  }

  /* ---------------------------------------------------------------
     EVIDENCE SCREEN
     --------------------------------------------------------------- */
  function renderEvidence() {
    var grid = $('evidence-grid');
    if (grid) {
      var html = '';
      for (var i = 0; i < DRAM.SOURCES.length; i++) {
        var s = DRAM.SOURCES[i];
        html += '<article class="evidence-card">' +
          '<div class="org">' + esc(s.org) + '</div>' +
          '<h4>' + esc(s.title) + '</h4>' +
          '<span class="date">' + esc(s.date) + ' &middot; <span class="badge badge-' + s.kind + '">' + esc(s.kindLabel) + '</span></span>' +
          '<h5>Findings</h5><ul>';
        for (var j = 0; j < s.findings.length; j++) html += '<li>' + esc(s.findings[j]) + '</li>';
        html += '</ul><h5>Limitation</h5><p>' + esc(s.limitation) + '</p>' +
          '<h5>Relevance to this project</h5><p>' + esc(s.relevance) + '</p>' +
          '<p><a href="' + s.url + '" target="_blank" rel="noopener">Open the original source</a></p>' +
          '</article>';
      }
      grid.innerHTML = html;
    }

    var chart = $('gartner-chart');
    if (chart) {
      chart.innerHTML = '';
      chart.appendChild(Graphs.gartnerChart());
    }

    var claims = $('claims-list');
    if (claims) {
      var ch = '';
      for (var k = 0; k < DRAM.CLAIMS.length; k++) {
        var c = DRAM.CLAIMS[k];
        ch += '<li><strong>Claim ' + c.n + ' (' + esc(c.question) + ') — ' + esc(c.title) + '.</strong> ' + esc(c.text) +
          ' <em>Supported by: ' + c.sources.map(function (id) {
            var src = null;
            for (var q = 0; q < DRAM.SOURCES.length; q++) if (DRAM.SOURCES[q].id === id) src = DRAM.SOURCES[q];
            return src ? esc(src.org + ', ' + src.date) : id;
          }).join('; ') + '. Model: ' + esc(c.graph) + '.</em></li>';
      }
      claims.innerHTML = ch;
    }
  }

  /* ---------------------------------------------------------------
     GLOSSARY
     --------------------------------------------------------------- */
  function renderGlossary() {
    var list = $('glossary-list');
    if (!list) return;
    var html = '';
    for (var i = 0; i < DRAM.GLOSSARY.length; i++) {
      html += '<div class="entry" data-term="' + esc(DRAM.GLOSSARY[i][0].toLowerCase()) + ' ' + esc(DRAM.GLOSSARY[i][1].toLowerCase()) + '">' +
        '<dt>' + esc(DRAM.GLOSSARY[i][0]) + '</dt><dd>' + esc(DRAM.GLOSSARY[i][1]) + '</dd></div>';
    }
    list.innerHTML = html;
    var count = $('glossary-count');
    if (count) count.textContent = DRAM.GLOSSARY.length + ' terms';
  }

  function filterGlossary(q) {
    var list = $('glossary-list');
    if (!list) return;
    var entries = list.querySelectorAll('.entry');
    var shown = 0;
    var needle = (q || '').toLowerCase().trim();
    for (var i = 0; i < entries.length; i++) {
      var hit = !needle || entries[i].getAttribute('data-term').indexOf(needle) !== -1;
      entries[i].hidden = !hit;
      if (hit) shown++;
    }
    var count = $('glossary-count');
    if (count) count.textContent = shown + ' of ' + DRAM.GLOSSARY.length + ' terms shown';
  }

  /* ---------------------------------------------------------------
     KNOWLEDGE CHECK
     --------------------------------------------------------------- */
  function renderQuiz() {
    var c = $('quiz-container');
    if (!c) return;
    var html = '';
    for (var i = 0; i < DRAM.QUIZ.length; i++) {
      var q = DRAM.QUIZ[i];
      html += '<div class="quiz-item" data-q="' + i + '"><h3>' + (i + 1) + '. ' + esc(q.q) + '</h3><ul class="quiz-options">';
      for (var j = 0; j < q.options.length; j++) {
        html += '<li><button type="button" data-opt="' + j + '">' + String.fromCharCode(65 + j) + '. ' + esc(q.options[j]) + '</button></li>';
      }
      html += '</ul><div class="quiz-feedback" hidden></div>' +
        '<div class="form-actions"><button type="button" class="btn" data-action="retry">Try again</button></div></div>';
    }
    c.innerHTML = html;

    var buttons = c.querySelectorAll('.quiz-options button');
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].addEventListener('click', function (e) {
        var btn = e.currentTarget;
        var item = btn.closest('.quiz-item');
        var idx = parseInt(item.getAttribute('data-q'), 10);
        var opt = parseInt(btn.getAttribute('data-opt'), 10);
        var q = DRAM.QUIZ[idx];
        var opts = item.querySelectorAll('.quiz-options button');
        for (var k = 0; k < opts.length; k++) {
          opts[k].classList.remove('is-correct', 'is-wrong');
          opts[k].disabled = false;
        }
        var fb = item.querySelector('.quiz-feedback');
        fb.hidden = false;
        if (opt === q.correct) {
          item.setAttribute('data-result', 'correct');
          btn.classList.add('is-correct');
          fb.innerHTML = '<strong>Correct.</strong> ' + esc(q.explanation);
          fb.style.borderLeftColor = '#3aa76d';
          for (var k2 = 0; k2 < opts.length; k2++) opts[k2].disabled = true;
        } else {
          item.setAttribute('data-result', 'wrong');
          btn.classList.add('is-wrong');
          fb.innerHTML = '<strong>Not quite.</strong> ' + esc(q.explanation) + ' <br><em>Select the answer highlighted in green to continue, or use "Try again".</em>';
          fb.style.borderLeftColor = '#c8544f';
          opts[q.correct].classList.add('is-correct');
        }
        updateQuizScore();
      });
    }

    var retries = c.querySelectorAll('[data-action="retry"]');
    for (var r = 0; r < retries.length; r++) {
      retries[r].addEventListener('click', function (e) {
        var item = e.currentTarget.closest('.quiz-item');
        var opts = item.querySelectorAll('.quiz-options button');
        for (var k = 0; k < opts.length; k++) {
          opts[k].classList.remove('is-correct', 'is-wrong');
          opts[k].disabled = false;
        }
        var fb = item.querySelector('.quiz-feedback');
        fb.hidden = true;
        updateQuizScore();
      });
    }
    updateQuizScore();
  }

  function updateQuizScore() {
    var items = document.querySelectorAll('.quiz-item');
    var correct = 0, answered = 0;
    for (var i = 0; i < items.length; i++) {
      var res = items[i].getAttribute('data-result');
      if (res === 'correct') { correct++; answered++; }
      else if (res === 'wrong') { answered++; }
    }
    var res2 = $('quiz-result');
    if (!res2) return;
    if (answered > 0) {
      res2.hidden = false;
      $('quiz-result-text').textContent = correct + ' correct out of ' + answered + ' answered (' + DRAM.QUIZ.length + ' questions total). You can retry any question.';
    } else { res2.hidden = true; }
  }

  /* ---------------------------------------------------------------
     DEBRIEF
     --------------------------------------------------------------- */
  function renderDebrief() {
    var host = $('debrief-content');
    if (!host) return;
    if (!state.finalScore) state.finalScore = Econ.computeScore(state);
    var sc = state.finalScore;

    var dims = '';
    for (var i = 0; i < sc.dimensions.length; i++) {
      var d = sc.dimensions[i];
      dims += '<div class="score-box"><h4>' + esc(d.name) + '</h4><div class="big">' + d.value + '<span style="font-size:1rem;">/100</span></div>' +
        '<p>' + esc(d.note) + '</p></div>';
    }

    var comm = '';
    for (var j = 0; j < sc.commentary.length; j++) comm += '<li>' + esc(sc.commentary[j]) + '</li>';

    var log = '';
    for (var k = 0; k < state.history.length; k++) {
      var r = state.history[k];
      log += '<tr><td>' + esc(r.label) + '</td><td>' + Math.round(r.allocConv) + ' / ' + Math.round(r.allocHbm) + '</td>' +
        '<td>' + fmt(r.convOutput, 0) + '</td><td>' + fmt(r.hbmOutput, 0) + '</td>' +
        '<td>' + fmt(r.priceDram, 0) + '</td><td>' + fmt(r.shortage, 1) + '</td>' +
        '<td>' + fmt(r.pricePc, 0) + '</td><td>' + fmt(r.pcShipments, 0) + '</td>' +
        '<td>' + money(r.credits) + '</td></tr>';
    }

    host.innerHTML =
      '<div class="grade-box"><div class="big">' + sc.grade + '</div><p><strong>Overall score: ' + sc.total + '/100</strong> — ' +
      'assessed across five competing objectives. Maximising only HBM or only conventional DRAM does not produce the highest score: ' +
      'the scenario is built so that supply, profit, resilience, server customers and public money pull in different directions.</p></div>' +
      '<div class="score-grid">' + dims + '</div>' +
      '<div class="card"><h3>What you decided</h3>' +
      '<ul><li>Final allocation: ' + (state.history.length ? Math.round(state.history[state.history.length - 1].allocConv) + ' tokens conventional / ' + Math.round(state.history[state.history.length - 1].allocHbm) + ' tokens HBM' : 'no production cycles') + '</li>' +
      '<li>Investment: ' + (state.projects.length ? state.projects.map(function (p) { return esc(p.name); }).join(', ') : 'none') + '</li>' +
      '<li>Policy recommendation: <strong>' + esc(state.policy ? Econ.policyName(state.policy) : 'none made') + '</strong></li>' +
      (state.policyNote ? '<li>Your reasoning: "' + esc(state.policyNote) + '"</li>' : '') +
      '<li>Periods completed: ' + state.totals.cycles + ' of ' + CFG.maxPeriods + '</li></ul></div>' +
      '<div class="card"><h3>Period by period</h3><table class="data-table"><thead><tr>' +
      '<th>Period</th><th>Conv / HBM tokens</th><th>Conv output</th><th>HBM output</th><th>DRAM price</th><th>Shortage</th><th>PC price</th><th>PC shipments</th><th>Credits</th>' +
      '</tr></thead><tbody>' + log + '</tbody></table></div>' +
      '<div class="card"><h3>Debrief: the trade-offs you faced</h3><ul>' + comm + '</ul>' +
      '<p class="tiny">These scores use illustrative simulation parameters and are a teaching device, not a forecast of DRAM industry outcomes.</p></div>';

    var db = $('btn-debrief');
    if (db) db.disabled = false;
  }

  /* ---------------------------------------------------------------
     PRINT LENGTH ESTIMATE (A4, 14mm margins)
     Measures the brief at the printed text width so the teacher is
     told the page count rather than guessing at it.
     --------------------------------------------------------------- */
  function estimatePrintPages() {
    var article = document.getElementById('brief-article');
    if (!article) return null;
    var host = document.createElement('div');
    host.className = 'print-metrics';
    host.setAttribute('aria-hidden', 'true');
    var clone = article.cloneNode(true);
    var foot = clone.querySelector('.brief-foot');
    if (foot && foot.parentNode) foot.parentNode.removeChild(foot);
    host.appendChild(clone);
    document.body.appendChild(host);
    var heightPx = host.scrollHeight;
    document.body.removeChild(host);

    var pxPerMm = 96 / 25.4;
    var pageHeightMm = 297 - 18;           /* A4 height minus the 9mm top/bottom margins */
    var heightMm = heightPx / pxPerMm;
    return {
      heightMm: heightMm,
      pages: Math.max(1, Math.ceil(heightMm / pageHeightMm)),
      heightPx: heightPx
    };
  }

  /* ---------------------------------------------------------------
     RESET / REPLAY
     --------------------------------------------------------------- */
  function resetGame(keepPolicy) {
    var policy = keepPolicy ? state.policy : null;
    var note = keepPolicy ? state.policyNote : '';
    state = Econ.createState();
    Econ.initMarkets(state);
    state.policy = policy;
    state.policyNote = note;
    if (policy) state.stages.policy = true;
    state.finalScore = null;
    closeModal();
    if (paused) togglePause();
    DRAM.Game.rebuild();
    updateHUD();
    showScreen('game');
    toast(keepPolicy ? 'New run started with your previous policy recommendation.' : 'Game reset.');
  }

  /* ---------------------------------------------------------------
     WIRING
     --------------------------------------------------------------- */
  function init() {
    /* navigation */
    var navBtns = document.querySelectorAll('[data-screen]');
    for (var i = 0; i < navBtns.length; i++) {
      navBtns[i].addEventListener('click', function (e) {
        var name = e.currentTarget.getAttribute('data-screen');
        if (name === 'game' && !state.started) { state.started = true; }
        showScreen(name);
      });
    }

    $('btn-start').addEventListener('click', function () {
      state.started = true;
      showScreen('game');
    });
    $('btn-pause').addEventListener('click', togglePause);
    $('btn-overlay-resume').addEventListener('click', function () { if (paused) togglePause(); });
    $('btn-reset').addEventListener('click', function () { resetGame(false); });
    $('btn-reset-2').addEventListener('click', function () { resetGame(false); });
    $('btn-replay').addEventListener('click', function () { resetGame(true); });
    $('btn-debrief').addEventListener('click', function () { showScreen('debrief'); });
    $('modal-close').addEventListener('click', closeModal);
    $('btn-print-brief').addEventListener('click', function () { window.print(); });
    $('btn-print-check').addEventListener('click', function () {
      var est = estimatePrintPages();
      var out = $('print-check-result');
      if (!est || !out) return;
      out.textContent = 'Estimated printed length: ' + est.pages + ' A4 page' + (est.pages === 1 ? '' : 's') +
        ' (measured height ' + Math.round(est.heightMm) + ' mm at A4 text width).';
      if (window.console) console.log('Policy Brief print estimate: ' + est.pages + ' A4 page(s), ' + Math.round(est.heightMm) + ' mm tall.');
    });
    $('btn-diagnostics').addEventListener('click', function () {
      var res = window.DRAM.Tests.run();
      var html = '<p><strong>' + res.passed + ' of ' + res.total + ' checks passed.</strong></p>' +
        '<table class="data-table"><thead><tr><th>#</th><th>Check</th><th>Result</th></tr></thead><tbody>';
      for (var j = 0; j < res.results.length; j++) {
        html += '<tr><td>' + (j + 1) + '</td><td>' + esc(res.results[j].name) + '</td><td class="' + (res.results[j].pass ? 't-good' : 't-bad') + '">' +
          (res.results[j].pass ? 'PASS' : 'FAIL') + (res.results[j].detail ? ' — ' + esc(res.results[j].detail) : '') + '</td></tr>';
      }
      html += '</tbody></table><div class="form-actions"><button type="button" class="btn btn-primary" data-action="close-panel">Close</button></div>';
      openModal('Diagnostics', html);
    });

    /* Modal actions are handled by ONE delegated listener on the body,
       so every [data-action] button in every panel is guaranteed to work
       and no panel can re-register duplicate handlers. */
    $('modal-body').addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
      if (!el) return;
      handleModalAction(el, e);
    });

    /* Modal backdrop: only a click on the backdrop itself closes the
       panel. Clicks inside the card stop propagating, so a click on a
       button can never be mistaken for a backdrop click. */
    var modalEl = $('modal');
    var modalCard = modalEl.querySelector('.modal-card');
    if (modalCard) {
      modalCard.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      modalCard.addEventListener('click', function (e) { e.stopPropagation(); });
    }
    modalEl.addEventListener('mousedown', function (e) {
      if (e.target === modalEl) closeModal();
    });
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeModal();
    });

    /* graph tabs */
    var tabs = document.querySelectorAll('#graph-tabs .tabbtn');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener('click', function (e) { selectGraph(e.currentTarget.getAttribute('data-graph')); });
    }

    /* glossary search */
    var search = $('glossary-search');
    if (search) search.addEventListener('input', function () { filterGlossary(search.value); });

    /* quiz retry all */
    var qr = $('btn-quiz-retry');
    if (qr) qr.addEventListener('click', function () { renderQuiz(); });

    /* station handling */
    DRAM.Game.setStationHandler(function (id) {
      if (id === 'allocation') panelAllocation();
      else if (id === 'production') panelProduction();
      else if (id === 'market') panelMarket();
      else if (id === 'rnd') panelRnd();
      else if (id === 'policy') panelPolicy();
      else if (id === 'archive') panelArchive();
    });

    renderEvidence();
    renderGlossary();
    renderQuiz();
    renderGraph();
    updateHUD();

    window.addEventListener('hashchange', applyHash);
    applyHash();

    setInterval(function () { updatePrompt(); updateHUD(); }, 200);
  }

  DRAM.UI = {
    init: init,
    state: function () { return state; },
    showScreen: showScreen,
    openModal: openModal,
    closeModal: closeModal,
    togglePause: togglePause,
    isGameFocused: isGameFocused,
    isGameScreen: isGameScreen,
    isModalOpen: isModalOpen,
    blocksMovement: blocksMovement,
    resetGame: resetGame,
    estimatePrintPages: estimatePrintPages,
    renderDebrief: renderDebrief,
    selectGraph: selectGraph,
    linkToGraph: linkToGraph,
    toast: toast
  };
})();
