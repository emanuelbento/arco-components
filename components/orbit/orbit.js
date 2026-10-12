/* ================================
   Arco — Orbit
   arco.studio
   ================================ */

(() => {
  gsap.registerPlugin(Draggable, InertiaPlugin, CustomEase);

  CustomEase.create("arco-signature", "0.625, 0.05, 0, 1");
  CustomEase.create("arco-reveal", "0.16, 1, 0.3, 1");
  CustomEase.create("arco-exit", "0.7, 0, 0.84, 0");

  const { clamp, mapRange, interpolate } = gsap.utils;
  const focus = gsap.parseEase("sine.inOut");
  const pad = (n) => String(n).padStart(2, "0");

  // Neighbours shrink to this scale and fade to this opacity
  const SIDE_SCALE = 0.44;
  const SIDE_OPACITY = 0.38;
  const WHEEL_SPEED = 1.4;
  const MAX_TILT = 6; // degrees the preview leans while the arc is moving
  const THUMB_OPACITY = 0.9;

  // Each link has its own note, so turning the arc plays a scale (C major pentatonic)
  const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

  // iOS mutes Web Audio while the ring switch is on silent. Playing a silent
  // media element inside the tap moves the page to the playback audio session.
  const SILENCE =
    "data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

  class ArcoOrbit {
    constructor(el) {
      this.el = el;
      const q = gsap.utils.selector(el);

      this.list = q(".arco-orbit_list")[0];
      this.items = q(".arco-orbit_item");
      if (!this.list || this.items.length < 2) return;

      this.links = this.items.map((item) => item.querySelector(".arco-orbit_link"));
      this.texts = this.items.map((item) => item.querySelector(".arco-orbit_text") ?? item.querySelector(".arco-orbit_link"));
      this.numbers = this.items.map((item) => item.querySelector(".arco-orbit_number"));
      this.media = q(".arco-orbit_media")[0];
      this.images = q(".arco-orbit_image");

      const section = el.closest("section") ?? el;
      this.section = section;
      this.counter = section.querySelector(".arco-orbit_counter");
      this.soundButton = section.querySelector(".arco-orbit_sound");
      this.sound = { ctx: null, gain: null, enabled: false, last: 0 };

      this.count = this.items.length;
      this.last = this.count - 1;
      this.useWheel = el.dataset.arcoOrbitWheel !== "false";
      this.canOpen = el.dataset.arcoOrbitOpen !== "false" && this.media && this.images.length > 0;
      this.isOpen = false;
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.abort = new AbortController();

      // The arc is driven by one number: the x of an off-screen proxy.
      // Drag, inertia, wheel and keys all move it, render() turns it into rotation.
      this.proxy = document.createElement("div");
      this.index = -1;
      this.selected = null;
      this.target = null;
      this.dragged = false;
      this.z = 1;
      this.tiltValue = 0;

      this.render = this.render.bind(this);
      this.tick = this.tick.bind(this);

      this.setRotation = gsap.quickSetter(this.list, "rotation", "deg");
      this.thumbs = el.dataset.arcoOrbitThumbs === "false" ? [] : this.createThumbs();
      if (this.canOpen) this.createFull();

      this.setLink = this.links.map((link) => gsap.quickSetter(link, "css"));
      this.setText = this.texts.map((text) => gsap.quickSetter(text, "opacity"));
      this.setThumb = this.links.map((_, i) => (this.thumbs[i] ? gsap.quickSetter(this.thumbs[i], "opacity") : () => {}));
      this.setNumber = this.numbers.map((number) => (number ? gsap.quickSetter(number, "opacity") : () => {}));
      this.tilt = this.media ? gsap.quickTo(this.media, "rotation", { duration: 0.9, ease: "power3" }) : null;

      this.settle = gsap
        .delayedCall(0.16, () => {
          this.target = null;
          this.go(Math.round(this.position), { ease: "arco-reveal", duration: 0.9 });
        })
        .pause();
      this.resize = gsap
        .delayedCall(0.12, () => {
          this.measure();
          this.render();
        })
        .pause();

      // GSAP owns the transforms: links are centred on their arm, the preview on the stage
      gsap.set(this.links, { xPercent: -50 });
      gsap.set(this.images, { autoAlpha: 0 });
      this.measure();
      gsap.set(this.proxy, { x: -clamp(0, this.last, Number(el.dataset.arcoOrbitStart ?? 0)) * this.spacing });

      this.createDraggable();
      InertiaPlugin.track(this.proxy, "x");
      gsap.ticker.add(this.tick);
      this.bind();
      this.render();

      el.classList.add("is-ready");
      el.arcoOrbit = this;
      this.emit("init");
    }

    // Side links carry a small arch of their own image, so you can see what is next
    createThumbs() {
      return this.links.map((link, i) => {
        const source = this.images[i];
        if (!source) return null;

        const thumb = document.createElement("span");
        thumb.className = "arco-orbit_thumb";
        thumb.setAttribute("aria-hidden", "true");

        const img = document.createElement("img");
        img.src = source.currentSrc || source.src;
        img.alt = "";
        img.decoding = "async";
        img.draggable = false;

        thumb.append(img);
        link.prepend(thumb);
        return thumb;
      });
    }

    // The open view: the arch grows into a full bleed image behind the bars
    createFull() {
      const full = document.createElement("div");
      full.className = "arco-orbit_full";
      full.setAttribute("aria-hidden", "true");

      const image = document.createElement("img");
      image.className = "arco-orbit_full-image";
      image.alt = "";
      image.draggable = false;

      const content = document.createElement("div");
      content.className = "arco-orbit_full-content";

      const title = document.createElement("h2");
      title.className = "arco-orbit_full-title";
      const titleText = document.createElement("span");
      titleText.className = "arco-orbit_full-title-text";
      title.append(titleText);

      const close = document.createElement("button");
      close.type = "button";
      close.className = "arco-orbit_close";
      close.textContent = "Close";

      content.append(title, close);
      full.append(image, content);
      this.section.append(full);

      this.full = { el: full, image, title: titleText, close };
    }

    // Media box relative to the section, measured without the velocity tilt
    mediaBox() {
      gsap.set(this.media, { rotation: 0 });
      this.tilt?.tween?.kill();
      this.tiltValue = 0;

      const s = this.section.getBoundingClientRect();
      const m = this.media.getBoundingClientRect();
      const arch = this.media.offsetWidth / 2;
      const base = parseFloat(getComputedStyle(this.media).borderBottomLeftRadius) || 0;

      return {
        top: m.top - s.top,
        left: m.left - s.left,
        width: m.width,
        height: m.height,
        borderRadius: `${arch}px ${arch}px ${base}px ${base}px`,
      };
    }

    open() {
      if (!this.canOpen || this.isOpen || this.index < 0) return;

      const source = this.images[this.index];
      const { el, image, title, close } = this.full;
      const dark = source.dataset.arcoOrbitInk === "dark";
      const quick = this.reduced.matches;

      this.isOpen = true;
      this.draggable.disable();
      gsap.killTweensOf(this.proxy);
      this.settle.pause();

      image.src = source.currentSrc || source.src;
      title.textContent = this.texts[this.index].textContent.trim();

      gsap.set(el, { ...this.mediaBox(), autoAlpha: 1, zIndex: 2 });
      gsap.set(this.media, { autoAlpha: 0 });
      el.setAttribute("aria-hidden", "false");
      this.section.classList.add("is-open");
      this.section.classList.toggle("is-ink-dark", dark);

      this.openTl?.kill();
      this.openTl = gsap
        .timeline({ defaults: { ease: "arco-signature", duration: quick ? 0 : 1.2 } })
        .to(el, { top: 0, left: 0, width: this.section.offsetWidth, height: this.section.offsetHeight, borderRadius: "0px 0px 0px 0px" }, 0)
        .fromTo(image, { scale: 1.08 }, { scale: 1, duration: quick ? 0 : 1.5 }, 0)
        .to(this.list, { y: 60, autoAlpha: 0, duration: quick ? 0 : 0.5, ease: "arco-exit" }, 0)
        .fromTo(title, { yPercent: 110 }, { yPercent: 0, duration: quick ? 0 : 1, ease: "arco-reveal" }, quick ? 0 : 0.55)
        .fromTo(close, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: quick ? 0 : 0.8, ease: "arco-reveal" }, quick ? 0 : 0.7)
        .add(() => close.focus({ preventScroll: true }), quick ? 0 : 0.75)
        // Once open it follows the section, so a resize keeps it full bleed
        .add(() => gsap.set(el, { width: "100%", height: "100%" }));

      // Opening rises a fifth, closing falls back
      this.click(this.index, 0.5);
      this.click(this.index, 0.75, 0.09);
      this.emit("open", { index: this.index });
    }

    close() {
      if (!this.isOpen) return;

      const { el, title, close } = this.full;
      const quick = this.reduced.matches;
      this.isOpen = false;

      this.openTl?.kill();
      // Drop under the arc while shrinking, so the title sits on the image like the arch
      gsap.set(el, { width: this.section.offsetWidth, height: this.section.offsetHeight, zIndex: 1 });
      this.section.classList.remove("is-open", "is-ink-dark");
      el.setAttribute("aria-hidden", "true");

      this.openTl = gsap
        .timeline({
          defaults: { ease: "arco-signature", duration: quick ? 0 : 1 },
          onComplete: () => {
            gsap.set(el, { autoAlpha: 0 });
            gsap.set(this.media, { autoAlpha: 1 });
            this.draggable.enable();
            if (!InertiaPlugin.isTracking(this.proxy, "x")) InertiaPlugin.track(this.proxy, "x");
          },
        })
        .to(title, { yPercent: -110, duration: quick ? 0 : 0.4, ease: "arco-exit" }, 0)
        .to(close, { autoAlpha: 0, duration: quick ? 0 : 0.3, ease: "none" }, 0)
        .to(el, this.mediaBox(), quick ? 0 : 0.1)
        // Hand back to the arch the moment the shapes match
        .add(() => {
          gsap.set(el, { autoAlpha: 0 });
          gsap.set(this.media, { autoAlpha: 1 });
        })
        .to(this.list, { y: 0, autoAlpha: 1, duration: quick ? 0 : 0.8, ease: "arco-reveal" }, quick ? 0 : 0.55)
        .add(() => this.links[this.index].focus({ preventScroll: true }), quick ? 0 : 0.6);

      this.click(this.index, 0.75);
      this.click(this.index, 0.5, 0.09);
      this.emit("close", { index: this.index });
    }

    get position() {
      return -gsap.getProperty(this.proxy, "x") / this.spacing;
    }

    // Radius and spacing follow the stage width, so the active item and its
    // neighbours keep the same composition from phone to desktop.
    measure() {
      const position = this.spacing ? this.position : null;
      const { width } = this.el.getBoundingClientRect();

      this.radius = Math.max(width * 1.15, 640);
      this.spacing = clamp(200, 560, width * 0.36);
      this.step = (this.spacing / this.radius) * (180 / Math.PI);
      this.minX = -this.last * this.spacing;

      this.el.style.setProperty("--arco-orbit-radius", `${this.radius}px`);
      this.media?.style.setProperty("--arco-orbit-arch", `${this.media.offsetWidth / 2}px`);
      this.items.forEach((item, i) => gsap.set(item, { rotation: i * this.step }));

      if (position !== null) gsap.set(this.proxy, { x: -position * this.spacing });
      this.draggable?.applyBounds({ minX: this.minX, maxX: 0 });
    }

    createDraggable() {
      this.draggable = Draggable.create(this.proxy, {
        type: "x",
        trigger: this.el,
        bounds: { minX: this.minX, maxX: 0 },
        edgeResistance: 0.85,
        dragClickables: true,
        inertia: !this.reduced.matches,
        snap: (value) => clamp(this.minX, 0, Math.round(value / this.spacing) * this.spacing),
        minDuration: 0.5,
        maxDuration: 1.4,
        overshootTolerance: 0,
        onPress: () => {
          gsap.killTweensOf(this.proxy);
          this.settle.pause();
          this.target = null;
          this.selected = null;
          this.dragged = false;
        },
        onDragStart: () => {
          this.dragged = true;
          this.el.classList.add("is-dragging");
        },
        onDrag: this.render,
        onThrowUpdate: this.render,
        onRelease: () => {
          this.el.classList.remove("is-dragging");
          if (this.reduced.matches) this.go(Math.round(this.position));
        },
      })[0];
    }

    render() {
      const position = this.position;
      this.setRotation(-position * this.step);

      for (let i = 0; i < this.count; i++) {
        const distance = Math.abs(i - position);
        const near = focus(Math.min(distance, 1));
        const fade = clamp(0, 1, mapRange(1, 2.4, 0, 1, distance));

        this.setLink[i]({ scale: interpolate(1, SIDE_SCALE, near) });
        this.setText[i](interpolate(1, SIDE_OPACITY, near) * (1 - fade));
        this.setThumb[i](near * (1 - fade) * THUMB_OPACITY);
        this.setNumber[i](1 - near);
      }

      const active = clamp(0, this.last, Math.round(position));
      if (active !== this.index) this.activate(active);
    }

    // The preview leans with the arc's velocity and settles when it stops
    tick() {
      // Draggable stops tracking while disabled (open view), so skip until it is back
      if (!this.tilt || this.isOpen || !InertiaPlugin.isTracking(this.proxy, "x")) return;
      const velocity = this.reduced.matches ? 0 : InertiaPlugin.getVelocity(this.proxy, "x");
      const value = Math.round(clamp(-MAX_TILT, MAX_TILT, velocity / -240) * 10) / 10;
      if (value === this.tiltValue) return;
      this.tiltValue = value;
      this.tilt(value);
    }

    activate(index) {
      const previous = this.index;
      this.index = index;

      this.links.forEach((link, i) => {
        if (i === index) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });

      if (this.counter) this.counter.textContent = `${pad(index + 1)} / ${pad(this.count)}`;
      this.reveal(index, previous === -1);
      if (previous === -1) return;

      this.click(index);
      this.emit("change", { index, previous });
    }

    // Each new image rises inside the arch from a circle at its base
    reveal(index, immediate) {
      const image = this.images[index];
      if (!image) return;

      gsap.killTweensOf(image);
      gsap.set(image, { zIndex: ++this.z, autoAlpha: 1 });

      if (immediate || this.reduced.matches) {
        gsap.set(image, { clipPath: "circle(150% at 50% 100%)", scale: 1 });
        this.hideOthers(image);
        return;
      }

      gsap.fromTo(
        image,
        { clipPath: "circle(0% at 50% 100%)", scale: 1.2 },
        {
          clipPath: "circle(150% at 50% 100%)",
          scale: 1,
          duration: 1.2,
          ease: "arco-reveal",
          onComplete: () => this.hideOthers(image),
        }
      );
    }

    hideOthers(image) {
      if (this.images[this.index] !== image) return;
      this.images.forEach((other) => other !== image && gsap.set(other, { autoAlpha: 0 }));
    }

    /* Sound: a short glassy knock per link, off until the toggle is pressed */

    toggleSound() {
      const sound = this.sound;

      if (!sound.ctx) {
        if (navigator.audioSession) navigator.audioSession.type = "playback";
        else {
          const unlock = new Audio(SILENCE);
          unlock.setAttribute("playsinline", "");
          unlock.play().catch(() => {});
        }

        sound.ctx = new (window.AudioContext || window.webkitAudioContext)();
        sound.gain = sound.ctx.createGain();
        sound.gain.gain.value = 0.16;

        const filter = sound.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 3200;

        sound.gain.connect(filter);
        filter.connect(sound.ctx.destination);
      }

      sound.enabled = !sound.enabled;
      sound.enabled ? sound.ctx.resume() : sound.ctx.suspend();
      this.soundButton.setAttribute("aria-pressed", sound.enabled);
      this.soundButton.textContent = sound.enabled ? "Sound on" : "Sound off";
    }

    click(index, octave = 1, delay = 0) {
      const { ctx, gain, enabled, last } = this.sound;
      if (!enabled) return;
      if (ctx.state !== "running") ctx.resume();

      const now = ctx.currentTime + delay;
      if (octave === 1 && now - last < 0.035) return;
      if (octave === 1) this.sound.last = now;

      const note = NOTES[index % NOTES.length] * octave;

      // A pure tone and a softer octave above, both with a fast attack and a short tail
      [
        [note, "sine", 1, 0.32],
        [note * 2, "triangle", 0.28, 0.16],
      ].forEach(([frequency, type, level, decay]) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = type;
        osc.frequency.value = frequency;
        env.gain.setValueAtTime(0.0001, now);
        env.gain.exponentialRampToValueAtTime(level, now + 0.005);
        env.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(env);
        env.connect(gain);
        osc.start(now);
        osc.stop(now + decay + 0.02);
      });
    }

    go(index, { ease = "arco-signature", duration } = {}) {
      index = clamp(0, this.last, index);
      this.selected = index;

      const time = this.reduced.matches
        ? 0
        : duration ?? clamp(0.8, 1.6, 0.7 + Math.abs(index - this.position) * 0.16);

      gsap.to(this.proxy, {
        x: -index * this.spacing,
        duration: time,
        ease,
        overwrite: true,
        onUpdate: this.render,
        onComplete: () => {
          this.render();
          this.draggable.update();
        },
      });
    }

    next() {
      this.go((this.selected ?? this.index) + 1);
    }

    prev() {
      this.go((this.selected ?? this.index) - 1);
    }

    // Wheel turns the arc until the first or last item, then the page scrolls on
    wheel(e) {
      if (this.isOpen) return;
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const delta = raw * (e.deltaMode === 1 ? 32 : 1) * WHEEL_SPEED;
      const from = this.target ?? gsap.getProperty(this.proxy, "x");
      const to = clamp(this.minX, 0, from - delta);
      if (to === from) return;

      e.preventDefault();
      this.target = to;
      this.selected = null;

      gsap.to(this.proxy, {
        x: to,
        duration: this.reduced.matches ? 0 : 0.7,
        ease: "power3.out",
        overwrite: true,
        onUpdate: this.render,
      });
      this.settle.restart(true);
    }

    bind() {
      const { signal } = this.abort;

      if (this.useWheel) this.el.addEventListener("wheel", (e) => this.wheel(e), { passive: false, signal });

      this.el.addEventListener(
        "keydown",
        (e) => {
          if (this.isOpen) return;
          const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
          let index = null;

          if (e.key in keys) index = (this.selected ?? this.index) + keys[e.key];
          if (e.key === "Home") index = 0;
          if (e.key === "End") index = this.last;
          if (index === null) return;

          e.preventDefault();
          index = clamp(0, this.last, index);
          this.go(index);
          this.links[index].focus({ preventScroll: true });
        },
        { signal }
      );

      this.links.forEach((link, i) => {
        // A click on a side item brings it to the top, a click on the active item follows the link
        link.addEventListener(
          "click",
          (e) => {
            if (this.dragged) {
              e.preventDefault();
              this.dragged = false;
              return;
            }
            if (i !== this.index) {
              e.preventDefault();
              this.go(i);
            } else if (this.canOpen) {
              e.preventDefault();
              this.open();
            }
          },
          { signal }
        );

        // Tabbing through the list turns the arc to the focused item
        link.addEventListener(
          "focus",
          () => {
            this.el.scrollTop = this.el.scrollLeft = 0;
            if (link.matches(":focus-visible") && i !== (this.selected ?? this.index)) this.go(i);
          },
          { signal }
        );
      });

      this.soundButton?.addEventListener("click", () => this.toggleSound(), { signal });

      // The arch opens too, not only the title. A drag that ends on it does not count.
      this.media?.addEventListener(
        "click",
        () => {
          if (this.dragged) {
            this.dragged = false;
            return;
          }
          this.open();
        },
        { signal }
      );

      if (this.full) {
        this.full.el.addEventListener("click", () => this.close(), { signal });
        window.addEventListener("keydown", (e) => e.key === "Escape" && this.close(), { signal });
      }
      window.addEventListener("resize", () => this.resize.restart(true), { passive: true, signal });
    }

    emit(name, detail = {}) {
      this.el.dispatchEvent(new CustomEvent(`arco:${name}`, { detail: { instance: this, ...detail } }));
    }

    destroy() {
      this.abort.abort();
      this.draggable.kill();
      this.settle.kill();
      this.resize.kill();
      gsap.ticker.remove(this.tick);
      InertiaPlugin.untrack(this.proxy);
      this.sound.ctx?.close();
      this.thumbs.forEach((thumb) => thumb?.remove());
      this.openTl?.kill();
      this.full?.el.remove();
      this.section.classList.remove("is-open", "is-ink-dark");
      gsap.killTweensOf([this.proxy, this.media, ...this.images]);
      gsap.set([this.list, this.media, ...this.items, ...this.links, ...this.texts, ...this.numbers, ...this.images].filter(Boolean), {
        clearProps: "all",
      });
      this.el.classList.remove("is-ready", "is-dragging");
      delete this.el.arcoOrbit;
    }

    static init(scope = document) {
      return gsap.utils.toArray("[data-arco-orbit]", scope).map((el) => el.arcoOrbit ?? new ArcoOrbit(el));
    }
  }

  window.ArcoOrbit = ArcoOrbit;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => ArcoOrbit.init());
  } else {
    ArcoOrbit.init();
  }
})();
