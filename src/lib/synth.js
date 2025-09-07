import { clamp, midiToFreq } from './music';

let SHARED_AUDIO_CTX = null;

export class SimpleSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    // Map<midiNote, Voice[]> where Voice = { osc, gain, filter, vel }
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
    if (!SHARED_AUDIO_CTX) {
      SHARED_AUDIO_CTX = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!this.ctx) {
      this.ctx = SHARED_AUDIO_CTX;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.settings.master;
      this.masterGain.connect(this.ctx.destination);
    }
  }
  noteOn(note, velocity = 96) {
    this.ensure();
    // Ensure we don't leave prior voices hanging for the same note
    const existing = this.active.get(note);
    if (existing && existing.length) {
      this.noteOff(note, 0.02 * 1000);
    }
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
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
    const voices = this.active.get(note) || [];
    voices.push({ osc, gain, filter, vel: v });
    this.active.set(note, voices);
  }
  noteOff(note, releaseMs) {
    const voices = this.active.get(note);
    if (!voices || !voices.length) return;
    const ctx = this.ctx;
    const rel = ((releaseMs ?? this.settings.releaseMs) || 0) / 1000;
    const now = ctx.currentTime;
    for (const { osc, gain } of voices) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + rel);
        osc.stop(now + rel + 0.01);
      } catch (e) {
        /* noop */
      }
      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (e) {
          /* noop */
        }
      }, rel * 1000 + 80);
    }
    this.active.delete(note);
  }
  allOff() {
    for (const n of Array.from(this.active.keys())) this.noteOff(n, 50);
  }
  applyLiveSettings() {
    if (!this.ctx) return;
    if (this.masterGain) this.masterGain.gain.value = this.settings.master;
    const now = this.ctx.currentTime;
    for (const voices of this.active.values()) {
      for (const { osc, gain, filter, vel } of voices) {
        try {
          osc.type = this.settings.wave;
        } catch (e) {
          /* noop */
        }
        try {
          osc.detune.setTargetAtTime(this.settings.detune, now, 0.01);
        } catch (e) {}
        if (filter) {
          try { filter.frequency.setTargetAtTime(this.settings.cutoff, now, 0.01); } catch (e) {}
          try { filter.Q.setTargetAtTime(this.settings.resonance, now, 0.01); } catch (e) {}
        }
        const sustain = vel * Math.max(0, Math.min(1, this.settings.sustain));
        try {
          gain.gain.setTargetAtTime(sustain, now, 0.05);
        } catch (e) {
          /* noop */
        }
      }
    }
  }
}
