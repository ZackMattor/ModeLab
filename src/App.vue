<template>
  <div>
    <header>
      <h1>Chord Explorer</h1>
      <p class="subtitle">Play and explore chords via Web MIDI or built‑in synth.</p>
    </header>

    <main>
      <section class="row">
        <div class="card">
          <h2>Output</h2>
          <div class="field">
            <label for="midi-output">MIDI Output</label>
            <select id="midi-output" v-model="midi.selectedOutputId">
              <option :value="''">{{ midi.outputs.length ? '(none)' : '(no outputs)' }}</option>
              <option v-for="o in midi.outputs" :key="o.id" :value="o.id">
                {{ o.name }}<span v-if="o.manufacturer"> — {{ o.manufacturer }}</span>
              </option>
            </select>
          </div>
          <div class="field checkbox">
            <label>
              <input type="checkbox" v-model="useWebAudio" />
              Use built-in WebAudio synth (fallback)
            </label>
          </div>
          <div class="field">
            <label for="midi-channel">MIDI Channel</label>
            <input type="number" id="midi-channel" min="1" max="16" v-model.number="channel" />
          </div>
          <div class="status" :class="{ ok: midi.ready, warn: !midi.ready }">{{ midi.status }}</div>
        </div>

        <div class="card">
          <h2>Synth</h2>
          <div class="grid two">
            <div class="field">
              <label for="wave">Waveform</label>
              <select id="wave" v-model="synth.wave" @input="applySynth">
                <option value="sine">Sine</option>
                <option value="triangle">Triangle</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="square">Square</option>
              </select>
            </div>
            <div class="field">
              <label for="volume"
                >Volume: <span>{{ Math.round(synth.master * 100) }}%</span></label
              >
              <input
                type="range"
                id="volume"
                min="0"
                max="1"
                step="0.01"
                v-model.number="synth.master"
                @input="applySynth"
              />
            </div>
            <div class="field">
              <label for="cutoff"
                >Filter Cutoff: <span>{{ synth.cutoff }} Hz</span></label
              >
              <input
                type="range"
                id="cutoff"
                min="100"
                max="12000"
                step="10"
                v-model.number="synth.cutoff"
                @input="applySynth"
              />
            </div>
            <div class="field">
              <label for="resonance"
                >Resonance (Q): <span>{{ synth.resonance.toFixed(1) }}</span></label
              >
              <input
                type="range"
                id="resonance"
                min="0.1"
                max="20"
                step="0.1"
                v-model.number="synth.resonance"
                @input="applySynth"
              />
            </div>
            <div class="field">
              <label for="attack"
                >Attack: <span>{{ synth.attackMs }} ms</span></label
              >
              <input
                type="range"
                id="attack"
                min="0"
                max="2000"
                step="5"
                v-model.number="synth.attackMs"
                @input="applySynth"
              />
            </div>
            <div class="field">
              <label for="decay"
                >Decay: <span>{{ synth.decayMs }} ms</span></label
              >
              <input
                type="range"
                id="decay"
                min="0"
                max="3000"
                step="10"
                v-model.number="synth.decayMs"
                @input="applySynth"
              />
            </div>
            <div class="field">
              <label for="sustain"
                >Sustain: <span>{{ Math.round(synth.sustain * 100) }}%</span></label
              >
              <input
                type="range"
                id="sustain"
                min="0"
                max="1"
                step="0.01"
                v-model.number="synth.sustain"
                @input="applySynth"
              />
            </div>
            <div class="field">
              <label for="release"
                >Release: <span>{{ synth.releaseMs }} ms</span></label
              >
              <input
                type="range"
                id="release"
                min="10"
                max="5000"
                step="10"
                v-model.number="synth.releaseMs"
                @input="applySynth"
              />
            </div>
            <div class="field">
              <label for="detune"
                >Detune: <span>{{ synth.detune }} c</span></label
              >
              <input
                type="range"
                id="detune"
                min="-100"
                max="100"
                step="1"
                v-model.number="synth.detune"
                @input="applySynth"
              />
            </div>
          </div>
        </div>

        <div class="card">
          <h2>Chord</h2>
          <div class="grid two">
            <div class="field">
              <label for="root">Root</label>
              <select id="root" v-model.number="root">
                <option v-for="(n, i) in NOTE_NAMES" :key="i" :value="i">{{ n }}</option>
              </select>
            </div>
            <div class="field">
              <label for="octave">Octave</label>
              <input type="number" id="octave" min="0" max="8" v-model.number="octave" />
            </div>
            <div class="field">
              <label for="quality">Quality</label>
              <select id="quality" v-model="quality" @change="resetInversion">
                <option v-for="(q, key) in CHORD_QUALITIES" :key="key" :value="key">
                  {{ q.name }}
                </option>
              </select>
            </div>
            <div class="field">
              <label for="inversion">Inversion</label>
              <select id="inversion" v-model.number="inversion">
                <option v-for="i in inversionCount" :key="i - 1" :value="i - 1">
                  {{ i === 1 ? 'Root position' : i - 1 + ' inversion' }}
                </option>
              </select>
            </div>
          </div>
          <div class="field">
            <label for="extensions">Extensions (optional)</label>
            <select id="extensions" multiple v-model="extensions">
              <option v-for="(semi, key) in EXTENSIONS" :key="key" :value="key">{{ key }}</option>
            </select>
            <small>Hold Cmd/Ctrl to select multiple.</small>
          </div>
        </div>

        <div class="card">
          <h2>Playback</h2>
          <div class="grid two">
            <div class="field">
              <label for="velocity"
                >Velocity: <span>{{ velocity }}</span></label
              >
              <input type="range" id="velocity" min="1" max="127" v-model.number="velocity" />
            </div>
            <div class="field">
              <label for="duration"
                >Duration: <span>{{ duration }} ms</span></label
              >
              <input
                type="range"
                id="duration"
                min="50"
                max="4000"
                step="10"
                v-model.number="duration"
              />
            </div>
            <div class="field">
              <label for="arp"
                >Arpeggiate: <span>{{ arpGap }} ms</span></label
              >
              <input type="range" id="arp" min="0" max="400" step="10" v-model.number="arpGap" />
            </div>
            <div class="field checkbox">
              <label> <input type="checkbox" v-model="hold" /> Hold (until Stop) </label>
            </div>
          </div>

          <div class="buttons">
            <button @click="playChord">Play</button>
            <button class="secondary" @click="stopAll">Stop</button>
          </div>

          <div class="notes-display">{{ notesDisplay }}</div>
        </div>
      </section>

      <section class="card">
        <h2>Piano Roll</h2>
        <div class="piano-container">
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
              @mousedown="keyDown(k.m)"
              @mouseup="keyUp(k.m)"
              @mouseleave="keyUp(k.m)"
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
              @mousedown="keyDown(k.m)"
              @mouseup="keyUp(k.m)"
              @mouseleave="keyUp(k.m)"
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
      </section>

      <section class="card">
        <h2>Tips</h2>
        <ul>
          <li>Click Play to send MIDI and synth notes.</li>
          <li>Change inversion to rotate chord tones upward.</li>
          <li>
            If no MIDI outputs appear, your browser/device may not support Web MIDI, or you blocked
            permission.
          </li>
        </ul>
      </section>
    </main>

    <footer>
      <span>Built for quick chord exploration.</span>
    </footer>
  </div>
</template>

<script>
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const CHORD_QUALITIES = {
    maj: { name: 'Major', intervals: [0, 4, 7] },
    min: { name: 'Minor', intervals: [0, 3, 7] },
    dim: { name: 'Diminished', intervals: [0, 3, 6] },
    aug: { name: 'Augmented', intervals: [0, 4, 8] },
    sus2: { name: 'Sus2', intervals: [0, 2, 7] },
    sus4: { name: 'Sus4', intervals: [0, 5, 7] },
    maj6: { name: 'Major 6', intervals: [0, 4, 7, 9] },
    m6: { name: 'Minor 6', intervals: [0, 3, 7, 9] },
    7: { name: 'Dominant 7', intervals: [0, 4, 7, 10] },
    maj7: { name: 'Major 7', intervals: [0, 4, 7, 11] },
    m7: { name: 'Minor 7', intervals: [0, 3, 7, 10] },
    mMaj7: { name: 'Minor Major 7', intervals: [0, 3, 7, 11] },
    dim7: { name: 'Diminished 7', intervals: [0, 3, 6, 9] },
    m7b5: { name: 'Half-diminished (m7b5)', intervals: [0, 3, 6, 10] },
  };
  const EXTENSIONS = { 9: 14, 11: 17, 13: 21, b9: 13, '#9': 15, '#11': 18, b13: 20 };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const noteName = (m) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
  const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);

  class SimpleSynth {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.active = new Map();
      this.settings = {
        wave: 'sawtooth',
        master: 0.3,
        cutoff: 8000,
        resonance: 0.7,
        attackMs: 10,
        decayMs: 180,
        sustain: 0.8,
        releaseMs: 200,
        detune: 0,
      };
    }
    ensure() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.settings.master;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    noteOn(note, velocity = 96) {
      this.ensure();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = this.settings.cutoff;
      filter.Q.value = this.settings.resonance;
      osc.type = this.settings.wave;
      osc.frequency.value = midiToFreq(note);
      osc.detune.value = this.settings.detune;
      const v = clamp(velocity / 127, 0, 1);
      const now = ctx.currentTime;
      const a = Math.max(0, this.settings.attackMs) / 1000;
      const d = Math.max(0, this.settings.decayMs) / 1000;
      const s = clamp(this.settings.sustain, 0, 1);
      const peak = v;
      const sustain = v * s;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peak, now + a);
      gain.gain.linearRampToValueAtTime(sustain, now + a + d);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      this.active.set(note, { osc, gain, filter, vel: v });
    }
    noteOff(note, releaseMs) {
      const slot = this.active.get(note);
      if (!slot) return;
      const { osc, gain } = slot;
      const ctx = this.ctx;
      const rel = ((releaseMs ?? this.settings.releaseMs) || 0) / 1000;
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + rel);
      osc.stop(now + rel + 0.01);
      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (e) {
          /* noop */
        }
        this.active.delete(note);
      }, rel * 1000 + 80);
    }
    allOff() {
      for (const n of Array.from(this.active.keys())) this.noteOff(n, 50);
    }
    applyLiveSettings() {
      if (!this.ctx) return;
      if (this.masterGain) this.masterGain.gain.value = this.settings.master;
      const now = this.ctx.currentTime;
      for (const { osc, gain, filter, vel } of this.active.values()) {
        try {
          osc.type = this.settings.wave;
        } catch (e) {
          /* noop */
        }
        osc.detune.setTargetAtTime(this.settings.detune, now, 0.01);
        if (filter) {
          filter.frequency.setTargetAtTime(this.settings.cutoff, now, 0.01);
          filter.Q.setTargetAtTime(this.settings.resonance, now, 0.01);
        }
        const sustain = vel * clamp(this.settings.sustain, 0, 1);
        try {
          gain.gain.setTargetAtTime(sustain, now, 0.05);
        } catch (e) {
          /* noop */
        }
      }
    }
  }

  export default {
    name: 'App',
    data() {
      return {
        NOTE_NAMES,
        CHORD_QUALITIES,
        EXTENSIONS,
        midi: {
          access: null,
          outputs: [],
          selectedOutputId: '',
          ready: false,
          status: 'Requesting MIDI access…',
        },
        channel: 1,
        useWebAudio: true,
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
        root: 0,
        octave: 4,
        quality: 'maj',
        inversion: 0,
        extensions: [],
        velocity: 96,
        duration: 800,
        arpGap: 0,
        hold: false,
        piano: { start: 36, end: 96, W: 24, H: 130, BW: 14, BH: 78 },
        activeNotes: {},
        heldNotes: new Set(),
      };
    },
    computed: {
      inversionCount() {
        return this.CHORD_QUALITIES[this.quality]?.intervals.length || 1;
      },
      chordNotes() {
        const rootMidi = (this.octave + 1) * 12 + this.root;
        const base = (this.CHORD_QUALITIES[this.quality]?.intervals || []).map(
          (semi) => rootMidi + semi
        );
        const ext = this.extensions.map((k) => rootMidi + (this.EXTENSIONS[k] || 0));
        const notes = base.concat(ext).sort((a, b) => a - b);
        const inv = Math.max(0, Math.min(this.inversion, Math.max(0, notes.length - 1)));
        for (let i = 0; i < inv; i++) {
          const n = notes.shift();
          notes.push(n + 12);
        }
        return notes;
      },
      notesDisplay() {
        return this.chordNotes.length
          ? this.chordNotes.map((n) => `${noteName(n)} (${n})`).join('  ·  ')
          : '–';
      },
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
            if (m % 12 === 0) {
              xs.push(w * this.piano.W + 1);
            }
            w++;
          }
        }
        return xs;
      },
    },
    methods: {
      applySynth() {
        Object.assign(this.synthEngine.settings, this.synth);
        this.synthEngine.applyLiveSettings();
      },
      resetInversion() {
        this.inversion = 0;
      },
      refreshOutputs() {
        this.midi.outputs = [];
        if (this.midi.access) {
          for (const o of this.midi.access.outputs.values()) {
            this.midi.outputs.push(o);
          }
        }
        this.midi.ready = !!this.midi.access;
        this.midi.status = this.midi.ready
          ? 'MIDI ready. Choose an output.'
          : 'Web MIDI unavailable.';
      },
      async initMIDI() {
        if (!navigator.requestMIDIAccess) {
          this.midi.ready = false;
          this.midi.status = 'Web MIDI not supported by this browser.';
          this.refreshOutputs();
          return;
        }
        try {
          const access = await navigator.requestMIDIAccess({ sysex: false });
          this.midi.access = access;
          access.onstatechange = this.refreshOutputs;
          this.refreshOutputs();
        } catch (e) {
          console.warn('MIDI error', e);
          this.midi.ready = false;
          this.midi.status = 'MIDI access denied or failed.';
          this.refreshOutputs();
        }
      },
      currentOutput() {
        const id = this.midi.selectedOutputId;
        if (!id || !this.midi.access) return null;
        return this.midi.access.outputs.get(id) || null;
      },
      sendMidi(msg) {
        const out = this.currentOutput();
        if (out) out.send(msg);
      },
      noteOnMIDI(note, vel, ch) {
        const ch0 = clamp((ch || 1) - 1, 0, 15);
        this.sendMidi([0x90 + ch0, note & 0x7f, clamp(vel || 0, 0, 127)]);
      },
      noteOffMIDI(note, ch) {
        const ch0 = clamp((ch || 1) - 1, 0, 15);
        this.sendMidi([0x80 + ch0, note & 0x7f, 0]);
      },
      playChord() {
        const notes = this.chordNotes.slice();
        if (!notes.length) return;
        const vel = this.velocity;
        const ch = this.channel;
        const useSynth = this.useWebAudio;
        const hold = this.hold;
        const gap = this.arpGap;
        const playOne = (n, at) => {
          setTimeout(() => {
            this.noteOnMIDI(n, vel, ch);
            if (useSynth) this.synthEngine.noteOn(n, vel);
            this.heldNotes.add(n);
            this.$set ? this.$set(this.activeNotes, n, true) : (this.activeNotes[n] = true);
          }, at);
          if (!hold) {
            setTimeout(() => {
              this.noteOffMIDI(n, ch);
              this.synthEngine.noteOff(n);
              this.heldNotes.delete(n);
              delete this.activeNotes[n];
            }, at + this.duration);
          }
        };
        if (gap > 0) {
          notes.forEach((n, i) => playOne(n, i * gap));
        } else {
          notes.forEach((n) => playOne(n, 0));
        }
      },
      stopAll() {
        const ch = this.channel;
        for (const n of Array.from(this.heldNotes)) {
          this.noteOffMIDI(n, ch);
          this.synthEngine.noteOff(n, 50);
          delete this.activeNotes[n];
        }
        this.heldNotes.clear();
      },
      keyDown(m) {
        const vel = this.velocity;
        const ch = this.channel;
        this.noteOnMIDI(m, vel, ch);
        if (this.useWebAudio) this.synthEngine.noteOn(m, vel);
        this.heldNotes.add(m);
        this.activeNotes[m] = true;
      },
      keyUp(m) {
        if (!this.heldNotes.has(m)) return;
        const ch = this.channel;
        this.noteOffMIDI(m, ch);
        this.synthEngine.noteOff(m);
        this.heldNotes.delete(m);
        delete this.activeNotes[m];
      },
      isActive(m) {
        return !!this.activeNotes[m];
      },
    },
    mounted() {
      this.initMIDI();
      this.applySynth();
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
          e.preventDefault();
          this.playChord();
        }
        if (e.key === 'Escape') {
          this.stopAll();
        }
      });
    },
  };
</script>

<style scoped>
  /* keep scoped block minimal; main styles are global */
</style>
