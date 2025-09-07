<template>
  <div class="track-controls compact">
    <div class="toolbar">
      <div class="group">
        <label>Chord</label>
        <select v-model.number="selectedDegree" :title="'Degree in key'">
          <option v-for="opt in degreeOptions" :key="opt.degree" :value="opt.degree">{{ opt.label }}</option>
        </select>
        <input type="number" min="0" max="8" v-model.number="track.octave" :title="'Octave'" />
        <select v-model="track.quality" @change="resetInversion" :title="'Quality'">
          <option v-for="key in sortedQualityKeys" :key="key" :value="key">{{ CHORD_QUALITIES[key].name }}</option>
        </select>
        <select v-model.number="track.inversion" :title="'Inversion'">
          <option v-for="i in inversionCount" :key="i - 1" :value="i - 1">{{ i - 1 }}</option>
        </select>
        <select multiple v-model="track.extensions" :title="'Extensions'">
          <option v-for="(semi, key) in EXTENSIONS" :key="key" :value="key">{{ key }}</option>
        </select>
      </div>
      <div class="group">
        <label>Synth</label>
        <select v-model="track.synth.wave" @input="applySynth" :title="'Waveform'">
          <option value="sine">Sine</option>
          <option value="triangle">Triangle</option>
          <option value="sawtooth">Saw</option>
          <option value="square">Square</option>
        </select>
        <input type="range" min="0" max="1" step="0.01" v-model.number="track.synth.master" @input="applySynth" :title="'Volume'" />
        <input type="range" min="100" max="12000" step="10" v-model.number="track.synth.cutoff" @input="applySynth" :title="'Cutoff'" />
        <button class="secondary small" @click="advanced = !advanced" :title="'Toggle advanced'">Adv</button>
      </div>
      <div class="group">
        <label>Play</label>
        <input type="range" min="1" max="127" v-model.number="track.velocity" :title="'Velocity'" />
        <input type="range" min="50" max="4000" step="10" v-model.number="track.duration" :title="'Duration'" />
        <input type="range" min="0" max="400" step="10" v-model.number="track.arpGap" :title="'Arp gap'" />
        <label class="chk" :title="'Hold'"><input type="checkbox" v-model="track.hold" /> Hold</label>
        <button @click="playChord" title="Play">▶</button>
        <button class="secondary" @click="stopAll" title="Stop">■</button>
      </div>
    </div>

    <div v-show="advanced" class="advanced grid two">
      <div class="field">
        <label>Resonance (Q): <span>{{ track.synth.resonance.toFixed(1) }}</span></label>
        <input type="range" min="0.1" max="20" step="0.1" v-model.number="track.synth.resonance" @input="applySynth" />
      </div>
      <div class="field">
        <label>Attack: <span>{{ track.synth.attackMs }} ms</span></label>
        <input type="range" min="0" max="2000" step="5" v-model.number="track.synth.attackMs" @input="applySynth" />
      </div>
      <div class="field">
        <label>Decay: <span>{{ track.synth.decayMs }} ms</span></label>
        <input type="range" min="0" max="3000" step="10" v-model.number="track.synth.decayMs" @input="applySynth" />
      </div>
      <div class="field">
        <label>Sustain: <span>{{ Math.round(track.synth.sustain * 100) }}%</span></label>
        <input type="range" min="0" max="1" step="0.01" v-model.number="track.synth.sustain" @input="applySynth" />
      </div>
      <div class="field">
        <label>Release: <span>{{ track.synth.releaseMs }} ms</span></label>
        <input type="range" min="10" max="5000" step="10" v-model.number="track.synth.releaseMs" @input="applySynth" />
      </div>
      <div class="field">
        <label>Detune: <span>{{ track.synth.detune }} c</span></label>
        <input type="range" min="-100" max="100" step="1" v-model.number="track.synth.detune" @input="applySynth" />
      </div>
    </div>

    <div class="notes-display">{{ notesDisplay }}</div>
    <track-sequencer ref="seq" :track="track" @tick="$emit('seq-tick', $event)" @state="$emit('seq-state', $event)" />
  </div>
</template>

<script>
import { NOTE_NAMES, CHORD_QUALITIES, EXTENSIONS, noteName, computeChordNotes, applyInversion, scaleDegreeSemitones, degreeRootForKey, diatonicTriadQuality, romanForDegree } from '../lib/music';
import TrackSequencer from './TrackSequencer.vue';

export default {
  name: 'TrackControls',
  components: { TrackSequencer },
  emits: ['seq-tick', 'seq-state'],
  props: {
    track: { type: Object, required: true },
    songKeyRoot: { type: Number, default: 0 },
    songKeyMode: { type: String, default: 'major' },
  },
  data() {
    return { NOTE_NAMES, CHORD_QUALITIES, EXTENSIONS, advanced: false };
  },
  computed: {
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
        const idx = this.degreeOptions.findIndex((o) => o.rootPc === (this.track.root % 12));
        return idx === -1 ? 0 : idx;
      },
      set(i) {
        this.setDegree(i);
      },
    },
    sortedQualityKeys() {
      const degIdx = this.degreeOptions.findIndex((o) => o.rootPc === (this.track.root % 12));
      const diatonic = diatonicTriadQuality(degIdx >= 0 ? degIdx : 0, this.songKeyMode);
      return Object.keys(CHORD_QUALITIES).sort((a, b) => {
        if (a === diatonic && b !== diatonic) return -1;
        if (b === diatonic && a !== diatonic) return 1;
        return CHORD_QUALITIES[a].name.localeCompare(CHORD_QUALITIES[b].name);
      });
    },
    inversionCount() {
      return CHORD_QUALITIES[this.track.quality]?.intervals.length || 1;
    },
    chordNotes() {
      const base = computeChordNotes(this.track);
      return applyInversion(base, this.track.inversion);
    },
    notesDisplay() {
      return this.chordNotes.length
        ? this.chordNotes.map((n) => `${noteName(n)} (${n})`).join('  ·  ')
        : '–';
    },
  },
  methods: {
    setDegree(i) {
      const rootPc = degreeRootForKey(this.songKeyRoot, this.songKeyMode, i);
      this.track.root = rootPc;
      // Default quality to diatonic for this degree
      this.track.quality = diatonicTriadQuality(i, this.songKeyMode);
    },
    applySynth() {
      Object.assign(this.track.synthEngine.settings, this.track.synth);
      this.track.synthEngine.applyLiveSettings();
    },
    resetInversion() {
      this.track.inversion = 0;
    },
    playChord() {
      const notes = this.chordNotes.slice();
      if (!notes.length) return;
      const vel = this.track.velocity;
      const hold = this.track.hold;
      const gap = this.track.arpGap;
      const playOne = (n, at) => {
        setTimeout(() => {
          this.track.synthEngine.noteOn(n, vel);
          this.track.heldNotes.add(n);
          this.$set ? this.$set(this.track.activeNotes, n, true) : (this.track.activeNotes[n] = true);
        }, at);
        if (!hold) {
          setTimeout(() => {
            this.track.synthEngine.noteOff(n);
            this.track.heldNotes.delete(n);
            delete this.track.activeNotes[n];
          }, at + this.track.duration);
        }
      };
      if (gap > 0) notes.forEach((n, i) => playOne(n, i * gap));
      else notes.forEach((n) => playOne(n, 0));
    },
    stopAll() {
      // Stop any scheduled sequencer events and sounding notes
      if (this.$refs.seq && this.$refs.seq.stopSeq) this.$refs.seq.stopSeq();
      if (this.track.synthEngine && this.track.synthEngine.allOff) this.track.synthEngine.allOff();
      for (const n of Array.from(this.track.heldNotes)) {
        this.track.synthEngine.noteOff(n, 50);
        delete this.track.activeNotes[n];
      }
      this.track.heldNotes.clear();
    },
  },
  mounted() {
    this.applySynth();
  },
};
</script>

<style scoped>
.track-controls.compact { display: flex; flex-direction: column; gap: 8px; }
.toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.group { display: inline-flex; align-items: center; gap: 6px; }
.group > label { color: var(--muted); font-size: 11px; margin-right: 2px; }
.grid.two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field.checkbox {
  justify-content: center;
}
.buttons {
  display: flex;
  gap: 8px;
}
.notes-display {
  margin-top: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.chk { display: inline-flex; align-items: center; gap: 4px; }
select, input[type='number'] { min-width: 70px; }
select[multiple] { min-width: 90px; height: 26px; }
</style>
