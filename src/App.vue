<template>
  <div>
    <header>
      <h1>Chord Explorer</h1>
      <p class="subtitle">Multi-track synth: add, configure, and play tracks.</p>
    </header>

    <main>
      <section class="card" style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;">
        <div class="toolbar" style="display:flex;align-items:center;gap:8px;">
          <button @click="transportPlayPause" :class="{ active: seqPlaying }" :title="seqPlaying ? 'Pause' : 'Play'">
            {{ seqPlaying ? 'Pause' : 'Play' }}
          </button>
          <button class="secondary" @click="transportStop" title="Stop All">Stop</button>
          <button class="secondary" :class="{ active: metOn }" @click="metOn = !metOn" title="Metronome">Met</button>
          <span style="display:inline-flex;align-items:center;gap:6px; color: var(--muted); font-size:12px;">
            Key
            <select v-model.number="songKeyRoot">
              <option v-for="(n,i) in NOTE_NAMES" :key="i" :value="i">{{ n }}</option>
            </select>
            <select v-model="songKeyMode">
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
          </span>
        </div>
        <span class="time" style="color: var(--muted); font-size: 12px;">
          {{ timeDisplay }}
        </span>
      </section>
      <section class="row">
        <div class="card" style="min-width: 260px; max-width: 360px;">
          <track-list
            :tracks="tracks"
            :selected-id="selectedId"
            @add="addTrack"
            @remove="removeTrack"
            @select="selectTrack"
            @rename="renameTrack"
          />
        </div>

        <div class="card" style="flex: 1;">
          <h2>Track Controls</h2>
          <track-controls
            ref="tc"
            v-if="current"
            :track="current"
            :song-key-root="songKeyRoot"
            :song-key-mode="songKeyMode"
            @seq-tick="onSeqTick"
            @seq-state="onSeqState"
          />
          <p v-else>No track selected.</p>
        </div>
      </section>

      <section class="card">
        <h2>Piano Roll</h2>
        <piano-roll v-if="current" :track="current" :piano="piano" />
      </section>

      <section class="card">
        <h2>Tips</h2>
        <ul>
          <li>Use multiple tracks for layered textures.</li>
          <li>Adjust synth per track for contrast.</li>
        </ul>
      </section>
    </main>

    <footer>
      <span>Built for quick chord exploration.</span>
    </footer>
  </div>
</template>

<script>
import TrackList from './components/TrackList.vue';
import TrackControls from './components/TrackControls.vue';
import PianoRoll from './components/PianoRoll.vue';
import { SimpleSynth } from './lib/synth';
import { Metronome } from './lib/metronome';
import { NOTE_NAMES } from './lib/music';

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const makeTrack = (idx = 1) => ({
  id: makeId(),
  name: `Track ${idx}`,
  root: 0,
  octave: 4,
  quality: 'maj',
  inversion: 0,
  extensions: [],
  velocity: 96,
  duration: 800,
  arpGap: 0,
  hold: false,
  sequence: [],
  seqGap: 40,
  synth: {
    wave: 'sawtooth',
    master: 0.3,
    cutoff: 8000,
    resonance: 0.7,
    attackMs: 10,
    decayMs: 180,
    sustain: 0.8,
    releaseMs: 200,
    detune: 0,
  },
  synthEngine: new SimpleSynth(),
  activeNotes: {},
  heldNotes: new Set(),
  // Sequencer config
  seqBpm: 120,
  seqBeatsPerBar: 4,
  seqBars: 2,
  seqTicksPerBeat: 4,
});

export default {
  name: 'App',
  components: { TrackList, TrackControls, PianoRoll },
  data() {
    const first = makeTrack(1);
    return {
      tracks: [first],
      selectedId: first.id,
      piano: { start: 36, end: 96, W: 24, H: 130, BW: 14, BH: 78 },
      seqTick: 0,
      seqIsPlaying: false,
      metOn: false,
      met: new Metronome(),
      lastBeatIdx: -1,
      NOTE_NAMES,
      songKeyRoot: 0,
      songKeyMode: 'major',
    };
  },
  computed: {
    current() {
      return this.tracks.find((t) => t.id === this.selectedId) || null;
    },
    seqPlaying() { return this.seqIsPlaying; },
    timeDisplay() {
      const track = this.current;
      if (!track) return 'Bar 1 Beat 1 Tick 1';
      const tpb = Math.max(1, Number(track.seqTicksPerBeat || 4));
      const bpb = Math.max(1, Number(track.seqBeatsPerBar || 4));
      const ticks = Math.max(0, Math.floor(this.seqTick || 0));
      const ticksPerBar = tpb * bpb;
      const bar = Math.floor(ticks / ticksPerBar) + 1;
      const beat = Math.floor((ticks % ticksPerBar) / tpb) + 1;
      const tick = (ticks % tpb) + 1;
      return `Bar ${bar} Beat ${beat} Tick ${tick}`;
    },
  },
  methods: {
    onSeqTick(t) {
      this.seqTick = t;
      this.handleMetronome(t);
    },
    onSeqState(p) {
      this.seqIsPlaying = !!p;
      if (!this.seqIsPlaying) this.lastBeatIdx = -1;
    },
    handleMetronome(t) {
      if (!this.metOn || !this.seqIsPlaying || !this.current) return;
      const tpb = Math.max(1, Number(this.current.seqTicksPerBeat || 4));
      const bpb = Math.max(1, Number(this.current.seqBeatsPerBar || 4));
      const beatIdx = Math.floor(t / tpb);
      if (beatIdx !== this.lastBeatIdx) {
        const accent = (beatIdx % bpb) === 0;
        this.met.click(accent);
        this.lastBeatIdx = beatIdx;
      }
    },
    transportPlayPause() {
      const tc = this.$refs.tc;
      const seq = tc && tc.$refs ? tc.$refs.seq : null;
      if (!seq) return;
      if (seq.isPlaying) seq.stopSeq();
      else seq.playSeq();
    },
    transportStop() {
      const tc = this.$refs.tc;
      const seq = tc && tc.$refs ? tc.$refs.seq : null;
      if (seq) seq.stopSeq();
      if (this.current) {
        this.current.synthEngine.allOff?.();
        this.current.heldNotes.forEach((n) => this.current.synthEngine.noteOff(n, 50));
        this.current.heldNotes.clear();
        this.current.activeNotes = {};
      }
    },
    addTrack() {
      const t = makeTrack(this.tracks.length + 1);
      this.tracks.push(t);
      this.selectedId = t.id;
    },
    removeTrack(id) {
      const i = this.tracks.findIndex((t) => t.id === id);
      if (i === -1) return;
      const t = this.tracks[i];
      for (const n of Array.from(t.heldNotes)) t.synthEngine.noteOff(n, 50);
      this.tracks.splice(i, 1);
      if (!this.tracks.length) {
        const nt = makeTrack(1);
        this.tracks.push(nt);
        this.selectedId = nt.id;
      } else if (id === this.selectedId) {
        this.selectedId = this.tracks[Math.max(0, i - 1)].id;
      }
    },
    selectTrack(id) {
      this.selectedId = id;
    },
    renameTrack({ id, name }) {
      const t = this.tracks.find((x) => x.id === id);
      if (t) t.name = name;
    },
  },
  mounted() {
    window.addEventListener('keydown', (e) => {
      if (!this.current) return;
      if (e.code === 'Space') {
        const c = this.$refs.tc;
        if (c && c.$refs && c.$refs.seq) {
          e.preventDefault();
          const seq = c.$refs.seq;
          if (seq.isPlaying) seq.stopSeq();
          else seq.playSeq();
        }
      }
      if (e.key === 'Escape') {
        const c = this.$refs.tc;
        if (c && c.stopAll) c.stopAll();
        else {
          this.current.heldNotes.forEach((n) => this.current.synthEngine.noteOff(n, 50));
          this.current.heldNotes.clear();
          this.current.activeNotes = {};
          this.current.synthEngine.allOff?.();
        }
      }
    });
  },
};
</script>

<style scoped>
/* keep scoped block minimal; main styles are global */
</style>
