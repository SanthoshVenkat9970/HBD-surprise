/* =============================================================
   Birthday Surprise — script.js
   Vanilla JS, no dependencies.

   1. CONFIG (edit me!)        7. Progress candles
   2. Helpers                  8. Router (scene transitions)
   3. Sound (WebAudio)         9. Cake / knife builders
   4. FX canvas (rAF)         10. Scenes
   5. Ambient sprinkles (rAF) 11. Finale extras (crown, share)
   6. Floaters (DOM + CSS)    12. Boot
   ============================================================= */
(() => {
  'use strict';

  /* ===========================================================
     1. CONFIG — personalise the whole experience here
     =========================================================== */
  const CONFIG = {
    name: 'Ambii',           // birthday person
    nickname: 'Ambii',       // used in "Happy Birthday, …!" and on the card — set a pet name here if you like
    from: 'Santhosh',        // who made the surprise
    age: 29,                 // number topper on the cake

    // Photos / stickers shown in frames. Replace with your own (jpg, png, gif, webp, svg).
    photos: {
      surprise: 'assets/stickers/hug.svg',   // pops out of the gift box
      wish: 'assets/stickers/cake.svg',      // "Your wish is on its way" note
      balloons: 'assets/stickers/wave.svg',  // between the balloons
      reasons: 'assets/stickers/cheer.svg',  // above the reasons list
    },

    wishNote: 'Whatever you wished for, I hope I get to be there when it comes true ✨',
    sliceNote: 'The first slice is always yours.\nSo is the last one. So am I 🍰',

    // Exactly 5 — one per balloon, revealed in this order.
    reasons: [
      'Your laugh...',
      'Talking like feminist.',
      'Your sleepy voice.',
      'You’re my favourite person to do nothing with.',
      'Are u thinging only these.. there is lot!!!',

    ],

    letter: {
  greeting: 'Dear Ambii,',
  paragraphs: [
    'Happy Birthday to the most special girl! I hope your day is filled with happiness, laughter, and beautiful memories. You deserve all the love, success, and joy that life has to offer.',

    'You already know this, but I have known you for almost two years, ever since I came to the Tharamani office. The funny thing is that the first time we actually spoke was because of an office issue. After that, whenever I tried talking to you, you always seemed to avoid me. Even now, you keep saying that you are avoiding me! 😄',

    'But something unexpected happened two months ago when you started talking to me. I still remember that day and how happy I was. After that, we talked about so many things. These last two months have genuinely been some of my happiest days.',

    'There are so many things I admire about you. I like the confidence with which you express your thoughts, especially your feminist views. You are bold, independent, strong in the way you speak, yet incredibly emotional and caring at the same time. And yes, as you always say, I probably keep disturbing you more than I should. 😊',

    'This year, I hope you get every single thing you wished for: the big dreams, the small wins, the lazy Sundays, the extra cheese, and all the happiness you deserve. May every dream you carry in your heart become a reality.',

    'Sorry for coming late into your life, but the best things always come late!',

    'Today, on your birthday, I want to give you one special gift. You can ask me any question, and I promise I will answer honestly. No lies, no hiding anything.'
  ],
  signoff: 'by,',
  signature: 'Santhosh',
},

    crownTitle: 'Birthday Queen',

    // "Tell Santhosh" button. Put a WhatsApp number with country code (e.g. '919876543210')
    // to open WhatsApp directly; leave empty to use the device share sheet / clipboard.
    contact: {
      whatsapp: '',
      message: 'I opened my surprise and I’m smiling so much 🥹🎂💗 Best day ever!',
    },

    // Background music. Leave `src` empty to use the built-in music-box melody
    // (generated live with WebAudio — no file needed). Or drop an mp3 in assets/audio/.
    music: {
      src: '',               // e.g. 'assets/audio/bgm.mp3'
      volume: 0.55,
      autoStart: true,       // start on the first tap (browsers block audio before that)
    },
  };

  /* ===========================================================
     2. HELPERS
     =========================================================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const TAU = Math.PI * 2;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = matchMedia('(pointer: coarse)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (_) { /* unsupported */ } };
  const centerOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
  const restartClass = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const seeded = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* private mode */ } },
  };

  // Timers that are cancelled automatically when the scene changes.
  let sceneToken = 0;
  const later = (fn, ms) => { const t = sceneToken; return setTimeout(() => { if (t === sceneToken) fn(); }, ms); };

  /* ===========================================================
     3. SOUND — music-box "Happy Birthday" + tiny SFX, all WebAudio
     =========================================================== */
  const Sound = (() => {
    const btn = $('#btnMusic');
    const KEY = 'bday-muted';
    let ctx = null, master, musicBus, sfxBus, noiseBuf;
    let on = false, started = false, timer = 0, loopStart = 0, idx = 0;
    let audioEl = null;

    const BEAT = 0.5;
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    // Happy Birthday (traditional melody, public domain) — [midi note, beats]
    const MELODY = [
      [67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2],
      [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2],
      [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 1],
      [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 3],
    ];
    const C = [48, 55, 64], G7 = [43, 53, 59], F = [41, 57, 60];
    const BARS = [C, G7, G7, C, C, F, G7, C, C];
    const LOOP = 27; // 25 beats of melody + 2 beats of breath
    const EVENTS = (() => {
      const ev = [];
      let t = 0;
      for (const [m, d] of MELODY) { ev.push({ t, m, kind: 'lead', d }); t += d; }
      BARS.forEach((ch, k) => {
        const b = 1 + 3 * k;
        ev.push({ t: b, m: ch[0], kind: 'bass' });
        ev.push({ t: b + 1, m: ch[1], kind: 'pad' }, { t: b + 1, m: ch[2], kind: 'pad' });
        ev.push({ t: b + 2, m: ch[1], kind: 'pad' }, { t: b + 2, m: ch[2], kind: 'pad' });
      });
      ev.forEach(e => { e.t %= LOOP; });
      return ev.sort((a, b) => a.t - b.t);
    })();

    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        musicBus = ctx.createGain(); musicBus.gain.value = 0;
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
        // soft echo for a dreamy music-box room
        const delay = ctx.createDelay(1); delay.delayTime.value = 0.32;
        const fb = ctx.createGain(); fb.gain.value = 0.28;
        const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2400;
        musicBus.connect(master);
        musicBus.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function env(g, t, peak, attack, decay) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }
    function bell(m, t, vel = 1, dur = 1.6, bus = musicBus) {
      const f = mtof(m), g = ctx.createGain();
      g.connect(bus); env(g, t, 0.2 * vel, 0.006, dur);
      [[1, 1, 'sine'], [2.004, 0.3, 'sine'], [4.01, 0.06, 'triangle']].forEach(([mul, amp, type]) => {
        const o = ctx.createOscillator(), a = ctx.createGain();
        o.type = type; o.frequency.value = f * mul; a.gain.value = amp;
        o.connect(a).connect(g); o.start(t); o.stop(t + dur + 0.1);
      });
    }
    function soft(m, t, vel, dur) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = mtof(m);
      o.connect(g).connect(musicBus); env(g, t, 0.16 * vel, 0.02, dur);
      o.start(t); o.stop(t + dur + 0.1);
    }
    function noise(t, dur, { type = 'bandpass', freq = 1200, q = 0.8, peak = 0.5, sweepTo = 0 } = {}) {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuf; src.loop = true;
      f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
      if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
      src.connect(f).connect(g).connect(sfxBus); env(g, t, peak, 0.005, dur);
      src.start(t); src.stop(t + dur + 0.05);
      return { src, g };
    }

    function tick() {
      if (!ctx) return;
      const now = ctx.currentTime;
      for (let guard = 0; guard < 64; guard++) {
        const e = EVENTS[idx], t = loopStart + e.t * BEAT;
        if (t > now + 0.3) break;
        if (t > now - 0.03) {
          if (e.kind === 'lead') bell(e.m, t, 1, Math.max(1.1, e.d * BEAT * 2.4));
          else if (e.kind === 'bass') soft(e.m, t, 0.65, 1.2);
          else soft(e.m, t, 0.24, 0.45);
        }
        if (++idx >= EVENTS.length) { idx = 0; loopStart += LOOP * BEAT; }
      }
    }

    function startMusic() {
      if (CONFIG.music.src) {
        if (!audioEl) {
          audioEl = new Audio(CONFIG.music.src);
          audioEl.loop = true; audioEl.volume = CONFIG.music.volume; audioEl.preload = 'auto';
          audioEl.addEventListener('error', () => { audioEl = null; CONFIG.music.src = ''; if (on) startMusic(); }, { once: true });
        }
        audioEl.play().catch(() => {});
        return;
      }
      if (!ensure()) return;
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setTargetAtTime(CONFIG.music.volume, ctx.currentTime, 0.25);
      if (!timer) { loopStart = ctx.currentTime + 0.12; idx = 0; tick(); timer = setInterval(tick, 50); }
    }
    function stopMusic() {
      if (audioEl) audioEl.pause();
      if (ctx && musicBus) {
        musicBus.gain.cancelScheduledValues(ctx.currentTime);
        musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      }
      clearInterval(timer); timer = 0;
    }
    function setOn(v) {
      on = v; started = true;
      store.set(KEY, v ? '0' : '1');
      btn.classList.toggle('is-on', v);
      btn.setAttribute('aria-pressed', String(v));
      btn.setAttribute('aria-label', v ? 'Mute music' : 'Play music');
      if (v) { ensure(); startMusic(); } else stopMusic();
    }

    btn.addEventListener('click', () => { ensure(); setOn(!on); });

    const ok = () => on && ctx && ctx.state === 'running';
    return {
      /** Call from any user gesture: creates/resumes the AudioContext and auto-starts music once. */
      unlock() {
        if (!ensure()) return;
        if (!started && CONFIG.music.autoStart && store.get(KEY) !== '1') setOn(true);
      },
      visibility(hidden) {
        if (!ctx) return;
        if (hidden) { ctx.suspend(); if (audioEl) audioEl.pause(); }
        else if (on) { ctx.resume(); if (audioEl) audioEl.play().catch(() => {}); }
      },
      tap(level) {
        if (!ok()) return; const t = ctx.currentTime;
        (level === 1 ? [76, 79] : [79, 84, 88]).forEach((m, i) => bell(m, t + i * 0.06, 0.9, 0.7, sfxBus));
      },
      chime(n = 1) {
        if (!ok()) return; const t = ctx.currentTime;
        const scale = [72, 74, 76, 79, 81, 84, 86, 88];
        bell(scale[(n - 1) % scale.length] + 12, t, 0.8, 0.9, sfxBus);
      },
      sparkle() {
        if (!ok()) return; const t = ctx.currentTime;
        [84, 88, 91, 96].forEach((m, i) => bell(m, t + i * 0.07, 0.55, 0.8, sfxBus));
      },
      open() {
        if (!ok()) return; const t = ctx.currentTime;
        noise(t, 0.35, { freq: 600, sweepTo: 3000, q: 1, peak: 0.35 });
        [72, 76, 79, 84, 88].forEach((m, i) => bell(m, t + 0.12 + i * 0.08, 0.9, 1.4, sfxBus));
      },
      pop() {
        if (!ok()) return; const t = ctx.currentTime;
        noise(t, 0.12, { freq: 1500, q: 0.7, peak: 0.9 });
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
        o.connect(g).connect(sfxBus); env(g, t, 0.5, 0.003, 0.14); o.start(t); o.stop(t + 0.2);
        bell(rand(84, 91) | 0, t + 0.05, 0.4, 0.5, sfxBus);
      },
      boom() {
        if (!ok()) return; const t = ctx.currentTime;
        noise(t, 0.5, { type: 'lowpass', freq: 400, q: 0.5, peak: 0.25 });
        for (let i = 0; i < 6; i++) noise(t + 0.15 + Math.random() * 0.4, 0.03, { type: 'highpass', freq: 4000, peak: 0.12 });
      },
      slice() {
        if (!ok()) return; const t = ctx.currentTime;
        noise(t, 0.4, { type: 'highpass', freq: 2500, sweepTo: 6000, peak: 0.18 });
      },
      puff() {
        if (!ok()) return; const t = ctx.currentTime;
        noise(t, 0.6, { type: 'lowpass', freq: 1800, sweepTo: 300, q: 0.4, peak: 0.6 });
      },
      /** Continuous breathy noise while holding the blow button. */
      breath() {
        if (!ok()) return { stop() {} };
        const t = ctx.currentTime;
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = noiseBuf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6;
        src.connect(f).connect(g).connect(sfxBus);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.25);
        f.frequency.linearRampToValueAtTime(1800, t + 1.8);
        src.start(t);
        return { stop() { const n = ctx.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, 0.08); src.stop(n + 0.4); } };
      },
      click() {
        if (!ok()) return; bell(91, ctx.currentTime, 0.35, 0.3, sfxBus);
      },
    };
  })();

  /* ===========================================================
     4. FX CANVAS — confetti, fireworks, sparkles, hearts, shards
        One requestAnimationFrame loop that sleeps when idle.
     =========================================================== */
  const FX = (() => {
    const cv = $('#fx');
    const c = cv.getContext('2d');
    const PALETTE = ['#ff5c93', '#ffc94d', '#7fd8b5', '#b49cf2', '#ff8fb1', '#6cc6ff', '#ffffff', '#ff8a5c'];
    const FIRE = ['#ff4f8b', '#ffc23d', '#3fd3a0', '#9f7bff', '#ff7a45', '#38b6ff', '#ff5fd2'];
    const SPARK = ['#ffd35c', '#fff3b0', '#ff9ac0', '#ffffff', '#c9b4ff'];
    const MAX = COARSE ? 600 : 1100;
    let W = 0, H = 0, DPR = 1, raf = 0, last = 0, lastTrail = 0;
    const parts = [];

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    }
    const add = p => { if (parts.length < MAX) { p.life = 0; parts.push(p); } };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const fade = (p, tail) => (p.life > p.max - tail ? Math.max(0, (p.max - p.life) / tail) : 1);

    function step(p, dt) {
      switch (p.k) {
        case 'conf': {
          const d = Math.exp(-3.6 * dt);
          p.vy += 820 * dt; p.vx *= d; p.vy *= d;
          p.x += (p.vx + Math.sin(p.life * p.sw + p.ph) * 38) * dt; p.y += p.vy * dt;
          p.rot += p.vr * dt; p.tilt += p.vt * dt;
          return p.y < H + 40;
        }
        case 'spark': case 'ember': {
          const d = Math.exp(-(p.k === 'ember' ? 3 : 2.1) * dt);
          p.vx *= d; p.vy = p.vy * d + 150 * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          return true;
        }
        case 'rocket': {
          p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (Math.random() < 0.9) add({ k: 'ember', x: p.x, y: p.y + 4, vx: rand(-25, 25), vy: rand(20, 80), s: rand(1.4, 2.4), col: '#ffe9a8', max: rand(0.25, 0.5) });
          if (p.vy >= -40) { explode(p.x, p.y); return false; }
          return true;
        }
        case 'star': {
          const d = Math.exp(-4 * dt);
          p.vx *= d; p.vy *= d; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          return true;
        }
        case 'heart': {
          p.vy *= Math.exp(-0.4 * dt);
          p.x += (p.vx + Math.sin(p.life * 4 + p.ph) * 34) * dt; p.y += p.vy * dt;
          return true;
        }
        case 'shard': {
          const d = Math.exp(-2.4 * dt);
          p.vy += 900 * dt; p.vx *= d; p.vy *= d;
          p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          return true;
        }
        case 'flash': return true;
        default: return false;
      }
    }

    function draw(p) {
      switch (p.k) {
        case 'conf': {
          const sy = Math.cos(p.tilt), cr = Math.cos(p.rot), sr = Math.sin(p.rot);
          c.setTransform(DPR * cr, DPR * sr, -DPR * sr * sy, DPR * cr * sy, DPR * p.x, DPR * p.y);
          c.globalAlpha = fade(p, 0.8);
          c.fillStyle = p.col;
          if (p.round) { c.beginPath(); c.arc(0, 0, p.w * 0.42, 0, TAU); c.fill(); }
          else c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          break;
        }
        case 'spark': case 'ember': {
          c.setTransform(DPR, 0, 0, DPR, 0, 0);
          let a = 1 - p.life / p.max;
          if (p.glit && p.life > p.max * 0.45 && Math.random() < 0.4) a *= 0.2;
          c.globalAlpha = a;
          c.strokeStyle = p.col; c.lineWidth = p.s; c.lineCap = 'round';
          c.beginPath(); c.moveTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); c.lineTo(p.x, p.y); c.stroke();
          break;
        }
        case 'rocket': {
          c.setTransform(DPR, 0, 0, DPR, 0, 0);
          c.globalAlpha = 1; c.fillStyle = '#fff4cf';
          c.beginPath(); c.arc(p.x, p.y, 3, 0, TAU); c.fill();
          break;
        }
        case 'flash': {
          c.setTransform(DPR, 0, 0, DPR, 0, 0);
          const t = p.life / p.max, r = p.r * (0.6 + t * 0.8);
          const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, p.col); g.addColorStop(1, 'rgba(255,255,255,0)');
          c.globalAlpha = (1 - t) * 0.55; c.fillStyle = g;
          c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill();
          break;
        }
        case 'star': {
          const t = p.life / p.max, s = p.s * Math.sin(Math.PI * Math.min(1, t * 1.05));
          const cr = Math.cos(p.rot), sr = Math.sin(p.rot);
          c.setTransform(DPR * cr, DPR * sr, -DPR * sr, DPR * cr, DPR * p.x, DPR * p.y);
          c.globalAlpha = 1 - t * t; c.fillStyle = p.col;
          c.beginPath();
          for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? s * 0.32 : s; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          c.closePath(); c.fill();
          break;
        }
        case 'heart': {
          const pop = Math.min(1, p.life / 0.18), s = p.s * (0.6 + 0.4 * pop);
          c.setTransform(DPR, 0, 0, DPR, DPR * p.x, DPR * p.y);
          c.globalAlpha = Math.min(pop, fade(p, 0.6)); c.fillStyle = p.col;
          c.beginPath();
          c.moveTo(0, s * 0.45);
          c.bezierCurveTo(-s * 0.62, s * 0.05, -s * 0.55, -s * 0.48, -s * 0.25, -s * 0.48);
          c.bezierCurveTo(-s * 0.1, -s * 0.48, 0, -s * 0.36, 0, -s * 0.22);
          c.bezierCurveTo(0, -s * 0.36, s * 0.1, -s * 0.48, s * 0.25, -s * 0.48);
          c.bezierCurveTo(s * 0.55, -s * 0.48, s * 0.62, s * 0.05, 0, s * 0.45);
          c.fill();
          break;
        }
        case 'shard': {
          const cr = Math.cos(p.rot), sr = Math.sin(p.rot);
          c.setTransform(DPR * cr, DPR * sr, -DPR * sr, DPR * cr, DPR * p.x, DPR * p.y);
          c.globalAlpha = fade(p, 0.4); c.fillStyle = p.col;
          c.beginPath(); c.moveTo(0, -p.s); c.lineTo(p.s * 0.8, p.s * 0.6); c.lineTo(-p.s * 0.7, p.s * 0.5); c.closePath(); c.fill();
          break;
        }
        default: break;
      }
    }

    function loop(now) {
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      let j = 0;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.life += dt;
        if (p.life < p.max && step(p, dt)) { draw(p); parts[j++] = p; }
      }
      parts.length = j;
      c.globalAlpha = 1;
      raf = parts.length ? requestAnimationFrame(loop) : 0;
      if (!raf) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); }
    }

    function explode(x, y) {
      const n = COARSE ? 52 : 74, c1 = pick(FIRE), c2 = pick(FIRE), ring = Math.random() < 0.5;
      add({ k: 'flash', x, y, r: rand(60, 90), col: c1 + '88', max: 0.35 });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.05, 0.05);
        const sp = ring ? rand(260, 300) : rand(80, 320);
        add({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: rand(2.2, 3.4), col: i % 3 ? c1 : c2, glit: Math.random() < 0.5, max: rand(1, 1.6) });
      }
      for (let i = 0; i < 8; i++) {
        const a = rand(0, TAU), sp = rand(40, 140);
        add({ k: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: rand(5, 9), rot: rand(0, TAU), vr: rand(-3, 3), col: '#fff6c8', max: rand(0.6, 1) });
      }
      Sound.boom();
    }

    const api = {
      resize,
      clear() { parts.length = 0; },
      confetti(x, y, n = 120, o = {}) {
        if (REDUCED) n = Math.min(n, 30);
        const angle = o.angle ?? -Math.PI / 2, spread = o.spread ?? TAU, power = o.power ?? 1, cols = o.colors || PALETTE;
        const radial = spread > 5;
        for (let i = 0; i < n; i++) {
          const a = angle + (Math.random() - 0.5) * spread, sp = rand(250, 1150) * power;
          add({
            k: 'conf', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (radial ? rand(100, 380) * power : 0),
            w: rand(7, 12), h: rand(4, 7), rot: rand(0, TAU), vr: rand(-8, 8), tilt: rand(0, TAU), vt: rand(4, 11),
            col: pick(cols), round: Math.random() < 0.22, sw: rand(1.5, 3.5), ph: rand(0, TAU), max: rand(3, 4.8),
          });
        }
        kick();
      },
      cannons(power = 1.9) {
        api.confetti(-10, H + 10, COARSE ? 55 : 80, { angle: -Math.PI / 3, spread: 0.55, power });
        api.confetti(W + 10, H + 10, COARSE ? 55 : 80, { angle: (-2 * Math.PI) / 3, spread: 0.55, power });
      },
      rain(n = 120, dur = 1600) {
        for (let i = 0; i < n; i++) {
          setTimeout(() => {
            add({ k: 'conf', x: rand(0, W), y: -20, vx: rand(-60, 60), vy: rand(60, 220), w: rand(7, 12), h: rand(4, 7), rot: rand(0, TAU), vr: rand(-6, 6), tilt: rand(0, TAU), vt: rand(4, 10), col: pick(PALETTE), round: Math.random() < 0.2, sw: rand(1.5, 3), ph: rand(0, TAU), max: rand(5, 7) });
            kick();
          }, (i / n) * dur);
        }
      },
      sparkles(x, y, n = 16, o = {}) {
        const radius = o.radius ?? 60, cols = o.colors || SPARK;
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU), d = rand(0.25, 1) * radius;
          add({ k: 'star', x: x + Math.cos(a) * d * 0.25, y: y + Math.sin(a) * d * 0.25, vx: Math.cos(a) * d * 3, vy: Math.sin(a) * d * 3, s: rand(5, 11), rot: rand(0, TAU), vr: rand(-3, 3), col: pick(cols), max: rand(0.6, 1.1) });
        }
        kick();
      },
      hearts(x, y, n = 10) {
        for (let i = 0; i < n; i++) add({ k: 'heart', x: x + rand(-50, 50), y: y + rand(-20, 20), vx: rand(-40, 40), vy: rand(-170, -70), s: rand(14, 26), col: pick(['#ff5c93', '#ff8fb1', '#ec4f86', '#ffb3c8', '#f43f7a']), ph: rand(0, TAU), max: rand(1.4, 2.3) });
        kick();
      },
      shards(x, y, col, n = 24) {
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU), sp = rand(150, 520);
          add({ k: 'shard', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, s: rand(4, 10), rot: rand(0, TAU), vr: rand(-12, 12), col, max: rand(0.6, 1.1) });
        }
        kick();
      },
      firework(tx, ty) {
        if (REDUCED) { explode(tx, ty); kick(); return; }
        const x0 = tx + rand(-60, 60), y0 = H + 10, dy = Math.max(80, y0 - ty);
        const vy = -Math.sqrt(2 * 900 * dy), t = -vy / 900;
        add({ k: 'rocket', x: x0, y: y0, vx: (tx - x0) / t, vy, max: 4 });
        kick();
      },
      show(count = 5, dur = 2400) {
        for (let i = 0; i < count; i++) {
          setTimeout(() => api.firework(rand(W * 0.14, W * 0.86), rand(H * 0.12, H * 0.4)), (i / count) * dur + rand(0, 180));
        }
      },
      trail(x, y) {
        const now = performance.now();
        if (now - lastTrail < 28) return;
        lastTrail = now;
        add({ k: 'star', x, y, vx: rand(-30, 30), vy: rand(-30, 30), s: rand(4, 7), rot: rand(0, TAU), vr: rand(-3, 3), col: pick(SPARK), max: 0.5 });
        kick();
      },
    };
    return api;
  })();

  /* ===========================================================
     5. AMBIENT SPRINKLES — slow falling confetti behind everything
     =========================================================== */
  const Ambient = (() => {
    const cv = $('#ambient');
    const c = cv.getContext('2d');
    const COLS = ['#c9b0ff', '#9be3c8', '#ffd77a', '#ffffff', '#ffb8cb'];
    let W = 0, H = 0, DPR = 1, bits = [], raf = 0, last = 0, t = 0;

    const make = anywhere => ({
      x: rand(0, W), y: anywhere ? rand(0, H) : rand(-40, -10),
      vy: rand(9, 24), sw: rand(0.4, 1.1), ph: rand(0, TAU), amp: rand(6, 16),
      rot: rand(0, TAU), vr: rand(-0.8, 0.8), len: rand(9, 14), th: rand(3, 4.2),
      col: pick(COLS), a: rand(0.5, 0.95),
    });
    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      const n = Math.round(clamp((W * H) / 30000, 14, 48));
      // Keep existing sprinkles on resize (mobile toolbars, rotation) so nothing "jumps".
      while (bits.length < n) bits.push(make(true));
      bits.length = n;
      bits.forEach(b => { if (b.x > W) b.x = rand(0, W); if (b.y > H) b.y = rand(0, H); });
      if (REDUCED) draw();
    }
    function draw() {
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      c.clearRect(0, 0, W, H);
      c.lineCap = 'round';
      for (const b of bits) {
        const x = b.x + Math.sin(t * b.sw + b.ph) * b.amp;
        const dx = Math.cos(b.rot) * b.len * 0.5, dy = Math.sin(b.rot) * b.len * 0.5;
        c.globalAlpha = b.a; c.strokeStyle = b.col; c.lineWidth = b.th;
        c.beginPath(); c.moveTo(x - dx, b.y - dy); c.lineTo(x + dx, b.y + dy); c.stroke();
      }
      c.globalAlpha = 1;
    }
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; t += dt;
      for (const b of bits) {
        b.y += b.vy * dt; b.rot += b.vr * dt;
        if (b.y > H + 20) Object.assign(b, make(false));
      }
      draw();
      raf = requestAnimationFrame(frame);
    }
    return {
      init() { resize(); if (!REDUCED) { last = performance.now(); raf = requestAnimationFrame(frame); } },
      resize,
    };
  })();

  /* ===========================================================
     6. FLOATERS — balloons, sparkles, hearts, strawberries (DOM + CSS keyframes)
     =========================================================== */
  function balloonSVG(color, mini) {
    const g = { pink: ['#ffd0dd', '#f8a1bb', '#ec6f96'], mint: ['#e2fbf1', '#a9e8d0', '#6fcca9'], lav: ['#efe8ff', '#cdbcf8', '#a48be8'], yellow: ['#fff6d5', '#ffe08f', '#f2bf45'], red: ['#ffd1d6', '#ff6b7d', '#e0344f'] }[color];
    const string = mini
      ? '<path d="M20 50 c-5 6 5 9 0 15 s-5 9 0 15" stroke="#6aa8ff" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
      : '<path d="M20 50 C17 62 23 74 19 92" stroke="#c9a0b0" stroke-width="1.1" fill="none"/>';
    return `<svg viewBox="0 0 40 96" aria-hidden="true">
      <path d="M20 2C31 2 38 11 38 22C38 34 28 45 20 47C12 45 2 34 2 22C2 11 9 2 20 2Z" fill="${g[1]}"/>
      <path d="M20 2C31 2 38 11 38 22C38 34 28 45 20 47C24 40 30 30 30 20C30 11 26 5 20 2Z" fill="${g[2]}" opacity=".55"/>
      <ellipse cx="13" cy="14" rx="5" ry="7.5" fill="${g[0]}" opacity=".9" transform="rotate(-20 13 14)"/>
      <path d="M17 47L23 47L20 51Z" fill="${g[2]}"/>${string}</svg>`;
  }

  function buildFloaters() {
    const host = $('#floaters');
    if (REDUCED) return;
    const small = innerWidth < 600;
    const COLORS = ['pink', 'mint', 'lav', 'yellow', 'pink', 'mint', 'red', 'yellow', 'red', 'lav', 'pink', 'red'];
    const lanes = [4, 9, 14, 22, 30, 70, 78, 86, 91, 96, 40, 60];
    const count = small ? 7 : 12;
    let html = '';
    for (let i = 0; i < count; i++) {
      const color = COLORS[i], mini = color === 'red';
      const w = mini ? rand(18, 24) : rand(26, 40);
      const dur = rand(30, 52);
      html += `<div class="fb" style="--x:${lanes[i] + rand(-2, 2)}%;--w:${w.toFixed(0)}px;--dur:${dur.toFixed(1)}s;--delay:${(-rand(0, dur)).toFixed(1)}s"><span class="fb__sway" style="--sd:${rand(3, 5.5).toFixed(1)}s">${balloonSVG(color, mini)}</span></div>`;
    }
    const sparks = [[34, 62, 30], [79, 57, 30], [35, 14, 26], [80, 31, 28], [27, 88, 24], [66, 8, 22]];
    sparks.slice(0, small ? 4 : 6).forEach(([x, y, s]) => {
      html += `<span class="fspark" style="--x:${x}%;--y:${y}%;--s:${s}px;--delay:${(-rand(0, 2.8)).toFixed(1)}s">✨</span>`;
    });
    const berries = [[93, 20, 15], [96, 68, 15], [58, 84, 13]];
    berries.slice(0, small ? 1 : 3).forEach(([x, y, s]) => {
      html += `<span class="fspark" style="--x:${x}%;--y:${y}%;--s:${s}px;--delay:${(-rand(0, 2.8)).toFixed(1)}s">🍓</span>`;
    });
    host.innerHTML = html;

    // A soft heart drifts up every few seconds.
    const spawnHeart = () => {
      if (document.hidden) return;
      const h = document.createElement('span');
      h.className = 'fheart';
      h.textContent = Math.random() < 0.75 ? '💗' : '💖';
      const side = Math.random() < 0.5 ? rand(4, 30) : rand(70, 96);
      h.style.cssText = `--x:${side}%;--s:${rand(14, 24).toFixed(0)}px;--dur:${rand(9, 14).toFixed(1)}s;--dx:${rand(-60, 60).toFixed(0)}px`;
      h.addEventListener('animationend', () => h.remove(), { once: true });
      host.appendChild(h);
    };
    setInterval(spawnHeart, small ? 4200 : 2800);
    spawnHeart();
  }

  /* ===========================================================
     7. PROGRESS CANDLES (top-left pill)
     =========================================================== */
  const Progress = (() => {
    const host = $('#progress');
    const TOTAL = 8;
    host.innerHTML = Array.from({ length: TOTAL }, () => '<span class="pc"><span class="pc__flame"></span><span class="pc__body"></span></span>').join('');
    const slots = $$('.pc', host);
    return {
      set(n) {
        slots.forEach((s, i) => {
          const lit = i < n;
          if (lit && !s.classList.contains('is-lit')) { s.classList.add('is-lit'); restartClass(s, 'is-new'); }
          if (!lit) s.classList.remove('is-lit', 'is-new');
        });
        host.setAttribute('aria-valuenow', String(n));
        host.setAttribute('aria-label', `Surprise progress: step ${n} of ${TOTAL}`);
      },
    };
  })();

  /* ===========================================================
     8. ROUTER — fade/scale transitions between scenes
     =========================================================== */
  const scenes = {};
  const trail = [];
  const btnBack = $('#btnBack');
  let current = null, busy = false;

  function go(id, { back = false, instant = false } = {}) {
    const next = scenes[id];
    if (busy || !next || id === current) return;
    busy = true;
    sceneToken++;
    const prev = current ? scenes[current] : null;
    if (prev) {
      prev.leave && prev.leave();
      const pel = prev.el;
      pel.classList.remove('is-active');
      pel.classList.add('is-leaving');
      pel.setAttribute('aria-hidden', 'true');
      pel.inert = true;
      setTimeout(() => pel.classList.remove('is-leaving'), 760);
      if (!back) trail.push(current);
    }
    next.reset && next.reset();
    next.el.scrollTop = 0;
    next.el.removeAttribute('aria-hidden');
    next.el.inert = false;
    next.el.classList.add('is-active');
    current = id;
    Progress.set(Number(next.el.dataset.step));
    btnBack.disabled = trail.length === 0;
    setTimeout(() => {
      busy = false;
      next.enter && next.enter();
      const h = $('.title[tabindex]', next.el);
      if (h && !instant) h.focus({ preventScroll: true });
    }, instant ? 30 : 520);
  }

  function replay() {
    if (busy) return;
    trail.length = 0;
    FX.clear();
    if (current === 'gift') { sceneToken++; scenes.gift.reset(); btnBack.disabled = true; }
    else go('gift', { back: true });
  }

  /* ===========================================================
     9. CAKE & KNIFE BUILDERS (inline SVG, reused by 5 scenes)
     =========================================================== */
  const Cake = (() => {
    const CX = 240, TOP = 190, RX = 176, RY = 30, BOT = 345, BAND = 274;
    const L = CX - RX, R = CX + RX;
    const STRIPES = { pink: '#ef5a8a', yellow: '#ffc43d', lav: '#a98bf0' };
    const SPRINKLES = ['#ffffff', '#ffd35c', '#7fd8b5', '#b49cf2', '#ffffff', '#ffe08a'];
    const CANDLES = [
      { dx: -137, base: 197, h: 66, col: 'pink' },
      { dx: -70, base: 184, h: 72, col: 'yellow' },
      { dx: 0, base: 178, num: true },
      { dx: 70, base: 184, h: 72, col: 'lav' },
      { dx: 137, base: 197, h: 66, col: 'pink' },
    ];
    const n1 = v => Math.round(v * 10) / 10;
    const frontY = x => { const t = (x - CX) / RX; return TOP + RY * Math.sqrt(Math.max(0, 1 - t * t)); };

    function drips() {
      const lens = [30, 18, 44, 24, 50, 22, 42, 20, 34];
      const n = lens.length;
      let d = `M${L} ${TOP} L${L} ${n1(frontY(L) + 10)}`;
      for (let i = 0; i < n; i++) {
        const pa = (i / n) * Math.PI, pb = ((i + 1) / n) * Math.PI, pm = (pa + pb) / 2;
        const xb = CX - RX * Math.cos(pb), xm = CX - RX * Math.cos(pm);
        const w = 21 * Math.max(0.45, Math.sin(pm)), len = lens[i] * (0.55 + 0.45 * Math.sin(pm));
        const ym = frontY(xm) + 10;
        d += ` Q${n1(xm - w * 0.95)} ${n1(ym - 2)} ${n1(xm - w / 2)} ${n1(ym + 6)}`;
        d += ` L${n1(xm - w / 2)} ${n1(ym + len - w / 2)}`;
        d += ` A${n1(w / 2)} ${n1(w / 2)} 0 0 0 ${n1(xm + w / 2)} ${n1(ym + len - w / 2)}`;
        d += ` L${n1(xm + w / 2)} ${n1(ym + 6)}`;
        d += ` Q${n1(xm + w * 0.95)} ${n1(ym - 2)} ${n1(xb)} ${n1(frontY(xb) + 10)}`;
      }
      d += ` L${R} ${TOP} A${RX} ${RY} 0 0 0 ${L} ${TOP} Z`;
      return d;
    }
    const DRIPS = drips();

    function flame(id, x, y) {
      return `<g transform="translate(${x} ${y + 2})"><g class="flame">
        <circle class="flame__glow" cx="0" cy="-15" r="27" fill="url(#${id}-glow)"/>
        <g class="flame__fire">
          <path d="M0 -31C6 -21 11 -13 9 -6C7 1 -7 1 -9 -6C-11 -13 -6 -21 0 -31Z" fill="url(#${id}-flame)"/>
          <path d="M0 -15C3 -10 4 -6 3 -3C2 0 -2 0 -3 -3C-4 -6 -3 -10 0 -15Z" fill="#fffbe6" opacity=".92"/>
        </g></g></g>
        <g class="smoke" transform="translate(${x} ${y})"><circle cx="0" cy="-4" r="4" fill="#d6cbd0"/><circle cx="2" cy="-8" r="5" fill="#e2d9dd"/><circle cx="-2" cy="-6" r="3.5" fill="#ebe3e6"/></g>`;
    }

    function candle(id, cd, i) {
      const x = CX + cd.dx;
      if (cd.num) {
        const top = 106;
        return `<g class="candle candle--num" data-i="${i}" tabindex="0" role="button" aria-label="Light the ${esc(CONFIG.age)} candle">
          <rect class="candle__hit" x="${x - 54}" y="${top - 52}" width="108" height="${cd.base - top + 56}" rx="14" fill="transparent"/>
          <text class="cake__age" x="${x}" y="${cd.base - 4}" text-anchor="middle">${esc(CONFIG.age)}</text>
          <line x1="${x}" y1="${top}" x2="${x}" y2="${top + 14}" stroke="#4a2a33" stroke-width="2.6" stroke-linecap="round"/>
          ${flame(id, x, top)}
          <text class="cake__spark candle__spark" x="${x}" y="${top - 46}" text-anchor="middle">✨</text>
        </g>`;
      }
      const top = cd.base - cd.h;
      return `<g class="candle" data-i="${i}" tabindex="0" role="button" aria-label="Light candle ${i + 1}">
        <rect class="candle__hit" x="${x - 24}" y="${top - 54}" width="48" height="${cd.h + 58}" rx="12" fill="transparent"/>
        <g class="candle__body">
          <rect x="${x - 9}" y="${top}" width="18" height="${cd.h}" rx="4.5" fill="url(#${id}-st-${cd.col})" stroke="#f0c2d0" stroke-width="1.2"/>
          <rect x="${x + 3}" y="${top + 1}" width="5" height="${cd.h - 2}" rx="2.5" fill="#000" opacity=".06"/>
          <rect x="${x - 6}" y="${top + 3}" width="3" height="${cd.h - 8}" rx="1.5" fill="#fff" opacity=".5"/>
        </g>
        <line x1="${x}" y1="${top - 11}" x2="${x}" y2="${top}" stroke="#4a2a33" stroke-width="2.4" stroke-linecap="round"/>
        ${flame(id, x, top - 11)}
        <text class="cake__spark candle__spark" x="${x}" y="${top - 52}" text-anchor="middle">✨</text>
      </g>`;
    }

    /**
     * @param {object} o
     * @param {string} o.id        unique prefix for gradient ids
     * @param {boolean} o.candles  draw the 5 candles
     * @param {boolean} o.plate    draw the plate
     * @param {boolean} o.cake     draw the cake itself
     * @param {boolean} o.core     draw the sponge "inside" (visible when the cake is cut)
     */
    function svg({ id, candles = false, plate = true, cake = true, core = false }) {
      const rnd = seeded(7);
      let s = `<svg viewBox="0 0 480 410" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>
        <linearGradient id="${id}-side" x1="0" x2="1">
          <stop offset="0" stop-color="#f4a2bc"/><stop offset=".15" stop-color="#f9c0d1"/><stop offset=".27" stop-color="#fde2ea"/>
          <stop offset=".34" stop-color="#f9c3d3"/><stop offset=".75" stop-color="#f7b1c7"/><stop offset="1" stop-color="#ef98b4"/>
        </linearGradient>
        <linearGradient id="${id}-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b0285e" stop-opacity="0"/><stop offset="1" stop-color="#b0285e" stop-opacity=".13"/></linearGradient>
        <linearGradient id="${id}-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ec4f80"/><stop offset=".14" stop-color="#ec4f80"/><stop offset=".14" stop-color="#f8dba6"/>
          <stop offset=".44" stop-color="#f8dba6"/><stop offset=".44" stop-color="#f5a3bd"/><stop offset=".5" stop-color="#f5a3bd"/>
          <stop offset=".5" stop-color="#fff"/><stop offset=".54" stop-color="#fff"/><stop offset=".54" stop-color="#f8dba6"/>
          <stop offset=".78" stop-color="#f8dba6"/><stop offset=".78" stop-color="#f5a3bd"/><stop offset=".84" stop-color="#f5a3bd"/>
          <stop offset=".84" stop-color="#f3d09a"/><stop offset="1" stop-color="#f3d09a"/>
        </linearGradient>
        <radialGradient id="${id}-flame" cx="50%" cy="72%" r="62%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffd84a"/><stop offset=".8" stop-color="#ff9a2e"/><stop offset="1" stop-color="#ff6f3c"/></radialGradient>
        <radialGradient id="${id}-glow"><stop offset="0" stop-color="#ffd34d" stop-opacity=".6"/><stop offset="1" stop-color="#ffd34d" stop-opacity="0"/></radialGradient>
        ${Object.entries(STRIPES).map(([k, col]) => `<pattern id="${id}-st-${k}" width="18" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)"><rect width="18" height="12" fill="#fff"/><rect width="18" height="5" fill="${col}"/></pattern>`).join('')}
      </defs>`;

      if (plate) {
        s += `<ellipse cx="${CX}" cy="364" rx="236" ry="37" fill="#eeb3c7"/>
          <ellipse cx="${CX}" cy="356" rx="233" ry="35" fill="#fff"/>
          <ellipse cx="${CX}" cy="352" rx="198" ry="25" fill="none" stroke="#fbd6e1" stroke-width="3"/>`;
      }
      if (core) {
        s += `<rect x="${CX - 26}" y="${TOP + 2}" width="52" height="${BOT - TOP + RY - 6}" rx="3" fill="url(#${id}-core)"/>`;
      }
      if (cake) {
        const wall = `M${L} ${TOP} L${L} ${BOT} A${RX} ${RY} 0 0 0 ${R} ${BOT} L${R} ${TOP} Z`;
        s += `<path d="${wall}" fill="url(#${id}-side)"/><path d="${wall}" fill="url(#${id}-shade)"/>`;
        s += `<path d="M${L} ${BAND} A${RX} ${RY} 0 0 0 ${R} ${BAND} L${R} ${BAND + 11} A${RX} ${RY} 0 0 1 ${L} ${BAND + 11} Z" fill="#f6d9a8"/>`;
        s += `<path d="M${L} ${BAND - 3} A${RX} ${RY} 0 0 0 ${R} ${BAND - 3}" fill="none" stroke="#fff" stroke-width="4" opacity=".9"/>`;
        s += `<text class="cake__name" x="${CX}" y="${BAND + 38}" text-anchor="middle" transform="rotate(-3 ${CX} ${BAND + 24})">${esc(CONFIG.name)}</text>`;
        const N = 15;
        for (let i = 0; i < N; i++) {
          const th = Math.PI * (1 - (i + 0.5) / N);
          const x = n1(CX + RX * Math.cos(th)), y = n1(BOT + RY * Math.sin(th) - 2);
          s += `<circle cx="${x}" cy="${y}" r="11" fill="#fff" stroke="#f6c3d3" stroke-width="1.5"/><circle cx="${n1(x - 3)}" cy="${n1(y - 3.5)}" r="3" fill="#fff" stroke="none" opacity=".9"/>`;
        }
        s += `<path d="${DRIPS}" fill="#ea4c7e"/>`;
        s += `<ellipse cx="${CX}" cy="${TOP}" rx="${RX}" ry="${RY}" fill="#ef5a88"/>`;
        s += `<ellipse cx="${CX}" cy="${TOP - 4}" rx="${n1(RX * 0.55)}" ry="${n1(RY * 0.4)}" fill="#f78fb0" opacity=".7"/>`;
        s += `<path d="M${L + 20} ${TOP + 20} q34 14 76 16" stroke="#fff" stroke-opacity=".3" stroke-width="5" stroke-linecap="round" fill="none"/>`;
        for (let i = 0; i < 30; i++) {
          const a = rnd() * TAU, rr = Math.sqrt(rnd());
          const x = n1(CX + Math.cos(a) * rr * RX * 0.84), y = n1(TOP + Math.sin(a) * rr * RY * 0.72);
          s += `<rect x="${n1(x - 5)}" y="${n1(y - 1.6)}" width="10" height="3.2" rx="1.6" fill="${SPRINKLES[i % SPRINKLES.length]}" transform="rotate(${Math.round(rnd() * 180)} ${x} ${y})"/>`;
        }
        if (candles) CANDLES.forEach((cd, i) => { s += candle(id, cd, i); });
      }
      return s + '</svg>';
    }
    return { svg };
  })();

  /* ===========================================================
     10. SCENES
     =========================================================== */

  /* ---------- 10.1 Gift (page1 → page1-1) ---------- */
  scenes.gift = (() => {
    const el = $('#scene-gift');
    const stage = $('#giftStage');
    const gift = $('#gift');
    const count = $('#tapCount');
    const countTxt = $('.tapcount__txt', count);
    const dots = $$('.tapcount__dots i', count);
    let taps = 0, opened = false;

    gift.addEventListener('animationend', e => {
      if (e.animationName === 'shake1' || e.animationName === 'shake2') gift.classList.remove('shake-1', 'shake-2');
    });

    function showCount(n) {
      countTxt.textContent = `Tap ${n}/3`;
      dots.forEach((d, i) => d.classList.toggle('on', i < n));
      count.classList.add('is-shown');
      restartClass(count, 'bump');
    }

    gift.addEventListener('click', () => {
      if (opened) return;
      taps++;
      const { x, y, r } = centerOf(gift);
      showCount(taps);
      if (taps < 3) {
        restartClass(gift, taps === 1 ? 'shake-1' : 'shake-2');
        stage.style.setProperty('--g', String(taps));
        FX.sparkles(x, y - r.height * 0.1, taps === 1 ? 14 : 36, { radius: r.width * (taps === 1 ? 0.45 : 0.65) });
        if (taps === 2) FX.hearts(x, y, 9);
        Sound.tap(taps);
        vibrate(taps === 1 ? 12 : 28);
      } else {
        open(x, r);
      }
    });

    function open(x, r) {
      opened = true;
      stage.style.setProperty('--g', '3');
      stage.classList.add('is-opening');
      gift.setAttribute('aria-label', 'The gift is open!');
      Sound.open();
      vibrate([30, 40, 70]);
      later(() => {
        FX.confetti(x, r.top + r.height * 0.35, COARSE ? 140 : 200, { angle: -Math.PI / 2, spread: Math.PI * 0.95, power: 1.1 });
        FX.cannons();
        FX.show(6, 2600);
        FX.sparkles(x, r.top + r.height * 0.3, 28, { radius: r.width * 0.8 });
      }, 380);
      later(() => {
        el.classList.add('is-open');
        $('.swap__a', el).setAttribute('aria-hidden', 'true');
        $('.swap__b', el).removeAttribute('aria-hidden');
        count.classList.remove('is-shown');
      }, 650);
      later(() => { const cta = $('.gift-foot__open .cta', el); cta && cta.focus({ preventScroll: true }); }, 1700);
    }

    function reset() {
      taps = 0; opened = false;
      el.classList.remove('is-open');
      stage.classList.remove('is-opening');
      stage.style.setProperty('--g', '0');
      gift.classList.remove('shake-1', 'shake-2');
      gift.setAttribute('aria-label', 'A wrapped gift. Tap it three times to open it.');
      count.classList.remove('is-shown', 'bump');
      dots.forEach(d => d.classList.remove('on'));
      countTxt.textContent = 'Tap 0/3';
      $('.swap__a', el).removeAttribute('aria-hidden');
      $('.swap__b', el).setAttribute('aria-hidden', 'true');
    }
    return { el, reset };
  })();

  /* ---------- 10.2 Light the candles (page2) ---------- */
  scenes.candles = (() => {
    const el = $('#scene-candles');
    const host = $('#cakeCandles');
    const litEl = $('#litCount');
    const btnAll = $('#btnLightAll');
    host.innerHTML = Cake.svg({ id: 'ck1', candles: true });
    const candles = $$('.candle', host);
    let lit = 0, done = false;

    function light(cd) {
      if (done || cd.classList.contains('is-lit')) return;
      cd.classList.add('is-lit');
      cd.setAttribute('aria-pressed', 'true');
      lit++;
      litEl.textContent = String(lit);
      const wick = $('line', cd).getBoundingClientRect();
      FX.sparkles(wick.left + wick.width / 2, wick.top - 12, 9, { radius: 30, colors: ['#ffd35c', '#ffb02e', '#fff6c8'] });
      Sound.chime(lit);
      vibrate(10);
      if (lit === candles.length) finish();
    }
    function finish() {
      done = true;
      btnAll.disabled = true;
      const { x, y, r } = centerOf(host);
      later(() => { FX.sparkles(x, y - r.height * 0.25, 34, { radius: r.width * 0.5 }); Sound.sparkle(); }, 250);
      later(() => go('wish'), 1500);
    }
    candles.forEach(cd => {
      cd.addEventListener('click', () => light(cd));
      cd.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); light(cd); } });
    });
    btnAll.addEventListener('click', () => {
      candles.filter(c => !c.classList.contains('is-lit')).forEach((c, i) => later(() => light(c), i * 230));
    });
    function reset() {
      lit = 0; done = false;
      litEl.textContent = '0';
      btnAll.disabled = false;
      candles.forEach(c => { c.classList.remove('is-lit'); c.setAttribute('aria-pressed', 'false'); });
    }
    return { el, reset };
  })();

  /* ---------- 10.3 Make a wish — hold to blow (page2-2) ---------- */
  scenes.wish = (() => {
    const el = $('#scene-wish');
    const host = $('#cakeWish');
    const btn = $('#btnBlow');
    const label = $('#blowLabel');
    host.innerHTML = Cake.svg({ id: 'ck2', candles: true });
    const candles = $$('.candle', host);
    candles.forEach(c => { c.removeAttribute('tabindex'); c.removeAttribute('role'); c.removeAttribute('aria-label'); c.classList.add('is-static'); });

    const FILL = 1.7, DRAIN = 1.3; // seconds to fill; drain speed (per second) after letting go
    // Progress is a pure function of time (not frames), so every device needs the same hold.
    let pAt = 0, tAt = 0, holding = false, done = false, raf = 0, finishTimer = 0, breath = null;
    const progress = now => clamp(pAt + ((now - tAt) / 1000) * (holding ? 1 / FILL : -DRAIN), 0, 1);

    function frame(now) {
      const p = progress(now);
      btn.style.setProperty('--p', p.toFixed(4));
      const lean = holding ? Math.min(1, p * 1.7) * (0.82 + Math.random() * 0.18) : p * 0.5;
      host.style.setProperty('--lean', lean.toFixed(3));
      if (holding && p >= 1) { raf = 0; blowOut(); return; }
      raf = holding || p > 0 ? requestAnimationFrame(frame) : 0;
    }
    function start(e) {
      if (done || holding) return;
      if (e) e.preventDefault();
      const now = performance.now();
      pAt = progress(now); tAt = now; holding = true;
      btn.classList.add('is-holding');
      label.textContent = 'Keep blowing…';
      if (!breath) breath = Sound.breath();
      if (!raf) raf = requestAnimationFrame(frame);
      // Timer guarantees completion even if frames are throttled.
      clearTimeout(finishTimer);
      finishTimer = setTimeout(() => { if (holding && !done) blowOut(); }, (1 - pAt) * FILL * 1000 + 40);
    }
    function stop() {
      if (!holding) return;
      const now = performance.now();
      pAt = progress(now); tAt = now; holding = false;
      clearTimeout(finishTimer);
      btn.classList.remove('is-holding');
      if (breath) { breath.stop(); breath = null; }
      if (!done) label.textContent = 'Hold to blow';
      if (!raf && pAt > 0) raf = requestAnimationFrame(frame);
    }
    function blowOut() {
      if (done) return;
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(finishTimer);
      btn.style.setProperty('--p', '1');
      done = true; holding = false;
      if (breath) { breath.stop(); breath = null; }
      btn.classList.remove('is-holding');
      btn.classList.add('is-done');
      label.textContent = 'Wish made! ✨';
      host.style.setProperty('--lean', '1');
      candles.forEach((c, i) => later(() => { c.classList.remove('is-lit'); c.classList.add('is-out'); }, i * 70));
      Sound.puff();
      vibrate([20, 30, 40]);
      const { x, y, r } = centerOf(host);
      later(() => {
        FX.confetti(x, y - r.height * 0.2, COARSE ? 110 : 150);
        FX.sparkles(x, y - r.height * 0.3, 30, { radius: r.width * 0.5 });
        FX.show(3, 1400);
        Sound.sparkle();
      }, 450);
      later(() => go('wished'), 2400);
    }

    btn.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      try { btn.setPointerCapture(e.pointerId); } catch (_) { /* not critical */ }
      start(e);
    });
    // Release anywhere ends the breath (window-level so a finger sliding off still counts).
    ['pointerup', 'pointercancel'].forEach(t => window.addEventListener(t, stop));
    window.addEventListener('blur', stop);
    btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
    btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stop(); } });
    btn.addEventListener('contextmenu', e => e.preventDefault());
    btn.addEventListener('click', e => e.preventDefault());

    function reset() {
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(finishTimer);
      pAt = 0; tAt = 0; done = false; holding = false;
      if (breath) { breath.stop(); breath = null; }
      btn.style.setProperty('--p', '0');
      host.style.setProperty('--lean', '0');
      btn.classList.remove('is-done', 'is-holding');
      label.textContent = 'Hold to blow';
      candles.forEach(c => { c.classList.add('is-lit'); c.classList.remove('is-out'); });
    }
    return { el, reset, leave: stop };
  })();

  /* ---------- 10.4 Wish sent (page2-3) ---------- */
  scenes.wished = (() => {
    const el = $('#scene-wished');
    const host = $('#cakeWished');
    host.innerHTML = Cake.svg({ id: 'ck3', candles: true });
    $$('.candle', host).forEach(c => { c.removeAttribute('tabindex'); c.removeAttribute('role'); c.removeAttribute('aria-label'); c.classList.add('is-static'); });
    function enter() {
      const { x, y, r } = centerOf(host);
      FX.sparkles(x, y - r.height * 0.3, 24, { radius: r.width * 0.55 });
    }
    return { el, enter };
  })();

  /* ---------- 10.5 Cut the cake — swipe like a knife (page3) ---------- */
  scenes.cut = (() => {
    const el = $('#scene-cut');
    const zone = $('#cutZone');
    const knife = $('#knife');
    $('#cutPlate').innerHTML = Cake.svg({ id: 'kc0', cake: false, core: true });
    $('#cutL').innerHTML = Cake.svg({ id: 'kc1', plate: false });
    $('#cutR').innerHTML = Cake.svg({ id: 'kc2', plate: false });

    const HOME = { x: 0.5, y: 214 / 410 };
    const CAKE_BOX = { x0: 64 / 480, x1: 416 / 480, y0: 158 / 410, y1: 380 / 410 };
    let dragging = false, done = false, travel = 0, lastP = null;

    const place = (x, y) => { knife.style.left = `${(x * 100).toFixed(2)}%`; knife.style.top = `${(y * 100).toFixed(2)}%`; };
    const rel = e => { const r = zone.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, r }; };
    const inCake = p => p.x > CAKE_BOX.x0 && p.x < CAKE_BOX.x1 && p.y > CAKE_BOX.y0 && p.y < CAKE_BOX.y1;

    zone.addEventListener('pointerdown', e => {
      if (done || e.button > 0) return;
      dragging = true; travel = 0; lastP = rel(e);
      try { zone.setPointerCapture(e.pointerId); } catch (_) { /* not critical */ }
      zone.classList.add('is-dragging');
      knife.classList.add('is-drag');
      place(lastP.x, lastP.y);
    });
    zone.addEventListener('pointermove', e => {
      if (!dragging || done) return;
      const p = rel(e);
      place(p.x, p.y);
      knife.style.setProperty('--kr', `${clamp((p.x - lastP.x) * 420, -24, 24).toFixed(1)}deg`);
      if (inCake(p) || inCake(lastP)) {
        travel += Math.hypot((p.x - lastP.x) * p.r.width, (p.y - lastP.y) * p.r.height);
        FX.trail(e.clientX, e.clientY);
      }
      lastP = p;
      if (travel > p.r.height * 0.32) cut();
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      zone.classList.remove('is-dragging');
      knife.classList.remove('is-drag');
      if (!done) { place(HOME.x, HOME.y); knife.style.setProperty('--kr', '0deg'); }
    };
    ['pointerup', 'pointercancel'].forEach(t => window.addEventListener(t, end));
    $('#btnCutTap').addEventListener('click', () => cut());

    function cut() {
      if (done) return;
      done = true; dragging = false;
      zone.classList.remove('is-dragging');
      knife.classList.remove('is-drag');
      knife.style.setProperty('--kr', '0deg');
      place(HOME.x, HOME.y);
      Sound.slice();
      later(() => { knife.classList.add('is-cutting'); place(HOME.x, 372 / 410); }, 380);
      later(() => {
        zone.classList.add('is-cut');
        knife.classList.add('is-away');
        const { x, y, r } = centerOf(zone);
        FX.sparkles(x, y, 30, { radius: r.width * 0.3 });
        FX.confetti(x, y - r.height * 0.1, 70, { power: 0.7 });
        Sound.chime(5); Sound.sparkle();
        vibrate(25);
      }, 1100);
      later(() => go('slice'), 2500);
    }
    function reset() {
      done = false; dragging = false; travel = 0;
      zone.classList.remove('is-cut', 'is-dragging');
      knife.classList.remove('is-cutting', 'is-away', 'is-drag');
      knife.style.setProperty('--kr', '0deg');
      place(HOME.x, HOME.y);
    }
    return { el, reset };
  })();

  /* ---------- 10.6 The first slice (page3-2) ---------- */
  scenes.slice = (() => {
    const el = $('#scene-slice');
    function enter() {
      const { x, y, r } = centerOf($('#slice'));
      FX.hearts(x, y - r.height * 0.3, 10);
      FX.sparkles(x, y, 18, { radius: r.width * 0.45 });
    }
    return { el, enter };
  })();

  /* ---------- 10.7 Pop the balloons (page4) ---------- */
  const poppedColors = [];
  scenes.balloons = (() => {
    const el = $('#scene-balloons');
    const bunch = $('#bunch');
    const countEl = $('#popCount');
    const text = $('#reasonText');
    const box = text.closest('.note');
    const SPOTS = [
      { x: 80, y: 17, c: 'pink', d: 0 },
      { x: 15, y: 62, c: 'yellow', d: 0.7 },
      { x: 50, y: 81, c: 'lav', d: 1.3 },
      { x: 85, y: 59, c: 'mint', d: 0.35 },
      { x: 18, y: 18, c: 'coral', d: 1.0 },
    ];
    bunch.insertAdjacentHTML('beforeend', SPOTS.map((s, i) => `
      <button class="balloon balloon--${s.c}" type="button" style="--x:${s.x}%;--y:${s.y}%;--d:-${s.d}s" aria-label="Pop balloon ${i + 1}">
        <span class="balloon__string"></span><span class="balloon__ball"></span><span class="balloon__knot"></span>
      </button>`).join(''));
    const balloons = $$('.balloon', bunch);
    let popped = 0;
    const EMPTY = 'Pop a balloon to find out 💗';

    function setText(t) {
      text.textContent = t;
      box.classList.remove('is-empty');
      restartClass(box, 'is-swap');
    }
    function pop(b) {
      if (b.classList.contains('is-popped')) return;
      b.classList.add('is-popped');
      b.disabled = true;
      const ball = $('.balloon__ball', b);
      const { x, y } = centerOf(ball);
      const col = getComputedStyle(b).getPropertyValue('--c2').trim() || '#f2638f';
      FX.shards(x, y, col, 26);
      FX.confetti(x, y, 24, { power: 0.45 });
      Sound.pop();
      vibrate(22);
      poppedColors[popped] = col;
      setText(CONFIG.reasons[popped] || '');
      popped++;
      countEl.textContent = String(popped);
      if (popped === balloons.length) {
        later(() => { FX.hearts(innerWidth / 2, innerHeight * 0.55, 14); Sound.sparkle(); }, 600);
        later(() => go('reasons'), 2800);
      }
    }
    balloons.forEach(b => b.addEventListener('click', () => pop(b)));

    function reset() {
      popped = 0;
      poppedColors.length = 0;
      countEl.textContent = '0';
      text.textContent = EMPTY;
      box.classList.add('is-empty');
      box.classList.remove('is-swap');
      balloons.forEach(b => { b.classList.remove('is-popped'); b.disabled = false; });
    }
    return { el, reset };
  })();

  /* ---------- 10.8 All the reasons (page4-2) ---------- */
  scenes.reasons = (() => {
    const el = $('#scene-reasons');
    const list = $('#reasonList');
    const DEFAULT = ['#f2638f', '#f2bf30', '#4cc59a', '#a184ef', '#ff7f6c'];
    function reset() {
      list.innerHTML = CONFIG.reasons.map((r, k) => `
        <li class="reason" style="--k:${k};--c:${poppedColors[k] || DEFAULT[k % DEFAULT.length]}">
          <span class="reason__icon emoji" aria-hidden="true">🎈</span><span class="reason__text">${esc(r)}</span>
        </li>`).join('');
      list.scrollTop = 0;
    }
    function enter() {
      const f = $('.frame', el);
      const { x, y } = centerOf(f);
      FX.hearts(x, y, 8);
    }
    return { el, reset, enter };
  })();

  /* ---------- 10.9 Birthday card (page6) ---------- */
  scenes.card = (() => {
    const el = $('#scene-card');
    const card = $('#bcard');
    let opened = false;
    card.addEventListener('click', () => {
      if (opened) return;
      opened = true;
      card.classList.add('is-open');
      card.setAttribute('aria-label', 'Birthday card opened');
      Sound.open();
      vibrate(20);
      const { x, y, r } = centerOf(card);
      later(() => { FX.hearts(x, y, 14); FX.sparkles(x, y, 26, { radius: r.width * 0.6 }); }, 420);
      later(() => go('letter'), 1800);
    });
    function reset() {
      opened = false;
      card.classList.remove('is-open');
      card.setAttribute('aria-label', 'Open the birthday card');
    }
    return { el, reset };
  })();

  /* ---------- 10.10 Letter (page7) ---------- */
  scenes.letter = (() => {
    const el = $('#scene-letter');
    const body = $('#letterBody');
    const L = CONFIG.letter;
    $('#letterGreeting').textContent = L.greeting;
    body.innerHTML = L.paragraphs.map((p, k) => `<p style="--k:${k}">${esc(p)}</p>`).join('')
      + `<p class="letter__sign" style="--k:${L.paragraphs.length}">${esc(L.signoff)}<br>${esc(L.signature)}</p>`;
    function reset() { body.scrollTop = 0; }
    return { el, reset };
  })();

  /* ---------- 10.11 Finale (page8) ---------- */
  scenes.finale = (() => {
    const el = $('#scene-finale');
    function enter() {
      const W = innerWidth, H = innerHeight;
      FX.confetti(W / 2, H * 0.32, COARSE ? 130 : 180, { power: 1.2 });
      FX.cannons(2);
      FX.show(COARSE ? 6 : 9, 4000);
      later(() => FX.rain(COARSE ? 80 : 130, 2200), 1300);
      const b = centerOf($('#bear'));
      FX.hearts(b.x, b.y, 12);
      Sound.sparkle();
    }
    // Tap anywhere empty for an extra firework 🎆
    el.addEventListener('pointerdown', e => {
      if (current !== 'finale' || e.target.closest('button, a, .crown')) return;
      FX.firework(e.clientX, e.clientY);
    });
    return { el, enter };
  })();

  /* ===========================================================
     11. FINALE EXTRAS — save crown (PNG) + tell the sender
     =========================================================== */
  const toast = (() => {
    const t = $('#toast');
    let timer = 0;
    return msg => {
      t.textContent = msg;
      t.classList.add('is-shown');
      clearTimeout(timer);
      timer = setTimeout(() => t.classList.remove('is-shown'), 2800);
    };
  })();

  const today = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  async function makeCrownPNG() {
    const fonts = ['900 120px Grandstander', '600 40px Fredoka', '500 40px Fredoka', '700 60px Caveat'];
    await Promise.all([
      ...fonts.map(f => document.fonts.load(f).catch(() => {})),
      document.fonts.load('100px "Noto Color Emoji"', '👑🎂✨').catch(() => {}),
    ]);
    const W = 1080, H = 1350;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fff6f9'); g.addColorStop(1, '#ffcfdd');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(236,79,134,.12)';
    for (let y = 30; y < H; y += 54) for (let x = 30; x < W; x += 54) { c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); }
    const r = seeded(11), cols = ['#c9b0ff', '#9be3c8', '#ffd77a', '#ffffff', '#ff9ab8'];
    c.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = r() * H, a = r() * TAU;
      c.strokeStyle = cols[i % cols.length]; c.lineWidth = 9;
      c.beginPath(); c.moveTo(x - Math.cos(a) * 14, y - Math.sin(a) * 14); c.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); c.stroke();
    }
    // card
    const rr = (x, y, w, h, rad) => { c.beginPath(); c.moveTo(x + rad, y); c.arcTo(x + w, y, x + w, y + h, rad); c.arcTo(x + w, y + h, x, y + h, rad); c.arcTo(x, y + h, x, y, rad); c.arcTo(x, y, x + w, y, rad); c.closePath(); };
    c.save();
    c.shadowColor = 'rgba(214,51,108,.25)'; c.shadowBlur = 60; c.shadowOffsetY = 24;
    rr(110, 170, 860, 1010, 64); c.fillStyle = '#fff'; c.fill();
    c.restore();
    rr(110, 170, 860, 1010, 64); c.lineWidth = 6; c.strokeStyle = '#f8bfd0'; c.stroke();

    c.textAlign = 'center';
    c.font = '230px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    c.fillText('👑', W / 2, 470);
    c.fillStyle = '#d6336c';
    c.font = '600 44px Fredoka, sans-serif';
    if ('letterSpacing' in c) c.letterSpacing = '10px';
    c.fillText(CONFIG.crownTitle.toUpperCase(), W / 2, 575);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.fillStyle = '#561a36';
    let size = 160;
    do { c.font = `900 ${size}px Grandstander, sans-serif`; size -= 8; } while (c.measureText(CONFIG.name).width > 760 && size > 60);
    c.fillText(CONFIG.name, W / 2, 745);
    c.fillStyle = '#7b3a58';
    c.font = '500 54px Fredoka, sans-serif';
    c.fillText(`${CONFIG.age} today · ${today}`, W / 2, 840);
    c.fillStyle = '#ec4f86';
    c.font = '700 80px Caveat, cursive';
    c.fillText(`From, ${CONFIG.from} `, W / 2, 1000);
    c.font = '90px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    c.fillText('🎂', W / 2, 1120);
    return new Promise(res => cv.toBlob(res, 'image/png'));
  }

  async function saveCrown(e) {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const blob = await makeCrownPNG();
      if (!blob) throw new Error('Canvas export failed');
      const name = `${CONFIG.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-birthday-crown.png`;
      const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
      if (COARSE && file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My birthday crown 👑' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
      toast('Crown saved 👑');
      const { x, y, r } = centerOf($('.crown'));
      FX.sparkles(x, y, 24, { radius: r.width * 0.5 });
      Sound.sparkle();
    } catch (err) {
      if (!err || err.name !== 'AbortError') toast('Couldn’t save the crown — try a screenshot instead 📸');
    } finally {
      btn.disabled = false;
    }
  }

  async function tell() {
    const msg = CONFIG.contact.message;
    const num = (CONFIG.contact.whatsapp || '').replace(/\D/g, '');
    if (num) { window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener'); return; }
    if (navigator.share) {
      try { await navigator.share({ text: msg }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(msg); toast(`Message copied — send it to ${CONFIG.from} 💌`); }
    catch (_) { toast(msg); }
  }

  /* ===========================================================
     12. BOOT
     =========================================================== */
  function bindContent() {
    $$('[data-bind]').forEach(n => { const v = CONFIG[n.dataset.bind]; if (v != null) n.textContent = v; });
    $$('img[data-photo]').forEach(img => {
      const src = CONFIG.photos[img.dataset.photo];
      let tries = 0;
      img.addEventListener('error', function onError() {
        if (++tries < 2) { setTimeout(() => { img.src = `${src}${src.includes('?') ? '&' : '?'}retry=${Date.now()}`; }, 900); return; }
        img.removeEventListener('error', onError);
        const f = document.createElement('span');
        f.className = 'img-fallback emoji';
        f.textContent = '🧸';
        img.replaceWith(f);
      });
      if (src) img.src = src;
    });
    $('#crownDate').textContent = today;
    $('.crown__title').textContent = CONFIG.crownTitle;
    document.title = `Happy Birthday, ${CONFIG.name} 🎂`;
  }

  function init() {
    bindContent();
    FX.resize();
    Ambient.init();
    buildFloaters();

    // Number the reveal stagger (--i) per scene, in DOM order.
    $$('.scene').forEach(s => {
      s.inert = true;
      s.setAttribute('aria-hidden', 'true');
      $$('.rv', s).forEach((n, i) => { if (!n.style.getPropertyValue('--i')) n.style.setProperty('--i', String(i)); });
    });

    $$('[data-go]').forEach(b => b.addEventListener('click', () => { Sound.click(); go(b.dataset.go); }));
    $$('[data-replay]').forEach(b => b.addEventListener('click', replay));
    $('#btnReplay').addEventListener('click', replay);
    btnBack.addEventListener('click', () => { if (!busy && trail.length) go(trail.pop(), { back: true }); });
    $('#btnSaveCrown').addEventListener('click', saveCrown);
    $('#btnTell').addEventListener('click', tell);

    // Audio can only start after a user gesture.
    const unlock = e => { if (!e.target.closest || !e.target.closest('#btnMusic')) Sound.unlock(); };
    ['pointerup', 'click', 'keydown'].forEach(t => document.addEventListener(t, unlock, { capture: true }));
    document.addEventListener('visibilitychange', () => Sound.visibility(document.hidden));

    // Keyboard: Escape = back
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !btnBack.disabled) btnBack.click(); });

    window.addEventListener('resize', debounce(() => { FX.resize(); Ambient.resize(); }, 150));

    // Deep link for testing: ?scene=cut, ?scene=finale, …
    const start = new URLSearchParams(location.search).get('scene');
    go(scenes[start] ? start : 'gift', { instant: true });
  }

  init();
})();
