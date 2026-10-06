/* ================================
   Arco — Accordion
   arco.studio
   ================================ */

(() => {
  gsap.registerPlugin(Flip, SplitText, CustomEase);

  CustomEase.create("arco-signature", "0.625, 0.05, 0, 1");
  CustomEase.create("arco-smooth", "0.76, 0, 0.24, 1");
  CustomEase.create("arco-snappy", "0.16, 1, 0.3, 1");
  CustomEase.create("arco-reveal", "0.16, 1, 0.3, 1");
  CustomEase.create("arco-exit", "0.7, 0, 0.84, 0");

  const presets = {
    signature: { ease: "arco-signature", duration: 1.1 },
    smooth: { ease: "arco-smooth", duration: 1.25 },
    snappy: { ease: "arco-snappy", duration: 0.9 },
  };

  // Must match the stacked layout query in accordion.css
  const STACKED = "(max-width: 767px), (max-width: 991px) and (orientation: portrait)";

  // While panels resize they slide under a still cursor, so hover is held
  // for a moment and then resolved against whatever is under the pointer.
  const HOVER_LOCK = 0.34;
  const HOVER_INTENT = 0.05;

  let count = 0;

  class ArcoAccordion {
    constructor(el, options = {}) {
      this.el = el;
      this.items = gsap.utils.toArray(".arco-accordion_item", el);
      if (this.items.length < 2) return;

      this.options = {
        active: Number(el.dataset.arcoActive ?? 0),
        trigger: el.dataset.arcoTrigger ?? "hover",
        ease: el.dataset.arcoEase ?? "signature",
        ...options,
      };

      this.id = el.id || `arco-accordion-${++count}`;
      this.index = gsap.utils.clamp(0, this.items.length - 1, this.options.active);
      this.motion = presets[this.options.ease] ?? presets.signature;
      this.abort = new AbortController();
      this.pointer = null;

      el.style.setProperty("--arco-count", this.items.length);
      this.panels = this.items.map((item, i) => this.setup(item, i));

      this.stacked = window.matchMedia(STACKED);
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

      this.panels.forEach((panel, i) => {
        this.toggle(panel, i === this.index);
        this.reset(panel, i === this.index);
      });
      this.bind();

      el.arcoAccordion = this;
      this.emit("init");
    }

    setup(item, i) {
      const q = gsap.utils.selector(item);
      const [label] = q(".arco-accordion_label");
      const [content] = q(".arco-accordion_content");
      const [heading] = q(".arco-accordion_heading");

      content.id ||= `${this.id}-panel-${i}`;
      content.setAttribute("role", "region");
      label?.setAttribute("aria-hidden", "true");

      if (heading) {
        heading.id ||= `${this.id}-heading-${i}`;
        content.setAttribute("aria-labelledby", heading.id);
      }

      let [button] = q(".arco-accordion_trigger");
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "arco-accordion_trigger";
        button.setAttribute("aria-label", `Open ${(label ?? heading).textContent.trim()}`);
        item.prepend(button);
      }
      button.setAttribute("aria-controls", content.id);

      const split = heading
        ? SplitText.create(heading, {
            type: "lines",
            mask: "lines",
            linesClass: "arco-accordion_line",
            aria: "none",
            autoSplit: true,
          })
        : null;

      return {
        item,
        button,
        label,
        content,
        split,
        media: q(".arco-accordion_media")[0],
        visual: q(".arco-accordion_visual")[0],
        text: q(".arco-accordion_text")[0],
        tl: null,
      };
    }

    go(index) {
      if (index === this.index || !this.panels[index]) return;

      const from = this.panels[this.index];
      const to = this.panels[index];
      const dir = index > this.index ? 1 : -1;
      const state = Flip.getState(this.items, { props: "borderRadius" });

      this.index = index;
      this.panels.forEach((panel, i) => this.toggle(panel, i === index));

      if (this.reduced.matches) {
        this.panels.forEach((panel, i) => this.reset(panel, i === index));
      } else {
        this.flip = Flip.from(state, { ...this.motion, absolute: true });
        this.leave(from, dir);
        this.enter(to, dir);
      }

      this.emit("change", { index, previous: this.panels.indexOf(from) });
    }

    next() {
      this.go(gsap.utils.wrap(0, this.items.length, this.index + 1));
    }

    prev() {
      this.go(gsap.utils.wrap(0, this.items.length, this.index - 1));
    }

    setEase(name) {
      if (!presets[name]) return;
      this.motion = presets[name];
      this.emit("ease", { ease: name });
    }

    toggle({ item, button, content }, open) {
      item.classList.toggle("is-active", open);
      button.setAttribute("aria-expanded", open);
      button.tabIndex = open ? 0 : -1;
      content.inert = !open;
    }

    reset(panel, open) {
      panel.tl?.kill();
      gsap.set(panel.content, { autoAlpha: open ? 1 : 0, xPercent: 0, yPercent: 0 });
      gsap.set(panel.label, { autoAlpha: open ? 0 : 1 });
      gsap.set(panel.split?.lines ?? [], { yPercent: 0 });
      gsap.set(panel.media, { clipPath: "inset(0% 0% 0% 0%)" });
      gsap.set(panel.visual, { scale: 1 });
      gsap.set(panel.text, { autoAlpha: 1, y: 0 });
    }

    enter(panel, dir) {
      const { ease, duration } = this.motion;
      const axis = this.stacked.matches ? "yPercent" : "xPercent";
      const at = duration * 0.2;

      panel.tl?.kill();
      panel.tl = gsap
        .timeline({ defaults: { ease: "arco-reveal", duration: 1 } })
        .set(panel.content, { autoAlpha: 1 })
        .to(panel.label, { autoAlpha: 0, duration: 0.2, ease: "power1.out" }, 0)
        .fromTo(panel.content, { [axis]: dir * 6 }, { [axis]: 0, duration: duration * 1.15, ease }, 0)
        .fromTo(panel.split?.lines ?? [], { yPercent: 140 }, { yPercent: 0, stagger: 0.075 }, at)
        .fromTo(panel.media, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }, at + 0.08)
        .fromTo(panel.visual, { scale: 1.3 }, { scale: 1, duration: 1.4 }, "<")
        .fromTo(panel.text, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8 }, at + 0.18);
    }

    leave(panel, dir) {
      const axis = this.stacked.matches ? "yPercent" : "xPercent";

      panel.tl?.kill();
      panel.tl = gsap
        .timeline({ defaults: { ease: "arco-exit", duration: 0.42 } })
        .to(panel.text, { autoAlpha: 0, duration: 0.2, ease: "none" }, 0)
        .to(panel.media, { clipPath: "inset(0% 0% 100% 0%)" }, 0)
        .to(panel.split?.lines ?? [], { yPercent: -140, stagger: 0.03 }, 0)
        .to(panel.content, { [axis]: dir * -6, duration: 0.6 }, 0)
        .to(panel.content, { autoAlpha: 0, duration: 0.12, ease: "none" }, 0.38)
        .to(panel.label, { autoAlpha: 1, duration: 0.8, ease: "arco-reveal" }, this.motion.duration * 0.45);
    }

    hovered() {
      if (!this.pointer) return -1;
      const item = document.elementFromPoint(this.pointer.x, this.pointer.y)?.closest(".arco-accordion_item");
      return this.items.indexOf(item);
    }

    resolveHover() {
      this.intent?.kill();
      const locked = this.flip?.isActive() ? Math.max(HOVER_LOCK - this.flip.time(), 0) : 0;

      this.intent = gsap.delayedCall(locked + HOVER_INTENT, () => {
        const index = this.hovered();
        if (index > -1) this.go(index);
      });
    }

    bind() {
      const { signal } = this.abort;
      const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

      this.el.addEventListener(
        "pointermove",
        (e) => {
          if (e.pointerType !== "mouse" || this.options.trigger !== "hover" || !canHover.matches) return;
          const before = this.hovered();
          this.pointer = { x: e.clientX, y: e.clientY };
          if (this.hovered() !== before) this.resolveHover();
        },
        { signal }
      );

      this.el.addEventListener(
        "pointerleave",
        () => {
          this.pointer = null;
          this.intent?.kill();
        },
        { signal }
      );

      this.panels.forEach(({ button }, i) => {
        button.addEventListener("click", () => this.go(i), { signal });
      });

      this.el.addEventListener(
        "keydown",
        (e) => {
          const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
          let index = null;

          if (e.key in keys) index = gsap.utils.wrap(0, this.items.length, this.index + keys[e.key]);
          if (e.key === "Home") index = 0;
          if (e.key === "End") index = this.items.length - 1;
          if (index === null) return;

          e.preventDefault();
          this.go(index);
          this.panels[index].button.focus();
        },
        { signal }
      );
    }

    emit(name, detail = {}) {
      this.el.dispatchEvent(new CustomEvent(`arco:${name}`, { detail: { instance: this, ...detail } }));
    }

    destroy() {
      this.abort.abort();
      this.intent?.kill();
      this.flip?.kill();
      this.panels.forEach((panel) => {
        panel.tl?.kill();
        panel.split?.revert();
        gsap.set([panel.item, panel.content, panel.label, panel.media, panel.visual, panel.text], { clearProps: "all" });
      });
      delete this.el.arcoAccordion;
    }

    static init(scope = document) {
      return gsap.utils
        .toArray("[data-arco-accordion]", scope)
        .map((el) => el.arcoAccordion ?? new ArcoAccordion(el));
    }
  }

  ArcoAccordion.presets = presets;
  window.ArcoAccordion = ArcoAccordion;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => ArcoAccordion.init());
  } else {
    ArcoAccordion.init();
  }
})();
