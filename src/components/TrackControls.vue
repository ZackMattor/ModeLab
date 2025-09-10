<template>
  <div class="track-controls compact">
    <div class="toolbar" style="justify-content: space-between">
      <div class="group">
        <button class="secondary" @click="showChordSettings = !showChordSettings">
          {{ showChordSettings ? 'Hide' : 'Show' }} Chord Settings
        </button>
      </div>
    </div>

    <track-sequencer
      ref="seq"
      :track="track"
      :song-key-root="songKeyRoot"
      :song-key-mode="songKeyMode"
      :bpm="bpm"
      @tick="$emit('seq-tick', $event)"
      @state="$emit('seq-state', $event)"
      @select-element="onSelectElement"
    />

    <chord-selector
      :track="track"
      :song-key-root="songKeyRoot"
      :song-key-mode="songKeyMode"
      :bpm="bpm"
      :collapsed="!showChordSettings"
      @insert="handleInsertChord"
      @insert-segment="handleInsertSegment"
    />
    <synth-controls :track="track" />
    <segment-editor :track="track" :song-key-root="songKeyRoot" :song-key-mode="songKeyMode" />
    <div class="toolbar">
      <div class="group">
        <label>Play</label>
        <button class="secondary" @click="stopAll" title="Stop">■</button>
      </div>
    </div>
  </div>
</template>

<script>
  import TrackSequencer from './TrackSequencer.vue';
  import ChordSelector from './ChordSelector.vue';
  import SynthControls from './SynthControls.vue';
  import SegmentEditor from './SegmentEditor.vue';
  import {
    CHORD_QUALITIES,
    EXTENSIONS,
    scaleDegreeSemitones,
    diatonicTriadQuality,
  } from '../lib/music';

  export default {
    name: 'TrackControls',
    components: { TrackSequencer, ChordSelector, SynthControls, SegmentEditor },
    emits: ['seq-tick', 'seq-state'],
    props: {
      track: { type: Object, required: true },
      songKeyRoot: { type: Number, default: 0 },
      songKeyMode: { type: String, default: 'major' },
      bpm: { type: Number, default: 120 },
    },
    data() {
      return { CHORD_QUALITIES, EXTENSIONS, showChordSettings: false };
    },
    computed: {
      selectedElement() {
        const id = this.track.selectedElementId;
        if (!id) return null;
        return this.track.elements.find((e) => e.id === id) || null;
      },

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
          const rn = this.romanForDegreeLocal(i);
          return { degree: i, rootPc, label: `${rn}` };
        });
      },
    },
    methods: {
      romanForDegreeLocal(i) {
        // Simple RN based on diatonic triad quality for label
        return diatonicTriadQuality ? ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i % 7] || '' : '';
      },
      inversionCount(qualityKey) {
        return CHORD_QUALITIES[qualityKey]?.intervals.length || 1;
      },
      sortedQualityKeys(degreeIdx) {
        const diatonic = diatonicTriadQuality(
          Number.isFinite(degreeIdx) ? degreeIdx : 0,
          this.songKeyMode
        );
        return Object.keys(CHORD_QUALITIES).sort((a, b) => {
          if (a === diatonic && b !== diatonic) return -1;
          if (b === diatonic && a !== diatonic) return 1;
          return CHORD_QUALITIES[a].name.localeCompare(CHORD_QUALITIES[b].name);
        });
      },
      stopAll() {
        // Stop any scheduled sequencer events and sounding notes
        if (this.$refs.seq && this.$refs.seq.stopSeq) this.$refs.seq.stopSeq();
        if (this.track.synthEngine && this.track.synthEngine.allOff)
          this.track.synthEngine.allOff();
        for (const n of Array.from(this.track.heldNotes)) {
          this.track.synthEngine.noteOff(n, 50);
          delete this.track.activeNotes[n];
        }
        this.track.heldNotes.clear();
      },
      handleInsertChord(payload) {
        if (!payload || !Array.isArray(payload.notes)) return;
        const tpb = Math.max(1, Number(this.track.seqTicksPerBeat || 4));
        const lenTicks = Math.max(1, Math.round((payload.lenBeats || 1) * tpb));
        const staggerTicks = Math.max(0, Math.round((payload.arpBeats || 0) * tpb));
        const vel = Math.max(1, Math.min(127, payload.vel || this.track.velocity || 96));
        if (this.$refs.seq && this.$refs.seq.insertNotes) {
          this.$refs.seq.insertNotes(payload.notes, { len: lenTicks, vel, staggerTicks });
        }
      },
      handleInsertSegment(payload) {
        if (!payload) return;
        const tpb = Math.max(1, Number(this.track.seqTicksPerBeat || 4));
        const lenTicks = Math.max(1, Math.round((payload.lenBeats || 1) * tpb));
        const endTick = this.track.elements.reduce(
          (m, el) =>
            Math.max(m, Number(el.start || 0) + Math.max(1, Math.round((el.lenBeats || 1) * tpb))),
          0
        );
        const start = Math.min(
          endTick,
          Math.max(0, this.track.seqBeatsPerBar * this.track.seqBars * tpb - 1)
        );
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        this.track.elements.push({
          id,
          start,
          lenBeats: Math.max(0.0625, Number(payload.lenBeats || 1)),
          degree: Number.isFinite(payload.degree) ? payload.degree : 0,
          octave: Number.isFinite(payload.octave) ? payload.octave : this.track.octave || 4,
          quality: payload.quality || this.track.quality || 'maj',
          inversion: Number.isFinite(payload.inversion) ? payload.inversion : 0,
          extensions: Array.isArray(payload.extensions) ? payload.extensions.slice(0, 8) : [],
          velocity: Math.max(
            1,
            Math.min(127, Number(payload.velocity || this.track.velocity || 96))
          ),
          arp: !!payload.arp,
          arpLenBeats: Number.isFinite(payload.arpLenBeats)
            ? Math.max(0.0625, payload.arpLenBeats)
            : 0.25,
          hold: !!payload.hold,
        });
        this.track.selectedElementId = id;
      },
      onSelectElement(id) {
        this.track.selectedElementId = id;
      },
      removeSelectedElement() {
        const id = this.track.selectedElementId;
        if (!id) return;
        const i = this.track.elements.findIndex((e) => e.id === id);
        if (i !== -1) this.track.elements.splice(i, 1);
        this.track.selectedElementId = null;
      },
    },
    mounted() {},
  };
</script>

<style scoped>
  .track-controls.compact {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .segment-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
  }
  .segment-box .header {
    font-weight: 600;
    font-size: 12px;
    color: var(--muted);
  }
  .segment-box .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .toolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  .group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .group > label {
    color: var(--muted);
    font-size: 11px;
    margin-right: 2px;
  }
  .buttons {
    display: flex;
    gap: 8px;
  }
  .chk {
    display: inline-flex;
    align-items: center;
    gap: 4px;
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
