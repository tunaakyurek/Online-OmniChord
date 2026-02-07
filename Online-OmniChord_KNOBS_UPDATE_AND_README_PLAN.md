# Online‑OmniChord — Knobs Update (Based on `omnichord_selected.png`)

This document replaces/updates the previous “NEXT_STEPS” plan **specifically for the knobs you circled** in `omnichord_selected.png`.

## 0) What knobs are in scope

From your marked image, the circled knobs are:

1. **Master Volume** (left panel)
2. **Strumplate Sustain**
3. **Strumplate Main Volume**
4. **Strumplate Sub Volume**
5. **Rhythm Tempo**
6. **Rhythm Volume**
7. **Chord Volume**

No other knobs/switches are included in this step.

---

## 1) Critical pre‑check: confirm image dimensions match

All bounding boxes below assume your on‑site background image (`omnichord.png`) is exactly:

- **Width = 1308px**
- **Height = 710px**

### Checkpoint K1
In your running site, log the natural size:

```js
const img = new Image();
img.src = "omnichord.png"; // or your actual path
img.onload = () => console.log(img.naturalWidth, img.naturalHeight);
```

✅ If you see `1308 710`, proceed.  
❗ If not, stop and tell me the dimensions you get — bboxes must be re‑normalized.

---

## 2) Paste the correct knob bboxes into `overlayMap.om108.json`

### 2.1 Normalized bbox values (x, y, w, h)

These were computed directly from your marked image and converted to normalized coordinates (0..1):

```json
{
  "knob_master_volume": [
    0.058073,
    0.254028,
    0.040734,
    0.075042
  ],
  "knob_strum_sustain": [
    0.339266,
    0.131493,
    0.032477,
    0.059831
  ],
  "knob_strum_main": [
    0.387798,
    0.126254,
    0.034495,
    0.063549
  ],
  "knob_strum_sub": [
    0.434037,
    0.125239,
    0.037431,
    0.068958
  ],
  "knob_rhythm_tempo": [
    0.329083,
    0.261465,
    0.028991,
    0.053408
  ],
  "knob_rhythm_volume": [
    0.374128,
    0.258254,
    0.034312,
    0.063211
  ],
  "knob_chord_volume": [
    0.436422,
    0.259775,
    0.034495,
    0.063549
  ]
}
```

### 2.2 Overlay map entries (ready to paste)
Add these controls (or replace your current knob entries) in `data/overlayMap.om108.json`:

```json
[
  { "id": "knob_master_volume", "type": "knob", "label": "Master Volume", "bbox": [0.058073, 0.254028, 0.040734, 0.075042], "min": 0, "max": 1, "default": 0.85, "step": 0.001 },
  { "id": "knob_strum_sustain", "type": "knob", "label": "Strum Sustain", "bbox": [0.339266, 0.131493, 0.032477, 0.059831], "min": 0, "max": 1, "default": 0.35, "step": 0.001 },
  { "id": "knob_strum_main", "type": "knob", "label": "Strum Main Vol", "bbox": [0.387798, 0.126254, 0.034495, 0.063549], "min": 0, "max": 1, "default": 0.75, "step": 0.001 },
  { "id": "knob_strum_sub", "type": "knob", "label": "Strum Sub Vol", "bbox": [0.434037, 0.125239, 0.037431, 0.068958], "min": 0, "max": 1, "default": 0.20, "step": 0.001 },
  { "id": "knob_rhythm_tempo", "type": "knob", "label": "Rhythm Tempo", "bbox": [0.329083, 0.261465, 0.028991, 0.053408], "min": 0, "max": 1, "default": 0.50, "step": 0.001 },
  { "id": "knob_rhythm_volume", "type": "knob", "label": "Rhythm Volume", "bbox": [0.374128, 0.258254, 0.034312, 0.063211], "min": 0, "max": 1, "default": 0.00, "step": 0.001 },
  { "id": "knob_chord_volume", "type": "knob", "label": "Chord Volume", "bbox": [0.436422, 0.259775, 0.034495, 0.063549], "min": 0, "max": 1, "default": 0.85, "step": 0.001 }
]
```

### Checkpoint K2
Turn on your **Debug Overlay** and verify:
- each knob’s highlight overlays the correct knob circle
- touch/mouse dragging on the knob hit area triggers a value change log

---

## 3) Knob interaction: stable, Safari‑safe behavior

### 3.1 Required behavior
- A knob value changes while the pointer is down and moving.
- The knob stays “owned” by its pointer id (multi‑touch safe).
- Knob value is clamped to [min,max].
- Use pointer capture to keep updates even if the finger drifts.

### 3.2 Recommended implementation (vertical drag)
Use **vertical drag** instead of angle math for now (more reliable, less jittery):

- drag up → increase
- drag down → decrease

**Drop‑in pattern** for `overlayRenderer.js` (or equivalent):

```js
const knobStateByPointer = new Map(); // pointerId -> { id, startY, startValue }

function onKnobPointerDown(e, control, currentValue) {
  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);

  knobStateByPointer.set(e.pointerId, {
    id: control.id,
    startY: e.clientY,
    startValue: currentValue
  });
}

function onKnobPointerMove(e, control, setValue) {
  const st = knobStateByPointer.get(e.pointerId);
  if (!st || st.id !== control.id) return;

  const dy = e.clientY - st.startY;

  // Sensitivity: 300px drag = full scale
  const delta = -dy / 300;

  let v = st.startValue + delta;
  v = Math.max(control.min ?? 0, Math.min(control.max ?? 1, v));

  setValue(control.id, v);
}

function onKnobPointerUp(e) {
  knobStateByPointer.delete(e.pointerId);
}
```

### Checkpoint K3
- Drag a knob while simultaneously holding a chord and strumming.
- Knob updates should not cancel chord hold or strum.

---

## 4) Audio mappings for each knob (what they should actually do)

To make knobs feel “real,” map UI 0..1 to audio parameters with **useful curves**.

### 4.1 Gain curve
Use a squared curve for better low‑end resolution:

```js
function gainCurve01(v) {
  v = Math.max(0, Math.min(1, v));
  return v * v;
}
```

### 4.2 Tempo curve (Rhythm Tempo knob)
Map 0..1 to **0.5× → 4×** (your earlier spec):

```js
function tempoCurve01(v) {
  // exponential-ish mapping for musical feel
  const min = 0.5;
  const max = 4.0;
  const t = Math.max(0, Math.min(1, v));
  return min * Math.pow(max / min, t);
}
```

### 4.3 Sustain curve (Strum Sustain knob)
Map 0..1 to a realistic release time (seconds). Start conservative:

```js
function sustainSeconds01(v) {
  // 0.04s .. 1.2s
  const min = 0.04;
  const max = 1.2;
  const t = Math.max(0, Math.min(1, v));
  return min * Math.pow(max / min, t);
}
```

### 4.4 Proposed knob → engine parameter mapping
| Knob | Mapping |
|---|---|
| Master Volume | masterGain = gainCurve01(v) |
| Strum Main Vol | harpBusGain = gainCurve01(v) |
| Strum Sub Vol | harpSubGain = gainCurve01(v) *(sub‑osc layer)* |
| Strum Sustain | harpReleaseSeconds = sustainSeconds01(v) |
| Rhythm Volume | rhythmBusGain = gainCurve01(v) |
| Rhythm Tempo | tempoMultiplier = tempoCurve01(v) |
| Chord Volume | chordBusGain = gainCurve01(v) |

### Checkpoint K4
You should *hear*:
- Master affects everything
- Chord volume only changes chords
- Strum main/sub changes harp brightness/thickness (sub adds weight)
- Sustain changes how long harp notes ring after strumming
- Rhythm tempo changes rate without altering pitch
- Rhythm volume fades rhythm in/out

---

## 5) Minimal engine changes you should implement now

### 5.1 Add missing nodes (harp sub layer)
If you do not already have a “sub” layer, add a second oscillator one octave down (or a filtered layer) with its own GainNode:

- `harpMainGain`
- `harpSubGain`

### 5.2 Add a “harp release time” parameter
Do **not** hard‑stop notes instantly; ramp down:

```js
gain.gain.cancelScheduledValues(now);
gain.gain.setValueAtTime(gain.gain.value, now);
gain.gain.linearRampToValueAtTime(0.0001, now + harpReleaseSeconds);
```

### Checkpoint K5
Fast strum should be smooth and not “clicky” when you lift your finger.

---

## 6) Multi‑touch hardening (iPad/Safari edge cases)

Even if WebKit sim works, iOS Safari can fire pointer cancel events.

### Required: handle `pointercancel` and `lostpointercapture`
- If the chord pointer is cancelled, stop that chord.
- Keep strum state per pointer id (avoid cross‑finger interference).

**Checklist**
- [ ] chord hold pointer id check exists (you already did this)
- [ ] handle `pointercancel` to release chord
- [ ] store `lastStrumString` per pointer id (Map)

### Checkpoint K6
Hold chord with finger A, strum with finger B, then lift finger B first:
- chord remains until finger A lifts
- strum ends cleanly

---

## 7) Optional libraries (open‑source, install via terminal)

You do **not** need these to proceed, but they can improve UX and maintainability.

### UI / state
- **zustand**: tiny state store; avoids prop‑drilling for control values.
  - `npm i zustand`
- **framer-motion**: smooth UI animations (pressed states, subtle knob feedback).
  - `npm i framer-motion`
- **lucide-react**: clean icons (help, info, settings overlay).
  - `npm i lucide-react`

### Audio ergonomics (optional)
- **tone** (Tone.js): scheduling helpers, but heavier; only use if your rhythm engine becomes complex.
  - `npm i tone`

### Dev tooling (highly recommended while calibrating)
- **tweakpane**: live debug panel for parameters (only in dev mode).
  - `npm i tweakpane`

---

## 8) README plan so iPad users can “click one link and play”

Your README should make it *impossible* to get confused.

### 8.1 README structure (copy/paste template)
Add these sections to `README.md`:

1. **Play now (iPad link)**
   - Put the GitHub Pages URL at the top in a single prominent line.
2. **How to play (iPad)**
   - Landscape orientation
   - Tap “Enable Audio”
   - Hold chord with one finger, strum with another
3. **Troubleshooting**
   - If no sound: check mute switch, volume, re-tap Enable Audio
4. **Developer**
   - install, run, build, deploy

### 8.2 “Play now” link format
Once Pages is enabled, the URL is:

`https://<YOUR_GITHUB_USERNAME>.github.io/<REPO_NAME>/`

Put it as:

- **▶ Play Online Omnichord:** `https://...`

### 8.3 Add-to-Home-Screen tip (nice UX)
Include a short bullet list:
- Share button → “Add to Home Screen”
- Then run full-screen like an app

### Checkpoint K7
Ask a friend with an iPad to:
- open README
- tap the Play link
- get sound within 10 seconds

If they can’t, adjust README until they can.

---

## 9) What I need from you after this step

After you add these knob controls + mappings, send:

1. A screenshot with **Debug Overlay ON** showing knob highlights aligned.
2. A short video (optional) showing:
   - hold chord + strum + adjust a knob simultaneously
3. Your final knob value mapping decisions (if you deviated from defaults).

Then we move to the next control group:
- VOICE buttons
- PATTERN buttons
- Real Time Control switches
