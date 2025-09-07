export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHORD_QUALITIES = {
  maj: { name: 'Major', intervals: [0, 4, 7] },
  min: { name: 'Minor', intervals: [0, 3, 7] },
  dim: { name: 'Diminished', intervals: [0, 3, 6] },
  aug: { name: 'Augmented', intervals: [0, 4, 8] },
  sus2: { name: 'Sus2', intervals: [0, 2, 7] },
  sus4: { name: 'Sus4', intervals: [0, 5, 7] },
  maj6: { name: 'Major 6', intervals: [0, 4, 7, 9] },
  m6: { name: 'Minor 6', intervals: [0, 3, 7, 9] },
  7: { name: 'Dominant 7', intervals: [0, 4, 7, 10] },
  maj7: { name: 'Major 7', intervals: [0, 4, 7, 11] },
  m7: { name: 'Minor 7', intervals: [0, 3, 7, 10] },
  mMaj7: { name: 'Minor Major 7', intervals: [0, 3, 7, 11] },
  dim7: { name: 'Diminished 7', intervals: [0, 3, 6, 9] },
  m7b5: { name: 'Half-diminished (m7b5)', intervals: [0, 3, 6, 10] },
};

export const EXTENSIONS = { 9: 14, 11: 17, 13: 21, b9: 13, '#9': 15, '#11': 18, b13: 20 };

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const noteName = (m) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
export const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);

export function computeChordNotes({ root, octave, quality, extensions }) {
  const rootMidi = (octave + 1) * 12 + root;
  const base = (CHORD_QUALITIES[quality]?.intervals || []).map((semi) => rootMidi + semi);
  const ext = (extensions || []).map((k) => rootMidi + (EXTENSIONS[k] || 0));
  return base.concat(ext).sort((a, b) => a - b);
}

export function applyInversion(notes, inversion) {
  const n = notes.slice();
  const inv = Math.max(0, Math.min(inversion || 0, Math.max(0, n.length - 1)));
  for (let i = 0; i < inv; i++) n.push(n.shift() + 12);
  return n;
}

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function nameToMidi(s) {
  if (s == null) return null;
  if (typeof s === 'number') return s;
  const t = String(s).trim();
  if (!t) return null;
  // numeric string
  if (/^-?\d+$/.test(t)) {
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  }
  // Parse note name like C4, C#4, Db3
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(t);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const accidental = m[2];
  const octave = parseInt(m[3], 10);
  let semitone = LETTERS[letter];
  if (semitone == null || !Number.isFinite(octave)) return null;
  if (accidental === '#') semitone += 1;
  else if (accidental === 'b') semitone -= 1;
  semitone = (semitone + 12) % 12;
  return (octave + 1) * 12 + semitone;
}

// Keys and roman numerals
export const MAJOR_DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_NATURAL_DEGREE_SEMITONES = [0, 2, 3, 5, 7, 8, 10];

export function scaleDegreeSemitones(mode) {
  return mode === 'minor' ? MINOR_NATURAL_DEGREE_SEMITONES : MAJOR_DEGREE_SEMITONES;
}

export function diatonicTriadQuality(degreeIndex, mode) {
  // 0-based degree index
  if (mode === 'minor') {
    // natural minor triads: i, ii°, III, iv, v, VI, VII
    const map = ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'];
    return map[degreeIndex % 7];
  }
  // major triads: I, ii, iii, IV, V, vi, vii°
  const map = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
  return map[degreeIndex % 7];
}

export function romanForDegree(degIdx, mode, quality) {
  const baseRomans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const isDiatonicMin =
    mode === 'minor'
      ? ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj']
      : ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
  const expected = isDiatonicMin[degIdx % 7];
  let rn = baseRomans[degIdx % 7];
  // Lowercase for minor/Dim if matches diatonic minor quality in minor key, or if actual quality is minor-like
  const q = quality || expected;
  if (q === 'min') rn = rn.toLowerCase();
  if (q === 'dim') rn = mode === 'minor' ? rn.toLowerCase() + '°' : rn.toLowerCase() + '°';
  if (q === 'aug') rn = rn + '+';
  if (q === 'maj') rn = rn; // keep uppercase
  return rn;
}

export function degreeRootForKey(keyRootPC, mode, degreeIndex) {
  const semis = scaleDegreeSemitones(mode);
  return (keyRootPC + semis[degreeIndex % 7]) % 12;
}
