<template>
  <div class="synth-box">
    <div class="header">Synth</div>
    <div class="controls">
      <select v-model="track.synth.wave" @input="applySynth" :title="'Waveform'">
        <option value="sine">Sine</option>
        <option value="triangle">Triangle</option>
        <option value="sawtooth">Saw</option>
        <option value="square">Square</option>
      </select>
      <label class="ctl" title="Master volume"
        >Vol
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          v-model.number="track.synth.master"
          @input="applySynth"
      /></label>
      <label class="ctl" title="Filter cutoff (Hz)"
        >Cutoff
        <input
          type="range"
          min="100"
          max="12000"
          step="10"
          v-model.number="track.synth.cutoff"
          @input="applySynth"
      /></label>
      <button class="secondary small" @click="advanced = !advanced" :title="'Toggle advanced synth options'">
        Adv
      </button>
    </div>

    <div v-show="advanced" class="advanced grid two">
      <div class="field">
        <label
          >Resonance (Q): <span>{{ track.synth.resonance.toFixed(1) }}</span></label
        >
        <input title="Filter resonance (Q)"
          type="range"
          min="0.1"
          max="20"
          step="0.1"
          v-model.number="track.synth.resonance"
          @input="applySynth"
        />
      </div>
      <div class="field">
        <label
          >Attack: <span>{{ track.synth.attackMs }} ms</span></label
        >
        <input title="Attack time (ms)"
          type="range"
          min="0"
          max="2000"
          step="5"
          v-model.number="track.synth.attackMs"
          @input="applySynth"
        />
      </div>
      <div class="field">
        <label
          >Decay: <span>{{ track.synth.decayMs }} ms</span></label
        >
        <input title="Decay time (ms)"
          type="range"
          min="0"
          max="3000"
          step="10"
          v-model.number="track.synth.decayMs"
          @input="applySynth"
        />
      </div>
      <div class="field">
        <label
          >Sustain: <span>{{ Math.round(track.synth.sustain * 100) }}%</span></label
        >
        <input title="Sustain level"
          type="range"
          min="0"
          max="1"
          step="0.01"
          v-model.number="track.synth.sustain"
          @input="applySynth"
        />
      </div>
      <div class="field">
        <label
          >Release: <span>{{ track.synth.releaseMs }} ms</span></label
        >
        <input title="Release time (ms)"
          type="range"
          min="10"
          max="5000"
          step="10"
          v-model.number="track.synth.releaseMs"
          @input="applySynth"
        />
      </div>
      <div class="field">
        <label
          >Detune: <span>{{ track.synth.detune }} c</span></label
        >
        <input title="Detune (cents)"
          type="range"
          min="-100"
          max="100"
          step="1"
          v-model.number="track.synth.detune"
          @input="applySynth"
        />
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'SynthControls',
    props: { track: { type: Object, required: true } },
    data() {
      return { advanced: false };
    },
    methods: {
      applySynth() {
        if (!this.track?.synthEngine) return;
        Object.assign(this.track.synthEngine.settings, this.track.synth);
        this.track.synthEngine.applyLiveSettings?.();
      },
    },
    mounted() {
      this.applySynth();
    },
  };
</script>

<style scoped>
  .synth-box {
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
</style>
