<template>
  <div>
    <header>
      <h1>ModeLab</h1>
      <p
        class="subtitle"
        title="A key‑aware, roman‑numeral piano‑roll that teaches harmony as you compose"
      >
        Learn harmony. Sketch ideas fast.
      </p>
    </header>

    <main>
      <section
        class="card"
        style="
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: space-between;
          flex-wrap: wrap;
        "
      >
        <div class="toolbar" style="display: flex; align-items: center; gap: 8px">
          <button
            @click="transportPlayPause"
            :class="{ active: seqPlaying }"
            :title="seqPlaying ? 'Pause playback' : 'Play sequence'"
          >
            {{ seqPlaying ? 'Pause' : 'Play' }}
          </button>
          <button class="secondary" @click="transportStop" title="Stop all tracks and notes">
            Stop
          </button>
          <button
            class="secondary"
            :class="{ active: metOn }"
            @click="metOn = !metOn"
            title="Toggle metronome click"
          >
            Met
          </button>
          <label
            style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              color: var(--muted);
              font-size: 12px;
            "
            title="Global tempo in beats per minute"
            >BPM <input type="number" min="40" max="240" v-model.number="bpm"
          /></label>
          <span
            style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              color: var(--muted);
              font-size: 12px;
            "
            title="Song key (root and mode)"
          >
            Key
            <select v-model.number="songKeyRoot" title="Key root">
              <option v-for="(n, i) in NOTE_NAMES" :key="i" :value="i">{{ n }}</option>
            </select>
            <select v-model="songKeyMode" title="Key mode">
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
          </span>
          <span class="spacer" style="flex: 1"></span>
          <button class="secondary" title="Export session JSON" @click="downloadSession">
            Export
          </button>
          <button class="secondary" title="Import session JSON" @click="triggerImport">
            Import
          </button>
          <input
            ref="importer"
            type="file"
            accept="application/json,.json"
            style="display: none"
            @change="handleImportChange"
          />
        </div>
        <span class="time" style="color: var(--muted); font-size: 12px">
          {{ timeDisplay }}
        </span>
      </section>
      <section class="row">
        <div class="card" style="min-width: 260px; max-width: 360px">
          <track-list
            :tracks="tracks"
            :selected-id="selectedId"
            @add="addTrack"
            @remove="removeTrack"
            @select="selectTrack"
            @rename="renameTrack"
          />
        </div>

        <div class="card" style="flex: 1">
          <h2>Track Controls</h2>
          <track-controls
            ref="tc"
            v-if="current"
            :track="current"
            :song-key-root="songKeyRoot"
            :song-key-mode="songKeyMode"
            :bpm="bpm"
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
    durationBeats: 1,
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
        bpm: 120,
      };
    },
    computed: {
      current() {
        return this.tracks.find((t) => t.id === this.selectedId) || null;
      },
      seqPlaying() {
        return this.seqIsPlaying;
      },
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
      // ----- Session import/export -----
      sanitizedTrack(t) {
        return {
          id: String(t.id || makeId()),
          name: String(t.name || 'Track'),
          root: Number.isFinite(t.root) ? t.root : 0,
          octave: Number.isFinite(t.octave) ? t.octave : 4,
          quality: typeof t.quality === 'string' ? t.quality : 'maj',
          inversion: Number.isFinite(t.inversion) ? t.inversion : 0,
          extensions: Array.isArray(t.extensions) ? t.extensions.slice(0, 8) : [],
          velocity: Number.isFinite(t.velocity) ? t.velocity : 96,
          duration: Number.isFinite(t.duration) ? t.duration : 800,
          durationBeats: Number.isFinite(t.durationBeats) ? t.durationBeats : 1,
          arpGap: Number.isFinite(t.arpGap) ? t.arpGap : 0,
          hold: !!t.hold,
          sequence: Array.isArray(t.sequence)
            ? t.sequence.map((ev) => ({
                id: String(ev.id || makeId()),
                note: Math.max(0, Math.min(127, Number(ev.note) || 0)),
                start: Math.max(0, Number(ev.start) || 0),
                len: Math.max(1, Number(ev.len) || 1),
                vel: Math.max(1, Math.min(127, Number(ev.vel) || t.velocity || 96)),
              }))
            : [],
          seqGap: Number.isFinite(t.seqGap) ? t.seqGap : 40,
          synth: {
            wave: t?.synth?.wave || 'sawtooth',
            master: Number.isFinite(t?.synth?.master) ? t.synth.master : 0.3,
            cutoff: Number.isFinite(t?.synth?.cutoff) ? t.synth.cutoff : 8000,
            resonance: Number.isFinite(t?.synth?.resonance) ? t.synth.resonance : 0.7,
            attackMs: Number.isFinite(t?.synth?.attackMs) ? t.synth.attackMs : 10,
            decayMs: Number.isFinite(t?.synth?.decayMs) ? t.synth.decayMs : 180,
            sustain: Number.isFinite(t?.synth?.sustain) ? t.synth.sustain : 0.8,
            releaseMs: Number.isFinite(t?.synth?.releaseMs) ? t.synth.releaseMs : 200,
            detune: Number.isFinite(t?.synth?.detune) ? t.synth.detune : 0,
          },
          seqBpm: Number.isFinite(t.seqBpm) ? t.seqBpm : 120,
          seqBeatsPerBar: Number.isFinite(t.seqBeatsPerBar) ? t.seqBeatsPerBar : 4,
          seqBars: Number.isFinite(t.seqBars) ? t.seqBars : 2,
          seqTicksPerBeat: Number.isFinite(t.seqTicksPerBeat) ? t.seqTicksPerBeat : 4,
        };
      },
      sessionToJSON() {
        return {
          version: 1,
          bpm: Number(this.bpm || 120),
          songKeyRoot: Number(this.songKeyRoot || 0),
          songKeyMode: this.songKeyMode === 'minor' ? 'minor' : 'major',
          tracks: this.tracks.map((t) => this.sanitizedTrack(t)),
          selectedId: this.selectedId,
        };
      },
      downloadSession() {
        try {
          const data = this.sessionToJSON();
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json',
          });
          const a = document.createElement('a');
          const url = URL.createObjectURL(blob);
          a.href = url;
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          a.download = `modelab-session-${ts}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error('Failed to export session', e);
          alert('Failed to export session JSON.');
        }
      },
      triggerImport() {
        const el = this.$refs.importer;
        if (el) el.click();
      },
      handleImportChange(e) {
        const file = e && e.target && e.target.files ? e.target.files[0] : null;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const obj = JSON.parse(String(reader.result || '{}'));
            this.loadSession(obj);
          } catch (err) {
            console.error('Invalid session JSON', err);
            alert('Invalid session JSON.');
          } finally {
            // reset input so same file can be chosen again
            e.target.value = '';
          }
        };
        reader.readAsText(file);
      },
      loadSession(obj) {
        if (!obj || typeof obj !== 'object') return;
        const bpm = Number(obj.bpm);
        if (Number.isFinite(bpm)) this.bpm = bpm;
        const root = Number(obj.songKeyRoot);
        if (Number.isFinite(root)) this.songKeyRoot = root;
        const mode =
          obj.songKeyMode === 'minor' ? 'minor' : obj.songKeyMode === 'major' ? 'major' : null;
        if (mode) this.songKeyMode = mode;
        const tracks = Array.isArray(obj.tracks) ? obj.tracks : [];
        const revived = tracks.map((t, idx) => {
          const s = this.sanitizedTrack(t);
          const nt = {
            ...s,
            synthEngine: new SimpleSynth(),
            activeNotes: {},
            heldNotes: new Set(),
          };
          // ensure id uniqueness
          if (!nt.id) nt.id = makeId();
          // optional: reset seq timers by virtue of new engine
          return nt;
        });
        if (revived.length) {
          this.tracks = revived;
          const sel =
            obj.selectedId && revived.find((t) => t.id === obj.selectedId)
              ? obj.selectedId
              : revived[0].id;
          this.selectedId = sel;
        }
      },
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
          const accent = beatIdx % bpb === 0;
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
