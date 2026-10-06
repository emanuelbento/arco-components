# Arco

Premium scroll components for Webflow and the web.

Arco is a library of high-quality animation components built with GSAP. Each component is ready to drop into any Webflow project or vanilla HTML site.

---

## Components

### Cylinder Stack
A pinned scroll section where cards turn on a 3D cylinder. ScrollTrigger pins the section and snaps to each card, the active card lights up while the rest fall into shadow, and the label swaps with a masked transition. Dots jump to any card. With reduced motion the cards crossfade in place.

**Files**
- `cylinder-stack.html` — HTML structure
- `cylinder-stack.css` — Styles and CSS variables
- `cylinder-stack.js` — Animation logic

**Dependencies**
- GSAP 3.15
- ScrollTrigger 3.15
- CustomEase 3.15

---

### Cursor Trail
An image trail that follows the cursor. Images spawn continuously and fade out smoothly, with random rotation for a natural feel.

**Files**
- `cursor-trail.html` — HTML structure
- `cursor-trail.css` — Styles
- `cursor-trail.js` — Animation logic

**Dependencies**
- GSAP 3.15

---

### Accordion
Expanding panels that open on hover. Flip handles the resize, SplitText masks the title lines, and three CustomEase presets (`signature`, `smooth`, `snappy`) set the feel. Stacks vertically on phones and portrait tablets.

**Files**
- `accordion.html` — HTML structure
- `accordion.css` — Styles and CSS variables
- `accordion.js` — Animation logic

**Dependencies**
- GSAP 3.15
- Flip 3.15
- SplitText 3.15
- CustomEase 3.15

---

## Usage

1. Add GSAP to your `<head>`
2. Copy the HTML structure into your page
3. Link the CSS and JS files
4. Replace images and content with your own

---

## More coming soon

Arco is actively growing. New components drop regularly.

---

Built by [Emanuel Bento](https://emanuelbento.pt)
