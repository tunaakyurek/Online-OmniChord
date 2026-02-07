# Online-OmniChord repo fixes: accurate OM-108 geometry, strum-swipe, songs page

This guide is written to be **step-by-step**, with explicit checkpoints.  
Goal: your `assets/omnichord.png` becomes the “datasheet” reference, and every interactive zone is mapped in **realistic geometry**.

---

## 0) What’s wrong today (based on your screenshot)

### Symptoms
- Only ~4 chord buttons exist → overlay map is incomplete.
- Button hit-zones don’t match the PNG geometry.
- “Harp/Strumplate swipe” doesn’t trigger notes continuously in WebKit → drag/swipe gesture isn’t implemented using **pointer capture + pointermove**, and/or CSS isn’t allowing touch gestures.
- No second page for song selection / guided playback.

### Root causes (typical)
- Overlay data is hard-coded or partial (few buttons only).
- “Tap” events are used instead of **press-and-hold** semantics.
- Touch input is handled with `touchstart/touchmove` only (or `mousedown` only), instead of unified **Pointer Events** (`pointerdown/move/up/cancel`) which work for mouse *and* touch.
- Missing `touch-action: none` and iOS-specific scroll/zoom prevention on the interaction layer.

---

## 1) Repo target architecture (Safari-first, still simple)

> ✅ Keep it static (GitHub Pages-friendly). No framework required.

```
/assets/
  omnichord.png
/data/
  overlayMap.om108.json
  songs.json
/src/
  app.js
  overlay/
    overlayRenderer.js
    hitTest.js
  audio/
    audioEngine.js
    instruments.js
  songs/
    songsPage.js
    songGuide.js
/globals.css
/index.html
/songs.html
```

**Checkpoint 1**
- [ ] `assets/omnichord.png` exists at that exact path
- [ ] `index.html` loads `/src/app.js` as a module
- [ ] Site still runs locally via Live Server (or your preview extension)

---

## 2) Make the PNG responsive without breaking geometry

Use an **aspect-ratio locked stage**. The overlay is positioned in **percent coordinates** relative to the PNG.

### HTML (instrument stage)
```html
<div id="stage" class="stage">
  <img id="omniImg" class="stage__img" src="assets/omnichord.png" alt="OM-108" />
  <div id="overlayRoot" class="stage__overlay"></div>
</div>
```

### CSS (critical for iPad + accurate overlays)
```css
.stage {
  position: relative;
  width: min(100vw, 1400px);
  margin: 0 auto;
  aspect-ratio: 2048 / 1111; /* must match the reference image */
}

.stage__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.stage__overlay {
  position: absolute;
  inset: 0;
  /* IMPORTANT: make overlay receive touch/pen/mouse gestures */
  pointer-events: auto;
  touch-action: none;          /* prevents iOS scroll/zoom stealing gestures */
  -webkit-user-select: none;
  user-select: none;
}
```

**Checkpoint 2**
- [ ] Resizing the window keeps the instrument’s proportions correct
- [ ] No scrolling/zooming occurs when dragging on the instrument

---

## 3) Accurate chord button placement (OM-108 PNG-derived)

Below is a **ready-to-use** overlay map for the chord grid (12 roots × {Major, Minor, 7th}) plus the main strumplate region.

> Coordinates were extracted from the OM-108 PNG in this chat (2048×1111).  
> If your `assets/omnichord.png` differs (crop, padding, resolution), **regenerate** using the script in section 3.3.

### 3.1 Create `data/overlayMap.om108.json`
Paste this file as-is:

```json
{
  "reference": {
    "width": 2048,
    "height": 1111,
    "image": "assets/omnichord.png"
  },
  "elements": [
    {
      "id": "chord_Ds_maj",
      "type": "chord",
      "root": "D#",
      "quality": "maj",
      "bbox": [
        0.081055,
        0.426643,
        0.022949,
        0.048605
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Ds_min",
      "type": "chord",
      "root": "D#",
      "quality": "min",
      "bbox": [
        0.09668,
        0.508551,
        0.022949,
        0.048605
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Ds_7",
      "type": "chord",
      "root": "D#",
      "quality": "7",
      "bbox": [
        0.10498,
        0.555356,
        0.018555,
        0.040504
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Ab_maj",
      "type": "chord",
      "root": "Ab",
      "quality": "maj",
      "bbox": [
        0.112793,
        0.425743,
        0.022949,
        0.048605
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Ab_min",
      "type": "chord",
      "root": "Ab",
      "quality": "min",
      "bbox": [
        0.121094,
        0.474347,
        0.018555,
        0.039604
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Ab_7",
      "type": "chord",
      "root": "Ab",
      "quality": "7",
      "bbox": [
        0.128418,
        0.505851,
        0.022949,
        0.051305
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Eb_maj",
      "type": "chord",
      "root": "Eb",
      "quality": "maj",
      "bbox": [
        0.144531,
        0.426643,
        0.022949,
        0.048605
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Eb_min",
      "type": "chord",
      "root": "Eb",
      "quality": "min",
      "bbox": [
        0.152832,
        0.474347,
        0.018555,
        0.039604
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Eb_7",
      "type": "chord",
      "root": "Eb",
      "quality": "7",
      "bbox": [
        0.160156,
        0.507651,
        0.022461,
        0.049505
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Bb_maj",
      "type": "chord",
      "root": "Bb",
      "quality": "maj",
      "bbox": [
        0.17627,
        0.426643,
        0.022949,
        0.049505
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Bb_min",
      "type": "chord",
      "root": "Bb",
      "quality": "min",
      "bbox": [
        0.185059,
        0.475248,
        0.018066,
        0.039604
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Bb_7",
      "type": "chord",
      "root": "Bb",
      "quality": "7",
      "bbox": [
        0.191895,
        0.506751,
        0.022949,
        0.050405
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_F_maj",
      "type": "chord",
      "root": "F",
      "quality": "maj",
      "bbox": [
        0.208008,
        0.426643,
        0.022461,
        0.049505
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_F_min",
      "type": "chord",
      "root": "F",
      "quality": "min",
      "bbox": [
        0.217773,
        0.474347,
        0.017578,
        0.039604
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_F_7",
      "type": "chord",
      "root": "F",
      "quality": "7",
      "bbox": [
        0.223633,
        0.509451,
        0.022949,
        0.047705
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_C_maj",
      "type": "chord",
      "root": "C",
      "quality": "maj",
      "bbox": [
        0.239746,
        0.426643,
        0.022461,
        0.050405
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_C_min",
      "type": "chord",
      "root": "C",
      "quality": "min",
      "bbox": [
        0.249512,
        0.474347,
        0.017578,
        0.040504
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_C_7",
      "type": "chord",
      "root": "C",
      "quality": "7",
      "bbox": [
        0.255371,
        0.508551,
        0.022949,
        0.048605
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_G_maj",
      "type": "chord",
      "root": "G",
      "quality": "maj",
      "bbox": [
        0.271484,
        0.426643,
        0.022461,
        0.050405
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_G_min",
      "type": "chord",
      "root": "G",
      "quality": "min",
      "bbox": [
        0.28125,
        0.475248,
        0.018555,
        0.039604
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_G_7",
      "type": "chord",
      "root": "G",
      "quality": "7",
      "bbox": [
        0.287109,
        0.509451,
        0.022949,
        0.047705
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_D_maj",
      "type": "chord",
      "root": "D",
      "quality": "maj",
      "bbox": [
        0.303223,
        0.426643,
        0.022461,
        0.049505
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_D_min",
      "type": "chord",
      "root": "D",
      "quality": "min",
      "bbox": [
        0.3125,
        0.476148,
        0.017578,
        0.039604
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_D_7",
      "type": "chord",
      "root": "D",
      "quality": "7",
      "bbox": [
        0.318848,
        0.507651,
        0.022949,
        0.049505
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_A_maj",
      "type": "chord",
      "root": "A",
      "quality": "maj",
      "bbox": [
        0.334961,
        0.427543,
        0.022461,
        0.048605
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_A_min",
      "type": "chord",
      "root": "A",
      "quality": "min",
      "bbox": [
        0.344238,
        0.475248,
        0.017578,
        0.039604
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_A_7",
      "type": "chord",
      "root": "A",
      "quality": "7",
      "bbox": [
        0.350586,
        0.507651,
        0.022461,
        0.049505
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_E_maj",
      "type": "chord",
      "root": "E",
      "quality": "maj",
      "bbox": [
        0.366211,
        0.424842,
        0.022949,
        0.051305
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_E_min",
      "type": "chord",
      "root": "E",
      "quality": "min",
      "bbox": [
        0.375977,
        0.475248,
        0.017578,
        0.039604
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_E_7",
      "type": "chord",
      "root": "E",
      "quality": "7",
      "bbox": [
        0.381836,
        0.508551,
        0.022949,
        0.048605
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_B_maj",
      "type": "chord",
      "root": "B",
      "quality": "maj",
      "bbox": [
        0.397949,
        0.424842,
        0.022949,
        0.052205
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_B_min",
      "type": "chord",
      "root": "B",
      "quality": "min",
      "bbox": [
        0.407715,
        0.476148,
        0.017578,
        0.039604
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_B_7",
      "type": "chord",
      "root": "B",
      "quality": "7",
      "bbox": [
        0.414062,
        0.508551,
        0.022461,
        0.049505
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Fs_maj",
      "type": "chord",
      "root": "F#",
      "quality": "maj",
      "bbox": [
        0.429688,
        0.428443,
        0.022949,
        0.048605
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Fs_min",
      "type": "chord",
      "root": "F#",
      "quality": "min",
      "bbox": [
        0.439941,
        0.475248,
        0.017578,
        0.040504
      ],
      "gesture": "hold"
    },
    {
      "id": "chord_Fs_7",
      "type": "chord",
      "root": "F#",
      "quality": "7",
      "bbox": [
        0.445312,
        0.508551,
        0.022949,
        0.049505
      ],
      "gesture": "hold"
    },
    {
      "id": "strumplate_main",
      "type": "strumplate",
      "bbox": [
        0.505371,
        0.106211,
        0.100098,
        0.585059
      ],
      "strings": 27
    }
  ]
}
```

**Checkpoint 3**
- [ ] `data/overlayMap.om108.json` exists
- [ ] It contains 36 `type:"chord"` elements + 1 `type:"strumplate"`

### 3.2 Render the overlay from JSON (debug-friendly)

Create `src/overlay/overlayRenderer.js`:
```js
export function renderOverlay({
  overlayRoot,
  overlayMap,
  debug,
  onChordDown,
  onChordUp,
  onStrumEvent,
}) {
  overlayRoot.innerHTML = "";

  for (const el of overlayMap.elements) {
    const node = document.createElement("div");
    node.dataset.id = el.id;
    node.dataset.type = el.type;

    // bbox is [xPct, yPct, wPct, hPct]
    const [x, y, w, h] = el.bbox;
    Object.assign(node.style, {
      position: "absolute",
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      width: `${w * 100}%`,
      height: `${h * 100}%`,
      // helps iOS hit testing:
      transform: "translateZ(0)",
    });

    if (debug) {
      node.style.outline = "2px solid rgba(0, 200, 255, 0.55)";
      node.style.borderRadius = el.type === "chord" ? "10px" : "12px";
      node.style.background = "rgba(0, 200, 255, 0.08)";
    }

    if (el.type === "chord") {
      node.className = "hit hit--chord";
      // press-and-hold behavior
      node.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        node.setPointerCapture(ev.pointerId);
        onChordDown(el, ev);
      });
      node.addEventListener("pointerup", (ev) => {
        ev.preventDefault();
        onChordUp(el, ev);
      });
      node.addEventListener("pointercancel", (ev) => {
        ev.preventDefault();
        onChordUp(el, ev);
      });
    }

    if (el.type === "strumplate") {
      node.className = "hit hit--strum";
      attachStrumHandlers(node, el, onStrumEvent);
    }

    overlayRoot.appendChild(node);
  }
}

function attachStrumHandlers(node, strumEl, onStrumEvent) {
  // NOTE: Works for mouse + touch.
  let isDown = false;

  const emit = (ev, phase) => {
    const rect = node.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;  // 0..1
    const y = (ev.clientY - rect.top) / rect.height;  // 0..1
    onStrumEvent({ phase, x, y, pointerType: ev.pointerType });
  };

  node.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    isDown = true;
    node.setPointerCapture(ev.pointerId);
    emit(ev, "down");
  });

  node.addEventListener("pointermove", (ev) => {
    if (!isDown) return;
    ev.preventDefault();
    emit(ev, "move");
  });

  node.addEventListener("pointerup", (ev) => {
    if (!isDown) return;
    ev.preventDefault();
    isDown = false;
    emit(ev, "up");
  });

  node.addEventListener("pointercancel", (ev) => {
    if (!isDown) return;
    ev.preventDefault();
    isDown = false;
    emit(ev, "cancel");
  });
}
```

**Checkpoint 4**
- [ ] Turning on debug outlines shows **all 36 chord hitboxes** aligned to the PNG
- [ ] Clicking/pressing any chord fires `onChordDown / onChordUp`

### 3.3 Optional but recommended: regenerate overlay from your PNG (Windows)

Create `tools/generate_overlay_map.py`:

```python
import json, sys
import cv2
import numpy as np

def fmt(x): return float(f"{x:.6f}")

def kmeans_1d(vals, k=3, iters=30):
    vals=np.array(vals, dtype=float)
    qs=np.linspace(0.1,0.9,k)
    centroids=np.quantile(vals, qs)
    for _ in range(iters):
        labels=np.argmin(np.abs(vals[:,None]-centroids[None,:]), axis=1)
        new=np.array([vals[labels==i].mean() if np.any(labels==i) else centroids[i] for i in range(k)])
        if np.allclose(new, centroids): break
        centroids=new
    return labels, centroids

def main(img_path, out_path):
    img=cv2.imread(img_path)
    if img is None:
        raise SystemExit(f"Cannot read {img_path}")
    H, W = img.shape[:2]

    gray=cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur=cv2.GaussianBlur(gray,(5,5),0)
    edges=cv2.Canny(blur,40,120)
    edges=cv2.dilate(edges,np.ones((3,3),np.uint8),iterations=1)
    contours,_=cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # Rough chord-area square detection (tune thresholds if needed)
    boxes=[]
    for cnt in contours:
        x,y,w,h=cv2.boundingRect(cnt)
        area=w*h
        if area<200 or area>20000: 
            continue
        ar=w/float(h)
        if ar<0.7 or ar>1.3: 
            continue
        if not (20<=x<=1200 and 360<=y<=650): 
            continue
        if not (28<=w<=60 and 28<=h<=60):
            continue
        boxes.append((x,y,w,h))

    # Note-label squares define 12 columns (top label row)
    label_boxes=[b for b in boxes if 390<=b[1]<=415 and b[3]<=40 and 43<=b[2]<=48]
    label_boxes=sorted(label_boxes, key=lambda b:b[0])
    if len(label_boxes)<12:
        raise SystemExit(f"Expected ~12 label boxes; found {len(label_boxes)}. Adjust thresholds.")

    label_centers=np.array([x+w/2 for x,y,w,h in label_boxes[:12]])
    y0=np.mean([y+h/2 for x,y,w,h in label_boxes[:12]])

    # Chord buttons = chord squares excluding the label row
    chord_boxes=[b for b in boxes if not (390<=b[1]<=415 and b[3]<=40)]

    centers=np.array([[x+w/2, y+h/2] for x,y,w,h in chord_boxes], dtype=float)
    cx,cy=centers[:,0], centers[:,1]

    # Estimate diagonal-strip slope s by minimizing assignment error
    def score_s(s):
        corrected = cx + s*(cy - y0)
        idx = np.argmin(np.abs(corrected[:,None]-label_centers[None,:]), axis=1)
        residual = corrected - label_centers[idx]
        return float(np.mean(residual**2))

    ss=np.linspace(-1.2, 1.2, 1201)
    scores=np.array([score_s(s) for s in ss])
    s=float(ss[int(np.argmin(scores))])

    corrected = cx + s*(cy - y0)
    idx = np.argmin(np.abs(corrected[:,None]-label_centers[None,:]), axis=1)

    roots=["D#","Ab","Eb","Bb","F","C","G","D","A","E","B","F#"]
    qualities=["maj","min","7"]

    elements=[]
    for col in range(12):
        col_boxes=[chord_boxes[i] for i in range(len(chord_boxes)) if idx[i]==col]
        ycs=[y+h/2 for x,y,w,h in col_boxes]
        labels,_=kmeans_1d(ycs,k=3)

        clusters={i:[] for i in range(3)}
        for b,l in zip(col_boxes, labels):
            clusters[int(l)].append(b)

        reps=[]
        for i in range(3):
            if clusters[i]:
                reps.append(max(clusters[i], key=lambda b:b[2]*b[3]))
        reps=sorted(reps, key=lambda b:b[1]+b[3]/2)

        for q, (x,y,w,h) in zip(qualities, reps):
            elements.append({
                "id": f"chord_{roots[col]}_{q}".replace("#","s"),
                "type":"chord",
                "root": roots[col],
                "quality": q,
                "bbox":[fmt(x/W), fmt(y/H), fmt(w/W), fmt(h/H)],
                "gesture":"hold"
            })

    out={
      "reference":{"width":W,"height":H,"image":"assets/omnichord.png"},
      "elements":elements
    }
    with open(out_path,"w",encoding="utf-8") as f:
        json.dump(out,f,indent=2)
    print("Wrote", out_path)

if __name__=="__main__":
    if len(sys.argv)!=3:
        print("Usage: python tools/generate_overlay_map.py assets/omnichord.png data/overlayMap.om108.json")
        raise SystemExit(2)
    main(sys.argv[1], sys.argv[2])
```

Run:
```bash
python tools/generate_overlay_map.py assets/omnichord.png data/overlayMap.om108.json
```

**Checkpoint 5**
- [ ] You can regenerate the overlay map any time you swap the image
- [ ] Debug overlay always lines up again without manual edits

---

## 4) Fix “harp strum swipe” so it works in WebKit emulation

### 4.1 The core algorithm
- When pointer is down on `strumplate_main`, map `y ∈ [0,1]` to a string index `0..N-1`.
- Trigger a note **only when the string index changes** (prevents insane re-triggers).
- Add a small rate limiter (e.g., 12–20ms) if needed.

Create `src/audio/audioEngine.js` (minimal skeleton):
```js
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  async enable() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  // Replace with sampler later; oscillator is enough to validate gestures
  playTone(freq, durationSec = 0.12) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.value = freq;
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.2, this.ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + durationSec);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + durationSec + 0.02);
  }
}
```

Then in `src/app.js`, wire strum events:
```js
import { AudioEngine } from "./audio/audioEngine.js";
import { renderOverlay } from "./overlay/overlayRenderer.js";

const engine = new AudioEngine();
let lastString = null;
let lastTick = 0;

function yToString(y, strings) {
  const idx = Math.max(0, Math.min(strings - 1, Math.floor(y * strings)));
  return idx;
}

// Example: map 27 strings to a C-major-ish range
function stringToFreq(i) {
  // C3 (130.81Hz) up to ~B5
  const base = 130.81; // C3
  return base * Math.pow(2, i / 12);
}

function onStrumEvent({ phase, x, y }) {
  const now = performance.now();
  if (phase === "down") lastString = null;

  if (phase === "move" || phase === "down") {
    const strings = 27;
    const s = yToString(y, strings);
    if (s !== lastString && (now - lastTick) > 12) {
      lastString = s;
      lastTick = now;
      engine.playTone(stringToFreq(s));
    }
  }
}

async function main() {
  const overlayMap = await fetch("data/overlayMap.om108.json").then(r => r.json());

  const overlayRoot = document.getElementById("overlayRoot");
  renderOverlay({
    overlayRoot,
    overlayMap,
    debug: true,
    onChordDown: () => {},
    onChordUp: () => {},
    onStrumEvent,
  });

  document.getElementById("btnEnableAudio").addEventListener("click", async () => {
    await engine.enable();
  });
}

main();
```

**Checkpoint 6**
- [ ] Hold mouse down on strumplate and move up/down → you hear continuous “harp” retriggers
- [ ] Works in Playwright WebKit (see section 7)

---

## 5) Implement ALL chord buttons (not only 4)

Once you load `overlayMap.om108.json`, you’ll get all 36 chord zones automatically.

### Chord “hold” semantics
- Pointer down → start chord audio (sustain while held)
- Pointer up/cancel → release chord

> If you also want “Memory Hold” like the OM-108 / the example site, add a toggle:
- If MemoryHold is ON: `pointerup` does **not** stop the chord; only `Stop All` does.

**Checkpoint 7**
- [ ] Every chord button works with touch/mouse press-and-hold
- [ ] Memory Hold checkbox changes behavior exactly as above

---

## 6) Add a second page: song chooser + guided chord playback

### 6.1 Multi-page approach (simplest for GitHub Pages)

Create `songs.html` with a list of songs. On click, redirect to:
- `index.html?song=creep`
- `index.html?song=remember-you`
- `index.html?song=nurse`

Store the song in query-string (no router needed).

### 6.2 Song data format (`data/songs.json`)
Example structure:
```json
{
  "creep": {
    "title": "Creep - Radiohead",
    "meter": "4/4",
    "bpm": 92,
    "steps": [
      { "chord": "G:maj", "beats": 4 },
      { "chord": "B:maj", "beats": 4 },
      { "chord": "C:maj", "beats": 4 },
      { "chord": "C:min", "beats": 4 }
    ],
    "loop": true
  }
}
```

### 6.3 Guided playback that “keeps with the user”
Your requirement: “track the timing of presses and let it keep with the user playing as song goes on.”

Implement as:
1. Maintain `currentStepIndex`
2. Show highlight for expected chord
3. Advance to next step **only after the user presses the expected chord**
4. Use BPM only for *visual timing guidance* (countdown/progress ring), but never “force” step advancement

**Checkpoint 8**
- [ ] Selecting a song opens main page with the guide active
- [ ] The guide does not advance until the correct chord is pressed
- [ ] Timing indicator updates, but user controls the pace

---

## 7) Testing on Windows 11: “Safari-like” workflow (HTML Preview Pro + Playwright)

### 7.1 Reality check
- VS Code preview extensions are great for **responsive layout**, but they usually render using Chromium/WebView.
- For WebKit engine behavior, use **Playwright WebKit**.

### 7.2 Use HTML Preview Pro for layout & overlays
Recommended usage:
- Start your local server (Live Server or the extension’s built-in preview)
- Switch device preset to an iPad in **landscape**
- Use its devtools to inspect overlay divs

### 7.3 Use Playwright WebKit for engine-level gesture testing
Create `playwright.config.js`:
```js
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  use: {
    // change to your local server URL
    baseURL: "http://127.0.0.1:5500",
  },
  projects: [
    {
      name: "webkit-ipad",
      use: {
        ...devices["iPad (gen 7)"],
        browserName: "webkit",
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
```

Create `tests/strum.spec.js`:
```js
import { test, expect } from "@playwright/test";

test("strumplate swipe triggers without page scroll", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /enable audio/i }).click();

  const strum = page.locator('[data-id="strumplate_main"]');
  const box = await strum.boundingBox();
  expect(box).toBeTruthy();

  // drag vertically across the strumplate
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8, { steps: 20 });
  await page.mouse.up();
});
```

Run:
```bash
npx playwright test --project=webkit-ipad
```

**Checkpoint 9**
- [ ] WebKit tests run on Windows
- [ ] Pointer-down + pointer-move triggers strum notes (no scroll/zoom)

---

## 8) Next: map the remaining controls (voices, patterns, knobs)

Chord grid + strumplate will make the project “feel alive”. After that, do the rest in layers:

1. **Square buttons** (voice + patterns + RTC buttons)
2. **Toggle switches** (manual/auto, memory)
3. **Knobs** (tempo, volume, sustain)

Recommended method:
- Add an “Edit Overlay” mode that logs the `getBoundingClientRect()` of a dragged rectangle and writes a JSON entry.
- This avoids hand-editing coordinates.

**Checkpoint 10**
- [ ] Every control has a JSON entry (no hard-coded screen coords)
- [ ] Debug overlay matches the PNG perfectly in iPad-landscape viewport

---

## 9) GitHub Pages deployment (so friends can use it)

Once local works:
- Settings → Pages → Deploy from branch → `main` / root

**Checkpoint 11**
- [ ] Your GitHub Pages URL loads the instrument
- [ ] Touch works on mobile browsers (later: real iPad test)

---

## 10) Known iPad Safari constraints to design around

- Audio is locked until user gesture → always keep an “Enable Audio” button.
- Avoid hover states; use press-and-hold.
- Use Pointer Events + `touch-action: none` on the overlay.
- Don’t rely on right-click, wheel, or keyboard.
