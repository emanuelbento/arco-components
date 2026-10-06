# Changelog

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
