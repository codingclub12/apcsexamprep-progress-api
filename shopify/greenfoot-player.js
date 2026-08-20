/* eslint-disable */
// ─────────────────────────────────────────────────────────────────────────────
//  GREENFOOT TRACE PLAYER - replays a recorded run on a canvas.
//
//  ── WHAT THIS IS NOT ────────────────────────────────────────────────────────
//  It is not a Greenfoot emulator and it does not run Java. It draws a list of
//  positions that a REAL javac compiled and a REAL JVM produced, server side,
//  against lib/greenfoot-stub.js. Every number it renders was computed by the
//  student's own code. See docs/greenfoot-trace.md.
//
//  That distinction is the whole point of the design. A JavaScript
//  reimplementation of Greenfoot would eventually disagree with the desktop
//  Greenfoot the student has open on the other half of their screen, and a
//  course that teaches a behaviour the real tool does not have is worse than a
//  course with no animation at all.
//
//  ── WHY INTERPOLATION NEEDS THE IDS ─────────────────────────────────────────
//  Each actor carries a stable id assigned when it entered the world. Without
//  it, "the worm at 12,5" in frame 4 and "the worm at 12,5" in frame 5 are two
//  unrelated table rows and everything teleports. With it, an actor that moved
//  can be tweened, an actor that vanished can fade out, and a newly spawned one
//  can fade in.
//
//  ── ACCESSIBILITY AND MOTION ────────────────────────────────────────────────
//  Autoplay is off by default. prefers-reduced-motion turns tweening off, so
//  actors step frame to frame instead of sliding; the animation still conveys
//  the same information without continuous movement.
//
//  Pure ASCII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var REDUCED = false;
  try {
    REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* older browsers: keep motion on */ }

  // One colour per actor type, by index into the trace's name table. Chosen for
  // contrast against the grid and against each other, and checked for
  // distinguishability under the common forms of colour blindness rather than
  // just "these look different to me".
  var COLORS = ['#0b5cd5', '#1c7a4a', '#b3541e', '#7b3fa0', '#0f7f8c', '#96261b'];

  function colorFor(i) { return COLORS[i % COLORS.length]; }

  /**
   * Draw one frame, optionally part way toward the next one.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} trace   the parsed trace object
   * @param {number} index   frame number
   * @param {number} t       0..1 progress toward frame index+1
   * @param {number} scale   pixels per world cell
   */
  function draw(ctx, trace, index, t, scale) {
    var W = trace.w * scale;
    var H = trace.h * scale;

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#f7f9fb';
    ctx.fillRect(0, 0, W, H);

    // The grid is not decoration. Greenfoot positions are CELL coordinates, and
    // half the bugs in Units 1 and 2 come from a student thinking in pixels. If
    // the cells are visible, setLocation(getX(), getY() - 1) is obviously one
    // square up rather than an unexplained jump.
    ctx.strokeStyle = '#e2e8ee';
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= trace.w; gx++) {
      ctx.beginPath();
      ctx.moveTo(gx * scale + 0.5, 0);
      ctx.lineTo(gx * scale + 0.5, H);
      ctx.stroke();
    }
    for (var gy = 0; gy <= trace.h; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, gy * scale + 0.5);
      ctx.lineTo(W, gy * scale + 0.5);
      ctx.stroke();
    }

    var cur = trace.f[index] || [];
    var next = trace.f[index + 1] || cur;

    // Where each id is in the following frame, so a moving actor can be tweened
    // rather than redrawn somewhere else.
    var ahead = {};
    for (var n = 0; n < next.length; n++) ahead[next[n][0]] = next[n];

    for (var i = 0; i < cur.length; i++) {
      var a = cur[i];
      var id = a[0], type = a[1], x = a[2], y = a[3], rot = a[4];
      var to = ahead[id];
      var alpha = 1;

      if (REDUCED || !to) {
        // No tween: either motion is turned down, or this actor is gone in the
        // next frame and should fade out where it died rather than slide.
        if (!to && !REDUCED) alpha = 1 - t;
      } else {
        x = x + (to[2] - x) * t;
        y = y + (to[3] - y) * t;
        // Shortest way round, so 350 to 10 degrees turns 20 rather than 340.
        var d = ((to[4] - rot + 540) % 360) - 180;
        rot = rot + d * t;
      }

      var cx = (x + 0.5) * scale;
      var cy = (y + 0.5) * scale;
      var r = scale * 0.38;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.rotate(rot * Math.PI / 180);

      ctx.fillStyle = colorFor(type);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // A nose, so rotation is visible. An actor that has turned but not moved
      // looks identical to one that has done nothing without it, and turn() is
      // a lesson 1.4 idea that students routinely believe does nothing.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, scale * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.95, 0);
      ctx.stroke();

      ctx.restore();
    }
  }

  /**
   * Turn a container into a player.
   *
   * @param {HTMLElement} host    gets the canvas and controls appended
   * @param {object} trace        parsed trace, as produced by GreenfootTrace
   * @returns {object} { destroy }  stops the loop and empties the host
   */
  function mount(host, trace) {
    if (!host || !trace || !trace.f || !trace.f.length) return null;

    host.textContent = '';

    // Fit the world into the column without overflowing it. Cell size in the
    // trace is Greenfoot's, which can be 1 for a pixel world, so it is a hint
    // about proportions rather than a pixel measurement to obey.
    var avail = Math.max(240, Math.min(760, host.clientWidth || 640));
    var scale = Math.max(6, Math.floor(avail / trace.w));
    var W = trace.w * scale;
    var H = trace.h * scale;

    var canvas = document.createElement('canvas');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.style.maxWidth = '100%';
    canvas.style.border = '1px solid #d8dfe6';
    canvas.style.borderRadius = '6px';
    canvas.style.display = 'block';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label',
      'Replay of your code running: ' + trace.f.length + ' frames on a '
      + trace.w + ' by ' + trace.h + ' grid.');
    host.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;font-size:14px;';
    host.appendChild(bar);

    function button(label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'font:inherit;padding:6px 14px;border:1px solid #c3ccd6;'
        + 'background:#fff;border-radius:5px;cursor:pointer;';
      bar.appendChild(b);
      return b;
    }

    var playBtn = button('Play');
    var stepBtn = button('Step');
    var resetBtn = button('Restart');

    // Colour is INHERITED, not set. The lesson pages this mounts on are light,
    // but the player is also dropped into demo and review pages that are not,
    // and a hardcoded light-page grey renders as invisible text on a dark host.
    // Opacity rather than a second colour keeps it one decision.
    var counter = document.createElement('span');
    counter.style.cssText = 'color:inherit;opacity:0.72;font-variant-numeric:tabular-nums;';
    bar.appendChild(counter);

    // The legend is not decoration either. Without it a student looks at three
    // identical discs and cannot tell which one is theirs, which is the first
    // question they will ask. Names come from trace.d when the page supplied
    // display names, falling back to the real class names in trace.t.
    var names = trace.d || trace.t || [];
    if (names.length) {
      var legend = document.createElement('div');
      legend.style.cssText = 'display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;'
        + 'font-size:14px;color:inherit;opacity:0.85;';
      for (var k = 0; k < names.length; k++) {
        var item = document.createElement('span');
        item.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
        var swatch = document.createElement('span');
        swatch.style.cssText = 'width:12px;height:12px;border-radius:50%;display:inline-block;'
          + 'background:' + colorFor(k) + ';';
        item.appendChild(swatch);
        item.appendChild(document.createTextNode(names[k]));
        legend.appendChild(item);
      }
      host.appendChild(legend);
    }

    var frame = 0;
    var progress = 0;
    var playing = false;
    var raf = null;
    var last = 0;
    var FPS = 8; // Greenfoot's default speed is slow on purpose; so is this.

    function label() {
      counter.textContent = 'frame ' + (frame + 1) + ' of ' + trace.f.length;
    }

    function render() {
      draw(ctx, trace, frame, REDUCED ? 0 : progress, scale);
      label();
    }

    function tick(now) {
      if (!playing) return;
      if (!last) last = now;
      var dt = (now - last) / 1000;
      last = now;
      progress += dt * FPS;
      while (progress >= 1) {
        progress -= 1;
        frame++;
        if (frame >= trace.f.length - 1) {
          frame = trace.f.length - 1;
          progress = 0;
          pause();
          render();
          return;
        }
      }
      render();
      raf = window.requestAnimationFrame(tick);
    }

    function play() {
      if (frame >= trace.f.length - 1) { frame = 0; progress = 0; }
      playing = true;
      playBtn.textContent = 'Pause';
      last = 0;
      raf = window.requestAnimationFrame(tick);
    }

    function pause() {
      playing = false;
      playBtn.textContent = 'Play';
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
    }

    playBtn.addEventListener('click', function () { playing ? pause() : play(); });
    stepBtn.addEventListener('click', function () {
      pause();
      progress = 0;
      frame = Math.min(trace.f.length - 1, frame + 1);
      render();
    });
    resetBtn.addEventListener('click', function () {
      pause();
      frame = 0; progress = 0;
      render();
    });

    // The crash line. A run that threw is the most useful run a student gets,
    // and burying it in a console pane wastes it.
    if (trace.error) {
      var err = document.createElement('p');
      err.textContent = 'Ran ' + trace.f.length + ' frames, then stopped: ' + trace.error;
      err.style.cssText = 'margin:10px 0 0;padding:10px 12px;background:#fdf1ef;'
        + 'border:1px solid #f0cdc7;border-radius:5px;color:#96261b;font-size:15px;';
      host.appendChild(err);
    }
    if (trace.trunc === 'actors') {
      var t = document.createElement('p');
      t.textContent = 'Stopped early: more than 300 actors were in the world at once. '
        + 'That usually means something is being created every frame.';
      t.style.cssText = 'margin:10px 0 0;padding:10px 12px;background:#fbf7ec;'
        + 'border:1px solid #ecdfc0;border-radius:5px;font-size:15px;';
      host.appendChild(t);
    }

    render();

    return {
      destroy: function () { pause(); host.textContent = ''; },
    };
  }

  window.GreenfootPlayer = { mount: mount, draw: draw };
}());
