<template>
  <div v-if="selectedElement" class="segment-box" :class="{ inline: inline }">
    <div class="header">Segment</div>
    <div class="controls">
      <select
        v-model.number="selectedElement.degree"
        title="Roman‑numeral degree"
        @change="alignQualityToKey"
      >
        <option v-for="opt in degreeOptions" :key="opt.degree" :value="opt.degree">
          {{ opt.label }}
        </option>
      </select>
      <input type="number" min="0" max="8" v-model.number="selectedElement.octave" title="Octave" />
      <!-- Base triad -->
      <select v-model="selectedElement.baseQuality" title="Base triad">
        <option value="maj">Major</option>
        <option value="min">Minor</option>
        <option value="dim">Diminished</option>
        <option value="aug">Augmented</option>
        <option value="sus2">Sus2</option>
        <option value="sus4">Sus4</option>
      </select>
      <!-- Seventh -->
      <select v-model="selectedElement.seventh" title="7th">
        <option value="none">No 7th</option>
        <option value="b7">b7 (dominant/min7)</option>
        <option value="maj7">maj7</option>
        <option value="dim7">dim7</option>
        <option value="half-dim">m7b5 (half-dim)</option>
      </select>
      <!-- Add 6 -->
      <label class="chk" title="Add 6">
        <input type="checkbox" v-model="selectedElement.add6" /> 6
      </label>
      <select v-model.number="selectedElement.inversion" title="Inversion">
        <option v-for="i in inversionCount(selectedElement.quality)" :key="i - 1" :value="i - 1">
          {{ i - 1 }}
        </option>
      </select>
      <!-- Tensions and alterations -->
      <label class="ctl" title="Tensions"
        >Tens
        <select multiple v-model="selectedElement.extensions">
          <option value="9">9</option>
          <option value="11">11</option>
          <option value="13">13</option>
        </select>
      </label>
      <label class="ctl" title="Alterations"
        >Alt
        <select multiple v-model="selectedElement.alterations">
          <option value="b9">b9</option>
          <option value="#9">#9</option>
          <option value="#11">#11</option>
          <option value="b13">b13</option>
        </select>
      </label>
      <label class="ctl" title="Velocity">
        Vel <input type="range" min="1" max="127" v-model.number="selectedElement.velocity" />
      </label>
      <label class="chk" title="Arpeggiator on/off">
        <input type="checkbox" v-model="selectedElement.arp" /> Arp
      </label>
      <label class="ctl" v-if="selectedElement.arp" title="Arp length (beats)">
        Arp Len
        <select v-model.number="selectedElement.arpLenBeats">
          <option v-for="o in lenBeatOptions" :key="'arp' + o.label" :value="o.beats">
            {{ o.label }}
          </option>
        </select>
      </label>
      <button class="small danger" @click="removeSelectedElement" title="Delete segment">
        Delete
      </button>
    </div>
  </div>
  <div v-else class="segment-box placeholder" :class="{ inline: inline }">
    <div class="header">Segment</div>
    <div class="muted">No segment selected</div>
  </div>
</template>

<script>
  import {
    CHORD_QUALITIES,
    EXTENSIONS,
    scaleDegreeSemitones,
    romanForDegree,
    diatonicTriadQuality,
  } from '../lib/music';

  export default {
    name: 'SegmentEditor',
    props: {
      track: { type: Object, required: true },
      songKeyRoot: { type: Number, default: 0 },
      songKeyMode: { type: String, default: 'major' },
      inline: { type: Boolean, default: false },
    },
    data() {
      return { CHORD_QUALITIES, EXTENSIONS };
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
      degreeOptions() {
        const semis = scaleDegreeSemitones(this.songKeyMode);
        return semis.map((_, i) => ({ degree: i, label: romanForDegree(i, this.songKeyMode) }));
      },
    },
    methods: {
      inversionCount() {
        return 4;
      },
      alignQualityToKey() {
        if (!this.selectedElement) return;
        const deg = Number.isFinite(this.selectedElement.degree) ? this.selectedElement.degree : 0;
        this.selectedElement.baseQuality = diatonicTriadQuality(deg, this.songKeyMode);
        if (!this.selectedElement.seventh) this.selectedElement.seventh = 'none';
      },
      removeSelectedElement() {
        const id = this.track.selectedElementId;
        if (!id) return;
        const i = this.track.elements.findIndex((e) => e.id === id);
        if (i !== -1) this.track.elements.splice(i, 1);
        this.track.selectedElementId = null;
      },
    },
    watch: {
      'selectedElement.seventh'(val) {
        if (!this.selectedElement) return;
        if (val === 'half-dim' || val === 'dim7') {
          this.selectedElement.baseQuality = 'dim';
        }
      },
    },
  };
</script>

<style scoped>
  .segment-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
  }
  .segment-box.inline {
    position: sticky;
    top: 0;
    z-index: 5;
    backdrop-filter: blur(4px);
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
  .muted {
    color: var(--muted);
    font-size: 12px;
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
