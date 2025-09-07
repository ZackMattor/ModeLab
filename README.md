# Chord Explorer

A tiny Vue 3 frontend for exploring and playing chords with a built‑in WebAudio synth.

## Quick Start

- Prereqs: Node.js 16+ recommended; modern browser.
- Install deps (required the first time): `npm install`
- Dev server: `npm run dev` (opens at `http://localhost:8080` by default)
- Build for production: `npm run build` (outputs to `dist/`)
- Lint: `npm run lint`
- Format: `npm run format` (Prettier)
- Format check: `npm run format:check`

Note: Opening the HTML file directly is not supported in this Vue setup. Use the dev server for local development. When deploying, serve the built `dist/` folder over HTTP(S).

If you see "vue-cli-service: command not found", run `npm install` to ensure `@vue/cli-service` is installed locally.

### Formatting (Prettier)

- This repo uses Prettier. Config lives in `.prettierrc.json` and `.prettierignore`.
- Commands:
  - `npm run format` to write changes
  - `npm run format:check` to verify formatting in CI or before commits

## Features

- Chord: Pick root, octave, quality, and inversion; add extensions (9, 11, 13, b9, #9, #11, b13).
- Playback: Set velocity, duration, optional arpeggiation gap, and Hold mode.
- Piano roll: Click keys to audition notes; highlights active notes.
- Shortcuts: Space = Play, Esc = Stop.

## Notes

- Uses WebAudio; no external MIDI devices are required.
- Pitch reference uses A4 = MIDI 69.

## Project Structure

- `public/index.html` – HTML template injected by Vue CLI
- `src/main.js` – App entry
- `src/App.vue` – Main UI, chord logic, and synth handling
- `src/assets/main.css` – Global styles

## Development Tips

- The synth exposes waveform, volume, filter cutoff/resonance, ADSR, and detune controls; changes apply live to sustained notes.
- Inversion count depends on the selected chord quality; changing quality resets the inversion to root position.
- For multi‑select extensions, use Cmd/Ctrl to select multiple options.

## License

No license specified. Add one if you intend to distribute.
