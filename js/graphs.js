/* ============================================================
   DRAM Factory Tycoon — graphs.js
   SVG generation for the five required economic models plus the
   Gartner PC-shipment evidence chart.
   ------------------------------------------------------------
   INTEGRITY NOTE: every axis value here is an ILLUSTRATIVE INDEX
   chosen for teaching. These are conceptual diagrams, not empirical
   data plots, and no numerical elasticity coefficient is implied.
   ============================================================ */
(function () {
  'use strict';

  var DRAM = window.DRAM;
  var GM = DRAM.CONFIG.GRAPH_MODEL;
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- small SVG helpers ---------- */
  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    if (attrs) { for (var k in attrs) { if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]); } }
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }

  /* Labels get a white halo so they stay readable where they cross a
     curve, a dashed reference line or another label. */
  var HALO = { 'paint-order': 'stroke', stroke: '#ffffff', 'stroke-width': 3, 'stroke-linejoin': 'round' };

  function labelEl(x, y, str, attrs, anchor) {
    var a = {};
    if (attrs) for (var k in attrs) a[k] = attrs[k];
    for (var h in HALO) a[h] = HALO[h];
    a.x = x; a.y = y;
    if (anchor) a['text-anchor'] = anchor;
    return el('text', a, str);
  }
  function safe(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }

  /* ---------- market maths (inverse curves) ---------- */
  /* Demand : P = a - bQ      Supply : P = a + bQ
     Equilibrium: Q* = (a_d - a_s)/(b_d + b_s),  P* = a_d - b_d Q*      */
  function eq(demand, supply) {
    var ad = demand.a + (demand.dshift || 0);
    var as = supply.a + (supply.sshift || 0);
    var Q = (ad - as) / (demand.b + supply.b);
    var P = ad - demand.b * Q;
    return { Q: Q, P: P };
  }
  function demandP(d, Q) { return d.a - d.b * Q + (d.dshift || 0); }
  function supplyP(s, Q) { return s.a + s.b * Q + (s.sshift || 0); }

  /* ---------- axis helpers ---------- */
  function niceStep(range, target) {
    var raw = range / (target || 6);
    var pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var f = raw / pow;
    var step;
    if (f <= 1) step = 1; else if (f <= 2) step = 2; else if (f <= 5) step = 5; else step = 10;
    return step * pow;
  }
  function ticks(min, max, target) {
    var step = niceStep(max - min, target), out = [], v;
    for (v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
      out.push(Math.round(v * 1e6) / 1e6);
    }
    return out;
  }

  var COLORS = {
    demand: '#2f6fb5', supply: '#b5483f', subsidy: '#2e8b6b',
    conv: '#3fa7d6', hbm: '#f0a63c', ink: '#10161b', dim: '#5b6b76',
    grid: '#d8dfe4', arrow: '#10161b', marker: '#7b2fa0'
  };

  /* ============================================================
     CORE GRAPH BUILDER
     ============================================================ */
  function buildGraph(o) {
    var W = o.width || 900, H = o.height || 520;
    var m = { t: 52, r: 34, b: 70, l: 84 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var x0 = o.xMin || 0, x1 = o.xMax, y0 = o.yMin || 0, y1 = o.yMax;

    function X(v) { return m.l + (v - x0) / (x1 - x0) * iw; }
    function Y(v) { return H - m.b - (v - y0) / (y1 - y0) * ih; }

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: 'auto',
      xmlns: NS, role: 'img', 'aria-label': o.ariaLabel || o.title,
      preserveAspectRatio: 'xMidYMid meet'
    });

    /* defs: arrowheads + hatch */
    var defs = el('defs');
    ['arrow-ink', 'arrow-blue', 'arrow-red', 'arrow-green', 'arrow-purple'].forEach(function (id, i) {
      var colors = [COLORS.arrow, COLORS.demand, COLORS.supply, COLORS.subsidy, COLORS.marker];
      var mk = el('marker', {
        id: id, viewBox: '0 0 10 10', refX: 9, refY: 5,
        markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse'
      });
      mk.appendChild(el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: colors[i] }));
      defs.appendChild(mk);
    });
    var hatch = el('pattern', { id: 'hatch-green', width: 7, height: 7, patternTransform: 'rotate(45)', patternUnits: 'userSpaceOnUse' });
    hatch.appendChild(el('rect', { width: 7, height: 7, fill: 'rgba(46,139,107,0.16)' }));
    hatch.appendChild(el('line', { x1: 0, y1: 0, x2: 0, y2: 7, stroke: COLORS.subsidy, 'stroke-width': 1.6 }));
    defs.appendChild(hatch);
    svg.appendChild(defs);

    /* background */
    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff' }));

    /* title */
    var title = el('text', { x: W / 2, y: 26, 'text-anchor': 'middle', 'font-family': 'Segoe UI, Arial, sans-serif',
      'font-size': 18, 'font-weight': 700, fill: COLORS.ink }, o.title);
    svg.appendChild(title);
    if (o.subtitle) {
      svg.appendChild(el('text', { x: W / 2, y: 44, 'text-anchor': 'middle', 'font-family': 'Segoe UI, Arial, sans-serif',
        'font-size': 12.5, fill: COLORS.dim, 'font-style': 'italic' }, o.subtitle));
    }

    var g = el('g');
    svg.appendChild(g);

    /* grid + ticks */
    var xt = ticks(x0, x1, 7), yt = ticks(y0, y1, 6);
    xt.forEach(function (v) {
      var px = X(v);
      if (!isFinite(px)) return;
      g.appendChild(el('line', { x1: px, y1: m.t, x2: px, y2: H - m.b, stroke: COLORS.grid, 'stroke-width': 1 }));
      g.appendChild(el('text', { x: px, y: H - m.b + 20, 'text-anchor': 'middle', 'font-family': 'Segoe UI, Arial, sans-serif',
        'font-size': 12.5, fill: COLORS.ink }, v));
    });
    yt.forEach(function (v) {
      var py = Y(v);
      if (!isFinite(py)) return;
      g.appendChild(el('line', { x1: m.l, y1: py, x2: W - m.r, y2: py, stroke: COLORS.grid, 'stroke-width': 1 }));
      g.appendChild(el('text', { x: m.l - 10, y: py + 4, 'text-anchor': 'end', 'font-family': 'Segoe UI, Arial, sans-serif',
        'font-size': 12.5, fill: COLORS.ink }, v));
    });

    /* axes */
    g.appendChild(el('line', { x1: m.l, y1: H - m.b, x2: W - m.r, y2: H - m.b, stroke: COLORS.ink, 'stroke-width': 2 }));
    g.appendChild(el('line', { x1: m.l, y1: m.t, x2: m.l, y2: H - m.b, stroke: COLORS.ink, 'stroke-width': 2 }));

    /* axis titles */
    g.appendChild(el('text', { x: m.l + iw / 2, y: H - 14, 'text-anchor': 'middle', 'font-family': 'Segoe UI, Arial, sans-serif',
      'font-size': 14.5, 'font-weight': 700, fill: COLORS.ink }, o.xLabel));
    g.appendChild(el('text', { x: 18, y: m.t + ih / 2, 'text-anchor': 'middle', 'font-family': 'Segoe UI, Arial, sans-serif',
      'font-size': 14.5, 'font-weight': 700, fill: COLORS.ink, transform: 'rotate(-90 18 ' + (m.t + ih / 2) + ')' }, o.yLabel));

    /* shaded regions (drawn under curves) */
    (o.regions || []).forEach(function (rg) {
      var x = X(rg.x1), y = Y(rg.y2), w = X(rg.x2) - X(rg.x1), h = Y(rg.y1) - Y(rg.y2);
      if (![x, y, w, h].every(function (n) { return isFinite(n); })) return;
      g.appendChild(el('rect', { x: x, y: y, width: w, height: h, fill: rg.fill || 'rgba(46,139,107,0.18)',
        stroke: rg.stroke || 'none', 'stroke-width': 1.2, 'stroke-dasharray': rg.dash || 'none' }));
    });

    /* horizontal / vertical reference lines */
    (o.hLines || []).forEach(function (hl) {
      var py = Y(hl.y);
      if (!isFinite(py)) return;
      g.appendChild(el('line', { x1: m.l, y1: py, x2: W - m.r, y2: py, stroke: hl.color || COLORS.dim,
        'stroke-width': hl.width || 1.4, 'stroke-dasharray': hl.dash || '6 4' }));
      if (hl.label) {
        g.appendChild(labelEl(hl.labelX !== undefined ? hl.labelX : (W - m.r - 6), py - 6, hl.label,
          { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 12.5, 'font-weight': 700, fill: hl.color || COLORS.dim },
          hl.labelAnchor || 'end'));
      }
    });
    (o.vLines || []).forEach(function (vl) {
      var px = X(vl.x);
      if (!isFinite(px)) return;
      g.appendChild(el('line', { x1: px, y1: m.t, x2: px, y2: H - m.b, stroke: vl.color || COLORS.dim,
        'stroke-width': vl.width || 1.2, 'stroke-dasharray': vl.dash || '4 4' }));
      if (vl.label) {
        g.appendChild(labelEl(px + 5, vl.labelY || (m.t + 14), vl.label,
          { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 12, 'font-weight': 700, fill: vl.color || COLORS.dim },
          'start'));
      }
    });

    /* curves */
    (o.curves || []).forEach(function (c) {
      var isD = c.type === 'd';
      var a = c.a, b = c.b, sh = isD ? (c.dshift || 0) : (c.sshift || 0);
      var qLo = 0, qHi = x1;
      if (isD) {
        qHi = (a + sh) / b;                       // P = 0
        qLo = Math.max(0, (a + sh - y1) / b);      // P = yMax
      } else {
        qLo = Math.max(0, (-(a + sh)) / b);        // P = 0
        qHi = (y1 - (a + sh)) / b;                 // P = yMax
      }
      qLo = Math.max(qLo, x0); qHi = Math.min(qHi, x1);
      if (!(qHi > qLo)) return;
      var pts = [], i, N = 120, q, p;
      for (i = 0; i <= N; i++) {
        q = qLo + (qHi - qLo) * i / N;
        p = isD ? (a - b * q + sh) : (a + b * q + sh);
        if (!isFinite(p)) continue;
        p = Math.max(y0 - 0.001, Math.min(y1 + 0.001, p));
        pts.push(X(q).toFixed(2) + ',' + Y(p).toFixed(2));
      }
      if (pts.length < 2) return;
      g.appendChild(el('path', {
        d: 'M ' + pts.join(' L '), fill: 'none', stroke: c.color,
        'stroke-width': c.width || 3, 'stroke-dasharray': c.dash || 'none',
        'stroke-linecap': 'round', opacity: c.opacity || 1
      }));
      /* curve label placed on the curve */
      if (c.label) {
        var lq = c.labelQ !== undefined ? c.labelQ : (qLo + (qHi - qLo) * 0.22);
        var lp = isD ? (a - b * lq + sh) : (a + b * lq + sh);
        if (isFinite(lp)) {
          var lx = X(lq), ly = Y(Math.max(y0, Math.min(y1, lp)));
          if (isFinite(lx) && isFinite(ly)) {
            g.appendChild(labelEl(lx + (c.labelDx || 6), ly + (c.labelDy || -7), c.label,
              { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 13, 'font-weight': 700, fill: c.color }));
          }
        }
      }
    });

    /* arrows */
    (o.arrows || []).forEach(function (ar) {
      var x1p = X(ar.x1), y1p = Y(ar.y1), x2p = X(ar.x2), y2p = Y(ar.y2);
      if (![x1p, y1p, x2p, y2p].every(function (n) { return isFinite(n); })) return;
      g.appendChild(el('line', { x1: x1p, y1: y1p, x2: x2p, y2: y2p, stroke: ar.color || COLORS.arrow,
        'stroke-width': ar.width || 2.4, 'marker-end': 'url(#' + (ar.marker || 'arrow-ink') + ')' }));
      if (ar.label) {
        /* labelDx / labelDy are pixel offsets from the arrow's midpoint;
           labelX / labelY (if given) are data coordinates. */
        var lx, ly;
        if (ar.labelDx !== undefined || ar.labelDy !== undefined) {
          lx = (x1p + x2p) / 2 + (ar.labelDx || 0);
          ly = (y1p + y2p) / 2 + (ar.labelDy || 0);
        } else {
          lx = X(ar.labelX !== undefined ? ar.labelX : (ar.x1 + ar.x2) / 2);
          ly = Y(ar.labelY !== undefined ? ar.labelY : (ar.y1 + ar.y2) / 2);
        }
        g.appendChild(labelEl(lx, ly, ar.label,
          { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 12.5, 'font-weight': 700, fill: ar.color || COLORS.ink },
          ar.anchor || 'middle'));
      }
    });

    /* equilibrium / data points */
    (o.points || []).forEach(function (p) {
      var px = X(p.x), py = Y(p.y);
      if (!isFinite(px) || !isFinite(py)) return;
      if (p.box) {
        g.appendChild(el('rect', { x: px - 4, y: py - 4, width: 8, height: 8,
          fill: p.color || COLORS.ink, stroke: '#fff', 'stroke-width': 1.2 }));
      } else {
        g.appendChild(el('circle', { cx: px, cy: py, r: p.r || 5.5, fill: p.color || COLORS.ink,
          stroke: '#fff', 'stroke-width': 1.5 }));
      }
      if (p.label) {
        g.appendChild(labelEl(px + (p.labelDx !== undefined ? p.labelDx : 10),
          py + (p.labelDy !== undefined ? p.labelDy : -10), p.label,
          { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': p.labelSize || 13, 'font-weight': 700, fill: p.color || COLORS.ink },
          p.anchor || 'start'));
      }
      if (p.sub) {
        g.appendChild(labelEl(px + (p.subDx !== undefined ? p.subDx : 10),
          py + (p.subDy !== undefined ? p.subDy : 6), p.sub,
          { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 12, fill: COLORS.dim },
          p.subAnchor || 'start'));
      }
    });

    /* free annotations */
    (o.annotations || []).forEach(function (an) {
      var px = X(an.x), py = Y(an.y);
      if (!isFinite(px) || !isFinite(py)) return;
      g.appendChild(labelEl(px + (an.dx || 0), py + (an.dy || 0), an.text,
        { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': an.size || 12.5,
          'font-weight': an.weight || 400, fill: an.color || COLORS.ink },
        an.anchor || 'start'));
    });

    /* legend */
    if (o.legend && o.legend.length) {
      var lx = o.legendX !== undefined ? o.legendX : (m.l + 6);
      var ly = o.legendY !== undefined ? o.legendY : (m.t + 8), k;
      for (k = 0; k < o.legend.length; k++) {
        var item = o.legend[k];
        g.appendChild(el('line', { x1: lx, y1: ly + k * 18, x2: lx + 26, y2: ly + k * 18,
          stroke: item.color, 'stroke-width': item.dash ? 2.4 : 3, 'stroke-dasharray': item.dash || 'none' }));
        g.appendChild(el('text', { x: lx + 32, y: ly + k * 18 + 4, 'font-family': 'Segoe UI, Arial, sans-serif',
          'font-size': 12.5, fill: COLORS.ink }, item.label));
      }
    }

    /* footnote */
    if (o.footnote) {
      g.appendChild(el('text', { x: m.l, y: H - 2, 'font-family': 'Segoe UI, Arial, sans-serif',
        'font-size': 11, 'font-style': 'italic', fill: COLORS.dim }, o.footnote));
    }

    svg.__meta = {
      curveCount: (o.curves || []).length,
      pointCount: (o.points || []).length,
      title: o.title, xLabel: o.xLabel, yLabel: o.yLabel
    };
    return svg;
  }

  /* ============================================================
     GRAPH 1 — PRODUCTION POSSIBILITIES CURVE
     ============================================================ */
  function graph1(opts) {
    opts = opts || {};
    var state = opts.state;
    var frontier = DRAM.Econ.ppcFrontier(state || DRAM.Econ.createState(), 60);
    var gain = GM.ppc.outerGain;

    var xMax = GM.ppc.maxConv * (1 + gain) * 1.12;
    var yMax = GM.ppc.maxHbm * (1 + gain) * 1.15;

    function pathFrom(pts, keyX, keyY, scale) {
      var d = '', i;
      for (i = 0; i < pts.length; i++) {
        d += (i === 0 ? 'M ' : ' L ') +
          X(pts[i][keyX] * scale).toFixed(2) + ',' + Y(pts[i][keyY] * scale).toFixed(2);
      }
      return d;
    }

    var A = { alloc: 75 }, B = { alloc: 25 };
    var econ = state || DRAM.Econ.createState();
    A.conv = DRAM.Econ.convUnits(75, econ); A.hbm = DRAM.Econ.hbmUnits(25, econ);
    B.conv = DRAM.Econ.convUnits(25, econ); B.hbm = DRAM.Econ.hbmUnits(75, econ);

    var svg = buildGraph({
      title: 'Allocating Scarce Production Resources: Conventional DRAM vs HBM',
      subtitle: 'Unit 1 model — conceptual, index-based output (not global production data)',
      ariaLabel: 'Production possibilities curve showing conventional DRAM output against HBM output',
      xLabel: 'Conventional DRAM output index (DDR4/DDR5)',
      yLabel: 'HBM output index',
      xMax: xMax, yMax: yMax,
      curves: []
    });

    /* rebuild manually because the frontier is not a linear curve */
    var g = svg.querySelector('g');
    var m = { t: 52, r: 34, b: 70, l: 84 };
    var W = 900, H = 520, iw = W - m.l - m.r, ih = H - m.t - m.b;
    function X(v) { return m.l + v / xMax * iw; }
    function Y(v) { return H - m.b - v / yMax * ih; }

    /* outer (shifted-out) frontier first, so it sits behind */
    g.appendChild(el('path', {
      d: pathFrom(frontier, 'conv', 'hbm', 1 + gain), fill: 'none', stroke: COLORS.dim,
      'stroke-width': 2.4, 'stroke-dasharray': '9 6', opacity: 0.95
    }));
    g.appendChild(labelEl(X(8), Y(71), 'New PPC: extra capacity / technology',
      { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 13, 'font-weight': 700, fill: COLORS.dim }, 'start'));
    /* inner frontier */
    g.appendChild(el('path', {
      d: pathFrom(frontier, 'conv', 'hbm', 1), fill: 'none', stroke: COLORS.ink, 'stroke-width': 3.2
    }));
    g.appendChild(labelEl(X(8), Y(58), 'Current PPC (finite resources & technology)',
      { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 13, 'font-weight': 700, fill: COLORS.ink }, 'start'));

    /* A, B, C, D */
    var pts = [
      { x: A.conv, y: A.hbm, label: 'A', color: COLORS.conv, sub: 'more conventional DRAM', labelDx: 12, labelDy: -8 },
      { x: B.conv, y: B.hbm, label: 'B', color: COLORS.hbm, sub: 'more HBM', labelDx: 12, labelDy: -8 },
      { x: 60, y: 15, label: 'C', color: COLORS.dim, sub: 'inefficient / underused resources', labelDx: 12, labelDy: -8 },
      { x: 120, y: 30, label: 'D', color: COLORS.marker, sub: 'unattainable with current resources', labelDx: 12, labelDy: -8 }
    ];
    pts.forEach(function (p) {
      var px = X(p.x), py = Y(p.y);
      g.appendChild(el('circle', { cx: px, cy: py, r: 6, fill: p.color, stroke: '#fff', 'stroke-width': 1.6 }));
      g.appendChild(labelEl(px + p.labelDx, py + p.labelDy, p.label,
        { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 14, 'font-weight': 800, fill: p.color }, 'start'));
      g.appendChild(labelEl(px + p.labelDx, py + p.labelDy + 16, p.sub,
        { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 12, fill: COLORS.dim }, 'start'));
    });

    /* movement arrow A -> B along the frontier */
    var ax = X(A.conv), ay = Y(A.hbm), bx = X(B.conv), by = Y(B.hbm);
    g.appendChild(el('line', { x1: ax, y1: ay - 14, x2: bx, y2: by + 14, stroke: COLORS.marker,
      'stroke-width': 2.6, 'marker-end': 'url(#arrow-purple)', 'stroke-dasharray': '7 4' }));
    /* label placed in clear space with a leader line back to the arrow */
    g.appendChild(el('line', { x1: X(140), y1: Y(58), x2: (ax + bx) / 2 + 30, y2: (ay + by) / 2 - 6,
      stroke: COLORS.marker, 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.8 }));
    g.appendChild(labelEl(X(140), Y(58), 'Reallocation of resources',
      { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 13, 'font-weight': 700, fill: COLORS.marker }, 'start'));

    /* opportunity cost callout (placed in the empty lower-left region) */
    g.appendChild(labelEl(X(8), Y(27), 'Opportunity cost: producing more HBM',
      { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 12.5, fill: COLORS.ink }, 'start'));
    g.appendChild(labelEl(X(8), Y(23), 'means giving up some conventional DRAM output.',
      { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 12.5, fill: COLORS.ink }, 'start'));
    g.appendChild(labelEl(X(8), Y(19), '(not a one-for-one conversion of identical lines)',
      { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 12, 'font-style': 'italic', fill: COLORS.dim }, 'start'));

    /* player marker */
    if (state) {
      var a = DRAM.Econ.effectiveAllocations(state);
      var pc_ = DRAM.Econ.convUnits(a.convTokens, state), ph = DRAM.Econ.hbmUnits(a.hbmTokens, state);
      var px = X(pc_), py = Y(ph);
      if (isFinite(px) && isFinite(py) && px <= W - m.r && py >= m.t) {
        g.appendChild(el('circle', { cx: px, cy: py, r: 8, fill: 'none', stroke: COLORS.marker, 'stroke-width': 3 }));
        g.appendChild(el('circle', { cx: px, cy: py, r: 2.6, fill: COLORS.marker }));
        /* A, B, C and D all carry their own label to the RIGHT of the point.
           When the player's allocation lands on one of them, the marker
           label is flipped to the left so the two never overlap. */
        var onNamedPoint = false;
        pts.forEach(function (p) {
          if (Math.abs(X(p.x) - px) < 40 && Math.abs(Y(p.y) - py) < 28) onNamedPoint = true;
        });
        g.appendChild(labelEl(onNamedPoint ? px - 12 : px + 12, py + 4, 'your allocation',
          { 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 12.5, 'font-weight': 700, fill: COLORS.marker },
          onNamedPoint ? 'end' : 'start'));
      }
    }

    svg.__meta.curveCount = 2;
    svg.__meta.pointCount = 4;
    svg.__meta.extra = 'shift:frontier';
    return svg;
  }

  /* ============================================================
     GRAPH 2 — CONVENTIONAL DRAM SUPPLY AND DEMAND
     ============================================================ */
  function graph2(opts) {
    opts = opts || {};
    var D = GM.dram;
    var e1 = eq(D.demand, D.supply1);
    var e2 = eq(D.demand, D.supply2);
    var showLong = !!opts.showLongRun;

    var yMax = 150, xMax = 130;

    var curves = [
      { type: 'd', a: D.demand.a, b: D.demand.b, color: COLORS.demand, label: 'D', labelQ: 22, labelDx: 8, labelDy: 0 },
      { type: 's', a: D.supply1.a, b: D.supply1.b, color: COLORS.supply, label: 'S1 (short-run supply)', labelQ: 8, labelDx: 8, labelDy: -6 }
    ];
    if (showLong) {
      curves.push({ type: 's', a: D.supplyLong.a, b: D.supplyLong.b, color: '#7b5aa6', dash: '8 5',
        label: 'S long-run (flatter = more elastic)', labelQ: 40, labelDx: 8, labelDy: -6 });
    } else {
      curves.push({ type: 's', a: D.supply2.a, b: D.supply2.b, color: '#d2762f', dash: '7 5',
        label: 'S2 (constrained supply)', labelQ: 8, labelDx: 8, labelDy: 16 });
    }

    var svg = buildGraph({
      title: 'Global Conventional DRAM Market: Supply Constraint and Equilibrium Adjustment',
      subtitle: 'Market 1 — illustrative index values, ceteris paribus',
      ariaLabel: 'Conventional DRAM supply and demand diagram with a leftward supply shift',
      xLabel: 'Conventional DRAM quantity index',
      yLabel: 'Conventional DRAM price index',
      xMax: xMax, yMax: yMax,
      curves: curves,
      hLines: [{ y: e1.P, color: COLORS.dim, label: 'P1 = ' + e1.P.toFixed(1), labelX: 92, labelAnchor: 'start' },
        { y: e2.P, color: COLORS.supply, label: 'P2 = ' + e2.P.toFixed(1), labelX: 92, labelAnchor: 'start' }],
      vLines: [{ x: e1.Q, color: COLORS.dim, label: 'Q1 = ' + e1.Q.toFixed(0), labelY: 142 },
        { x: e2.Q, color: COLORS.supply, label: 'Q2 = ' + e2.Q.toFixed(0), labelY: 142 }],
      arrows: [
        /* supply shift: S1 -> S2 at a fixed quantity */
        { x1: 110, y1: D.supply1.a + D.supply1.b * 110, x2: 110, y2: D.supply2.a + D.supply2.b * 110,
          color: COLORS.arrow, marker: 'arrow-ink', label: 'supply constrained', labelDx: 0, labelDy: -12 },
        /* shortage at the old price: Qs < Qd */
        { x1: 25, y1: e1.P, x2: 97, y2: e1.P, color: COLORS.supply, marker: 'arrow-red',
          label: 'shortage at P1 (Qd > Qs)', labelDx: 0, labelDy: -12 }
      ],
      points: [
        { x: e1.Q, y: e1.P, color: COLORS.ink, label: 'E1', labelDx: 12, labelDy: -10 },
        { x: e2.Q, y: e2.P, color: COLORS.supply, label: 'E2', labelDx: 12, labelDy: -10 }
      ],
      annotations: [
        { x: 62, y: 13, text: 'P2 > P1 and Q2 < Q1: constrained supply raises price and cuts quantity.', size: 12.5, weight: 700 },
        { x: 62, y: 6, text: 'Short-run PES is relatively inelastic; long-run PES is relatively more elastic.', size: 12.5 }
      ],
      legend: [
        { label: 'Demand (D)', color: COLORS.demand },
        { label: showLong ? 'Short-run supply (S1)' : 'Short-run supply (S1)', color: COLORS.supply },
        showLong ? { label: 'Long-run supply (flatter)', color: '#7b5aa6', dash: '8 5' }
          : { label: 'Constrained supply (S2, left/up shift)', color: '#d2762f', dash: '7 5' }
      ],
      legendX: 612, legendY: 66,
      footnote: 'Conceptual/index-based teaching diagram. No numerical price elasticity is implied.'
    });
    svg.__meta.curveCount = curves.length;
    return svg;
  }

  /* ============================================================
     GRAPH 3 — TARGETED CONVENTIONAL DRAM PRODUCER INCENTIVE
     ============================================================ */
  function graph3(opts) {
    opts = opts || {};
    var D = GM.dram;
    var s = D.subsidy;
    var e1 = eq(D.demand, D.supply1);
    var subsidized = { a: D.supply1.a, b: D.supply1.b, sshift: -s };
    var e2 = eq(D.demand, subsidized);
    var pc = e2.P, pp = pc + s;
    var eligibleUnits = e2.Q - e1.Q;
    var expenditure = s * eligibleUnits;

    var svg = buildGraph({
      title: 'Targeted Producer Incentive for Additional Conventional DRAM Output',
      subtitle: 'Market 1 intervention — simplified per-unit subsidy model (index values)',
      ariaLabel: 'Conventional DRAM market with a producer subsidy showing a wedge between buyer and producer price',
      xLabel: 'Conventional DRAM quantity index',
      yLabel: 'Conventional DRAM price index',
      xMax: 130, yMax: 140,
      curves: [
        { type: 'd', a: D.demand.a, b: D.demand.b, color: COLORS.demand, label: 'D (unchanged)', labelQ: 20, labelDx: 8 },
        { type: 's', a: D.supply1.a, b: D.supply1.b, color: COLORS.supply, label: '' },
        { type: 's', a: subsidized.a, b: subsidized.b, sshift: -s, color: COLORS.subsidy, dash: '8 5', label: '' }
      ],
      regions: [
        { x1: e1.Q, x2: e2.Q, y1: pc, y2: pp, fill: 'url(#hatch-green)', stroke: COLORS.subsidy, dash: '5 3' }
      ],
      hLines: [
        { y: e1.P, color: COLORS.dim, label: 'P1 = ' + e1.P.toFixed(1), labelX: 860, labelAnchor: 'end' },
        { y: pc, color: COLORS.subsidy, label: 'Pc = ' + pc.toFixed(1) + ' (buyers pay)', labelX: 92, labelAnchor: 'start' },
        { y: pp, color: COLORS.subsidy, label: 'Pp = ' + pp.toFixed(1) + ' (producers receive)', labelX: 92, labelAnchor: 'start' }
      ],
      vLines: [
        { x: e1.Q, color: COLORS.dim, label: 'Q1 = ' + e1.Q.toFixed(0), labelY: 140 },
        { x: e2.Q, color: COLORS.subsidy, label: 'Q2 = ' + e2.Q.toFixed(1), labelY: 170 }
      ],
      points: [
        { x: e1.Q, y: e1.P, color: COLORS.ink, label: 'E1', labelDx: -12, labelDy: -12, anchor: 'end' },
        { x: e2.Q, y: pc, color: COLORS.subsidy, label: 'E2', labelDx: 14, labelDy: 22 }
      ],
      arrows: [
        { x1: 112, y1: pc, x2: 112, y2: pp, color: COLORS.subsidy, marker: 'arrow-green',
          label: 's = Pp − Pc = ' + s, labelDx: -12, labelDy: -22, anchor: 'end' }
      ],
      annotations: [
        { x: 6, y: 46, text: 'Q2 > Q1: the subsidy raises the quantity supplied, but only as far as capacity responds.', size: 13, weight: 700 },
        { x: 6, y: 38, text: 'Fiscal expenditure = s × eligible incremental units = ' + s + ' × ' + eligibleUnits.toFixed(1) + ' ≈ ' + expenditure.toFixed(1) + ' index-credits.', size: 12.5, weight: 700 },
        { x: 6, y: 30, text: 'Only NEW or expanded capacity qualifies — expenditure is NOT s × the whole market Q2.', size: 12.5 },
        { x: 6, y: 22, text: 'Short run: inelastic supply means producers capture much of the wedge, so output barely moves.', size: 12.5 },
        { x: 6, y: 14, text: 'Long run: as capacity responds, quantity rises more and pass-through to buyers improves.', size: 12.5 },
        { x: 6, y: 6, text: 'Taxpayer cost, opportunity cost, possible deadweight loss and excess-capacity risk if demand falls.', size: 12.5 }
      ],
      legend: [
        { label: 'Demand (unchanged)', color: COLORS.demand },
        { label: 'Original supply S1', color: COLORS.supply },
        { label: 'Supply with subsidy (buyer price)', color: COLORS.subsidy, dash: '8 5' }
      ],
      legendX: 612, legendY: 66,
      footnote: 'Simplified textbook representation of an incentive that improves supply; a milestone-based grant or tax credit is not literally a per-unit subsidy.'
    });
    svg.__meta.curveCount = 3;
    svg.__meta.equilibrium = { e1: e1, e2: e2, pc: pc, pp: pp, subsidy: s, expenditure: expenditure, eligibleUnits: eligibleUnits };
    return svg;
  }

  /* ============================================================
     GRAPH 4 — PC / LAPTOP MARKET
     ============================================================ */
  function graph4(opts) {
    opts = opts || {};
    var P = GM.pc;
    var e1 = eq(P.demand, P.supply1);
    var e2 = eq(P.demand, P.supply2);
    var yMax = 140, xMax = 130;

    var svg = buildGraph({
      title: 'PC/Laptop Market: Higher DRAM Input Costs and the Supply Response',
      subtitle: 'Market 2 — illustrative index values, ceteris paribus',
      ariaLabel: 'PC supply and demand diagram with supply shifting left and up when DRAM costs rise',
      xLabel: 'PC / laptop quantity index (shipments)',
      yLabel: 'Average PC price index',
      xMax: xMax, yMax: yMax,
      curves: [
        { type: 'd', a: P.demand.a, b: P.demand.b, color: COLORS.demand, label: 'D', labelQ: 25, labelDx: 8 },
        { type: 's', a: P.supply1.a, b: P.supply1.b, color: COLORS.supply, label: 'S1 (before DRAM cost rise)', labelQ: 8, labelDx: 8, labelDy: -6 },
        { type: 's', a: P.supply2.a, b: P.supply2.b, color: '#d2762f', dash: '7 5', label: 'S2 (after DRAM input-cost rise)', labelQ: 8, labelDx: 8, labelDy: 18 },
        /* In P = a - bQ a SMALLER b is the FLATTER curve and the MORE
           price-elastic segment. Both segment curves pass through the
           common comparison point (Q = 100, P = 100). */
        { type: 'd', a: P.demandMainstream.a, b: P.demandMainstream.b, color: '#7b5aa6', dash: '4 4', width: 2,
          label: 'D-mainstream (flatter = more elastic)', labelQ: 25, labelDx: 10, labelDy: -10 },
        { type: 'd', a: P.demandUrgent.a, b: P.demandUrgent.b, color: '#8a6d3b', dash: '2 4', width: 2,
          label: 'D-urgent (steeper = less elastic)', labelQ: 80, labelDx: 10, labelDy: -10 }
      ],
      hLines: [
        { y: e1.P, color: COLORS.dim, label: 'P1 = ' + e1.P.toFixed(1), labelX: 100, labelAnchor: 'start' },
        { y: e2.P, color: COLORS.supply, label: 'P2 = ' + e2.P.toFixed(1), labelX: 100, labelAnchor: 'start' }
      ],
      vLines: [
        { x: e1.Q, color: COLORS.dim, label: 'Q1 = ' + e1.Q.toFixed(0), labelY: 140 },
        /* Q2 sits lower on its dashed line: at the E2 height the demand,
           supply and both segment curves all converge, so the label would
           sit on top of them. */
        { x: e2.Q, color: COLORS.supply, label: 'Q2 = ' + e2.Q.toFixed(1), labelY: 210 }
      ],
      arrows: [
        { x1: 115, y1: P.supply1.a + P.supply1.b * 115, x2: 115, y2: P.supply2.a + P.supply2.b * 115,
          color: COLORS.arrow, marker: 'arrow-ink', label: 'DRAM input cost rises', labelDx: -10, labelDy: 0, anchor: 'end' },
        { x1: 18, y1: e1.P, x2: 84, y2: e1.P, color: COLORS.supply, marker: 'arrow-red',
          label: 'shortage at P1 (Qd > Qs)', labelDx: 0, labelDy: -14 }
      ],
      points: [
        { x: e1.Q, y: e1.P, color: COLORS.ink, label: 'E1', labelDx: -12, labelDy: -12, anchor: 'end' },
        { x: e2.Q, y: e2.P, color: COLORS.supply, label: 'E2', labelDx: 14, labelDy: 22 }
      ],
      annotations: [
        { x: 52, y: 46, text: 'DRAM is an input: a higher memory cost shifts PC supply left/up.', size: 12.5, weight: 700 },
        { x: 52, y: 38, text: 'PED = % change in quantity demanded / % change in price; no number is used.', size: 12.5, weight: 700 },
        { x: 52, y: 30, text: 'Both segment curves are compared at the same point (P = 100, Q = 100):', size: 12.5 },
        { x: 52, y: 22, text: 'the flatter mainstream curve is the more price-elastic one.', size: 12.5 },
        { x: 52, y: 14, text: 'These are illustrative teaching curves, not measured market elasticities.', size: 12.5 },
        { x: 52, y: 6, text: 'Shipment data are channel estimates, not consumer quantity demanded.', size: 12.5 }
      ],
      legend: [
        { label: 'Aggregate demand', color: COLORS.demand },
        { label: 'PC supply S1', color: COLORS.supply },
        { label: 'PC supply S2 (higher DRAM cost)', color: '#d2762f', dash: '7 5' },
        { label: 'D-mainstream (flatter = more elastic)', color: '#7b5aa6', dash: '4 4' },
        { label: 'D-urgent (steeper = less elastic)', color: '#8a6d3b', dash: '2 4' }
      ],
      legendX: 90, legendY: 300,
      footnote: 'Conceptual/index-based teaching diagram. Segment demand curves are illustrative comparisons, not measured elasticities.'
    });
    svg.__meta.curveCount = 5;
    svg.__meta.equilibrium = { e1: e1, e2: e2 };
    return svg;
  }

  /* ============================================================
     GRAPH 5 — TARGETED PC CONSUMER VOUCHER
     ============================================================ */
  function graph5(opts) {
    opts = opts || {};
    var P = GM.pc;
    var s = P.voucher;
    var e1 = eq(P.demand, P.supply1);
    var boosted = { a: P.demand.a, b: P.demand.b, dshift: s };
    var e2 = eq(boosted, P.supply1);
    var pp = e2.P, pc = pp - s;
    var eligibleShare = 0.30;                      // ASSUMPTION: illustrative share of new units that redeem a voucher
    var eligibleUnits = e2.Q * eligibleShare;
    var expenditure = s * eligibleUnits;

    var svg = buildGraph({
      title: 'Targeted PC Voucher: Affordability Benefits and Upstream Demand Risks',
      subtitle: 'Market 2 intervention — simplified per-unit voucher model (index values)',
      ariaLabel: 'PC market with a consumer voucher showing a wedge and a higher equilibrium price',
      xLabel: 'PC / laptop quantity index (shipments)',
      yLabel: 'PC price index',
      xMax: 135, yMax: 140,
      curves: [
        { type: 's', a: P.supply1.a, b: P.supply1.b, color: COLORS.supply, label: 'S (supply unchanged)', labelQ: 8, labelDx: 8, labelDy: -6 },
        { type: 'd', a: P.demand.a, b: P.demand.b, color: COLORS.demand, label: 'D1 (original demand)', labelQ: 40, labelDx: 8 },
        { type: 'd', a: boosted.a, b: boosted.b, dshift: s, color: COLORS.subsidy, dash: '8 5',
          label: 'D2 (voucher)', labelQ: 70, labelDx: 10, labelDy: -10 }
      ],
      regions: [
        { x1: e2.Q * (1 - eligibleShare), x2: e2.Q, y1: pc, y2: pp, fill: 'url(#hatch-green)', stroke: COLORS.subsidy, dash: '5 3' }
      ],
      hLines: [
        { y: e1.P, color: COLORS.dim, label: 'P1 = ' + e1.P.toFixed(1), labelX: 100, labelAnchor: 'start' },
        { y: pp, color: COLORS.supply, label: 'Pp = ' + pp.toFixed(1) + ' (sellers receive)', labelX: 100, labelAnchor: 'start' },
        { y: pc, color: COLORS.subsidy, label: 'Pc = ' + pc.toFixed(1) + ' (eligible buyer pays)', labelX: 100, labelAnchor: 'start' }
      ],
      vLines: [
        { x: e1.Q, color: COLORS.dim, label: 'Q1 = ' + e1.Q.toFixed(0), labelY: 428 },
        { x: e2.Q, color: COLORS.subsidy, label: 'Q2 = ' + e2.Q.toFixed(1), labelY: 428 }
      ],
      points: [
        { x: e1.Q, y: e1.P, color: COLORS.ink, label: 'E1', labelDx: -12, labelDy: -12, anchor: 'end' },
        { x: e2.Q, y: pp, color: COLORS.subsidy, label: 'E2', labelDx: 14, labelDy: -12 }
      ],
      arrows: [
        { x1: 122, y1: pc, x2: 122, y2: pp, color: COLORS.subsidy, marker: 'arrow-green',
          label: 's = Pp − Pc = ' + s, labelDx: 0, labelDy: -14, anchor: 'middle' }
      ],      annotations: [
        { x: 6, y: 46, text: 'Q2 > Q1, but sellers capture part of the voucher (Pp > P1).', size: 12.5, weight: 700 },
        { x: 6, y: 38, text: 'Fiscal cost = s × eligible redemptions ≈ ' + expenditure.toFixed(0) + ' index-credits.', size: 12.5, weight: 700 },
        { x: 6, y: 30, text: 'Only eligible redemptions qualify — not the whole market Q2.', size: 12.5 },
        { x: 6, y: 22, text: 'Inelastic short-run PC supply limits pass-through to buyers.', size: 12.5 },
        { x: 6, y: 14, text: 'More PCs sold = more derived demand for DRAM: it can worsen the bottleneck.', size: 12.5 },
        { x: 6, y: 6, text: 'Non-eligible buyers may face higher prices; fiscal cost remains.', size: 12.5 }
      ],
      legend: [
        { label: 'Supply (unchanged)', color: COLORS.supply },
        { label: 'Original demand D1', color: COLORS.demand },
        { label: 'Demand with voucher D2', color: COLORS.subsidy, dash: '8 5' }
      ],
      legendY: 66,
      legendX: 612,
      footnote: 'The aggregate demand shift is a simplified representation; only a subset of buyers is eligible.'
    });
    svg.__meta.curveCount = 3;
    svg.__meta.equilibrium = { e1: e1, e2: e2, pc: pc, pp: pp, subsidy: s, expenditure: expenditure, eligibleUnits: eligibleUnits };
    return svg;
  }

  /* ============================================================
     EVIDENCE CHART — Gartner PC shipments (two bars, exact values)
     ============================================================ */
  function gartnerChart() {
    var G = GM.evidence.gartner;
    var W = 620, H = 360;
    var m = { t: 56, r: 24, b: 66, l: 74 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var yMax = 80;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: 'auto', xmlns: NS,
      role: 'img', 'aria-label': 'Bar chart comparing worldwide PC shipments in Q3 2025 and Q3 2026' });

    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff' }));
    svg.appendChild(el('text', { x: W / 2, y: 24, 'text-anchor': 'middle', 'font-family': 'Segoe UI, Arial, sans-serif',
      'font-size': 16, 'font-weight': 700, fill: COLORS.ink }, 'Worldwide PC shipments, Q3 2025 vs Q3 2026'));
    svg.appendChild(el('text', { x: W / 2, y: 43, 'text-anchor': 'middle', 'font-family': 'Segoe UI, Arial, sans-serif',
      'font-size': 11.5, 'font-style': 'italic', fill: COLORS.dim },
      'Gartner preliminary channel shipment estimates, millions of units'));

    function Y(v) { return H - m.b - v / yMax * ih; }

    ticks(0, yMax, 5).forEach(function (v) {
      var py = Y(v);
      svg.appendChild(el('line', { x1: m.l, y1: py, x2: W - m.r, y2: py, stroke: COLORS.grid, 'stroke-width': 1 }));
      svg.appendChild(el('text', { x: m.l - 8, y: py + 4, 'text-anchor': 'end', 'font-family': 'Segoe UI, Arial, sans-serif',
        'font-size': 11.5, fill: COLORS.ink }, v));
    });
    svg.appendChild(el('line', { x1: m.l, y1: H - m.b, x2: W - m.r, y2: H - m.b, stroke: COLORS.ink, 'stroke-width': 1.8 }));
    svg.appendChild(el('text', { x: m.l - 8, y: m.t - 10, 'text-anchor': 'end', 'font-family': 'Segoe UI, Arial, sans-serif',
      'font-size': 12, 'font-weight': 700, fill: COLORS.ink }, 'M units'));

    var bars = [
      { label: 'Q3 2025', value: G.q3_2025, color: '#5b6b76' },
      { label: 'Q3 2026', value: G.q3_2026, color: COLORS.conv }
    ];
    var bw = 110, gap = 70, startX = m.l + 70;
    bars.forEach(function (b, i) {
      var x = startX + i * (bw + gap);
      var y = Y(b.value), h = (H - m.b) - y;
      svg.appendChild(el('rect', { x: x, y: y, width: bw, height: h, fill: b.color, opacity: 0.92 }));
      svg.appendChild(el('text', { x: x + bw / 2, y: y - 10, 'text-anchor': 'middle', 'font-family': 'Segoe UI, Arial, sans-serif',
        'font-size': 14, 'font-weight': 700, fill: COLORS.ink }, b.value.toFixed(3)));
      svg.appendChild(el('text', { x: x + bw / 2, y: H - m.b + 22, 'text-anchor': 'middle', 'font-family': 'Segoe UI, Arial, sans-serif',
        'font-size': 13, fill: COLORS.ink }, b.label));
    });

    /* change annotation */
    svg.appendChild(el('text', { x: W / 2, y: H - 22, 'text-anchor': 'middle', 'font-family': 'Segoe UI, Arial, sans-serif',
      'font-size': 13, 'font-weight': 700, fill: COLORS.supply },
      'Year-on-year change: ' + G.change.toFixed(1) + '%'));
    svg.appendChild(el('text', { x: m.l, y: H - 2, 'font-family': 'Segoe UI, Arial, sans-serif', 'font-size': 10.5,
      'font-style': 'italic', fill: COLORS.dim },
      'Source: Gartner, "Worldwide PC Shipments Declined 22.4% in Third Quarter of 2026", October 12, 2026. Preliminary channel estimates — not final consumer purchases or quantity demanded.'));
    return svg;
  }

  /* ============================================================
     EXPLANATORY TEXT FOR EACH GRAPH
     ============================================================ */
  DRAM.GRAPH_TEXT = {
    g1: {
      title: 'Graph 1 — Allocating Scarce Production Resources: Conventional DRAM vs HBM',
      purpose: 'Shows the opportunity cost of the allocation decision and why new capacity shifts the frontier outward.',
      cause: 'The bowed-out frontier comes from diminishing marginal output: as a plant is pushed further toward one product, each extra token of shared resources yields less extra output, so the opportunity cost of switching products rises. Point A is a productively efficient mix weighted toward conventional DRAM; point B is an efficient mix weighted toward HBM; point C is inside the frontier (inefficient or underused resources); point D is outside and therefore unattainable with current resources and technology. Moving from A to B means giving up conventional DRAM output for HBM output — the opportunity cost.',
      tech: 'New cleanroom capacity, better process technology, higher yields, specialised HBM tooling and advanced packaging all shift the PPC outward, so a larger output combination becomes attainable. That outward shift is exactly what a capacity-side policy tries to produce — over years, not quarters.',
      elasticity: 'The frontier is the clearest statement of short-run versus long-run supply elasticity: moving along it is feasible now (reallocation), while moving beyond it requires new capital and time.',
      surplus: 'Producer surplus depends on where the mix sits. Moving toward HBM raises average revenue per token but shrinks conventional supply, which raises the DRAM price and cuts the volume sold — so surplus gains for the seller are partly offset by lower conventional output and a higher price that buyers resist.',
      caveat: 'This is a simplified conceptual model of allocation across products that use some shared productive resources. HBM and conventional DRAM have distinct product and packaging requirements; this is not a literal one-for-one conversion between identical production lines.',
      cite: 'Evidence: Micron Technology, Form 10-K, September 3, 2026 — HBM requires more wafers and more cleanroom space per bit than conventional DRAM on the same node.'
    },
    g2: {
      title: 'Graph 2 — Global Conventional DRAM Market: Supply Constraint and Equilibrium Adjustment',
      purpose: 'Explains how a supply constraint (allocation priority and capacity limits) moves the conventional DRAM market to a higher price and a lower quantity.',
      cause: 'Demand D is unchanged; supply shifts left/up from S1 to S2 because suppliers are directing limited wafer and cleanroom capacity toward HBM and server products and because new capacity cannot be built quickly. The market moves from E1 (P1, Q1) to E2 (P2, Q2), with P2 > P1 and Q2 < Q1. At the old price P1 the quantity demanded exceeds the quantity supplied: the horizontal gap is the shortage, and it is what the price rise then works off. Ceteris paribus: the demand curve and all non-price determinants are held constant.',
      tech: 'Use the toggle to replace the constrained S2 curve with a flatter long-run supply curve. A flatter supply curve is a more elastic supply curve: the same price change produces a larger quantity response, because firms can then expand and qualify capacity, improve yields and migrate processes.',
      elasticity: 'Short-run PES = % change in quantity supplied / % change in price is relatively inelastic for conventional DRAM because installed cleanroom capacity, qualified processes and trained labour cannot change quickly. Long-run PES is relatively more elastic for the reasons above. No numerical coefficient is asserted.',
      surplus: 'Consumer surplus falls: buyers pay more and buy less. Producer surplus is ambiguous — the higher price may be offset by fewer units sold, higher input costs, and a product mix shifting toward more profitable HBM output.',
      cite: 'Evidence: TrendForce, September 7 and 30, 2026 (historic-low inventories, server-biased allocation, projected conventional contract price increases).'
    },
    g3: {
      title: 'Graph 3 — Targeted Producer Incentive for Additional Conventional DRAM Output',
      purpose: 'Shows the incidence, fiscal cost and limits of a per-unit producer subsidy aimed at new conventional DRAM capacity.',
      cause: 'The incentive shifts the effective supply curve to buyers from S1 to S2. At the new equilibrium the buyer price Pc falls below P1 while the producer-received price Pp exceeds Pc by exactly the subsidy s. The quantity rises from Q1 to Q2. The shaded block marks the eligible incremental output — additional units from qualified new or expanded capacity — and government expenditure is s multiplied by that eligible quantity, NOT by the whole market Q2.',
      tech: 'Because short-run supply is inelastic, producers capture a large share of the wedge, so the extra output is modest and the public cost per incremental bit is high. Over a longer horizon, when capacity actually responds, the supply curve flattens, quantity responds more, and pass-through to buyers improves. Crucially, the measure cannot create fab capacity instantly: it changes the payoff to investing in it.',
      elasticity: 'The size of the quantity response is governed by PES. With inelastic supply the response is small; with more elastic long-run supply it is larger — which is why the policy is a long-run instrument, not a short-run price control.',
      surplus: 'Total surplus normally rises because more mutually beneficial units are traded (larger Q2). But if support encourages output beyond its social value, deadweight loss appears; and if the resulting capacity outlasts demand, the public has paid for uneconomic capacity.',
      caveat: 'This is the simplified AP Microeconomics model of a producer incentive that improves supply. A milestone-based investment grant or tax credit reduces fixed costs and is not literally a per-unit output subsidy.',
      cite: 'Evidence: Micron, September 3, 2026 (construction and qualification lead times); U.S. GAO, GAO-26-109121, August 6, 2026 ($13.1 billion disbursed, approximately 42% of direct semiconductor funding awards; some milestones behind anticipated schedules).'
    },
    g4: {
      title: 'Graph 4 — PC/Laptop Market: Higher DRAM Input Costs and the Supply Response',
      purpose: 'Links the upstream memory market to downstream PC prices, shipments and buyer behaviour.',
      cause: 'DRAM is an important input into PCs and laptops. When DRAM prices rise, PC marginal cost rises, so PC supply shifts left/up from S1 to S2 (ceteris paribus). The market moves from E1 to E2: PC prices rise (P2 > P1) and the quantity of PCs falls (Q2 < Q1). At the old price P1 there is a shortage of PCs because more buyers want them than makers can profitably supply at that price.',
      tech: 'The two dashed curves show buyer heterogeneity rather than a single demand curve, and both are drawn through the same comparison point (P = 100, Q = 100). Buyers who can postpone replacement, extend a device\'s life, buy used or refurbished equipment, or choose a lower-memory configuration have a flatter (more elastic) demand curve; buyers with urgent school, work or business needs have a steeper (less elastic) curve. In inverse form P = a − bQ, a smaller b is the flatter curve and therefore the more price-elastic segment. Longer time horizons generally make demand more elastic. These are illustrative teaching curves, not measured market elasticities.',
      elasticity: 'PED = % change in quantity demanded / % change in price. No numerical PED is estimated here. PC shipments are not identical to final consumer purchases or quantity demanded, and shipment changes reflect timing, availability, product mix and budgets as well as price.',
      surplus: 'Consumer surplus falls as price rises and quantity falls. Producer surplus is ambiguous: PC producers receive a higher price per unit but sell fewer units and face higher input costs.',
      cite: 'Evidence: Gartner, October 12, 2026 (preliminary Q3 2026 shipments down 22.4% year-on-year, linked partly to component cost inflation raising ASPs); Omdia, October 9, 2026 (58.1 million units, down 21.2%, pull-forward demand subsiding).'
    },
    g5: {
      title: 'Graph 5 — Targeted PC Voucher: Affordability Benefits and Upstream Demand Risks',
      purpose: 'Evaluates the consumer-side intervention and its feedback into the memory market.',
      cause: 'The voucher raises demand for eligible buyers from D1 to D2 while supply is unchanged. The new equilibrium quantity Q2 exceeds Q1. Sellers receive Pp, which is above the original market price P1, while the eligible buyer pays Pc = Pp − s, which is below P1. The wedge s is the voucher.',
      tech: 'The shaded block covers only the eligible redemptions, so government expenditure is s multiplied by eligible units rather than by the whole market quantity Q2; the aggregate demand shift is a simplified representation of a subset of buyers. Because short-run PC supply is inelastic, sellers capture part of the subsidy, so the pass-through to buyers is limited.',
      elasticity: 'The split of the subsidy between buyers and sellers depends on relative elasticities: the more inelastic the supply curve relative to demand, the more of the benefit producers capture.',
      surplus: 'Eligible households gain access (a potential positive externality from digital access, education and productivity). Non-eligible buyers may face higher market prices. Fiscal cost, opportunity cost and possible deadweight loss apply. Critically, demand for PCs is derived demand for DRAM: a voucher adds pressure to the upstream memory market while that market is still capacity-constrained.',
      caveat: 'Targeted, temporary assistance (ideally usable toward refurbished devices or repairs) is preferable to a broad subsidy in this scenario, because a broad subsidy raises derived demand for new DRAM that the constrained upstream cannot supply.',
      cite: 'Evidence: Gartner, October 12, 2026 and Omdia, October 9, 2026 (shipment contraction and its multiple causes); TrendForce, September 30, 2026 (continued upstream undersupply).'
    }
  };

  /* ============================================================
     PUBLIC API
     ============================================================ */
  DRAM.Graphs = {
    eq: eq,
    demandP: demandP,
    supplyP: supplyP,
    buildGraph: buildGraph,
    graph1: graph1,
    graph2: graph2,
    graph3: graph3,
    graph4: graph4,
    graph5: graph5,
    gartnerChart: gartnerChart,
    builders: { g1: graph1, g2: graph2, g3: graph3, g4: graph4, g5: graph5 },
    ids: ['g1', 'g2', 'g3', 'g4', 'g5']
  };
})();
