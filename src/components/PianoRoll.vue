<template>
  <div class="piano-container compact">
    <svg class="piano" :width="pianoWidth" :height="piano.H + 2" aria-label="Piano roll">
      <rect
        v-for="k in whiteKeys"
        :key="'w' + k.m"
        class="white"
        rx="3"
        :x="k.x"
        y="1"
        :width="piano.W"
        :height="piano.H"
        :class="{ active: isActive(k.m) }"
        @mousedown="down(k.m)"
        @mouseup="up(k.m)"
        @mouseleave="up(k.m)"
      />
      <rect
        v-for="k in blackKeys"
        :key="'b' + k.m"
        class="black"
        rx="3"
        :x="k.x"
        y="1"
        :width="piano.BW"
        :height="piano.BH"
        :class="{ active: isActive(k.m) }"
        @mousedown="down(k.m)"
        @mouseup="up(k.m)"
        @mouseleave="up(k.m)"
      />
      <line
        v-for="x in octaveLines"
        :key="'l' + x"
        class="octave-line"
        :x1="x"
        :x2="x"
        y1="1"
        :y2="piano.H + 1"
      />
    </svg>
  </div>
</template>

<script>
  import { isBlack } from '../lib/music';

  export default {
    name: 'PianoRoll',
    props: {
      track: { type: Object, required: true },
      piano: {
        type: Object,
        default: () => ({ start: 36, end: 96, W: 24, H: 130, BW: 14, BH: 78 }),
      },
    },
    computed: {
      whiteKeys() {
        const out = [];
        let wIdx = 0;
        for (let m = this.piano.start; m <= this.piano.end; m++) {
          if (!isBlack(m)) {
            const x = wIdx * this.piano.W + 1;
            out.push({ m, x });
            wIdx++;
          }
        }
        return out;
      },
      blackKeys() {
        const out = [];
        let wIdx = 0;
        for (let m = this.piano.start; m <= this.piano.end; m++) {
          if (!isBlack(m)) {
            wIdx++;
          } else {
            const x = (wIdx - 1) * this.piano.W + 1 + (this.piano.W - this.piano.BW / 2);
            out.push({ m, x });
          }
        }
        return out;
      },
      pianoWidth() {
        return this.whiteKeys.length * this.piano.W + 2;
      },
      octaveLines() {
        const xs = [];
        let w = 0;
        for (let m = this.piano.start; m <= this.piano.end; m++) {
          if (!isBlack(m)) {
            if (m % 12 === 0) xs.push(w * this.piano.W + 1);
            w++;
          }
        }
        return xs;
      },
    },
    methods: {
      isActive(m) {
        return !!this.track.activeNotes[m];
      },
      down(m) {
        const vel = this.track.velocity;
        this.track.synthEngine.noteOn(m, vel);
        this.track.heldNotes.add(m);
        this.$set ? this.$set(this.track.activeNotes, m, true) : (this.track.activeNotes[m] = true);
      },
      up(m) {
        if (!this.track.heldNotes.has(m)) return;
        this.track.synthEngine.noteOff(m);
        this.track.heldNotes.delete(m);
        delete this.track.activeNotes[m];
      },
      upAll() {
        for (const n of Array.from(this.track.heldNotes)) {
          this.track.synthEngine.noteOff(n, 50);
          this.track.heldNotes.delete(n);
          delete this.track.activeNotes[n];
        }
      },
    },
    mounted() {
      window.addEventListener('mouseup', this.upAll);
    },
    beforeUnmount() {
      window.removeEventListener('mouseup', this.upAll);
    },
  };
</script>

<style scoped>
  .piano-container.compact {
    overflow-x: auto;
  }
  .piano {
    display: block;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #fff;
  }
  .white {
    fill: #fff;
    stroke: #ddd;
    stroke-width: 1;
  }
  .white.active {
    fill: #dfe7ff;
  }
  .black {
    fill: #222;
  }
  .black.active {
    fill: #4b6bff;
  }
  .octave-line {
    stroke: #eaeaea;
    stroke-width: 1;
  }
</style>
