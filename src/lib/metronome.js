let CTX = null;

function getCtx() {
  if (!CTX) CTX = new (window.AudioContext || window.webkitAudioContext)();
  return CTX;
}

export class Metronome {
  click(accent = false) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = accent ? 1600 : 1100;
    const vol = accent ? 0.25 : 0.18;
    const now = ctx.currentTime;
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
    setTimeout(() => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (e) {}
    }, 120);
  }
}
