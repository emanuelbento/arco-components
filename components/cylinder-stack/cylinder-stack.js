/* ================================
   Arco — Cylinder Stack
   arco.studio
   ================================ */

(() => {
  gsap.registerPlugin(ScrollTrigger, CustomEase);

  CustomEase.create("arco-signature", "0.625, 0.05, 0, 1");
  CustomEase.create("arco-reveal", "0.16, 1, 0.3, 1");
  CustomEase.create("arco-exit", "0.7, 0, 0.84, 0");

  const STEP = 36; // degrees between cards
  const GAP = 12; // px between card edges
  const DIM = "brightness(0.32)";
  const LIT = "brightness(1)";

  class ArcoCylinderStack {
    constructor(el) {
      this.el = el;
      this.section = el.closest("section") ?? el;
      this.cards = gsap.utils.toArray(".arco-cylinder-stack_card", el);
      if (this.cards.length < 2) return;

      const q = gsap.utils.selector(this.section);
      this.index = 0;
      this.labelIndex = q(".arco-cylinder-stack_label-index")[0];
      this.labelName = q(".arco-cylinder-stack_label-name")[0];
      this.dots = this.createDots(q(".arco-cylinder-stack_dots")[0]);

      this.mm = gsap.matchMedia();
      this.mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" },
        ({ conditions }) => this.build(conditions.reduced)
      );

      this.update(0, true);
      el.arcoCylinderStack = this;
    }

    build(reduced) {
      this.reduced = reduced;
      const last = this.cards.length - 1;
      const track = this.el.querySelector(".arco-cylinder-stack_track");

      this.tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: this.section,
          start: "top top",
          end: () => `+=${window.innerHeight * last * 0.9}`,
          pin: true,
          scrub: reduced ? true : 1,
          snap: {
            snapTo: 1 / last,
            inertia: false,
            duration: reduced ? 0 : { min: 0.4, max: 1 },
            ease: "arco-signature",
          },
          invalidateOnRefresh: true,
          onUpdate: (self) => this.update(Math.round(self.progress * last)),
        },
      });

      // Reduced motion: no rotation, cards crossfade in place
      if (reduced) {
        gsap.set(this.cards, { autoAlpha: (i) => (i === 0 ? 1 : 0) });
        this.cards.slice(1).forEach((card, i) => {
          this.tl
            .to(this.cards[i], { autoAlpha: 0, duration: 0.5 }, i + 0.5)
            .to(card, { autoAlpha: 1, duration: 0.5 }, "<");
        });
        return;
      }

      // Cards share one pivot behind the track. The radius keeps them edge to edge
      // and is recalculated on every refresh, since GSAP caches the z origin.
      const setRadius = () => {
        const radius = (track.offsetHeight / 2 + GAP) / Math.tan((STEP * Math.PI) / 360);
        gsap.set([track, ...this.cards], { transformOrigin: `50% 50% ${-radius}px` });
      };
      setRadius();
      ScrollTrigger.addEventListener("refreshInit", setRadius);

      gsap.set(this.cards, { rotationX: (i) => -i * STEP, filter: (i) => (i === 0 ? LIT : DIM) });
      this.tl.to(track, { rotationX: last * STEP, duration: last }, 0);

      // Each card lights up as it reaches the front and dims as it leaves
      this.cards.forEach((card, i) => {
        if (i > 0) this.tl.to(card, { filter: LIT, duration: 1 }, i - 1);
        if (i < last) this.tl.to(card, { filter: DIM, duration: 1 }, i);
      });

      return () => ScrollTrigger.removeEventListener("refreshInit", setRadius);
    }

    createDots(list) {
      if (!list) return [];

      return this.cards.map((card, i) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "arco-cylinder-stack_dot";
        button.setAttribute("aria-label", `Go to ${card.dataset.label ?? `card ${i + 1}`}`);
        button.addEventListener("click", () => this.go(i));
        item.append(button);
        list.append(item);
        return button;
      });
    }

    go(index) {
      const st = this.tl?.scrollTrigger;
      if (!st) return;
      const top = st.start + (st.end - st.start) * (index / (this.cards.length - 1));
      window.scrollTo({ top, behavior: "smooth" });
    }

    update(index, immediate = false) {
      if (index === this.index && !immediate) return;

      const dir = index > this.index ? 1 : -1;
      const card = this.cards[index];
      const pad = (n) => String(n).padStart(2, "0");

      this.index = index;
      if (!immediate) this.el.dispatchEvent(new CustomEvent("arco:change", { detail: { index, instance: this } }));
      this.dots.forEach((dot, i) => dot.setAttribute("aria-current", i === index));
      if (this.labelIndex) this.labelIndex.textContent = `${pad(index + 1)} / ${pad(this.cards.length)}`;
      if (!this.labelName) return;

      this.labelTl?.kill();

      if (immediate || this.reduced) {
        this.labelName.textContent = card.dataset.label ?? "";
        gsap.set(this.labelName, { yPercent: 0 });
        return;
      }

      this.labelTl = gsap
        .timeline()
        .to(this.labelName, { yPercent: -110 * dir, duration: 0.3, ease: "arco-exit" })
        .add(() => (this.labelName.textContent = card.dataset.label ?? ""))
        .fromTo(this.labelName, { yPercent: 110 * dir }, { yPercent: 0, duration: 0.7, ease: "arco-reveal" });
    }

    destroy() {
      this.mm.revert();
      this.labelTl?.kill();
      this.dots.forEach((dot) => dot.parentElement.remove());
      delete this.el.arcoCylinderStack;
    }

    static init(scope = document) {
      return gsap.utils
        .toArray("[data-arco-cylinder-stack]", scope)
        .map((el) => el.arcoCylinderStack ?? new ArcoCylinderStack(el));
    }
  }

  window.ArcoCylinderStack = ArcoCylinderStack;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => ArcoCylinderStack.init());
  } else {
    ArcoCylinderStack.init();
  }
})();
