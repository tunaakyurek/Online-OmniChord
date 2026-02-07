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

function triggerHarpVoice(ctx, destination, freq, options = {}) {
  const {
    velocity = 0.5,
    sustain = 0.25,
    brightness = 0.6,
    stereoPan = 0
  } = options;
  const now = ctx.currentTime;

  const oscMain = ctx.createOscillator();
  oscMain.type = "triangle";
  oscMain.frequency.setValueAtTime(freq, now);

  const oscShimmer = ctx.createOscillator();
  oscShimmer.type = "sine";
  oscShimmer.frequency.setValueAtTime(freq * 1.005, now);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(5.2, now);
  lfoGain.gain.setValueAtTime(freq * 0.003, now);
  lfo.connect(lfoGain).connect(oscShimmer.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  const cutoff = Math.min(9000, Math.max(900, freq * (3.5 + 5 * brightness)));
  filter.frequency.setValueAtTime(cutoff, now);
  filter.Q.setValueAtTime(0.4, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0, now);
  gain.gain.linearRampToValueAtTime(velocity, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + Math.max(0.1, sustain));

  const panNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (panNode) {
    panNode.pan.setValueAtTime(stereoPan, now);
  }

  oscMain.connect(filter);
  oscShimmer.connect(filter);
  filter.connect(gain);

  if (panNode) {
    gain.connect(panNode).connect(destination);
  } else {
    gain.connect(destination);
  }

  oscMain.start(now);
  oscShimmer.start(now);
  lfo.start(now);

  const stopAt = now + Math.max(0.12, sustain) + 0.15;
  oscMain.stop(stopAt);
  oscShimmer.stop(stopAt);
  lfo.stop(stopAt);

  setTimeout(() => {
    try {
      oscMain.disconnect();
      oscShimmer.disconnect();
      lfo.disconnect();
      lfoGain.disconnect();
      filter.disconnect();
      gain.disconnect();
      if (panNode) {
        panNode.disconnect();
      }
    } catch (error) {
      // Ignore cleanup errors.
    }
  }, Math.ceil((stopAt - now) * 1000));
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.chordGain = null;
    this.harpGain = null;
    this.harpSubGain = null;
    this.harpSendGain = null;
    this.harpDelay = null;
    this.harpFeedback = null;
    this.harpFilter = null;
    this.harpWetGain = null;
    this.masterVolume = 0.85;
    this.chordVolume = 0.7;
    this.harpMainVolume = 0.65;
    this.harpSubVolume = 0.2;
    this.rhythmVolume = 0;
    this.rhythmEnabled = false;
    this.rhythmTimer = null;
    this.rhythmStep = 0;
    this.baseRhythmBpm = 96;
    this.harpReleaseSeconds = 0.3;
    this.tempoMultiplier = 1;
    this.rhythmGain = null;
    this.activeChord = null;
    this.chordOscillators = [];
  }

  async enable() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.master.connect(this.ctx.destination);

      this.chordGain = this.ctx.createGain();
      this.chordGain.gain.value = this.chordVolume;
      this.chordGain.connect(this.master);

      this.harpGain = this.ctx.createGain();
      this.harpGain.gain.value = this.harpMainVolume;
      this.harpGain.connect(this.master);

      this.harpSubGain = this.ctx.createGain();
      this.harpSubGain.gain.value = this.harpSubVolume;
      this.harpSubGain.connect(this.master);

      this.harpSendGain = this.ctx.createGain();
      this.harpSendGain.gain.value = 0.18;
      this.harpDelay = this.ctx.createDelay(0.6);
      this.harpDelay.delayTime.value = 0.12;
      this.harpFeedback = this.ctx.createGain();
      this.harpFeedback.gain.value = 0.28;
      this.harpFilter = this.ctx.createBiquadFilter();
      this.harpFilter.type = "lowpass";
      this.harpFilter.frequency.value = 4200;
      this.harpFilter.Q.value = 0.2;
      this.harpWetGain = this.ctx.createGain();
      this.harpWetGain.gain.value = 0.22;

      this.harpGain.connect(this.harpSendGain);
      this.harpSubGain.connect(this.harpSendGain);
      this.harpSendGain.connect(this.harpDelay);
      this.harpDelay.connect(this.harpFilter).connect(this.harpWetGain).connect(this.master);
      this.harpDelay.connect(this.harpFeedback).connect(this.harpDelay);

      this.rhythmGain = this.ctx.createGain();
      this.rhythmGain.gain.value = this.rhythmVolume;
      this.rhythmGain.connect(this.master);

      if (this.rhythmEnabled) {
        this.startRhythm();
      }
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

  playHarpFromChord(stringIndex, totalStrings) {
    if (!this.ctx || !this.activeChord) return;
    const root = normalizeRoot(this.activeChord.root);
    const intervals = getChordIntervals(this.activeChord.quality);
    const rootMidi = ROOT_TO_MIDI[root] ?? 60;
    const baseMidi = rootMidi - 24;
    const octaves = 4;
    const totalNotes = intervals.length * octaves;
    const safeStrings = Math.max(totalStrings ?? 1, 1);
    const maxIndex = Math.max(safeStrings - 1, 1);
    const noteIndex = Math.round((stringIndex / maxIndex) * (totalNotes - 1));
    const octaveOffset = Math.floor(noteIndex / intervals.length);
    const interval = intervals[noteIndex % intervals.length];
    const midi = baseMidi + interval + 12 * octaveOffset;
    const freq = midiToFrequency(midi);

    const sustain = Math.max(this.harpReleaseSeconds, 0.08);
    const mainVel = 0.4 * this.harpMainVolume;
    const subVel = 0.25 * this.harpSubVolume;
    const pan = (stringIndex / maxIndex) * 0.6 - 0.3;

    triggerHarpVoice(this.ctx, this.harpGain, freq, {
      velocity: mainVel,
      sustain,
      brightness: 0.62,
      stereoPan: pan
    });

    triggerHarpVoice(this.ctx, this.harpSubGain, freq / 2, {
      velocity: subVel,
      sustain: sustain * 1.15,
      brightness: 0.45,
      stereoPan: -pan
    });
  }

  getRhythmIntervalMs() {
    const bpm = this.baseRhythmBpm * this.tempoMultiplier;
    return 60000 / Math.max(bpm, 1);
  }

  playRhythmTick() {
    if (!this.ctx || !this.rhythmGain) return;
    const now = this.ctx.currentTime;
    const accent = this.rhythmStep % 4 === 0;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = accent ? 220 : 160;
    gain.gain.value = 0;
    osc.connect(gain).connect(this.rhythmGain);
    osc.start(now);
    gain.gain.linearRampToValueAtTime(accent ? 0.7 : 0.4, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.stop(now + 0.1);
    this.rhythmStep += 1;
  }

  startRhythm() {
    if (!this.ctx) return;
    this.stopRhythm();
    this.rhythmStep = 0;
    const interval = this.getRhythmIntervalMs();
    this.rhythmTimer = setInterval(() => this.playRhythmTick(), interval);
  }

  stopRhythm() {
    if (this.rhythmTimer) {
      clearInterval(this.rhythmTimer);
      this.rhythmTimer = null;
    }
  }

  setMasterVolume(value) {
    this.masterVolume = value;
    if (this.master) {
      this.master.gain.value = value;
    }
  }

  setChordVolume(value) {
    this.chordVolume = value;
    if (this.chordGain) {
      this.chordGain.gain.value = value;
    }
  }

  setHarpVolume(value) {
    this.harpMainVolume = value;
    if (this.harpGain) {
      this.harpGain.gain.value = value;
    }
  }

  setHarpSubVolume(value) {
    this.harpSubVolume = value;
    if (this.harpSubGain) {
      this.harpSubGain.gain.value = value;
    }
  }

  setHarpReleaseSeconds(value) {
    this.harpReleaseSeconds = value;
  }

  setTempoMultiplier(value) {
    this.tempoMultiplier = value;
    if (this.rhythmEnabled) {
      this.startRhythm();
    }
  }

  setRhythmVolume(value) {
    this.rhythmVolume = value;
    if (this.rhythmGain) {
      this.rhythmGain.gain.value = value;
    }
  }

  setRhythmEnabled(enabled) {
    this.rhythmEnabled = enabled;
    if (!enabled) {
      this.stopRhythm();
      return;
    }
    if (this.ctx) {
      this.startRhythm();
    }
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
