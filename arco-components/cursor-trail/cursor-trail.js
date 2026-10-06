/* ================================
   Arco — Cursor Trail
   arco.studio
   ================================ */

(() => {
  gsap.config({ force3D: true });

  const POOL_SIZE = 30;
  const GAP = 55; // px travelled between images
  const PUSH = 40; // px each image drifts in the direction of movement
  const IDLE_INTERVAL = 0.45; // s between images while the cursor rests
  const IDLE_THRESHOLD = 0.12; // s without movement before the sound fades

  const CHORD = [130.81, 164.81, 196.0, 246.94]; // C, E, G, B
  const DETUNE = [0, 6, -5, 3];

  class ArcoCursorTrail {
    constructor(el) {
      this.el = el;
      const q = gsap.utils.selector(el);

      this.sources = q(".arco-cursor-trail_sources img").map((img) => img.currentSrc || img.src);
      if (!this.sources.length) return;

      this.layer = q(".arco-cursor-trail_layer")[0];
      this.dot = q(".arco-cursor-trail_dot")[0];
      this.soundButton = q(".arco-cursor-trail_sound")[0];

      this.pool = Array.from({ length: POOL_SIZE }, () => {
        const img = document.createElement("img");
        img.className = "arco-cursor-trail_image";
        img.alt = "";
        img.decoding = "async";
        this.layer.append(img);
        return img;
      });

      this.wrapPool = gsap.utils.wrap(0, POOL_SIZE);
      this.wrapSource = gsap.utils.wrap(0, this.sources.length);
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.abort = new AbortController();

      this.index = 0;
      this.pointer = null;
      this.last = null;
      this.touch = false;
      this.lastMove = 0;
      this.lastIdle = 0;

      this.sound = { ctx: null, gain: null, oscs: [], enabled: false, audible: false };

      gsap.set(this.dot, { xPercent: -50, yPercent: -50 });
      this.setDot = gsap.quickSetter(this.dot, "css");

      this.sources.forEach((src) => (new Image().src = src));
      this.measure();
      this.bind();

      this.tick = this.tick.bind(this);
      gsap.ticker.add(this.tick);

      el.arcoCursorTrail = this;
    }

    measure() {
      this.bounds = this.el.getBoundingClientRect();
    }

    move(clientX, clientY, touch) {
      this.pointer = { x: clientX - this.bounds.left, y: clientY - this.bounds.top };
      this.touch = touch;
      this.lastMove = gsap.ticker.time;

      if (!this.last) {
        this.last = { ...this.pointer };
        if (!touch) gsap.set(this.dot, { autoAlpha: 1 });
      }
    }

    leave() {
      this.pointer = null;
      this.last = null;
      gsap.set(this.dot, { autoAlpha: 0 });
      this.soundOff();
    }

    tick(time) {
      if (!this.pointer) return;

      const { x, y } = this.pointer;
      if (!this.touch) this.setDot({ x, y });

      const dx = x - this.last.x;
      const dy = y - this.last.y;
      const dist = Math.hypot(dx, dy);

      if (time - this.lastMove > IDLE_THRESHOLD) this.soundOff();

      if (dist >= GAP) {
        const steps = Math.floor(dist / GAP);
        this.soundOn(dist);

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          this.spawn(
            gsap.utils.interpolate(this.last.x, x, t),
            gsap.utils.interpolate(this.last.y, y, t),
            dx / dist,
            dy / dist
          );
        }

        this.last = { x, y };
      } else if (!this.touch && !this.reduced.matches && time - this.lastIdle > IDLE_INTERVAL) {
        this.spawn(x, y, 0, 0);
        this.lastIdle = time;
      }
    }

    spawn(x, y, dirX, dirY) {
      const el = this.pool[this.wrapPool(this.index)];
      const src = this.sources[this.wrapSource(this.index)];
      const still = this.reduced.matches;

      if (el.getAttribute("src") !== src) el.src = src;

      gsap.killTweensOf(el);
      gsap.set(el, {
        x,
        y,
        xPercent: -50,
        yPercent: -50,
        rotation: still ? 0 : "random(-20, 20)",
        scale: 1,
        autoAlpha: 0,
        zIndex: this.index,
      });

      gsap
        .timeline()
        .to(el, { autoAlpha: 1, duration: 0.2 })
        .to(el, { x: `+=${still ? 0 : dirX * PUSH}`, y: `+=${still ? 0 : dirY * PUSH}`, ease: "power4.out", duration: 1 }, "<")
        .to(el, { autoAlpha: 0, scale: still ? 1 : 0.93, ease: "power2.inOut", duration: 0.85 }, "+=1");

      this.index++;
    }

    /* Sound: a detuned Cmaj7 through a lowpass and a generated reverb.
       Speed raises the volume and bends the pitch. Off until the toggle is pressed. */

    initSound() {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;
      filter.Q.value = 1.2;

      const reverb = ctx.createConvolver();
      reverb.buffer = this.impulse(ctx, 4, 2);

      const dry = ctx.createGain();
      dry.gain.value = 0.5;
      const wet = ctx.createGain();
      wet.gain.value = 1.4;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      filter.connect(dry);
      filter.connect(reverb);
      reverb.connect(wet);
      dry.connect(gain);
      wet.connect(gain);
      gain.connect(ctx.destination);

      this.sound.oscs = CHORD.map((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.detune.value = DETUNE[i];
        osc.connect(filter);
        osc.start();
        return osc;
      });

      this.sound.ctx = ctx;
      this.sound.gain = gain;
    }

    impulse(ctx, seconds, decay) {
      const length = ctx.sampleRate * seconds;
      const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

      for (let c = 0; c < 2; c++) {
        const channel = buffer.getChannelData(c);
        for (let i = 0; i < length; i++) {
          channel[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
        }
      }
      return buffer;
    }

    toggleSound() {
      const sound = this.sound;
      if (!sound.ctx) this.initSound();

      sound.enabled = !sound.enabled;
      sound.enabled ? sound.ctx.resume() : sound.ctx.suspend();
      if (!sound.enabled) sound.audible = false;

      this.soundButton.setAttribute("aria-pressed", sound.enabled);
      this.soundButton.textContent = sound.enabled ? "Sound on" : "Sound off";
    }

    soundOn(speed) {
      const { ctx, gain, oscs, enabled, audible } = this.sound;
      if (!enabled) return;

      const clamped = gsap.utils.clamp(0, 600, speed);
      const volume = gsap.utils.mapRange(0, 600, 0.08, 0.22, clamped);
      const bend = gsap.utils.mapRange(0, 600, 0, 18, clamped);
      const now = ctx.currentTime;

      oscs.forEach((osc, i) => {
        osc.detune.cancelScheduledValues(now);
        osc.detune.linearRampToValueAtTime(DETUNE[i] + bend, now + 0.1);
      });

      gain.gain.cancelScheduledValues(now);
      gain.gain.linearRampToValueAtTime(volume, now + (audible ? 0.1 : 0.25));
      this.sound.audible = true;
    }

    soundOff() {
      const { ctx, gain, enabled, audible } = this.sound;
      if (!enabled || !audible) return;

      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.linearRampToValueAtTime(0, now + 0.9);
      this.sound.audible = false;
    }

    bind() {
      const { signal } = this.abort;
      const passive = { passive: true, signal };

      this.el.addEventListener("pointerenter", () => this.measure(), { signal });

      this.el.addEventListener(
        "pointermove",
        (e) => {
          if (e.pointerType !== "touch") this.move(e.clientX, e.clientY, false);
        },
        { signal }
      );

      this.el.addEventListener(
        "pointerleave",
        (e) => {
          if (e.pointerType !== "touch") this.leave();
        },
        { signal }
      );

      // Touch uses touch events, which keep firing while the page scrolls
      const onTouch = (e) => {
        if (e.type === "touchstart") this.measure();
        this.move(e.touches[0].clientX, e.touches[0].clientY, true);
      };

      this.el.addEventListener("touchstart", onTouch, passive);
      this.el.addEventListener("touchmove", onTouch, passive);
      this.el.addEventListener("touchend", () => this.leave(), passive);
      this.el.addEventListener("touchcancel", () => this.leave(), passive);

      window.addEventListener("scroll", () => this.measure(), passive);
      window.addEventListener("resize", () => this.measure(), passive);

      this.soundButton?.addEventListener("click", () => this.toggleSound(), { signal });
    }

    destroy() {
      this.abort.abort();
      gsap.ticker.remove(this.tick);
      gsap.killTweensOf(this.pool);
      this.pool.forEach((img) => img.remove());
      this.sound.ctx?.close();
      delete this.el.arcoCursorTrail;
    }

    static init(scope = document) {
      return gsap.utils
        .toArray("[data-arco-cursor-trail]", scope)
        .map((el) => el.arcoCursorTrail ?? new ArcoCursorTrail(el));
    }
  }

  window.ArcoCursorTrail = ArcoCursorTrail;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => ArcoCursorTrail.init());
  } else {
    ArcoCursorTrail.init();
  }
})();
