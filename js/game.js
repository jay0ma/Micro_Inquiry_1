/* ============================================================
   DRAM Factory Tycoon — game.js
   Top-down canvas factory floor: map, player, movement, collision
   and station interaction.
   ============================================================ */
(function () {
  'use strict';

  var DRAM = window.DRAM;
  var CFG = DRAM.CONFIG.SIM;

  var TILE = 40;
  var COLS = 24, ROWS = 14;
  var W = COLS * TILE, H = ROWS * TILE;   /* 960 x 560 */

  var SPEED = 168;            /* pixels per second */
  var PLAYER_R = 12;
  var INTERACT_RANGE = 92;

  var canvas, ctx;
  var keys = Object.create(null);
  var lastFrame = 0;
  var running = false;
  var rafId = null;

  var obstacles = [];        /* {x,y,w,h,kind} */
  var stations = [];         /* runtime station objects */

  var player = {
    x: 12 * TILE + TILE / 2,
    y: 10 * TILE + TILE / 2,
    facing: 0,
    moving: false
  };

  var hooks = {
    onStationOpen: null
  };

  /* ---------------------------------------------------------------
     MAP CONSTRUCTION
     --------------------------------------------------------------- */
  function rectFromTiles(tx, ty, tw, th) {
    return { x: tx * TILE, y: ty * TILE, w: tw * TILE, h: th * TILE };
  }

  function buildMap() {
    obstacles = [];
    stations = [];

    /* Outer walls */
    obstacles.push({ x: 0, y: 0, w: W, h: TILE, kind: 'wall' });
    obstacles.push({ x: 0, y: H - TILE, w: W, h: TILE, kind: 'wall' });
    obstacles.push({ x: 0, y: 0, w: TILE, h: H, kind: 'wall' });
    obstacles.push({ x: W - TILE, y: 0, w: TILE, h: H, kind: 'wall' });

    /* Internal structural walls (aisles). The layout leaves a continuous
       corridor on both sides of the central divider so that every
       station can actually be walked up to. */
    var walls = [
      { x: 6, y: 1, w: 1, h: 3 },
      { x: 17, y: 1, w: 1, h: 3 },
      { x: 8, y: 9, w: 8, h: 1 },
      { x: 4, y: 6, w: 1, h: 2 },
      { x: 14, y: 11, w: 1, h: 2 }
    ];
    walls.forEach(function (w) { obstacles.push({ x: w.x * TILE, y: w.y * TILE, w: w.w * TILE, h: w.h * TILE, kind: 'wall' }); });

    /* Machinery blocks (visual + physical) */
    var machines = [
      { x: 7, y: 6, w: 1, h: 2 }, { x: 7, y: 11, w: 1, h: 2 },
      { x: 15, y: 6, w: 1, h: 2 }, { x: 15, y: 11, w: 1, h: 2 },
      { x: 9, y: 2, w: 1, h: 1 }, { x: 14, y: 2, w: 1, h: 1 },
      { x: 2, y: 6, w: 2, h: 1 }, { x: 20, y: 6, w: 2, h: 1 }
    ];
    machines.forEach(function (m) { obstacles.push({ x: m.x * TILE, y: m.y * TILE, w: m.w * TILE, h: m.h * TILE, kind: 'machine' }); });

    /* Stations */
    DRAM.STATIONS.forEach(function (s) {
      var r = rectFromTiles(s.tileX, s.tileY, s.w, s.h);
      var st = {
        id: s.id, name: s.name, short: s.short, purpose: s.purpose, color: s.color,
        x: r.x, y: r.y, w: r.w, h: r.h,
        cx: r.x + r.w / 2, cy: r.y + r.h / 2
      };
      stations.push(st);
      obstacles.push({ x: r.x, y: r.y, w: r.w, h: r.h, kind: 'station' });
    });

    /* Player start: in the open aisle beside the production floor, so
       the first station is reachable immediately. */
    player.x = 11 * TILE + TILE / 2;
    player.y = 8 * TILE + TILE / 2;
  }

  /* ---------------------------------------------------------------
     COLLISION
     --------------------------------------------------------------- */
  function circleHitsRect(cx, cy, r, rect) {
    var nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    var ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    var dx = cx - nx, dy = cy - ny;
    return (dx * dx + dy * dy) < (r * r);
  }

  function blocked(x, y) {
    var i;
    for (i = 0; i < obstacles.length; i++) {
      if (circleHitsRect(x, y, PLAYER_R, obstacles[i])) return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------
     INPUT
     --------------------------------------------------------------- */
  function isTypingTarget(t) {
    if (!t) return false;
    var tag = (t.tagName || '').toLowerCase();
    if (tag === 'textarea' || t.isContentEditable) return true;
    if (tag === 'select') return true;
    if (tag === 'input') {
      /* Only text-entry fields should swallow keyboard shortcuts.
         Range sliders, checkboxes and radios must still allow Escape,
         E and P to work. */
      var type = (t.getAttribute('type') || 'text').toLowerCase();
      return ['text', 'number', 'search', 'email', 'url', 'password', 'tel'].indexOf(type) !== -1;
    }
    return false;
  }

  function onKeyDown(e) {
    if (isTypingTarget(e.target)) return;
    var k = e.key;
    var code = e.code;

    /* Arrow keys and space must never scroll the page while the factory
       view is showing (with or without a panel open). */
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].indexOf(k) !== -1) {
      if (DRAM.UI && DRAM.UI.isGameScreen()) e.preventDefault();
    }
    keys[k] = true;
    if (code) keys[code] = true;

    /* Escape always closes the open panel, even while it has focus. */
    if (k === 'Escape') {
      if (DRAM.UI && DRAM.UI.isModalOpen()) DRAM.UI.closeModal();
      return;
    }

    if (!DRAM.UI || !DRAM.UI.isGameFocused()) return;

    if (k === 'e' || k === 'E') {
      var st = nearestStation();
      if (st) openStation(st.id);
    }
    if (k === 'p' || k === 'P') {
      if (DRAM.UI) DRAM.UI.togglePause();
    }
  }

  function onKeyUp(e) {
    keys[e.key] = false;
    if (e.code) keys[e.code] = false;
  }

  function clearKeys() { keys = Object.create(null); }

  function down(...names) {
    for (var i = 0; i < names.length; i++) {
      if (keys[names[i]]) return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------
     STATIONS
     --------------------------------------------------------------- */
  function nearestStation() {
    /* Distance is measured to the nearest EDGE of a station, because a
       station is a solid obstacle — the player can never stand on its
       centre. Measuring to the edge keeps every station reachable. */
    var best = null, bestD = INTERACT_RANGE * INTERACT_RANGE;
    for (var i = 0; i < stations.length; i++) {
      var s = stations[i];
      var nx = player.x < s.x ? s.x : (player.x > s.x + s.w ? s.x + s.w : player.x);
      var ny = player.y < s.y ? s.y : (player.y > s.y + s.h ? s.y + s.h : player.y);
      var dx = player.x - nx, dy = player.y - ny;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  function stationAtPoint(px, py) {
    for (var i = 0; i < stations.length; i++) {
      var s = stations[i];
      if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) return s;
    }
    return null;
  }

  function openStation(id) {
    if (hooks.onStationOpen) hooks.onStationOpen(id);
  }

  /* ---------------------------------------------------------------
     UPDATE / DRAW
     --------------------------------------------------------------- */
  function update(dt) {
    if (DRAM.UI && DRAM.UI.blocksMovement()) { player.moving = false; return; }

    var dx = 0, dy = 0;
    if (down('a', 'A', 'ArrowLeft')) dx -= 1;
    if (down('d', 'D', 'ArrowRight')) dx += 1;
    if (down('w', 'W', 'ArrowUp')) dy -= 1;
    if (down('s', 'S', 'ArrowDown')) dy += 1;

    if (dx === 0 && dy === 0) { player.moving = false; return; }

    var len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
    player.facing = Math.atan2(dy, dx);
    player.moving = true;

    var step = SPEED * dt;
    var tryX = player.x + dx * step;
    if (!blocked(tryX, player.y)) player.x = tryX;

    var tryY = player.y + dy * step;
    if (!blocked(player.x, tryY)) player.y = tryY;

    /* Keep inside the playable area regardless of obstacles. */
    player.x = Math.max(TILE + PLAYER_R, Math.min(W - TILE - PLAYER_R, player.x));
    player.y = Math.max(TILE + PLAYER_R, Math.min(H - TILE - PLAYER_R, player.y));
  }

  function roundRect(x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawFloor() {
    ctx.fillStyle = '#141b21';
    ctx.fillRect(0, 0, W, H);
    for (var ty = 0; ty < ROWS; ty++) {
      for (var tx = 0; tx < COLS; tx++) {
        var shade = (tx + ty) % 2 === 0 ? '#182027' : '#1b242b';
        ctx.fillStyle = shade;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (var gx = 1; gx < COLS; gx++) {
      ctx.beginPath(); ctx.moveTo(gx * TILE + 0.5, 0); ctx.lineTo(gx * TILE + 0.5, H); ctx.stroke();
    }
    for (var gy = 1; gy < ROWS; gy++) {
      ctx.beginPath(); ctx.moveTo(0, gy * TILE + 0.5); ctx.lineTo(W, gy * TILE + 0.5); ctx.stroke();
    }
  }

  function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.kind === 'station') continue;
      if (o.kind === 'wall') {
        ctx.fillStyle = '#2b343d';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = '#3d4a55';
        ctx.lineWidth = 1;
        ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
      } else {
        ctx.fillStyle = '#33404a';
        roundRect(o.x + 3, o.y + 3, o.w - 6, o.h - 6, 4);
        ctx.fill();
        ctx.strokeStyle = '#48586a';
        ctx.stroke();
        ctx.fillStyle = '#6f8296';
        for (var k = 0; k < 3; k++) {
          ctx.fillRect(o.x + 9, o.y + 12 + k * 14, o.w - 18, 4);
        }
      }
    }
  }

  function drawStations() {
    for (var i = 0; i < stations.length; i++) {
      var s = stations[i];
      var near = (nearestStation() === s);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      roundRect(s.x + 4, s.y + 6, s.w, s.h, 8); ctx.fill();
      ctx.fillStyle = s.color;
      roundRect(s.x, s.y, s.w, s.h, 8); ctx.fill();
      ctx.strokeStyle = near ? '#ffffff' : 'rgba(0,0,0,0.45)';
      ctx.lineWidth = near ? 3 : 2;
      ctx.stroke();

      /* icon: wafer-like square */
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      ctx.fillRect(s.x + 10, s.y + 10, 22, 22);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(s.x + 10.5, s.y + 10.5, 21, 21);

      ctx.fillStyle = '#0d1216';
      ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(s.short, s.x + 10, s.y + 40);
      ctx.font = '11px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = 'rgba(13,18,22,0.78)';
      wrapText(s.purpose, s.x + 10, s.y + 58, s.w - 20, 13);
      ctx.restore();
    }
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    var words = String(text).split(' ');
    var line = '', yy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = words[i]; yy += lineHeight;
      } else { line = test; }
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function drawPlayer() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y + 3, PLAYER_R + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();

    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_R, 0, Math.PI * 2);
    ctx.fillStyle = '#e8eef2'; ctx.fill();
    ctx.strokeStyle = '#1c262d'; ctx.lineWidth = 2.5; ctx.stroke();

    /* facing indicator */
    var fx = player.x + Math.cos(player.facing) * (PLAYER_R - 3);
    var fy = player.y + Math.sin(player.facing) * (PLAYER_R - 3);
    ctx.beginPath();
    ctx.arc(fx, fy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f0a63c'; ctx.fill();
    ctx.strokeStyle = '#1c262d'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawFloor();
    drawObstacles();
    drawStations();
    drawPlayer();
  }

  /* ---------------------------------------------------------------
     LOOP
     --------------------------------------------------------------- */
  function frame(ts) {
    if (!running) return;
    var dt = 0.016;
    if (lastFrame) {
      dt = (ts - lastFrame) / 1000;
      /* Clamp large deltas (tab switches, slow frames) to avoid teleporting. */
      if (!isFinite(dt) || dt < 0) dt = 0.016;
      if (dt > 0.05) dt = 0.05;
    }
    lastFrame = ts;

    var active = !(DRAM.UI && (DRAM.UI.blocksMovement() || !DRAM.UI.isGameFocused()));
    if (active) update(dt);
    draw();
    rafId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastFrame = 0;
    rafId = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
  }

  function onCanvasClick(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width, scaleY = H / rect.height;
    var px = (e.clientX - rect.left) * scaleX;
    var py = (e.clientY - rect.top) * scaleY;
    var s = stationAtPoint(px, py);
    if (s) openStation(s.id);
  }

  /* ---------------------------------------------------------------
     REACHABILITY CHECK
     Flood-fills the tile grid from the player's start position and
     reports any station the player could not physically walk to.
     Used by the self-test suite so a sealed-off map can never ship.
     --------------------------------------------------------------- */
  function tileBlocked(tx, ty) {
    return blocked(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
  }

  function reachability() {
    var startTx = Math.max(0, Math.min(COLS - 1, Math.floor(player.x / TILE)));
    var startTy = Math.max(0, Math.min(ROWS - 1, Math.floor(player.y / TILE)));
    var seen = [], ty, tx;
    for (ty = 0; ty < ROWS; ty++) { seen[ty] = []; for (tx = 0; tx < COLS; tx++) seen[ty][tx] = false; }
    var queue = [[startTx, startTy]];
    seen[startTy][startTx] = true;
    while (queue.length) {
      var cur = queue.shift();
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < dirs.length; i++) {
        var nx = cur[0] + dirs[i][0], ny = cur[1] + dirs[i][1];
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        if (seen[ny][nx]) continue;
        if (tileBlocked(nx, ny)) continue;
        seen[ny][nx] = true;
        queue.push([nx, ny]);
      }
    }
    var unreachable = [];
    for (var s = 0; s < stations.length; s++) {
      var st = stations[s];
      var ok = false;
      for (var sy = st.y / TILE - 1; sy <= (st.y + st.h) / TILE + 1 && !ok; sy++) {
        for (var sx = st.x / TILE - 1; sx <= (st.x + st.w) / TILE + 1 && !ok; sx++) {
          if (sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) continue;
          if (seen[sy][sx]) ok = true;
        }
      }
      if (!ok) unreachable.push(st.id);
    }
    return { ok: unreachable.length === 0, unreachable: unreachable, start: [startTx, startTy] };
  }

  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    buildMap();
    draw();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('focus', function () { canvas.focus(); });
  }

  DRAM.Game = {
    init: init,
    start: start,
    stop: stop,
    rebuild: function () { buildMap(); draw(); },
    clearKeys: clearKeys,
    nearestStation: nearestStation,
    stationById: function (id) {
      for (var i = 0; i < stations.length; i++) if (stations[i].id === id) return stations[i];
      return null;
    },
    setStationHandler: function (fn) { hooks.onStationOpen = fn; },
    reachability: reachability,
    isRunning: function () { return running; },
    dims: { W: W, H: H, TILE: TILE },
    player: player
  };
})();
