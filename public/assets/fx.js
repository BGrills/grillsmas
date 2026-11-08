/* Grillsmas FX: snow, twinkle trail, lights, wiggly letters, jingles, confetti.
   Maximum kitsch, minimum dependencies. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(pointer: coarse)').matches;

  // ── Falling snow ────────────────────────────────────────────
  const canvas = document.getElementById('snow');
  let flakes = [];
  let blizzardUntil = 0;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = innerWidth * devicePixelRatio;
      canvas.height = innerHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    addEventListener('resize', resize);
    const makeFlake = (top = false) => ({
      x: Math.random() * innerWidth,
      y: top ? -10 : Math.random() * innerHeight,
      r: 1 + Math.random() * 3.2,
      vy: 0.4 + Math.random() * 1.1,
      sway: Math.random() * Math.PI * 2,
      fancy: Math.random() < 0.08,
    });
    const base = reduced ? 25 : touch ? 70 : 130;
    flakes = Array.from({ length: base }, () => makeFlake());
    const tick = () => {
      const storm = Date.now() < blizzardUntil;
      const want = storm ? base * 4 : base;
      while (flakes.length < want) flakes.push(makeFlake(true));
      if (flakes.length > want) flakes.length = want;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const f of flakes) {
        f.y += f.vy * (storm ? 3 : 1);
        f.sway += 0.01 + f.r * 0.003;
        f.x += Math.sin(f.sway) * 0.6 + (storm ? 2.2 : 0);
        if (f.y > innerHeight + 10 || f.x > innerWidth + 20) Object.assign(f, makeFlake(true), { x: Math.random() * innerWidth });
        if (f.fancy) {
          ctx.font = `${f.r * 5}px serif`;
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          ctx.fillText('❄', f.x, f.y);
        } else {
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,.85)';
          ctx.fill();
        }
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  // ── Twinkly cursor trail ───────────────────────────────────
  const TRAIL = ['❄', '✨', '⭐', '❅', '❆', '✦'];
  const TRAIL_COLOURS = ['#fff', '#ffe066', '#ff6b6b', '#7CFC9A', '#a5d8ff'];
  let lastSpawn = 0;
  let alive = 0;
  const spawnTwinkle = (x, y) => {
    if (alive > 60) return;
    const s = document.createElement('span');
    s.className = 'twinkle';
    s.textContent = TRAIL[(Math.random() * TRAIL.length) | 0];
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.color = TRAIL_COLOURS[(Math.random() * TRAIL_COLOURS.length) | 0];
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}px`);
    s.style.setProperty('--rot', `${(Math.random() - 0.5) * 360}deg`);
    s.style.fontSize = `${10 + Math.random() * 14}px`;
    alive++;
    s.addEventListener('animationend', () => { s.remove(); alive--; });
    document.body.appendChild(s);
  };
  if (!reduced) {
    const onMove = (x, y) => {
      const now = performance.now();
      if (now - lastSpawn < 28) return;
      lastSpawn = now;
      spawnTwinkle(x, y);
    };
    addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true });
  }

  // ── Christmas lights ────────────────────────────────────────
  document.querySelectorAll('.lights').forEach((wire) => {
    const n = Math.max(12, Math.round(innerWidth / 48));
    const colours = ['red', 'green', 'gold', 'blue', 'pink'];
    for (let i = 0; i < n; i++) {
      const b = document.createElement('i');
      b.className = `bulb ${colours[i % colours.length]}`;
      b.style.left = `${(i + 0.5) * (100 / n)}%`;
      b.style.top = `${Math.sin((i / (n - 1)) * Math.PI) * 18}px`;
      b.style.animationDelay = `${(Math.random() * 1.6).toFixed(2)}s`;
      b.style.animationDuration = `${(1 + Math.random() * 1.4).toFixed(2)}s`;
      wire.appendChild(b);
    }
  });

  // ── Bouncy, candy-coloured title letters ───────────────────
  document.querySelectorAll('[data-wiggle]').forEach((el) => {
    const txt = el.textContent;
    el.textContent = '';
    el.setAttribute('aria-label', txt);
    [...txt].forEach((ch, i) => {
      const s = document.createElement('span');
      s.textContent = ch;
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);
      if (ch === ' ') s.className = 'sp';
      el.appendChild(s);
    });
  });

  // ── Sounds (Web Audio, nothing to download) ────────────────
  let audio;
  let soundOn = false;
  try { soundOn = localStorage.getItem('grillsmas_sound') === 'on'; } catch {}
  const ac = () => (audio ||= new (window.AudioContext || window.webkitAudioContext)());
  const bell = (freq, when, dur = 0.5, vol = 0.18) => {
    const a = ac();
    const t = a.currentTime + when;
    [1, 2.76, 5.4].forEach((m, k) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = 'sine';
      o.frequency.value = freq * m;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol / (k + 1), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (k + 1));
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + dur);
    });
  };
  // "Jingle Bells" (James Lord Pierpont, 1857: public domain) opening phrase.
  const E5 = 659.25, G5 = 783.99, C5 = 523.25, D5 = 587.33;
  const JINGLE = [[E5, 0], [E5, .2], [E5, .4], [E5, .8], [E5, 1], [E5, 1.2], [E5, 1.6], [G5, 1.8], [C5, 2.1], [D5, 2.3], [E5, 2.5]];
  const FX = {
    get soundOn() { return soundOn; },
    setSound(on) {
      soundOn = on;
      try { localStorage.setItem('grillsmas_sound', on ? 'on' : 'off'); } catch {}
      if (on) FX.ding();
    },
    ding() { if (soundOn) { bell(1568, 0, 0.6); bell(2093, 0.08, 0.5, 0.1); } },
    jingle(force = false) { if (soundOn || force) JINGLE.forEach(([f, t]) => bell(f, t, 0.45)); },
    burst(x, y, emojis = ['🎁', '⭐', '🎄', '❄️', '🍬', '🔔']) {
      const count = reduced ? 8 : 26;
      for (let i = 0; i < count; i++) {
        const s = document.createElement('span');
        s.className = 'confetti';
        s.textContent = emojis[i % emojis.length];
        const ang = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 160;
        s.style.left = `${x}px`;
        s.style.top = `${y}px`;
        s.style.setProperty('--tx', `${Math.cos(ang) * dist}px`);
        s.style.setProperty('--ty', `${Math.sin(ang) * dist - 60}px`);
        s.style.setProperty('--rot', `${(Math.random() - 0.5) * 720}deg`);
        s.addEventListener('animationend', () => s.remove());
        document.body.appendChild(s);
      }
    },
    blizzard(ms = 6000) { blizzardUntil = Date.now() + ms; },
    santa() {
      const s = document.createElement('div');
      s.className = 'santa-zoom';
      s.textContent = '🎅';
      s.addEventListener('animationend', () => s.remove());
      document.body.appendChild(s);
    },
  };
  window.FX = FX;

  // ── Easter eggs ─────────────────────────────────────────────
  let typed = '';
  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    typed = (typed + e.key.toLowerCase()).slice(-6);
    if (typed === 'hohoho') {
      FX.blizzard(8000);
      FX.santa();
      FX.jingle(true);
      typed = '';
    }
  });
  const star = document.getElementById('star');
  if (star) {
    let clicks = 0;
    star.addEventListener('click', (e) => {
      clicks++;
      star.classList.remove('spin'); void star.offsetWidth; star.classList.add('spin');
      FX.ding();
      FX.burst(e.clientX, e.clientY, ['⭐', '✨', '🌟']);
      if (clicks % 5 === 0) { FX.blizzard(); FX.santa(); FX.jingle(true); }
    });
  }
})();
