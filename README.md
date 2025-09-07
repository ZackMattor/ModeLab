# Chord Explorer (Web MIDI)

A tiny Vue 3 frontend for exploring and playing chords via Web MIDI, with a built‑in WebAudio synth fallback.

## Quick Start

- Prereqs: Node.js 16+ recommended; modern Chromium browser for best Web MIDI support.
- Install deps (required the first time): `npm install`
- Dev server: `npm run dev` (opens at `http://localhost:8080` by default)
- Build for production: `npm run build` (outputs to `dist/`)
- Lint: `npm run lint`

Note: Opening the HTML file directly is not supported in this Vue setup. Use the dev server for local development. When deploying, serve the built `dist/` folder over HTTP(S).

If you see "vue-cli-service: command not found", run `npm install` to ensure `@vue/cli-service` is installed locally.

## Features

- Output: Select a MIDI output and MIDI channel; toggle WebAudio synth fallback.
- Chord: Pick root, octave, quality, and inversion; add extensions (9, 11, 13, b9, #9, #11, b13).
- Playback: Set velocity, duration, optional arpeggiation gap, and Hold mode.
- Piano roll: Click keys to audition notes; highlights active notes.
- Shortcuts: Space = Play, Esc = Stop.

## Browser + MIDI Notes

- Web MIDI works best in Chromium‑based browsers. You may be prompted to grant MIDI permissions.
- If no hardware output is available or MIDI access is blocked, enable the built‑in WebAudio synth.
- Pitch reference uses A4 = MIDI 69.

## Project Structure

- `public/index.html` – HTML template injected by Vue CLI
- `src/main.js` – App entry
- `src/App.vue` – Main UI, chord logic, and MIDI/synth handling
- `src/assets/main.css` – Global styles

## Development Tips

- The synth exposes waveform, volume, filter cutoff/resonance, ADSR, and detune controls; changes apply live to sustained notes.
- Inversion count depends on the selected chord quality; changing quality resets the inversion to root position.
- For multi‑select extensions, use Cmd/Ctrl to select multiple options.

## License

No license specified. Add one if you intend to distribute.
