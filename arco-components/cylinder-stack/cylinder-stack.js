/* ================================
   Arco — Cylinder Stack
   arco.studio
   ================================ */

(function () {

gsap.registerPlugin(ScrollTrigger);

const cards = Array.from(document.querySelectorAll('.arco-card'));
const total = cards.length;
const labelName = document.getElementById('arcoLabelName');
const labelIndex = document.getElementById('arcoLabelIndex');
const dotsContainer = document.getElementById('arcoDots');

/* ------------------------- Dots */
cards.forEach((_, i) => {
  const d = document.createElement('div');
  d.className = 'arco-dot' + (i === 0 ? ' active' : '');
  dotsContainer.appendChild(d);
});
const dots = Array.from(dotsContainer.querySelectorAll('.arco-dot'));

/* ------------------------- Config */
const RADIUS = 320;
const ANGLE_STEP = 36;

/* ------------------------- Update */
function update(progress) {
  const activeF = progress * (total - 1);
  cards.forEach((card, i) => {
    const offset = i - activeF;
    const rotX = offset * ANGLE_STEP;
    const transY = Math.sin((rotX * Math.PI) / 180) * RADIUS;
    const transZ = (Math.cos((rotX * Math.PI) / 180) - 1) * RADIUS;
    const absOff = Math.abs(offset);
    gsap.set(card, {
      rotateX: rotX,
      y: transY,
      z: transZ,
      scale: 1 - absOff * 0.04,
      opacity: Math.max(0, 1 - absOff * 0.28),
      zIndex: offset < 0 ? Math.round(1000 + offset * 100) : Math.round(1000 - offset * 100),
      transformOrigin: '50% 50%',
    });
  });

  const idx = Math.max(0, Math.min(total - 1, Math.round(activeF)));
  const newLabel = cards[idx].dataset.label;

  if (labelName.textContent !== newLabel) {
    gsap.to(labelName, {
      opacity: 0, y: -6, duration: 0.15,
      onComplete: () => {
        labelName.textContent = newLabel;
        gsap.to(labelName, { opacity: 1, y: 0, duration: 0.2 });
      }
    });
  }

  labelIndex.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
  dots.forEach((dot, i) => dot.classList.toggle('active', i === idx));
}

/* ------------------------- Init */
update(0);

/* ------------------------- ScrollTrigger */
ScrollTrigger.create({
  trigger: '.arco-scroll-spacer',
  start: 'top top',
  end: 'bottom bottom',
  scrub: 1.2,
  onUpdate: self => update(self.progress)
});

})();
