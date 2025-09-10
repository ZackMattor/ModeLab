<template>
  <div v-if="selectedElement" class="segment-box" :class="{ inline: inline }">
    <div class="header">Segment</div>
    <div class="controls">
      <select v-model.number="selectedElement.degree" title="Roman‑numeral degree">
        <option v-for="opt in degreeOptions" :key="opt.degree" :value="opt.degree">
          {{ opt.label }}
        </option>
      </select>
      <input type="number" min="0" max="8" v-model.number="selectedElement.octave" title="Octave" />
      <select v-model="selectedElement.quality" title="Quality">
        <option v-for="key in sortedQualityKeys(selectedElement.degree)" :key="key" :value="key">
          {{ CHORD_QUALITIES[key].name }}
        </option>
      </select>
      <select v-model.number="selectedElement.inversion" title="Inversion">
        <option v-for="i in inversionCount(selectedElement.quality)" :key="i - 1" :value="i - 1">
          {{ i - 1 }}
        </option>
      </select>
      <select multiple v-model="selectedElement.extensions" title="Extensions">
        <option v-for="(semi, key) in EXTENSIONS" :key="key" :value="key">{{ key }}</option>
      </select>
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
  import { CHORD_QUALITIES, EXTENSIONS, scaleDegreeSemitones } from '../lib/music';

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
        // Simple RN labels I–VII based on scale degrees for current mode
        const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
        const semis = scaleDegreeSemitones(this.songKeyMode);
        return semis.map((_, i) => ({ degree: i, label: roman[i % 7] }));
      },
    },
    methods: {
      inversionCount(qualityKey) {
        return CHORD_QUALITIES[qualityKey]?.intervals.length || 1;
      },
      sortedQualityKeys(degreeIdx) {
        // Neutral alphabetical sorting of quality names, keeping it simple
        return Object.keys(CHORD_QUALITIES).sort((a, b) =>
          CHORD_QUALITIES[a].name.localeCompare(CHORD_QUALITIES[b].name)
        );
      },
      removeSelectedElement() {
        const id = this.track.selectedElementId;
        if (!id) return;
        const i = this.track.elements.findIndex((e) => e.id === id);
        if (i !== -1) this.track.elements.splice(i, 1);
        this.track.selectedElementId = null;
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
