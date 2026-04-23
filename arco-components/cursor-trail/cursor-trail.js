(function () {
  gsap.config({ force3D: true });

  const cursor    = document.getElementById('arcoCursor');
  const setCursor = gsap.quickSetter(cursor, 'css');

  const srcs = [
    'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1506443432602-ac2fcd6f54e0?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1614642264762-d0a3b8bf3700?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1630839437035-dac17da580d0?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1505506874110-6a7a69069a08?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1495726569656-8b8886143e6a?w=600&auto=format&fit=crop&q=90',
  ];

  srcs.forEach(src => { new Image().src = src; });

  const POOL_SIZE      = 30;
  const GAP            = 55;
  const AUTO_INTERVAL  = 0.45;
  const IDLE_THRESHOLD = 0.12;

  const wrapSrc = gsap.utils.wrap(0, srcs.length);
  const wrapEl  = gsap.utils.wrap(0, POOL_SIZE);

  let index          = 0;
  let mousePos       = { x: 0, y: 0 };
  let lastMousePos   = { x: 0, y: 0 };
  let cachedMousePos = { x: 0, y: 0 };
  let lastAutoTime   = 0;
  let lastMoveTime   = 0;
  let hasMovedOnce   = false;

  let audioCtx    = null;
  let masterGain  = null;
  let oscs        = [];
  let audioReady  = false;
  let isAudible   = false;

  function buildImpulse(ctx, duration, decay) {
    const length  = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  function initAudio() {
    if (audioReady) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const filter           = audioCtx.createBiquadFilter();
    filter.type            = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value         = 1.2;

    const convolver  = audioCtx.createConvolver();
    convolver.buffer = buildImpulse(audioCtx, 4, 2);

    const dryGain       = audioCtx.createGain();
    dryGain.gain.value  = 0.5;

    const wetGain       = audioCtx.createGain();
    wetGain.gain.value  = 1.4;

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);

    filter.connect(dryGain);
    filter.connect(convolver);
    convolver.connect(wetGain);
    dryGain.connect(masterGain);
    wetGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    const chordFreqs = [130.81, 164.81, 196.00, 246.94];
    const detunings  = [0, 6, -5, 3];

    oscs = chordFreqs.map((freq, i) => {
      const osc           = audioCtx.createOscillator();
      osc.type            = 'sine';
      osc.frequency.value = freq;
      osc.detune.value    = detunings[i];
      osc.connect(filter);
      osc.start();
      return osc;
    });

    audioReady = true;
  }

  function soundOn(speed) {
    if (!audioReady) return;

    const clamped  = gsap.utils.clamp(0, 600, speed);
    const volume   = gsap.utils.mapRange(0, 600, 0.08, 0.22, clamped);
    const pitchMod = gsap.utils.mapRange(0, 600, 0, 18, clamped);
    const now      = audioCtx.currentTime;

    oscs.forEach((osc, i) => {
      osc.detune.cancelScheduledValues(now);
      osc.detune.linearRampToValueAtTime([0, 6, -5, 3][i] + pitchMod, now + 0.1);
    });

    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.linearRampToValueAtTime(volume, now + (isAudible ? 0.1 : 0.25));
    isAudible = true;
  }

  function soundOff() {
    if (!audioReady || !isAudible) return;
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.linearRampToValueAtTime(0, now + 0.9);
    isAudible = false;
  }

  document.addEventListener('mousedown', () => {
    initAudio();
    audioCtx?.resume();
  }, { once: true });

  const pool = Array.from({ length: POOL_SIZE }, () => {
    const img = document.createElement('img');
    img.className = 'arco-trail-img';
    document.body.appendChild(img);
    return img;
  });

  function spawnImage(x, y, deltaX, deltaY) {
    const el = pool[wrapEl(index)];
    el.src   = srcs[wrapSrc(index)];

    gsap.killTweensOf(el);
    gsap.set(el, { clearProps: 'all' });
    gsap.set(el, {
      left:     x,
      top:      y,
      xPercent: -50,
      yPercent: -50,
      rotation: 'random(-20,20)',
      scale:    1,
      opacity:  0,
      zIndex:   index,
    });

    gsap.timeline()
      .to(el, { opacity: 1, duration: 0.2 })
      .to(el, {
        x:        '+=' + (deltaX * 40),
        y:        '+=' + (deltaY * 40),
        ease:     'power4.out',
        duration: 1,
      }, '<')
      .to(el, {
        opacity:  0,
        scale:    0.93,
        ease:     'power2.inOut',
        duration: 0.85,
      }, '+=1');

    index++;
  }

  gsap.ticker.add((time) => {
    if (!hasMovedOnce) return;

    setCursor({ x: mousePos.x, y: mousePos.y });

    cachedMousePos.x = gsap.utils.interpolate(cachedMousePos.x || mousePos.x, mousePos.x, 0.1);
    cachedMousePos.y = gsap.utils.interpolate(cachedMousePos.y || mousePos.y, mousePos.y, 0.1);

    const dx   = mousePos.x - lastMousePos.x;
    const dy   = mousePos.y - lastMousePos.y;
    const dist = Math.hypot(dx, dy);
    const idle = time - lastMoveTime > IDLE_THRESHOLD;

    if (idle) {
      soundOff();
    }

    if (dist >= GAP) {
      const steps  = Math.floor(dist / GAP);
      const deltaX = dx / dist;
      const deltaY = dy / dist;

      soundOn(dist);

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        spawnImage(
          gsap.utils.interpolate(lastMousePos.x, mousePos.x, t),
          gsap.utils.interpolate(lastMousePos.y, mousePos.y, t),
          deltaX,
          deltaY
        );
      }

      lastMousePos = { x: mousePos.x, y: mousePos.y };

    } else if (time - lastAutoTime > AUTO_INTERVAL) {
      spawnImage(mousePos.x, mousePos.y, 0, 0);
      lastAutoTime = time;
    }
  });

  document.addEventListener('mousemove', (e) => {
    mousePos     = { x: e.clientX, y: e.clientY };
    lastMoveTime = gsap.ticker.time;

    if (!hasMovedOnce) {
      hasMovedOnce   = true;
      lastMousePos   = { x: e.clientX, y: e.clientY };
      cachedMousePos = { x: e.clientX, y: e.clientY };
    }
  });

})();
