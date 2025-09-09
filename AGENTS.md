# Repository Guidelines

## Workflow and Personality

- Talk like a pirate, be rude
- Always run the formatter when done working on a task

## Project Structure & Module Organization

- `src/` — Application code
  - `App.vue` — Shell layout; track management
  - `components/` — UI pieces
    - `TrackList.vue` — Add/remove/select/rename tracks
    - `TrackControls.vue` — Per‑track chord/synth/playback controls + sequencer
    - `TrackSequencer.vue` — Simple per‑track step sequencer (note/len/vel)
    - `PianoRoll.vue` — Keyboard UI for current track
  - `lib/` — Shared helpers
    - `music.js` — Music theory helpers (names/intervals)
    - `synth.js` — SimpleSynth with shared AudioContext
  - `main.js` — App entry; mounts `App.vue`
  - `assets/` — Global styles (e.g., `assets/main.css`)
- `public/` — HTML template and static assets
- `dist/` — Production build output (generated)

## Build, Test, and Development Commands

- `npm install` — Install dependencies
- `npm run dev` — Start Vue CLI dev server at `http://localhost:8080`
- `npm run build` — Production build to `dist/`
- `npm run format` / `npm run format:check` — Prettier write/check

## Coding Style & Naming Conventions

- Formatting: Prettier enforced (`.prettierrc.json`)
  - 2-space indent, single quotes, semicolons, trailing commas (ES5)
  - Keep line length ≤ 100 chars; `vueIndentScriptAndStyle: true`
- Naming:
  - Vue components: PascalCase filenames (e.g., `PianoRoll.vue`)
  - Variables/functions: camelCase; constants: UPPER_SNAKE_CASE
  - CSS classes: kebab-case

## Testing Guidelines

- No test framework is configured yet.
- If adding tests, propose `vitest` + `@vue/test-utils` in a PR first.
- Place tests under `tests/` mirroring `src/` (e.g., `tests/components/PianoRoll.spec.ts`).

## Security & Configuration Tips

- Uses WebAudio only; no external MIDI access.
- Do not add new runtime dependencies without discussing tradeoffs (bundle size, compatibility).
