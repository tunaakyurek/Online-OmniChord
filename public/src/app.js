import { AudioEngine } from "./audio/audioEngine.js";
import { renderOverlay } from "./overlay/overlayRenderer.js";
import { clearPressed, setGuideTarget, setPressed } from "./overlay/hitTest.js";
import { createSongGuide } from "./songs/songGuide.js";

const OVERLAY_URL = "./data/overlayMap.om108.json";
const SONGS_URL = "./data/songs.json";
const STRUM_RETRIGGER_MS = 10;
const STRUM_NEIGHBOR_RANGE = 0;

const overlayRoot = document.getElementById("overlayRoot");
const enableAudioBtn = document.getElementById("enable-audio");
const stopAllBtn = document.getElementById("stop-all");
const memoryToggle = document.getElementById("memory-toggle");
const debugToggle = document.getElementById("debug-toggle");
const rhythmToggleBtn = document.getElementById("rhythm-toggle");
const guideClearBtn = document.getElementById("guide-clear");
const audioDot = document.getElementById("audio-dot");
const audioStatus = document.getElementById("audio-status");
const controlStatus = document.getElementById("control-status");
const songGuideEl = document.getElementById("song-guide");
const songTitleEl = document.getElementById("song-title");
const songStepEl = document.getElementById("song-step");
const songProgressBar = document.getElementById("song-progress-bar");

const engine = new AudioEngine();
let rhythmEnabled = false;

const state = {
  overlayMap: null,
  elementsById: new Map(),
  controlsById: new Map(),
  activeChordId: null,
  activeChordPointerId: null,
  strumPointers: new Map(),
  strumStrings: 27,
  guide: null,
  controlValues: new Map(),
  pointerControls: new Map(),
  knobIndicators: new Map()
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function gainCurve01(value) {
  const v = clamp(value, 0, 1);
  return v * v;
}

function tempoCurve01(value) {
  const min = 0.5;
  const max = 4.0;
  const t = clamp(value, 0, 1);
  return min * Math.pow(max / min, t);
}

function sustainSeconds01(value) {
  const min = 0.04;
  const max = 1.2;
  const t = clamp(value, 0, 1);
  return min * Math.pow(max / min, t);
}

function setAudioStatus(unlocked) {
  audioDot.classList.toggle("active", unlocked);
  audioStatus.textContent = unlocked
    ? "Audio ready"
    : "Audio locked (tap Enable Audio)";
}

function setControlStatus(message) {
  controlStatus.textContent = message;
}

function applyDebug() {
  document.body.classList.toggle("debug-overlay", debugToggle.checked);
}

function updateRhythmButton() {
  if (!rhythmToggleBtn) return;
  rhythmToggleBtn.textContent = rhythmEnabled ? "Rhythm On" : "Rhythm Off";
}

function updateGuideButton(enabled) {
  if (!guideClearBtn) return;
  guideClearBtn.disabled = !enabled;
}

function setChordActive(controlId) {
  for (const [id, element] of state.elementsById.entries()) {
    if (element.dataset.type === "chord") {
      element.classList.toggle("active", id === controlId);
    }
  }
}

function stopChordIfNeeded(controlId) {
  if (memoryToggle.checked) return;
  if (state.activeChordId === controlId) {
    engine.stopChord();
    state.activeChordId = null;
    setChordActive(null);
  }
}

function chordKeyFromControl(control) {
  return `${control.root}:${control.quality}`;
}

function handleChordDown(control, ev) {
  state.activeChordId = control.id;
  state.activeChordPointerId = ev.pointerId;
  setChordActive(control.id);
  engine.playChord(control.root, control.quality);
  setControlStatus(`Chord: ${control.root}${control.quality === "min" ? "m" : ""}`);

  if (state.guide) {
    state.guide.advanceIfMatches(chordKeyFromControl(control));
    updateGuideDisplay();
  }
}

function handleChordUp(control, ev) {
  if (state.activeChordPointerId !== ev.pointerId) return;
  stopChordIfNeeded(control.id);
  state.activeChordPointerId = null;
}

function triggerStrumCluster(centerIndex, strings) {
  for (let offset = -STRUM_NEIGHBOR_RANGE; offset <= STRUM_NEIGHBOR_RANGE; offset += 1) {
    const idx = centerIndex + offset;
    if (idx < 0 || idx >= strings) continue;
    engine.playHarpFromChord(idx, strings);
  }
}

function handleStrumEvent({ phase, y, meta, pointerId }) {
  if (phase === "down" && meta?.id) {
    setPressed(state.elementsById, meta.id, true);
  }
  if (phase === "up" || phase === "cancel") {
    state.strumPointers.delete(pointerId);
    if (meta?.id) {
      setPressed(state.elementsById, meta.id, false);
    }
    return;
  }

  const now = performance.now();
  const pointerState = state.strumPointers.get(pointerId) ?? {
    lastString: null,
    lastTime: 0
  };

  if (now - pointerState.lastTime < STRUM_RETRIGGER_MS) {
    return;
  }

  const strings = meta?.strings ?? state.strumStrings;
  const nextIndex = Math.max(0, Math.min(strings - 1, Math.floor(y * strings)));

  if (pointerState.lastString === null || nextIndex !== pointerState.lastString) {
    pointerState.lastString = nextIndex;
    pointerState.lastTime = now;
    state.strumPointers.set(pointerId, pointerState);
    triggerStrumCluster(nextIndex, strings);
    setControlStatus(`Strum: ${nextIndex + 1}`);
  }
}

function getControlValue(controlId, fallback = 0.5) {
  if (!state.controlValues.has(controlId)) {
    state.controlValues.set(controlId, fallback);
  }
  return state.controlValues.get(controlId);
}

function setControlValue(controlId, value, min = 0, max = 1) {
  const clamped = clamp(value, min, max);
  state.controlValues.set(controlId, clamped);
  updateKnobIndicator(controlId);
  return clamped;
}

function formatKnobRatio(value, min, max) {
  const range = max - min || 1;
  const normalized = (value - min) / range;
  const steps = Math.round(clamp(normalized, 0, 1) * 10);
  return `${steps}/10`;
}

function updateKnobIndicator(controlId) {
  const indicator = state.knobIndicators.get(controlId);
  const control = state.controlsById.get(controlId);
  if (!indicator || !control) return;
  const value = getControlValue(controlId, control.default ?? 0.5);
  const min = control.min ?? 0;
  const max = control.max ?? 1;
  indicator.textContent = formatKnobRatio(value, min, max);
}

function createKnobIndicators(controls) {
  for (const indicator of state.knobIndicators.values()) {
    indicator.remove();
  }
  state.knobIndicators.clear();

  for (const control of controls) {
    if (control.type !== "knob") continue;
    const indicator = document.createElement("div");
    indicator.className = "knob-indicator";
    const [x, y, w, h] = control.bbox;
    indicator.style.left = `${(x + w / 2) * 100}%`;
    indicator.style.top = `${y * 100}%`;
    overlayRoot.appendChild(indicator);
    state.knobIndicators.set(control.id, indicator);
    updateKnobIndicator(control.id);
  }
}

function applyControlValue(controlId, value) {
  if (controlId === "knob_master_volume") {
    engine.setMasterVolume(gainCurve01(value));
  }
  if (controlId === "knob_chord_volume") {
    engine.setChordVolume(gainCurve01(value));
  }
  if (controlId === "knob_strum_main") {
    engine.setHarpVolume(gainCurve01(value));
  }
  if (controlId === "knob_strum_sub") {
    engine.setHarpSubVolume(gainCurve01(value));
  }
  if (controlId === "knob_strum_sustain") {
    engine.setHarpReleaseSeconds(sustainSeconds01(value));
  }
  if (controlId === "knob_rhythm_volume") {
    engine.setRhythmVolume(gainCurve01(value));
  }
  if (controlId === "knob_rhythm_tempo") {
    engine.setTempoMultiplier(tempoCurve01(value));
  }
}

function handleControlDown(control, ev) {
  const type = control.type;
  if (type === "toggle") {
    const current = getControlValue(control.id, 0);
    const next = current > 0 ? 0 : 1;
    setControlValue(control.id, next);
    setPressed(state.elementsById, control.id, next > 0);
    setControlStatus(`Toggle: ${control.label ?? control.id} ${next ? "on" : "off"}`);
  } else if (type === "button") {
    setPressed(state.elementsById, control.id, true);
    setControlStatus(`Button: ${control.label ?? control.id}`);
  } else if (type === "knob") {
    const current = getControlValue(control.id, control.default ?? 0.5);
    state.pointerControls.set(ev.pointerId, {
      id: control.id,
      startY: ev.clientY,
      startValue: current,
      min: control.min ?? 0,
      max: control.max ?? 1
    });
    setPressed(state.elementsById, control.id, true);
    setControlStatus(`Knob: ${control.label ?? control.id}`);
  }
}

function handleControlMove(control, ev) {
  if (control.type !== "knob") return;
  const pointer = state.pointerControls.get(ev.pointerId);
  if (!pointer || pointer.id !== control.id) return;
  const delta = (pointer.startY - ev.clientY) / 220;
  const next = setControlValue(
    control.id,
    pointer.startValue + delta,
    pointer.min,
    pointer.max
  );
  applyControlValue(control.id, next);
  setControlStatus(`Knob: ${control.label ?? control.id} ${(next * 100).toFixed(0)}%`);
}

function handleControlUp(control, ev) {
  if (control.type === "button") {
    setPressed(state.elementsById, control.id, false);
  }
  if (control.type === "knob") {
    state.pointerControls.delete(ev.pointerId);
    setPressed(state.elementsById, control.id, false);
  }
}

function stopAll() {
  engine.stopAll();
  clearPressed(state.elementsById);
  state.activeChordId = null;
  state.activeChordPointerId = null;
  state.strumPointers.clear();
  state.pointerControls.clear();
  setControlStatus("Stopped.");
}

async function loadOverlay() {
  const response = await fetch(OVERLAY_URL);
  if (!response.ok) {
    throw new Error("Overlay map could not be loaded.");
  }
  return response.json();
}

async function loadSongs() {
  const response = await fetch(SONGS_URL);
  if (!response.ok) {
    throw new Error("Songs data could not be loaded.");
  }
  return response.json();
}

function parseChordKey(chordKey) {
  const [root, quality] = chordKey.split(":");
  return { root, quality };
}

function overlayRootFromChord(root) {
  const sharpToFlat = {
    "C#": "Db",
    "D#": "Eb",
    "G#": "Ab",
    "A#": "Bb"
  };
  return sharpToFlat[root] ?? root;
}

function updateGuideDisplay() {
  if (!state.guide || !songGuideEl) return;
  const step = state.guide.currentStep();
  const { root, quality } = parseChordKey(step.chord);
  const overlayRoot = overlayRootFromChord(root);
  const overlayId = `chord_${overlayRoot.replace("#", "s")}_${quality}`;
  setGuideTarget(state.elementsById, overlayId);

  songStepEl.textContent = `Next: ${step.chord} (${step.beats} beats)`;
  songProgressBar.style.width = `${state.guide.getProgress() * 100}%`;
}

function clearGuide() {
  state.guide = null;
  if (songGuideEl) {
    songGuideEl.setAttribute("hidden", "hidden");
  }
  songTitleEl.textContent = "";
  songStepEl.textContent = "";
  songProgressBar.style.width = "0";
  setGuideTarget(state.elementsById, null);
  updateGuideButton(false);
  const url = new URL(window.location.href);
  url.searchParams.delete("song");
  window.history.replaceState({}, "", url.toString());
}

function startGuideLoop() {
  if (!state.guide) return;
  const tick = () => {
    if (state.guide) {
      songProgressBar.style.width = `${state.guide.getProgress() * 100}%`;
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

async function initGuide() {
  const params = new URLSearchParams(window.location.search);
  const songId = params.get("song");
  if (!songId) {
    songGuideEl.setAttribute("hidden", "hidden");
    updateGuideButton(false);
    return;
  }

  try {
    const songs = await loadSongs();
    const song = songs[songId];
    if (!song) {
      songGuideEl.setAttribute("hidden", "hidden");
      updateGuideButton(false);
      return;
    }
    songGuideEl.removeAttribute("hidden");
    updateGuideButton(true);
    songTitleEl.textContent = song.title;
    state.guide = createSongGuide(song, updateGuideDisplay);
    updateGuideDisplay();
    startGuideLoop();
  } catch (error) {
    songGuideEl.setAttribute("hidden", "hidden");
    updateGuideButton(false);
  }
}

async function init() {
  try {
    state.overlayMap = await loadOverlay();
    const { elementsById } = renderOverlay({
      overlayRoot,
      overlayMap: state.overlayMap,
      onChordDown: handleChordDown,
      onChordUp: handleChordUp,
      onStrumEvent: handleStrumEvent,
      onControlDown: handleControlDown,
      onControlMove: handleControlMove,
      onControlUp: handleControlUp
    });
    state.elementsById = elementsById;
    state.controlsById = new Map(
      state.overlayMap.elements.map((control) => [control.id, control])
    );

    const strum = state.overlayMap.elements.find((el) => el.type === "strumplate");
    if (strum?.strings) {
      state.strumStrings = strum.strings;
    }

    for (const control of state.overlayMap.elements) {
      if (control.type !== "knob") continue;
      const value = control.default ?? 0.5;
      setControlValue(control.id, value, control.min ?? 0, control.max ?? 1);
      applyControlValue(control.id, value);
    }

    createKnobIndicators(state.overlayMap.elements);

    setControlStatus("Overlay ready.");
    updateGuideDisplay();
  } catch (error) {
    setControlStatus("Overlay failed to load.");
  }
}

debugToggle.addEventListener("change", applyDebug);
applyDebug();

enableAudioBtn.addEventListener("click", async () => {
  await engine.enable();
  setAudioStatus(engine.isReady());
  enableAudioBtn.disabled = true;
  stopAllBtn.disabled = false;
  engine.setRhythmEnabled(rhythmEnabled);
});

stopAllBtn.addEventListener("click", stopAll);

if (guideClearBtn) {
  guideClearBtn.addEventListener("click", clearGuide);
}

if (rhythmToggleBtn) {
  updateRhythmButton();
  rhythmToggleBtn.addEventListener("click", () => {
    rhythmEnabled = !rhythmEnabled;
    engine.setRhythmEnabled(rhythmEnabled);
    updateRhythmButton();
  });
}

initGuide();
init();
setAudioStatus(false);
