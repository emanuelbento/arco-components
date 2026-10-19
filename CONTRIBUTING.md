# Contributing to Arco

Thanks for taking the time. Arco is small and opinionated, so a short note on how it works keeps things simple.

## Reporting a bug

Open an issue with the **Bug report** template. A link to a page or a CodePen that shows the problem is the fastest way to a fix.

## Suggesting something

Open an issue with the **Idea or request** template before writing code, so we can agree on the approach first.

## Pull requests

- One component or one fix per pull request.
- Follow the existing structure: `components/<name>/` with `<name>.html`, `<name>.css`, `<name>.js` and an `images/` folder.
- Class names follow Finsweet Client-First: `section_arco-<name>`, `arco-<name>_<element>`, states as `is-active`, `is-open`, `is-ready`.
- Plain JavaScript and GSAP only, no build step. Respect `prefers-reduced-motion` and keep controls keyboard accessible.
- Test on desktop and on a phone before opening the pull request.

## License

By contributing you agree that your work is released under the MIT license of this repository.
