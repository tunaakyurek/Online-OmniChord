# Online-OmniChord

**▶ Play Online Omnichord:** https://<YOUR_GITHUB_USERNAME>.github.io/<REPO_NAME>/

## How to play (iPad)

1. Open the Play link in Safari (landscape).
2. Tap **Enable Audio** once.
3. Hold a chord with one finger and strum with another.
4. Tap **Rhythm Off** to enable the rhythm generator.
5. Tap **Stop All** if anything sticks.

## Troubleshooting

- No sound: check the mute switch and volume, then tap **Enable Audio** again.
- Hitboxes look off: toggle **Debug Overlay** and confirm the PNG alignment.
- If strum is silent: make sure a chord is held.

## Add to Home Screen (optional)

- Tap Share → **Add to Home Screen**.
- Launch from the home screen for a full-screen experience.

## Project layout

- assets/omnichord.png
- data/overlayMap.om108.json
- data/songs.json
- src/app.js
- src/audio/audioEngine.js
- src/overlay/overlayRenderer.js
- songs.html

## Developer quick start

Run a static server and open http://localhost:8080/index.html.

Example (http-server):

1) `npm exec --yes http-server . -p 8080`

## Playwright WebKit (Safari-like testing)

1) `npm exec --yes playwright@latest install webkit`
2) `npm exec --yes http-server . -p 8080`
3) `npm exec --yes playwright@latest codegen --browser=webkit http://localhost:8080/index.html`

Tip: Keep the debug overlay on while calibrating shapes, then turn it off for a clean UI.


