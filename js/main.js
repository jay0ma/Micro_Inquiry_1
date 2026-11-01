/* ============================================================
   DRAM Factory Tycoon — main.js
   Bootstrap: error capture, initialisation, startup self-tests.
   ============================================================ */
(function () {
  'use strict';

  /* Record uncaught errors so the Diagnostics panel can report them. */
  window.DRAM_ERRORS = [];
  window.addEventListener('error', function (e) {
    window.DRAM_ERRORS.push(String(e.message || 'unknown error') +
      (e.filename ? (' @ ' + e.filename + ':' + e.lineno) : ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    window.DRAM_ERRORS.push('unhandled promise rejection: ' + String(e.reason));
  });

  function boot() {
    var DRAM = window.DRAM;
    if (!DRAM) return;

    try { DRAM.Game.init(); } catch (e) { window.DRAM_ERRORS.push('Game.init: ' + e.message); }
    try { DRAM.UI.init(); } catch (e) { window.DRAM_ERRORS.push('UI.init: ' + e.message); }

    /* Run the self-test suite once at startup; the Diagnostics button
       re-runs it on demand (with the destructive reset check enabled). */
    setTimeout(function () {
      try { DRAM.Tests.run({ allowUI: false }); }
      catch (e) { window.DRAM_ERRORS.push('Tests.run: ' + e.message); }
    }, 120);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
