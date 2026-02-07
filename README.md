# Online-OmniChord

**▶ Play Online Omnichord:** https://<YOUR_DEPLOYED_URL>

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

- public/index.html
- public/songs.html
- public/globals.css
- public/assets/omnichord.png
- public/data/overlayMap.om108.json
- public/data/songs.json
- public/src/app.js
- public/src/audio/audioEngine.js
- public/src/overlay/overlayRenderer.js

## Developer quick start

Run a static server and open http://127.0.0.1:8080/.

Example (http-server, no cache):

1) `npx --yes http-server public -p 8080 -c-1`

Python fallback:

1) `python -m http.server 8080 --directory public`

## Playwright WebKit (Safari-like testing)

1) `npx --yes playwright@latest install webkit`
2) `npx --yes http-server public -p 8080 -c-1`
3) `npx --yes playwright@latest codegen --browser=webkit http://127.0.0.1:8080/`

## Hosting (Cloudflare Pages / Netlify / Vercel)

Use these settings in the host UI:

- Build command: (leave blank)
- Output/Publish directory: public

Tip: Keep the debug overlay on while calibrating shapes, then turn it off for a clean UI.


