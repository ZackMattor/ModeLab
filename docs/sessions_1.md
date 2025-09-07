# Session Summary — Music Notes to Multi‑Track Sequencer

## Overview

We evolved a single‑view chord explorer into a compact, multi‑track, synth‑only mini‑DAW with a piano‑roll sequencer, global transport, metronome, and key‑aware chord selection. The UI was refactored into components, with improved ergonomics and robust audio handling to prevent stuck notes.

## Key Enhancements

- Multi‑track architecture
  - New components: `TrackList`, `TrackControls`, `PianoRoll`, `TrackSequencer`.
  - Shared libs: `lib/music.js` (theory helpers), `lib/synth.js` (SimpleSynth, shared AudioContext).
- Sequencer (piano‑roll)
  - Click‑and‑drag to add/move/resize notes, hover cell highlight, loop toggle.
  - Fixed ruler (always visible) with bar/beat markers and playhead triangle; scroll‑synced with roll.
  - Scrollable roll with left gutter; Middle C (C4) dashed row guides and centered label.
  - Bar/beat/tick readout in global transport updates live during playback.
- Transport + metronome
  - Global Play/Pause toggle, Stop, metronome (accent on bar 1), spacebar toggles sequencer, Esc stops.
- Key‑aware chords
  - Global key selector (root + mode). Chord degree dropdown shows roman numerals (e.g., “ii (D)”).
  - Selecting a degree sets track root and diatonic default quality; quality list sorted with diatonic first.
- UI compactness & ergonomics
  - Toolbar‑style controls, Advanced synth section toggle, reduced paddings.
  - Track list: click row to select, ✎ to rename (or double‑click), ✕ to remove.

## Stability & Audio Fixes

- Removed Web MIDI; app is synth‑only.
- Synth voice management hardened: tracks multiple voices per note, ends prior voice on retrigger, `allOff()` to silence reliably.
- Sequencer Stop/ESC cancel timers + release voices; global mouseup guard for piano‑roll to prevent stuck notes.

## Files Touched (high‑level)

- New: `src/components/TrackList.vue`, `TrackControls.vue`, `PianoRoll.vue`, `TrackSequencer.vue`
- New: `src/lib/music.js`, `src/lib/synth.js`, `src/lib/metronome.js`
- Updated: `src/App.vue`, `src/assets/main.css`, `README.md`, `AGENTS.md`

## Notable UX Decisions

- Fixed ruler ensures scrubbing is always accessible even when the roll is scrolled.
- Left gutter prevents labels (e.g., C4) from covering the first note column.
- Degree‑based chord selection ties progression choices to the selected key, improving musical workflow.

## Follow‑up Ideas

- Loop region A/B markers; selection/drag box and delete in sequencer.
- Optional seventh‑chord diatonic mapping; harmonic/melodic minor modes.
- Persist tracks and sequences (localStorage); per‑track mute/solo and mixer.

## Commit

- Commit recorded for latest sequencer/ruler changes: playhead triangle moved to fixed ruler, bar markers removed from roll, scroll sync.
