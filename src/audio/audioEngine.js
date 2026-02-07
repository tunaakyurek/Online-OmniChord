const ROOT_TO_MIDI = {
  C: 60,
  "C#": 61,
  D: 62,
  "D#": 63,
  E: 64,
  F: 65,
  "F#": 66,
  G: 67,
  "G#": 68,
  A: 69,
  "A#": 70,
  B: 71
};

const FLAT_TO_SHARP = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#"
};

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function normalizeRoot(root) {
  return FLAT_TO_SHARP[root] ?? root;
}

function getChordIntervals(quality) {
  if (quality === "min") return [0, 3, 7];
  if (quality === "7") return [0, 4, 7, 10];
  return [0, 4, 7];
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.chordGain = null;
    this.harpGain = null;
    this.activeChord = null;
    this.chordOscillators = [];
  }

  async enable() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);

      this.chordGain = this.ctx.createGain();
      this.chordGain.gain.value = 0.7;
      this.chordGain.connect(this.master);

      this.harpGain = this.ctx.createGain();
      this.harpGain.gain.value = 0.65;
      this.harpGain.connect(this.master);
    }
    if (this.ctx.state !== "running") {
      await this.ctx.resume();
    }
  }

  isReady() {
    return this.ctx && this.ctx.state === "running";
  }

  getChordFrequencies(root, quality) {
    const normalized = normalizeRoot(root);
    const rootMidi = ROOT_TO_MIDI[normalized];
    const intervals = getChordIntervals(quality);
    return intervals.map((interval) => midiToFrequency(rootMidi + interval));
  }

  stopChord() {
    for (const osc of this.chordOscillators) {
      try {
        osc.stop();
      } catch (error) {
        // Oscillator already stopped.
      }
    }
    this.chordOscillators = [];
    this.activeChord = null;
  }

  playChord(root, quality) {
    if (!this.ctx) return;
    this.stopChord();
    const frequencies = this.getChordFrequencies(root, quality);
    const now = this.ctx.currentTime;
    this.chordOscillators = frequencies.map((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.value = 0;
      osc.connect(gain).connect(this.chordGain);
      osc.start();
      gain.gain.linearRampToValueAtTime(0.45, now + 0.02);
      return osc;
    });
    this.activeChord = { root, quality };
  }

  playHarpFromChord(stringIndex) {
    if (!this.ctx || !this.activeChord) return;
    const chordPitches = this.getChordFrequencies(
      this.activeChord.root,
      this.activeChord.quality
    );
    const basePitch = chordPitches[stringIndex % chordPitches.length];
    const octaveOffset = Math.floor(stringIndex / chordPitches.length);
    const freq = basePitch * Math.pow(2, octaveOffset);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.value = 0;
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain).connect(this.harpGain);
    osc.start();
    gain.gain.linearRampToValueAtTime(0.6, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.stop(now + 0.32);
  }

  stopAll() {
    this.stopChord();
  }
}

export function normalizeChordKey(key) {
  const [rootRaw, qualityRaw] = key.split(":");
  const root = normalizeRoot(rootRaw);
  const quality = qualityRaw?.toLowerCase() ?? "maj";
  return `${root}:${quality}`;
}
