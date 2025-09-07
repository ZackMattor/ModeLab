# Repository Guidelines

## Project Structure & Module Organization
- `src/` — Application code
  - `App.vue` — Main UI, chord/MIDI/synth logic
  - `main.js` — App entry; mounts `App.vue`
  - `assets/` — Global styles (e.g., `assets/main.css`)
- `public/` — HTML template and static assets
- `dist/` — Production build output (generated)

## Build, Test, and Development Commands
- `npm install` — Install dependencies
- `npm run dev` — Start Vue CLI dev server at `http://localhost:8080`
- `npm run build` — Production build to `dist/`
- `npm run lint` — ESLint (Vue 3 essential rules)
- `npm run format` / `npm run format:check` — Prettier write/check

## Coding Style & Naming Conventions
- Formatting: Prettier enforced (`.prettierrc.json`)
  - 2-space indent, single quotes, semicolons, trailing commas (ES5)
  - Keep line length ≤ 100 chars; `vueIndentScriptAndStyle: true`
- Linting: ESLint with `plugin:vue/vue3-essential` + `eslint:recommended`
- Naming:
  - Vue components: PascalCase filenames (e.g., `PianoRoll.vue`)
  - Variables/functions: camelCase; constants: UPPER_SNAKE_CASE
  - CSS classes: kebab-case

## Testing Guidelines
- No test framework is configured yet.
- If adding tests, propose `vitest` + `@vue/test-utils` in a PR first.
- Place tests under `tests/` mirroring `src/` (e.g., `tests/components/PianoRoll.spec.ts`).

## Commit & Pull Request Guidelines
- Current history is inconsistent; prefer Conventional Commits:
  - Examples: `feat: add arpeggiation gap`, `fix: correct MIDI channel off-by-one`
- PRs should include:
  - Clear description and rationale; link issues if applicable
  - Screenshots/GIFs for UI changes
  - Checklist: `dev` runs, `build` succeeds, lint/format pass
  - Scope PRs narrowly; avoid unrelated refactors

## Security & Configuration Tips
- Web MIDI requires a modern Chromium-based browser; users may need permission prompts.
- When MIDI hardware is unavailable, ensure the WebAudio synth fallback remains functional.
- Do not add new runtime dependencies without discussing tradeoffs (bundle size, compatibility).
