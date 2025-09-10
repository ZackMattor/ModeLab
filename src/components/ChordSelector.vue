<template>
  <div class="chord-box">
    <div class="header">Chord</div>
    <div class="controls">
      <template v-if="!collapsed">
        <select v-model.number="selectedDegree" :title="'Roman‑numeral degree in current key'">
          <option v-for="opt in degreeOptions" :key="opt.degree" :value="opt.degree">
            {{ opt.label }}
          </option>
        </select>
        <input
          type="number"
          min="0"
          max="8"
          v-model.number="track.octave"
          :title="'Octave for chord root (C4=60)'"
        />
        <!-- Base triad quality -->
        <select v-model="baseQualityProxy" @change="resetInversion" :title="'Base triad'">
          <option value="maj">Major</option>
          <option value="min">Minor</option>
          <option value="dim">Diminished</option>
          <option value="aug">Augmented</option>
          <option value="sus2">Sus2</option>
          <option value="sus4">Sus4</option>
        </select>
        <!-- Seventh -->
        <select v-model="seventhProxy" :title="'7th'">
          <option value="none">No 7th</option>
          <option value="b7">b7 (dominant/min7)</option>
          <option value="maj7">maj7</option>
          <option value="dim7">dim7</option>
          <option value="half-dim">m7b5 (half‑dim)</option>
        </select>
        <!-- Add 6 -->
        <label class="chk" title="Add 6"> <input type="checkbox" v-model="track.add6" /> 6 </label>
        <select
          v-model.number="track.inversion"
          :title="'Inversion (move lowest notes up by octaves)'"
        >
          <option v-for="i in inversionCount" :key="i - 1" :value="i - 1">{{ i - 1 }}</option>
        </select>
        <select
          multiple
          v-model="track.extensions"
          :title="'Add chord extensions; Cmd/Ctrl‑click for multi‑select'"
        >
          <option v-for="(semi, key) in EXTENSIONS" :key="key" :value="key">{{ key }}</option>
        </select>
        <label class="ctl" title="Alterations">
          Alt
          <select multiple v-model="track.alterations">
            <option value="b9">b9</option>
            <option value="#9">#9</option>
            <option value="#11">#11</option>
            <option value="b13">b13</option>
          </select>
        </label>
        <!-- Play/export settings -->
        <label class="ctl" title="Velocity (1–127)">
          Vel <input type="range" min="1" max="127" v-model.number="track.velocity" />
        </label>
        <label class="ctl" title="Note length per note (in beats)">
          Len
          <select v-model.number="track.durationBeats">
            <option v-for="o in lenBeatOptions" :key="o.label" :value="o.beats">
              {{ o.label }}
            </option>
          </select>
        </label>
        <label class="ctl" title="Arpeggiator spacing; Off plays chord as a block">
          Arp
          <select v-model.number="track.arpGap">
            <option v-for="o in arpBeatOptions" :key="o.label" :value="o.beats">
              {{ o.label }}
            </option>
          </select>
        </label>
        <label class="chk" :title="'Hold'">
          <input type="checkbox" v-model="track.hold" /> Hold
        </label>
        <button class="small" @click="playChord" title="Audition chord">▶ Preview</button>
        <button class="small" @click="insert" title="Insert chord into sequencer">Insert</button>
      </template>
      <button class="small" @click="insertSegment" title="Insert chord segment">+ Segment</button>
    </div>
    <div class="notes-display">{{ notesDisplay }}</div>
  </div>
</template>

<script>
  import {
    NOTE_NAMES,
    EXTENSIONS,
    noteName,
    computeStructuredChordNotes,
    applyInversion,
    scaleDegreeSemitones,
    degreeRootForKey,
    diatonicTriadQuality,
    romanForDegree,
  } from '../lib/music';

  export default {
    name: 'ChordSelector',
    emits: ['insert', 'insert-segment'],
    props: {
      track: { type: Object, required: true },
      songKeyRoot: { type: Number, default: 0 },
      songKeyMode: { type: String, default: 'major' },
      bpm: { type: Number, default: 120 },
      collapsed: { type: Boolean, default: false },
    },
    data() {
      return { NOTE_NAMES, EXTENSIONS };
    },
    computed: {
      lenBeatOptions() {
        return [
          { label: '1/32', beats: 0.125 },
          { label: '1/16', beats: 0.25 },
          { label: '1/8', beats: 0.5 },
          { label: '1/4', beats: 1 },
          { label: '1/2', beats: 2 },
          { label: '1/1', beats: 4 },
        ];
      },
      arpBeatOptions() {
        return [
          { label: 'Off', beats: 0 },
          { label: '1/32', beats: 0.125 },
          { label: '1/16', beats: 0.25 },
          { label: '1/8', beats: 0.5 },
          { label: '1/4', beats: 1 },
        ];
      },
      degreeOptions() {
        const semis = scaleDegreeSemitones(this.songKeyMode);
        return semis.map((s, i) => {
          const rootPc = (this.songKeyRoot + s) % 12;
          const rn = romanForDegree(i, this.songKeyMode, diatonicTriadQuality(i, this.songKeyMode));
          return { degree: i, rootPc, label: `${rn} (${NOTE_NAMES[rootPc]})` };
        });
      },
      selectedDegree: {
        get() {
          const idx = this.degreeOptions.findIndex((o) => o.rootPc === this.track.root % 12);
          return idx === -1 ? 0 : idx;
        },
        set(i) {
          this.setDegree(i);
        },
      },
      inversionCount() {
        return 4;
      },
      chordNotes() {
        const cfg = {
          root: this.track.root,
          octave: this.track.octave,
          baseQuality: this.track.baseQuality || 'maj',
          seventh: this.track.seventh || 'none',
          add6: !!this.track.add6,
          extensions: Array.isArray(this.track.extensions) ? this.track.extensions : [],
          alterations: Array.isArray(this.track.alterations) ? this.track.alterations : [],
          inversion: this.track.inversion || 0,
        };
        const base = computeStructuredChordNotes(cfg);
        return base;
      },
      notesDisplay() {
        return this.chordNotes.length
          ? this.chordNotes.map((n) => `${noteName(n)} (${n})`).join('  ·  ')
          : '–';
      },
      baseQualityProxy: {
        get() {
          return this.track.baseQuality || 'maj';
        },
        set(v) {
          this.$set ? this.$set(this.track, 'baseQuality', v) : (this.track.baseQuality = v);
        },
      },
      seventhProxy: {
        get() {
          return this.track.seventh || 'none';
        },
        set(v) {
          // Enforce triad base for half-dim/dim7
          if (v === 'half-dim' || v === 'dim7') {
            this.$set
              ? this.$set(this.track, 'baseQuality', 'dim')
              : (this.track.baseQuality = 'dim');
          }
          this.$set ? this.$set(this.track, 'seventh', v) : (this.track.seventh = v);
        },
      },
    },
    methods: {
      setDegree(i) {
        const rootPc = degreeRootForKey(this.songKeyRoot, this.songKeyMode, i);
        this.track.root = rootPc;
        // Align defaults to key
        const q = diatonicTriadQuality(i, this.songKeyMode);
        this.$set ? this.$set(this.track, 'baseQuality', q) : (this.track.baseQuality = q);
        if (!this.track.seventh) this.track.seventh = 'none';
      },
      resetInversion() {
        this.track.inversion = 0;
      },
      playChord() {
        const notes = this.chordNotes.slice();
        if (!notes.length) return;
        const vel = this.track.velocity;
        const hold = this.track.hold;
        const msPerBeat = 60000 / Math.max(30, Math.min(300, Number(this.bpm || 120)));
        const gapBeats = Number(this.track.arpGap || 0);
        const gapMs = Math.max(0, gapBeats * msPerBeat);
        const durBeats = Number(this.track.durationBeats || 1);
        const durMs = Math.max(10, durBeats * msPerBeat);
        const playOne = (n, at) => {
          setTimeout(() => {
            this.track.synthEngine.noteOn(n, vel);
            this.track.heldNotes.add(n);
            this.$set
              ? this.$set(this.track.activeNotes, n, true)
              : (this.track.activeNotes[n] = true);
          }, at);
          if (!hold) {
            setTimeout(() => {
              this.track.synthEngine.noteOff(n);
              this.track.heldNotes.delete(n);
              delete this.track.activeNotes[n];
            }, at + durMs);
          }
        };
        if (gapMs > 0) notes.forEach((n, i) => playOne(n, i * gapMs));
        else notes.forEach((n) => playOne(n, 0));
      },
      insert() {
        const notes = this.chordNotes.slice();
        if (!notes.length) return;
        this.$emit('insert', {
          notes,
          lenBeats: Math.max(0.0625, Number(this.track.durationBeats || 1)),
          vel: Math.max(1, Math.min(127, Number(this.track.velocity || 96))),
          arpBeats: Math.max(0, Number(this.track.arpGap || 0)),
        });
      },
      insertSegment() {
        const semis = scaleDegreeSemitones(this.songKeyMode);
        const degreeIdx = semis.findIndex(
          (s) => (this.songKeyRoot + s) % 12 === this.track.root % 12
        );
        const degree = degreeIdx >= 0 ? degreeIdx : 0;
        this.$emit('insert-segment', {
          degree,
          octave: this.track.octave,
          baseQuality: this.track.baseQuality || 'maj',
          seventh: this.track.seventh || 'none',
          add6: !!this.track.add6,
          inversion: this.track.inversion,
          extensions: (this.track.extensions || []).slice(),
          alterations: (this.track.alterations || []).slice(),
          velocity: Math.max(1, Math.min(127, Number(this.track.velocity || 96))),
          lenBeats: Math.max(0.0625, Number(this.track.durationBeats || 1)),
          arp: !!(Number(this.track.arpGap || 0) > 0),
          arpLenBeats: Math.max(0.0625, Number(this.track.arpGap || 0.25)),
          hold: !!this.track.hold,
        });
      },
    },
  };
</script>

<style scoped>
  .chord-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
  }
  .header {
    font-weight: 600;
    font-size: 12px;
    color: var(--muted);
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .ctl {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
  }
  .notes-display {
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
      monospace;
  }
  select,
  input[type='number'] {
    min-width: 70px;
  }
  select[multiple] {
    min-width: 90px;
    height: 26px;
  }
</style>
