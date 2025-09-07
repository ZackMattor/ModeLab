# Chord Explorer

A tiny Vue 3 multi‑track chord explorer with a built‑in WebAudio synth.

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

- Multiple tracks: Add/remove, rename, and select tracks.
- Per‑track synth: Waveform, volume, filter, ADSR, and detune.
- Per‑track sequencer: Define steps (note, length, velocity) and play/stop with a configurable gap.
- Chords: Root, octave, quality, inversion, extensions (9/11/13, b9, #9, #11, b13).
- Playback: Velocity, duration, arpeggiation gap, Hold mode.
- Piano roll: Click keys to audition notes; highlights active notes.
- Shortcuts: Space = Play/Stop sequencer, Esc = Stop.
 - Global transport: Play/Stop buttons in the header control the current track's sequencer.

## Notes

- Uses WebAudio; no external MIDI devices are required.
- Pitch reference uses A4 = MIDI 69.

## Project Structure

- `public/index.html` – HTML template injected by Vue CLI
- `src/main.js` – App entry
- `src/App.vue` – Shell layout; track management
- `src/components/TrackList.vue` – Add/remove/select/rename tracks
- `src/components/TrackControls.vue` – Per‑track chord, synth, and playback controls
- `src/components/PianoRoll.vue` – Keyboard UI tied to current track
- `src/lib/music.js` – Music theory helpers (names, intervals, math)
- `src/lib/synth.js` – SimpleSynth (shared AudioContext)
- `src/assets/main.css` – Global styles

## Development Tips

- The synth exposes waveform, volume, filter cutoff/resonance, ADSR, and detune controls; changes apply live to sustained notes.
- Inversion count depends on the selected chord quality; changing quality resets the inversion to root position.
- For multi‑select extensions, use Cmd/Ctrl to select multiple options.

## License

No license specified. Add one if you intend to distribute.
