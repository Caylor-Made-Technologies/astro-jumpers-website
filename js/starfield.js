/* Lightweight twinkling starfield behind the page.
   - Star count scales with screen size (fewer on phones).
   - Redraws at ~15 fps and stops completely when the tab is hidden.
   - If the visitor prefers reduced motion, stars are drawn once and never move. */
(function () {
  "use strict";
  var canvas = document.getElementById("starfield");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stars = [], w = 0, h = 0, dpr = 1, last = 0, rafId = 0;
  var FRAME_MS = 1000 / 15;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    // Use the taller of viewport/screen so the phone URL bar showing/hiding doesn't reshuffle the stars.
    h = Math.max(window.innerHeight, window.screen ? window.screen.height : 0);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var count = Math.min(220, Math.round((w * h) / 5000));
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.9 ? Math.random() * 1.1 + 0.3 : Math.random() * 1.2 + 1.2,
        base: Math.random() * 0.5 + 0.35,
        speed: Math.random() * 0.0015 + 0.0005,
        phase: Math.random() * Math.PI * 2,
        tint: Math.random() < 0.12 ? "180,220,255" : (Math.random() < 0.06 ? "255,200,160" : "255,255,255")
      });
    }
    draw(performance.now());
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = reduceMotion ? s.base : s.base + Math.sin(t * s.speed + s.phase) * 0.3;
      ctx.fillStyle = "rgba(" + s.tint + "," + Math.max(0.08, Math.min(1, a)).toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(t) {
    rafId = requestAnimationFrame(loop);
    if (t - last < FRAME_MS) return;
    last = t;
    draw(t);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (window.innerWidth !== w) resize(); }, 150);
  });

  resize();
  if (reduceMotion) return;

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) cancelAnimationFrame(rafId);
    else rafId = requestAnimationFrame(loop);
  });
  rafId = requestAnimationFrame(loop);
})();
