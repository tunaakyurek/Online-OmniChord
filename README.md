# Online-OmniChord

[Launch Omnichord Demo](./index.html?raw=1)

## PNG overlay setup

Place your panel image at `./omnichord.png` (same folder as `index.html`).
Use the Debug Overlay toggle to verify hit areas line up with the image.

## Quick start

1. Tap **Enable Audio** (required by iOS Safari).
2. Tap/hold chord buttons to sustain.
3. Swipe across the strumplate to play harp tones.
4. Use **Stop All** as a panic button.

## Local dev

Run a static server (for example: `python -m http.server`) and open `http://localhost:8000/index.html`.

## Quick test checklist

1. Toggle **Debug Overlay** to confirm hit areas align with the PNG.
2. Tap **Enable Audio** once (Safari requirement).
3. Tap/hold a chord and swipe the strumplate to hear harp notes.
4. Hit **Stop All** to confirm everything releases.

## VS Code + Playwright WebKit (Safari-like testing)

1. Open this folder in VS Code.
2. Install the extension **Playwright Test for VS Code** (`ms-playwright.playwright`).
3. In a terminal, install WebKit:
	- `npx playwright@latest install webkit`
4. Start a local server:
	- `python -m http.server`
5. Open a WebKit window for manual testing:
	- `npx playwright@latest codegen --browser=webkit http://localhost:8000/index.html`

Tip: Keep the debug overlay on while calibrating shapes, then turn it off for a clean UI.


## Terminal Commands to use:

Terminal 1:
$env:Path = "C:\Program Files\nodejs;" + $env:Path
& "C:\Program Files\nodejs\npm.cmd" exec --yes http-server . -p 8080

Terminal 2:
$env:Path = "C:\Program Files\nodejs;" + $env:Path
& "C:\Program Files\nodejs\npm.cmd" exec --yes playwright@latest install webkit
& "C:\Program Files\nodejs\npm.cmd" exec --yes playwright@latest codegen --browser=webkit http://localhost:8080/index.html