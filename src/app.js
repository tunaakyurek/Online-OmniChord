import { AudioEngine } from "./audio/audioEngine.js";
import { renderOverlay } from "./overlay/overlayRenderer.js";
import { clearPressed, setGuideTarget, setPressed } from "./overlay/hitTest.js";
import { createSongGuide } from "./songs/songGuide.js";

const OVERLAY_URL = "./data/overlayMap.om108.json";
const SONGS_URL = "./data/songs.json";
const STRUM_RETRIGGER_MS = 14;

const overlayRoot = document.getElementById("overlayRoot");
const enableAudioBtn = document.getElementById("enable-audio");
const stopAllBtn = document.getElementById("stop-all");
const memoryToggle = document.getElementById("memory-toggle");
const debugToggle = document.getElementById("debug-toggle");
const audioDot = document.getElementById("audio-dot");
const audioStatus = document.getElementById("audio-status");
const controlStatus = document.getElementById("control-status");
const songGuideEl = document.getElementById("song-guide");
const songTitleEl = document.getElementById("song-title");
const songStepEl = document.getElementById("song-step");
const songProgressBar = document.getElementById("song-progress-bar");

const engine = new AudioEngine();

const state = {
  overlayMap: null,
  elementsById: new Map(),
  activeChordId: null,
  lastStrumString: null,
  lastStrumTime: 0,
  strumStrings: 27,
  guide: null
};

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

function handleChordDown(control) {
  state.activeChordId = control.id;
  setChordActive(control.id);
  engine.playChord(control.root, control.quality);
  setControlStatus(`Chord: ${control.root}${control.quality === "min" ? "m" : ""}`);

  if (state.guide) {
    state.guide.advanceIfMatches(chordKeyFromControl(control));
    updateGuideDisplay();
  }
}

function handleChordUp(control) {
  stopChordIfNeeded(control.id);
}

function handleStrumEvent({ phase, y, meta }) {
  if (phase === "up" || phase === "cancel") {
    state.lastStrumString = null;
    return;
  }

  const now = performance.now();
  if (now - state.lastStrumTime < STRUM_RETRIGGER_MS) {
    return;
  }

  const strings = meta?.strings ?? state.strumStrings;
  const stringIndex = Math.max(0, Math.min(strings - 1, Math.floor(y * strings)));
  if (stringIndex === state.lastStrumString) {
    return;
  }

  state.lastStrumString = stringIndex;
  state.lastStrumTime = now;
  engine.playHarpFromChord(stringIndex);
  setControlStatus(`Strum: ${stringIndex + 1}`);
}

function stopAll() {
  engine.stopAll();
  clearPressed(state.elementsById);
  state.activeChordId = null;
  state.lastStrumString = null;
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

function updateGuideDisplay() {
  if (!state.guide || !songGuideEl) return;
  const step = state.guide.currentStep();
  const { root, quality } = parseChordKey(step.chord);
  const overlayId = `chord_${root.replace("#", "s")}_${quality}`;
  setGuideTarget(state.elementsById, overlayId);

  songStepEl.textContent = `Next: ${step.chord} (${step.beats} beats)`;
  songProgressBar.style.width = `${state.guide.getProgress() * 100}%`;
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
    return;
  }

  try {
    const songs = await loadSongs();
    const song = songs[songId];
    if (!song) {
      songGuideEl.setAttribute("hidden", "hidden");
      return;
    }
    songGuideEl.removeAttribute("hidden");
    songTitleEl.textContent = song.title;
    state.guide = createSongGuide(song, updateGuideDisplay);
    updateGuideDisplay();
    startGuideLoop();
  } catch (error) {
    songGuideEl.setAttribute("hidden", "hidden");
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
      onStrumEvent: handleStrumEvent
    });
    state.elementsById = elementsById;

    const strum = state.overlayMap.elements.find((el) => el.type === "strumplate");
    if (strum?.strings) {
      state.strumStrings = strum.strings;
    }

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
});

stopAllBtn.addEventListener("click", stopAll);

initGuide();
init();
setAudioStatus(false);
