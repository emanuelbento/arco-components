# Changelog

## 2.0.0 (2026-10-16)

### Changed
- Orbit is now Arc Menu, so the name says what it does and stays clear of a future orbit animation. Folder `components/arc-menu/`, classes `arco-arc-menu_*`, hook `data-arco-arc-menu`, options `data-arco-arc-menu-*`, CSS variables `--arco-arc-menu-*`, global `window.ArcoArcMenu`, instance `el.arcoArcMenu`. Behaviour and events are unchanged.

### Migrating from 1.x
- Replace `orbit` with `arc-menu` in the file paths and `arco-orbit` with `arco-arc-menu` in class names, attributes and CSS variables. Links pinned to `@1.1.1` keep working.

## 1.1.1 (2026-10-16)

### Fixed
- Orbit: on touch screens the open view hint reads "Tap to close" instead of mentioning the Esc key.

### Changed
- Orbit: the sixth Arco Study is now Halo, so the component and its content no longer share a name.
- README: animated previews, live demo and CodePen links for every component, Accordion credit to Made With GSAP.
- File headers point to the repository instead of arco.studio.
- README: step by step for adding a component to a Webflow site.

## 1.1.0 (2026-10-12)

### Added
- Orbit: navigation on an arc with drag and inertia, a wheel that hands back to the page at either end, keyboard and tab support, an arch-shaped preview that rises from its base and leans with the speed of the turn, small arches above the side links, an open view where the arch grows to full bleed and the bar text adapts to the image, and an optional note per link that also plays on iOS in silent mode. Seven Arco Studies artworks in SVG.

## 1.0.0 (2026-10-07)

First release.

### Added
- Accordion: expanding panels with Flip, SplitText masked titles and three CustomEase presets.

### Changed
- Cylinder Stack: rewritten as a pinned ScrollTrigger section with snap, a real 3D cylinder, shading instead of transparency, label transitions and clickable dots. Images reduced from 1.5 MB to 124 KB.
- Cursor Trail: scoped to its section, touch support, sound toggle, reduced motion, local images instead of Unsplash links.
- All components share the same tokens, type, Client-First class names and file headers.
- Folders moved from `arco-components/` to `components/`.

### Fixed
- Accordion no longer locks page scroll, so it can sit on the same page as Cylinder Stack.
- Cursor Trail dot no longer shows in the corner before the cursor moves.
- Cursor Trail images no longer stack above the header after long use.
