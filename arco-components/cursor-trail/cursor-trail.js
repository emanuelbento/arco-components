/* ================================
   Arco — Cursor Trail
   arco.studio
   ================================ */

(function () {

  gsap.config({ force3D: true });

  const cursor = document.getElementById('arcoCursor');

  /* ------------------------- Images */
  const images = [
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

  images.forEach(src => { const i = new Image(); i.src = src; });

  /* ------------------------- Config */
  const POOL_SIZE = 50;
  const AUTO_INTERVAL = 450;
  const STEP = 55;
  const SHOW_DURATION = 1000;
  const FADE_IN = 0.5;
  const FADE_OUT = 0.85;

  let mouseX = 0;
  let mouseY = 0;
  let lastSpawnX = 0;
  let lastSpawnY = 0;
  let imgIndex = 0;
  let zCounter = 100;
  let pool = [];
  let hasMovedOnce = false;

  /* ------------------------- Pool */
  for (let i = 0; i < POOL_SIZE; i++) {
    const img = document.createElement('img');
    img.className = 'arco-trail-img';
    document.body.appendChild(img);
    pool.push({ el: img, state: 'free', timer: null, spawnedAt: 0 });
  }

  /* ------------------------- Fade out */
  function fadeOut(item) {
    if (item.state === 'out' || item.state === 'free') return;
    if (item.timer) { clearTimeout(item.timer); item.timer = null; }
    item.state = 'out';
    gsap.to(item.el, {
      opacity: 0,
      scale: 0.93,
      duration: FADE_OUT,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onComplete: () => { item.state = 'free'; }
    });
  }

  /* ------------------------- Pool */
  function getFromPool() {
    const free = pool.find(p => p.state === 'free');
    if (free) return free;

    const out = pool.find(p => p.state === 'out');
    if (out) {
      gsap.killTweensOf(out.el);
      out.state = 'free';
      return out;
    }

    const visibles = pool.filter(p => p.state === 'visible');
    if (visibles.length > 0) {
      const oldest = visibles.reduce((a, b) => a.spawnedAt < b.spawnedAt ? a : b);
      fadeOut(oldest);
      return oldest;
    }

    return pool[imgIndex % POOL_SIZE];
  }

  /* ------------------------- Spawn */
  function spawnImage(x, y) {
    const item = getFromPool();
    if (!item) return;

    if (item.timer) { clearTimeout(item.timer); item.timer = null; }

    const el = item.el;
    const src = images[imgIndex % images.length];
    imgIndex++;
    zCounter++;

    const rot = (Math.random() - 0.5) * 20;

    item.state = 'in';
    item.spawnedAt = Date.now();

    gsap.killTweensOf(el);
    el.src = src;

    gsap.set(el, {
      left: x - 130,
      top: y - 130,
      rotation: rot * 0.5,
      scale: 0.78,
      opacity: 0,
      zIndex: zCounter,
    });

    gsap.to(el, {
      opacity: 1,
      scale: 1,
      rotation: rot,
      duration: FADE_IN,
      ease: 'expo.out',
      onComplete: () => {
        if (item.state === 'in') {
          item.state = 'visible';
          item.timer = setTimeout(() => fadeOut(item), SHOW_DURATION);
        }
      }
    });
  }

  /* ------------------------- Mouse */
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    gsap.to(cursor, { x: mouseX, y: mouseY, duration: 0.1, ease: 'none' });

    if (!hasMovedOnce) {
      hasMovedOnce = true;
      lastSpawnX = mouseX;
      lastSpawnY = mouseY;
      setInterval(() => { spawnImage(mouseX, mouseY); }, AUTO_INTERVAL);
    }

    const dx = mouseX - lastSpawnX;
    const dy = mouseY - lastSpawnY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= STEP) {
      const steps = Math.floor(dist / STEP);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        spawnImage(lastSpawnX + dx * t, lastSpawnY + dy * t);
      }
      lastSpawnX = mouseX;
      lastSpawnY = mouseY;
    }
  });

})();