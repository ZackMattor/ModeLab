<template>
  <div class="track-controls compact">
    <chord-selector
      :track="track"
      :song-key-root="songKeyRoot"
      :song-key-mode="songKeyMode"
      :bpm="bpm"
      @insert="handleInsertChord"
    />
    <synth-controls :track="track" />
    <div class="toolbar">
      <div class="group">
        <label>Play</label>
        <button class="secondary" @click="stopAll" title="Stop">■</button>
      </div>
    </div>

    <track-sequencer ref="seq" :track="track" :song-key-root="songKeyRoot" :song-key-mode="songKeyMode" :bpm="bpm" @tick="$emit('seq-tick', $event)" @state="$emit('seq-state', $event)" />
  </div>
</template>

<script>
import TrackSequencer from './TrackSequencer.vue';
import ChordSelector from './ChordSelector.vue';
import SynthControls from './SynthControls.vue';

export default {
  name: 'TrackControls',
  components: { TrackSequencer, ChordSelector, SynthControls },
  emits: ['seq-tick', 'seq-state'],
  props: {
    track: { type: Object, required: true },
    songKeyRoot: { type: Number, default: 0 },
    songKeyMode: { type: String, default: 'major' },
    bpm: { type: Number, default: 120 },
  },
  data() { return {}; },
  computed: {},
  methods: {
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
  },
  mounted() {},
};
</script>

<style scoped>
.track-controls.compact { display: flex; flex-direction: column; gap: 8px; }
.toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.group { display: inline-flex; align-items: center; gap: 6px; }
.group > label { color: var(--muted); font-size: 11px; margin-right: 2px; }
.buttons {
  display: flex;
  gap: 8px;
}
.chk { display: inline-flex; align-items: center; gap: 4px; }
select, input[type='number'] { min-width: 70px; }
select[multiple] { min-width: 90px; height: 26px; }
</style>
