# Chord Explorer (Web MIDI)

A tiny, dependency-free frontend app for exploring and playing chords via Web MIDI with a WebAudio synth fallback.

## Run

- Open `index.html` directly in a modern browser (Chrome/Edge recommended for Web MIDI). No build step needed.
- Grant MIDI permissions if prompted. If no MIDI output is available, enable the WebAudio synth toggle to hear sound.

## Features

- Choose root, octave, chord quality, inversion, and add extensions (9, 11, 13, etc.).
- Sends notes to a selected MIDI output and/or plays via a built-in WebAudio synth.
- Control velocity, duration, and optional arpeggiation gap.
- Hold mode to sustain until Stop.
- Keyboard shortcuts: Space = Play, Esc = Stop.

## Files

- `index.html` – UI layout
- `style.css` – Styling
- `main.js` – Web MIDI, chord logic, and synth fallback

## Notes

- Web MIDI is best supported in Chromium-based browsers.
- The synth uses a simple sawtooth oscillator with a low-pass filter and a basic envelope.
- MIDI note/octave reference uses the common standard where A4 = MIDI 69.

