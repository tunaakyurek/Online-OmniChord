import { normalizeChordKey } from "../audio/audioEngine.js";

export function createSongGuide(song, onStepChange) {
  let stepIndex = 0;
  let stepStartedAt = performance.now();

  function currentStep() {
    return song.steps[stepIndex];
  }

  function advance() {
    if (stepIndex < song.steps.length - 1) {
      stepIndex += 1;
    } else if (song.loop) {
      stepIndex = 0;
    } else {
      return false;
    }
    stepStartedAt = performance.now();
    if (onStepChange) {
      onStepChange(currentStep(), stepIndex);
    }
    return true;
  }

  function advanceIfMatches(chordKey) {
    if (!song) return false;
    const expected = normalizeChordKey(currentStep().chord);
    const incoming = normalizeChordKey(chordKey);
    if (expected === incoming) {
      return advance();
    }
    return false;
  }

  function getProgress(now = performance.now()) {
    const step = currentStep();
    const beatMs = 60000 / song.bpm;
    const duration = beatMs * step.beats;
    const elapsed = now - stepStartedAt;
    return Math.min(Math.max(elapsed / duration, 0), 1);
  }

  return {
    currentStep,
    advanceIfMatches,
    getProgress,
    stepIndex: () => stepIndex
  };
}
