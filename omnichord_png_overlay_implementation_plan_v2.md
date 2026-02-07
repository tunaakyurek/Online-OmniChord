# Omnichord PNG UI Overlay — End-to-End Implementation Plan (Safari iPad)

> Goal: Use **your exact `omnichord.png`** as the instrument UI, and place **interactive hit-areas** (buttons/knobs/harp/strumplate) on top with **pixel-accurate geometry** that scales responsively on iPad Safari (landscape).

This guide is written as a **checkpointed build plan**. Complete each checkpoint in order.

---

## 0) Baseline assumptions

- You are hosting via **GitHub repo + GitHub Pages**.
- You are building a **static frontend** (no server required).
- The repository contains `omnichord.png` (your panel image).

---

## 1) Project setup (Vite + React + TypeScript)

### 1.1 Create the app
**Checkpoint A1 — repo is a working Vite app**
- `npm create vite@latest omnichord-web -- --template react-ts`
- `cd omnichord-web`
- `npm install`
- `npm run dev` (verify local browser opens)

### 1.2 Recommended tooling
**Checkpoint A2 — linting & formatting are active**
- Install:
  - `npm i -D eslint prettier eslint-config-prettier`
- Configure `eslint` + `prettier` (use your preferred baseline)
- Add scripts:
  - `"lint": "eslint . --ext .ts,.tsx"`
  - `"format": "prettier -w ."`

### 1.3 Folder structure (minimum needed for PNG overlay)
Create:
```
src/
  app/
    App.tsx
  ui/
    OmnichordStage.tsx
    OverlayLayer.tsx
  interaction/
    pointer.ts
    hitTest.ts
  domain/
    layout/
      overlayMap.schema.ts
      overlayMap.default.json
  styles/
    globals.css
public/
  assets/
    omnichord.png
```

**Checkpoint A3 — omnichord.png is in the correct place**
- Put your image at: `public/assets/omnichord.png`

---

## 2) Core rendering approach (pixel-perfect overlay)

### 2.1 Use a single coordinate system: the PNG's natural pixels
We will render an SVG that:
- Uses `viewBox="0 0 <naturalWidth> <naturalHeight>"`
- Draws the PNG using `<image />`
- Draws invisible or semi-transparent interactive shapes on top

This gives you **1:1 mapping** between design-time pixel coordinates and runtime hit areas.

**Checkpoint B1 — you can read PNG natural size**
Implement `useImageDimensions()`:
- Create an `Image()`, set `.src="/assets/omnichord.png"`, wait for `onload`
- Store `naturalWidth`, `naturalHeight` in React state

### 2.2 Responsive sizing without breaking geometry
Render the SVG inside a container that:
- fills available width/height
- preserves aspect ratio (letterboxing if needed)

Recommended pattern:
- A wrapping `div` with `height: 100vh; width: 100vw;`
- `svg { width: 100%; height: 100%; }`
- `preserveAspectRatio="xMidYMid meet"`

**Checkpoint B2 — the PNG scales while hit areas stay aligned**
- Resize browser window: overlay shapes still match image locations

---

## 3) Define the overlay map (data-driven hit areas)

### 3.1 Data format (JSON)
Create `src/domain/layout/overlayMap.default.json`:

```json
{
  "image": { "src": "/assets/omnichord.png", "w": 0, "h": 0 },
  "controls": [
    {
      "id": "power",
      "type": "toggle",
      "label": "Power",
      "shape": { "kind": "circle", "cx": 120, "cy": 520, "r": 18 }
    }
  ]
}
```

Where each control has:
- `id` (unique)
- `type` (button | toggle | knob | chord | strumSegment | harpKey | etc.)
- `shape` (circle | rect | path)
- optional metadata (note mapping, chord mapping, etc.)

**Checkpoint C1 — overlay map JSON loads and renders one test button**

### 3.2 Schema typing (TypeScript)
Create `overlayMap.schema.ts` with types:
- `OverlayMap`
- `Control`
- `ShapeCircle | ShapeRect | ShapePath`

**Checkpoint C2 — compile-time typing prevents malformed map**

---

## 4) Build the “OverlayLayer” renderer

### 4.1 Render shapes in SVG
Implement `OverlayLayer.tsx`:
- Iterate `controls`
- For each control:
  - Render an SVG element with `fill="transparent"` and `pointerEvents="all"`
  - Add pressed visual state (optional): `fill="rgba(0, 160, 255, 0.15)"`

Recommended:
- circles: `<circle />`
- rects: `<rect rx="..." />` (rounded corners supported)
- paths: `<path d="..." />` (for complex button outlines)

**Checkpoint D1 — you can click/tap the test control and log its id**

### 4.2 Pointer events (Safari iPad friendly)
Use **Pointer Events**:
- `onPointerDown`, `onPointerUp`, `onPointerMove`, `onPointerCancel`
- On pointerdown: `e.currentTarget.setPointerCapture(e.pointerId)`

Set CSS for the stage container:
- `touch-action: none;` (prevents scroll/zoom stealing gestures)

**Checkpoint D2 — multi-touch does not scroll the page; pointer capture works**

---

## 5) High-accuracy geometry: how to create realistic hit shapes

You have two robust options. Pick one.

---

### Option 1 (recommended): Create an SVG hitmap in Figma/Inkscape

**Why:** fastest path to “realistic dimensions” and complex shapes.

#### 5.1 Make the hitmap
1. Import `omnichord.png` into Figma or Inkscape.
2. Lock the PNG layer.
3. For every interactive element:
   - Draw a shape (rect/circle/path) that exactly matches button geometry.
   - Name each shape with the control id (e.g., `chord_C_major`, `rhythm_rock`, `knob_tempo`)
4. Export as SVG (only the overlay shapes; keep the PNG separate).

**Checkpoint E1 — you have `overlay-hitmap.svg` with named shapes**

#### 5.2 Convert hitmap SVG → JSON
Write a small script `scripts/svg-to-overlaymap.ts` that:
- Parses the SVG DOM
- Reads each shape (`circle`, `rect`, `path`)
- Uses `id` or `name` attribute as `control.id`
- Outputs `overlayMap.generated.json`

**Checkpoint E2 — regenerating JSON from SVG is one command**

#### 5.3 Runtime: use JSON only
At runtime, you render:
- PNG as `<image />`
- Generated JSON shapes as click targets

This keeps runtime light and avoids bundling “editor SVG” logic.

**Checkpoint E3 — the entire panel is clickable with accurate hit shapes**

---

### Option 2: Build a calibration mode inside the app (no external tools)

**Why:** good if you want to fine-tune hit areas *on iPad* by touch.

#### 5.4 Create `/calibrate` route
Add a route that shows:
- The stage
- A “Calibration HUD” with tools:
  - Add circle / rect
  - Drag points
  - Save JSON (copy to clipboard)

Data model:
- Rect: (x, y, w, h, rx)
- Circle: (cx, cy, r)
- Path: point list → convert to path (optional, advanced)

**Checkpoint E4 — you can draw and save hit areas by hand**

---

## 6) Implement instrument-specific hit logic

Now that the overlay is accurate, wire controls to behavior.

### 6.1 Button press semantics (momentary touch-hold)
Requirement: “press down and wait while it keeps activated state”
- For `type: "button"` or `"chord"`:
  - On `pointerdown` → activate
  - On `pointerup/cancel` → deactivate
- For toggles (e.g. power, memory):
  - On `pointerdown` → toggle state once
  - Ignore pointerup

**Checkpoint F1 — momentary buttons sustain while held; toggles latch**

### 6.2 Chord grid
Treat each chord button as a separate control id:
- Example ids:
  - `chord_C_major`, `chord_C_minor`, `chord_C_7th`, etc.

Mapping:
- Each chord control contains:
  - `root`: C, C#, D...
  - `quality`: maj|min|7

**Checkpoint F2 — chord id maps to a chord object in code**

### 6.3 Strumplate segmentation
Instead of a single big strumplate area, create multiple segments:
- `strum_0 ... strum_N-1`

On pointer move:
- Determine which segment is under the pointer
- If segment changes, trigger harp note

Implementation options:
- (A) Predefined segment shapes in the hitmap
- (B) One large strumplate rect + compute segment index by x/y
  - Requires you to define strumplate bounding box + segment count

**Checkpoint F3 — swiping across strum segments repeatedly triggers notes**

### 6.4 Harp buttons/keys
If you have individual harp keys:
- Represent as controls `harp_0 ... harp_M-1`
- Hold should keep the voice active if you want “sustained harp”, or retrigger on movement

**Checkpoint F4 — harp touch triggers correct note mapping**

---

## 7) Audio engine wiring (minimal but clean)

### 7.1 Create `AudioEngine` class
`src/audio/AudioEngine.ts` (suggested):
- `init()` (create context, master gain, buses)
- `resumeFromUserGesture()` (call inside pointerdown)
- `setBusVolume(bus, value)`
- `startChord(chordId)`
- `stopChord(chordId)`
- `triggerHarp(noteId)`
- `setRhythm(patternId)`
- `setTempo(multiplier)`
- `stopAll()`

**Checkpoint G1 — audio unlock works on iPad (first tap enables sound)**

### 7.2 Connect UI controls to engine
In `App.tsx`:
- Keep a single `audioEngineRef`
- On first pointerdown anywhere on the stage:
  - `engine.resumeFromUserGesture()`

**Checkpoint G2 — no “silent” bug after first interaction on Safari**

---

## 8) GitHub Pages deployment (Vite)

### 8.1 Configure base path
If your repo is `https://<user>.github.io/<repo>/`:
- In `vite.config.ts`:
  - `base: "/<repo>/"`

**Checkpoint H1 — production build loads assets correctly on Pages**

### 8.2 Deploy workflow
Use one:
- GitHub Actions Pages deploy (recommended)
- Or `gh-pages` package

**Checkpoint H2 — friends can open the URL and use it**

---

## 9) iPad landscape UX checklist (required)

**Checkpoint I1 — no accidental scroll/zoom while playing**
- Ensure:
  - `touch-action: none;`
  - `overscroll-behavior: none;`
  - page has no scrollable body

**Checkpoint I2 — viewport safe areas**
- Add CSS padding using:
  - `padding: env(safe-area-inset-top) ...` etc.

**Checkpoint I3 — performance**
- Avoid React rerender on every pointermove:
  - Use refs for pointer tracking
  - Only update state on segment changes or press changes

---

## 10) Step-by-step “done” definition checklist (end-to-end)

### Stage 1 — Visual alignment
- [ ] PNG renders full-stage in landscape
- [ ] Overlay shapes render on top
- [ ] A test control logs its id on touch

### Stage 2 — Full hitmap accuracy
- [ ] All buttons have shapes (circle/rect/path)
- [ ] Press feedback highlights the exact shape
- [ ] No misalignment at any screen size

### Stage 3 — Interaction fidelity
- [ ] Momentary press-and-hold works
- [ ] Multi-touch chord + strum works
- [ ] Strumplate swipe triggers repeatably

### Stage 4 — Audio + mixing
- [ ] First gesture unlocks audio
- [ ] Chords sustain while held
- [ ] Harp triggers on strum
- [ ] Stop button silences everything

### Stage 5 — Deploy + share
- [ ] GitHub Pages URL works on iPad Safari
- [ ] All assets load with correct base path
- [ ] Friend test confirms usability

---

## Appendix A — Implementation notes (practical tips)

1) **Keep overlay data separate from code.**
   - The hitmap JSON is “UI geometry”.
   - Instrument logic maps `control.id` → action.

2) **Prefer path shapes for “real button outlines”.**
   - Rect/circle is fine for MVP.
   - Use paths for the most visible/important controls.

3) **One source of truth coordinate system.**
   - Always design shapes in the PNG’s native pixel space.

4) **Create a “debug overlay” toggle.**
   - Show outlines/ids while calibrating.
   - Hide them in production.

---

## Appendix B — Minimal pseudo-code snippets (structure only)

### OmnichordStage.tsx
```tsx
// 1) Load image dimensions
// 2) Render SVG with viewBox = naturalWidth/naturalHeight
// 3) Render <image href="/assets/omnichord.png" />
// 4) Render <OverlayLayer controls={map.controls} ... />
```

### OverlayLayer.tsx
```tsx
// Render shapes with pointer handlers.
// On pointerdown: setPointerCapture + dispatch controlDown(controlId)
// On pointerup/cancel: dispatch controlUp(controlId)
```

### Control dispatch
```ts
// controlDown(id): update pressed-state + call AudioEngine actions
// controlUp(id): release momentary actions
```

---

## Appendix C — What you must provide (so geometry can be “exact”)

To complete the hitmap precisely, you will need either:
- `overlay-hitmap.svg` (Option 1) with all shapes drawn and named, OR
- The in-app calibration output JSON (Option 2)

Without one of these, no code can “infer” exact button outlines from a PNG alone.
---

## 11) Windows 11 local preview strategy: HTML Preview Pro + Playwright WebKit

You asked whether **HTML Preview Pro** can act as an **iPad Safari emulator** on Windows.

### 11.1 Reality check (what it *is* and what it *isn’t*)
**HTML Preview Pro is useful, but it is not an iPad Safari engine emulator.**

What it *does* provide (per its docs):
- **Responsive device testing** with presets including **iPad**, orientation support, and **device simulation** (viewport + user agent). citeturn1view0
- A local server + live reload + optional injected devtools and custom CSS. citeturn1view0

What it *cannot* provide on Windows:
- The **actual iOS Safari runtime** (audio autoplay policies, iOS touch event quirks, iOS font rendering, iOS WebKit networking/compositing stack).
  - Even Playwright’s WebKit on Windows can differ from Apple Safari in platform-specific ways. citeturn0search1

**Bottom line:**  
- Use **HTML Preview Pro** for **fast, visual, responsive layout checks** and overlay alignment.
- Use **Playwright WebKit** for the closest “Safari-like engine” validation you can do locally on Windows. citeturn0search5

---

### 11.2 Required “visualization code” so iPad presets behave correctly
HTML Preview Pro explicitly recommends verifying you have a **viewport meta tag** for responsive mode. citeturn1view0

Add/verify this in `index.html` (Vite’s root `index.html`):

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
```

Add/verify these global CSS rules in `src/styles/globals.css` (or equivalent):

```css
html, body, #root {
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #000;
}

.omni-stage {
  width: 100vw;
  height: 100vh;

  /* Critical for instrument-style touch interaction */
  touch-action: none;
  overscroll-behavior: none;

  /* iOS safe-area friendliness (also useful on other devices) */
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}
```

**Checkpoint J1 — Responsive preset shows correct scale**
- Open preview in an iPad preset (landscape)
- Confirm the PNG + hit areas remain aligned and fill the stage without scrolling

---

### 11.3 VS Code configuration for HTML Preview Pro (recommended)
Create `.vscode/settings.json`:

```json
{
  "htmlPreviewPro.autoReload": true,
  "htmlPreviewPro.autoReloadDelay": 250,
  "htmlPreviewPro.defaultDevice": "iPad",
  "htmlPreviewPro.showConsole": true,
  "htmlPreviewPro.injectDevTools": true,
  "htmlPreviewPro.watchFilePatterns": [
    "**/*.html",
    "**/*.css",
    "**/*.js",
    "**/*.ts",
    "**/*.tsx",
    "**/*.png",
    "src/**/*.json"
  ],

  // Debug overlay mode (toggle on/off by editing this string)
  "htmlPreviewPro.customCSS": "svg [data-control-id]{ outline:1px solid rgba(255,0,0,.35) !important; }"
}
```

Notes:
- Settings names and options are documented on the extension page (autoReload, defaultDevice, showConsole, injectDevTools, customCSS, watchFilePatterns, serverPort, HTTPS). citeturn1view0
- If you don’t want the debug outlines always on, set `customCSS` to `""` when not calibrating.

**Checkpoint J2 — HTML Preview Pro live reload works**
- Modify `overlayMap.default.json`
- Verify preview updates without restarting

---

### 11.4 How to use HTML Preview Pro with a Vite/React project (important)
HTML Preview Pro is optimized for **HTML files**, and it runs its own local server. citeturn1view0  
Vite/React projects are best previewed using **Vite dev server** (HMR, module resolution).

So use **one of these two approaches**:

#### Approach A (recommended): Separate “calibration preview” page for hit areas
Create a tiny static tool that loads:
- `/assets/omnichord.png`
- a JSON overlay map
- renders SVG + clickable hit areas

Place it at:
```
tools/hitmap-preview/
  index.html
  preview.css
  preview.js
  overlayMap.json  (copied from src/domain/layout/)
```

Open `tools/hitmap-preview/index.html` with HTML Preview Pro:
- You get rapid geometry editing without affecting your React app.
- When the hitmap is correct, copy the JSON back into `src/domain/layout/`.

**Checkpoint J3 — You can calibrate without running Vite**
- Open `tools/hitmap-preview/index.html` in HTML Preview Pro
- Confirm iPad preset landscape shows correct geometry
- Tap shapes: see the id in console

#### Approach B: Preview production build (`dist/`)
- Run: `npm run build`
- Preview the generated `dist/index.html` using HTML Preview Pro
- Downside: you must rebuild when you change TS/TSX (slower loop)

**Checkpoint J4 — Dist preview works**
- Confirm PNG loads correctly from `/assets/...` paths
- Confirm hit areas align

---

### 11.5 Playwright WebKit on Windows: “Safari-like engine” smoke tests
Playwright explicitly supports **WebKit** and notes it is derived from latest WebKit sources; Playwright does **not** run branded Safari. citeturn0search5  
Playwright also supports device emulation (viewport, UA, touch). citeturn2search2

#### Step 1 — ensure you have WebKit installed
```bash
npx playwright install webkit
```

#### Step 2 — pick an iPad device descriptor (from your installed Playwright)
Device names vary by Playwright version. The safest method is to list them:

```bash
node -e "const { devices } = require('@playwright/test'); console.log(Object.keys(devices).filter(k=>k.toLowerCase().includes('ipad')))"
```
This approach is widely used to discover available descriptors. citeturn2search0

#### Step 3 — add a WebKit iPad-landscape project
Create/update `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const iPadName = process.env.PW_IPAD_DEVICE ?? 'iPad'; // replace after you list devices

export default defineConfig({
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true
  },
  projects: [
    {
      name: 'webkit-ipad',
      use: {
        ...devices[iPadName],
        browserName: 'webkit'
      }
    }
  ]
});
```

Run headed (interactive window):
```bash
PW_IPAD_DEVICE="iPad Pro 11" npx playwright test --project=webkit-ipad --headed
```

**Checkpoint J5 — WebKit sanity checks pass**
- Page loads in WebKit
- Touch events work (`hasTouch`)
- Press-and-hold chord logic behaves
- Strum swipe triggers (pointer move sequences)

---

### 11.6 What to trust during local Windows testing
Use this trust order:

1) **Playwright WebKit results** (engine-level compatibility best you can do locally) citeturn0search5  
2) **HTML Preview Pro iPad preset** (layout + responsiveness + quick iteration; not Safari engine) citeturn1view0  
3) Chromium/Edge “mobile emulation” (still useful, but different engine)

When you reach “MVP playable,” do a final pass on a real iPad Safari before sharing broadly.
